import unittest
import json

from src.omni_validator import OmniValidator
from src.llm_interface import OpenAILLM

# Test data provided by the user
TEST_OUTFIT_DATA = {
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

class TestOmniValidator(unittest.TestCase):
    def setUp(self):
        try:
            self.llm = OpenAILLM()
        except Exception as e:
            self.fail(f"Failed to initialize OpenAILLM. Ensure OPENAI_API_KEY is set. Error: {e}")
        self.validator = OmniValidator(llm_client=self.llm)
        self.test_data = TEST_OUTFIT_DATA

    def test_01_generate_and_validate_schema(self):
        print("\n--- Test: Generate and Validate Schema (Live LLM) ---")
        description = "An outfit data structure containing taskId, templateId, and a data object. The data object has top_image, bottom_image, and full_outfit_image, each being an array of objects with uid, url, and name. All fields are required. URLs should be valid image URLs ending in .jpg and from file.b18a.io. uid, url, and name within each image object are required strings and should not be empty."
        
        generation_result = self.validator.generate_artifact(
            description=description,
            example_data_list=[self.test_data],
            artifact_type="schema"
        )
        
        self.assertTrue(generation_result.get("success"), msg=f"Schema generation failed: {generation_result.get('error')}")
        self.assertIsNotNone(generation_result.get("artifact"), msg="Generated schema artifact is None")
        generated_schema_artifact = generation_result["artifact"]
        
        # Ensure the artifact is a string as expected by validate_artifact
        self.assertIsInstance(generated_schema_artifact, str, msg="Generated schema artifact is not a string.")

        # Optional: Validate if the string is valid JSON for sanity, but don't pass the parsed dict to validate_artifact
        try:
            json.loads(generated_schema_artifact) 
        except json.JSONDecodeError as e:
            self.fail(f"Generated schema string is not valid JSON: {e} - Schema: {generated_schema_artifact[:500]}")

        validation_result = self.validator.validate_artifact(
            json_data=self.test_data,
            artifact=generated_schema_artifact, # Pass the string artifact
            artifact_type="schema"
        )
        self.assertTrue(validation_result.get("success"), msg=f"Schema validation failed for valid data: {validation_result.get('message')} - {validation_result.get('details')}")

        invalid_data = {
            "taskId": "123", # templateId is missing
            "data": {
                "top_image": [{"uid": "1", "url": "http://example.com/img.png", "name": "img1"}], # Invalid URL pattern/domain
                "bottom_image": [], # Should be non-empty
                "full_outfit_image": [{"uid": "3", "url": "https://file.b18a.io/img.jpg"}] # name is missing
            }
        }
        validation_result_invalid = self.validator.validate_artifact(
            json_data=invalid_data,
            artifact=generated_schema_artifact, # Pass the string artifact here as well
            artifact_type="schema"
        )
        self.assertFalse(validation_result_invalid.get("success"), msg="Schema validation succeeded for invalid data. Details: " + str(validation_result_invalid.get("details")))
        # For live LLM, exact error messages are hard to predict. Check for presence of details.
        self.assertTrue(validation_result_invalid.get("details"), msg="Details for invalid data validation were empty.")
        print(f"Invalid data validation details (Schema): {validation_result_invalid.get('details')}")

    def test_02_generate_and_validate_ai_prompt(self):
        print("\n--- Test: Generate and Validate AI Prompt (Live LLM) ---")
        description_ai_prompt = (
            "Create an AI prompt to validate JSON data for image entries. "
            "The validation rules should ensure that for each item in 'top_image', 'bottom_image', and 'full_outfit_image' lists: "
            "1. A 'name' key exists and its value is a non-empty string. "
            "2. A 'url' key exists and its value is a non-empty string that starts with 'http://' or 'https://'. "
            "The AI should respond with a JSON object: {'is_valid': <boolean>, 'reason': '<explanation>'}"
        )
        generation_result = self.validator.generate_artifact(
            description=description_ai_prompt,
            artifact_type="ai_prompt"
        )
        self.assertTrue(generation_result.get("success"), msg=f"AI Prompt generation failed: {generation_result.get('error')}")
        self.assertIsNotNone(generation_result.get("artifact"), msg="Generated AI prompt artifact is None")
        self.assertIsInstance(generation_result.get("artifact"), str, msg="Generated AI prompt is not a string")
        self.assertNotEqual(generation_result.get("artifact", "").strip(), "", msg="Generated AI prompt is empty")
        generated_prompt = generation_result["artifact"]
        print(f"Generated AI Prompt: {generated_prompt}")
        
        # For AI prompt validation, we expect it to pass for the valid test_data
        # The actual LLM call will determine this.
        validation_result = self.validator.validate_artifact(
            json_data=self.test_data,
            artifact=generated_prompt,
            artifact_type="ai_prompt",
            llm_client=self.llm # Pass the live LLM client
        )
        self.assertTrue(validation_result.get("success"), msg=f"AI Prompt validation failed for valid data: {validation_result.get('message')} - {validation_result.get('details')}")
        print(f"AI Prompt validation message for valid data: {validation_result.get('message')}")

        # Test with invalid data for AI Prompt
        invalid_data_ai_prompt = {
            "taskId": "task789",
            "templateId": "templateTest",
            "data": {
                "top_image": [{"name": "", "url": "https://file.b18a.io/top_empty_name.jpg"}],  # Empty name
                "bottom_image": [{"name": "bottom_no_url.jpg"}],  # Missing URL
                "full_outfit_image": [{"name": "outfit_bad_url.jpg", "url": "htp://broken"}]  # Invalid URL format
            }
        }
        validation_result_invalid = self.validator.validate_artifact(
            json_data=invalid_data_ai_prompt,
            artifact=generated_prompt,
            artifact_type="ai_prompt",
            llm_client=self.llm # Pass the live LLM client
        )
        self.assertFalse(validation_result_invalid.get("success"), msg="AI Prompt validation succeeded for invalid data. Details: " + str(validation_result_invalid.get("details")))
        self.assertTrue(validation_result_invalid.get("details"), msg="Details for invalid AI Prompt validation were empty.")
        print(f"Invalid data validation details (AI Prompt): {validation_result_invalid.get('details')}")

    def test_03_generate_and_validate_starlark(self):
        print("\n--- Test: Generate and Validate Starlark (Live LLM) ---")
        description = ("The outfit JSON data must satisfy the following: "
                       "1. 'taskId' and 'templateId' are non-empty strings. "
                       "2. 'data' field exists and is an object. "
                       "3. 'top_image', 'bottom_image', 'full_outfit_image' are non-empty arrays. "
                       "4. Each item in these image arrays is an object with 'uid', 'url', and 'name' as non-empty strings. "
                       "5. 'url' must start with 'https://file.b18a.io/.")

        generation_result = self.validator.generate_artifact(
            description=description,
            example_data_list=[self.test_data],
            artifact_type="starlark"
        )
        self.assertTrue(generation_result.get("success"), msg=f"Starlark generation failed: {generation_result.get('error')}")
        self.assertIsNotNone(generation_result.get("artifact"), msg="Generated Starlark artifact is None")
        self.assertIsInstance(generation_result.get("artifact"), str, msg="Generated Starlark code is not a string")
        self.assertNotEqual(generation_result.get("artifact", "").strip(), "", msg="Generated Starlark code is empty")
        generated_starlark_code = generation_result["artifact"]
        print(f"Generated Starlark Code (first 500 chars):\n{generated_starlark_code[:500]}")
        
        validation_result = self.validator.validate_artifact(
            json_data=self.test_data,
            artifact=generated_starlark_code,
            artifact_type="starlark"
        )
        self.assertTrue(validation_result.get("success"), msg=f"Starlark validation failed for valid data: {validation_result.get('message')} - {str(validation_result.get('details'))}")

        invalid_data_starlark = {
            "taskId": "", # Empty taskId
            "templateId": "TPL1",
            "data": {
                "top_image": [{"uid": "1", "url": "http://invalid.com/img.jpg", "name": "img1"}], # Invalid URL domain
                "bottom_image": [], # Empty array
                "full_outfit_image": [{"uid": "3", "url": "https://file.b18a.io/img.jpg", "name": None}] # Name is None
            }
        }
        validation_result_invalid = self.validator.validate_artifact(
            json_data=invalid_data_starlark,
            artifact=generated_starlark_code,
            artifact_type="starlark"
        )
        self.assertFalse(validation_result_invalid.get("success"), msg="Starlark validation succeeded for invalid data. Details: " + str(validation_result_invalid.get("details")))
        self.assertTrue(validation_result_invalid.get("details"), msg="Details for invalid Starlark validation were empty.")
        print(f"Invalid data validation details (Starlark): {validation_result_invalid.get('details')}")

if __name__ == '__main__':
    unittest.main()
