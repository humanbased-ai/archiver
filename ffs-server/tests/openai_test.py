from openai import OpenAI

def main() -> None:
    api_key = "<OPENAI_KEY_REDACTED>"
    base_url = "https://api.openai.com/v1"

    # client = OpenAI(api_key=api_key, base_url=base_url)
    client = OpenAI(api_key=api_key)

# gpt-4.1
# gpt-4.1-mini
# gpt-4.1-nano

    response = client.chat.completions.create(
        model="gpt-4.1-nano", messages=[
            {"role": "user", "content": "Explain disestablishmentarianism to a smart five year old."}
        ]
    )
    print(response.choices[0].message.content)

main()