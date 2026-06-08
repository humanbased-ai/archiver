# 📖 Memegen 梗图生成器 - 完整使用指南

## 🚀 第一次使用？从这里开始！

### 最简单的3步

#### 第1步：查看有哪些模板
```
@我是机器人 /memegen list
```
你会看到207个模板，每个模板都有：
- **序号**（方便查找）
- **模板ID**（生成时用这个）
- **中文名称**（更好理解）
- **使用场景**（告诉你适合什么情况）
- **预览链接**（点开看效果）

#### 第2步：选一个模板，看看效果
```
@我是机器人 /memegen preview drake
```
机器人会发一张示例图给你，你就知道这个模板长什么样了。

#### 第3步：生成你自己的梗图
```
@我是机器人 /memegen drake 旧方案 新方案
```

---

## ⚠️ 常见错误和解决方法

### 错误1：找不到模板 "很好"
```
❌ 错误写法：
@我是机器人 /memegen 很好 又要加班了

✅ 正确写法：
@我是机器人 /memegen 这很好 又要加班了
或
@我是机器人 /memegen fine 又要加班了
```

**原因：** 中文别名必须用**完整**的名字
- ❌ "很好" → 错误
- ✅ "这很好" → 正确
- ✅ "fine" → 正确（英文模板ID）

### 错误2：找不到模板 "分心"
```
❌ 错误写法：
@我是机器人 /memegen 分心 工作 摸鱼

✅ 正确写法：
@我是机器人 /memegen 分心男友 工作 摸鱼
或
@我是机器人 /memegen db 工作 摸鱼
```

### 💡 推荐：直接用英文ID最简单！
```
/memegen drake 文字     ← 推荐
/memegen fine 文字      ← 推荐
/memegen db 文字        ← 推荐
```

---

## 📋 最常用的10个模板

| 英文ID | 中文名 | 用途 | 示例 |
|--------|--------|------|------|
| `drake` | Drake选择 | 对比两个选项 | `/memegen drake 旧方案 新方案` |
| `fine` | 这很好 | 讽刺"一切都好" | `/memegen fine 又出bug了` |
| `db` | 分心男友 | 分心/出轨 | `/memegen db 工作 摸鱼` |
| `buzz` | 到处都是 | X到处都是 | `/memegen buzz Bug` |
| `both` | 两个都要 | 两个都要 | `/memegen both 修Bug 写功能` |
| `astronaut` | 宇航员 | 一直都是 | `/memegen astronaut 都是Bug?` |
| `afraid` | 不敢问 | 不懂但不敢问 | `/memegen afraid 不懂的问题` |
| `spiderman` | 蜘蛛侠 | 互相指责 | `/memegen spiderman 你抄我 我抄你` |
| `oprah` | 奥普拉 | 你得一个 | `/memegen oprah Bug给你` |
| `balloon` | 气球 | 选择困难 | `/memegen balloon 该做的 想做的` |

**💡 建议：直接用左边的英文ID，又短又不会错！**

---

## 🎨 高级功能（/memegen+）

### 自定义字体
```
@我是机器人 /memegen+ drake 旧技术 新技术 --font=comic
```

可用字体：`comic`（漫画）, `impact`（粗体）, `thick`（超粗）

### 自定义颜色
```
@我是机器人 /memegen+ fine 又出bug了 --color=red
```

可用颜色：red, blue, purple, gold, pink, green

### 自定义尺寸
```
@我是机器人 /memegen+ drake 小图 大图 --size=1200x900
```

### 组合使用
```
@我是机器人 /memegen+ drake 普通 高级 --font=comic --color=purple,gold --size=1000x750
```

---

## 📖 所有命令

| 命令 | 功能 |
|------|------|
| `/memegen` | 显示快速帮助 |
| `/memegen list` | 查看所有207个模板 |
| `/memegen preview drake` | 预览模板效果 |
| `/memegen drake 文字` | 生成梗图 |
| `/memegen+ drake 文字 --font=comic` | 高级功能 |

---

## 🎉 快速开始

记住这个最简单的流程：

1. **查看模板**
```
/memegen list
```

2. **选一个模板ID**（建议用英文ID）

3. **生成梗图**
```
/memegen [模板ID] [你的文字]
```

例如：
```
/memegen drake 旧方案 新方案
/memegen fine 又出bug了
/memegen db 工作 摸鱼
```

就这么简单！🎨
