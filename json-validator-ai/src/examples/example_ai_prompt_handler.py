import sys
import os
import json
from typing import Any, Dict, List, Optional

# Adjust path to import from src
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..', '..') 
sys.path.append(PROJECT_ROOT)

from src.omni_validator import OmniValidator
from src.llm_interface import LLMInterface # Keep for type hinting if OmniValidator expects it
# TODO: Implement and import your actual LLM client
# from src.llm_clients.openai_client import OpenAIClient # Example import

DATAS_DIR = os.path.join(PROJECT_ROOT, "src", "datas")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "src", "results")

def run_ai_prompt_example_for_data(omni_validator_instance: OmniValidator, data_config: Dict):
    data_name = data_config["name"]
    description = data_config["description"]
    valid_data_path = data_config["valid_data_path"]
    invalid_data_instance = data_config["invalid_data_instance"]
    artifact_type_to_generate = "ai_prompt"

    print(f"\n===== Running AI Prompt Handler Example for: {data_name.upper()} =====")

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
        example_data_list=[valid_data_instance],
        artifact_type=artifact_type_to_generate
    )
    print(f"Generation Result ({artifact_type_to_generate}):")
    if generation_result["success"] and isinstance(generation_result.get("artifact"), str):
        print(f"  Success: True, Artifact Type: {generation_result['artifact_type']}")
        print(f"  Generated AI Prompt (first 150 chars):\n{generation_result['artifact'][:150].strip()}...")
        if generation_result.get("artifact_documentation"):
            print("\n--- Artifact Documentation ---")
            print(generation_result["artifact_documentation"])
            print("---------------------------\n")
    else:
        print(json.dumps(generation_result, indent=2))

    assert generation_result["success"], f"Generation failed for {data_name} {artifact_type_to_generate}: {generation_result.get('error')}"
    assert isinstance(generation_result["artifact"], str), f"No valid AI prompt artifact generated for {data_name}"
    generated_artifact = generation_result["artifact"]

    # 2. Validate with the generated artifact
    print(f"\n--- Validating with generated {artifact_type_to_generate} for {data_name} ---")

    test_cases = {
        f"Valid {data_name} Data (from file)": (valid_data_instance, True),
        f"Invalid {data_name} Data": (invalid_data_instance, False),
    }

    for case_name, (data_instance_to_validate, expected_success) in test_cases.items():
        # For AI Prompt, the llm_client is passed to validate_artifact
        validation_result = omni_validator_instance.validate_artifact(
            json_data=data_instance_to_validate,
            artifact=generated_artifact,
            artifact_type=artifact_type_to_generate,
            llm_client=omni_validator_instance.llm_client # Pass the mock LLM for validation step
        )
        print(f"Validation ({case_name}):")
        print(json.dumps(validation_result, indent=2))
        assert validation_result["success"] == expected_success, f"{artifact_type_to_generate} validation for '{case_name}' failed. Expected {expected_success}, got {validation_result['success']}. Reason: {validation_result.get('message')}"

    print(f"\n===== AI Prompt Handler Example for {data_name.upper()} Completed Successfully =====")

if __name__ == "__main__":
    # TODO: Replace with your actual LLM client implementation
    # Ensure your LLM client conforms to the LLMInterface protocol.
    # Example: real_llm_client = OpenAIClient(api_key=os.environ.get("OPENAI_API_KEY"))
    # For this example to run, you need to create/import and instantiate a real LLM client.
    # We'll use a placeholder that will raise an error if not replaced.
    class PlaceholderLLMClient(LLMInterface):
        @property
        def model_name(self) -> str:
            return "placeholder_llm_v1"
        def generate_response(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> Any:
            raise NotImplementedError(
                "Please replace PlaceholderLLMClient with your actual LLM client implementation "
                "in example_ai_prompt_handler.py (e.g., OpenAIClient, AnthropicClient). "
                "Ensure it's initialized correctly (e.g., with an API key)."
            )

    actual_llm_client = PlaceholderLLMClient() 
    # If you have an OpenAIClient, it might look like:
    # from src.llm_clients.openai_client import OpenAIClient # Make sure this path is correct
    # if not os.environ.get("OPENAI_API_KEY"):
    #     print("Error: OPENAI_API_KEY environment variable not set.")
    #     sys.exit(1)
    # actual_llm_client = OpenAIClient(api_key=os.environ.get("OPENAI_API_KEY"))
    
    omni_validator = OmniValidator(llm_client=actual_llm_client)

    # --- Configuration for outfit.json ---
    outfit_description = "An outfit submission requires taskId, templateId (starting with OOTD_TPL_), and data. Data includes non-empty arrays of imageObjects for top_image, bottom_image, full_outfit_image. Each imageObject needs uid, a valid https url, and name."
    outfit_valid_data_path = os.path.join(DATAS_DIR, "outfit.json")
    outfit_invalid_data_path = os.path.join(RESULTS_DIR, "outfit_invalid_example.json")
    outfit_invalid_data = None
    try:
        with open(outfit_invalid_data_path, 'r') as f_invalid:
            outfit_invalid_data = json.load(f_invalid)
        print(f"Successfully loaded invalid data from: {outfit_invalid_data_path}")
    except Exception as e:
        print(f"Error loading invalid data from {outfit_invalid_data_path}: {e}")
        # Decide if you want to exit or continue with a default invalid instance
        outfit_invalid_data = {
            "taskId": "taskError",
            "templateId": "WRONG_TPL_000", # Invalid templateId
            "data": {
                "top_image": [], # Potentially invalid if non-empty is strict rule
                "bottom_image": [{"uid": "b1", "url": "http://example.com/b.jpg", "name": "b.jpg"}], # http instead of https
                # Missing full_outfit_image
            }
        }
        print(f"Using default invalid data for outfit due to loading error.")


    data_configs = [
        {
            "name": "outfit",
            "description": outfit_description,
            "valid_data_path": outfit_valid_data_path,
            "invalid_data_instance": outfit_invalid_data,
        },
        # Add other data configurations here if needed
    ]

    for config in data_configs:
        run_ai_prompt_example_for_data(omni_validator, config)

    print("\n===== All AI Prompt Handler Examples Completed. =====")
