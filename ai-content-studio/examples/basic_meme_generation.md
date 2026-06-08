# Example: Basic Meme Generation

Learn how to generate Milady NFT memes using the Milady Meme Generator Skill.

## Prerequisites

```bash
# Install dependencies
pip install pillow

# Download NFT assets (one-time setup)
cd skills/milady-meme-generator
python scripts/download_nfts.py
python scripts/download_layers.py
```

## Example 1: Random Meme

Generate a completely random Milady meme:

```python
from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2

# Initialize generator
generator = MemeGeneratorV2()

# Generate random meme
meme = generator.generate_random_meme()

# Save result
meme.save("output/random_meme.png")
print("Random meme generated!")
```

**Output:** Random NFT with random accessories and text

---

## Example 2: Specific NFT

Generate meme from a specific NFT:

```python
# Generate NFT #5050
meme = generator.generate_meme(nft_id=5050)
meme.save("output/milady_5050.png")
```

---

## Example 3: Add Text Overlay

Add custom text to your meme:

```python
# NFT with text overlay
meme = generator.generate_meme(
    nft_id=5050,
    top_text="GM",
    bottom_text="WAGMI"
)
meme.save("output/gm_meme.png")
```

**Output:**
```
    GM
  (Milady NFT #5050)
   WAGMI
```

---

## Example 4: Add Accessories

Add layers/accessories to the NFT:

```python
# NFT with hat and glasses
meme = generator.generate_meme(
    nft_id=5050,
    layers=["Hat:Beret.png", "Glasses:Sunglasses.png"]
)
meme.save("output/accessorized_meme.png")
```

**Available layer categories:**
- Hat/ (89 hats)
- Glasses/ (24 glasses)
- Earrings/ (21 earrings)
- Necklaces/ (13 necklaces)
- Face Decoration/ (134 decorations)
- Overlay/ (43 effects)

---

## Example 5: Combine Text + Layers

Combine everything:

```python
# Full customization
meme = generator.generate_meme(
    nft_id=5050,
    top_text="Good Morning",
    bottom_text="Let's Build",
    layers=[
        "Hat:Cowboy.png",
        "Glasses:Heart Shaped.png",
        "Overlay:Sparkles.png"
    ]
)
meme.save("output/full_custom_meme.png")
```

---

## Example 6: Natural Language

Use natural language to select layers:

```python
from skills.milady_meme_generator.src.prompt_parser import PromptParser

parser = PromptParser()

# Parse natural language prompt
prompt = "give her a red beret and cool sunglasses"
layers = parser.parse_prompt(prompt)

# Generate with parsed layers
meme = generator.generate_meme(
    nft_id=5050,
    layers=layers
)
meme.save("output/natural_language_meme.png")
```

**Supported phrases:**
- "cowboy hat" → Hat:Cowboy.png
- "sunglasses" → Glasses:Sunglasses.png
- "heart earrings" → Earrings:Heart.png
- "sparkles" → Overlay:Sparkles.png

---

## Example 7: Template-Based

Use pre-defined templates:

```python
# GM template (random GM text + random NFT)
gm_meme = generator.generate_from_template("gm")
gm_meme.save("output/gm_template.png")

# Crypto template
crypto_meme = generator.generate_from_template("crypto")
crypto_meme.save("output/crypto_template.png")

# Milady culture template
milady_meme = generator.generate_from_template("milady")
milady_meme.save("output/milady_template.png")
```

**Available templates:**
- `gm` - Good morning posts (30+ variations)
- `crypto` - Crypto-related (40+ variations)
- `milady` - Milady culture (25+ variations)
- `motivational` - Motivational quotes (15+ variations)

---

## Example 8: Batch Generation

Generate multiple memes:

```python
# Generate 10 random memes
for i in range(10):
    meme = generator.generate_random_meme()
    meme.save(f"output/batch/meme_{i:03d}.png")

print("Generated 10 random memes!")
```

---

## Example 9: With Composition Control

Fine-tune the composition:

```python
from skills.milady_meme_generator.src.milady_composer import MiladyComposer

composer = MiladyComposer()

# Set base NFT
composer.set_base(nft_id=5050)

# Add layers one by one
composer.add_layer("Hat:Beret.png")
composer.add_layer("Glasses:Sunglasses.png")
composer.add_layer("Overlay:Heart Meme.png")

# Compose final image
result = composer.compose()
result.save("output/composed_meme.png")

# Add text after composition
from skills.milady_meme_generator.src.caption_meme import CaptionMeme

captioner = CaptionMeme()
final = captioner.add_caption(
    image=result,
    top_text="GM",
    bottom_text="WAGMI",
    font_style="impact"
)
final.save("output/final_meme.png")
```

---

## Example 10: Error Handling

Handle missing assets gracefully:

```python
try:
    # Try to generate with specific layer
    meme = generator.generate_meme(
        nft_id=5050,
        layers=["Hat:NonExistent.png"]
    )
except FileNotFoundError as e:
    print(f"Layer not found: {e}")

    # Fall back to default
    meme = generator.generate_meme(nft_id=5050)
    print("Generated without custom layer")

meme.save("output/fallback_meme.png")
```

---

## Complete Workflow Example

Full example combining everything:

```python
from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2
from skills.milady_meme_generator.src.prompt_parser import PromptParser

# Initialize
generator = MemeGeneratorV2()
parser = PromptParser()

# User input (simulate from chat bot)
user_message = "/milady 5050 give her a cowboy hat and sunglasses, text: GM / WAGMI"

# Parse message
import re
nft_id = int(re.search(r'\d+', user_message).group())
layer_desc = re.search(r'give her (.+?), text:', user_message).group(1)
top_text, bottom_text = re.search(r'text: (.+) / (.+)', user_message).groups()

# Parse layers
layers = parser.parse_prompt(layer_desc)

# Generate meme
meme = generator.generate_meme(
    nft_id=nft_id,
    top_text=top_text,
    bottom_text=bottom_text,
    layers=layers
)

# Save
output_path = f"output/milady_{nft_id}_custom.png"
meme.save(output_path)
print(f"Meme saved to: {output_path}")
```

---

## Tips & Tricks

### 1. Check Available Layers

```bash
# List all hats
ls skills/milady-meme-generator/assets/milady_layers/Hat/

# List all glasses
ls skills/milady-meme-generator/assets/milady_layers/Glasses/
```

### 2. Optimize for Speed

```python
# Pre-load common NFTs (cache in memory)
generator.preload_nfts([5050, 1234, 9999])

# Now these generate faster
meme = generator.generate_meme(nft_id=5050)  # Instant!
```

### 3. Custom Fonts

```python
# Use different font styles
meme = captioner.add_caption(
    image=img,
    top_text="GM",
    font_style="glow",  # Options: impact, angelic, chinese, glow
    font_size=60,
    text_color="white"
)
```

### 4. Check NFT Metadata

```python
# Get NFT attributes
metadata = composer.get_nft_metadata(nft_id=5050)
print(f"Background: {metadata['attributes']['Background']}")
print(f"Hair: {metadata['attributes']['Hair']}")
print(f"Rarity: {metadata['rarity']}")
```

---

## Common Issues

**Issue:** "NFT image not found"
```bash
# Solution: Download NFTs
python skills/milady-meme-generator/scripts/download_nfts.py
```

**Issue:** "Layer file not found"
```bash
# Solution: Download layers
python skills/milady-meme-generator/scripts/download_layers.py
```

**Issue:** "Text too long"
```python
# Solution: Use shorter text or adjust font size
meme = captioner.add_caption(
    image=img,
    top_text="Your very long text here",
    font_size=40  # Smaller font
)
```

---

## Next Steps

- [Add AI Effects](ai_effects_workflow.md) - Enhance with FLUX/SAM
- [Deploy as Lark Bot](lark_bot_deployment.md) - Make it interactive
- [Generate Twitter Content](twitter_content_workflow.md) - Create posts
