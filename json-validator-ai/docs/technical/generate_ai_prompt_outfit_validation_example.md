# Technical Documentation: Generating an AI Prompt for Outfit Validation

This document describes how to use the `OmniValidator` to generate an AI prompt specifically tailored for validating outfit data. This includes complex checks like content suitability, image quality, and URL functionality, with a defined JSON response structure.

## Purpose

The primary goal is to demonstrate the `OmniValidator.generate_artifact` method's capability to produce a sophisticated AI prompt (`artifact_type="ai_prompt"`). This prompt can then be used with an LLM to perform detailed validation on outfit data, going beyond simple schema checks.

## Prerequisites

1.  **Python Environment**: Ensure you have Python 3.8+ installed.
2.  **Project Setup**:
    *   Clone the `json-validator-ai` repository.
    *   Install dependencies (e.g., `pip install -r requirements.txt` if applicable).
    *   Ensure the `src` directory is in your `PYTHONPATH` or run scripts from the project's root directory.
3.  **OpenAI API Key**:
    *   You need an active OpenAI API key.
    *   Set the `OPENAI_API_KEY` environment variable:
        ```bash
        export OPENAI_API_KEY='your_openai_api_key_here'
        ```

## Script: `examples/generate_ai_prompt_outfit_validation.py`

The following Python script demonstrates the AI prompt generation process:

```python
import os
import json
from typing import List, Dict, Any

# Ensure PYTHONPATH is set up to find 'src' or run from project root
from src.omni_validator import OmniValidator
from src.llm_interface import OpenAILLM # Using the concrete OpenAI LLM client

def main():
    # 1. Setup LLM Client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set.")
        print("Please set it before running the script.")
        print("Example: export OPENAI_API_KEY='your_key_here'")
        return

    # Note: OpenAILLM class itself prints an initialization message.
    # print(f"✅ OpenAI LLM Client initialized with model: gpt-4o") # This line is in the script but can be removed to avoid duplicate prints.
    llm_client = OpenAILLM(api_key=api_key, model="gpt-4o")

    # 2. Instantiate OmniValidator
    validator = OmniValidator(llm_client=llm_client)

    # 3. Define parameters for artifact generation
    description = """Check this outfit data. All images in 'top_image', 'bottom_image', and 'full_outfit_image' need to be suitable for everyone (like, no swimwear or underwear) and look like good quality photos (clear, good lighting). Image URLs should work, actually point to an image, and match the pattern 'https://file.b18a.io/*.jpg'. The 'taskId' can't be empty. The image lists ('top_image', 'bottom_image', 'full_outfit_image') must have at least one image. The 'data' part shouldn't have any extra fields. The images should clearly show clothes. Please give back a JSON response like this: {'is_valid': true/false, 'reason': 'explain what you found, covering all checks'}."""

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
    example_data_list: List[Dict[str, Any]] = [example_data]

    artifact_type = "ai_prompt"

    # 4. Generate the artifact
    print(f"Generating '{artifact_type}' artifact using LLM: {llm_client.model_name}...")
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
        print("Generated Artifact (AI Prompt):")
        # The artifact is the AI prompt string itself.
        ai_prompt_str = result.get('artifact')
        if isinstance(ai_prompt_str, str):
            print(ai_prompt_str)
        else:
            print("Artifact is not a string or is missing.")
            print(ai_prompt_str) # Print whatever was returned
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
    PYTHONPATH=. python3 examples/generate_ai_prompt_outfit_validation.py
    ```
    Setting `PYTHONPATH=.` tells Python to include the current directory (project root) in its module search path, allowing it to find the `src` package.

## Expected Output

The script will print initialization messages, the raw result dictionary from `OmniValidator`, and then the generated AI prompt string.

```text
✅ OpenAI LLM Client initialized with model: gpt-4o
✅ OpenAI LLM Client initialized with model: gpt-4o
 OmniValidator initialized with LLM: gpt-4o
Generating 'ai_prompt' artifact using LLM: gpt-4o...
💬 Sending request to OpenAI model: gpt-4o (JSON mode: False)

Raw result dictionary:
{
  "success": true,
  "artifact": "Validate the provided JSON data for an outfit. The data must adhere to the following rules: 1. 'taskId' (string) is mandatory and cannot be empty. 2. The 'data' object must only contain the fields 'top_image', 'bottom_image', and 'full_outfit_image', each of which must contain at least one image. 3. Each image entry must have a 'uid' (string), 'url' (string), and 'name' (string). 4. Image URLs must match the pattern 'https://file.b18a.io/*.jpg', be functional, and point to an actual image. 5. Images must be suitable for all audiences (no swimwear or underwear) and be of good quality (clear and well-lit). 6. Images should clearly depict clothing items. Respond with a JSON object: {'is_valid': <boolean>, 'reason': '<detailed explanation of validation checks and findings>'}.",
  "error": null
}

--- Generation Result ---
Success: True
Generated Artifact (AI Prompt):
Validate the provided JSON data for an outfit. The data must adhere to the following rules: 1. 'taskId' (string) is mandatory and cannot be empty. 2. The 'data' object must only contain the fields 'top_image', 'bottom_image', and 'full_outfit_image', each of which must contain at least one image. 3. Each image entry must have a 'uid' (string), 'url' (string), and 'name' (string). 4. Image URLs must match the pattern 'https://file.b18a.io/*.jpg', be functional, and point to an actual image. 5. Images must be suitable for all audiences (no swimwear or underwear) and be of good quality (clear and well-lit). 6. Images should clearly depict clothing items. Respond with a JSON object: {'is_valid': <boolean>, 'reason': '<detailed explanation of validation checks and findings>'}.
```

If generation fails, an error message will be displayed instead.
