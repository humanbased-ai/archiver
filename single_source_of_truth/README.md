# Project: single_source_of_truth - README

This document is the README for the `single_source_of_truth` repository. It explains the purpose, importance, and usage of the `context_framework.md` file contained within.

*Read this document in your preferred language. English is presented first, followed by the Chinese version.*

---

## **1. What is This Project?**

This repository, `single_source_of_truth`, houses the canonical **AI Context Framework** for Codatta.

The core of this project is the `context_framework.md` file. It is a structured, comprehensive document designed to be given to any AI model (like Gemini, ChatGPT, Claude, etc.) to provide it with a deep and consistent understanding of our company, products, strategy, and brand voice.

Think of the file as a **"company brain"** or a **"primer"** that we feed to AI before asking it to perform any task.

## **2. Why is it Important?**

Using this standardized context is crucial for several reasons:

* **Consistency:** It ensures that all AI-generated content—whether it's a PR article, a tweet, or a technical document—is consistent with our brand voice, messaging, and official information.
* **Efficiency:** It saves significant time. Instead of explaining who we are to an AI every single time, we provide a complete, pre-approved context in one step.
* **Quality:** By providing high-quality, structured information, the AI can generate more accurate, relevant, and insightful outputs.
* **Confidentiality:** The `[INTERNAL_ONLY]` tag system creates a safeguard, allowing us to provide sensitive strategic context to the AI for better reasoning, while strictly instructing it not to leak that information in its output.
* **Collaboration:** It serves as a centralized knowledge base that can be collaboratively maintained by the entire team via GitHub.

## **3. How to Use It**

Using the context is simple. Follow this 3-step process:

1.  **COPY:** Open the `context_framework.md` file and copy its entire content.
2.  **PASTE:** Paste the copied content into the chat window of your chosen AI tool at the very beginning of a new conversation.
3.  **PROMPT:** After the pasted context, add your specific request or question. It's good practice to use a separator like `---` between the context and your prompt.

### **Example Usage**

**❌ Bad Prompt (Without Context):**
> Write a tweet about Codatta's vision.

*Result: The AI will likely give a very generic, vague, or even incorrect answer based on outdated public data.*

**✅ Good Prompt (With Context):**
> *[Paste the entire content of context_framework.md here]*
>
> ---
>
> **My Prompt:** Based on the context provided, write a tweet that captures the essence of our "Knowledge-Fi" vision for our developer audience.

*Result: The AI will use the detailed, up-to-date information, keywords, and brand voice from the context to generate a high-quality, targeted, and on-brand tweet.*

## **4. How to Add or Update Information**

This document is a living resource. Its value depends on being up-to-date.

* **To Propose Changes:** If you find outdated information or want to add something new to `context_framework.md`, please open a **Pull Request (PR)** on this GitHub repository.
* **Discuss Changes:** In your PR, clearly describe the change you are making and why. This allows for team review and discussion before the main document is updated.
* **Maintain Structure:** When adding new information, please adhere to the existing Markdown structure and the `[INTERNAL_ONLY]` tagging convention.

## **5. The Golden Rule**

**Always respect the `[INTERNAL_ONLY]` tag.** The information within these tags is the key to unlocking high-quality strategic output from AI, but it must never be shared publicly. Always double-check AI-generated content to ensure it hasn't inadvertently leaked sensitive details.

---
---

## **1. 这是什么项目？**

本仓库 `single_source_of_truth` 用于存放 Codatta 权威的 **“AI 上下文框架” (AI Context Framework)**。

这个项目的核心是 `context_framework.md` 文件。它是一个结构化的、全面的文档，旨在提供给任何 AI 模型（如 Gemini, ChatGPT, Claude 等），使其对我们公司、产品、战略和品牌声音有一个深入且一致的理解。

你可以把这个文件想象成一个我们预先喂给 AI 的 **“公司大脑”** 或 **“核心读物”**，然后再让它执行任何任务。

## **2. 为什么它很重要？**

使用这个标准化的上下文至关重要，原因如下：

* **一致性:** 确保所有 AI 生成的内容——无论是公关文章、推文还是技术文档——都与我们的品牌声音、信息和官方资料保持一致。
* **高效率:** 显著节省时间。我们无需每次都向 AI 解释我们是谁，而是一步到位地提供一个完整的、预先批准的上下文。
* **高质量:** 通过提供高质量、结构化的信息，AI 可以生成更准确、更相关、更有洞察力的输出。
* **保密性:** `[INTERNAL_ONLY]` 标签系统建立了一道安全屏障，允许我们为 AI 提供敏感的战略背景以辅助其进行更好的推理，同时严格禁止它在输出中泄露这些信息。
* **协同合作:** 它是一个集中的知识库，整个团队可以通过 GitHub 来协同维护。

## **3. 如何使用**

使用方法非常简单，遵循以下三步流程：

1.  **复制:** 打开 `context_framework.md` 文件，复制其全部内容。
2.  **粘贴:** 在你选择的 AI 工具的聊天窗口中，将复制的内容粘贴到新对话的最开头。
3.  **提问:** 在粘贴的上下文之后，添加你的具体请求或问题。一个好的做法是使用 `---` 这样的分隔符将上下文和你的提示分开。

### **使用示例**

**❌ 不佳的提示 (无上下文):**
> 写一条关于 Codatta 愿景的推文。

*结果: AI 可能会根据过时的公开数据，给出一个非常笼统、模糊甚至错误的答案。*

**✅ 优秀的提示 (有上下文):**
> *[在此处粘贴 context_framework.md 的全部内容]*
>
> ---
>
> **我的提示:** 基于以上提供的上下文，为我们的开发者受众写一条推文，抓住我们 "Knowledge-Fi" 愿景的精髓。

*结果: AI 将使用上下文中详细、最新的信息、关键词和品牌声音，生成一条高质量、有针对性且符合品牌调性的推文。*

## **4. 如何添加或更新信息**

这是一个动态的资源，它的价值在于保持最新。

* **提议更改:** 如果你发现 `context_framework.md` 中有信息已过时或想添加新内容，请在此 GitHub 仓库中创建一个 **Pull Request (PR)**。
* **讨论更改:** 在你的 PR 中，请清晰地描述你所做的更改及其原因。这有助于团队在主文档更新前进行审查和讨论。
* **保持结构:** 添加新信息时，请遵守现有的 Markdown 结构和 `[INTERNAL_ONLY]` 标签约定。

## **5. 黄金法则**

**永远尊重 `[INTERNAL_ONLY]` 标签。** 这些标签中的信息是从 AI 获取高质量战略性输出的关键，但绝不能公开发布。请务必仔细检查 AI 生成的内容，确保它没有无意中泄露敏感细节。
