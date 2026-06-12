# Codatta Social Media Publishing Backend

An internal web-based tool for the Codatta marketing team to compose, translate, and publish content simultaneously across multiple social media platforms from a single interface.

---

## Features

- **Multi-platform publishing** — Publish to Twitter/X, Telegram, and Discord simultaneously
- **AI translation** — English content is automatically translated to Chinese and Korean via DeepSeek API
- **Thread support** — Compose multi-card Twitter threads
- **Media support** — Upload and attach images and videos (up to 4 per card)
- **Scheduled publishing** — Schedule posts for a future time; executes automatically
- **Publish history** — View past posts, actual send times, and retry failed accounts
- **Live preview** — Preview how content will appear on each platform before publishing
- **Multi-account management** — Manage multiple accounts per platform, each with its own language tag (EN / ZH / KO)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, Uvicorn |
| Database | SQLite + aiosqlite |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Twitter API | Tweepy |
| Telegram / Discord | httpx |
| AI Translation | DeepSeek API (OpenAI-compatible) |

---

## Project Structure

```
├── app/
│   ├── main.py               # FastAPI app entry point
│   ├── config.py             # Environment variable settings
│   ├── database.py           # SQLite operations
│   ├── models/
│   │   └── schemas.py        # Pydantic models
│   ├── routers/
│   │   ├── accounts.py       # Account CRUD endpoints
│   │   ├── publish.py        # Publish endpoint
│   │   ├── history.py        # History & retry endpoints
│   │   └── upload.py         # Media upload endpoint
│   └── services/
│       ├── publisher.py      # Core publish logic (Twitter / Telegram / Discord)
│       └── translator.py     # DeepSeek translation service
├── frontend/
│   ├── index.html            # Single-page app shell
│   ├── app.js                # All frontend logic
│   └── style.css             # Styles
├── data/
│   ├── codatta.db            # SQLite database (auto-created)
│   └── uploads/              # Uploaded media files
├── requirements.txt
└── .env                      # API keys (not committed)
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/JasmineCodatta/Codatta-Social-Media-Publishing-Backend.git
cd Codatta-Social-Media-Publishing-Backend
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# DeepSeek API
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_MODEL=deepseek-chat

# Twitter/X
TWITTER_EN_API_KEY=
TWITTER_EN_API_SECRET=
TWITTER_EN_ACCESS_TOKEN=
TWITTER_EN_ACCESS_SECRET=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID_EN=

# Discord
DISCORD_WEBHOOK_URL_EN=
```

### 4. Create data directories

```bash
mkdir -p data/uploads
```

### 5. Start the server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Account Configuration

| Platform | Required Credentials |
|----------|---------------------|
| Twitter/X | API Key, API Secret, Access Token, Access Token Secret |
| Telegram | Bot Token, Chat ID, Topic ID (optional) |
| Discord | Webhook URL |

Each account is tagged with a language (`EN` / `ZH` / `KO`). Content is automatically translated before publishing to non-English accounts.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DEEPSEEK_API_KEY` | DeepSeek API key for translation |
| `DEEPSEEK_MODEL` | Model name (default: `deepseek-chat`) |
| `TWITTER_*_API_KEY` | Twitter Consumer Key |
| `TWITTER_*_API_SECRET` | Twitter Consumer Secret |
| `TWITTER_*_ACCESS_TOKEN` | Twitter Access Token |
| `TWITTER_*_ACCESS_SECRET` | Twitter Access Token Secret |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID_*` | Target chat or channel ID |
| `DISCORD_WEBHOOK_URL_*` | Discord channel webhook URL |
