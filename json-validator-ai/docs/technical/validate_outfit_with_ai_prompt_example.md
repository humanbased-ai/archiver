# Validating Outfit Data with an AI Prompt

This document describes an example Python script that uses `OmniValidator` to validate JSON data against a predefined AI prompt. This method leverages a Large Language Model (LLM) to perform the validation based on the instructions in the prompt.

## Purpose

The goal is to demonstrate how an AI prompt artifact can be used with `OmniValidator.validate_artifact()` to check if given JSON data conforms to the rules described in the prompt. This example uses an AI prompt tailored for outfit data and tests it with intentionally invalid data to observe the LLM's error detection capabilities.

## Prerequisites

1.  **Python Environment**: Python 3.8+.
2.  **Required Packages**: Ensure `openai` and `python-dotenv` are installed (e.g., via `pip install -r requirements.txt`).
3.  **OpenAI API Key**: This method directly uses an LLM for validation, so a valid `OPENAI_API_KEY` is essential. Set it in a `.env` file or as an environment variable:
    ```env
    OPENAI_API_KEY='your_actual_api_key_here'
    ```
4.  **PYTHONPATH**: Run the script from the project root and set `PYTHONPATH`:
    ```bash
    export PYTHONPATH=.
    ```

## Example Script: `validate_outfit_with_ai_prompt.py`

The script `examples/validate_outfit_with_ai_prompt.py` is as follows. It includes the AI prompt artifact and a sample of invalid JSON data.

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

    # Initialize OmniValidator with the LLM client
    omni_validator = OmniValidator(llm_client=llm_client)
    print(f" OmniValidator initialized with LLM: {llm_model}")

    # Define the AI prompt artifact for validating outfit data
    ai_prompt_artifact = ("""
    Validate the provided JSON data for an outfit. The data must adhere to the following rules:
    1. 'taskId' (string) is mandatory and cannot be empty.
    2. The 'data' object must only contain the fields 'top_image', 'bottom_image', and 'full_outfit_image', each of which must contain at least one image.
    3. Each image entry must have a 'uid' (string), 'url' (string), and 'name' (string).
    4. Image URLs must match the pattern 'https://file.b18a.io/*.jpg', be functional, and point to an actual image.
    5. Images must be suitable for all audiences (no swimwear or underwear) and be of good quality (clear and well-lit).
    6. Images should clearly depict clothing items.
    Respond with a JSON object: {'is_valid': <boolean>, 'reason': '<detailed explanation of validation checks and findings>'}.
    """)

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

    print(f"\nValidating data using AI Prompt artifact (LLM: {llm_model})...")
    # Validate the data using the AI prompt
    validation_result = omni_validator.validate_artifact(
        json_data=json_data_to_validate,
        artifact=ai_prompt_artifact,
        artifact_type="ai_prompt",
        llm_client=llm_client # Pass the LLM client for AI prompt validation
    )

    print("\n--- AI Prompt Validation Result ---")
    print(json.dumps(validation_result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
```

## How to Run

1.  Ensure all prerequisites are met (Python, packages, API key, `PYTHONPATH`).
2.  Navigate to the project root directory.
3.  Run the script:
    ```bash
    PYTHONPATH=. python3 examples/validate_outfit_with_ai_prompt.py
    ```

## Expected Output

The script will print initialization messages and then the JSON validation result from the LLM. The `success` field will be `false`, and the `details` list will contain a single string from the LLM summarizing the validation errors.

```text
✅ OpenAI LLM Client initialized with model: gpt-4o
 OmniValidator initialized with LLM: gpt-4o

Validating data using AI Prompt artifact (LLM: gpt-4o)...
💬 Sending request to OpenAI model: gpt-4o (JSON mode: True)

--- AI Prompt Validation Result ---
{
  "success": false,
  "validation_type": "ai_prompt",
  "message": "AI prompt validation failed.",
  "details": [
    "Validation failed: 'taskId' is mandatory and cannot be empty. 'data' object contains an extra field 'extra_field_not_allowed' which is not allowed. 'top_image' contains an image with an invalid URL 'http://notb18a.com/image.gif', which does not match the required pattern 'https://file.b18a.io/*.jpg'. 'top_image' entry has an empty 'name'. 'bottom_image' must contain at least one image but is empty. 'full_outfit_image' field is missing."
  ]
}
```
This output demonstrates the LLM's ability to understand the AI prompt and identify multiple validation failures in the provided data, returning a comprehensive explanation.
