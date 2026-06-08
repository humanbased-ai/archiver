import json
from typing import List, Dict, Any
import os

# Ensure PYTHONPATH is set up to find 'src' or run from project root
# Example: export PYTHONPATH=$PYTHONPATH:/path/to/json-validator-ai
from src.omni_validator import OmniValidator

def main():
    # 1. Initialize the OmniValidator.
    # By default, if no llm_client is provided, it will use OpenAILLM with gpt-4o.
    validator = OmniValidator()

    # 2. Define parameters for artifact generation
    # Natural language description of the data structure and validation rules.
    description = """
This data describes a Non-Fungible Token (NFT) and its metadata. The goal is to ensure high-quality, authentic, and appropriate NFT representations.

**I. Data Structure and Format Rules (for JSON Schema generation):**
1.  **Root Object:**
    a.  Required fields: 'taskId', 'templateId', 'data'.
    b.  No additional properties are allowed at the root level.
2.  **taskId:** Must be a non-empty string (unique identifier for the task).
3.  **templateId:** Must be a non-empty string (e.g., "NFT_TPL_000001").
4.  **data Object:**
    a.  Required fields: 'nft_image', 'nft_description'.
    b.  No additional properties are allowed within the 'data' object.
5.  **nft_image (Array):**
    a.  Must be a non-empty array, typically containing a single primary image object for the NFT. (Allowing a list for flexibility, but usually one image).
    b.  Each item in the array must be an image object.
6.  **Image Object (within 'nft_image' array):**
    a.  Required fields: 'uid', 'url', 'name'.
    b.  No additional properties are allowed within an image object.
    c.  'uid': Must be a non-empty string (unique identifier for the image file).
    d.  'url': Must be a non-empty string, a valid and accessible URL pointing to the actual NFT image, and strictly match the pattern '^https://file\\.b18a\\.io/.*\\.(webp|jpg|jpeg|png)$'.
    e.  'name': Must be a non-empty string (filename or descriptive name of the NFT image).
7.  **nft_description:** Must be a non-empty string, with a minimum length of 20 characters to provide a meaningful description of the NFT.

**II. Semantic and Content Rules (for AI Prompt generation):**
1.  **NFT Image Authenticity & Originality:** The 'nft_image' should represent a unique digital asset. It should ideally be original artwork or a collectible. It must not be a generic stock photo or an image that infringes on copyright.
2.  **NFT Image Quality:** The image should be of high quality, suitable for display as a digital collectible (e.g., clear, good resolution, not heavily pixelated or blurry).
3.  **NFT Description Relevance & Informativeness:** The 'nft_description' must accurately and compellingly describe the NFT. It should provide context, details about its significance, artist (if applicable), or any unique attributes. It should not be generic or misleading.
4.  **Content Appropriateness:** Both the 'nft_image' and 'nft_description' must be appropriate for a general audience and adhere to platform content policies. No offensive, hateful, illegal, or harmful content is permitted.
5.  **Intellectual Property:** The NFT must not appear to violate intellectual property rights.

**III. Validator's Output Format (for AI Prompt):**
The AI validator should be instructed to return a JSON object:
{'is_valid': <boolean>, 'reason': '<Detailed explanation of all checks, covering both structural and semantic rules. If invalid, specify all reasons for failure, including which specific rule was violated.'}
"""

    # Example data instance that the schema should validate.
    example_data = {
        'data': {
            'nft_image': [{
                'uid': 'rc-upload-1747898867660-2',
                'url': 'https://file.b18a.io/6334057568500102994_644067_.jpg',
                'name': '00014001700-e1.jpg'
            }],
            'nft_description': 'wewew'
        },
        'taskId': '7536764854000101321',
        'templateId': 'NFT_TPL_000001'
    }
    # The generate_artifact method expects a list of example data dictionaries.
    example_data_list: List[Dict[str, Any]] = [example_data]

    # Specify the type of artifact to generate.
    artifact_type = "schema" # For JSON Schema

    # 4. Generate the artifact
    print(f"Generating '{artifact_type}' artifact for NFT data using LLM: {validator.llm_client.model_name}...")
    generation_result = validator.generate_artifact(
        description=description,
        example_data_list=example_data_list,
        artifact_type=artifact_type
    )

    print("\nRaw result dictionary:")
    print(json.dumps(generation_result, indent=2))

    if generation_result["success"] and generation_result["artifact"]:
        generated_schema_str = generation_result["artifact"]
        print("\n--- Generation Result ---")
        print(f"Success: {generation_result['success']}")
        print(f"Generated Artifact (JSON Schema for NFT):\n{json.dumps(json.loads(generated_schema_str), indent=2)}")

        # 5. Validate invalid data against the generated schema
        print("\n--- Validating Invalid NFT Data ---")
        invalid_nft_data = {
            'data': {
                'nft_image': [{
                    'uid': 'rc-upload-invalid-data',
                    'url': 'http://invalid.com/image.png', # Invalid URL format
                    'name': 'invalid_image.png'
                }],
                'nft_description': '' # Invalid: empty description
            },
            'taskId': '7536764854000101321',
            'templateId': 'NFT_TPL_000001'
        }
        print(f"Attempting to validate the following invalid data:\n{json.dumps(invalid_nft_data, indent=2)}")

        validation_result = validator.validate_artifact(
            json_data=invalid_nft_data,
            artifact=generated_schema_str, # Use the generated schema string
            artifact_type="schema"
        )

        print("\nValidation Result for Invalid Data:")
        print(json.dumps(validation_result, indent=2))

    else:
        print("\n--- Generation Result ---")
        print(f"Success: {generation_result['success']}")
        print(f"Error: {generation_result['error']}")

if __name__ == "__main__":
    main()
