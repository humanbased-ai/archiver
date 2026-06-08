import os
import json
from typing import List, Dict, Any

# Ensure PYTHONPATH is set up to find 'src' or run from project root
# Example: export PYTHONPATH=$PYTHONPATH:/path/to/json-validator-ai
from src.omni_validator import OmniValidator

def main():
    # Instantiate OmniValidator to use its default LLM client
    validator = OmniValidator()

    # 3. Define parameters for artifact generation
    # Natural language description of the data structure and validation rules.
    description = """
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
For example:
- Image 'name' fields should be descriptive and relevant to the image content, not generic placeholders.
- The images referenced by 'url' should be accessible and loadable.
- For outfit data, the 'top_image' and 'bottom_image' should represent compatible clothing items.

**AI Semantic Validation Rules for Outfit Data (Focus on Textual Analysis):**
The AI should perform validation based *only* on the textual information provided in the data (e.g., image names).
The AI *should NOT* attempt to access external URLs or perform visual analysis of images, as it does not have these capabilities.

1.  **Image Name Descriptiveness and Relevance:**
    a.  The 'name' field in each image dictionary (for 'top_image', 'bottom_image', 'full_outfit_image') must be descriptive and clearly relate to a plausible clothing item or outfit.
    b.  Avoid generic, uninformative, or placeholder names (e.g., "image1.jpg", "top.png", "item_A", "photo").
    c.  Names should be specific enough to give an idea of the item's type and style.

2.  **Outfit Cohesion (Based on Names):**
    a.  Based *solely on the names* provided for 'top_image' and 'bottom_image', assess if they represent clothing items that could plausibly form a compatible and cohesive outfit.
    b.  Consider if the named items sound like they belong to similar styles, seasons, or occasions (e.g., "Silk Evening Gown" and "Hiking Boots" would likely be flagged as incompatible based on names).
    c.  The 'full_outfit_image' name should ideally describe the combined look.

**Output Format:**
Strictly adhere to providing only a JSON object with 'is_valid' (boolean) and 'reason' (string) keys.
The 'reason' should be concise and actionable, clearly stating why the data is valid or invalid based on the rules above.
If valid, state "Data is semantically valid based on textual analysis of names and apparent outfit cohesion."
If invalid, pinpoint the specific issue (e.g., "Image name 'XYZ' is not descriptive", "Named items 'ABC' and 'DEF' seem incompatible for an outfit").
"""

    # Example data instance that the schema should validate (used for generation).
    example_data_for_generation = {
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
    example_data_list: List[Dict[str, Any]] = [example_data_for_generation]

    # Specify the type of artifact to generate.
    artifact_type = "schema" # For JSON Schema

    # 4. Generate the artifact
    print(f"Generating '{artifact_type}' artifact using LLM: {validator.llm_client.model_name}...")
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
        composite_artifact_json_str = result.get('artifact')
        if not isinstance(composite_artifact_json_str, str):
            print(f"Error: Expected artifact to be a JSON string, but got: {type(composite_artifact_json_str)}")
            print(f"Raw artifact content: {composite_artifact_json_str}")
            return

        print("\nGenerated Composite Artifact (JSON String):")
        print(composite_artifact_json_str)

        try:
            composite_artifact = json.loads(composite_artifact_json_str)
        except json.JSONDecodeError as e:
            print(f"\nError: Could not parse composite artifact JSON string: {e}")
            return

        if not isinstance(composite_artifact, dict) or "basic" not in composite_artifact or "ai" not in composite_artifact:
            print("\nError: Composite artifact does not have the expected structure (missing 'basic' or 'ai' keys).")
            print(f"Parsed artifact: {json.dumps(composite_artifact, indent=2, ensure_ascii=False)}")
            return

        basic_artifact_content = composite_artifact.get("basic")
        ai_prompt_str = composite_artifact.get("ai")

        print("\n--- Basic Artifact (JSON Schema) ---")
        if isinstance(basic_artifact_content, dict):
            print(json.dumps(basic_artifact_content, indent=2, ensure_ascii=False))
        elif isinstance(basic_artifact_content, str): # Should not happen with current SchemaHandler
            try:
                parsed_content = json.loads(basic_artifact_content)
                print(json.dumps(parsed_content, indent=2, ensure_ascii=False))
            except json.JSONDecodeError:
                print("Error: Basic artifact (schema) string is not valid JSON.")
                print(basic_artifact_content)
        else:
            print(f"Error: Expected 'basic' artifact content to be a dictionary or JSON string, but got {type(basic_artifact_content)}")
            print(basic_artifact_content)

        print("\n--- AI Prompt Artifact ---")
        if isinstance(ai_prompt_str, str):
            print(ai_prompt_str)
        else:
            print(f"Error: Expected 'ai' artifact content to be a string, but got {type(ai_prompt_str)}")
            print(ai_prompt_str)

        # --- Validation Test Cases ---
        print("\n\n--- Validation Test Cases ---")

        if not composite_artifact_json_str:
            print("Skipping validation tests as artifact generation failed or produced no artifact string.")
            return

        # Define test data instances
        # Reusing the data used for generation for Case 1 and 5. 
        # Its names like "top.jpg" might be flagged by AI as non-descriptive.
        data_case1_and_5 = example_data_for_generation

        data_case2_invalid_basic = {
            # Missing taskId, should fail basic schema
            "templateId": "tpl-ootd-invalid-basic",
            "data": {
                "top_image": [
                    {
                        "uid": "top-err", 
                        "url": "http://invalid-url.com/image.png", # Invalid URL pattern
                        "name": "Error Top"
                    }
                ],
                "bottom_image": [], # Fails minItems: 1 in schema
                "full_outfit_image": [
                    {
                        "uid": "full-err", 
                        "url": "https://file.b18a.io/image.gif", 
                        "name": "" # Empty name, fails minLength:1 / pattern: \S
                    }
                ],
                "extra_field_at_data_level": "should not be here"
            }
        }

        data_case3_valid_basic_ensure_ai_fail = {
            "taskId": "task-case3-ai-should-fail",
            "templateId": "tpl-ootd-ai-fail",
            "data": {
                "top_image": [{"uid": "top-ai-f", "url": "https://file.b18a.io/heavy-winter-coat.jpg", "name": "Item A"}], # Generic name, potentially incompatible
                "bottom_image": [{"uid": "bottom-ai-f", "url": "https://file.b18a.io/swim-trunks.png", "name": "Item B"}], # Generic name, incompatible
                "full_outfit_image": [{"uid": "full-ai-f", "url": "https://file.b18a.io/mismatched-look.webp", "name": "Photo C"}] # Generic name
            }
        }

        data_case4_valid_basic_and_valid_ai = {
            "taskId": "task-case4-all-pass",
            "templateId": "tpl-ootd-all-pass",
            "data": {
                "top_image": [{"uid": "top-pass", "url": "https://file.b18a.io/classic-white-shirt.jpg", "name": "Classic White Oxford Shirt"}],
                "bottom_image": [{"uid": "bottom-pass", "url": "https://file.b18a.io/dark-denim-jeans.png", "name": "Dark Wash Denim Jeans"}],
                "full_outfit_image": [{"uid": "full-pass", "url": "https://file.b18a.io/casual-smart-ensemble.webp", "name": "Casual Smart Ensemble"}]
            }
        }

        test_cases_config = [
            {
                "name": "Case 1: Basic Validation - PASS (No AI)", 
                "data": data_case1_and_5, 
                "use_ai": False, 
                "expected_success": True,
                "note": "Uses initial example_data_for_generation. AI (if used) might flag generic names like 'top.jpg'."
            },
            {
                "name": "Case 2: Basic Validation - FAIL (No AI)", 
                "data": data_case2_invalid_basic, 
                "use_ai": False, 
                "expected_success": False
            },
            {
                "name": "Case 3: Basic PASS, AI Validation - FAIL", 
                "data": data_case3_valid_basic_ensure_ai_fail, 
                "use_ai": True, 
                "expected_success": False
            },
            {
                "name": "Case 4: Basic PASS, AI Validation - PASS", 
                "data": data_case4_valid_basic_and_valid_ai, 
                "use_ai": True, 
                "expected_success": True
            },
            {
                "name": "Case 5: Basic Validation - PASS (AI Not Used, Basic Covers)", 
                "data": data_case1_and_5, # Same data as Case 1
                "use_ai": False, 
                "expected_success": True
            },
        ]

        for case_config in test_cases_config:
            print(f"\n\n--- {case_config['name']} ---")
            if "note" in case_config:
                print(f"Note: {case_config['note']}")
            print(f"Using AI: {case_config['use_ai']}")
            print("Input Data for Validation:")
            print(json.dumps(case_config['data'], indent=2, ensure_ascii=False))

            validation_result = validator.validate_artifact(
                artifact=composite_artifact_json_str, 
                json_data=case_config['data'],
                use_ai=case_config['use_ai']
            )
            print("\nValidation Result:")
            print(json.dumps(validation_result, indent=2, ensure_ascii=False))

            actual_success = validation_result.get("success")
            expected_success = case_config["expected_success"]
            if actual_success == expected_success:
                print(f"Outcome: As expected ({'SUCCESS' if expected_success else 'FAILURE'}).")
            else:
                print(f"Outcome: UNEXPECTED! Expected {'success' if expected_success else 'failure'}, but got {'success' if actual_success else 'failure'}.")

    else:
        print(f"Error: {result.get('error')}")

if __name__ == "__main__":
    main()
