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
    print("🚀 Starting End-to-End Schema Generation and Validation Flow for Scene Data 🚀")

    # --- Initialize LLM and OmniValidator ---
    try:
        openai_llm_client = OpenAILLM(model="gpt-4o")
    except ValueError as e:
        print(f"🚨 LLM Client Initialization Error: {e}")
        return
    except Exception as e:
        print(f"🚨 An unexpected error occurred during LLM client initialization: {e}")
        return
    ai_handler = OmniValidator(llm_client=openai_llm_client)

    # --- Define Scene Description and Example for Schema Generation ---
    scene_description = """
    This schema describes a scene configuration.
    It must include:
    - 'environment': A required string indicating the setting (e.g., "Kitchen", "Workshop").
    - 'view': A required array of strings describing camera or view characteristics (e.g., "third_person_view", "static", "first_person_view"). Must contain at least one view characteristic.
    - 'objects': A required array of strings, listing the names of objects present in the scene. Can be empty if no specific objects are listed.
    - 'agent_type': A required array of agent description objects. Even if there's only one agent type, it should be in an array. This array can be empty if no agents are defined.
      - Each agent description object within 'agent_type' must have:
        - 'handCount': A required string representing the number of hands.
        - 'armCount': A required string representing the number of arms.
        - 'status': A required string, indicating the agent's mobility status (e.g., "mobile", "static").
    - 'relations': A required array of strings. This array seems to list relationships in a flattened way (e.g., [Subject, Predicate, Object, Subject2, Predicate2, Object2,...]). It should have a number of elements divisible by 3 if it's defining complete relations, or it can be empty.
    - 'task': A required array of strings, possibly describing current tasks or states. Can be empty.

    All top-level fields ('environment', 'view', 'objects', 'agent_type', 'relations', 'task', 'relation') are required.
    """
    scene_example_data_for_generation = [
        {
            "environment": "Kitchen",
            "view": ["third_person_view", "static"],
            "objects": ["Glass Jar with Red Bands", "Water Dispenser", "Soldering Iron"],
            "agent_type": [{"handCount": "2", "armCount": "1", "status": "mobile"}],
            "relations": ["Robotic Arm", "is on top of", "Workbench", "Soldering Iron", "is resting on", "Soldering Stand"],
            "task": ["on"],
        }
    ]

    print("\n--- Generating JSON Schema for Scene Data... ---")
    generation_result = ai_handler.generate_artifact(
        description=scene_description,
        example_data_list=scene_example_data_for_generation
    )

    if not generation_result["success"]:
        print(f"❌ Schema generation failed: {generation_result['error']}. Exiting.")
        return

    generated_schema = generation_result["schema"]
    print("\n✅ Scene Schema Generated Successfully:")
    print(json.dumps(generation_result, indent=2, ensure_ascii=False))

    # --- Define Valid and Invalid Instances for Validation ---
    valid_scene_instance = {
        "environment": "Workshop",
        "view": ["first_person_view"],
        "objects": ["Workbench", "Toolbox"],
        "agent_type": [{"handCount": "0", "armCount": "0", "status": "static"}],
        "relations": ["Toolbox", "is on", "Workbench"],
        "task": [],
        "relation": []
    }

    # 明确违反schema规则的无效实例
    invalid_scene_instance = {
        # 缺少必需的'environment'字段
        # "environment": "Lab",
        
        # 违反minItems: 1规则
        "view": [],
        
        # 包含非字符串类型的项
        "objects": ["Microscope", 123],
        
        # agent_type中的对象缺少必需字段并使用了错误的类型
        "agent_type": [
            {
                "handCount": 2,  # 应该是字符串类型
                # 缺少必需的'armCount'字段
                "status": "mobile"
            }
        ],
        
        # 元素数量不是3的倍数
        "relations": ["Microscope", "is under", "Light", "Computer"],
        
        # 错误的类型(应该是数组)
        "task": "off",
        
        # 应该是空数组
        "relation": ["not empty"]
    }

    # --- Perform Validation ---
    print("\n--- Validating a VALID Scene Instance against Generated Schema ---")
    validation_result_valid = ai_handler.validate_artifact(
        json_data=valid_scene_instance,
        artifact=generated_schema,
        artifact_type="schema"
    )
    pretty_print_validation_result(validation_result_valid, "Valid Scene Instance")

    print("\n--- Validating an INVALID Scene Instance against Generated Schema ---")
    validation_result_invalid = ai_handler.validate_artifact(
        json_data=invalid_scene_instance,
        artifact=generated_schema,
        artifact_type="schema"
    )
    pretty_print_validation_result(validation_result_invalid, "Invalid Scene Instance")

    print("\n🏁 End-to-End Scene Data Test Completed 🏁")

if __name__ == "__main__":
    # from dotenv import load_dotenv
    # load_dotenv()
    run_end_to_end_test()