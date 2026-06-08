import json
from typing import List, Dict, Any
import os
import sys

# Add project root to sys.path to allow importing from 'src'
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.omni_validator import OmniValidator

def main():
    validator = OmniValidator()

    description = """
This data describes a food item annotation. The goal is to collect high-quality data for training AI models related to food.

**I. Data Structure and Format Rules (for JSON Schema generation):**
1.  **Root Object:**
    a.  Required fields: 'taskId', 'templateId', 'data'.
    b.  No additional properties are allowed at the root level.
2.  **taskId:** Must be a non-empty string.
3.  **templateId:** Must be a non-empty string (e.g., "FOOD_TPL_000001").
4.  **data Object:**
    a.  Required fields: 'images', 'food_description'.
    b.  No additional properties are allowed within the 'data' object.
5.  **images (Array):**
    a.  Must be a non-empty array of image objects.
    b.  Each item in the array must be an image object.
6.  **Image Object (within 'images' array):**
    a.  Required fields: 'uid', 'url', 'name'.
    b.  No additional properties are allowed within an image object.
    c.  'uid': Must be a non-empty string (unique identifier for the image).
    d.  'url': Must be a non-empty string, a valid and accessible URL pointing to an actual image, and strictly match the pattern 'https://file.b18a.io/.*\\.(webp|jpg|jpeg|png)$'.
    e.  'name': Must be a non-empty string (filename or descriptive name of the image).
7.  **food_description:** Must be a non-empty string. It should be at least 10 characters long to ensure meaningful content.

**II. Semantic and Content Rules (for AI Prompt generation):**
1.  **Image Relevance:** All images provided must clearly depict food items. Non-food items are not acceptable.
2.  **Image Quality:** Images should be clear, well-lit, in focus, and of sufficient quality to identify the food items. Blurry, dark, or very low-resolution images are not acceptable.
3.  **Description Accuracy:** The 'food_description' must accurately and appropriately describe the food shown in the images. It should be relevant and not misleading.
4.  **Content Appropriateness:** Both images and descriptions must be appropriate for a general audience. No offensive, irrelevant, or harmful content.
5.  **Consistency:** If multiple images are provided, they should ideally depict the same dish or related food items consistent with a single annotation. The 'food_description' should cover all presented images.

**III. Validator's Output Format (for AI Prompt):**
The AI validator should be instructed to return a JSON object:
{'is_valid': <boolean>, 'reason': '<Detailed explanation of all checks, covering both structural and semantic rules. If invalid, specify all reasons.'}
"""

    example_data = {
        "taskId": "7396488524100100859",
        "templateId": "FOOD_TPL_000001",
        "data": {
            "images": [
                {
                    "uid": "rc-upload-1748305417416-6",
                    "url": "https://file.b18a.io/6310651947700101546_733895_.webp",
                    "name": "u=1354488648,1434448537&fm=253&fmt=auto&app=138&f=JPEG.webp"
                }
            ],
            "food_description": "kinds of food"
        }
    }
    example_data_list: List[Dict[str, Any]] = [example_data]

    # Request a composite artifact with schema as the basic component
    print(f"Generating 'composite' (schema + AI prompt) artifact for Food data using LLM: {validator.llm_client.model_name}...")
    generation_result = validator.generate_artifact(
        description=description,
        example_data_list=example_data_list,
        artifact_type="composite",
        basic_artifact_type_for_composite="schema"
    )

    print("\n--- Raw Generation Result Dictionary ---")
    print(json.dumps(generation_result, indent=2))

    if not generation_result["success"] or not generation_result["artifact"]:
        print("\n--- Artifact Generation Failed ---")
        print(f"Success: {generation_result['success']}")
        print(f"Error: {generation_result.get('error', 'Unknown error')}")
        return

    artifact_json_str = generation_result["artifact"]
    print("\n--- Composite Artifact Generation Successful ---")
    print(f"Generated Composite Artifact (JSON string):\n{artifact_json_str}")
    
    try:
        artifact_dict = json.loads(artifact_json_str)
        basic_component_str = json.dumps(artifact_dict.get("basic"), indent=2) if isinstance(artifact_dict.get("basic"), dict) else str(artifact_dict.get("basic"))
        ai_component_str = str(artifact_dict.get("ai"))
        print(f"  Basic component (Schema):\n{basic_component_str}")
        print(f"  AI component (Prompt):\n{ai_component_str}")
        print(f"  Needs further AI validation (from artifact): {artifact_dict.get('needs_further_ai_validation')}")
    except json.JSONDecodeError:
        print("Error: Generated artifact string is not valid JSON.")
        return

    print("\n--- Running Composite Validation Tests ---")

    valid_food_data = example_data # Use the same valid example data

    invalid_structural_food_data = {
        "taskId": "", # Invalid: empty taskId
        "templateId": "FOOD_TPL_000001",
        "data": {
            "images": [
                {
                    "uid": "uid1", 
                    "url": "https://file.b18a.io/image.png", 
                    "name": "image.png"
                }
            ],
            "food_description": "This is a perfectly valid food description that is long enough.",
            "extra_data_field": "This field should cause a schema validation error."
        }
    }

    # This data is structurally valid according to the schema but semantically questionable for AI
    invalid_semantic_food_data = {
        "taskId": "7396488524100100861",
        "templateId": "FOOD_TPL_000002",
        "data": {
            "images": [
                {
                    "uid": "rc-upload-1748305417416-7",
                    "url": "https://file.b18a.io/non_food_image.jpg", # Assume this is a non-food image
                    "name": "non_food_image.jpg"
                }
            ],
            "food_description": "Sky." # Too short and likely irrelevant for food images
        }
    }

    test_cases = [
        ("Case 1: Basic (Schema) validation passes, use_ai=False", valid_food_data, False),
        ("Case 2: Basic (Schema) validation passes, use_ai=True (AI should run)", valid_food_data, True),
        ("Case 3: Basic (Schema) validation fails (structural issue)", invalid_structural_food_data, False),
        ("Case 4: Basic (Schema) passes, use_ai=True, AI validation should fail (semantic issue)", invalid_semantic_food_data, True),
    ]

    for case_name, data_to_validate, use_ai_flag in test_cases:
        print(f"\n--- {case_name} ---")
        print(f"Validating with use_ai={use_ai_flag}:")
        # print(f"Data to validate:\n{json.dumps(data_to_validate, indent=2)}")
        
        validation_result = validator.validate_artifact(
            json_data=data_to_validate,
            artifact=artifact_json_str, # Pass the full artifact JSON string
            use_ai=use_ai_flag
        )
        print(f"Validation result for {case_name}:\n{json.dumps(validation_result, indent=2)}")

if __name__ == "__main__":
    main()
