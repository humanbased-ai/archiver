import os
import json
from typing import List, Dict, Any

# Ensure PYTHONPATH is set up to find 'src' or run from project root
from src.omni_validator import OmniValidator

# --- Test Data for Outfit Validation ---
test_data_case1_basic_pass = {
    "taskId": "task-case1-ai-prompt-pass",
    "templateId": "tpl-ootd-ai-prompt-pass",
    "data": {
        "top_image": [{"uid": "top1", "url": "https://file.b18a.io/silk-blouse.jpg", "name": "Elegant Silk Blouse"}],
        "bottom_image": [{"uid": "bottom1", "url": "https://file.b18a.io/pencil-skirt.png", "name": "Tailored Black Pencil Skirt"}],
        "full_outfit_image": [{"uid": "full1", "url": "https://file.b18a.io/office-chic.webp", "name": "Office Chic Ensemble"}]
    }
}

test_data_case2_basic_fail = {
    "taskId": "task-case2-ai-prompt-fail",
    "templateId": "tpl-ootd-ai-prompt-fail",
    "data": {
        "top_image": [{"uid": "top-err", "url": "https://file.b18a.io/parka.jpg", "name": "Heavy Duty Winter Parka"}],
        "bottom_image": [{"uid": "bottom-err", "url": "https://file.b18a.io/shorts.png", "name": "Lightweight Summer Beach Shorts"}], # Clearly incohesive
        "full_outfit_image": [{"uid": "full-err", "url": "https://file.b18a.io/look.webp", "name": "Random Pic"}] # Generic name
    }
}

# For Case 3 and 4, AI (Prompt_B) will validate the outfit data. 
# Prompt_B is designed to validate Prompt_A, so it will likely fail the outfit data.
# Thus, expected_success for Case 3 and 4 is False.
test_data_case3_ai_should_fail_due_to_prompt_b = test_data_case1_basic_pass # Good data for Prompt_A

test_data_case4_ai_should_also_fail_due_to_prompt_b = test_data_case1_basic_pass # Good data for Prompt_A

test_data_case5_basic_pass_no_ai = test_data_case1_basic_pass


def main():
    validator = OmniValidator()

    # 1. Define parameters for generating Prompt_A (the AI prompt for validating outfits)
    ai_prompt_description_for_generating_prompt_A = """
You are an expert in creating AI validation prompts.
Your task is to generate a new, concise AI validation prompt. This new prompt will be used by another AI to validate JSON data representing fashion outfits.

The new prompt you generate must instruct an AI to:
1.  Focus solely on the 'name' fields within 'top_image', 'bottom_image', and 'full_outfit_image' arrays in the JSON data.
2.  Assess if each 'name' is descriptive and relevant to a plausible clothing item or a complete outfit. Generic names like 'Item 1', 'Photo A', or simple filenames are not acceptable.
3.  Determine if the names for 'top_image' and 'bottom_image' suggest items that could form a cohesive and stylistically compatible outfit. Consider factors like season, occasion, and general style compatibility implied by the names.
4.  The AI performing the validation (using the prompt you generate) should NOT attempt to access any URLs or perform visual analysis of images. Its judgment must be based *only* on the textual content of the 'name' fields.
5.  The AI performing the validation must output its findings strictly as a JSON object: {"is_valid": boolean, "reason": "A concise, actionable explanation for the validation result. If invalid, pinpoint the specific issues with names or cohesion. If valid, confirm compliance."}. No other text or explanation outside this JSON structure.

Generate ONLY the new AI validation prompt itself, as a single block of text. Do not include any explanations, introductions, or markdown formatting around the prompt you generate.
"""

    example_prompt_A_text = """\
Validate the semantic coherence of the provided outfit data based on item names.
Rule 1: All 'name' fields for 'top_image', 'bottom_image', and 'full_outfit_image' must be highly descriptive of specific clothing items or a complete look (e.g., "Classic Red Evening Gown", "Men's Blue Denim Jacket"). Generic placeholders (e.g., "image1.jpg", "Outfit details") are invalid.
Rule 2: The 'name' for 'top_image' and 'bottom_image' must describe items that are stylistically compatible and could form a sensible outfit (e.g., "Silk Blouse" and "Tailored Pencil Skirt" is good; "Heavy Winter Parka" and "Beach Swim Shorts" is bad).
Rule 3: Base your validation ONLY on the textual 'name' fields. Do not attempt to access URLs or analyze images.
Output your decision strictly as a JSON object: {"is_valid": boolean, "reason": "Detailed explanation: if invalid, state which rule(s) were violated and by which item names; if valid, confirm all rules met."}. No extra text.
"""
    example_data_for_prompt_generation = [{"prompt_text": example_prompt_A_text}]

    artifact_type = "ai_prompt"

    # 2. Generate the composite artifact (containing Prompt_A and Prompt_B)
    print(f"Generating '{artifact_type}' artifact using LLM: {validator.llm_client.model_name}...")
    print("This will produce a composite artifact with:")
    print("  'basic': Prompt_A (for validating outfit data)")
    print("  'ai': Prompt_B (for validating Prompt_A itself)")
    
    generation_result = validator.generate_artifact(
        description=ai_prompt_description_for_generating_prompt_A,
        example_data_list=example_data_for_prompt_generation,
        artifact_type=artifact_type
    )

    if not generation_result.get("success"):
        print(f"\nArtifact generation failed: {generation_result.get('error')}")
        return

    composite_artifact_json_str = generation_result.get("artifact")
    prompt_A_str = None
    prompt_B_str = None

    try:
        composite_artifact = json.loads(composite_artifact_json_str)
        prompt_A_str = composite_artifact.get("basic")
        prompt_B_str = composite_artifact.get("ai")
        if not isinstance(prompt_A_str, str) or not isinstance(prompt_B_str, str):
            raise ValueError("Generated artifact 'basic' or 'ai' part is not a string.")
    except (json.JSONDecodeError, ValueError) as e:
        print(f"\nError: Could not parse composite artifact JSON string or extract prompts: {e}")
        print(f"Raw artifact string: {composite_artifact_json_str}")
        return

    print(f"\nRaw composite artifact (JSON string):")
    print(composite_artifact_json_str)
    print("\n--- Generated Prompt_A (for validating outfit data) ---")
    print(prompt_A_str)
    print("\n--- Generated Prompt_B (for validating Prompt_A itself) ---")
    print(prompt_B_str)

    if prompt_A_str == prompt_B_str:
        print("\nNote: Prompt_A and Prompt_B are identical. This might happen if the generation process for Prompt_B is simplified.")
    else:
        print("\nNote: Prompt_A and Prompt_B are different, as expected (Prompt_B is for validating Prompt_A).")

    # 3. Define validation test cases
    test_cases = [
        ("Case 1: Basic PASS (Prompt_A validates good data, no AI stage)", test_data_case1_basic_pass, False, True),
        ("Case 2: Basic FAIL (Prompt_A fails bad data, no AI stage)", test_data_case2_basic_fail, False, False),
        ("Case 3: Basic PASS, AI also PASS (Prompt_A ok, Prompt_B also passes good outfit data)", test_data_case3_ai_should_fail_due_to_prompt_b, True, True),
        ("Case 4: Basic PASS, AI also PASS (Prompt_A ok, Prompt_B also passes good outfit data)", test_data_case4_ai_should_also_fail_due_to_prompt_b, True, True),
        ("Case 5: Basic PASS (like Case 1, no AI stage, Prompt_A validates good data)", test_data_case5_basic_pass_no_ai, False, True),
    ]

    print("\n--- Running Validation Test Cases ---")
    all_tests_passed = True
    for case_name, data_to_validate, use_ai_flag, expected_success_flag in test_cases:
        print(f"\n--- {case_name} ---")
        print(f"Using AI (for secondary validation with Prompt_B): {use_ai_flag}")
        print(f"Input Data for Validation (Outfit Data):\n{json.dumps(data_to_validate, indent=2)}")

        validation_result = validator.validate_artifact(
            json_data=data_to_validate,
            artifact=composite_artifact_json_str, # Pass the whole composite artifact string
            use_ai=use_ai_flag
        )

        print("\nValidation Result:")
        print(json.dumps(validation_result, indent=2))

        actual_success = validation_result.get("success", False)
        if actual_success == expected_success_flag:
            print(f"Outcome: As expected ({'SUCCESS' if expected_success_flag else 'FAILURE'}).")
        else:
            print(f"Outcome: UNEXPECTED! Expected {'SUCCESS' if expected_success_flag else 'FAILURE'}, but got {'SUCCESS' if actual_success else 'FAILURE'}.")
            all_tests_passed = False
            
    if all_tests_passed:
        print("\n\nAll test cases passed as expected!")
    else:
        print("\n\nSome test cases FAILED or had unexpected outcomes.")

if __name__ == "__main__":
    main()
