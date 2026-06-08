from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import json # Added for composite artifact
import os

# Ensure src is in the Python path. If running server.py from project root,
# Python usually adds the script's directory to sys.path.
# If OmniValidator is not found, you might need to set PYTHONPATH='.'
# or ensure your virtual environment is structured correctly.
from src.omni_validator import OmniValidator

# Load environment variables (e.g., OPENAI_API_KEY)
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes, allowing requests from any origin.
# For production, you might want to restrict this to your frontend's domain.
CORS(app)

# Initialize OmniValidator
# This will use its default LLM if OPENAI_API_KEY is found in .env
omni_validator = OmniValidator()

@app.route('/api/generate_artifact', methods=['POST'])
def generate_artifact_route():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Invalid JSON payload"}), 400

        description = data.get('description')
        example_data_list = data.get('example_data_list') # Directly use the parsed list
        artifact_type = data.get('artifact_type')

        if not all([description is not None, example_data_list is not None, artifact_type is not None]):
            return jsonify({"success": False, "error": "Missing required parameters: description, example_data_list, or artifact_type"}), 400

        # Validate if example_data_list is actually a list (it should be if JSON was correct)
        if not isinstance(example_data_list, list):
            return jsonify({"success": False, "error": "Invalid format for example_data_list: Expected a list."}), 400

        # Call OmniValidator's method
        result = omni_validator.generate_artifact(
            description=description,
            example_data_list=example_data_list,
            artifact_type=artifact_type
        )
        # The result from omni_validator is expected to be:
        # {"success": bool, "artifact": Optional[str], "error": Optional[str]}
        print('artifact', result)
        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Error in /api/generate_artifact: {e}", exc_info=True)
        return jsonify({"success": False, "error": "An unexpected error occurred on the server."}), 500

@app.route('/api/validate_artifact', methods=['POST'])
def validate_artifact_route():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "Invalid JSON payload", "details": []}), 400

        json_data_to_validate = data.get('json_data') # Directly use the parsed dict/list
        artifact_to_validate_against = data.get('artifact') # This is the artifact string

        if not all([json_data_to_validate is not None, artifact_to_validate_against is not None]):
            return jsonify({"success": False, "message": "Missing required parameters: json_data or artifact", "details": []}), 400

        # No need for json.loads here, request.get_json() already parsed it.
        # Basic type validation can be added if necessary, e.g., check if it's a dict or list as expected.

        # Call OmniValidator's method
        result = omni_validator.validate_artifact(
            json_data=json_data_to_validate,
            artifact=artifact_to_validate_against,
            use_ai=True
        )
        # The result from omni_validator is expected to be:
        # {"success": bool, "validation_type": str, "message": str, "details": List[str]}
        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Error in /api/validate_artifact: {e}", exc_info=True)
        return jsonify({"success": False, "message": "An unexpected error occurred on the server.", "details": []}), 500

if __name__ == '__main__':
    # Runs the Flask development server.
    # For production, use a proper WSGI server like Gunicorn or uWSGI.
    # Debug mode should be False in production.
    # Running on port 5001 to avoid conflict with Vite's default ports.
    app.run(debug=True, port=5001, host='0.0.0.0')
