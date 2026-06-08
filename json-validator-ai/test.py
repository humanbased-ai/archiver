import json

# 1. Original Python dictionary
# original_data_dictionary = {
#   "basic": {
#     "$schema": "https://json-schema.org/draft/2020-12/schema",
#     "type": "object",
#     "properties": {
#       "taskId": {
#         "type": "string",
#         "minLength": 1,
#         "pattern": "\\S",
#         "description": "A non-empty string that uniquely identifies the task."
#       },
#       "templateId": {
#         "type": "string",
#         "minLength": 1,
#         "pattern": "\\S",
#         "description": "A non-empty string that uniquely identifies the template."
#       },
#       "data": {
#         "type": "object",
#         "properties": {
#           "images": {
#             "type": "array",
#             "minItems": 1,
#             "items": {
#               "type": "object",
#               "properties": {
#                 "uid": {
#                   "type": "string",
#                   "minLength": 1,
#                   "pattern": "\\S",
#                   "description": "A non-empty string that uniquely identifies the image."
#                 },
#                 "url": {
#                   "type": "string",
#                   "minLength": 1,
#                   "pattern": "^https://file\\.b18a\\.io/.+\\.(bmp|jpg|jpeg|png|tif|tiff|gif|pcx|tga|exif|fpx|svg|psd|cdr|pcd|dxf|ufo|eps|ai|raw|wmf|webp|avif|apng)$",
#                   "description": "A non-empty string that is a valid URL starting with 'https://file.b18a.io/' and ending with a valid image extension."
#                 },
#                 "name": {
#                   "type": "string",
#                   "minLength": 1,
#                   "pattern": "\\S",
#                   "description": "A non-empty string that represents the name of the image."
#                 }
#               },
#               "required": [
#                 "uid",
#                 "url",
#                 "name"
#               ],
#               "additionalProperties": false
#             },
#             "description": "A non-empty list of image items."
#           },
#           "food_description": {
#             "type": "string",
#             "minLength": 1,
#             "pattern": "\\S",
#             "description": "A non-empty string relevant to food, not consisting of meaningless or randomly generated text."
#           }
#         },
#         "required": [
#           "images",
#           "food_description"
#         ],
#         "additionalProperties": false
#       }
#     },
#     "required": [
#       "taskId",
#       "templateId",
#       "data"
#     ],
#     "additionalProperties": false
#   },
#   "ai": "Validate the 'food_description' field to ensure it is semantically relevant to food and does not consist of meaningless or randomly generated text. The validation should focus on ensuring the content is coherent and contextually appropriate for describing food. Output only JSON: {\"is_valid\": true/false, \"reason\": \"concise, actionable explanation based ONLY on the rules in this prompt\"}.",
#   "basic_artifact_type": "schema",
#   "needs_further_ai_validation": true
# }

# # 2. Convert the dictionary to a JSON string
# generated_json_string = json.dumps(original_data_dictionary, indent=2, ensure_ascii=False)
generated_json_string = """
{
  "basic": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "taskId": {
        "type": "string",
        "minLength": 1,
        "pattern": "\\S",
        "description": "A non-empty string that uniquely identifies the task."
      },
      "templateId": {
        "type": "string",
        "minLength": 1,
        "pattern": "\\S",
        "description": "A non-empty string that uniquely identifies the template."
      },
      "data": {
        "type": "object",
        "properties": {
          "images": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "properties": {
                "uid": {
                  "type": "string",
                  "minLength": 1,
                  "pattern": "\\S",
                  "description": "A non-empty string that uniquely identifies the image."
                },
                "url": {
                  "type": "string",
                  "minLength": 1,
                  "pattern": "^https://file\\.b18a\\.io/.+\\.(bmp|jpg|jpeg|png|tif|tiff|gif|pcx|tga|exif|fpx|svg|psd|cdr|pcd|dxf|ufo|eps|ai|raw|wmf|webp|avif|apng)$",
                  "description": "A non-empty string that is a valid URL starting with 'https://file.b18a.io/' and ending with a valid image extension."
                },
                "name": {
                  "type": "string",
                  "minLength": 1,
                  "pattern": "\\S",
                  "description": "A non-empty string that represents the name of the image."
                }
              },
              "required": [
                "uid",
                "url",
                "name"
              ],
              "additionalProperties": false
            },
            "description": "A non-empty list of image items."
          },
          "food_description": {
            "type": "string",
            "minLength": 1,
            "pattern": "\\S",
            "description": "A non-empty string relevant to food, not consisting of meaningless or randomly generated text."
          }
        },
        "required": [
          "images",
          "food_description"
        ],
        "additionalProperties": false
      }
    },
    "required": [
      "taskId",
      "templateId",
      "data"
    ],
    "additionalProperties": false
  },
  "ai": "Validate the 'food_description' field to ensure it is semantically relevant to food and does not consist of meaningless or randomly generated text. The validation should focus on ensuring the content is coherent and contextually appropriate for describing food. Output only JSON: {\"is_valid\": true/false, \"reason\": \"concise, actionable explanation based ONLY on the rules in this prompt\"}.",
  "basic_artifact_type": "schema",
  "needs_further_ai_validation": true
}"""

# 3. Print the generated JSON string
print("---- Generated JSON String ----")
print(generated_json_string)
print("---- End of Generated JSON String ----\n")

# 4. Parse the JSON string back into a Python dictionary
print("---- Parsing the Generated JSON String back to a Python Object ----")
try:
    parsed_python_dictionary = json.loads(generated_json_string)
    print("Successfully parsed the JSON string.")

    # 5. Print the parsed Python dictionary (formatted nicely)
    print("\n---- Parsed Python Dictionary (Printed for Verification) ----")
    # Using json.dumps to pretty-print the dictionary, similar to the JSON string format
    print(json.dumps(parsed_python_dictionary, indent=2, ensure_ascii=False))
    # If you want to see the raw Python dictionary print output, you could use:
    # print(parsed_python_dictionary)
    print("---- End of Parsed Python Dictionary ----\n")

    # Optional: Verify if the original and parsed dictionaries are the same
    if original_data_dictionary == parsed_python_dictionary:
        print("Verification: The original Python dictionary and the parsed Python dictionary are identical.")
    else:
        print("Verification: The original Python dictionary and the parsed Python dictionary are NOT identical.")

except json.JSONDecodeError as e:
    print(f"Error decoding the JSON string: {e}")
