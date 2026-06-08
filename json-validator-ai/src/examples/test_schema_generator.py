# run_examples.py
import json
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.llm_interface import OpenAILLM # 使用正确的导入路径
from src.omni_validator import OmniValidator

def run_all_examples():
    print("🚀 Testing JSON Schema Generation from Natural Language 🚀")

    try:
        openai_llm = OpenAILLM(model="gpt-4o")
    except ValueError as e:
        print(f"🚨 {e}")
        print("Please ensure your OPENAI_API_KEY environment variable is set.")
        return
    except Exception as e:
        print(f"🚨 Failed to initialize LLM client: {e}")
        return

    generator = OmniValidator(llm_client=openai_llm)

    # --- Example 1: Robotics Task Data (single example for consistency) ---
    print(f"\n--- Example 1: Robotics Task Data (single example data) ---")
    robotics_description_single = """
    This schema is for a robotics task.
    It includes a 'taskId' and a 'templateId', both strings.
    The 'data' field is an array of objects, each object representing a step with 'start', 'end' (integers), and 'des' (string).
    All fields ('taskId', 'templateId', 'data', and fields within data objects) are required.
    'start' should always be less than 'end'.
    """
    robotics_example_data_single = [{ # Note: example_data_list expects a list of dicts
        "taskId": "6459383092800101959",
        "templateId": "ROBOTICS_TPL_000001",
        "data": [
            { "start": 1, "end": 19, "des": "move to grap the cup" },
            { "start": 20, "end": 32, "des": "holde the cup and move it to the aux" }
        ]
    }]
    result_robotics_single = generator.generate_artifact(
        description=robotics_description_single,
        example_data_list=robotics_example_data_single
    )
    if result_robotics_single["success"]:
        schema_robotics_single = result_robotics_single["schema"]
        print("Generated JSON Schema for Robotics Task (Single Example):")
        print(json.dumps(schema_robotics_single, indent=2, ensure_ascii=False))
    else:
        print(f"Failed to generate schema for robotics task (single example): {result_robotics_single['error']}")


    # --- Example 2: Event Data (with multiple example data snippets) ---
    print(f"\n--- Example 2: Event Data (multiple example data snippets) ---")
    event_description = """
    Schema for an event.
    All events have a required 'eventId' (string) and a 'eventName' (string).
    Events can be either physical or virtual.
    Physical events have a 'location' object with 'address' (string) and 'city' (string).
    Virtual events have a 'meetingUrl' (string, URL format).
    An event might also have an optional 'organizerEmail' (string, email format) and
    an optional 'maxAttendees' (integer, positive).
    The 'type' field (string) should indicate if it's "physical" or "virtual".
    """
    event_example_data_list = [
        { # Physical event example
            "eventId": "EVT1001",
            "eventName": "Tech Conference 2025",
            "type": "physical",
            "location": {
                "address": "123 Main St",
                "city": "San Francisco"
            },
            "organizerEmail": "events@techconf.com",
            "maxAttendees": 500
        },
        { # Virtual event example
            "eventId": "EVT1002",
            "eventName": "Webinar on AI",
            "type": "virtual",
            "meetingUrl": "https://zoom.us/j/1234567890",
            "maxAttendees": 1000
        },
        { # Another physical event, some optional fields missing
            "eventId": "EVT1003",
            "eventName": "Local Meetup",
            "type": "physical",
            "location": {
                "address": "Community Hall",
                "city": "Oakland"
            }
            # organizerEmail and maxAttendees are missing here, implying they are optional
        },
        { # Virtual event with organizer
            "eventId": "EVT1004",
            "eventName": "Online Workshop",
            "type": "virtual",
            "meetingUrl": "https://teams.microsoft.com/m/123",
            "organizerEmail": "workshop@example.com"
        }
    ]
    result_event = generator.generate_artifact(
        description=event_description,
        example_data_list=event_example_data_list
    )
    if result_event["success"]:
        schema_event = result_event["schema"]
        print("Generated JSON Schema for Event Data (Multiple Examples):")
        print(json.dumps(schema_event, indent=2, ensure_ascii=False))
        # You would expect this schema to potentially use oneOf/anyOf for location/meetingUrl
        # and correctly identify optional fields based on their presence across examples.
    else:
        print(f"Failed to generate schema for event data: {result_event['error']}")

    # --- Example 3: Product with varying optional fields ---
    print(f"\n--- Example 3: Product with varying optional fields ---")
    product_description_varying = """
    A product schema. 'id' and 'name' are required strings.
    'price' is a required number.
    Products may have 'color' (string), 'size' (string from S, M, L, XL), or 'weight' (number, in kg).
    Not all products will have all these optional attributes.
    There might also be 'manufacturing_details' object, itself optional,
    containing 'country' (string) and 'year' (integer).
    """
    product_examples_varying = [
        {
            "id": "P100", "name": "T-Shirt", "price": 19.99,
            "color": "Blue", "size": "M"
        },
        {
            "id": "P101", "name": "Laptop Stand", "price": 45.50,
            "weight": 1.2,
            "manufacturing_details": {"country": "CN", "year": 2024}
        },
        {
            "id": "P102", "name": "Coffee Mug", "price": 12.00,
            "color": "White"
            # No size, no weight, no manufacturing_details
        },
        {
            "id": "P103", "name": "Hiking Boots", "price": 120.00,
            "size": "L", "weight": 0.8,
             "manufacturing_details": {"country": "VN"} # Year is optional within manufacturing_details
        }
    ]
    result_product_varying = generator.generate_artifact(
        description=product_description_varying,
        example_data_list=product_examples_varying
    )
    if result_product_varying["success"]:
        schema_product_varying = result_product_varying["schema"]
        print("Generated JSON Schema for Product (Varying Optional Fields):")
        print(json.dumps(schema_product_varying, indent=2, ensure_ascii=False))
    else:
        print(f"Failed to generate schema for product with varying fields: {result_product_varying['error']}")


if __name__ == "__main__":
    # If you use a .env file for environment variables like OPENAI_API_KEY:
    # from dotenv import load_dotenv
    # load_dotenv()
    # print("Attempted to load .env file.")

    run_all_examples()