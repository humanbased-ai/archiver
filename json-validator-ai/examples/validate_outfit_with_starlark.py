import os
import json

from src.omni_validator import OmniValidator
from src.llm_interface import OpenAILLM # OmniValidator might expect an LLM client

def main():
    # Initialize OmniValidator with the LLM client
    omni_validator = OmniValidator()
    print(f" OmniValidator initialized for validation.")

    # The Starlark code artifact generated previously
    starlark_code_artifact = """def validate_data(data):
    errors = []

    # Validate 'taskId'
    task_id = data.get('taskId')
    if not (type(task_id) == 'string' and task_id):
        errors.append("'taskId' must be a non-empty string.")

    # Validate 'templateId'
    template_id = data.get('templateId')
    if not (type(template_id) == 'string' and template_id):
        errors.append("'templateId' must be a non-empty string.")

    # Validate 'data' field
    data_field = data.get('data')
    if not (type(data_field) == 'dict' and data_field):
        errors.append("'data' must be a non-empty object.")
    else:
        # Check for allowed keys in 'data'
        allowed_keys = ['top_image', 'bottom_image', 'full_outfit_image']
        for key in data_field:
            if key not in allowed_keys:
                errors.append(f"Unexpected field '{key}' in 'data'. Only {allowed_keys} are allowed.")

        # Validate image lists
        for image_key in allowed_keys:
            image_list = data_field.get(image_key)
            if not image_list and image_key not in data_field: # Check if key is missing
                 errors.append(f"'{image_key}' is a required field and must be a non-empty list.")
            elif not (type(image_list) == 'list' and image_list):
                errors.append(f"'{image_key}' must be a non-empty list.")
            else:
                for i, image in enumerate(image_list):
                    if not type(image) == 'dict':
                        errors.append(f"Item {i} in '{image_key}' must be an object.")
                        continue

                    # Validate 'uid', 'url', and 'name'
                    uid = image.get('uid')
                    if not (type(uid) == 'string' and uid):
                        errors.append(f"'uid' in item {i} of '{image_key}' must be a non-empty string.")

                    url = image.get('url')
                    if not (type(url) == 'string' and url.startswith('https://file.b18a.io/') and url.endswith('.jpg')):
                        errors.append(f"'url' in item {i} of '{image_key}' must be a string starting with 'https://file.b18a.io/' and ending with '.jpg'.")

                    name = image.get('name')
                    if not (type(name) == 'string' and name):
                        errors.append(f"'name' in item {i} of '{image_key}' must be a non-empty string.")

    if not errors:
        return {"success": True, "details": ["Data is valid."]}
    else:
        return {"success": False, "details": errors}
"""

    # JSON data to validate (intentionally incorrect)
    json_data_to_validate = {
        "taskId": "",
        "templateId": "OOTD_TPL_000001",
        "data": {
            "top_image": [
                {
                    "uid": "uid1",
                    "url": "http://notb18a.com/image.gif",
                    "name": ""
                }
            ],
            "bottom_image": [],
            "extra_field_not_allowed": "value"
            # 'full_outfit_image' is missing
        }
    }

    print(f"\nValidating data using Starlark artifact...")
    validation_result = omni_validator.validate_artifact(
        json_data=json_data_to_validate,
        artifact=starlark_code_artifact,
        artifact_type="starlark"
        # llm_client is not strictly needed for Starlark validation by StarlarkHandler itself,
        # but OmniValidator.validate_artifact might pass it down.
        # If StarlarkHandler.validate_starlark_code doesn't use it, it's fine.
    )

    print("\n--- Validation Result ---")
    print(json.dumps(validation_result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
