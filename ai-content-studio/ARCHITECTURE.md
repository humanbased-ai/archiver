# Architecture Overview

## System Design

AI Content Studio is built as a **modular collection of Claude Skills** that can work independently or together. Each Skill is self-contained with its own code, documentation, and configuration.

## Core Principles

1. **Modularity** - Each Skill is independent and reusable
2. **Claude Skills Native** - Follows official Claude Skills standards
3. **Progressive Disclosure** - Simple interfaces, detailed docs available
4. **Zero Lock-in** - Use one Skill or all Skills, no forced dependencies

## Skill Architecture

```
skills/
├── milady-meme-generator/       # Image generation (local)
├── ai-image-effects/            # AI transformations (Replicate API)
├── twitter-content-ai/          # Content generation (Claude API)
├── lark-bot-integration/        # Bot deployment (Lark API)
├── social-monitoring/           # Twitter monitoring (Twitter API)
└── data-training-manager/       # Training data QA (local)
```

Each Skill contains:
- `SKILL.md` - Main documentation with frontmatter
- `src/` - Python source code
- `config/` - Configuration files (optional)
- `scripts/` - Utility scripts (optional)
- Reference docs (optional)

## Data Flow

### 1. Meme Generation Flow

```
User Request
    ↓
Milady Meme Generator (local)
    ├→ Load NFT image
    ├→ Parse layers from prompt
    ├→ Compose with accessories
    └→ Add text overlay
    ↓
Optional: AI Effects
    ├→ SAM detection (if replacing)
    ├→ FLUX Fill Pro replacement
    └→ Illusion Diffusion effect
    ↓
Output: PNG image
```

### 2. Twitter Content Flow

```
Content Request
    ↓
Twitter Content AI
    ├→ Select content type (GM/insight/casual/reply)
    ├→ Load training samples
    ├→ Check freshness (avoid repetition)
    └→ Generate with Claude API
    ↓
Data Training Manager
    ├→ Track generated content
    ├→ Monitor freshness score
    └→ Learn from engagement
    ↓
Output: Tweet text
```

### 3. Social Monitoring Flow

```
Scheduled Check (every 5 min)
    ↓
Social Monitoring
    ├→ Check @mentions
    ├→ Monitor must-interact accounts
    ├→ Find high-priority opportunities
    └→ Calculate priority scores
    ↓
Filter: Priority > 70
    ↓
Twitter Content AI
    ├→ Generate contextual reply
    └→ Ensure freshness
    ↓
Optional: Manual approval (Lark Bot)
    ↓
Post to Twitter
```

### 4. Lark Bot Flow

```
User sends message in Lark
    ↓
Lark API → Webhook → Flask Server
    ↓
Lark Bot Integration
    ├→ Parse command (/milady, /milady_replace, etc.)
    ├→ Validate parameters
    └→ Route to appropriate Skill
    ↓
Skill Execution
    ├→ Milady Meme Generator (for /milady)
    ├→ AI Image Effects (for /milady_replace)
    └→ Twitter Content AI (for /tweet)
    ↓
Upload result to Lark
    ↓
User sees image/text in chat
```

## Integration Points

### Claude Skills Auto-Selection

When using Claude Code, Skills are automatically triggered based on:

1. **Description matching** - Keywords in Skill `description`
2. **User intent** - Natural language understanding
3. **Context** - Previous conversation history

Example:
```
User: "Create a Milady meme with a cowboy hat"
→ Auto-selects: milady-meme-generator

User: "Make the hat blue using AI"
→ Auto-selects: ai-image-effects

User: "Generate a GM tweet for this"
→ Auto-selects: twitter-content-ai
```

### Manual Integration

Skills can also be imported and used directly:

```python
# Import Skills
from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2
from skills.ai_image_effects.src.flux_fill_pro import FluxFillPro
from skills.twitter_content_ai.src.content_generator import ContentGenerator

# Use together
meme_gen = MemeGeneratorV2()
flux = FluxFillPro()
content_gen = ContentGenerator()

# Create workflow
image = meme_gen.generate_meme(nft_id=5050)
enhanced = flux.replace_accessory(image, "hat", "cowboy hat")
tweet = content_gen.generate_with_image(enhanced)
```

## Technology Stack

### Core Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Image Processing** | Pillow (PIL) | NFT composition, layering |
| **AI Effects** | Replicate API | FLUX, SAM, Illusion models |
| **Content Generation** | Claude API | Tweet generation |
| **Social Monitoring** | Twitter API v2 | Account tracking, mentions |
| **Bot Framework** | Flask | Webhook server |
| **Bot Platform** | Lark (Feishu) API | Team collaboration |

### Dependencies

```
Core (required for any Skill):
- Python 3.9+
- pillow
- requests

AI Effects:
- replicate

Twitter Content:
- anthropic (Claude API)

Social Monitoring:
- tweepy or requests (Twitter API)

Lark Bot:
- flask
- lark-oapi (optional, can use requests)

Training Manager:
- scikit-learn (for similarity)
- numpy
```

## Scalability

### Horizontal Scaling

Each Skill can scale independently:

```
Meme Generation (CPU-bound)
→ Run multiple worker processes
→ Distribute via task queue (Celery)

AI Effects (API-bound)
→ Batch requests
→ Parallel API calls
→ Cache SAM results (7-day TTL)

Twitter Monitoring (I/O-bound)
→ Async requests
→ Rate limit handling
→ Distributed checks

Content Generation (API-bound)
→ Request batching
→ Response caching
→ Prompt optimization
```

### Vertical Scaling

**Lark Bot Server:**
- Single instance: 100-500 req/sec
- With Redis cache: 1000+ req/sec
- Horizontal: Load balancer + multiple instances

**Cost Optimization:**
- SAM detection caching saves 50-70%
- Template-based generation vs Claude API
- Batch Replicate requests

## Security

### API Key Management

```bash
# Environment variables (recommended)
export REPLICATE_API_TOKEN="r8_..."
export ANTHROPIC_API_KEY="sk-ant-..."
export TWITTER_BEARER_TOKEN="..."
export LARK_APP_SECRET="..."
```

### Webhook Security

```python
# Lark webhook verification
def verify_lark_request(request):
    signature = request.headers.get('X-Lark-Signature')
    timestamp = request.headers.get('X-Lark-Request-Timestamp')

    # Verify signature
    expected = calculate_signature(timestamp, app_secret)
    return signature == expected
```

### Rate Limiting

```python
# Per-user rate limits (Lark Bot)
@limiter.limit("10 per minute")
def handle_command(user_id, command):
    ...

# Global rate limits (Twitter API)
def check_rate_limit():
    if requests_this_hour > 500:
        wait_until_reset()
```

## Monitoring & Observability

### Logging

```python
# Structured logging
import logging

logger = logging.getLogger(__name__)

logger.info("Meme generated", extra={
    "nft_id": 5050,
    "layers": 3,
    "time_ms": 150
})

logger.error("API failed", extra={
    "service": "replicate",
    "model": "flux-fill-pro",
    "error": str(e)
})
```

### Metrics

Track:
- Memes generated per hour
- AI effects usage and cost
- Content freshness scores
- Twitter interactions per day
- API latencies
- Error rates

### Health Checks

```python
# /health endpoint
@app.route('/health')
def health():
    return {
        "status": "healthy",
        "skills": {
            "meme_generator": check_nft_assets(),
            "ai_effects": check_replicate_api(),
            "twitter_content": check_claude_api(),
            "social_monitor": check_twitter_api()
        }
    }
```

## Deployment Options

### 1. Local Development

```bash
# Run individual Skills
cd skills/milady-meme-generator
python src/meme_generator_v2.py

# Run Lark Bot locally
python webhook_server.py
# + ngrok for webhook URL
```

### 2. Cloud Deployment

**Option A: Single VPS (simple)**
```bash
# Deploy to VPS (DigitalOcean, Linode, etc.)
ssh user@your-server
git clone your-repo
pip install -r requirements.txt
nohup python webhook_server.py &
```

**Option B: Docker (recommended)**
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "webhook_server.py"]
```

**Option C: Serverless (cost-effective)**
- AWS Lambda for webhook endpoints
- Cloud Functions for scheduled tasks
- S3 for asset storage

### 3. Production Setup

```
Load Balancer (nginx)
    ↓
Webhook Server (Flask)
    ├→ Gunicorn (4 workers)
    ├→ Redis (caching)
    └→ PostgreSQL (logs)
    ↓
Background Workers (Celery)
    ├→ Meme generation queue
    ├→ AI effects queue
    └→ Content generation queue
    ↓
External Services
    ├→ Replicate API
    ├→ Claude API
    ├→ Twitter API
    └→ Lark API
```

## Error Handling

### Graceful Degradation

```python
# If AI effects fail, fall back to local generation
try:
    result = flux.replace_accessory(image, "hat", "cowboy hat")
except ReplicateAPIError:
    logger.warning("FLUX failed, using local layers")
    result = local_layer_replacement(image, "hat", "cowboy")
```

### Retry Logic

```python
# Retry with exponential backoff
@retry(max_attempts=3, backoff=2.0)
def call_replicate_api(model, input):
    return replicate.run(model, input)
```

### User Feedback

```python
# Inform user of issues
if api_down:
    send_lark_message(
        "AI effects temporarily unavailable. Using basic generation instead."
    )
```

## Future Enhancements

### Planned Features

1. **Video Generation Skill** - Create short Milady videos
2. **Voice Skill** - Text-to-speech with Milady voice
3. **Analytics Dashboard** - Real-time metrics and insights
4. **Multi-Platform Support** - Discord, Telegram bots
5. **Advanced Training** - Fine-tuned models for Jessie persona

### Extensibility

Adding a new Skill:

1. Create `skills/your-skill/` directory
2. Write `SKILL.md` with proper frontmatter
3. Implement in `src/`
4. Add to main README
5. Claude will auto-detect and use it!

---

**Architecture Version:** 1.0
**Last Updated:** 2026-01-07
**Maintained By:** AI Content Studio Team
