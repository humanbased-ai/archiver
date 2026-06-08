# Handler for JSON Schema generation and validation
"""
Handles the generation and validation of JSON Schemas.

This module provides the `SchemaHandler` class, which encapsulates the logic
for creating JSON Schemas from natural language descriptions (using an LLM)
and validating data against these schemas using the `jsonschema` library.
"""

import json
from typing import Dict, Optional, Any, List, Union

from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError

# Assuming llm_interface.py is in the same directory or src is in PYTHONPATH
# This will be an issue if src.llm_interface is not resolvable from here.
# We might need to adjust imports later when integrating with an orchestrator.
from ..llm_interface import LLMInterface # Relative import might be problematic
from . import prompt_config # Import shared prompt configurations

class SchemaHandler:
    """
    Manages JSON Schema generation and validation processes.
    - generate: Generates a JSON Schema using an LLM based on a natural language description and optional examples.
    - validate: Validates given JSON data against a provided JSON Schema artifact using `jsonschema.Draft202012Validator`.
    """
    def __init__(self, llm_client: LLMInterface):
        """
        Initializes the SchemaHandler.

        Args:
            llm_client: An instance conforming to the LLMInterface protocol,
                        used for LLM-dependent generation operations.
        """
        if not (hasattr(llm_client, 'generate_response') and callable(llm_client.generate_response) and
                hasattr(llm_client, 'model_name')):
            raise TypeError("llm_client must be an instance that adheres to the LLMInterface protocol.")
        self.llm_client = llm_client

    def generate(
        self,
        description: str,
        example_data_list: Optional[List[Dict[str, Any]]] = None,
        basic_artifact_content: Optional[Union[Dict[str, Any], str]] = None,  # Not used for schema
        basic_artifact_type: Optional[str] = None  # Not used for schema
    ) -> Dict[str, Any]:
        """
        Generate a JSON Schema using an LLM based on a natural language description and optional examples.
        Returns: {'success': bool, 'artifact': schema dict or None, 'error': str or None}
        """
        response_text_for_error_reporting = None # For error reporting
        try:
            system_prompt = self._get_schema_system_prompt()
            # _get_schema_user_prompt now returns a string or raises ValueError
            user_prompt_str = self._get_schema_user_prompt(description, example_data_list)
        except ValueError as ve:
            return {"success": False, "artifact": None, "error": str(ve)}
        except Exception as e: # Catch any other unexpected error during prompt generation
            return {"success": False, "artifact": None, "error": f"Error preparing prompts: {str(e)}"}

        try:
            raw_response = self.llm_client.generate_response(
                system_prompt,
                user_prompt_str,
                json_mode=True
            )

            if hasattr(raw_response, 'error') and raw_response.error:
                return {"success": False, "artifact": None, "error": f"LLM client error: {raw_response.error}"}
            
            if not hasattr(raw_response, 'content') or not raw_response.content:
                return {"success": False, "artifact": None, "error": "LLM returned no content."}

            response_text_for_error_reporting = raw_response.content.strip()
            
            try:
                generated_artifact_dict = json.loads(response_text_for_error_reporting)
            except json.JSONDecodeError as e:
                return {"success": False, "artifact": None, "error": f"LLM response is not valid JSON: {e}. Response: {response_text_for_error_reporting[:500]}"}

            if not isinstance(generated_artifact_dict, dict) or "schema" not in generated_artifact_dict:
                return {
                    "success": False, "artifact": None, "needs_further_ai_validation": True,
                    "error": f"LLM response is not a dict or missing 'schema' key. Response: {response_text_for_error_reporting[:500]}"
                }

            actual_json_schema = generated_artifact_dict.get("schema")
            needs_further_ai_validation = generated_artifact_dict.get("needs_further_ai_validation", True)

            if not isinstance(actual_json_schema, dict) or not actual_json_schema.get("type"):
                return {
                    "success": False, "artifact": None, "needs_further_ai_validation": needs_further_ai_validation,
                    "error": f"The 'schema' field in LLM response is not a dict or missing 'type' key. Response: {response_text_for_error_reporting[:500]}"
                }
            
            try:
                Draft202012Validator.check_schema(actual_json_schema)
            except SchemaError as e:
                return {
                    "success": False, "artifact": actual_json_schema, "needs_further_ai_validation": needs_further_ai_validation,
                    "error": f"Generated schema (from 'schema' field) is invalid according to jsonschema.SchemaError: {e}"
                }
            
            return {
                "success": True,
                "artifact": actual_json_schema,
                "needs_further_ai_validation": needs_further_ai_validation,
                "error": None
            }
        except Exception as e:
            error_message = f"An unexpected error occurred during schema generation or LLM call: {type(e).__name__} - {str(e)}."
            if response_text_for_error_reporting:
                error_message += f" Last known LLM response snippet: {response_text_for_error_reporting[:200]}"
            return {"success": False, "artifact": None, "error": error_message}

    def _parse_artifact(self, artifact: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        if isinstance(artifact, str):
            try:
                return json.loads(artifact)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON format for schema artifact string: {e}")
        elif isinstance(artifact, dict):
            return artifact
        else:
            raise ValueError(f"Invalid artifact type for schema. Expected string or dictionary, but got {type(artifact).__name__}")

    def _handle_generation_error(self, error: Exception, response_text: Optional[str] = None) -> Dict[str, Union[bool, Optional[Union[str, Dict[str, Any]]]]]:
        error_message = f"An unexpected error occurred during schema generation: {type(error).__name__} - {error}."
        if response_text:
            response_snippet = str(response_text)[:200]
            error_message += f" Raw response snippet: {response_snippet}"
        # Ensure the base error payload structure is consistent
        return {"success": False, "artifact": None, "needs_further_ai_validation": True, "error": error_message}

    def _handle_validation_error(self, error: Exception, validation_type: str) -> Dict[str, Union[bool, str, List[str]]]:
        return {"success": False, "validation_type": validation_type, "message": f"Error during schema validation: {type(error).__name__}", "details": [str(error)]}

    @staticmethod
    def _get_schema_system_prompt() -> str:
        return (
            "You are an expert AI assistant specializing in data modeling and JSON Schema design (Draft 2020-12 compliant). "
            "Your task is to generate a precise and robust JSON Schema based on a user's natural language description and optional examples.\n\n"
            f"**Overall Project Goal & Validation Context:**\n"
            f"{prompt_config.PLATFORM_CONTEXT}\n"
            f"{prompt_config.PLATFORM_AUDITOR_ROLE_DESCRIPTION} While your primary role is to define the structural and format rules via JSON Schema, "
            "keep in mind that the Platform Auditor will also check for broader quality issues. Your schema should support this by being as specific as possible based on the user's description.\n"
            f"{prompt_config.DEFAULT_DATA_QUALITY_CRITERIA_INTRO}\n"
            f"{prompt_config.DEFAULT_DATA_QUALITY_CRITERIA_LIST}\n"
            "While you cannot directly encode all these into a schema (especially semantic ones like 'spam' or 'inappropriate content'), your schema choices (e.g., `minLength`, `maxLength`, `pattern`, `format`, `enum`) should strongly reflect the user's intent to prevent such low-quality data wherever the description allows for it. "
            f"{prompt_config.USER_RULES_PRIORITY_STATEMENT}\n\n"
            "**Your Objective as Schema Generator:**\n"
            "Create a JSON Schema that:\n"
            "1.  **Maximizes Data Quality:** Enforces strict rules for data integrity, consistency, and completeness based on the user's explicit description. This is vital for downstream AI model training.\n"
            "2.  **Is Comprehensive:** Accurately captures all specified fields, data types (string, number, integer, boolean, array, object), nested structures, and required fields from the description.\n"
            "3.  **Includes Precise Constraints:** Define relevant constraints like `enum`, `pattern` (for IDs, URLs, specific formats), numerical ranges (`minimum`/`maximum`), string lengths (`minLength`/`maxLength`), and array properties (`minItems`/`maxItems`, item validation). Use these to reflect the user's requirements for valid data, which indirectly helps guard against issues like 'too short' or 'format errors'.\n"
            "4.  **Strictly Adheres to User's Explicit Description:** Your schema MUST strictly reflect ONLY the rules and requirements EXPLICITLY STATED in the provided natural language description. DO NOT add, infer, or invent any validation rules or fields not present in the description. If a field is mentioned but no specific validation rules are given for it, infer only the most basic type if necessary, or ask for clarification if ambiguous. If the description is clear that a field has no specific constraints beyond its existence, reflect that.\n"
            "5.  **Handles Examples Correctly:** If example data is provided, the schema must validate all examples WHILE STRICTLY ADHERING to the natural language description. The natural language description is the primary source of truth. If there's a conflict, prioritize the description. Aim for compatibility but do not weaken the schema rules derived from the description just to fit an example if the example contradicts the explicit textual rules.\n"
            "6.  **Is Pragmatic for Validation:**\n"
            "    *   For numeric range constraints, provide direct numeric values. Do NOT use dynamic references like `$data`.\n"
            "    *   For complex inter-field dependencies (e.g., 'end_date' must be after 'start_date') that are hard to express directly in standard JSON Schema, clearly describe this relationship in the 'description' field of the relevant property or the parent object. This aids potential post-processing or custom validation rule generation.\n\n"
            "**Specific Field Constraints Guidance (Examples to support Platform Auditor defaults and user rules):**\n"
            "*   User says 'field X must be a non-empty string for descriptive text': If no other length is specified by the user, and the context implies meaningful content, consider `{\"type\": \"string\", \"minLength\": 5, \"pattern\": \".*\\\\S.*\"}`. If the user explicitly says 'must not be empty' or 'must have content' without specifying a length, `{\"type\": \"string\", \"minLength\": 1, \"pattern\": \".*\\\\S.*\"}` is appropriate. Always prioritize user-specified lengths.\n"
            "*   User says 'field Y must be a valid email': Use `{\"type\": \"string\", \"format\": \"email\"}`.\n"
            "*   User says 'field Z must be one of A, B, C': Use `{\"type\": \"string\", \"enum\": [\"A\", \"B\", \"C\"]}`.\n"
            "*   User says 'field IMG_URL must be an image URL ending in .png or .jpg': Use `{\"type\": \"string\", \"format\": \"uri\", \"pattern\": \"\\\\.(png|jpe?g)$\"}`. If they just say 'image URL' without specific extensions, use `{\"type\": \"string\", \"format\": \"uri\"}` and you can add a `description` in the schema noting common image types are expected (e.g., 'URL appearing to point to a common image file like PNG, JPG, GIF, etc.').\n"
            "*   User says 'field AUDIO_URL must be an audio URL': Use `{\"type\": \"string\", \"format\": \"uri\"}`. If specific extensions are mentioned by user, add a `pattern`. Otherwise, a `description` can note common audio types.\n"
            "*   User says 'field W must be a string containing at least one non-whitespace character': Use `{\"type\": \"string\", \"minLength\": 1, \"pattern\": \".*\\\\S.*\"}` (JSON escaped regex for `.*\\S.*`). This is a stronger check against purely whitespace meaningless fillers than just `minLength: 1`.\n"
            "*   User says 'field ID must be a 10-character alphanumeric string': Use `{\"type\": \"string\", \"pattern\": \"^[a-zA-Z0-9]{10}$\"}`.\n\n"
            "**Output Format (JSON ONLY):**\n"
            "Respond ONLY with a single JSON object in the following format:\n"
            "{\n"
            "  \"schema\": { ... your generated JSON schema ... },\n"
            "  \"needs_further_ai_validation\": <boolean>\n"
            "}\n\n"
            f"{prompt_config.NEEDS_FURTHER_AI_VALIDATION_GUIDANCE}\n\n"
            "Do NOT include any other text, explanations, or markdown formatting outside this JSON object.\n"
            "Ensure the \"schema\" is a valid JSON Schema object."
        )

    def _get_schema_user_prompt(self, description: str, example_data_list: Optional[List[Dict[str, Any]]] = None) -> str:
        user_prompt_parts = [f"Natural language description for JSON Schema:\n{description}"]
        if example_data_list:
            user_prompt_parts.append("\nHere are some example data instances that the artifact should handle correctly:")
            for i, example_data in enumerate(example_data_list):
                try:
                    example_str = json.dumps(example_data, indent=2, ensure_ascii=False)
                    user_prompt_parts.append(f"\nExample {i+1}:\n```json\n{example_str}\n```")
                except TypeError as e:
                    # Raise an error that the calling method (generate) can catch and handle.
                    raise ValueError(f"Error serializing example data {i+1} to JSON: {e}. Ensure all example data is JSON serializable.")
        return "\n".join(user_prompt_parts)

    def validate(
        self,
        json_data: Any,
        schema_artifact: Union[str, Dict[str, Any]],
    ) -> Dict[str, Union[bool, str, List[str]]]:
        """
        Validate data against a provided JSON schema (string or dictionary).
        Returns: {'success': bool, 'validation_type': str, 'message': str, 'details': list}
        """
        try:
            schema_dict = self._parse_artifact(schema_artifact)

            Draft202012Validator.check_schema(schema_dict) # This will raise SchemaError if schema itself is invalid
            validator = Draft202012Validator(schema_dict)
            errors = sorted(validator.iter_errors(json_data), key=lambda e: e.path)

            print('schema_artifact', schema_artifact, schema_dict, json_data, errors)

            if errors:
                error_messages = [f"Validation Error at `{'->'.join(map(str, e.path)) if e.path else 'root'}`: {e.message}" for e in errors]
                return {
                    "success": False, 
                    "validation_type": "schema", 
                    "message": "JSON data is invalid against the schema.", 
                    "details": error_messages
                }
            return {
                "success": True, 
                "validation_type": "schema", 
                "message": "JSON data is valid against the schema.", 
                "details": []
            }
        except (ValueError, TypeError) as e: # Handles errors from _parse_artifact if schema_artifact is bad
            return {
                "success": False, 
                "validation_type": "schema_parsing_error", 
                "message": f"Error parsing schema artifact: {str(e)}", 
                "details": [str(e)]
            }
        except SchemaError as e: # Handles errors from Draft202012Validator.check_schema
            return {
                "success": False, 
                "validation_type": "invalid_schema_structure", 
                "message": "Invalid schema provided for validation.", 
                "details": [f"SchemaError: {e.message}"]
            }
        except Exception as e: # Catch-all for other unexpected errors during validation
            return {
                "success": False, 
                "validation_type": "schema_validation_runtime_error", 
                "message": f"Unexpected error during schema validation: {type(e).__name__}", 
                "details": [str(e)]
            }
