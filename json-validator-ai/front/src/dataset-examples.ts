export interface DatasetExample {
  id: string;
  title: string;
  jsonData: string; // JSON string
}

export const datasetExamples: DatasetExample[] = [
  {
    id: 'food-data',
    title: 'Example Food Data',
    jsonData: JSON.stringify(
      {
        "taskId": "7528085182000103499",
        "templateId": "FOOD_TPL_000001",
        "data": {
          "images": [
            {
              "uid": "rc-upload-1747981686593-28",
              "url": "https://file.b18a.io/6156810753500102141_220828_.webp",
              "name": "u=1354488648,1434448537&fm=253&fmt=auto&app=138&f=JPEG.webp"
            }
          ],
          "food_description": "kinds of food"
        }
      },
      null,
      2
    ),
  },
  {
    id: 'outfit-data',
    title: 'Example Outfit Data',
    jsonData: JSON.stringify(
      {
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
      },
      null,
      2
    ),
  },
  {
    id: 'speech-data',
    title: 'Example Speech Data',
    jsonData: JSON.stringify(
      {
        "taskId": "7528449925900103576",
        "templateId": "SPEECH_TPL_000001",
        "data": {
          "language": "en",
          "speech_audio": [
            {
              "uid": "rc-upload-1747981686593-6",
              "url": "https://file.b18a.io/6156810753500102141_975192_.mp3",
              "name": "Enrollment_1.mp3"
            }
          ],
          "speech_text": "hello,hi"
        }
      },
      null,
      2
    ),
  },
  {
    id: 'nft-data',
    title: 'Example NFT Data',
    jsonData: JSON.stringify(
      {
        "taskId": "7528474065300103578",
        "templateId": "NFT_TPL_000001",
        "data": {
          "nft_image": [
            {
              "uid": "rc-upload-1747981686593-12",
              "url": "https://file.b18a.io/6156810753500102141_454361_.png",
              "name": "basic_text_to_image_dall-e-3_20250413_171002.png"
            }
          ],
          "nft_description": "a cat"
        }
      },
      null,
      2
    ),
  }
  // Add more dataset examples here
];
