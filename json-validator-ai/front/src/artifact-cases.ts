export interface ArtifactCase {
  id: string;
  title: string;
  description: string;
  exampleData: string; // JSON string
  artifactType: 'schema' | 'ai_prompt' | 'starlark';
}

export const artifactCases: ArtifactCase[] = [
  {
    id: 'food-schema',
    title: 'Food Item Schema Generation',
    description: `This data describes a food item annotation. It requires a 'taskId' and a 'templateId'; both must be non-empty strings (i.e., must contain at least one non-whitespace character).
    A 'data' object is also required. Inside 'data', there must be:
    1. 'images': a non-empty list (i.e., must contain at least one item) of image items. Each image item must have:
        - 'uid': a non-empty string (i.e., must contain at least one non-whitespace character).
        - 'url': a non-empty string, which must be a valid image URL starting with 'https://file.b18a.io/'.
        - 'name': a non-empty string (i.e., must contain at least one non-whitespace character).
    2. 'food_description': a non-empty string (i.e., must contain at least one non-whitespace character). Semantically, this description should be related to food; mentioning food-related nouns, adjectives, or verbs is generally sufficient. It should not consist of meaningless or randomly generated text.
    The 'data' object should not have any other fields besides 'images' and 'food_description'.
    The root object should not have any other fields besides 'taskId', 'templateId', and 'data'.`,
    exampleData: JSON.stringify([
      {
        "taskId": "7396488524100100859",
        "templateId": "FOOD_TPL_000001",
        "data": {
          "images": [
            {
              "uid": "rc-upload-1748305417416-6",
              "url": "https://file.b18a.io/6310651947700101546_733895_.webp",
              "name": "u=1354488648,1434448537&fm=253&fmt=auto&app=138&f=JPEG.webp"
            }
          ],
          "food_description": "kinds of food"
        }
      }
    ], null, 2),
    artifactType: 'schema',
  },
  {
    id: 'outfit-schema',
    title: 'Outfit Schema Generation',
    description: `This data describes an outfit. It needs a 'taskId' and a 'templateId'; both must be non-empty strings (i.e., must contain at least one non-whitespace character). There's a 'data' object, which is required. Inside 'data', we need 'top_image', 'bottom_image', and 'full_outfit_image'. Each of these must be a list of image items, and these lists cannot be empty (i.e., must contain at least one item). Each image item needs a 'uid', a 'url', and a 'name'; all of these must be non-empty strings (i.e., must contain at least one non-whitespace character). The 'url' must be a valid image URL starting with 'https://file.b18a.io/'. The 'data' object should not have any other fields besides the ones mentioned.`,
    exampleData: JSON.stringify([
      {
        "taskId": "7528465136400103577",
        "templateId": "OOTD_TPL_000001",
        "data": {
          "top_image": [
            {
              "uid": "uid1",
              "url": "https://file.b18a.io/top.jpg",
              "name": "top.jpg"
            }
          ],
          "bottom_image": [
            {
              "uid": "uid2",
              "url": "https://file.b18a.io/bottom.jpg",
              "name": "bottom.jpg"
            }
          ],
          "full_outfit_image": [
            {
              "uid": "uid3",
              "url": "https://file.b18a.io/full.jpg",
              "name": "full.jpg"
            }
          ]
        }
      }
    ], null, 2),
    artifactType: 'schema',
  },
  {
    id: 'speech-schema',
    title: 'Speech Annotation Schema Generation',
    description: `This data describes a speech annotation. It requires a 'taskId' and a 'templateId'; both must be non-empty strings (i.e., must contain at least one non-whitespace character).
    A 'data' object is also required. Inside 'data', there must be:
    1. 'language': a non-empty string (i.e., must contain at least one non-whitespace character) (e.g., 'zh', 'en').
    2. 'speech_audio': a non-empty list (i.e., must contain at least one item) of audio items. Each audio item must have:
        - 'uid': a non-empty string (i.e., must contain at least one non-whitespace character).
        - 'url': a non-empty string, which must be a valid audio URL starting with 'https://file.b18a.io/'.
        - 'name': a non-empty string (i.e., must contain at least one non-whitespace character).
    3. 'speech_text': a non-empty string (i.e., must contain at least one non-whitespace character). Semantically, the text must contain characters or words appropriate for the language specified in the 'language' field. It should not consist of meaningless or randomly generated content, unless it is solely digits (e.g., '12345'), which is considered valid for any language. Furthermore, the 'speech_text' must not contain any malicious, threatening, abusive, or inappropriate content.
    The 'data' object should not have any other fields besides 'language', 'speech_audio', and 'speech_text'.
    The root object should not have any other fields besides 'taskId', 'templateId', and 'data'.`,
    exampleData: JSON.stringify([
      {
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
    ], null, 2),
    artifactType: 'schema',
  },
  {
    id: 'nft-schema',
    title: 'NFT Schema Generation',
    description: `This data describes an NFT. It requires a 'taskId' and a 'templateId'; both must be non-empty strings (i.e., must contain at least one non-whitespace character).
A 'data' object is also required. Inside 'data', there must be an 'nft_image' field, which is a non-empty list (i.e., must contain at least one item) of image items.
Each image item must have a 'uid', a 'url', and a 'name', all of which must be non-empty strings (i.e., must contain at least one non-whitespace character).
The 'url' must be a valid image URL starting with 'https://file.b18a.io/'.
The 'data' object also requires an 'nft_description' field, which must be a non-empty string (i.e., must contain at least one non-whitespace character). Semantically, this description must be meaningful text, not randomly generated, and should at least represent a noun or a descriptive phrase.
The 'data' object must contain the field 'nft_image' AND the field 'nft_description'. These are the ONLY two fields allowed in the 'data' object; no other fields are permitted.`,
    exampleData: JSON.stringify([
      {
        'data': {
          'nft_image': [{
            'uid': 'rc-upload-1747898867660-2',
            'url': 'https://file.b18a.io/6334057568500102994_644067_.jpg',
            'name': '00014001700-e1.jpg'
          }],
          'nft_description': 'wewew'
        },
        'taskId': '7536764854000101321',
        'templateId': 'NFT_TPL_000001'
      }
    ], null, 2),
    artifactType: 'schema',
  }
];
