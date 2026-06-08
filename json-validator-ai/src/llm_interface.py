# llm_interface.py
import os
import openai
from typing import Optional, Any, Protocol # Using Protocol for a more flexible interface

class LLMResponse(Protocol):
    """Defines the expected structure of a response from an LLM call."""
    content: Optional[str]
    error: Optional[str]
    raw_response: Optional[Any] # For debugging or more detailed info

class LLMInterface(Protocol):
    """
    A protocol defining the interface for interacting with a Large Language Model.
    Implementations of this protocol will handle communication with specific LLM providers.
    """
    model_name: str

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        ...

    def generate_response(self, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 6000, json_mode: bool = True) -> LLMResponse:
        """
        Generates a response from the LLM based on the provided prompts.

        Args:
            system_prompt: The system-level instructions for the LLM.
            user_prompt: The user's input/query for the LLM.
            temperature: Controls randomness. Lower is more deterministic.
            max_tokens: The maximum number of tokens to generate.
            json_mode: Whether to request the LLM to output in JSON format (if supported).

        Returns:
            An LLMResponse object containing the content or an error.
        """
        ...

class OpenAI_LLMResponse: # Concrete implementation for OpenAI
    def __init__(self, content: Optional[str] = None, error: Optional[str] = None, raw_response: Optional[Any] = None):
        self.content = content
        self.error = error
        self.raw_response = raw_response

class OpenAILLM:
    """Implementation of LLMInterface for OpenAI models."""

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o"):
        """
        Initializes the OpenAI LLM client.

        Args:
            api_key: OpenAI API key. If None, uses OPENAI_API_KEY environment variable.
            model: The OpenAI model to use (e.g., "gpt-4o", "gpt-3.5-turbo").
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY environment variable or pass api_key.")
        try:
            self.client = openai.OpenAI(api_key=self.api_key)
        except openai.OpenAIError as e:
            print(f"🚨 Error initializing OpenAI client: {e}")
            raise
        self.model_name = model
        print(f"✅ OpenAI LLM Client initialized with model: {self.model_name}")


    def generate_response(self, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 6000, json_mode: bool = False) -> OpenAI_LLMResponse:
        """
        Generates a response from the OpenAI API.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        request_params = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            # This is for newer models like gpt-4o, gpt-4-turbo, gpt-3.5-turbo-1106 and later
            request_params["response_format"] = {"type": "json_object"}

        print(f"💬 Sending request to OpenAI model: {self.model_name} (JSON mode: {json_mode})")
        try:
            api_response = self.client.chat.completions.create(**request_params)

            if api_response.choices and api_response.choices[0].message:
                finish_reason = api_response.choices[0].finish_reason
                print(f"ℹ️ OpenAI response finish_reason: {finish_reason}")
                if api_response.choices[0].message.content:
                    content = api_response.choices[0].message.content
                    return OpenAI_LLMResponse(content=content, raw_response=api_response)
            # Fallback for unexpected structure or empty content
            error_msg = "OpenAI response was empty, malformed, or content was missing."
            # Try to log finish_reason even if content is missing, if choices are available
            if api_response.choices and api_response.choices[0] and hasattr(api_response.choices[0], 'finish_reason'):
                finish_reason = api_response.choices[0].finish_reason
                error_msg += f" (finish_reason: {finish_reason})"
            print(f"⚠️ {error_msg}")
            return OpenAI_LLMResponse(error=error_msg, raw_response=api_response)

        except openai.APIConnectionError as e:
            error_msg = f"OpenAI API Connection Error: {e}"
            print(f"🚨 {error_msg}")
            return OpenAI_LLMResponse(error=error_msg, raw_response=e)
        except openai.RateLimitError as e:
            error_msg = f"OpenAI API Rate Limit Exceeded: {e}"
            print(f"🚨 {error_msg}")
            return OpenAI_LLMResponse(error=error_msg, raw_response=e)
        except openai.AuthenticationError as e:
            error_msg = f"OpenAI API Authentication Error: {e}"
            print(f"🚨 {error_msg}")
            return OpenAI_LLMResponse(error=error_msg, raw_response=e)
        except openai.APIStatusError as e:
            error_msg = f"OpenAI API Status Error (code {e.status_code}): {e.response}"
            print(f"🚨 {error_msg}")
            return OpenAI_LLMResponse(error=error_msg, raw_response=e)
        except openai.OpenAIError as e:
            error_msg = f"An OpenAI specific error occurred: {e}"
            print(f"🚨 {error_msg}")
            return OpenAI_LLMResponse(error=error_msg, raw_response=e)
        except Exception as e:
            error_msg = f"An unexpected error occurred during API call: {e}"
            print(f"🚨 {error_msg}")
            return OpenAI_LLMResponse(error=error_msg, raw_response=e)

# Example of how you might add another LLM provider in the future:
# class AnthropicLLM:
#     def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-opus-20240229"):
#         self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
#         # ... initialization ...
#         self.model_name = model
#
#     def generate_response(self, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 2000, json_mode: bool = False) -> LLMResponse:
#         # ... Anthropic API call logic ...
#         # Ensure it returns an object compatible with LLMResponse (e.g., create Anthropic_LLMResponse)
#         pass