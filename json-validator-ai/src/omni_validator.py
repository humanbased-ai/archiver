# omni_validator.py
import os
import json # Added for composite artifact
from typing import Dict, Optional, Any, List, Union, Tuple

from .llm_interface import LLMInterface, OpenAILLM # Added OpenAILLM import

# Removed jsonschema, subprocess, traceback, tempfile, os imports if no longer directly used here
# They are now in their respective handlers.

# Import handlers
from .artifact_handlers.schema_handler import SchemaHandler
from .artifact_handlers.ai_prompt_handler import AIPromptHandler
from .artifact_handlers.starlark_handler import StarlarkHandler
from configs import OPENAI_API_KEY

class OmniValidator:
    @staticmethod
    def _parse_json_string_robustly(json_string: Optional[str]) -> Tuple[Optional[Any], Optional[str]]:
        """
        Robustly parses a JSON string, attempting to handle cases where the string
        might be unexpectedly wrapped in an extra layer of quotes.

        Args:
            json_string: The string suspected to be JSON.

        Returns:
            A tuple (parsed_data, error_message).
            - parsed_data: The parsed Python object (dict, list, etc.) if successful, else None.
            - error_message: A string describing the error if parsing failed, else None.
        """
        if not isinstance(json_string, str):
            return None, f"Input is not a string, but type: {type(json_string).__name__}"

        if not json_string.strip(): # Handle empty or whitespace-only strings
            return None, "Input string is empty or contains only whitespace."

        try:
            # First, try to parse directly
            return json.loads(json_string), None
        except json.JSONDecodeError as e1:
            # If direct parsing fails, check if it's wrapped in single or double quotes
            stripped_string = json_string.strip() # Remove leading/trailing whitespace
            if (stripped_string.startswith("'") and stripped_string.endswith("'")) or \
               (stripped_string.startswith('"') and stripped_string.endswith('"')):
                
                inner_json_string = stripped_string[1:-1]
                if not inner_json_string.strip(): # Handle if inner content is empty
                     return None, f"Original parsing error: {e1}. Inner content after stripping quotes is empty."

                try:
                    return json.loads(inner_json_string), None
                except json.JSONDecodeError as e2:
                    return None, f"Failed to parse directly (Error: {e1}). Also failed to parse after removing potential outer quotes (Error: {e2}). Original string snippet: '{json_string[:70]}...'"
            else:
                # If not wrapped, the original error is the one to report
                return None, f"JSON parsing error: {e1}. Original string snippet: '{json_string[:70]}...'"
        except Exception as ex: # Catch any other unexpected errors during parsing
            return None, f"An unexpected error occurred during JSON parsing: {type(ex).__name__} - {ex}. Original string snippet: '{json_string[:70]}...'"

    """
    Orchestrates the generation and validation of various data validation artifacts.

    This class acts as a high-level interface that delegates tasks to specialized
    handler classes for different artifact types. It utilizes an LLM (Language
    Learning Model) client for tasks requiring natural language understanding and
    generation.

    Supported artifact types include:
    - "schema": JSON Schema for data validation.
    - "ai_prompt": Natural language prompts for AI-based validation.
    - "starlark": Starlark code snippets for data validation.
    """
    def __init__(self, llm_client: Optional[LLMInterface] = None): # Made llm_client optional
        """
        Initializes the OmniValidator instance.

        Args:
            llm_client: An instance conforming to the LLMInterface protocol,
                        used for LLM-dependent operations. If None, a default
                        OpenAILLM client will be instantiated.
        Initializes:
            - schema_handler: Handler for JSON Schema operations.
            - ai_prompt_handler: Handler for AI prompt operations.
            - starlark_handler: Handler for Starlark code operations.
        """
        if llm_client is None:
            # Instantiate a default LLM client if none is provided
            api_key = OPENAI_API_KEY
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set.")    
            self.llm_client = OpenAILLM(api_key=api_key, model="gpt-4o") 
            print(f"OmniValidator initialized with default LLM: {getattr(self.llm_client, 'model_name', 'Unknown Model')}")
        else:
            self.llm_client = llm_client
            print(f"OmniValidator initialized with provided LLM: {getattr(self.llm_client, 'model_name', 'Unknown Model')}")

        if not (hasattr(self.llm_client, 'generate_response') and callable(self.llm_client.generate_response) and
                hasattr(self.llm_client, 'model_name')):
            raise TypeError("llm_client must be an instance that adheres to the LLMInterface protocol.")

        # Initialize handlers, passing the llm_client to those that need it.
        # Assuming handlers are updated to accept llm_client if they perform LLM operations.
        self.schema_handler = SchemaHandler(llm_client=self.llm_client) # Pass llm_client
        self.ai_prompt_handler = AIPromptHandler(llm_client=self.llm_client) # Pass llm_client
        self.starlark_handler = StarlarkHandler(llm_client=self.llm_client) # Pass llm_client

    def generate_artifact(
        self,
        description: str,
        example_data_list: Optional[List[Dict[str, Any]]] = None,
        artifact_type: str = "schema",
        basic_artifact_type_for_composite: str = "schema",
        generation_temperature: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Generates an artifact, which includes a basic validation component and potentially
        a complementary AI prompt for semantic validation. The decision to include the
        AI prompt is based on the assessment from the basic artifact's handler.

        Args:
            description (str): Natural language description of the data or validation rules.
            example_data_list (Optional[List[Dict[str, Any]]]): Optional list of example data instances.
            artifact_type (str): The primary type of artifact to generate. Supported values:
                                 "schema", "ai_prompt", "starlark", or "composite".
                                 Defaults to "schema".
            basic_artifact_type_for_composite (str): Specifies the type of the 'basic' component
                                                     when artifact_type is "composite". Defaults to "schema".

        Returns:
            Dict[str, Any]: A dictionary containing the generation result.
                            Expected structure: {
                                "success": bool,
                                "artifact": Optional[str],  # JSON string of the artifact, e.g.,
                                                            # '{"basic": ..., "ai": ..., "basic_artifact_type": ..., "needs_further_ai_validation": bool}'
                                "error": Optional[str],
                                "needs_further_ai_validation": bool  # Overall assessment by OmniValidator, mirrors the flag from basic handler on success.
                            }
        """
        supported_handlers = {
            "schema": self.schema_handler.generate,
            "ai_prompt": self.ai_prompt_handler.generate,
            "starlark": self.starlark_handler.generate
        }

        basic_artifact_content: Optional[Union[Dict[str, Any], str]] = None
        ai_prompt_content: Optional[str] = None
        actual_basic_artifact_type: str = ""
        needs_further_ai_validation_from_basic: bool = True # Default, updated by basic_handler

        if artifact_type == "composite":
            if basic_artifact_type_for_composite not in supported_handlers:
                error_msg = f"Unsupported 'basic_artifact_type_for_composite': {basic_artifact_type_for_composite}. Supported: {', '.join(supported_handlers.keys())}"
                return {
                    "success": False, "artifact": None,
                    "error": error_msg,
                    "needs_further_ai_validation": True
                }
            basic_gen_func = supported_handlers[basic_artifact_type_for_composite]
            actual_basic_artifact_type = basic_artifact_type_for_composite
        elif artifact_type in supported_handlers:
            basic_gen_func = supported_handlers[artifact_type]
            actual_basic_artifact_type = artifact_type
        else:
            error_msg = f"Unsupported 'artifact_type': {artifact_type}. Supported: {', '.join(list(supported_handlers.keys()) + ['composite'])}"
            return {
                "success": False, "artifact": None,
                "error": error_msg,
                "needs_further_ai_validation": True
            }

        # Generate the basic artifact component
        try:
            gen_kwargs = {"description": description, "example_data_list": example_data_list}
            if actual_basic_artifact_type == "ai_prompt":
                if generation_temperature is not None:
                    gen_kwargs["generation_temperature"] = generation_temperature
                # AIPromptHandler needs to know the overall context to set its 'needs_further_ai_validation' output correctly
                gen_kwargs["overall_artifact_type"] = artifact_type 
            
            basic_result = basic_gen_func(**gen_kwargs)
            if not isinstance(basic_result, dict) or "success" not in basic_result:
                error_msg = f"Handler '{actual_basic_artifact_type}' returned invalid result structure."
                return {"success": False, "artifact": None, "error": error_msg, "needs_further_ai_validation": True}

            if not basic_result.get("success"):
                error_msg = basic_result.get("error", f"Unknown error from '{actual_basic_artifact_type}' handler during basic artifact generation.")
                return {
                    "success": False, "artifact": None, 
                    "error": error_msg,
                    "needs_further_ai_validation": True # If basic handler fails, assume AI validation might still be desired based on description
                }
            
            basic_artifact_content = basic_result.get("artifact")
            needs_further_ai_validation_from_basic = basic_result.get("needs_further_ai_validation", True)
        except Exception as e:
            error_msg = f"Error during generation of basic '{actual_basic_artifact_type}' component: {type(e).__name__} - {str(e)}"
            print(f"OmniValidator.generate_artifact Error: {error_msg}")
            return None

        # Conditionally generate the AI prompt component
        ai_prompt_content = None
        if needs_further_ai_validation_from_basic:
            # This means the basic_handler (schema, starlark, or ai_prompt_as_basic_for_composite)
            # indicated that a complementary AI prompt is needed.
            try:
                ai_gen_kwargs = {
                    "description": description, 
                    "example_data_list": example_data_list,
                    "basic_artifact_content": basic_artifact_content, # Context from basic artifact
                    "basic_artifact_type": actual_basic_artifact_type, # Context from basic artifact
                    # AIPromptHandler.generate should infer it's a complementary prompt if basic_artifact_content is provided
                }
                if generation_temperature is not None:
                    ai_gen_kwargs["generation_temperature"] = generation_temperature
                
                ai_result = self.ai_prompt_handler.generate(**ai_gen_kwargs)
                if not isinstance(ai_result, dict) or "success" not in ai_result:
                    return {"success": False, "artifact": None, "error": "Complementary AI prompt handler returned invalid result structure.", "needs_further_ai_validation": True}

                if not ai_result.get("success"):
                    return {
                        "success": False, "artifact": None,
                        "error": f"Failed to generate complementary 'ai' component: {ai_result.get('error')}",
                        "needs_further_ai_validation": True # True because the intended AI part is missing
                    }
                ai_prompt_content = ai_result.get("artifact")
            except Exception as e:
                error_msg = f"Error during generation of complementary 'ai' component: {type(e).__name__} - {str(e)}"
                print(f"OmniValidator.generate_artifact Error: {error_msg}")
                return None
        # If not needs_further_ai_validation_from_basic, ai_prompt_content remains None.
        # This is correct for schema/starlark not needing AI, or a standalone 'ai_prompt' artifact_type.

        # Prepare the final artifact structure
        final_artifact_data = {
            "basic": basic_artifact_content,
            "ai": ai_prompt_content, # This will be None if AI prompt was not needed or basic was AI and it was already assigned
            "basic_artifact_type": actual_basic_artifact_type,
            # This flag indicates if the 'ai' field in the artifact is populated and intended for use.
            "needs_further_ai_validation": (ai_prompt_content is not None and ai_prompt_content != "")
        }

        try:

            artifact_json = json.dumps(final_artifact_data)
            GREEN = '\033[92m'
            RESET = '\033[0m'
            print(f'artifact_json_str = {GREEN}{json.dumps(artifact_json)}{RESET}')
            return {
                "success": True, 
                "artifact": artifact_json, 
                "error": None,
                # This top-level flag should also reflect the final state of the artifact's 'ai' component.
                "needs_further_ai_validation": (ai_prompt_content is not None and ai_prompt_content != "")
            }
        except TypeError as e:
            error_msg = f"Error serializing final artifact to JSON: {type(e).__name__} - {str(e)}"
            print(f"OmniValidator.generate_artifact Error: {error_msg}")
            return None

    def validate_artifact(
        self,
        json_data: Any,
        artifact: Union[str, dict, list],  # MODIFIED to accept str, dict, or list
        use_ai: bool = False,
        validation_temperature: Optional[float] = 0.1
    ) -> Optional[Dict[str, Union[bool, str, List[str]]]]:
        """
        Validates data using a two-stage process: basic validation and optional advanced AI semantic validation.

        Args:
            json_data (Any): The JSON data to validate (can be dict, list, etc.).
            artifact (Union[str, dict, list]): The validation artifact. 
                                               If str, it's a JSON string containing 'basic', 'ai', 'basic_artifact_type',
                                               and 'needs_further_ai_validation' keys.
                                               If dict or list, it's the pre-parsed artifact structure.
            use_ai (bool): Flag to enable AI semantic validation if available in the artifact
                           and deemed necessary by the artifact itself. Defaults to False.
            validation_temperature (Optional[float]): Temperature for AI validation. Defaults to 0.1.
                                                      If None is explicitly passed, the downstream handler's
                                                      default temperature may be used.

        Returns:
            Dict[str, Union[bool, str, List[str]]]: A dictionary with validation results.
                                                    Structure includes 'success', 'validation_type',
                                                    'message', and 'details' (list of error strings).
        """
        print(f"OmniValidator.validate_artifact received artifact of type: {type(artifact)}")
        

        MAGENTA = '\033[95m'
        RESET = '\033[0m'
        # Safely dump json_data for printing
        try:
            # Attempt to pretty-print if it's complex, otherwise just convert to string
            if isinstance(json_data, (dict, list)) and len(json.dumps(json_data)) > 100: # Heuristic for large/complex
                 json_data_str = json.dumps(json_data, indent=2, ensure_ascii=False)
            else:
                 json_data_str = json.dumps(json_data, ensure_ascii=False) # More compact for simple data
        except TypeError:
            json_data_str = f"<Non-serializable data of type: {type(json_data).__name__}>"
        except Exception: # Catch other potential json.dumps errors
            json_data_str = f"<Error serializing data of type: {type(json_data).__name__}>"

        print(f"Validating json_data (type: {type(json_data).__name__}): {MAGENTA}{json_data_str}{RESET}")
        
        parsed_artifact: Optional[Any] = None
        error_msg: Optional[str] = None

        if isinstance(artifact, (dict, list)):
            parsed_artifact = artifact
            if not isinstance(parsed_artifact, dict):
                error_msg = f"Provided artifact is a {type(parsed_artifact).__name__}, but a dictionary structure is expected for the artifact."
                return {
                    "success": False,
                    "validation_type": "artifact_structure_error",
                    "message": "Artifact must be a dictionary-like object if not a JSON string.",
                    "details": [error_msg]
                }
        elif isinstance(artifact, str):
            parsed_artifact, error_msg = self._parse_json_string_robustly(artifact)
            if error_msg:
                enhanced_error_msg = (
                    f"Invalid JSON string provided. When storing JSON as a string, ensure it's correctly serialized "
                    f"(e.g., using json.dumps(your_dict, separators=(',', ':'))) and all special characters "
                    f"within string values are properly escaped. Original error: {error_msg}"
                )
                return {
                    "success": False,
                    "validation_type": "artifact_parsing_error",
                    "message": "Failed to parse the provided artifact string.",
                    "details": [enhanced_error_msg]
                }
        else:
            error_msg = f"Unsupported artifact type: {type(artifact).__name__}. Artifact must be a JSON string, dictionary, or list."
            return {
                "success": False,
                "validation_type": "artifact_type_error",
                "message": "Unsupported artifact type.",
                "details": [error_msg]
            }

        # This explicit check for error_msg after the type handling blocks is mostly a safeguard;
        # each block should return directly if an error is found.
        if error_msg:
             return {
                "success": False,
                "validation_type": "artifact_processing_error", # Generic error if somehow an error wasn't returned earlier
                "message": "An unexpected state was reached during artifact processing.",
                "details": [error_msg]
            }

        # Crucially, ensure parsed_artifact is a dictionary before proceeding to access its keys.
        if not isinstance(parsed_artifact, dict):
            return {
                "success": False,
                "validation_type": "artifact_structure_error",
                "message": "Parsed or provided artifact is not a valid JSON object (dictionary) structure as expected.",
                "details": [f"Processed artifact data type: {type(parsed_artifact).__name__}. Expected a dictionary."]
            }

        # If we've reached here, parsed_artifact is a valid dictionary.
        basic_artifact_content = parsed_artifact.get("basic")
        ai_prompt_content = parsed_artifact.get("ai")
        basic_artifact_type = parsed_artifact.get("basic_artifact_type")
        needs_further_ai_validation_from_artifact = parsed_artifact.get("needs_further_ai_validation", True)

        if not basic_artifact_type or not isinstance(basic_artifact_type, str):
            return {
                "success": False,
                "validation_type": "artifact_structure_error",
                "message": "Artifact is missing 'basic_artifact_type' or it's not a string.",
                "details": []
            }

        basic_validation_result: Dict[str, Union[bool, str, List[str]]]

        try:
            if basic_artifact_type == "schema":
                if not isinstance(basic_artifact_content, dict):
                    return {"success": False, "validation_type": "artifact_content_error", "message": "'basic' (schema) is not a dict.", "details": []}
                basic_validation_result = self.schema_handler.validate(json_data, basic_artifact_content)
            elif basic_artifact_type == "starlark":
                if not isinstance(basic_artifact_content, str):
                    return {"success": False, "validation_type": "artifact_content_error", "message": "'basic' (starlark) is not a string.", "details": []}
                basic_validation_result = self.starlark_handler.validate(json_data, basic_artifact_content)
            elif basic_artifact_type == "ai_prompt":
                if not isinstance(basic_artifact_content, str):
                    return {
                        "success": False, 
                        "validation_type": "artifact_content_error", 
                        "message": "The 'basic' content for 'ai_prompt' type artifact is not a string.", 
                        "details": []
                    }
                validate_kwargs_basic_ai = {
                    "json_data": json_data,
                    "ai_prompt_artifact": basic_artifact_content,
                    "basic_artifact_content": basic_artifact_content  # Pass basic artifact for context
                }
                if validation_temperature is not None:
                    validate_kwargs_basic_ai["validation_temperature"] = validation_temperature
                basic_validation_result = self.ai_prompt_handler.validate(**validate_kwargs_basic_ai)
            else:
                return {
                    "success": False,
                    "validation_type": "internal_dispatcher_error",
                    "message": f"Internal error: Unhandled basic_artifact_type '{basic_artifact_type}' in dispatcher logic.",
                    "details": []
                }
        except Exception as e:
            error_msg = f"Error during basic validation execution for '{basic_artifact_type}': {type(e).__name__} - {str(e)}"
            print(f"OmniValidator.validate_artifact Error: {error_msg}")
            return None

        if not basic_validation_result.get("success"):
            return basic_validation_result

        if not use_ai:
            return basic_validation_result

        if not needs_further_ai_validation_from_artifact:
            if basic_artifact_type == "ai_prompt":
                 return basic_validation_result
            return {
                "success": True,
                "validation_type": f"ai_skipped_per_artifact_after_{basic_artifact_type}",
                "message": "AI validation was deemed unnecessary by the artifact and therefore considered passed.",
                "details": basic_validation_result.get("details", []) + [f"Basic validation ({basic_artifact_type}) passed successfully."]
            }

        if ai_prompt_content is None or not isinstance(ai_prompt_content, str):
            return {
                "success": False,
                "validation_type": "artifact_missing_complementary_ai_prompt",
                "message": "Advanced AI validation stage: The 'ai' component in the artifact (expected to contain the complementary AI prompt) is missing or not a valid string.",
                "details": [f"Basic validation ({basic_artifact_type}) passed. Attempted to find complementary AI prompt for further semantic validation."]
            }

        validate_kwargs_ai = {
            "json_data": json_data,
            "ai_prompt_artifact": ai_prompt_content,
            "basic_artifact_content": basic_artifact_content  # Pass basic artifact for context
        }
        if validation_temperature is not None:
            validate_kwargs_ai["validation_temperature"] = validation_temperature
        
        try:
            ai_validation_result = self.ai_prompt_handler.validate(**validate_kwargs_ai)
            print(f"OmniValidator - AI validation result: {ai_validation_result}")
            if isinstance(ai_validation_result, dict):
                print(f"OmniValidator - AI validation has_spam: {ai_validation_result.get('has_spam')}")
            if not isinstance(ai_validation_result, dict) or "success" not in ai_validation_result:
                return {
                    "success": False,
                    "validation_type": f"ai_semantic_handler_invalid_response_after_{basic_artifact_type}",
                    "message": "AI prompt handler returned an invalid response format during semantic validation.",
                    "details": [f"Basic validation ({basic_artifact_type}) passed."]
                }
            
            final_success = basic_validation_result.get("success", False) and ai_validation_result.get("success", False)
            combined_message = f"Basic: {basic_validation_result.get('message', 'OK')}. AI: {ai_validation_result.get('message', 'OK')}"
            if not final_success:
                if not basic_validation_result.get("success"):
                    combined_message = f"Basic validation failed: {basic_validation_result.get('message')}"
                elif not ai_validation_result.get("success"):
                    combined_message = f"Basic validation passed. AI semantic validation failed: {ai_validation_result.get('message')}"
            
            final_result = {
                "success": final_success,
                "validation_type": f"combined_after_{basic_artifact_type}_and_ai",
                "message": combined_message,
                "details": (basic_validation_result.get("details", []) if not basic_validation_result.get("success") else []) + 
                             (ai_validation_result.get("details", []) if not ai_validation_result.get("success") else []),
                "has_spam": ai_validation_result.get("has_spam", False) # Get has_spam from AI validation
            }
            if final_success:
                final_result["message"] = f"All validations passed (Basic: {basic_artifact_type}, AI Semantic)."
                final_result["details"] = ["Data conforms to all specified rules."]

            return final_result
        except Exception as e:
            error_msg = f"Error during advanced AI semantic validation: {type(e).__name__} - {str(e)}"
            print(f"OmniValidator.validate_artifact Error: {error_msg}")
            # Include info that basic validation passed, if it did, before returning None
            if basic_validation_result and basic_validation_result.get("success"):
                print(f"OmniValidator.validate_artifact Info: Basic validation ({basic_artifact_type}) had passed before this AI error.")
            return None
