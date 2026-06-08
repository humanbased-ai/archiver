import sys
import os
import json
import re
from typing import Any, Dict, List, Optional

# Adjust path to import from src
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..', '..') 
sys.path.append(PROJECT_ROOT)

from src.omni_validator import OmniValidator
from src.llm_interface import LLMInterface

class MockLLMForStarlark(LLMInterface):
    @property
    def model_name(self) -> str:
        return "mock_llm_starlark_v1"

    def generate_response(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> Any:
        class MockResponse:
            def __init__(self, content, error=None):
                self.content = content
                self.error = error
        
        # print(f"\n--- MockLLM (Starlark) Called ---")
        # print(f"User Prompt (first 100): {user_prompt[:100]}...")
        # print(f"JSON Mode: {json_mode}")
        # print("------------------------------------\n")

        if "starlark code snippet" in user_prompt.lower() and "user profile" in user_prompt.lower() and not json_mode:
            # Mock response for Starlark code generation
            # Note: Starlark type checking uses strings like 'string', 'int'
            return MockResponse("""
def validate_data(data):
    if not type(data) == 'dict': # Starlark type check for dict
        return {"is_valid": False, "reason": "Input data must be a dictionary (struct)."}

    name = data.get('name')
    age = data.get('age')
    email = data.get('email')

    if not (name and type(name) == 'string' and name != ''):
        return {"is_valid": False, "reason": "'name' must be a non-empty string."}
    # Starlark has no direct 'isinstance' for numbers, relies on type() == 'int'
    if not (type(age) == 'int' and age >= 0):
        return {"is_valid": False, "reason": "'age' must be a non-negative integer."}
    if not (email and type(email) == 'string' and '@' in email and '.' in email.split('@')[-1]):
        return {"is_valid": False, "reason": "'email' must be a valid-looking email address."}
    
    # Starlark's .get() returns None if key is missing. Check for None or explicit presence if needed.
    if data.get('name') == None or data.get('age') == None or data.get('email') == None:
         return {"is_valid": False, "reason": "Missing one or more required fields: name, age, email."}

    return {"is_valid": True, "reason": "Data is valid according to Starlark script."}
""")
        return MockResponse(None, error=f"MockLLM (Starlark): Unhandled prompt. User prompt: {user_prompt[:100]}...")

def run_starlark_example():
    print("===== Running Starlark Handler Example =====")
    mock_llm = MockLLMForStarlark()
    omni_validator_instance = OmniValidator(llm_client=mock_llm)

    test_description = "A user profile requiring a name (non-empty string), a non-negative integer age, and a valid email. All fields (name, age, email) are mandatory."
    test_examples = [
        {"name": "Alice Wonderland", "age": 30, "email": "alice@example.com"},
        {"name": "Bob", "age": 0, "email": "bob@build.it"}
    ]
    
    valid_data_instance = {"name": "Charlie Brown", "age": 8, "email": "charlie.brown@comics.org"}
    invalid_data_type = {"name": "David Copperfield", "age": "forty", "email": "david@example.com"}
    invalid_data_missing_field = {"name": "Eve Harrington", "age": 28} # Missing email
    invalid_data_condition_age = {"name": "Negative Nelly", "age": -5, "email": "nelly@example.com"}
    invalid_data_condition_email = {"name": "Bad Email Guy", "age": 30, "email": "bademail_no_at_sign.com"}
    invalid_data_empty_name = {"name": "", "age": 20, "email": "noname@example.com"}

    artifact_type_to_generate = "starlark"

    # 1. Generate Artifact
    print(f"\n--- Generating {artifact_type_to_generate} ---")
    generation_result = omni_validator_instance.generate_artifact(
        description=test_description,
        example_data_list=test_examples,
        artifact_type=artifact_type_to_generate
    )
    print(f"Generation Result ({artifact_type_to_generate}):")
    if generation_result["success"] and generation_result["artifact"]:
        print(f"  Success: True, Artifact Type: {generation_result['artifact_type']}")
        print(f"  Artifact (first 100 chars): {generation_result['artifact'][:100].strip()}...")
    else:
        print(json.dumps(generation_result, indent=2))

    assert generation_result["success"], f"Generation failed for {artifact_type_to_generate}: {generation_result.get('error')}"
    assert generation_result["artifact"], f"No artifact generated for {artifact_type_to_generate}"
    generated_artifact = generation_result["artifact"]

    # 2. Validate with the generated artifact
    print(f"\n--- Validating with generated {artifact_type_to_generate} ---")

    test_cases = {
        "Valid Data": (valid_data_instance, True),
        "Invalid Data - Type (Age)": (invalid_data_type, False),
        "Invalid Data - Missing Field (Email)": (invalid_data_missing_field, False),
        "Invalid Data - Condition (Negative Age)": (invalid_data_condition_age, False),
        "Invalid Data - Condition (Bad Email)": (invalid_data_condition_email, False),
        "Invalid Data - Condition (Empty Name)": (invalid_data_empty_name, False),
    }

    for case_name, (data_instance, expected_success) in test_cases.items():
        print(f"\nTesting case: {case_name}")
        validation_result = omni_validator_instance.validate_artifact(
            json_data=data_instance,
            artifact=generated_artifact,
            artifact_type=artifact_type_to_generate
        )
        print(f"Validation Result:")
        print(json.dumps(validation_result, indent=2))
        assert validation_result["success"] == expected_success, f"{artifact_type_to_generate} validation for '{case_name}' failed. Expected {expected_success}, got {validation_result['success']}. Reason: {validation_result.get('message')}"

    print(f"\n===== {artifact_type_to_generate.upper()} Handler Example Completed Successfully =====")

if __name__ == "__main__":
    run_starlark_example()
