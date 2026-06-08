import json
from pathlib import Path

import sys
import os

# Adjust path to import from project root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..', '..')
sys.path.insert(0, PROJECT_ROOT)


from src.llm_interface import OpenAILLM # Ensure this is the correct import for your OpenAI LLM client
from src.omni_validator import OmniValidator

# --- Main test runner ---
def run_tests(config_path: str, output_dir_base: str):
    """
    Runs schema generation and validation tests based on a configuration file.
    """
    try:
        with open(config_path, 'r') as case_config_file:
            config = json.load(case_config_file)
    except FileNotFoundError:
        print(f"ERROR: Configuration file not found at {config_path}")
        return
    except json.JSONDecodeError as e:
        print(f"ERROR: Could not parse JSON configuration: {e}")
        return

    if not config or "test_cases" not in config:
        print("ERROR: Configuration file is empty or missing 'test_cases' section.")
        return

    # Initialize LLM and OmniValidator (once, if possible, or per test if stateful)
    # Ensure OPENAI_API_KEY is set in your environment
    try:
        llm_client = OpenAILLM()
        print(f"✅ OpenAI LLM Client initialized with model: {llm_client.model_name}")
    except Exception as e:
        print(f"❌ Failed to initialize LLM client: {e}. Ensure API key is set and client is configured.")
        return

    omni_validator_instance = OmniValidator(llm_client=llm_client)
    print(f"✅ OmniValidator initialized with LLM: {llm_client.model_name}")


    Path(output_dir_base).mkdir(parents=True, exist_ok=True)
    overall_summary = []

    for case_config in config.get("test_cases", []):
        case_name = case_config.get("case_name", "UnnamedCase")
        original_data = case_config.get("original_data")
        description = case_config.get("description")
        invalid_data_instance = case_config.get("invalid_data") # Get pre-defined invalid data

        print(f"\n--- Running Test Case: {case_name} ---")
        case_output_dir = Path(output_dir_base) / case_name
        case_output_dir.mkdir(parents=True, exist_ok=True)

        report = {
            "case_name": case_name,
            "description": description, # Adding description to report
            "generation_result": None,
            "valid_data_validation": None,
            "invalid_data_validation": None,
            "paths": {
                "original_data": str(case_output_dir / "original_data.json"),
                "generated_schema": str(case_output_dir / "generated_schema.json"),
                "invalid_data": str(case_output_dir / "invalid_data.json"),
                "report": str(case_output_dir / "validation_report.json")
            }
        }

        if not original_data or not description:
            print(f"  Skipping '{case_name}': missing 'original_data' or 'description'.")
            report["generation_result"] = {"success": False, "error": "Missing 'original_data' or 'description' in config."}
            overall_summary.append(report)
            with open(report["paths"]["report"], 'w') as f_report:
                json.dump(report, f_report, indent=2)
            continue

        # 1. Save original data (already loaded from config)
        print(f"  Using embedded original data for: {case_name}")
        try:
            with open(report["paths"]["original_data"], 'w') as f_out:
                json.dump(original_data, f_out, indent=2)
        except Exception as e:
            print(f"  ERROR saving embedded original_data for '{case_name}': {e}")
            report["generation_result"] = {"success": False, "error": f"Failed to save embedded data: {e}"}
            overall_summary.append(report)
            with open(report["paths"]["report"], 'w') as f_report:
                json.dump(report, f_report, indent=2)
            continue

        # 2. Generate Schema
        print(f"  Generating schema for '{case_name}'...")
        gen_result = omni_validator_instance.generate_artifact(
            description=description,
            example_data_list=[original_data], # Use the loaded data as an example
            artifact_type="schema"
        )
        report["generation_result"] = gen_result

        if gen_result["success"]:
            print(f"  ✅ Schema generated successfully for {case_name}.")
            generated_schema = gen_result["artifact"]
            with open(report["paths"]["generated_schema"], 'w') as f_schema:
                json.dump(generated_schema, f_schema, indent=2)

            # 3. Validate Original (Valid) Data
            print(f"  Validating original data for {case_name}...")
            valid_result = omni_validator_instance.validate_artifact(
                json_data=original_data,
                artifact=generated_schema,
                artifact_type="schema"
            )
            report["valid_data_validation"] = valid_result
            if valid_result["success"]:
                print(f"  ✅ Original data for {case_name} passed validation as expected.")
            else:
                print(f"  ❌ Original data for {case_name} FAILED validation (UNEXPECTED): {valid_result.get('message')} Details: {valid_result.get('details')}")

            # 4. Create and Validate Invalid Data
            if invalid_data_instance is not None:
                # Save the pre-defined invalid data to a file
                with open(report["paths"]["invalid_data"], 'w') as f_inv:
                    json.dump(invalid_data_instance, f_inv, indent=2)

                print(f"  Validating purposefully invalid data for {case_name}...")
                invalid_result = omni_validator_instance.validate_artifact(
                    json_data=invalid_data_instance,
                    artifact=generated_schema,
                    artifact_type="schema"
                )
                report["invalid_data_validation"] = invalid_result
                if not invalid_result["success"]:
                    print(f"  ✅ Invalid data for {case_name} FAILED validation as expected. Reason: {invalid_result.get('message')}")
                else:
                    print(f"  ❌ Invalid data for {case_name} PASSED validation (UNEXPECTED).")
            else:
                print(f"  Skipping invalid data validation for {case_name} as no 'invalid_data' was specified in config.")
                report["invalid_data_validation"] = {"success": None, "message": "No 'invalid_data' specified in config."}

        else:
            print(f"  ❌ Schema generation FAILED for {case_name}. Error: {gen_result.get('error')}")
            # No further validation possible if schema generation failed

        overall_summary.append(report)
        with open(report["paths"]["report"], 'w') as f_report:
            json.dump(report, f_report, indent=2)
        print(f"  Results for {case_name} saved to {case_output_dir}")

    # Save overall summary (optional)
    summary_file_path = Path(output_dir_base) / "overall_test_summary.json"
    with open(summary_file_path, 'w') as f_summary:
        json.dump(overall_summary, f_summary, indent=2)
    print(f"\n🏁 All configured schema tests completed. Overall summary: {summary_file_path} 🏁")


if __name__ == "__main__":
    # Configuration
    # Ensure these paths are correct relative to where you run the script from,
    # or use absolute paths.
    # Assuming script is run from project root (e.g., json-validator-ai/)
    CONFIG_FILE = "src/tests/test_schema_cases_config.json"
    OUTPUT_DIR = "src/tests/test_outputs" # Outputs will go here

    run_tests(CONFIG_FILE, OUTPUT_DIR)
