# ⚠️ START HERE - READ THIS FIRST!

## 🚨 IMPORTANT: You MUST Configure API Keys Before Using!

**This project requires API keys to function.** Without proper configuration, most features will not work.

---

## 📋 Quick Setup (5 minutes)

### Step 1: Run the Configuration Wizard

```bash
python scripts/setup_config.py
```

This interactive wizard will guide you through:
- Twitter API setup (FREE)
- Claude API setup (~$0.01-0.05/tweet)
- Replicate API setup ($0.006-0.05/image)
- Lark Bot setup (FREE)

### Step 2: Test Your Configuration

```bash
python scripts/test_config.py
```

This will verify all your API keys are working correctly.

### Step 3: Start Using!

```bash
# For Lark Bot
python webhook_server.py

# For individual Skills
cd skills/milady-meme-generator
python src/meme_generator_v2.py
```

---

## 📚 Need More Help?

### Getting API Keys

See **[CONFIG.md](CONFIG.md)** for detailed instructions on:
- Where to get each API key
- How much each API costs
- What features require which APIs
- Security best practices

### Understanding the Project

See **[README_NEW.md](README_NEW.md)** for:
- Overview of all 7 Skills
- Architecture details
- Usage examples
- Feature documentation

### Quick Start Guide

See **[QUICK_START.md](QUICK_START.md)** for:
- 3 different usage paths
- Common tasks
- Troubleshooting

---

## 💰 Cost Summary

| API | Cost | Required For | Can Skip? |
|-----|------|--------------|-----------|
| **Twitter** | FREE | Social monitoring | ✅ Yes |
| **Claude** | $0.01-0.05/tweet | Content generation | ✅ Yes (use free Llama) |
| **Replicate** | $0.006-0.05/image | AI image effects | ✅ Yes |
| **Lark** | FREE | Lark Bot integration | ✅ Yes |

**💡 Good news:** You can skip any API you don't need!

**💡 Even better:** Some features work without ANY APIs:
- ✅ Basic Milady meme generation (FREE, no API)
- ✅ Memegen templates (FREE, no API)
- ✅ Training data management (FREE, no API)

---

## 🔐 Security Notice

**NEVER commit your `.env` file to Git!**

```bash
# ✅ Good: .env is already in .gitignore
cat .gitignore | grep .env

# ❌ Bad: Don't do this!
git add config/.env  # This will fail (protected)
```

Your API keys are **personal and private**. Each user must configure their own.

---

## ❓ Common Questions

### Q: Do I need ALL the API keys?

**A:** No! Each API is optional:
- Want only meme generation? Skip all APIs.
- Want Twitter monitoring? Only need Twitter API (FREE).
- Want content generation? Need Claude API (or use free Llama).

### Q: I have Claude Pro subscription. Do I still need Claude API?

**A:** Yes, they're separate services:
- **Claude Pro** ($20/month) = Unlimited web chat
- **Claude API** (pay-as-you-go) = Programmatic access

**Solution:** Use free Llama alternative, or just pay for what you use.

### Q: How do I get started with zero cost?

**A:** Easy!

```bash
# 1. Skip all API configuration (or only add free Twitter API)

# 2. Use free features:
python -c "
from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2
gen = MemeGeneratorV2()
meme = gen.generate_meme(nft_id=5050, top_text='GM', bottom_text='WAGMI')
meme.save('meme.png')
print('✅ Meme created without any APIs!')
"
```

### Q: What if I already have API keys configured elsewhere?

**A:** The configuration wizard will detect existing keys in your `.env` file and ask if you want to keep them.

---

## 🆘 Getting Help

1. **Configuration issues?**
   - Run: `python scripts/setup_config.py`
   - Read: [CONFIG.md](CONFIG.md)

2. **API not working?**
   - Run: `python scripts/test_config.py`
   - Check: API keys are correct
   - Verify: You have sufficient credits/quota

3. **Feature not working?**
   - Check: Required API is configured
   - Read: Individual Skill documentation in `skills/*/SKILL.md`

4. **Still stuck?**
   - Check: [ARCHITECTURE.md](ARCHITECTURE.md) for system design
   - Review: [CONFIG.md](CONFIG.md) troubleshooting section

---

## ✅ Checklist Before Starting

- [ ] Run `python scripts/setup_config.py`
- [ ] Run `python scripts/test_config.py`
- [ ] Read [CONFIG.md](CONFIG.md) for your needed APIs
- [ ] Verify all tests pass
- [ ] Keep your `.env` file private and secure

---

## 🚀 Ready to Go?

Once you've configured your API keys and passed the tests:

```bash
# Option 1: Use as Claude Skills
cp -r skills/* ~/.claude/skills/

# Option 2: Use Lark Bot
python webhook_server.py

# Option 3: Use individual Skills
cd skills/milady-meme-generator
python src/meme_generator_v2.py
```

**Happy meme generation!** 🎉

---

**📍 You are here:** START_HERE.md

**📖 Next steps:**
1. [CONFIG.md](CONFIG.md) - API configuration guide
2. [QUICK_START.md](QUICK_START.md) - Quick start guide
3. [README_NEW.md](README_NEW.md) - Full documentation
