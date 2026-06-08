# AI Content Studio - Claude Skills Collection

> **AI-powered Milady NFT meme generator + Twitter automation + Social monitoring**

A comprehensive collection of Claude Skills for creating Milady memes, managing Twitter content with personality, and automating social media workflows.

[![Claude Skills](https://img.shields.io/badge/Claude-Skills-orange)](https://claude.com/skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Security](https://img.shields.io/badge/security-audited-green.svg)](.github/SECURITY.md)

## 🎯 What is This?

This repository contains **6 independent Claude Skills** that work together to power an intelligent social media bot. Each Skill can be used standalone or combined for maximum impact.

### Featured Skills

| Skill | Purpose | Cost | Standalone? |
|-------|---------|------|-------------|
| **[Milady Meme Generator](skills/milady-meme-generator/)** | Generate Milady NFT memes with 324+ accessories | FREE | ✅ |
| **[AI Image Effects](skills/ai-image-effects/)** | Apply Illusion/FLUX/SAM AI effects | $0.006-0.05 | ✅ |
| **[Twitter Content AI](skills/twitter-content-ai/)** | Generate tweets with AI persona | API cost | ✅ |
| **[Lark Bot Integration](skills/lark-bot-integration/)** | Deploy as Lark (Feishu) bot | FREE | ✅ |
| **[Social Monitoring](skills/social-monitoring/)** | Monitor 151 Twitter accounts | FREE | ✅ |
| **[Data Training Manager](skills/data-training-manager/)** | Manage AI training data quality | FREE | ✅ |

## 🚀 Quick Start

### 📥 Step 0: Download NFT Assets (Required for Milady Meme Generator)

**⚠️ Important:** The Milady NFT images (14GB) are not included in this repository due to size limitations. You need to download them separately:

```bash
# Download all 10,000 Milady NFT images (~14GB)
python scripts/download_milady_nfts.py

# Or download just a test set (first 10 NFTs)
# Select option 2 when prompted

# The script will download images to: assets/milady_nfts/images/
```

**Note:** The download script will:
- Download images from the official Milady Maker website
- Save metadata for each NFT
- Create an index file for quick lookup
- Resume automatically if interrupted

**Time estimate:** ~2-4 hours for all 10,000 NFTs (depends on network speed)

**Alternative:** If you only need the meme generator layers (not the base NFTs), you can skip this step. The layers are already included in the repository.

---

### ⚠️ IMPORTANT: Configure API Keys First!

**Before using any Skills, you MUST configure your API keys:**

```bash
# 1. Run the configuration wizard (recommended)
python scripts/setup_config.py

# OR manually copy and edit the config file
cp config/.env.example config/.env
nano config/.env  # Fill in your API keys

# 2. Test your configuration
python scripts/test_config.py
```

**📚 Need help getting API keys?** See [CONFIG.md](CONFIG.md) for detailed instructions.

**💡 What you need:**
- **Twitter API** (FREE) - For social monitoring
- **Claude API** ($0.01-0.05/tweet) - For content generation
- **Replicate API** ($0.006-0.05/image) - For AI image effects
- **Lark Bot** (FREE) - For team collaboration

**Don't have all keys?** No problem! Each API is optional - configure only what you need.

---

### Option 1: Use Individual Skills

Each Skill is self-contained and can be used independently:

```bash
# Example: Use just the Milady Meme Generator (NO API KEY NEEDED)
cd skills/milady-meme-generator
python src/meme_generator_v2.py

# Example: Use AI Image Effects (REQUIRES: Replicate API)
cd skills/ai-image-effects
python src/flux_fill_pro.py
```

### Option 2: Use as Claude Skills

Install Skills to your Claude Code environment:

```bash
# 1. First, configure your API keys (see above)
python scripts/setup_config.py

# 2. Copy Skills to Claude Code
cp -r skills/* ~/.claude/skills/

# Or link them (recommended for development)
ln -s $(pwd)/skills/* ~/.claude/skills/
```

Now Claude will automatically use these Skills when relevant!

### Option 3: Deploy Full Bot

Run the complete AI Content Studio system:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start webhook server
python webhook_server.py

# Bot is now running at http://localhost:8000
```

## 📦 Skills Overview

### 1. Milady Meme Generator

**Generate Milady NFT memes with layered composition**

- 10,000 Milady NFT base images (download separately, see Step 0 above)
- 324 layered accessories (hats, glasses, earrings, etc.) - included in repo
- Text overlays with 4 font styles
- Natural language layer selection
- Template-based generation

**📥 First-time setup:** Run `python scripts/download_milady_nfts.py` to download NFT images (~14GB)

```python
from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2

generator = MemeGeneratorV2()
meme = generator.generate_meme(
    nft_id=5050,
    top_text="GM",
    bottom_text="WAGMI",
    layers=["Hat:Beret.png", "Glasses:Sunglasses.png"]
)
```

**Cost:** FREE (local processing)

[→ Full Documentation](skills/milady-meme-generator/SKILL.md)

---

### 2. AI Image Effects

**Apply professional AI effects to images**

- **Illusion Diffusion**: Optical illusions and patterns ($0.006)
- **FLUX Fill Pro**: Smart inpainting and accessory replacement ($0.05)
- **SAM Detector**: Meta SAM-2 object detection (<$0.01)

```python
from skills.ai_image_effects.src.flux_fill_pro import FluxFillPro

flux = FluxFillPro()
result = flux.replace_accessory(
    "milady.png",
    accessory_type="hat",
    new_description="red baseball cap"
)
```

**Cost:** $0.006-0.05 per image

[→ Full Documentation](skills/ai-image-effects/SKILL.md)

---

### 3. Twitter Content AI

**Generate authentic Twitter content with personality**

- Jessie persona (Codatta data cleaner intern)
- 4 content types (GM, insights, casual, interactions)
- 180+ training samples
- Freshness monitoring (prevents repetition)
- Multi-style generation (short/medium/long)

```python
from skills.twitter_content_ai.src.content_generator import ContentGenerator

generator = ContentGenerator()
tweet = generator.generate_gm_post()
# "gm to data contributors who deserve ownership 🎀🧹"
```

**Cost:** Claude API usage

[→ Full Documentation](skills/twitter-content-ai/SKILL.md)

---

### 4. Lark Bot Integration

**Deploy as interactive Lark (Feishu) bot**

- 10+ meme generation commands
- Real-time webhook processing
- Image upload to Lark chats
- Team collaboration features
- Approval workflow for tweets

```bash
# Start Lark bot
python webhook_server.py

# In Lark chat:
/milady 5050 Hat:Cowboy.png top:GM
```

**Cost:** FREE (Lark API is free)

[→ Full Documentation](skills/lark-bot-integration/SKILL.md)

---

### 5. Social Monitoring

**Monitor Twitter activity and find opportunities**

- Track 151 key accounts (Codatta, Base, x402, AI/Data, Crypto, Milady)
- Real-time mention detection
- Intelligent priority scoring
- Engagement metrics tracking
- Auto-interaction opportunities

```python
from skills.social_monitoring.src.twitter_monitor import TwitterMonitor

monitor = TwitterMonitor()
mentions = monitor.check_mentions()
opportunities = monitor.find_opportunities(min_priority=70)
```

**Cost:** FREE (Twitter API basic tier)

[→ Full Documentation](skills/social-monitoring/SKILL.md)

---

### 6. Data Training Manager

**Maintain AI training data quality**

- Freshness monitoring (prevents staleness)
- Quality scoring and tracking
- Continuous learning system
- Auto-archive low performers
- Trend analysis

```python
from skills.data_training_manager.src.freshness_monitor import FreshnessMonitor

monitor = FreshnessMonitor()
score = monitor.check_freshness(
    "your generated text",
    threshold=0.7
)
```

**Cost:** FREE (local processing)

[→ Full Documentation](skills/data-training-manager/SKILL.md)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  User Input (Lark Bot / CLI / Claude Code)          │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────▼────────┐
        │ Skill Router    │
        │ (Auto-selected) │
        └────────┬────────┘
                 │
    ┌────────────┼────────────────────┐
    │            │                    │
    ▼            ▼                    ▼
┌─────────┐ ┌──────────┐ ┌────────────────┐
│ Milady  │ │ Twitter  │ │ Social         │
│ Meme    │ │ Content  │ │ Monitoring     │
│ Gen     │ │ AI       │ │                │
└────┬────┘ └────┬─────┘ └────────────────┘
     │           │
     ▼           ▼
┌─────────┐ ┌──────────┐
│ AI      │ │ Training │
│ Effects │ │ Manager  │
└─────────┘ └──────────┘
     │
     ▼
┌──────────────┐
│ Lark Bot     │
│ (Optional)   │
└──────────────┘
```

## 📋 Requirements

### Core Dependencies

```bash
pip install pillow requests anthropic replicate flask
```

### Optional Dependencies

```bash
# For Lark bot
pip install -r requirements_lark.txt

# For development
pip install pytest black flake8
```

### API Keys

- **Replicate API** (for AI effects): https://replicate.com
- **Claude API** (for content generation): https://anthropic.com
- **Twitter API** (for monitoring): https://developer.twitter.com
- **Lark API** (for bot deployment): https://open.larksuite.com

## 🎨 Examples

### Example 1: Generate Random Milady Meme

```python
from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2

gen = MemeGeneratorV2()
meme = gen.generate_random_meme()
meme.save("random_meme.png")
```

### Example 2: Smart Accessory Replacement

```python
from skills.ai_image_effects.src.sam_detector import SAMDetector
from skills.ai_image_effects.src.flux_fill_pro import FluxFillPro

# Detect hat automatically
sam = SAMDetector()
bbox = sam.detect_accessory("milady.png", "hat")

# Replace with AI
flux = FluxFillPro()
result = flux.replace_region("milady.png", bbox, "cowboy hat")
```

### Example 3: Generate Daily Twitter Content

```python
from skills.twitter_content_ai.src.content_generator import ContentGenerator

gen = ContentGenerator()

# Morning GM post
gm = gen.generate_gm_post()

# Industry insight
insight = gen.generate_insight(topic="data_ownership")

# Casual content
casual = gen.generate_casual()
```

### Example 4: Monitor & Auto-Reply

```python
from skills.social_monitoring.src.twitter_monitor import TwitterMonitor
from skills.twitter_content_ai.src.content_generator import ContentGenerator

monitor = TwitterMonitor()
content = ContentGenerator()

# Check mentions
mentions = monitor.check_mentions()

for mention in mentions:
    # Generate contextual reply
    reply = content.generate_reply(
        original_tweet=mention['text'],
        author=mention['author']
    )
    print(f"Reply to {mention['author']}: {reply}")
```

## 💰 Cost Breakdown

| Operation | Cost | Notes |
|-----------|------|-------|
| Milady meme generation | FREE | Local processing |
| Text overlay | FREE | Local processing |
| Illusion Diffusion | $0.006 | Per image |
| FLUX Fill Pro | $0.05 | Per image |
| SAM detection | <$0.01 | Per detection (cached) |
| Claude content generation | ~$0.01-0.05 | Per tweet |
| Twitter API | FREE | Basic tier (500k/month) |
| Lark API | FREE | No limits |

**Monthly estimate (moderate use):**
- 100 AI memes: ~$5
- 200 tweets generated: ~$10
- Social monitoring: FREE
- **Total: ~$15/month**

## 📖 Documentation

### Getting Started

- [Installation Guide](docs/guides/installation.md)
- [Configuration Guide](docs/guides/configuration.md)
- [Deployment Guide](docs/guides/deployment.md)

### Skill Guides

- [Milady Meme Generator](skills/milady-meme-generator/SKILL.md)
- [AI Image Effects](skills/ai-image-effects/SKILL.md)
- [Twitter Content AI](skills/twitter-content-ai/SKILL.md)
- [Lark Bot Integration](skills/lark-bot-integration/SKILL.md)
- [Social Monitoring](skills/social-monitoring/SKILL.md)
- [Data Training Manager](skills/data-training-manager/SKILL.md)

### Advanced

- [Architecture Overview](ARCHITECTURE.md)
- [API Reference](docs/api/api_reference.md)

## 🤝 Contributing

Contributions welcome! Each Skill is independent, so you can:

1. **Improve existing Skills** - Add features, fix bugs
2. **Create new Skills** - Follow Claude Skills standards
3. **Add training data** - Contribute successful content samples
4. **Improve documentation** - Help others use these Skills

## 📄 License

MIT License

## 🙏 Acknowledgments

- **Milady NFT** - Original artwork and community
- **Codatta** - Data ownership vision
- **Replicate** - AI model hosting
- **Anthropic** - Claude API
- **Meta** - SAM-2 model
- **Black Forest Labs** - FLUX models

## 🔗 Links

- [Claude Skills Documentation](https://code.claude.com/docs/en/skills.md)
- [Milady NFT](https://miladymaker.net/)
- [Codatta](https://codatta.io/)

---

**Made with 🎀 for the Milady community**
