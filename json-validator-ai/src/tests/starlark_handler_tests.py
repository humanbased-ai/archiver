import json
import os
import shutil
import sys
from datetime import datetime

# Adjust path to import from project root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..', '..')
sys.path.insert(0, PROJECT_ROOT)

from src.llm_interface import OpenAILLM
from src.artifact_handlers.starlark_handler import StarlarkHandler

CONFIG_FILE_PATH = "src/tests/test_starlark_cases_config.json"
OUTPUT_BASE_DIR = "src/tests/test_outputs_starlark"

def load_test_config(config_path):
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Test configuration file not found at {config_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error: Could not decode JSON from {config_path}. Error: {e}")
        return None

def check_keywords(text, keywords):
    if not text or not keywords:
        return []
    return [kw for kw in keywords if kw.lower() not in text.lower()]

def run_single_starlark_test(case_config, llm_client, handler):
    case_name = case_config['case_name']
    print(f"\n--- Running Starlark Handler Test Case: {case_name} ---")

    results = {
        "case_name": case_name,
        "generation_result": None,
        "generated_code_validation": {},
        "status": "SKIPPED" # Default to skipped, update as tests run
    }

    # 1. Generate Starlark Code
    print(f"  1. Generating Starlark code for '{case_name}'...")
    generation_desc = case_config['description'] 
    example_data_gen = case_config.get('example_json_data', []) 
    
    gen_result = handler.generate_starlark_code(llm_client, generation_desc, example_data_gen)
    results["generation_result"] = gen_result

    generated_starlark_code = None
    if gen_result and gen_result.get("success") and gen_result.get("artifact"):
        generated_starlark_code = gen_result["artifact"]
        print(f"    ✅ Starlark code generated successfully.")
        results["status"] = "PENDING_VALIDATION" # Mark as pending further tests
    else:
        error_msg = gen_result.get("error", "Unknown error during generation.")
        print(f"    ❌ Starlark code generation FAILED. Error: {error_msg}")
        results["status"] = "GENERATION_FAILED"
        return results # Early exit if generation fails

    # 2. Test Generated Code
    print(f"  2. Testing generated Starlark code for '{case_name}'...")
    if not example_data_gen or len(example_data_gen) < 2:
        print(f"    ⚠️ Skipping generated code validation: 'example_json_data' needs at least two examples (valid and invalid). Found {len(example_data_gen)}.")
        if results["status"] != "GENERATION_FAILED": results["status"] = "MISSING_EXAMPLE_DATA_FOR_TESTING"
        return results

    # Test with valid data (example_json_data[0])
    valid_data_gen = example_data_gen[0]
    val_res_gen_valid = handler.validate_starlark_code(valid_data_gen, generated_starlark_code)
    results["generated_code_validation"]["valid_case_from_example"] = val_res_gen_valid
    if val_res_gen_valid.get("success") and val_res_gen_valid.get("message"):
        print(f"    ✅ Generated code validated VALID data (example_json_data[0]) successfully as expected.")
    else:
        print(f"    ❌ Generated code FAILED to validate VALID data (example_json_data[0]). Reason: {val_res_gen_valid.get('message', 'No reason')}")
        if results["status"] != "GENERATION_FAILED": results["status"] = "GENERATED_CODE_VALID_CASE_FAILED"

    # Test with invalid data (example_json_data[1])
    invalid_data_gen = example_data_gen[1]
    val_res_gen_invalid = handler.validate_starlark_code(invalid_data_gen, generated_starlark_code)
    results["generated_code_validation"]["invalid_case_from_example"] = val_res_gen_invalid
    # Expected keywords check removed as it's not in the new config
    if not val_res_gen_invalid.get("success") and val_res_gen_invalid.get("message"):
        print(f"    ✅ Generated code FAILED to validate INVALID data (example_json_data[1]) as expected. Reason: {val_res_gen_invalid['message']}")
        # Simplified check: ensure a reason is provided for invalid data
        if not val_res_gen_invalid['message'].strip():
            print(f"      ⚠️ Reason for invalid data is empty or missing.")
            results["generated_code_validation"]["invalid_case_from_example"]["reason_check"] = "Reason empty or missing"
            if results["status"] not in ["GENERATION_FAILED", "GENERATED_CODE_VALID_CASE_FAILED"]: results["status"] = "GENERATED_CODE_INVALID_REASON_MISSING"
        else:
            results["generated_code_validation"]["invalid_case_from_example"]["reason_check"] = "Reason provided."
    else:
        print(f"    ❌ Generated code UNEXPECTEDLY validated INVALID data (example_json_data[1]). Message: {val_res_gen_invalid.get('message', 'No reason')}")
        if results["status"] not in ["GENERATION_FAILED", "GENERATED_CODE_VALID_CASE_FAILED"]: results["status"] = "GENERATED_CODE_INVALID_CASE_PASSED"

    # Final status determination for this case
    if results["status"] == "PENDING_VALIDATION":
        # This means generation was successful, and no test failures occurred for generated code
        results["status"] = "PASSED"
    elif results["status"] == "SKIPPED": # Should not happen if tests run and generation was attempted
        results["status"] = "UNKNOWN_ERROR_OR_SKIPPED"

    print(f"  Final status for {case_name}: {results['status']}")
    return results

def save_test_outputs(case_name, results):
    case_output_dir = os.path.join(OUTPUT_BASE_DIR, case_name)
    os.makedirs(case_output_dir, exist_ok=True)

    if results.get("generation_result") and results["generation_result"].get("artifact"):
        with open(os.path.join(case_output_dir, "generated_starlark_code.star"), 'w', encoding='utf-8') as f:
            f.write(results["generation_result"]["artifact"])
    
    with open(os.path.join(case_output_dir, "full_case_report.json"), 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"  Results and artifacts for {case_name} saved to {case_output_dir}")

def main():
    print("Starting Starlark Handler test suite...")
    try:
        llm_client = OpenAILLM()
        print(f"✅ LLM Client initialized: OpenAILLM with model: {llm_client.model_name}")
    except Exception as e:
        print(f"❌ Failed to initialize LLM Client: {e}")
        return

    handler = StarlarkHandler()
    test_config = load_test_config(CONFIG_FILE_PATH)

    if not test_config or 'test_cases' not in test_config:
        print("Could not load or parse test cases. Exiting.")
        return

    if os.path.exists(OUTPUT_BASE_DIR):
        shutil.rmtree(OUTPUT_BASE_DIR)
    os.makedirs(OUTPUT_BASE_DIR)
    print(f"Cleaned and created output directory: {OUTPUT_BASE_DIR}")

    overall_summary = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "total_cases": 0,
        "passed_cases": 0,
        "failed_cases": 0,
        "details": []
    }

    for case_config in test_config['test_cases']:
        overall_summary["total_cases"] += 1
        result = run_single_starlark_test(case_config, llm_client, handler)
        save_test_outputs(case_config['case_name'], result)
        
        final_status = result.get("status", "UNKNOWN")
        if final_status == "PASSED":
            overall_summary["passed_cases"] += 1
        else:
            overall_summary["failed_cases"] += 1
        overall_summary["details"].append({
            "case_name": case_config['case_name'],
            "status": final_status
        })
    
    summary_file_path = os.path.join(OUTPUT_BASE_DIR, "overall_starlark_test_summary.json")
    with open(summary_file_path, 'w', encoding='utf-8') as f:
        json.dump(overall_summary, f, indent=2, ensure_ascii=False)

    print(f"\n🏁 All configured Starlark Handler tests completed. Overall summary: {summary_file_path} 🏁")
    print(f"Total: {overall_summary['total_cases']}, Passed: {overall_summary['passed_cases']}, Failed: {overall_summary['failed_cases']}")

if __name__ == "__main__":
    main()
