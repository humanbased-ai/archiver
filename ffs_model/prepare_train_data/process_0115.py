import csv
import json

# Specify the path to your CSV file
csv_file_path = '../data/raw_records/raw_request_result_0115.csv'
write_file_path = '../data/train_data_0115.jsonl'

train_data_list = []
# Open the CSV file for reading
with open(csv_file_path, mode='r', encoding='utf-8') as file:
    # Create a CSV reader object specifying the delimiter and quote character
    # Adjust these parameters if your data contains different delimiters or quote characters
    reader = csv.reader(file, delimiter=',', quotechar='"')

    # Skip the header row
    next(reader)

    # Iterate over each row in the CSV file
    for row in reader:
        image = row[0]
        request_content = row[1]
        tweet = row[2]

        # Parse the JSON content in 'request_content'
        try:
            request_content_data = json.loads(request_content)
            assistant_content = [{'role': 'assistant', 'content': tweet}]
            request_content_data.extend(assistant_content)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            request_content_data = []

        # Print the parsed data
        # print(f"Image URL: {image}")
        # print(f"Request Content (parsed JSON): {request_content_data}")
        # print(f"Tweet: {tweet}")
        print(request_content_data)
        print("-" * 80)  # Separator for readability

        train_data = {"messages": request_content_data}
        train_data_list.append(train_data)

# Open the output file to write JSON lines
with open(write_file_path, 'w', encoding='utf-8') as outfile:
    for data in train_data_list:
        # Convert dictionary to JSON string and write it to the file with a newline
        json_line = json.dumps(data, ensure_ascii=False)
        outfile.write(json_line + '\n')
