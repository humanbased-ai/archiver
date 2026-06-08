import sys # Added for sys.path modification
import os

# Add the project root to sys.path to allow direct import of 'src'
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import json
from src.omni_validator import OmniValidator
from src.llm_interface import OpenAILLM

def main():
    # Initialize OmniValidator. It will use its default LLM client (OpenAILLM with gpt-4o if API key is set).
    omni_validator = OmniValidator()
    print(f"OmniValidator initialized. Default LLM for generation/AI validation: {omni_validator.llm_client.model_name if omni_validator.llm_client else 'Not available'}")
    if not omni_validator.llm_client:
        print("Warning: OmniValidator could not initialize an LLM client (e.g., OPENAI_API_KEY missing).")
        print("Artifact generation and AI-powered validation steps will likely fail.")

    # --- 1. Generate Composite Artifact (Type: 'ai_prompt') ---
    print("\n--- 1. Generating Composite Artifact (Type: 'ai_prompt') ---")
    description_for_ai_prompt = """Create an AI prompt to validate JSON data for an outfit. The validation rules are:
1. 'taskId' (string) is mandatory and cannot be empty.
2. The 'data' object must exist and only contain 'top_image', 'bottom_image', and 'full_outfit_image'.
3. Each of these image fields must be a non-empty list of image items.
4. Each image item must have 'uid', 'url', and 'name' (all non-empty strings).
5. Image 'url' must start with 'https://file.b18a.io/' and end with '.jpg', '.jpeg', '.png', or '.webp'. URLs must be functional and point to actual images.
6. Images must be suitable for all audiences (e.g., no swimwear, no underwear).
7. Images must be of good quality (clear, well-lit) and clearly depict clothing items.
8. The AI should respond with a JSON object: {'is_valid': <boolean>, 'reason': '<detailed explanation covering all checks>'}."""
    
    example_data_for_generation = {
        "taskId": "task123", "templateId": "tpl001",
        "data": {
            "top_image": [{"uid": "top1", "url": "https://file.b18a.io/top.jpg", "name": "stylish_top.jpg"}],
            "bottom_image": [{"uid": "bottom1", "url": "https://file.b18a.io/bottom.png", "name": "comfy_jeans.png"}],
            "full_outfit_image": [{"uid": "full1", "url": "https://file.b18a.io/outfit.webp", "name": "complete_look.webp"}]
        }
    }

    generation_result = omni_validator.generate_artifact(
        description=description_for_ai_prompt,
        example_data_list=[example_data_for_generation],
        artifact_type="ai_prompt"
    )

    if not generation_result.get("success"):
        print(f"AI Prompt artifact generation failed: {generation_result.get('error')}")
        return

    composite_artifact_json_str = generation_result["artifact"]
    print(f"Generated Composite Artifact JSON String (for ai_prompt type): {composite_artifact_json_str}")
    
    try:
        composite_artifact = json.loads(composite_artifact_json_str)
        # For artifact_type="ai_prompt", 'basic' and 'ai' parts are the same AI prompt.
        generated_ai_prompt = composite_artifact.get("basic") 
        print("\nSuccessfully parsed composite artifact.")
        print(f"Generated AI Prompt (from 'basic' part, also in 'ai' part): {generated_ai_prompt[:500]}...")
    except Exception as e:
        print(f"Error parsing generated composite artifact: {e}")
        return

    # --- 2. Define Data for Validation ---
    valid_outfit_data = {
        "taskId": "taskGood001", "templateId": "tplGood001",
        "data": {
            "top_image": [{"uid": "topOK", "url": "https://file.b18a.io/valid_top.jpg", "name": "nice_shirt.jpg"}],
            "bottom_image": [{"uid": "bottomOK", "url": "https://file.b18a.io/valid_pants.png", "name": "cool_trousers.png"}],
            "full_outfit_image": [{"uid": "fullOK", "url": "https://file.b18a.io/valid_look.webp", "name": "great_ensemble.webp"}]
        }
    }

    invalid_outfit_data_ai = {
        "taskId": "", # Fails rule 1: empty taskId
        "templateId": "tplBad001",
        "data": {
            "top_image": [{"uid": "topBAD", "url": "http://example.com/not_b18a.jpg", "name": "bad_domain.jpg"}], # Fails rule 5: URL domain
            "bottom_image": [], # Fails rule 3: non-empty list
            "full_outfit_image": [{"uid": "fullBAD", "url": "https://file.b18a.io/underwear.jpg", "name": "inappropriate.jpg"}], # Fails rule 6: content suitability
            "extra_unwanted_field": "this_should_fail" # Fails rule 2: only specific fields
        }
    }

    # --- 3. Perform Basic Validation (use_ai=False) ---
    # For artifact_type="ai_prompt", basic validation IS AI prompt validation using the 'basic' part.
    print("\n--- 3. Basic Validation (use_ai=False, uses 'basic' AI prompt) ---")
    
    print("\nValidating valid_outfit_data (using 'basic' AI prompt)...")
    validation_result_basic_valid = omni_validator.validate_artifact(
        json_data=valid_outfit_data,
        artifact=composite_artifact_json_str,
        use_ai=False
    )
    print(json.dumps(validation_result_basic_valid, indent=2, ensure_ascii=False))

    print("\nValidating invalid_outfit_data_ai (using 'basic' AI prompt)...")
    validation_result_basic_invalid = omni_validator.validate_artifact(
        json_data=invalid_outfit_data_ai,
        artifact=composite_artifact_json_str,
        use_ai=False
    )
    print(json.dumps(validation_result_basic_invalid, indent=2, ensure_ascii=False))

    # --- 4. Perform Advanced AI Validation (use_ai=True) ---
    # This will run basic (AI prompt from 'basic' part), then if successful, 
    # run advanced (AI prompt from 'ai' part, which is the same for artifact_type="ai_prompt").
    print("\n--- 4. Advanced AI Validation (use_ai=True, uses 'basic' then 'ai' AI prompts) ---")
    
    print("\nValidating valid_outfit_data (basic AI prompt + advanced AI prompt)...")
    validation_result_advanced_valid = omni_validator.validate_artifact(
        json_data=valid_outfit_data,
        artifact=composite_artifact_json_str,
        use_ai=True,
        validation_temperature=0.1
    )
    print(json.dumps(validation_result_advanced_valid, indent=2, ensure_ascii=False))

    print("\nValidating invalid_outfit_data_ai (basic AI prompt + advanced AI prompt)...")
    # If basic validation (first AI prompt run) fails, advanced (second AI prompt run) won't occur.
    validation_result_advanced_invalid = omni_validator.validate_artifact(
        json_data=invalid_outfit_data_ai,
        artifact=composite_artifact_json_str,
        use_ai=True,
        validation_temperature=0.1
    )
    print(json.dumps(validation_result_advanced_invalid, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
