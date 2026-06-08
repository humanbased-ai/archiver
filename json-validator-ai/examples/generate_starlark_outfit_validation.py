import os
import json
import sys
# Add project root to sys.path to allow importing from src
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.omni_validator import OmniValidator

def main():
    # Initialize OmniValidator with the LLM client
    omni_validator = OmniValidator()
    print(f" OmniValidator initialized with default LLM: {omni_validator.llm_client.model_name}")

    # Define the natural language description for the Starlark validation script
    description = ("""
**Data Validation Context: Outfit Data**
This document specifies the validation requirements for outfit data. The data represents curated fashion outfits, typically used for purposes such as populating a fashion catalog, training a recommendation model, or virtual try-on applications. Ensuring data accuracy and consistency is crucial for these applications.

**I. Data Structure and Format Requirements:**
1.  **Root Object:**
    a.  Must contain 'taskId', 'templateId', and 'data' keys.
    b.  'taskId': Must be a non-empty string (i.e., must contain at least one non-whitespace character).
    c.  'templateId': Must be a non-empty string (i.e., must contain at least one non-whitespace character).
2.  **data Object:**
    a.  Must be a dictionary.
    b.  Must contain exactly 'top_image', 'bottom_image', and 'full_outfit_image' keys. No other keys are permitted.
3.  **Image Arrays ('top_image', 'bottom_image', 'full_outfit_image'):**
    a.  Each must be a list containing at least one item.
    b.  Each item in these lists must be an image dictionary conforming to the rules below.
4.  **Image Dictionary (items within image arrays):**
    a.  Must contain exactly 'uid', 'url', and 'name' keys. No other keys are permitted.
    b.  'uid': Must be a non-empty string (i.e., must contain at least one non-whitespace character).
    c.  'url': Must be a non-empty string (i.e., must contain at least one non-whitespace character). It must be a valid URL starting with 'https://file.b18a.io/' and ending with one of the following image extensions: '.bmp', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.gif', '.pcx', '.tga', '.exif', '.fpx', '.svg', '.psd', '.cdr', '.pcd', '.dxf', '.ufo', '.eps', '.ai', '.raw', '.wmf', '.webp', '.avif', or '.apng'.
    d.  'name': Must be a non-empty string (i.e., must contain at least one non-whitespace character).

**II. Semantic and Content Rules:**
(This section is for defining specific semantic or content-based rules that go beyond basic structure and format. If no specific rules are provided here, a general AI-based semantic validation may still be applied if requested during the validation process.)
- empty
""")

    # Provide example data for context (optional, but helpful for the LLM)
    example_data = {
        "taskId": "7528465136400103577",
        "templateId": "OOTD_TPL_000001",
        "data": {
            "top_image": [
                {
                    "uid": "rc-upload-1747981686593-18",
                    "url": "https://file.b18a.io/6156810753500102141_762935_.jpg",
                    "name": "03284766712-e1.jpg"
                }
            ],
            "bottom_image": [
                {
                    "uid": "rc-upload-1747981686593-20",
                    "url": "https://file.b18a.io/6156810753500102141_212297_.jpg",
                    "name": "03284766712-e4.jpg"
                }
            ],
            "full_outfit_image": [
                {
                    "uid": "rc-upload-1747981686593-22",
                    "url": "https://file.b18a.io/6156810753500102141_729352_.jpg",
                    "name": "03284766712-p.jpg"
                }
            ]
        }
    }

    print(f"Generating 'composite' artifact (Starlark + AI Prompt) using LLM: {omni_validator.llm_client.model_name}...")
    # Generate the composite validation artifact
    # The 'description' will be used for both Starlark (basic) and AI prompt generation.
    # The 'basic_artifact_type' for the composite artifact will be 'starlark'.
    generation_result = omni_validator.generate_artifact(
        description=description,
        example_data_list=[example_data],
        artifact_type="composite",
        basic_artifact_type_for_composite="starlark" 
    )

    print("\nRaw result dictionary for Composite Artifact Generation:")
    print(json.dumps(generation_result, indent=2, ensure_ascii=False))

    if generation_result.get("success") and generation_result.get("artifact"):
        composite_artifact_json_string = generation_result["artifact"]
        print("\n--- Composite Artifact Generation Successful ---")
        print(f"Generated Composite Artifact (JSON string):\n{composite_artifact_json_string}")
        
        # Parse the composite artifact to show its components
        try:
            composite_artifact_dict = json.loads(composite_artifact_json_string)
            print(f"  Basic component (Starlark):\n{composite_artifact_dict.get('basic')[:300]}...")
            print(f"  AI component (Prompt):\n{composite_artifact_dict.get('ai')}")
        except json.JSONDecodeError:
            print("  Error: Could not parse composite artifact JSON string.")

        print("\n--- Running Composite Validation Tests ---")

        # Data for testing
        valid_data = example_data
        invalid_data_missing_task_id = example_data.copy()
        del invalid_data_missing_task_id["taskId"]

        # Case 1: Basic validation passes, use_ai=False
        print("\nCase 1: Basic validation passes, use_ai=False")
        validation_case1 = omni_validator.validate_artifact(
            json_data=valid_data,
            artifact=composite_artifact_json_string, # Pass the JSON string of the composite artifact
            use_ai=False
        )
        print("Validation result for Case 1:")
        print(json.dumps(validation_case1, indent=2, ensure_ascii=False))

        # Case 2: Basic validation passes, use_ai=True
        print("\nCase 2: Basic validation passes, use_ai=True")
        validation_case2 = omni_validator.validate_artifact(
            json_data=valid_data,
            artifact=composite_artifact_json_string,
            use_ai=True
        )
        print("Validation result for Case 2:")
        print(json.dumps(validation_case2, indent=2, ensure_ascii=False))

        # Case 3: Basic validation fails (AI validation should be skipped)
        print("\nCase 3: Basic validation fails")
        validation_case3 = omni_validator.validate_artifact(
            json_data=invalid_data_missing_task_id,
            artifact=composite_artifact_json_string,
            use_ai=True # Does not matter if basic fails
        )
        print("Validation result for Case 3:")
        print(json.dumps(validation_case3, indent=2, ensure_ascii=False))

    else:
        print("\n--- Composite Artifact Generation Failed ---")
        print(f"Error: {generation_result.get('error')}")

if __name__ == "__main__":
    main()
