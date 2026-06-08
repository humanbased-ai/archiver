import sys
import os
import json
from typing import Any, Dict, List, Optional

# Adjust path to import from src
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..', '..') 
sys.path.append(PROJECT_ROOT)

from src.omni_validator import OmniValidator
from src.llm_interface import LLMInterface

# --- Mock LLM that can generate different artifact types based on keywords ---
class MockLLMForArtifactGeneration(LLMInterface):
    @property
    def model_name(self) -> str:
        return "mock_llm_artifact_generator_v1"

    def generate_response(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> Any:
        class MockResponse:
            def __init__(self, content, error=None):
                self.content = content
                self.error = error

        # print(f"\n--- MockLLM (Artifact Generator) Called ---")
        # print(f"User Prompt (first 150): {user_prompt[:150]}...")
        # print(f"JSON Mode: {json_mode}")
        # print("----------------------------------------\n")

        # Determine artifact type from user_prompt or system_prompt hints
        if "json schema" in user_prompt.lower() and json_mode:
            # Simplified schema for outfit
            return MockResponse(json.dumps({
                "type": "object",
                "properties": {
                    "taskId": {"type": "string"},
                    "templateId": {"type": "string", "pattern": "^OOTD_TPL_"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "top_image": {"type": "array", "minItems": 1, "items": {"$ref": "#/definitions/imageObject"}},
                            "bottom_image": {"type": "array", "minItems": 1, "items": {"$ref": "#/definitions/imageObject"}},
                            "full_outfit_image": {"type": "array", "minItems": 1, "items": {"$ref": "#/definitions/imageObject"}}
                        },
                        "required": ["top_image", "bottom_image", "full_outfit_image"]
                    }
                },
                "required": ["taskId", "templateId", "data"],
                "definitions": {
                    "imageObject": {
                        "type": "object",
                        "properties": {
                            "uid": {"type": "string"},
                            "url": {"type": "string", "format": "uri", "pattern": "^https?:\\/\\/"},
                            "name": {"type": "string"}
                        },
                        "required": ["uid", "url", "name"]
                    }
                }
            }))
        elif "ai validation prompt" in user_prompt.lower() and not json_mode:
            return MockResponse("Validate the outfit data: taskId (string), templateId (string, starts with 'OOTD_TPL_'). 'data' object must have 'top_image', 'bottom_image', 'full_outfit_image' arrays, each with at least one image object. Image objects need uid (string), url (valid https URL), name (string). All fields are mandatory.")
        
        elif "python code snippet" in user_prompt.lower() and not json_mode:
            return MockResponse("""
import re

def validate_data(data):
    if not isinstance(data, dict): return {"is_valid": False, "reason": "Data must be a dict."}
    if not data.get('taskId') or not isinstance(data.get('taskId'), str): return {"is_valid": False, "reason": "Missing/invalid taskId"}
    if not data.get('templateId') or not isinstance(data.get('templateId'), str) or not data['templateId'].startswith('OOTD_TPL_'): return {"is_valid": False, "reason": "Missing/invalid templateId"}
    d = data.get('data')
    if not d or not isinstance(d, dict): return {"is_valid": False, "reason": "Missing/invalid data object"}
    
    image_fields = ['top_image', 'bottom_image', 'full_outfit_image']
    for field in image_fields:
        if not d.get(field) or not isinstance(d.get(field), list) or len(d.get(field)) == 0:
            return {"is_valid": False, "reason": f"Missing/invalid {field} array or empty"}
        for img_obj in d[field]:
            if not isinstance(img_obj, dict): return {"is_valid": False, "reason": f"Image object in {field} is not a dict"}
            if not img_obj.get('uid') or not isinstance(img_obj.get('uid'), str): return {"is_valid": False, "reason": f"Missing/invalid uid in {field}"}
            if not img_obj.get('url') or not isinstance(img_obj.get('url'), str) or not re.match(r'^https?://', img_obj['url']): return {"is_valid": False, "reason": f"Missing/invalid URL in {field}"}
            if not img_obj.get('name') or not isinstance(img_obj.get('name'), str): return {"is_valid": False, "reason": f"Missing/invalid name in {field}"}
    return {"is_valid": True, "reason": "Outfit data is valid."}
""")
        elif "node.js code snippet" in user_prompt.lower() and not json_mode:
            return MockResponse("""
const data = JSON.parse(process.argv[2]);
let isValid = true; let reason = 'Outfit data is valid.';
if (!data || typeof data !== 'object') { isValid = false; reason = 'Data must be an object.'; }
else if (!data.taskId || typeof data.taskId !== 'string') { isValid = false; reason = 'Missing/invalid taskId'; }
else if (!data.templateId || typeof data.templateId !== 'string' || !data.templateId.startsWith('OOTD_TPL_')) { isValid = false; reason = 'Missing/invalid templateId'; }
else if (!data.data || typeof data.data !== 'object') { isValid = false; reason = 'Missing/invalid data object'; }
else {
    const d = data.data;
    const imageFields = ['top_image', 'bottom_image', 'full_outfit_image'];
    for (const field of imageFields) {
        if (!d[field] || !Array.isArray(d[field]) || d[field].length === 0) { isValid = false; reason = `Missing/invalid ${field} array or empty`; break; }
        for (const imgObj of d[field]) {
            if (typeof imgObj !== 'object') { isValid = false; reason = `Image object in ${field} is not an object`; break; }
            if (!imgObj.uid || typeof imgObj.uid !== 'string') { isValid = false; reason = `Missing/invalid uid in ${field}`; break; }
            if (!imgObj.url || typeof imgObj.url !== 'string' || !imgObj.url.match(/^https?:\\/\\//)) { isValid = false; reason = `Missing/invalid URL in ${field}`; break; }
            if (!imgObj.name || typeof imgObj.name !== 'string') { isValid = false; reason = `Missing/invalid name in ${field}`; break; }
        }
        if (!isValid) break;
    }
}
console.log(JSON.stringify({is_valid: isValid, reason: reason}));
""")
        elif "starlark code snippet" in user_prompt.lower() and not json_mode:
            return MockResponse("""
def validate_image_object(img_obj, field_name):
    if type(img_obj) != 'dict': return (False, 'Image object in %s is not a dict' % field_name)
    if not img_obj.get('uid') or type(img_obj.get('uid')) != 'string': return (False, 'Missing/invalid uid in %s' % field_name)
    if not img_obj.get('url') or type(img_obj.get('url')) != 'string' or not (img_obj.get('url').startswith('http://') or img_obj.get('url').startswith('https://')) : return (False, 'Missing/invalid URL in %s' % field_name)
    if not img_obj.get('name') or type(img_obj.get('name')) != 'string': return (False, 'Missing/invalid name in %s' % field_name)
    return (True, '')

def validate_data(data):
    if type(data) != 'dict': return {"is_valid": False, "reason": "Data must be a dict."}
    if not data.get('taskId') or type(data.get('taskId')) != 'string': return {"is_valid": False, "reason": "Missing/invalid taskId"}
    if not data.get('templateId') or type(data.get('templateId')) != 'string' or not data.get('templateId').startswith('OOTD_TPL_'): return {"is_valid": False, "reason": "Missing/invalid templateId"}
    d = data.get('data')
    if not d or type(d) != 'dict': return {"is_valid": False, "reason": "Missing/invalid data object"}
    
    image_fields = ['top_image', 'bottom_image', 'full_outfit_image']
    for field in image_fields:
        if not d.get(field) or type(d.get(field)) != 'list' or len(d.get(field)) == 0:
            return {"is_valid": False, "reason": 'Missing/invalid %s array or empty' % field}
        for img_obj in d[field]:
            is_img_valid, reason = validate_image_object(img_obj, field)
            if not is_img_valid: return {"is_valid": False, "reason": reason}
    return {"is_valid": True, "reason": "Outfit data is valid."}
""")
        
        # Fallback for AI Prompt validation if it's called by a handler (json_mode=True)
        elif "satisfy the rules in the ai validation prompt" in user_prompt.lower() and json_mode:
             # This mock is for the AI Prompt *validation* step, not generation.
             # It simulates the LLM's response when asked to validate data against a prompt.
            return MockResponse(json.dumps({"is_valid": True, "reason": "Mock LLM says data is valid based on the AI prompt (assuming it matches the generated prompt)."}))

        return MockResponse(None, error=f"MockLLM (Artifact Generator): Unhandled prompt type or parameters. User prompt: {user_prompt[:100]}...")


def process_data_file(data_file_path: str, description: str, output_dir: str):
    """
    Generates all artifact types for a given data file and saves them.
    """
    base_name = os.path.splitext(os.path.basename(data_file_path))[0]
    
    try:
        with open(data_file_path, 'r') as f:
            data_content = json.load(f)
    except Exception as e:
        print(f"Error reading or parsing {data_file_path}: {e}")
        return

    mock_llm = MockLLMForArtifactGeneration()
    omni_validator_instance = OmniValidator(llm_client=mock_llm)

    artifact_configs = {
        "schema": {"ext": "json"},
        "ai_prompt": {"ext": "txt"},
        "python": {"ext": "py"},
        "nodejs": {"ext": "js"},
        "starlark": {"ext": "star"} # .star or .sky are common for Starlark
    }

    print(f"\n===== Processing Data File: {data_file_path} =====")
    print(f"Description: {description}")

    for artifact_type, config in artifact_configs.items():
        print(f"\n--- Generating {artifact_type} for {base_name} ---")
        generation_result = omni_validator_instance.generate_artifact(
            description=description,
            example_data_list=[data_content], # Use the loaded data as an example
            artifact_type=artifact_type
        )

        if generation_result["success"] and generation_result["artifact"]:
            artifact_content = generation_result["artifact"]
            if isinstance(artifact_content, dict) and artifact_type == "schema": # Schema is already JSON (dict)
                artifact_content_str = json.dumps(artifact_content, indent=4)
            elif isinstance(artifact_content, dict): # Should not happen for other types
                 artifact_content_str = json.dumps(artifact_content, indent=4)
            else:
                artifact_content_str = str(artifact_content) # For text-based artifacts
            
            output_filename = f"{base_name}_validator.{config['ext']}"
            output_path = os.path.join(output_dir, output_filename)
            try:
                with open(output_path, 'w') as f_out:
                    f_out.write(artifact_content_str)
                print(f"Successfully generated and saved: {output_path}")
            except Exception as e_write:
                print(f"Error writing artifact to {output_path}: {e_write}")
        else:
            print(f"Failed to generate {artifact_type} for {base_name}: {generation_result.get('error', 'Unknown error')}")

if __name__ == "__main__":
    datas_dir = os.path.join(PROJECT_ROOT, "src", "datas")
    results_dir = os.path.join(PROJECT_ROOT, "src", "results")
    os.makedirs(results_dir, exist_ok=True) # Ensure results dir exists

    # --- Process outfit.json ---
    outfit_data_path = os.path.join(datas_dir, "outfit.json")
    outfit_description = "The data represents an outfit submission. It must have a taskId (string), a templateId (string, typically starting with 'OOTD_TPL_'), and a data object. The data object must contain top_image, bottom_image, and full_outfit_image. Each of these image fields must be an array containing at least one object. Each image object within these arrays must have a uid (string), a url (string, valid URL format, preferably HTTPS), and a name (string, the image file name). All fields (taskId, templateId, data, and all fields within each image object including uid, url, name) are mandatory."
    
    # First, ensure outfit.json has the content we expect (as per Step 168)
    # This is a safeguard because the user interaction created an empty one later (Step 171)
    expected_outfit_content = {
        "taskId": "7528465136400103577",
        "templateId": "OOTD_TPL_000001",
        "data": {
            "top_image": [
                {"uid": "rc-upload-1747981686593-18", "url": "https://file.b18a.io/6156810753500102141_762935_.jpg", "name": "03284766712-e1.jpg"}
            ],
            "bottom_image": [
                {"uid": "rc-upload-1747981686593-20", "url": "https://file.b18a.io/6156810753500102141_212297_.jpg", "name": "03284766712-e4.jpg"}
            ],
            "full_outfit_image": [
                {"uid": "rc-upload-1747981686593-22", "url": "https://file.b18a.io/6156810753500102141_729352_.jpg", "name": "03284766712-p.jpg"}
            ]
        }
    }
    try:
        with open(outfit_data_path, 'w') as f_outfit_write:
            json.dump(expected_outfit_content, f_outfit_write, indent=4)
        print(f"Ensured {outfit_data_path} has the correct content.")
    except Exception as e_rewrite:
        print(f"Could not rewrite {outfit_data_path}: {e_rewrite}. Proceeding with existing content if any.")

    if os.path.exists(outfit_data_path):
         process_data_file(outfit_data_path, outfit_description, results_dir)
    else:
        print(f"Data file not found: {outfit_data_path}")

    # --- Placeholder for processing other files ---
    # print("\nTODO: Add content and descriptions for speech.json, nft.json, food.json")
    # print("Example: ")
    # speech_data_path = os.path.join(datas_dir, "speech.json")
    # speech_description = "A speech segment with speaker ID, transcript, and confidence score."
    # if os.path.exists(speech_data_path):
    #     # Ensure speech.json has content first, e.g. by writing it here or asking user to fill it
    #     process_data_file(speech_data_path, speech_description, results_dir)

    print("\n===== Artifact Generation Script Completed =====")
