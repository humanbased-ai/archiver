import json


def get_json_data(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()
