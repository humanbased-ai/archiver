# Incentive Rules

One submitted data goes through the initial phase of AI Validation, where we will determine whether it has passed the review. If approved, the <mark style="color:purple;">`Data Value Estimation Model`</mark> will provide an incentive value, denoted as <mark style="color:purple;">`p`</mark>. The incentive <mark style="color:purple;">`p`</mark> is distributed in a ratio of 5-5-10-80 across the subsequent four phases.

\
The AI Validation is supported by the multi-modal capabilities of Large Language Models (LLMs), powered by Claude, Gemini, and OpenAI. The multi-modal verification is reflected in the effectiveness of the provided evidence data, which includes the validity of transaction addresses, label categories, transaction hashes, textual descriptions, evidence screenshots, as well as the effectiveness of their cross-verification.

\
The <mark style="color:purple;">`Data Value Estimation Model`</mark> estimates and assigns the incentive based on three major dimensions: `Address Importance`, `Label Importance`, and `Data Accuracy`. Specifically:

* `Address Importance` is reflected in the coverage of transaction traffic; the more transaction traffic, the more critical it is.
* `Label Importance` is dynamically adjusted based on the proportion distribution of category addresses; the rarer the category, the more critical it is.
* `Data Accuracy` is determined by the voting decisions of AI Validation and human validation during the validation process.

\
It should be noted that the incentive for the same address with the same label will diminish as the number of submissions increases.

**(Note: The project currently uses point incentives, which the project's tokens will replace after the airdrop.)**
