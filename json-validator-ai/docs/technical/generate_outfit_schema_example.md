# Technical Documentation: Generating an Outfit JSON Schema

This document describes how to use the `OmniValidator` to generate a JSON schema for validating outfit data, based on a natural language description and an example data instance.

## Purpose

The primary goal is to demonstrate the `OmniValidator.generate_artifact` method's capability to produce a JSON schema using an LLM (Large Language Model). This schema can then be used to validate data structures, ensuring they conform to specified requirements.

## Prerequisites

1.  **Python Environment**: Ensure you have Python 3.8+ installed.
2.  **Project Setup**:
    *   Clone the `json-validator-ai` repository.
    *   Install dependencies: It's assumed that necessary dependencies (like `openai`, `jsonschema`) are listed in a `requirements.txt` file at the project root. If so, run `pip install -r requirements.txt`.
    *   Ensure the `src` directory is in your `PYTHONPATH` or run the script from the project's root directory so that imports like `from src.omni_validator import OmniValidator` work correctly.
3.  **OpenAI API Key**:
    *   You need an active OpenAI API key.
    *   Set the `OPENAI_API_KEY` environment variable:
        ```bash
        export OPENAI_API_KEY='your_openai_api_key_here'
        ```
        Replace `'your_openai_api_key_here'` with your actual key.

## Script: `examples/generate_outfit_schema.py`

The following Python script demonstrates the schema generation process:

```python
import os
import json
from typing import List, Dict, Any

# Ensure PYTHONPATH is set up to find 'src' or run from project root
# Example: export PYTHONPATH=$PYTHONPATH:/path/to/json-validator-ai
from src.omni_validator import OmniValidator
from src.llm_interface import OpenAILLM # Using the concrete OpenAI LLM client

def main():
    # 1. Setup LLM Client
    # Ensure OPENAI_API_KEY is set in your environment variables
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set.")
        print("Please set it before running the script.")
        print("Example: export OPENAI_API_KEY='your_key_here'")
        return

    # Initialize the LLM client (e.g., OpenAI).
    # You can specify a model like "gpt-4", "gpt-3.5-turbo".
    # The OpenAILLM class defaults to "gpt-4o" if no model is specified.
    llm_client = OpenAILLM(api_key=api_key, model="gpt-4o")
    # Alternatively, use the default model:
    # llm_client = OpenAILLM(api_key=api_key)

    # 2. Instantiate OmniValidator
    # OmniValidator orchestrates artifact generation and validation.
    validator = OmniValidator(llm_client=llm_client)

    # 3. Define parameters for artifact generation
    # Natural language description of the data structure and validation rules.
    description = """This data describes an outfit. It needs a 'taskId' and a 'templateId'; both must be non-empty strings. There's a 'data' object, which is required. Inside 'data', we need 'top_image', 'bottom_image', and 'full_outfit_image'. Each of these must be a list of image items, and these lists cannot be empty. Each image item needs a 'uid', a 'url', and a 'name'; all of these must be non-empty strings. The 'url' for images must start with 'https://file.b18a.io/' and end with '.jpg'. The 'data' object should not have any other fields besides the ones mentioned."""

    # Example data instance that the schema should validate.
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
    # The generate_artifact method expects a list of example data dictionaries.
    example_data_list: List[Dict[str, Any]] = [example_data]

    # Specify the type of artifact to generate.
    artifact_type = "schema" # For JSON Schema

    # 4. Generate the artifact
    print(f"Generating '{artifact_type}' artifact using LLM: {llm_client.model_name}...")
    # Call OmniValidator to generate the schema.
    result = validator.generate_artifact(
        description=description,
        example_data_list=example_data_list,
        artifact_type=artifact_type
    )

    # 5. Print the result
    print(f"\nRaw result dictionary:\n{json.dumps(result, indent=2, ensure_ascii=False)}")
    print("\n--- Generation Result ---")
    print(f"Success: {result.get('success')}")

    if result.get('success'):
        print("Generated Artifact (JSON Schema):")
        # The artifact is a JSON string; parse and pretty-print it.
        try:
            # Ensure 'artifact' key exists and is a string
            artifact_str = result.get('artifact')
            if isinstance(artifact_str, str):
                artifact_json = json.loads(artifact_str)
                print(json.dumps(artifact_json, indent=2, ensure_ascii=False))
            else:
                print("Artifact is not a string or is missing.")
                print(artifact_str) # Print whatever was returned
        except json.JSONDecodeError:
            print("Error: Generated artifact is not valid JSON.")
            print(result.get('artifact')) # Print the raw artifact string if parsing fails
        except Exception as e:
            print(f"An unexpected error occurred while processing the artifact: {e}")
            print(result.get('artifact'))
    else:
        print(f"Error: {result.get('error')}")

if __name__ == "__main__":
    main()

```

## How to Run the Script

1.  **Navigate to Project Root**: Open your terminal and change to the root directory of the `json-validator-ai` project.
2.  **Execute the Script**:
    Ensure your `OPENAI_API_KEY` environment variable is set. Run the script from the project root directory using:
    ```bash
    PYTHONPATH=. python3 examples/generate_outfit_schema.py
    ```
    Setting `PYTHONPATH=.` tells Python to include the current directory (project root) in its module search path, allowing it to find the `src` package.

## Expected Output

The script will print the initialization messages, the raw result dictionary from the `OmniValidator`, and then the formatted JSON schema if generation is successful.

```text
✅ OpenAI LLM Client initialized with model: gpt-4o
 OmniValidator initialized with LLM: gpt-4o
Generating 'schema' artifact using LLM: gpt-4o...
💬 Sending request to OpenAI model: gpt-4o (JSON mode: True)

Raw result dictionary:
{
  "success": true,
  "artifact": "{\"type\": \"object\", \"properties\": {\"taskId\": {\"type\": \"string\", \"minLength\": 1, \"description\": \"A non-empty string representing the task ID.\"}, \"templateId\": {\"type\": \"string\", \"minLength\": 1, \"description\": \"A non-empty string representing the template ID.\"}, \"data\": {\"type\": \"object\", \"properties\": {\"top_image\": {\"type\": \"array\", \"minItems\": 1, \"items\": {\"type\": \"object\", \"properties\": {\"uid\": {\"type\": \"string\", \"minLength\": 1, \"description\": \"A non-empty string representing the unique identifier for the image.\"}, \"url\": {\"type\": \"string\", \"minLength\": 1, \"pattern\": \"^https://file\\\\.b18a\\\\.io/.+\\\\.jpg$\", \"description\": \"A non-empty string URL starting with 'https://file.b18a.io/' and ending with '.jpg'.\"}, \"name\": {\"type\": \"string\", \"minLength\": 1, \"description\": \"A non-empty string representing the name of the image.\"}}, \"required\": [\"uid\", \"url\", \"name\"]}}, \"bottom_image\": {\"type\": \"array\", \"minItems\": 1, \"items\": {\"type\": \"object\", \"properties\": {\"uid\": {\"type\": \"string\", \"minLength\": 1, \"description\": \"A non-empty string representing the unique identifier for the image.\"}, \"url\": {\"type\": \"string\", \"minLength\": 1, \"pattern\": \"^https://file\\\\.b18a\\\\.io/.+\\\\.jpg$\", \"description\": \"A non-empty string URL starting with 'https://file.b18a.io/' and ending with '.jpg'.\"}, \"name\": {\"type\": \"string\", \"minLength\": 1, \"description\": \"A non-empty string representing the name of the image.\"}}, \"required\": [\"uid\", \"url\", \"name\"]}}, \"full_outfit_image\": {\"type\": \"array\", \"minItems\": 1, \"items\": {\"type\": \"object\", \"properties\": {\"uid\": {\"type\": \"string\", \"minLength\": 1, \"description\": \"A non-empty string representing the unique identifier for the image.\"}, \"url\": {\"type\": \"string\", \"minLength\": 1, \"pattern\": \"^https://file\\\\.b18a\\\\.io/.+\\\\.jpg$\", \"description\": \"A non-empty string URL starting with 'https://file.b18a.io/' and ending with '.jpg'.\"}, \"name\": {\"type\": \"string\", \"minLength\": 1, \"description\": \"A non-empty string representing the name of the image.\"}}, \"required\": [\"uid\", \"url\", \"name\"]}}}, \"required\": [\"top_image\", \"bottom_image\", \"full_outfit_image\"], \"additionalProperties\": false}}, \"required\": [\"taskId\", \"templateId\", \"data\"], \"additionalProperties\": false}",
  "error": null
}

--- Generation Result ---
Success: True
Generated Artifact (JSON Schema):
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
                "pattern": "^https://file\\.b18a\\.io/.+\\.jpg$",
                "description": "A non-empty string URL starting with 'https://file.b18a.io/' and ending with '.jpg'."
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "description": "A non-empty string representing the name of the image."
              }
            },
            "required": [
              "uid",
              "url",
              "name"
            ]
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
                "pattern": "^https://file\\.b18a\\.io/.+\\.jpg$",
                "description": "A non-empty string URL starting with 'https://file.b18a.io/' and ending with '.jpg'."
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "description": "A non-empty string representing the name of the image."
              }
            },
            "required": [
              "uid",
              "url",
              "name"
            ]
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
                "pattern": "^https://file\\.b18a\\.io/.+\\.jpg$",
                "description": "A non-empty string URL starting with 'https://file.b18a.io/' and ending with '.jpg'."
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "description": "A non-empty string representing the name of the image."
              }
            },
            "required": [
              "uid",
              "url",
              "name"
            ]
          }
        }
      },
      "required": [
        "top_image",
        "bottom_image",
        "full_outfit_image"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "taskId",
    "templateId",
    "data"
  ],
  "additionalProperties": false
}
```

**Note**: The actual JSON schema generated by the LLM might vary slightly in structure (e.g., use of `definitions` vs `components/schemas`, exact descriptions) but should functionally match the requirements provided in the natural language description. The example output above is a plausible schema that meets the criteria.

If an error occurs (e.g., API key not set, LLM error), the script will print an error message:
```
--- Generation Result ---
Success: False
Error: [Details of the error]
