import json
import shutil
from datetime import datetime

import sys
import os

# Adjust path to import from project root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..', '..')
sys.path.insert(0, PROJECT_ROOT)


from src.llm_interface import OpenAILLM
from src.artifact_handlers.ai_prompt_handler import AIPromptHandler

CONFIG_FILE_PATH = "src/tests/test_ai_prompt_cases_config.json"
OUTPUT_BASE_DIR = "src/tests/test_outputs_ai_prompt"

def load_test_config(config_path):
    """Loads test cases from the JSON configuration file."""
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Test configuration file not found at {config_path}")
        return None
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {config_path}")
        return None

def run_single_ai_prompt_test(case_config, llm_client):
    """Runs a single AI prompt test case."""
    case_name = case_config['case_name']
    print(f"\n--- Running AI Prompt Test Case: {case_name} ---")

    handler = AIPromptHandler()

    # 1. Generate AI Prompt
    print(f"  Generating AI prompt for '{case_name}'...")
    generated_prompt_result = handler.generate_ai_prompt(
        llm_client=llm_client,
        description=case_config['description_for_prompt_generation'],
        example_data_list=case_config.get('example_data_for_prompt_generation', [])
    )

    if not generated_prompt_result or not generated_prompt_result.get("success"):
        error_msg = generated_prompt_result.get("error", "Unknown error during prompt generation.")
        print(f"  ❌ AI prompt generation FAILED for {case_name}. Error: {error_msg}")
        return {"case_name": case_name, "status": "PROMPT_GENERATION_FAILED", "error": error_msg, "generated_prompt": None}
    
    generated_prompt = generated_prompt_result["artifact"]
    print(f"  ✅ AI prompt generated successfully for {case_name}.")

    test_result = {
        "case_name": case_name,
        "status": "PASSED",
        "generated_prompt": generated_prompt,
        "valid_data_validation": {},
        "invalid_data_validation": {}
    }

    # 2. Validate valid_data_for_validation
    print(f"  Validating valid data for {case_name} using generated prompt...")
    valid_data_validation_result = handler.validate_ai_prompt(
        llm_client=llm_client,
        json_data=case_config['valid_data_for_validation'],
        ai_prompt_artifact=generated_prompt
    )

    if not valid_data_validation_result or not valid_data_validation_result.get("success"):
        error_msg = valid_data_validation_result.get("error", "Unknown error during validation.")
        print(f"  ❌ Validation of valid data for {case_name} FAILED unexpectedly. Error: {error_msg}")
        test_result["status"] = "FAILED_VALID_DATA_VALIDATION_ERROR"
        test_result["valid_data_validation"] = {"status": "ERROR", "details": error_msg}
    elif not valid_data_validation_result.get("result", {}).get("is_valid"):
        reason = valid_data_validation_result.get("result", {}).get("reason", "No reason provided.")
        print(f"  ❌ Valid data for {case_name} FAILED validation (UNEXPECTED). Reason: {reason}")
        test_result["status"] = "FAILED_VALID_DATA_UNEXPECTED_INVALID"
        test_result["valid_data_validation"] = {"status": "UNEXPECTEDLY_INVALID", "details": valid_data_validation_result.get("result")}
    else:
        print(f"  ✅ Valid data for {case_name} passed validation as expected.")
        test_result["valid_data_validation"] = {"status": "PASSED", "details": valid_data_validation_result.get("result")}

    # 3. Validate invalid_data_for_validation
    print(f"  Validating purposefully invalid data for {case_name} using generated prompt...")
    invalid_data_validation_result = handler.validate_ai_prompt(
        llm_client=llm_client,
        json_data=case_config['invalid_data_for_validation'],
        ai_prompt_artifact=generated_prompt
    )

    if not invalid_data_validation_result or not invalid_data_validation_result.get("success"):
        error_msg = invalid_data_validation_result.get("error", "Unknown error during validation.")
        print(f"  ❌ Validation of invalid data for {case_name} FAILED unexpectedly. Error: {error_msg}")
        if test_result["status"] == "PASSED": test_result["status"] = "FAILED_INVALID_DATA_VALIDATION_ERROR"
        test_result["invalid_data_validation"] = {"status": "ERROR", "details": error_msg}
    elif invalid_data_validation_result.get("result", {}).get("is_valid"):
        reason = invalid_data_validation_result.get("result", {}).get("reason", "No reason provided.")
        print(f"  ❌ Invalid data for {case_name} PASSED validation (UNEXPECTED). Reason: {reason}")
        if test_result["status"] == "PASSED": test_result["status"] = "FAILED_INVALID_DATA_UNEXPECTED_VALID"
        test_result["invalid_data_validation"] = {"status": "UNEXPECTEDLY_VALID", "details": invalid_data_validation_result.get("result")}
    else:
        reason = invalid_data_validation_result.get("result", {}).get("reason", "No reason provided.")
        print(f"  ✅ Invalid data for {case_name} FAILED validation as expected. Reason: {reason}")
        test_result["invalid_data_validation"] = {"status": "FAILED_AS_EXPECTED", "details": invalid_data_validation_result.get("result")}
        # Check keywords in reason
        expected_keywords = case_config.get("expected_invalid_reason_keywords", [])
        missing_keywords = [kw for kw in expected_keywords if kw.lower() not in reason.lower()]
        if expected_keywords and missing_keywords:
            print(f"    ⚠️  Warning: Expected keywords {missing_keywords} not found in failure reason for invalid data.")
            test_result["invalid_data_validation"]["keyword_check"] = f"Missing: {missing_keywords}"
        elif expected_keywords:
            test_result["invalid_data_validation"]["keyword_check"] = "All expected keywords found."

    return test_result

def save_test_outputs(case_name, results):
    """Saves the generated artifacts and validation report for a test case."""
    case_output_dir = os.path.join(OUTPUT_BASE_DIR, case_name)
    os.makedirs(case_output_dir, exist_ok=True)

    if results.get("generated_prompt"):
        with open(os.path.join(case_output_dir, "generated_prompt.txt"), 'w') as f:
            f.write(results["generated_prompt"])
    
    with open(os.path.join(case_output_dir, "validation_report.json"), 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"  Results for {case_name} saved to {case_output_dir}")

def main():
    print("Starting AI Prompt Handler test suite...")
    # Initialize LLM client directly
    try:
        llm_client = OpenAILLM() # Initialize OpenAILLM directly
        print(f"✅ LLM Client initialized directly: OpenAILLM with model: {llm_client.model_name}")
    except Exception as e:
        print(f"❌ Failed to initialize LLM Client: {e}")
        return

    test_config = load_test_config(CONFIG_FILE_PATH)
    if not test_config or 'test_cases' not in test_config:
        print("Could not load or parse test cases. Exiting.")
        return

    if os.path.exists(OUTPUT_BASE_DIR):
        shutil.rmtree(OUTPUT_BASE_DIR)
    os.makedirs(OUTPUT_BASE_DIR)
    print(f"Cleaned and created output directory: {OUTPUT_BASE_DIR}")

    all_results = []
    overall_summary = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "total_cases": 0,
        "passed_cases": 0,
        "failed_cases": 0,
        "details": []
    }

    for case_config in test_config['test_cases']:
        overall_summary["total_cases"] += 1
        result = run_single_ai_prompt_test(case_config, llm_client)
        all_results.append(result)
        save_test_outputs(case_config['case_name'], result)
        if result["status"] == "PASSED":
            overall_summary["passed_cases"] += 1
        else:
            overall_summary["failed_cases"] += 1
        overall_summary["details"].append({
            "case_name": case_config['case_name'],
            "status": result["status"]
        })
    
    summary_file_path = os.path.join(OUTPUT_BASE_DIR, "overall_ai_prompt_test_summary.json")
    with open(summary_file_path, 'w') as f:
        json.dump(overall_summary, f, indent=2)

    print(f"\n🏁 All configured AI prompt tests completed. Overall summary: {summary_file_path} 🏁")
    print(f"Total: {overall_summary['total_cases']}, Passed: {overall_summary['passed_cases']}, Failed: {overall_summary['failed_cases']}")

if __name__ == "__main__":
    main()
