# Validating Outfit Data with a Starlark Script

This document describes an example Python script that uses `OmniValidator` to validate JSON data against a pre-defined Starlark validation script. This demonstrates how to apply the generated Starlark logic to actual data.

## Purpose

The goal is to show how to use a Starlark artifact (generated in a previous step or defined manually) with `OmniValidator.validate_artifact()` to check if given JSON data conforms to the rules encoded in the Starlark script. This example specifically uses a Starlark script designed for outfit data and tests it with intentionally invalid data to observe the error reporting.

## Prerequisites

1.  **Python Environment**: Python 3.8+.
2.  **Required Packages**: Ensure `openai` and `python-dotenv` are installed (e.g., via `pip install -r requirements.txt`).
3.  **OpenAI API Key**: While Starlark validation itself doesn't directly call the LLM, `OmniValidator` might be initialized with an LLM client. Set your `OPENAI_API_KEY` in a `.env` file or as an environment variable.
    ```env
    OPENAI_API_KEY='your_actual_api_key_here'
    ```
4.  **PYTHONPATH**: Run the script from the project root and set `PYTHONPATH`:
    ```bash
    export PYTHONPATH=.
    ```

## Example Script: `validate_outfit_with_starlark.py`

The script `examples/validate_outfit_with_starlark.py` is as follows. It includes the Starlark code (which would typically be generated or loaded from a file) and a sample of invalid JSON data.

```python
import os
import json
from dotenv import load_dotenv
from src.omni_validator import OmniValidator
from src.llm_interface import OpenAILLM

# Load environment variables from .env file
load_dotenv()

def main():
    # Initialize the LLM client (e.g., OpenAI)
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not found. Please set it in your environment or .env file.")
        return

    llm_model = "gpt-4o"
    llm_client = OpenAILLM(api_key=api_key, model=llm_model)

    # Initialize OmniValidator
    omni_validator = OmniValidator(llm_client=llm_client)
    print(f" OmniValidator initialized for validation.")

    # The Starlark code artifact (as generated in the previous example, with minor error reporting enhancements)
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
    )

    print("\n--- Validation Result ---")
    print(json.dumps(validation_result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
```

## How to Run

1.  Ensure all prerequisites are met.
2.  Navigate to the project root directory.
3.  Run the script:
    ```bash
    PYTHONPATH=. python3 examples/validate_outfit_with_starlark.py
    ```

## Expected Output

The script will print initialization messages, a warning about executing Starlark code (this comes from `StarlarkHandler`), and then the JSON validation result. The `success` field will be `false`, and the `details` list will enumerate the validation errors found.

```text
✅ OpenAI LLM Client initialized with model: gpt-4o
 OmniValidator initialized with LLM: gpt-4o
 OmniValidator initialized for validation.

Validating data using Starlark artifact...

--- WARNING: Executing LLM-generated Starlark code (via Python's exec). ---
Ensure the code's origin and content are trusted. Starlark has sandboxing, but `exec` is Python's.
Code to be executed:
def validate_data(data):
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
    data_field = data.get('data')...
---

--- Validation Result ---
{
  "success": false,
  "validation_type": "starlark",
  "message": "Starlark validation failed.",
  "details": [
    "'taskId' must be a non-empty string.",
    "Unexpected field 'extra_field_not_allowed' in 'data'. Only ['top_image', 'bottom_image', 'full_outfit_image'] are allowed.",
    "'url' in item 0 of 'top_image' must be a string starting with 'https://file.b18a.io/' and ending with '.jpg'.",
    "'name' in item 0 of 'top_image' must be a non-empty string.",
    "'bottom_image' must be a non-empty list.",
    "'full_outfit_image' is a required field and must be a non-empty list."
  ]
}
```
This output confirms that the Starlark script correctly identified all the deliberately introduced errors in the `json_data_to_validate`.
