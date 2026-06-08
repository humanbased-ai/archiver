# Quick Start Guide

Get up and running with AI Content Studio Skills in 5 minutes!

## ⚠️ STEP 0: Configure API Keys (REQUIRED)

**Before anything else, you MUST configure your API keys!**

```bash
# Option A: Use the configuration wizard (easiest)
python scripts/setup_config.py

# Option B: Manual configuration
cp config/.env.example config/.env
nano config/.env  # Fill in your API keys

# Verify your configuration
python scripts/test_config.py
```

**📚 Detailed help:** See [CONFIG.md](CONFIG.md)

**💰 What each API costs:**
- Twitter API: **FREE**
- Claude API: **~$0.01-0.05/tweet** (or use free Llama alternative)
- Replicate API: **$0.006-0.05/image**
- Lark Bot: **FREE**

**💡 Tip:** You don't need all APIs! Configure only what you plan to use.

---

## 🚀 Choose Your Path

### Path 1: Use as Claude Skills (Recommended)

**1. First, configure your API keys** (see Step 0 above)

**2. Install all Skills to Claude Code:**

```bash
# Link Skills to Claude Code
ln -s $(pwd)/skills/* ~/.claude/skills/

# Or copy them
cp -r skills/* ~/.claude/skills/
```

**That's it!** Claude will now automatically use these Skills when relevant.

**Try it:**
```
You: "Create a Milady meme with NFT 5050"
Claude: [Uses milady-meme-generator Skill automatically]

You: "Generate a GM tweet"
Claude: [Uses twitter-content-ai Skill automatically]

You: "Replace the hat with a cowboy hat using AI"
Claude: [Uses ai-image-effects Skill automatically]
```

---

### Path 2: Use Individual Skills

**Use just one Skill:**

```bash
# Example: Milady Meme Generator
cd skills/milady-meme-generator

# 1. Install dependencies
pip install pillow

# 2. Download assets (one-time)
python scripts/download_nfts.py
python scripts/download_layers.py

# 3. Generate a meme
python -c "
from src.meme_generator_v2 import MemeGeneratorV2
gen = MemeGeneratorV2()
meme = gen.generate_meme(nft_id=5050, top_text='GM', bottom_text='WAGMI')
meme.save('my_meme.png')
print('Meme saved to my_meme.png!')
"
```

**Success!** You've generated your first Milady meme.

---

### Path 3: Deploy Full Bot

**Run the complete AI Content Studio system:**

```bash
# 1. Install all dependencies
pip install -r requirements.txt

# 2. Set up environment variables
export REPLICATE_API_TOKEN="r8_xxxxx"
export ANTHROPIC_API_KEY="sk-ant-xxxxx"
export LARK_APP_ID="cli_xxxxx"
export LARK_APP_SECRET="your_secret"

# 3. Start webhook server
python webhook_server.py
```

**Bot is running!** Access at http://localhost:8000

**Use in Lark:**
```
/milady 5050
/milady_replace 5050 hat cowboy hat
/milady_illusion 5050 spiral
```

---

## 📦 Skill Overview

| Skill | Use Case | Example |
|-------|----------|---------|
| **milady-meme-generator** | Create Milady memes | `gen.generate_meme(nft_id=5050)` |
| **ai-image-effects** | Add AI effects | `flux.replace_accessory("hat", "cowboy")` |
| **twitter-content-ai** | Generate tweets | `gen.generate_gm_post()` |
| **lark-bot-integration** | Deploy bot | `python webhook_server.py` |
| **social-monitoring** | Track Twitter | `monitor.check_mentions()` |
| **data-training-manager** | Manage data quality | `monitor.check_freshness(text)` |

---

## 🎯 Common Tasks

### Generate a Random Meme

```python
from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2

gen = MemeGeneratorV2()
meme = gen.generate_random_meme()
meme.save("random.png")
```

### Replace Accessory with AI

```python
from skills.ai_image_effects.src.flux_fill_pro import FluxFillPro

flux = FluxFillPro()
result = flux.replace_accessory(
    "milady.png",
    "hat",
    "red baseball cap"
)
result.save("replaced.png")
```

### Generate a GM Tweet

```python
from skills.twitter_content_ai.src.content_generator import ContentGenerator

gen = ContentGenerator()
tweet = gen.generate_gm_post()
print(tweet)
# "gm to data contributors who deserve ownership 🎀🧹"
```

### Monitor Twitter Mentions

```python
from skills.social_monitoring.src.twitter_monitor import TwitterMonitor

monitor = TwitterMonitor()
mentions = monitor.check_mentions()

for mention in mentions:
    print(f"@{mention['author']}: {mention['text']}")
```

### Check Content Freshness

```python
from skills.data_training_manager.src.freshness_monitor import FreshnessMonitor

monitor = FreshnessMonitor()
score = monitor.check_freshness(
    "gm to everyone building cool stuff",
    threshold=0.7
)

if score >= 0.7:
    print("✅ Content is fresh!")
else:
    print("⚠️ Content too similar to existing")
```

---

## 💰 Cost Overview

| Operation | Cost | Free Alternative |
|-----------|------|------------------|
| Basic meme generation | FREE | - |
| Illusion Diffusion | $0.006 | - |
| FLUX Fill Pro | $0.05 | Use layers instead |
| SAM Detection | <$0.01 | - |
| Twitter monitoring | FREE | - |
| Content generation | ~$0.02 | Use templates |

**Monthly estimate:** $10-20 for moderate use

---

## 📚 Next Steps

### Learn More

1. **Read the Skills:**
   - [Milady Meme Generator](skills/milady-meme-generator/SKILL.md)
   - [AI Image Effects](skills/ai-image-effects/SKILL.md)
   - [Twitter Content AI](skills/twitter-content-ai/SKILL.md)
   - [Lark Bot](skills/lark-bot-integration/SKILL.md)
   - [Social Monitoring](skills/social-monitoring/SKILL.md)
   - [Training Manager](skills/data-training-manager/SKILL.md)

2. **Check Examples:**
   - [Basic Meme Generation](examples/basic_meme_generation.md)
   - More examples coming soon!

3. **Understand Architecture:**
   - [Architecture Overview](ARCHITECTURE.md)
   - [Migration Summary](MIGRATION_SUMMARY.md)

### Get API Keys

- **Replicate:** https://replicate.com/account/api-tokens
- **Claude:** https://console.anthropic.com/
- **Twitter:** https://developer.twitter.com/
- **Lark:** https://open.larksuite.com/

---

## 🆘 Troubleshooting

**"Module not found"**
```bash
# Install dependencies
pip install -r requirements.txt
```

**"NFT image not found"**
```bash
# Download assets
cd skills/milady-meme-generator
python scripts/download_nfts.py
```

**"API error"**
```bash
# Check your API keys are set
echo $REPLICATE_API_TOKEN
echo $ANTHROPIC_API_KEY
```

**"Skill not triggering in Claude"**
```bash
# Re-link Skills
rm ~/.claude/skills/*
ln -s $(pwd)/skills/* ~/.claude/skills/
```

---

## ❓ Need Help?

- 📖 Read the [full README](README_NEW.md)
- 🏗️ Check [architecture docs](ARCHITECTURE.md)
- 🐛 [Report an issue](https://github.com/your-repo/issues)
- 💬 Ask in Lark/Discord

---

**Ready to build?** Pick a Skill and start creating! 🎀🧹
