import json
from typing import List, Dict, Any
import os

# Ensure PYTHONPATH is set up to find 'src' or run from project root
# Example: export PYTHONPATH=$PYTHONPATH:/path/to/json-validator-ai
from src.omni_validator import OmniValidator

def main():
    """Main function to generate and print the Speech JSON schema."""

    # 1. Initialize the OmniValidator.
    # By default, if no llm_client is provided, it will use OpenAILLM with gpt-4o.
    validator = OmniValidator()

    # 2. Define parameters for artifact generation
    # Natural language description of the data structure and validation rules.
    description = """
This data describes a speech annotation, typically for training speech-to-text or other voice-based AI models. It includes audio and its corresponding transcription.

**I. Data Structure and Format Rules (for JSON Schema generation):**
1.  **Root Object:**
    a.  Required fields: 'taskId', 'templateId', 'data'.
    b.  No additional properties are allowed at the root level.
2.  **taskId:** Must be a non-empty string (unique identifier for the task).
3.  **templateId:** Must be a non-empty string (e.g., "SPEECH_TPL_000001").
4.  **data Object:**
    a.  Required fields: 'language', 'speech_audio', 'speech_text'.
    b.  No additional properties are allowed within the 'data' object.
5.  **language:** Must be a non-empty string representing the language code (e.g., 'en' for English, 'zh' for Chinese, 'es' for Spanish). Consider using standard ISO 639-1 codes.
6.  **speech_audio (Array):**
    a.  Must be a non-empty array of audio item objects. Typically contains one primary audio file.
    b.  Each item in the array must be an audio object.
7.  **Audio Object (within 'speech_audio' array):**
    a.  Required fields: 'uid', 'url', 'name'.
    b.  No additional properties are allowed within an audio object.
    c.  'uid': Must be a non-empty string (unique identifier for the audio file).
    d.  'url': Must be a non-empty string, a valid and accessible URL pointing to the actual audio file (e.g., MP3), and strictly match the pattern '^https://file\\.b18a\\.io/.*\\.mp3$'. (If other audio formats like .wav, .flac are allowed, update pattern).
    e.  'name': Must be a non-empty string (filename or descriptive name of the audio file).
8.  **speech_text:** Must be a non-empty string representing the transcription of the audio. It should have a minimum length of 5 characters to be meaningful.

**II. Semantic and Content Rules (for AI Prompt generation):**
1.  **Audio Quality:**
    a.  The 'speech_audio' must be clear and easily understandable.
    b.  Volume should be adequate (not too soft or too loud/clipped).
    c.  Minimal background noise; speech should be the primary sound.
    d.  No significant audio distortions or dropouts.
2.  **Speech Content:**
    a.  The audio must contain actual human speech relevant to the specified 'language'.
    b.  Speech should be reasonably fluent and natural (unless the task is specifically about disfluent speech).
3.  **Transcription Accuracy:**
    a.  The 'speech_text' must be an accurate, verbatim transcription of the spoken words in 'speech_audio'.
    b.  Punctuation should be appropriate if required by transcription guidelines (guidelines may need to be part of a more detailed task spec).
    c.  Non-speech sounds (e.g., [laughter], [cough]) should be handled according to specific project guidelines (assume verbatim text for now if not specified).
4.  **Language Consistency:** The 'language' field must correctly reflect the predominant language spoken in the 'speech_audio' and written in 'speech_text'.
5.  **Content Appropriateness:** Speech content should be appropriate for the intended application. Avoid offensive language, hate speech, or disclosure of sensitive private information unless explicitly permitted and handled by project guidelines.

**III. Validator's Output Format (for AI Prompt):**
The AI validator should be instructed to return a JSON object:
{'is_valid': <boolean>, 'reason': '<Detailed explanation of all checks, covering structural, audio quality, transcription accuracy, and content rules. If invalid, specify all reasons.'}
"""

    # Example data instance that the schema should validate.
    example_data = {
        "taskId": "7443101782700100986",
        "templateId": "SPEECH_TPL_000001",
        "data": {
            "language": "zh",
            "speech_audio": [
                {
                    "uid": "rc-upload-1748305417416-2",
                    "url": "https://file.b18a.io/6310651947700101546_158377_.mp3",
                    "name": "chinese.mp3"
                }
            ],
            "speech_text": "这是一段文本"
        }
    }
    # The generate_artifact method expects a list of example data dictionaries.
    example_data_list: List[Dict[str, Any]] = [example_data]

    # Specify the type of artifact to generate.
    artifact_type = "schema" # For JSON Schema

    # 4. Generate the artifact
    print("Generating '{}' artifact for Speech data using LLM: {}...".format(artifact_type, validator.llm_client.model_name))
    generation_result = validator.generate_artifact(
        description=description,
        example_data_list=example_data_list,
        artifact_type=artifact_type
    )

    print("Raw result dictionary:")
    print(json.dumps(generation_result, indent=2))

    if generation_result["success"] and generation_result["artifact"]:
        generated_schema_str = generation_result["artifact"]
        print("--- Generation Result ---")
        print("Success: {}".format(generation_result['success']))
        schema_for_printing = json.dumps(json.loads(generated_schema_str), indent=2)
        print("Generated Artifact (JSON Schema for Speech):\n{}".format(schema_for_printing))

        # 5. Validate invalid data against the generated schema
        print("--- Validating Invalid Speech Data ---")
        invalid_speech_data = {
            "taskId": "", # Invalid: empty taskId
            "templateId": "SPEECH_TPL_000001",
            "data": {
                "language": "zh",
                "speech_audio": [
                    {
                        "uid": "rc-upload-1748305417416-2",
                        "url": "http://invalid.url/audio.wav", # Invalid URL pattern, invalid extension
                        "name": "" # Invalid: empty name
                    }
                ],
                "speech_text": "这是一段文本",
                "extra_field": "unexpected" # Invalid: extra field in data
            },
            "another_extra_field": "unexpected" # Invalid: extra field in root
        }
        print("Attempting to validate the following invalid data:\n{}".format(json.dumps(invalid_speech_data, indent=2)))

        validation_result = validator.validate_artifact(
            json_data=invalid_speech_data,
            artifact=generated_schema_str, # Use the generated schema string
            artifact_type="schema"
        )

        print("Validation Result for Invalid Data:")
        print(json.dumps(validation_result, indent=2))

    else:
        print("--- Generation Result ---")
        print("Success: {}".format(generation_result['success']))
        print("Error: {}".format(generation_result['error']))

if __name__ == "__main__":
    main()
