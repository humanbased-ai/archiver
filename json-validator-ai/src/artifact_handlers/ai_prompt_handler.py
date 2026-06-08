# Handler for AI Prompt generation and validation
"""
Handles the generation and validation of AI Prompts for data validation.

This module provides the `AIPromptHandler` class, which encapsulates the logic
for creating AI prompts from natural language descriptions (using an LLM)
and validating data against these prompts by querying an LLM.
"""

import json
import traceback
from typing import Dict, Optional, Any, List, Union

# Assuming llm_interface.py is in the same directory or src is in PYTHONPATH
# This will be an issue if src.llm_interface is not resolvable from here.
# We might need to adjust imports later when integrating with an orchestrator.
from ..llm_interface import LLMInterface # Relative import might be problematic
from . import prompt_config # Import shared prompt configurations

class AIPromptHandler:
    """
    Manages AI Prompt generation and LLM-based validation processes.
    """
    def __init__(self, llm_client: LLMInterface):
        """
        Initializes the AIPromptHandler.

        Args:
            llm_client: An instance conforming to the LLMInterface protocol.
        """
        if not (hasattr(llm_client, 'generate_response') and callable(llm_client.generate_response) and hasattr(llm_client, 'model_name')):
            raise TypeError("llm_client must be an instance that adheres to the LLMInterface protocol.")
        self.llm_client = llm_client

    @staticmethod
    def _get_ai_prompt_system_prompt(basic_artifact_type: Optional[str] = None) -> str:
        # Construct the common context using shared constants
        common_platform_intro = (
            f"{prompt_config.PLATFORM_CONTEXT}\n\n"
            f"{prompt_config.PLATFORM_AUDITOR_ROLE_DESCRIPTION} You will be generating AI prompts that instruct this Auditor.\n\n"
            f"{prompt_config.DEFAULT_DATA_QUALITY_CRITERIA_INTRO}\n"
            f"{prompt_config.DEFAULT_DATA_QUALITY_CRITERIA_LIST}\n\n"
            f"{prompt_config.USER_RULES_PRIORITY_STATEMENT}\n\n"
            "Your generated AI prompt should clearly articulate the final set of rules for the Platform Auditor, integrating user specifics with these general guidelines."
        )

        if basic_artifact_type:
            return (
                "You are an expert AI prompt engineer. "
                f"A separate '{basic_artifact_type}' artifact already validates all basic data structure, field types, required fields, and formats. "
                f"{prompt_config.PLATFORM_CONTEXT}\n\n"
                "You are an expert AI prompt engineer. "
                f"A separate '{basic_artifact_type}' artifact already validates all basic data structure, field types, required fields, and most format rules. "
                "Your task is to generate a focused AI validation prompt. This new prompt will instruct the 'Platform Auditor' (another AI model) to perform ONLY the specific, advanced semantic, content, or commonsense validation checks that were EXPLICITLY STATED in the original user's natural language description for fields that cannot be fully validated by the basic artifact. "
                "This includes applying the general quality checks (gibberish, meaningless fillers, spam, severe format errors not caught by basic validation, uninformative short content) IF they are relevant to the semantic meaning or content quality being assessed for a field AND are not already covered by the basic artifact. For example, 'spam' is a semantic issue. Gross 'format errors' might indicate meaningless content even if a basic pattern passes.\n\n"
                "**Key Instructions for Generating this Focused AI Validation Prompt:**\n"
                "1.  **Strictly Adhere to Explicit Semantic Rules:** ONLY include semantic checks for a field if the original user description EXPLICITLY STATED semantic validation requirements for that specific field. \n"
                "2.  **Ignore Fields Without Explicit Semantic Rules:** If the original user description mentioned a field but DID NOT specify any semantic rules for it (e.g., it defined 'image_name' as a string but gave no rules about its content or meaning), then DO NOT include that field in your AI prompt for any semantic checks. It should be entirely omitted from your generated prompt's semantic validation instructions.\n"
                "3.  **Narrow Interpretation:** The semantic rules in your prompt must be a DIRECT and NARROW interpretation of what was explicitly stated in the user's description. DO NOT broaden, generalize, or infer additional semantic constraints. For example, if the user's description for 'food_description' says 'must be relevant to food and not meaningless', your prompt should instruct the AI to check exactly that, and NOT to check for 'specificity to a particular food item' or 'vagueness' unless those were also explicitly stated by the user.\n"
                "4.  **No Basic Rule Repetition:** DO NOT mention, describe, or check any data structure, field format, type, required/optional fields, or other basic rules already covered by the primary '{basic_artifact_type}'. Your prompt is ONLY for the explicitly requested *additional* semantic/content validation.\n"
                "5.  **Concise and Actionable:** The generated prompt must be concise, direct, and actionable for the validating AI.\n"
                "6.  **Scoping 'No Additional Properties':** If the user's description specifies that a particular *sub-object* should have no additional properties (e.g., 'the `data` object must contain exactly X, Y, Z keys and no others'), your generated AI prompt MUST clearly state that this 'no additional properties' rule applies *specifically to that sub-object* (e.g., 'The `data` object itself must not contain any fields other than X, Y, and Z.'). DO NOT interpret this as a global rule for the entire JSON document unless the user's description explicitly states such a global restriction for the root object.\n"
                f"""

**Predefined Spam-Check Target Field Names:**
The following is a list of field names. If the current field's name (after normalization, e.g., converting to lowercase and treating underscores/hyphens as spaces for matching purposes) is found in this list, it should generally be considered for malicious/spam content checks:
`{str(prompt_config.SPAM_CHECK_TARGET_FIELD_NAMES)}`

7.  **Guidance on Including Malicious/Spam Content Checks in the AI Validation Prompt Artifact You Generate:**
    When you are defining the validation rules for each field from the user's input description, you need to decide whether to include instructions for checking malicious/spam content for that field. Follow these steps:

    a.  **Assess Field's Nature:** Based on the user's natural language description FOR THE CURRENT FIELD, determine if it is primarily a 'descriptive text field'. Examples include fields intended for free-form user comments, detailed product descriptions, reviews, chat messages, narratives, titles, or any other text where users have significant freedom in what they can write and the content is meant to be read or interpreted for its meaning rather than just as a structured data point (e.g., not an ID, a date, a status enum, or a simple numerical value).

    b.  **Check User's Explicit Request:** Review the user's description FOR THE CURRENT FIELD. Does it explicitly mention any requirements related to appropriateness, offensiveness, threats, insults, hate speech, vulgarity, or any other form of malicious/spam content?

    c.  **Decision to Include Malicious Content Check Rule:**
        You MUST include a specific rule/instruction in the AI Validation Prompt artifact for checking malicious content for the current field IF EITHER of the following is true:
        i.  The field is identified as a 'descriptive text field' (as per step 'a').
        ii. The user's description for the field explicitly requests or implies such a check (as per step 'b').

    d.  **Content of the Malicious Content Check Rule (If Included):**
        If you decide to include this check, the rule you add to the AI Validation Prompt artifact must instruct the *subsequent validating LLM* (which will use your generated artifact) to:
        i.  Examine the field's content for any malicious or inappropriate material. This includes, but is not limited to: insults, threats, hate speech, politically sensitive statements, vulgar language, childishly inappropriate terms, advertisements, or gibberish (refer to items 4 and 5 of {prompt_config.DEFAULT_DATA_QUALITY_CRITERIA_LIST} for a detailed list of what constitutes such content).
        ii. Clearly state in the AI Validation Prompt artifact that if such content is found by the validating LLM, it should set the `has_spam` field in its JSON output to `true`. Otherwise, `has_spam` should be `false`.
        iii. Remind the validating LLM (via the artifact's text) that the `has_spam` flag is independent of the `is_valid` flag (which is determined by other rules you define for the field).

    e.  **If No Malicious Content Check is Needed:**
        If NONE of the conditions in step 'c' are met for the current field (i.e., it's not descriptive AND the user didn't explicitly ask for a spam check for it), then you should NOT include any rules or instructions related to malicious content checking or the `has_spam` flag for that field in the AI Validation Prompt artifact you are generating. This ensures that such checks are only performed when necessary.
"""

                "**Your Response:**\n"
                "Respond ONLY with the AI validation prompt string itself. Do NOT include any explanatory text, markdown formatting, or anything else outside the generated prompt string."
            )
        else:
            return (
                "You are an expert AI prompt engineer. "
                f"{prompt_config.PLATFORM_CONTEXT}\n\n"
                "You are an expert AI prompt engineer. Your task is to generate a comprehensive AI validation prompt based on a given natural language description. "
                "This AI prompt will instruct the 'Platform Auditor' (another AI model) on how to validate all aspects of data instances (structural, format, and semantic). The validation should be based on the explicit user description AND the general quality criteria mentioned above (gibberish, meaningless fillers, spam, format errors, too short/uninformative content). "
                "If the user's description provides specific rules that conflict with or are more precise than the general quality criteria for a particular field, the user's specific rules take precedence. Otherwise, both sets of rules should be considered by the Platform Auditor.\n\n"
                "**Key Instructions for Generating this AI Validation Prompt:**\n"
                "1.  **Strict Adherence to Explicit Description:** The AI validation prompt you generate MUST strictly reflect ONLY the rules and requirements (structural, format, and semantic) EXPLICITLY STATED in the provided natural language description. \n"
                "    - DO NOT add, infer, or invent any validation rules that are not present in the description.\n"
                "    - If the description does not mention a specific field for validation, that field MUST BE IGNORED in your generated prompt (i.e., do not add any validation rules for it).\n"
                "    - If the description mentions a field but does not specify any validation requirements for it (e.g., it lists 'image_name' but gives no rules about its content, format, or meaning beyond basic type which might be implied), then DO NOT add any validation rules for that field in your generated prompt beyond what is directly stated.\n"
                "2.  **Semantic Rules (Only if Explicitly Stated and Narrowly Interpreted):** \n"
                "    - If the natural language description EXPLICITLY specifies semantic requirements for a field (e.g., 'the 'comment' field must be relevant to topic X and not offensive', 'the 'image_name' must accurately describe the image content'), then you MUST include these specific semantic rules in the AI validation prompt you generate for those fields. Interpret these rules NARROWLY and DIRECTLY as stated.\n"
                "    - If the natural language description does NOT explicitly state any semantic requirements for a field, even if the field is mentioned, then DO NOT introduce any semantic checks for that field. The prompt should then only cover structural/format rules for that field if those were explicitly stated.\n"
                "3.  **Comprehensiveness for Explicit Rules:** Ensure your generated AI prompt covers ALL aspects (structural, format, and EXPLICITLY STATED and NARROWLY INTERPRETED semantic rules) for ALL fields that are EXPLICITLY MENTIONED for validation in the natural language description.\n"
                "4.  **Actionable and Specific:** The generated AI prompt must be clear, actionable, specific, and promote strict validation based SOLELY on the explicit description.\n"
                "5.  **Scoping 'No Additional Properties':** If the user's description specifies that a particular *sub-object* should have no additional properties (e.g., 'the `data` object must contain exactly X, Y, Z keys and no others'), your generated AI prompt MUST clearly state that this 'no additional properties' rule applies *specifically to that sub-object* (e.g., 'The `data` object itself must not contain any fields other than X, Y, and Z.'). DO NOT interpret this as a global rule for the entire JSON document unless the user's description explicitly states such a global restriction for the root object.\n"
                f"""
6.  **Guidance on Including Malicious/Spam Content Checks in the AI Validation Prompt Artifact You Generate:**
    When you are defining the validation rules for each field from the user's input description, you need to decide whether to include instructions for checking malicious/spam content for that field. Follow these steps:

    a.  **Assess Field's Nature:** Based on the user's natural language description FOR THE CURRENT FIELD, determine if it is primarily a 'descriptive text field'. Examples include fields intended for free-form user comments, detailed product descriptions, reviews, chat messages, narratives, titles, or any other text where users have significant freedom in what they can write and the content is meant to be read or interpreted for its meaning rather than just as a structured data point (e.g., not an ID, a date, a status enum, or a simple numerical value).

    b.  **Check User's Explicit Request:** Review the user's description FOR THE CURRENT FIELD. Does it explicitly mention any requirements related to appropriateness, offensiveness, threats, insults, hate speech, vulgarity, or any other form of malicious/spam content?

    c.  **Decision to Include Malicious Content Check Rule:**
        You MUST include a specific rule/instruction in the AI Validation Prompt artifact for checking malicious content for the current field IF EITHER of the following is true:
        i.  The field is identified as a 'descriptive text field' (as per step 'a').
        ii. The user's description for the field explicitly requests or implies such a check (as per step 'b').

    d.  **Content of the Malicious Content Check Rule (If Included):**
        If you decide to include this check, the rule you add to the AI Validation Prompt artifact must instruct the *subsequent validating LLM* (which will use your generated artifact) to:
        i.  Examine the field's content for any malicious or inappropriate material. This includes, but is not limited to: insults, threats, hate speech, politically sensitive statements, vulgar language, childishly inappropriate terms, advertisements, or gibberish (refer to items 4 and 5 of {prompt_config.DEFAULT_DATA_QUALITY_CRITERIA_LIST} for a detailed list of what constitutes such content).
        ii. Clearly state in the AI Validation Prompt artifact that if such content is found by the validating LLM, it should set the `has_spam` field in its JSON output to `true`. Otherwise, `has_spam` should be `false`.
        iii. Remind the validating LLM (via the artifact's text) that the `has_spam` flag is independent of the `is_valid` flag (which is determined by other rules you define for the field).

    e.  **If No Malicious Content Check is Needed:**
        If NONE of the conditions in step 'c' are met for the current field (i.e., it's not descriptive AND the user didn't explicitly ask for a spam check for it), then you should NOT include any rules or instructions related to malicious content checking or the `has_spam` flag for that field in the AI Validation Prompt artifact you are generating. This ensures that such checks are only performed when necessary.
"""
"7.  **Output Format for Validator AI:** The AI validation prompt you generate must instruct the validating AI to output its findings in a JSON object with two keys: 'is_valid' (boolean) and 'reason' (string). The 'reason' should be highly informative, pinpointing errors or confirming compliance based on the explicit rules, to aid human review or automated processing.\n\n"
                "**Your Response:**\n"
                "Respond ONLY with the AI validation prompt string itself. Do NOT include any explanatory text, markdown formatting, or anything else outside the generated prompt string."
            )

    def generate(
        self,
        description: str,
        example_data_list: Optional[List[Dict[str, Any]]] = None,
        basic_artifact_content: Optional[Union[Dict[str, Any], str]] = None,
        basic_artifact_type: Optional[str] = None,
        generation_temperature: float = 0.1,
        overall_artifact_type: Optional[str] = None # Added to determine 'needs_further_ai_validation' for primary prompts
    ) -> Dict[str, Any]:
        """
        Generates an AI prompt. If basic_artifact_content is provided,
        the prompt focuses on semantic validation, complementing the basic artifact.
        Returns a dictionary with 'success', 'artifact' (the prompt string), and 'error'.
        """
        system_prompt = self._get_ai_prompt_system_prompt(basic_artifact_type)
        user_prompt_parts = [f"Natural language description for AI prompt:\n{description}"]

        if basic_artifact_content and basic_artifact_type:
            basic_artifact_str = ""
            try:
                if isinstance(basic_artifact_content, dict):
                    basic_artifact_str = json.dumps(basic_artifact_content, indent=2, ensure_ascii=False)
                elif isinstance(basic_artifact_content, str):
                    try:
                        parsed_content = json.loads(basic_artifact_content)
                        basic_artifact_str = json.dumps(parsed_content, indent=2, ensure_ascii=False)
                    except json.JSONDecodeError:
                        basic_artifact_str = basic_artifact_content
                else:
                    basic_artifact_str = str(basic_artifact_content)
                user_prompt_parts.append(
                    f"\n\n**Important Context:** A basic '{basic_artifact_type}' artifact has already been defined and will handle ALL field structure, type, required/optional, and basic format validation. "
                    f"Your AI prompt MUST focus ONLY on SEMANTIC, CONTENT, or COMMONSENSE validation aspects that cannot be enforced by code or schema. "
                    f"DO NOT mention, describe, or check any basic rules such as field format, type, structure, or whether fields are required/optional. "
                    f"You can ONLY focus on: semantic reasonableness, content compliance, commonsense reasoning, intent, context, sentiment, professional domain logic, and other high-level rules."
                    f"\n\n[Basic '{basic_artifact_type}' artifact for reference ONLY, do NOT repeat or paraphrase its logic in your AI prompt]\n\n{basic_artifact_str}"
                )
            except Exception as e:
                user_prompt_parts.append(
                    f"\n\n[Error displaying basic artifact content: {e}]"
                )

        if example_data_list:
            user_prompt_parts.append("\nHere are some example data instances that the AI prompt should correctly guide validation for (considering both structural and semantic rules as applicable to your focused task):")
            for i, example_data in enumerate(example_data_list):
                try:
                    example_str = json.dumps(example_data, indent=2, ensure_ascii=False)
                    user_prompt_parts.append(f"\nExample {i+1}:\n```json\n{example_str}\n```")
                except TypeError as e:
                    return {
                        "success": False,
                        "artifact": None,
                        "needs_further_ai_validation": True, # Default True on error
                        "error": f"Error serializing example data {i+1} to JSON: {e}. Ensure all example data is JSON serializable."
                    }
        
        user_prompt = "\n".join(user_prompt_parts)

        try:
            raw_response = self.llm_client.generate_response(
                system_prompt,
                user_prompt,
                temperature=generation_temperature,
                json_mode=False # AI Prompts are plain text
            )

            if raw_response.error or not raw_response.content:
                error_msg = raw_response.error or "LLM returned no content for AI prompt."
                return {"success": False, "artifact": None, "needs_further_ai_validation": True, "error": error_msg}

            llm_output_content = raw_response.content.strip()
            generated_prompt_artifact = llm_output_content
            try:
                decoded_output = json.loads(llm_output_content)
                if isinstance(decoded_output, str):
                    generated_prompt_artifact = decoded_output
            except json.JSONDecodeError:
                pass

            if generated_prompt_artifact:
                # Clean up \' to ' to prevent JSON parsing issues downstream when this prompt is part of a larger JSON artifact
                generated_prompt_artifact = generated_prompt_artifact.replace("\\\'", "'")

            if not generated_prompt_artifact or len(generated_prompt_artifact) < 20: 
                return {
                    "success": False, 
                    "artifact": generated_prompt_artifact, 
                    "needs_further_ai_validation": True, # If prompt is bad, assume AI might be needed
                    "error": "Generated AI prompt seems too short or empty."
                }

            needs_ai_after_this: bool
            if basic_artifact_content is not None:
                # This is generating a COMPLEMENTARY AI prompt (the 'ai' part of a composite artifact).
                # A complementary prompt itself does not trigger a further AI validation step.
                needs_ai_after_this = False
            else:
                # This is generating a PRIMARY AI prompt.
                # The 'overall_artifact_type' (passed from OmniValidator) determines if a complementary AI prompt is expected next.
                if overall_artifact_type == "ai_prompt":
                    # Standalone AI prompt artifact: No further AI validation is expected by default.
                    needs_ai_after_this = False
                elif overall_artifact_type == "composite":
                    # Basic AI prompt part of a composite artifact: A complementary AI prompt is expected.
                    needs_ai_after_this = True
                else:
                    # Fallback or undefined overall_artifact_type. Default to True to be safe, 
                    # assuming a complementary prompt might be intended if not explicitly a standalone 'ai_prompt'.
                    # OmniValidator should ideally always provide a clear 'overall_artifact_type'.
                    needs_ai_after_this = True 

            return {
                "success": True, 
                "artifact": generated_prompt_artifact, 
                "needs_further_ai_validation": needs_ai_after_this,
                "error": None
            }
        except Exception as e:
            return {"success": False, "artifact": None, "needs_further_ai_validation": True, "error": f"An unexpected error occurred in generate_ai_prompt: {e}"}

    @staticmethod
    def _get_validation_system_prompt() -> str:
        """
        Returns the system prompt for LLM-based AI prompt validation.
        """
        return (
            f"{prompt_config.PLATFORM_AUDITOR_ROLE_DESCRIPTION} "
            f"{prompt_config.PLATFORM_CONTEXT.split('.')[0]}.\n\n"
            "**Your Core Responsibility:**\n"
            "1.  **Strict Adherence to the 'AI Validation Prompt':** Your ONLY guide is the 'AI Validation Prompt' provided with each data instance. You must rigorously evaluate the data SOLELY against every rule defined in THIS prompt. Do NOT apply any other general quality checks or rules (such as those listed in `DEFAULT_DATA_QUALITY_CRITERIA_LIST`) unless they are explicitly stated and requested for specific fields within the 'AI Validation Prompt' artifact itself. If the 'AI Validation Prompt' artifact intends for a general quality check (e.g., for malicious content) to be applied to a field, it will explicitly instruct you to do so for that field, possibly referencing the criteria from `DEFAULT_DATA_QUALITY_CRITERIA_LIST`.\n\n"
            f"{prompt_config.USER_RULES_PRIORITY_STATEMENT}\n\n"
            "**Validation Process & Output:**\n"
            "1.  **Evaluation:** Evaluate the 'Data Instance to Validate' SOLELY against the rules specified in the 'AI Validation Prompt' artifact. All these checks should be based on the JSON data provided, unless a rule in the 'AI Validation Prompt' explicitly requires an external check.\n"
            "2.  **Handling Rules Requiring External Verification (from 'AI Validation Prompt'):**\n"
            "    - Some rules in the 'AI Validation Prompt' might require external checks (e.g., 'URL must be functional', 'image content must be suitable'). You CANNOT perform these external checks.\n"
            "    - For such rules, clearly state this in your 'reason' field (e.g., 'Manual Check Needed: Rule X from AI prompt (e.g., URL functionality) cannot be verified from JSON data alone.').\n"
            "    - The need for an external check for a specific rule from the 'AI Validation Prompt' does NOT, by itself, make 'is_valid' false, unless the 'AI Validation Prompt' explicitly states that inability to verify such a rule constitutes a failure.\n"
            f"3.  **Output Format:** Respond ONLY with a single JSON object structured as follows: {prompt_config.VALIDATION_JSON_OUTPUT_STRUCTURE}.\n"
            f"    **Logic for Populating JSON Fields:**\n{prompt_config.VALIDATION_LOGIC_EXPLANATION}\n"
            "    Additional notes on 'reason' for human reviewers: Distinguish clearly between violations of specific prompt rules (affecting 'is_valid'), violations of general quality criteria (potentially affecting 'has_spam' or 'is_valid' if the prompt maps them), and items needing manual checks."
    )

    def validate(
        self,
        json_data: Any,
        ai_prompt_artifact: str,
        basic_artifact_content: Optional[Union[Dict[str, Any], str, list]] = None, # Added for context
        validation_temperature: float = 0.1
    ) -> Dict[str, Union[bool, str, List[str]]]:
        """
        Validates data against a provided AI prompt using an LLM.
        Returns a dictionary with 'success', 'validation_type', 'message', and 'details'.
        """
        if not self.llm_client:
            return {
                "success": False, 
                "validation_type": "ai_prompt", 
                "message": "LLM client not provided for AI prompt validation.", 
                "details": ["LLM client is required to perform this validation."]
            }
        if not isinstance(ai_prompt_artifact, str):
            return {
                "success": False, 
                "validation_type": "ai_prompt", 
                "message": "Invalid AI prompt artifact type.", 
                "details": [f"AI prompt artifact must be a string, got {type(ai_prompt_artifact).__name__}."]
            }
        system_prompt_llm_val = self._get_validation_system_prompt()

        basic_rules_info = ""
        if basic_artifact_content:
            try:
                basic_artifact_str = ""
                if isinstance(basic_artifact_content, (dict, list)):
                    basic_artifact_str = json.dumps(basic_artifact_content, indent=2)
                elif isinstance(basic_artifact_content, str):
                    try:
                        # Try to parse if it's a JSON string, then re-serialize prettily
                        parsed_json = json.loads(basic_artifact_content)
                        basic_artifact_str = json.dumps(parsed_json, indent=2)
                    except json.JSONDecodeError:
                        # If not a JSON string, use as is (could be another format like YAML as string)
                        basic_artifact_str = basic_artifact_content
                else:
                    basic_artifact_str = str(basic_artifact_content)

                basic_rules_info = (
                    f"For your contextual understanding, the data instance has already been validated against and passed the following basic rules (e.g., from a JSON Schema or similar artifact). "
                    f"You do NOT need to re-validate these basic rules. Focus your validation SOLELY on the AI Validation Prompt provided below.\n"
                    f"Basic Rules (for context only):\n```\n{basic_artifact_str}\n```\n\n"
                )
            except Exception as e:
                # In case serialization of basic_artifact_content fails, log or note, but don't break validation flow
                # For now, just indicate that it couldn't be included.
                basic_rules_info = f"[INFO: Basic artifact content was provided but could not be serialized for inclusion in this prompt due to: {e}]\n\n"

        try:
            data_instance_str = json.dumps(json_data, indent=2)
        except TypeError as e:
            return {
                "success": False, 
                "validation_type": "ai_prompt", 
                "message": "Failed to serialize data for LLM validation.", 
                "details": [f"Could not serialize data to JSON: {e}. Data snippet: {str(json_data)[:200]}"]
            }

        user_prompt_llm_val = (
            f"{basic_rules_info}"
            f"AI Validation Prompt (these are the rules you MUST validate):\n```\n{ai_prompt_artifact}\n```\n\n"
            f"Data Instance to Validate:\n```json\n{data_instance_str}\n```\n\n"
            "Based on the AI Validation Prompt above, and considering the data instance has already passed the contextual basic rules (if provided), does the data instance satisfy all rules in the AI Validation Prompt? "
            "Provide your answer strictly as a JSON object with 'is_valid' (boolean) and 'reason' (string) keys."
        )
        try:
            raw_response = self.llm_client.generate_response(
                system_prompt=system_prompt_llm_val,
                user_prompt=user_prompt_llm_val,
                temperature=validation_temperature,
                json_mode=True # Expecting JSON output for validation result
            )
            print(f"AIPromptHandler - Raw LLM response content:\n{raw_response.content}")
            if raw_response.error or not raw_response.content:
                error_detail = raw_response.error or "LLM returned no content for AI prompt validation."
                return {
                    "success": False, 
                    "validation_type": "ai_prompt", 
                    "message": "LLM communication error during AI prompt validation.", 
                    "details": [error_detail]
                }
            try:
                llm_result = json.loads(raw_response.content)
                print(f"AIPromptHandler - Parsed LLM JSON response: {llm_result}")
                print(f"AIPromptHandler - Parsed LLM JSON has_spam: {llm_result.get('has_spam')}")
                is_valid = llm_result.get("is_valid", False)
                reason = llm_result.get("reason", "No reason provided by LLM.")
                has_spam = llm_result.get("has_spam", False) # Default to False if not provided
                
                if not isinstance(is_valid, bool):
                    reason = f"LLM returned non-boolean for 'is_valid' (value: {is_valid}). Original reason: {reason}"
                    is_valid = False
                
                if not isinstance(has_spam, bool):
                    reason = f"LLM returned non-boolean for 'has_spam' (value: {has_spam}). Original reason: {reason}"
                    # If has_spam is malformed, we might assume spam to be safe, or just report error.
                    # For now, let's ensure is_valid reflects this potential issue if not already false.
                    if is_valid: # Only override if previously thought to be valid
                        is_valid = False 
                    has_spam = True # Assume spam if the field is malformed, to be cautious

                return {
                    "success": is_valid, # Reflects actual data validity
                    "validation_type": "ai_prompt",
                    "message": "AI prompt validation successful." if is_valid else "AI prompt validation failed.",
                    "details": [reason],
                    "has_spam": has_spam
                }
            except json.JSONDecodeError as e:
                return {
                    "success": False, 
                    "validation_type": "ai_prompt", 
                    "message": "LLM response for AI prompt validation was not valid JSON.", 
                    "details": [f"JSONDecodeError: {e}. Response snippet: {raw_response.content[:200]}"]
                }
        except Exception as e:
            detailed_error = traceback.format_exc()
            return {
                "success": False, 
                "validation_type": "ai_prompt", 
                "message": f"An unexpected error occurred during AI prompt validation: {type(e).__name__}", 
                "details": [detailed_error]
            }
