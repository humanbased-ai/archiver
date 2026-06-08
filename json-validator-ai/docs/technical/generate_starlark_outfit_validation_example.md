# Generating a Starlark Validation Script for Outfit Data

This document describes an example Python script that uses the `OmniValidator` to generate a Starlark validation script based on a natural language description and example data. The generated Starlark script can then be used to validate outfit data structures.

## Purpose

The goal is to demonstrate how `OmniValidator` can produce executable Starlark code that enforces specific data validation rules. This is useful for scenarios where validation logic needs to be deployed in environments that support Starlark.

## Prerequisites

1.  **Python Environment**: Ensure you have Python 3.8+ installed.
2.  **Required Packages**: Install necessary packages. If you have a `requirements.txt`:
    ```bash
    pip install -r requirements.txt
    ```
    Ensure `openai` and `python-dotenv` are included.
3.  **OpenAI API Key**: Set your `OPENAI_API_KEY` as an environment variable. You can do this by creating a `.env` file in the project root with the following content:
    ```env
    OPENAI_API_KEY='your_actual_api_key_here'
    ```
4.  **PYTHONPATH**: To ensure the script can find the `src` module, run the script from the project root directory and set the `PYTHONPATH` environment variable:
    ```bash
    export PYTHONPATH=.
    # or for a single command:
    # PYTHONPATH=. python3 examples/generate_starlark_outfit_validation.py
    ```

## Example Script: `generate_starlark_outfit_validation.py`

The following Python script (`examples/generate_starlark_outfit_validation.py`) uses `OmniValidator` to generate the Starlark code:

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
    # Ensure your OPENAI_API_KEY is set in your environment or .env file
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not found. Please set it in your environment or .env file.")
        return

    llm_model = "gpt-4o"
    # OpenAILLM constructor prints its own initialization message
    llm_client = OpenAILLM(api_key=api_key, model=llm_model)

    # Initialize OmniValidator with the LLM client
    omni_validator = OmniValidator(llm_client=llm_client)
    print(f" OmniValidator initialized with LLM: {llm_model}")

    # Define the natural language description for the Starlark validation script
    description = ("""
    Here's how to validate the outfit data:
    'taskId' and 'templateId' must be strings and cannot be empty.
    There must be a 'data' field, and it must be an object.
    Inside 'data', the fields 'top_image', 'bottom_image', and 'full_outfit_image' must be lists, and these lists cannot be empty.
    Each item in these image lists must be an object. Inside these image objects, 'uid', 'url', and 'name' must all be strings and cannot be empty.
    All 'url' strings must start with 'https://file.b18a.io/' and end with '.jpg'.
    The 'data' object should only contain 'top_image', 'bottom_image', and 'full_outfit_image'. No other fields are allowed.
    """)

    # Provide example data for context (optional, but helpful for the LLM)
    example_data = {
        "taskId": "7528465136400103577",
        "templateId": "OOTD_TPL_000001",
        "data": {
            "top_image": [
                {
                    "uid": "uid1",
                    "url": "https://file.b18a.io/top.jpg",
                    "name": "top.jpg"
                }
            ],
            "bottom_image": [
                {
                    "uid": "uid2",
                    "url": "https://file.b18a.io/bottom.jpg",
                    "name": "bottom.jpg"
                }
            ],
            "full_outfit_image": [
                {
                    "uid": "uid3",
                    "url": "https://file.b18a.io/full.jpg",
                    "name": "full.jpg"
                }
            ]
        }
    }

    print(f"Generating 'starlark' artifact using LLM: {llm_model}...")
    # Generate the Starlark validation script
    result = omni_validator.generate_artifact(
        description=description,
        example_data_list=[example_data],
        artifact_type="starlark"
    )

    # Print the raw result dictionary
    print("\nRaw result dictionary:")
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # Print the generated Starlark script or an error message
    print("\n--- Generation Result ---")
    if result["success"] and result["artifact"]:
        print("Success: True")
        print("Generated Artifact (Starlark Code):")
        print(result["artifact"])
    else:
        print("Success: False")
        print(f"Error: {result.get('error', 'Unknown error')}")
        if result.get("artifact"):
            print("Partial Artifact (if any):")
            print(result["artifact"])

if __name__ == "__main__":
    main()
```

## How to Run

1.  Ensure all prerequisites are met (Python, packages, API key, `PYTHONPATH`).
2.  Navigate to the project root directory in your terminal.
3.  Run the script:
    ```bash
    PYTHONPATH=. python3 examples/generate_starlark_outfit_validation.py
    ```

## Expected Output

The script will print initialization messages, the raw result dictionary from `OmniValidator`, and then the generated Starlark code string.

```text
✅ OpenAI LLM Client initialized with model: gpt-4o
 OmniValidator initialized with LLM: gpt-4o
Generating 'starlark' artifact using LLM: gpt-4o...
💬 Sending request to OpenAI model: gpt-4o (JSON mode: False)

Raw result dictionary:
{
  "success": true,
  "artifact": "def validate_data(data):\n    errors = []\n\n    # Validate 'taskId'\n    task_id = data.get('taskId')\n    if not (type(task_id) == 'string' and task_id):\n        errors.append(\"'taskId' must be a non-empty string.\")\n\n    # Validate 'templateId'\n    template_id = data.get('templateId')\n    if not (type(template_id) == 'string' and template_id):\n        errors.append(\"'templateId' must be a non-empty string.\")\n\n    # Validate 'data' field\n    data_field = data.get('data')\n    if not (type(data_field) == 'dict' and data_field):\n        errors.append(\"'data' must be a non-empty object.\")\n    else:\n        # Check for allowed keys in 'data'\n        allowed_keys = ['top_image', 'bottom_image', 'full_outfit_image']\n        for key in data_field:\n            if key not in allowed_keys:\n                errors.append(f\"Unexpected field '{key}' in 'data'. Only {allowed_keys} are allowed.\")\n\n        # Validate image lists\n        for image_key in allowed_keys:\n            image_list = data_field.get(image_key)\n            if not (type(image_list) == 'list' and image_list):\n                errors.append(f\"'{image_key}' must be a non-empty list.\")\n            else:\n                for image in image_list:\n                    if not type(image) == 'dict':\n                        errors.append(f\"Each item in '{image_key}' must be an object.\")\n                        continue\n\n                    # Validate 'uid', 'url', and 'name'\n                    uid = image.get('uid')\n                    if not (type(uid) == 'string' and uid):\n                        errors.append(f\"'uid' in '{image_key}' must be a non-empty string.\")\n\n                    url = image.get('url')\n                    if not (type(url) == 'string' and url.startswith('https://file.b18a.io/') and url.endswith('.jpg')):\n                        errors.append(f\"'url' in '{image_key}' must be a string starting with 'https://file.b18a.io/' and ending with '.jpg'.\")\n\n                    name = image.get('name')\n                    if not (type(name) == 'string' and name):\n                        errors.append(f\"'name' in '{image_key}' must be a non-empty string.\")\n\n    if not errors:\n        return {\"success\": True, \"details\": \"Data is valid.\"}\n    else:\n        return {\"success\": False, \"details\": errors}",
  "error": null
}

--- Generation Result ---
Success: True
Generated Artifact (Starlark Code):
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
            if not (type(image_list) == 'list' and image_list):
                errors.append(f"'{image_key}' must be a non-empty list.")
            else:
                for image in image_list:
                    if not type(image) == 'dict':
                        errors.append(f"Each item in '{image_key}' must be an object.")
                        continue

                    # Validate 'uid', 'url', and 'name'
                    uid = image.get('uid')
                    if not (type(uid) == 'string' and uid):
                        errors.append(f"'uid' in '{image_key}' must be a non-empty string.")

                    url = image.get('url')
                    if not (type(url) == 'string' and url.startswith('https://file.b18a.io/') and url.endswith('.jpg')):
                        errors.append(f"'url' in '{image_key}' must be a string starting with 'https://file.b18a.io/' and ending with '.jpg'.")

                    name = image.get('name')
                    if not (type(name) == 'string' and name):
                        errors.append(f"'name' in '{image_key}' must be a non-empty string.")

    if not errors:
        return {"success": True, "details": "Data is valid."}
    else:
        return {"success": False, "details": errors}
```

If generation fails, an error message will be displayed instead.
