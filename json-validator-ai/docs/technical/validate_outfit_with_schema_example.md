# Validating Outfit Data with a JSON Schema

This document describes an example Python script that uses `OmniValidator` to validate JSON data against a predefined JSON Schema artifact. This method employs a standard JSON Schema validator (specifically, the `jsonschema` library with Draft 2020-12) to perform the validation.

## Purpose

The goal is to demonstrate how a JSON Schema artifact can be used with `OmniValidator.validate_artifact()` (with `artifact_type="schema"`) to check if given JSON data conforms to the structure, types, and constraints defined in the schema. This example uses a JSON Schema tailored for outfit data and tests it with intentionally invalid data to observe the validator's error detection capabilities.

## Prerequisites

1.  **Python Environment**: Python 3.8+.
2.  **Required Packages**: Ensure `jsonschema` and `python-dotenv` are installed (e.g., via `pip install -r requirements.txt`).
3.  **PYTHONPATH**: Run the script from the project root and set `PYTHONPATH`:
    ```bash
    export PYTHONPATH=.
    ```
4.  **OpenAI API Key (Optional for this specific example)**: While `OmniValidator` can be initialized with an LLM client (which requires `OPENAI_API_KEY`), the `SchemaHandler` for validation does *not* use the LLM. The example script will print a warning if the API key is not found but will proceed with schema validation.

## Example Script: `validate_outfit_with_schema.py`

The script `examples/validate_outfit_with_schema.py` is as follows. It includes the JSON Schema artifact (as a multi-line string) and a sample of invalid JSON data.

```python
import os
import json
from dotenv import load_dotenv
from src.omni_validator import OmniValidator
from src.llm_interface import OpenAILLM # For OmniValidator initialization consistency

# Load environment variables from .env file
load_dotenv()

def main():
    # Initialize the LLM client (e.g., OpenAI)
    # Although SchemaHandler doesn't use LLM for validation, OmniValidator might be initialized with it.
    api_key = os.getenv("OPENAI_API_KEY")
    llm_model = "gpt-4o"
    llm_client = None
    if api_key:
        llm_client = OpenAILLM(api_key=api_key, model=llm_model)
    else:
        print("Warning: OPENAI_API_KEY not found. LLM-dependent features will not work.")
        print("Schema validation does not require an LLM, so this example can proceed.")

    # Initialize OmniValidator
    omni_validator = OmniValidator(llm_client=llm_client)
    print(f"OmniValidator initialized.")

    # Define the JSON Schema artifact (as a string)
    schema_artifact_str = '''
    {
      "type": "object",
      "properties": {
        "taskId": {
          "type": "string",
          "minLength": 1,
          "description": "A non-empty string representing the task ID."
        },
        "templateId": {
          "type": "string",
          "minLength": 1,
          "description": "A non-empty string representing the template ID."
        },
        "data": {
          "type": "object",
          "properties": {
            "top_image": {
              "type": "array",
              "minItems": 1,
              "items": {
                "type": "object",
                "properties": {
                  "uid": {
                    "type": "string",
                    "minLength": 1,
                    "description": "A non-empty string representing the unique identifier for the image."
                  },
                  "url": {
                    "type": "string",
                    "minLength": 1,
                    "pattern": "^https://file\\\\.b18a\\\\.io/.+\\\.jpg$",
                    "description": "A non-empty string URL starting with 'https://file.b18a.io/' and ending with '.jpg'."
                  },
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "description": "A non-empty string representing the name of the image."
                  }
                },
                "required": ["uid", "url", "name"]
              }
            },
            "bottom_image": {
              "type": "array",
              "minItems": 1,
              "items": {
                "type": "object",
                "properties": {
                  "uid": {
                    "type": "string",
                    "minLength": 1,
                    "description": "A non-empty string representing the unique identifier for the image."
                  },
                  "url": {
                    "type": "string",
                    "minLength": 1,
                    "pattern": "^https://file\\\\.b18a\\\\.io/.+\\\.jpg$",
                    "description": "A non-empty string URL starting with 'https://file.b18a.io/' and ending with '.jpg'."
                  },
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "description": "A non-empty string representing the name of the image."
                  }
                },
                "required": ["uid", "url", "name"]
              }
            },
            "full_outfit_image": {
              "type": "array",
              "minItems": 1,
              "items": {
                "type": "object",
                "properties": {
                  "uid": {
                    "type": "string",
                    "minLength": 1,
                    "description": "A non-empty string representing the unique identifier for the image."
                  },
                  "url": {
                    "type": "string",
                    "minLength": 1,
                    "pattern": "^https://file\\\\.b18a\\\\.io/.+\\\.jpg$",
                    "description": "A non-empty string URL starting with 'https://file.b18a.io/' and ending with '.jpg'."
                  },
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "description": "A non-empty string representing the name of the image."
                  }
                },
                "required": ["uid", "url", "name"]
              }
            }
          },
          "required": ["top_image", "bottom_image", "full_outfit_image"],
          "additionalProperties": false
        }
      },
      "required": ["taskId", "templateId", "data"],
      "additionalProperties": false
    }
    '''

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
        }
    }

    print(f"\nValidating data using JSON Schema artifact...")
    # Validate the data using the JSON Schema
    validation_result = omni_validator.validate_artifact(
        json_data=json_data_to_validate,
        artifact=schema_artifact_str,
        artifact_type="schema"
    )

    print("\n--- JSON Schema Validation Result ---")
    print(json.dumps(validation_result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
```

## How to Run

1.  Ensure all prerequisites are met (Python, packages, `PYTHONPATH`).
2.  Navigate to the project root directory.
3.  Run the script:
    ```bash
    PYTHONPATH=. python3 examples/validate_outfit_with_schema.py
    ```

## Expected Output

The script will print initialization messages and then the JSON validation result. The `success` field will be `false`, and the `details` list will contain specific error messages from the `jsonschema` validator, indicating where and why the validation failed.

```text
(Optional: ✅ OpenAI LLM Client initialized with model: gpt-4o or Warning about missing API key)
OmniValidator initialized.

Validating data using JSON Schema artifact...

--- JSON Schema Validation Result ---
{
  "success": false,
  "validation_type": "schema",
  "message": "JSON data is invalid against the schema.",
  "details": [
    "Validation Error at `data`: 'full_outfit_image' is a required property",
    "Validation Error at `data`: Additional properties are not allowed ('extra_field_not_allowed' was unexpected)",
    "Validation Error at `data->bottom_image`: [] should be non-empty",
    "Validation Error at `data->top_image->0->name`: '' should be non-empty",
    "Validation Error at `data->top_image->0->url`: 'http://notb18a.com/image.gif' does not match '^https://file\\.b18a\\.io/.+\\\.jpg$'",
    "Validation Error at `taskId`: '' should be non-empty"
  ]
}
```
This output demonstrates the `jsonschema` validator's ability to rigorously check data against the schema and provide detailed, actionable error messages for each violation.
