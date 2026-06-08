import sys
import os
import json
import re # For MockLLM
from typing import Any, Dict, List, Optional

# Adjust path to import from src
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..', '..') 
sys.path.append(PROJECT_ROOT)

from src.omni_validator import OmniValidator
from src.llm_interface import LLMInterface

DATAS_DIR = os.path.join(PROJECT_ROOT, "src", "datas")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "src", "results") # Assuming invalid examples might be here or defined in script

class MockLLMForSchema(LLMInterface):
    @property
    def model_name(self) -> str:
        return "mock_llm_schema_v1"

    def generate_response(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> Any:
        class MockResponse:
            def __init__(self, content, error=None):
                self.content = content
                self.error = error

        # print(f"\n--- MockLLM (Schema) Called ---")
        # print(f"User Prompt (first 100): {user_prompt[:100]}...")
        # print(f"JSON Mode: {json_mode}")
        # print("------------------------------------\n")

        if "json schema" in user_prompt.lower() and json_mode:
            if "outfit submission" in user_prompt.lower(): # Hint for outfit data
                # Schema for outfit.json
                schema_dict = {
                    "type": "object",
                    "properties": {
                        "taskId": {"type": "string"},
                        "templateId": {"type": "string", "pattern": "^OOTD_TPL_"},
                        "data": {
                            "type": "object",
                            "properties": {
                                "top_image": {"type": "array", "minItems": 1, "items": {"$ref": "#/definitions/imageObject"}},
                                "bottom_image": {"type": "array", "minItems": 1, "items": {"$ref": "#/definitions/imageObject"}},
                                "full_outfit_image": {"type": "array", "minItems": 1, "items": {"$ref": "#/definitions/imageObject"}}
                            },
                            "required": ["top_image", "bottom_image", "full_outfit_image"]
                        }
                    },
                    "required": ["taskId", "templateId", "data"],
                    "definitions": {
                        "imageObject": {
                            "type": "object",
                            "properties": {
                                "uid": {"type": "string"},
                                "url": {"type": "string", "format": "uri", "pattern": "^https?:\\/\\/"},
                                "name": {"type": "string"}
                            },
                            "required": ["uid", "url", "name"]
                        }
                    }
                }
                return MockResponse(content=json.dumps(schema_dict)) # Serialize to JSON string
            # Add other elif conditions here for other data types (speech, nft, food) later
            else:
                # Fallback or default schema if needed, or error
                return MockResponse(None, error="MockLLM (Schema): Unhandled data type for schema generation.")
        
        return MockResponse(None, error=f"MockLLM (Schema): Unhandled prompt type. User prompt: {user_prompt[:100]}...")

def run_schema_example_for_data(omni_validator_instance: OmniValidator, data_config: Dict):
    data_name = data_config["name"]
    description = data_config["description"]
    valid_data_path = data_config["valid_data_path"]
    invalid_data_instance = data_config["invalid_data_instance"] # Direct dict for invalid data
    artifact_type_to_generate = "schema"

    print(f"\n===== Running Schema Handler Example for: {data_name.upper()} =====")

    try:
        with open(valid_data_path, 'r') as f:
            valid_data_instance = json.load(f)
        print(f"Successfully loaded valid data from: {valid_data_path}")
    except Exception as e:
        print(f"Error loading valid data from {valid_data_path}: {e}")
        return

    # 1. Generate Artifact
    print(f"\n--- Generating {artifact_type_to_generate} for {data_name} ---")
    generation_result = omni_validator_instance.generate_artifact(
        description=description,
        example_data_list=[valid_data_instance], # Use loaded valid data as example
        artifact_type=artifact_type_to_generate
    )
    print(f"Generation Result ({artifact_type_to_generate}):")
    # Schema artifact is a dict, so directly print it or its dump
    if generation_result["success"] and isinstance(generation_result.get("artifact"), dict):
         print(json.dumps(generation_result["artifact"], indent=2))
         if generation_result.get("artifact_documentation"):
             print("\n--- Artifact Documentation ---")
             # Replace {data_name} placeholder if handlers use it, or just print
             # For now, assume data_name is already incorporated or not needed for schema handler's doc
             print(generation_result["artifact_documentation"])
             print("---------------------------\n")
    else:
        print(json.dumps(generation_result, indent=2)) # Print full result if not as expected

    assert generation_result["success"], f"Generation failed for {data_name} {artifact_type_to_generate}: {generation_result.get('error')}"
    assert isinstance(generation_result["artifact"], dict), f"No valid schema artifact generated for {data_name}"
    generated_artifact = generation_result["artifact"]

    # 2. Validate with the generated artifact
    print(f"\n--- Validating with generated {artifact_type_to_generate} for {data_name} ---")

    test_cases = {
        f"Valid {data_name} Data (from file)": (valid_data_instance, True),
        f"Invalid {data_name} Data": (invalid_data_instance, False),
    }

    for case_name, (data_instance_to_validate, expected_success) in test_cases.items():
        validation_result = omni_validator_instance.validate_artifact(
            json_data=data_instance_to_validate,
            artifact=generated_artifact, # This is a dict (the schema itself)
            artifact_type=artifact_type_to_generate
        )
        print(f"Validation ({case_name}):")
        print(json.dumps(validation_result, indent=2))
        assert validation_result["success"] == expected_success, f"{artifact_type_to_generate} validation for '{case_name}' failed. Expected {expected_success}, got {validation_result['success']}. Reason: {validation_result.get('message')}"

    print(f"\n===== Schema Handler Example for {data_name.upper()} Completed Successfully =====")


if __name__ == "__main__":
    mock_llm_schema = MockLLMForSchema()
    omni_validator = OmniValidator(llm_client=mock_llm_schema)

    # --- Configuration for outfit.json ---
    outfit_description = "The data represents an outfit submission. It must have a taskId (string), a templateId (string, typically starting with 'OOTD_TPL_'), and a data object. The data object must contain top_image, bottom_image, and full_outfit_image. Each of these image fields must be an array containing at least one object. Each image object within these arrays must have a uid (string), a url (string, valid URL format, preferably HTTPS), and a name (string, the image file name). All fields (taskId, templateId, data, and all fields within each image object including uid, url, name) are mandatory."
    outfit_valid_data_path = os.path.join(DATAS_DIR, "outfit.json")
    # Load invalid outfit data from the file we created earlier
    outfit_invalid_data_path = os.path.join(RESULTS_DIR, "outfit_invalid_example.json")
    outfit_invalid_data = None
    try:
        with open(outfit_invalid_data_path, 'r') as f_invalid:
            outfit_invalid_data = json.load(f_invalid)
    except Exception as e:
        print(f"ERROR: Could not load invalid outfit data from {outfit_invalid_data_path}: {e}")
        print("Please ensure this file exists and is valid JSON.")
        # Define a fallback inline if file loading fails, for script to run partially
        outfit_invalid_data = {
            "taskId": "invalid_task", # Missing templateId
            "data": {"top_image": []} # Invalid: top_image is empty array
        }

    data_processing_configs = []
    if os.path.exists(outfit_valid_data_path) and outfit_invalid_data:
        data_processing_configs.append({
            "name": "outfit",
            "description": outfit_description,
            "valid_data_path": outfit_valid_data_path,
            "invalid_data_instance": outfit_invalid_data
        })
    else:
        if not os.path.exists(outfit_valid_data_path):
            print(f"WARNING: Valid data file not found: {outfit_valid_data_path}")
        if not outfit_invalid_data:
             print(f"WARNING: Invalid data for outfit could not be loaded or defined.")

    # TODO: Add configurations for speech.json, nft.json, food.json here later
    # Example for a hypothetical 'speech.json':
    # speech_description = "..."
    # speech_valid_data_path = os.path.join(DATAS_DIR, "speech.json")
    # speech_invalid_data = { ... } # or load from file
    # if os.path.exists(speech_valid_data_path):
    #     data_processing_configs.append({
    #         "name": "speech", 
    #         "description": speech_description, 
    #         "valid_data_path": speech_valid_data_path, 
    #         "invalid_data_instance": speech_invalid_data
    #     })

    if not data_processing_configs:
        print("No data configurations found or loaded. Exiting example script.")
        print(f"Please ensure {outfit_valid_data_path} and {outfit_invalid_data_path} exist and are readable.")
    else:
        for config in data_processing_configs:
            run_schema_example_for_data(omni_validator, config)

    print("\n===== All Schema Handler Examples Completed. =====")
