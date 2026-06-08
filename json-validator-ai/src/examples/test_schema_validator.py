# e2e_schema_validation_flow.py
import json
from typing import Dict, Any

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.llm_interface import OpenAILLM # 使用正确的导入路径
from src.omni_validator import OmniValidator

def pretty_print_validation_result(result: dict, data_name: str):
    """Helper to print validation results in a readable format."""
    print(f"\n--- Validating Case: {data_name} ---")
    print(f"Is Valid: {result['is_valid']}")
    if not result['is_valid']:
        print("Errors:")
        for i, err in enumerate(result['errors']):
            print(f"  Error {i+1}:")
            print(f"    Message  : {err.get('message')}")
            print(f"    Path     : {err.get('path_str')}")
            print(f"    Validator: {err.get('validator')} = {err.get('validator_value')}")
            print(f"    Instance : {err.get('instance_value_snippet')}...")
            print(f"    SchemaPath: {err.get('schema_path_str')}")
    else:
        print("Data is valid according to the schema.")


def run_end_to_end_test():
    print("🚀 Starting End-to-End Schema Generation and Validation Flow 🚀")

    try:
        openai_llm_client = OpenAILLM(model="gpt-4o")
    except ValueError as e:
        print(f"🚨 LLM Client Initialization Error: {e}")
        print("   Please ensure your OPENAI_API_KEY environment variable is set.")
        return
    except Exception as e:
        print(f"🚨 An unexpected error occurred during LLM client initialization: {e}")
        return

    omni_validator = OmniValidator(llm_client=openai_llm_client)

    robotics_description = """
    This schema is for a robotics task execution log.
    It must include a 'taskId' which is a unique string identifier.
    It also requires a 'templateId' which is a string, typically following a format like 'ROBOTICS_TPL_xxxxxx'.
    The core of the log is the 'data' field, which must be an array of step objects. This array cannot be empty.
    Each step object in the 'data' array must have:
    - 'start': an integer representing the start timestamp or sequence number, must be non-negative, begin from 1.
    - 'end': an integer representing the end timestamp or sequence number. It is expected that 'end' logically follows 'start'.
    - 'des': a string describing the action performed in the step. This description is required and should not be empty.
    All top-level fields ('taskId', 'templateId', 'data') are required.
    Within each object in the 'data' array, 'start', 'end', and 'des' are all required.
    """
    robotics_example_for_generation = [
        {
            "taskId": "TASKID_12345_XYZ",
            "templateId": "ROBOTICS_TPL_000001",
            "data": [
                {
                    "start": 1,
                    "end": 19,
                    "des": "Move to grab the cup"
                },
                {
                    "start": 20,
                    "end": 32,
                    "des": "Hold the cup and move it to the auxiliary station"
                }
            ]
        }
    ]

    print("\n--- 步骤 2a: 正在使用 AI 生成 JSON Schema... ---")
    generation_result = omni_validator.generate_artifact(
        description=robotics_description,
        example_data_list=robotics_example_for_generation
    )

    if not generation_result["success"]:
        print(f"❌ Schema generation failed: {generation_result['error']}. Exiting end-to-end test.")
        return

    generated_schema = generation_result["artifact"]
    print("\n✅ Schema Generated Successfully:")
    print(json.dumps(generated_schema, indent=2, ensure_ascii=False))

    valid_instance_to_test = {
        "taskId": "LOG_001_RUN_789",
        "templateId": "ROBOTICS_TPL_000002",
        "data": [
            { "start": 0, "end": 10, "des": "Initialize system" },
            { "start": 11, "end": 25, "des": "Pick up component A" },
            { "start": 26, "end": 40, "des": "Place component A onto chassis" }
        ]
    }

    # Invalid data: 'end' is not greater than 'start' (but schema might not directly enforce this without $data)
    # We will now rely on other potential errors or if the AI puts a simple minimum on 'end'.
    invalid_instance_to_test = {
        "taskId": "LOG_002_ERROR_RUN",
        "templateId": "ROBOTICS_TPL_000003", # This field is now present
        "data": [
            {
                "start": 15,
                "end": 10,  # This specific condition (end > start) might not be directly in schema if $data is avoided.
                           # The AI might put a simple "minimum" on end if not described further.
                           # The primary validation failure here might be other things if this rule isn't easily expressed.
                "des": "Attempt reverse movement"
            },
            {
                "start": 20,
                "end": 30,
                "des": 12345
            }
        ],
        "operatorId": "USER_007"
    }

    invalid_instance_empty_data_array = {
         "taskId": "LOG_003_EMPTY_DATA",
         "templateId": "ROBOTICS_TPL_000004",
         "data": []
    }

    print("\n--- 步骤 3a: 使用生成的 Schema 校验合法数据 ---")
    validation_result_valid = omni_validator.validate_artifact(
        json_data=valid_instance_to_test,
        artifact=generated_schema,
        artifact_type="schema"
    )
    pretty_print_validation_result(validation_result_valid, "Valid Test Instance")

    print("\n--- 步骤 3b: 使用生成的 Schema 校验不合法数据 (多种错误) ---")
    validation_result_invalid = omni_validator.validate_artifact(
        json_data=invalid_instance_to_test,
        artifact=generated_schema,
        artifact_type="schema"
    )
    pretty_print_validation_result(validation_result_invalid, "Invalid Test Instance (Multiple Errors)")

    print("\n--- 步骤 3c: 使用生成的 Schema 校验不合法数据 (空 data 数组) ---")
    validation_result_empty_data = omni_validator.validate_artifact(
        json_data=invalid_instance_empty_data_array,
        artifact=generated_schema,
        artifact_type="schema"
    )
    pretty_print_validation_result(validation_result_empty_data, "Invalid Test Instance (Empty Data Array)")

    print("\n🏁 End-to-End Schema Generation and Validation Flow Completed 🏁")

if __name__ == "__main__":
    run_end_to_end_test()