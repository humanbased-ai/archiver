import os
import json
from src.omni_validator import OmniValidator
from src.llm_interface import OpenAILLM # For OmniValidator initialization consistency

def main():
    # Initialize OmniValidator (it will try to initialize its own LLM client if not provided)
    omni_validator = OmniValidator()
    print(f"OmniValidator initialized. Default LLM for generation/AI validation: {omni_validator.llm_client.model_name if omni_validator.llm_client else 'Not available'}")
    if not omni_validator.llm_client:
        print("Warning: OmniValidator could not initialize an LLM client (e.g., OPENAI_API_KEY missing).")
        print("Artifact generation and AI-powered validation steps will likely fail.")
        # Allow script to continue to show structure, but operations requiring LLM will error out in handlers.

    # --- 1. Generate Composite Artifact (Schema + AI Prompt) ---
    print("\n--- 1. Generating Composite Artifact (Schema + AI Prompt) ---")
    description_for_schema = """This data describes an outfit. It needs a 'taskId' and a 'templateId'; both must be non-empty strings. 
There's a 'data' object, which is required. Inside 'data', we need 'top_image', 'bottom_image', and 'full_outfit_image'. 
Each of these must be a list of image items, and these lists cannot be empty. 
Each image item needs a 'uid', a 'url', and a 'name'; all of these must be non-empty strings. 
The 'url' for images must start with 'https://file.b18a.io/' and end with '.jpg', '.jpeg', '.png', or '.webp'. 
The 'data' object should not have any other fields besides the ones mentioned."""
    
    example_data_for_generation = {
        "taskId": "task123",
        "templateId": "tpl001",
        "data": {
            "top_image": [{"uid": "top1", "url": "https://file.b18a.io/top.jpg", "name": "stylish_top.jpg"}],
            "bottom_image": [{"uid": "bottom1", "url": "https://file.b18a.io/bottom.png", "name": "comfy_jeans.png"}],
            "full_outfit_image": [{"uid": "full1", "url": "https://file.b18a.io/outfit.webp", "name": "complete_look.webp"}]
        }
    }

    generation_result = omni_validator.generate_artifact(
        description=description_for_schema,
        example_data_list=[example_data_for_generation],
        artifact_type="schema"
    )

    if not generation_result.get("success"):
        print(f"Artifact generation failed: {generation_result.get('error')}")
        return # Cannot proceed with validation if artifact generation fails

    composite_artifact_json_str = generation_result["artifact"]
    print(f"Generated Composite Artifact JSON String: {composite_artifact_json_str}")
    
    try:
        composite_artifact = json.loads(composite_artifact_json_str)
        basic_schema_str = composite_artifact.get("basic")
        ai_prompt_for_validation = composite_artifact.get("ai")
        print("\nSuccessfully parsed composite artifact.")
        print(f"Basic Schema (first 300 chars): {basic_schema_str[:300]}...")
        print(f"AI Prompt for validation (first 300 chars): {ai_prompt_for_validation[:300]}...")
    except Exception as e:
        print(f"Error parsing generated composite artifact: {e}")
        return

    # --- 2. Define Data for Validation ---
    valid_outfit_data = {
        "taskId": "task789",
        "templateId": "tpl002",
        "data": {
            "top_image": [{"uid": "topA", "url": "https://file.b18a.io/another_top.jpeg", "name": "elegant_blouse.jpeg"}],
            "bottom_image": [{"uid": "bottomB", "url": "https://file.b18a.io/another_bottom.jpg", "name": "classic_pants.jpg"}],
            "full_outfit_image": [{"uid": "fullC", "url": "https://file.b18a.io/another_outfit.png", "name": "full_ensemble.png"}]
        }
    }

    invalid_outfit_data_basic = {
        "taskId": "", # Fails schema: non-empty string
        "templateId": "tpl003",
        "data": {
            "top_image": [{"uid": "topX", "url": "http://wrongdomain.com/image.jpg", "name": "bad_url.jpg"}], # Fails schema: URL pattern
            "bottom_image": [], # Fails schema: minItems 1
            # full_outfit_image is missing, fails schema: required
            "unexpected_field": "should_not_be_here" # Fails schema: additionalProperties: false for data
        }
    }
    
    # Data that is valid by schema but might have semantic issues for AI
    # e.g., generic names, or if AI prompt was more specific about content themes
    invalid_outfit_data_semantic = {
        "taskId": "taskSem01",
        "templateId": "tplSem01",
        "data": {
            "top_image": [{"uid": "topS", "url": "https://file.b18a.io/semantic_top.jpg", "name": "image1.jpg"}], # Generic name
            "bottom_image": [{"uid": "bottomS", "url": "https://file.b18a.io/semantic_bottom.png", "name": "placeholder.png"}], # Placeholder name
            "full_outfit_image": [{"uid": "fullS", "url": "https://file.b18a.io/semantic_outfit.webp", "name": "tbd.webp"}] # 'To be determined'
        }
    }

    # --- 3. Perform Basic Validation (use_ai=False) ---
    print("\n--- 3. Basic Validation (use_ai=False) ---")
    
    print("\nValidating valid_outfit_data (basic schema only)...")
    validation_result_basic_valid = omni_validator.validate_artifact(
        json_data=valid_outfit_data,
        artifact=composite_artifact_json_str,
        artifact_type="schema",
        use_ai=False
    )
    print(json.dumps(validation_result_basic_valid, indent=2, ensure_ascii=False))

    print("\nValidating invalid_outfit_data_basic (basic schema only)...")
    validation_result_basic_invalid = omni_validator.validate_artifact(
        json_data=invalid_outfit_data_basic,
        artifact=composite_artifact_json_str,
        artifact_type="schema",
        use_ai=False
    )
    print(json.dumps(validation_result_basic_invalid, indent=2, ensure_ascii=False))

    # --- 4. Perform Advanced AI Validation (use_ai=True) ---
    print("\n--- 4. Advanced AI Validation (use_ai=True) ---")
    
    print("\nValidating valid_outfit_data (basic schema + AI semantic)...")
    validation_result_advanced_valid = omni_validator.validate_artifact(
        json_data=valid_outfit_data,
        artifact=composite_artifact_json_str,
        artifact_type="schema",
        use_ai=True
    )
    print(json.dumps(validation_result_advanced_valid, indent=2, ensure_ascii=False))

    print("\nValidating invalid_outfit_data_semantic (basic schema + AI semantic)...")
    # First, check if it passes basic schema, as AI validation only runs if basic passes.
    pre_check_semantic_data = omni_validator.validate_artifact(
        json_data=invalid_outfit_data_semantic,
        artifact=composite_artifact_json_str,
        artifact_type="schema",
        use_ai=False 
    )
    if not pre_check_semantic_data.get("success"):
        print("Skipping AI semantic validation for 'invalid_outfit_data_semantic' because it failed basic schema validation unexpectedly:")
        print(json.dumps(pre_check_semantic_data, indent=2, ensure_ascii=False))
    else:
        print("'invalid_outfit_data_semantic' passed basic schema. Now performing AI semantic validation...")
        validation_result_advanced_invalid_semantic = omni_validator.validate_artifact(
            json_data=invalid_outfit_data_semantic,
            artifact=composite_artifact_json_str,
            artifact_type="schema",
            use_ai=True
        )
        print(json.dumps(validation_result_advanced_invalid_semantic, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
