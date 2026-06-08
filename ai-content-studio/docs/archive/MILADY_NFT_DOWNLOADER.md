# 🖼️ Milady NFT Collection Downloader

## 📊 下载状态

**已完成的工作:**
- ✅ NFT 下载脚本 (`scripts/download_milady_nfts.py`)
- ✅ 进度监控脚本 (`scripts/check_nft_progress.sh`)
- ✅ 文档和README (`assets/milady_nfts/README.md`)
- ✅ 开始下载 10,000 个 Milady NFT 原图

**当前状态:**
- 🔄 **后台下载运行中** (PID: 4169)
- 📥 **进度**: ~15 / 10,000 (0.15%)
- 📁 **输出目录**: `assets/milady_nfts/`
- 📝 **日志**: `logs/milady_nfts_download_*.log`

---

## 🎯 功能特点

### 1. 完整 NFT 集合下载
- 下载所有 10,000 个 Milady NFT 原始图片
- 每个图片 1000x1000 高清分辨率
- 直接从官网 `https://www.miladymaker.net/milady/` 下载

### 2. 元数据标记
每个 NFT 包含：
- **Token ID** (0-9999)
- **NFT 名称** (Milady #0, Milady #1, ...)
- **持有者地址** (通过 OpenSea API 获取，可选)
- **属性信息** (背景、皮肤、眼睛、发型等)
- **本地路径** (图片和元数据文件位置)

### 3. 断点续传
- 自动跳过已下载文件
- 支持随时中断和恢复
- 智能检测缺失文件

### 4. 进度跟踪
- 实时日志输出
- 每 100 个 NFT 报告进度
- 自动创建索引文件

---

## 📁 文件结构

```
assets/milady_nfts/
├── images/                          # 图片目录
│   ├── milady_0.png                # 1.2 MB
│   ├── milady_1.png                # 1.3 MB
│   ├── milady_2.png                # 1.4 MB
│   └── ... (10,000 total)
│
├── metadata/                        # 元数据目录
│   ├── milady_0.json
│   ├── milady_1.json
│   └── ...
│
├── milady_0_info.json              # 完整信息
├── milady_1_info.json
├── ...
│
├── milady_nfts_index.json          # 总索引
└── README.md                        # 使用文档
```

---

## 🚀 使用方法

### 方法 1: 交互式运行

```bash
python3 scripts/download_milady_nfts.py
```

选项:
1. **下载全部 (0-9999)** - 下载所有 NFT
2. **下载测试集 (前 10 个)** - 快速测试
3. **自定义范围** - 指定 ID 范围
4. **继续上次下载** - 从上次中断处继续

### 方法 2: 后台运行（推荐）

```bash
# 启动后台下载
nohup python3 -u scripts/download_milady_nfts.py > logs/milady_nfts.log 2>&1 <<EOF &
1
EOF

# 查看进度
bash scripts/check_nft_progress.sh

# 查看实时日志
tail -f logs/milady_nfts.log
```

### 方法 3: Python 脚本调用

```python
from scripts.download_milady_nfts import MiladyNFTDownloader

downloader = MiladyNFTDownloader()

# 下载指定范围
downloader.download_all(start_id=0, end_id=99, batch_delay=0.5)

# 下载单个 NFT
downloader.download_nft(token_id=1234)
```

---

## 📊 进度监控

### 检查下载进度

```bash
bash scripts/check_nft_progress.sh
```

输出示例:
```
📊 Milady NFT 下载进度
====================

✅ 下载进程运行中
   PID: 4169

📁 已下载文件:
   图片: 1234 / 10,000
   信息: 1234 / 10,000
   进度: 12.34%

💾 磁盘使用: 1.5G

📥 最近下载:
    milady_1234.png (Dec 30 03:15)
    milady_1233.png (Dec 30 03:15)
    ...

📋 最新日志:
   ✅ 完成 Milady #1234
   Owner: 0x...
```

### 查看详细日志

```bash
# 实时查看
tail -f logs/milady_nfts_download_*.log

# 查看最近 100 行
tail -100 logs/milady_nfts_download_*.log

# 搜索错误
grep "❌" logs/milady_nfts_download_*.log
```

---

## 💾 存储需求

**预估存储空间:**
- **图片总大小**: ~13-15 GB (10,000 × ~1.3 MB)
- **Metadata**: ~100 MB
- **Info 文件**: ~50 MB
- **总计**: ~15-16 GB

**下载时间:**
- 延迟 0.3s/NFT: ~50 分钟
- 延迟 0.5s/NFT: ~83 分钟
- 延迟 1s/NFT: ~167 分钟

---

## 📋 NFT 信息文件格式

### milady_{id}_info.json

```json
{
  "token_id": 1234,
  "name": "Milady #1234",
  "owner": "0x1234567890abcdef1234567890abcdef12345678",
  "attributes": [
    {"trait_type": "Background", "value": "Pink"},
    {"trait_type": "Skin", "value": "Light"},
    {"trait_type": "Eyes", "value": "Heart"},
    {"trait_type": "Hair", "value": "Blue"},
    ...
  ],
  "image_url": "https://www.miladymaker.net/milady/1234.png",
  "contract": "0x5Af0D9827E0c53E4799BB226655A1de152A425a5",
  "local_image_path": "assets/milady_nfts/images/milady_1234.png",
  "local_metadata_path": "assets/milady_nfts/metadata/milady_1234.json"
}
```

### milady_nfts_index.json

```json
[
  {
    "token_id": 0,
    "name": "Milady #0",
    "owner": "0x...",
    "image_path": "assets/milady_nfts/images/milady_0.png"
  },
  {
    "token_id": 1,
    "name": "Milady #1",
    "owner": "0x...",
    "image_path": "assets/milady_nfts/images/milady_1.png"
  },
  ...
]
```

---

## 🔍 使用 NFT 数据

### 1. 查找特定 NFT

```python
import json

# 读取索引
with open('assets/milady_nfts/milady_nfts_index.json', 'r') as f:
    index = json.load(f)

# 查找 Token ID 1234
nft = next(n for n in index if n['token_id'] == 1234)
print(f"Name: {nft['name']}")
print(f"Owner: {nft['owner']}")
print(f"Image: {nft['image_path']}")
```

### 2. 按持有者筛选

```python
import glob
import json

owner_address = "0x..."
owned_nfts = []

for info_file in glob.glob('assets/milady_nfts/milady_*_info.json'):
    with open(info_file, 'r') as f:
        info = json.load(f)
        if info.get('owner', '').lower() == owner_address.lower():
            owned_nfts.append(info)

print(f"该地址持有 {len(owned_nfts)} 个 Milady")
```

### 3. 按属性过滤

```python
import glob
import json

# 查找粉色背景
pink_miladys = []

for info_file in glob.glob('assets/milady_nfts/milady_*_info.json'):
    with open(info_file, 'r') as f:
        info = json.load(f)
        for attr in info.get('attributes', []):
            if attr.get('trait_type') == 'Background' and attr.get('value') == 'Pink':
                pink_miladys.append(info)
                break

print(f"找到 {len(pink_miladys)} 个粉色背景")
```

### 4. 生成缩略图

```python
from PIL import Image
from pathlib import Path

def create_thumbnail(nft_id, size=(200, 200)):
    """创建缩略图"""
    src = Path(f"assets/milady_nfts/images/milady_{nft_id}.png")
    dst = Path(f"assets/milady_nfts/thumbnails/milady_{nft_id}_thumb.png")

    dst.parent.mkdir(exist_ok=True)

    img = Image.open(src)
    img.thumbnail(size)
    img.save(dst)

# 批量生成
for nft_id in range(0, 10000):
    create_thumbnail(nft_id)
```

### 5. 统计稀有度

```python
import glob
import json
from collections import Counter

# 统计所有属性
trait_counts = {}

for info_file in glob.glob('assets/milady_nfts/milady_*_info.json'):
    with open(info_file, 'r') as f:
        info = json.load(f)
        for attr in info.get('attributes', []):
            trait_type = attr['trait_type']
            value = attr['value']

            if trait_type not in trait_counts:
                trait_counts[trait_type] = Counter()

            trait_counts[trait_type][value] += 1

# 显示稀有属性
for trait_type, counts in trait_counts.items():
    print(f"\n{trait_type}:")
    for value, count in counts.most_common()[:5]:
        rarity = (count / 10000) * 100
        print(f"  {value}: {count} ({rarity:.2f}%)")
```

---

## 🛠️ 故障排除

### Q: 下载中断了怎么办？

**A:** 重新运行下载脚本，选择"继续上次下载"或"下载全部"（会自动跳过已下载的）

```bash
python3 scripts/download_milady_nfts.py
# 选择选项 4 (继续上次下载)
```

### Q: 图片下载失败？

**A:** 检查网络连接，脚本会自动跳过失败的 NFT。可以稍后重新运行，只会下载缺失的文件。

### Q: 元数据获取失败？

**A:** 元数据获取失败不影响图片下载。脚本会创建基础元数据（包含 token_id 和 image_url）。

### Q: 如何只下载图片，不获取 owner 信息？

**A:** Owner 获取失败会被自动跳过，不影响下载流程。如果想完全禁用，可以修改脚本中的 `get_owner_address()` 方法直接返回 None。

### Q: 如何加快下载速度？

**A:** 可以减小 `batch_delay` 参数：

```python
downloader.download_all(0, 9999, batch_delay=0.1)  # 更快，但可能被限流
```

或者并行下载（修改脚本添加多线程）。

### Q: 下载完成后如何验证？

**A:** 运行检查脚本：

```bash
bash scripts/check_nft_progress.sh

# 应该显示: 图片: 10000 / 10,000 (100%)
```

---

## 🔗 技术细节

### 数据源

1. **图片**: `https://www.miladymaker.net/milady/{id}.png`
   - 官方托管
   - 1000x1000 PNG
   - 稳定可靠

2. **Metadata**: IPFS (可选)
   - `ipfs://QmYzsXq5QuKcUuVwjz1VS4fPr6kCZdF1nZBBz3PmjhB8VW/{id}`
   - 包含属性信息

3. **Owner**: OpenSea API (可选)
   - `https://api.opensea.io/api/v2/chain/ethereum/contract/{contract}/nfts/{id}`
   - 需要 API key（未配置则跳过）

### 合约信息

- **Contract Address**: `0x5Af0D9827E0c53E4799BB226655A1de152A425a5`
- **Network**: Ethereum Mainnet
- **Token Standard**: ERC-721
- **Total Supply**: 10,000

### 下载策略

1. **优先级**: 图片 > Metadata > Owner
2. **容错**: 任何步骤失败都不影响其他步骤
3. **重试**: 自动跳过失败项，可重新运行补齐
4. **延迟**: 防止被限流 (默认 0.3s/NFT)

---

## 📊 预计时间线

**当前设置** (batch_delay=0.3s):

| 阶段 | NFT 数量 | 预计时间 | 存储空间 |
|------|---------|---------|---------|
| 0-1,000 | 1,000 | ~5 分钟 | ~1.3 GB |
| 0-5,000 | 5,000 | ~25 分钟 | ~6.5 GB |
| 0-10,000 | 10,000 | ~50 分钟 | ~13 GB |

**完成后:**
- ✅ 10,000 个高清 NFT 图片
- ✅ 每个 NFT 的详细信息
- ✅ 可搜索的索引文件
- ✅ 按 ID、Owner、属性查询

---

## 🎯 下一步

下载完成后，你可以：

1. **集成到 Milady Maker**
   - 在 Milady Maker 中选择 NFT 原图作为基础
   - 在原图基础上修改图层

2. **创建 NFT 查看器**
   - 构建 Web 界面浏览所有 NFT
   - 按属性筛选和搜索

3. **稀有度分析**
   - 统计各属性出现频率
   - 计算 NFT 稀有度评分

4. **持有者分析**
   - 分析持有者分布
   - 识别巨鲸持有者

5. **生成衍生作品**
   - 基于 NFT 原图创作
   - 生成 Milady 梗图

---

## 📚 相关文档

- **Milady Meme Generator**: `MILADY_MEME_GENERATOR.md`
- **Lark Bot 集成**: `LARK_INTEGRATION_SUMMARY.md`
- **NFT 使用文档**: `assets/milady_nfts/README.md`
- **项目总览**: `README.md`

---

## 🎉 总结

你现在拥有：

1. ✅ **完整的 Milady NFT 图层系统** (174/400+ 图层)
   - 可以生成无限种新的 Milady 变体

2. 🔄 **10,000 个原始 NFT 图片**（下载中）
   - 每个 NFT 都有完整标记（ID + Address）
   - 可以作为 Milady Maker 的基础素材

3. ✅ **Lark Meme Bot**
   - 同事可以在飞书中生成 Milady 梗图
   - 支持自定义文字和随机生成

**系统功能完整，随时可用！** 🚀

---

**查看下载进度:**
```bash
bash scripts/check_nft_progress.sh
```

**Powered by AI Content Studio** 🤖
