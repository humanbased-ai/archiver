# Fingerprint Verification

## Purpose

**Scope:** Tasks from the **Binance Booster Campaign**.&#x20;

**Goal:** Let contributors independently verify that their valid data contributions were **correctly, completely, and tamper-proof** recorded on-chain by comparing data fingerprints for consistency.

***

## Preparation

### Retrieve your on-chain fingerprint via the block explorer

**Steps**

*   Open the block explorer

    [https://basescan.org/address/0xd0A4950C096daC5Ae5A0f74Ff3eE316d74558974#readContract.](https://basescan.org/address/0xd0A4950C096daC5Ae5A0f74Ff3eE316d74558974#readContract.)
* Call the `getUserRecords` method.

<figure><img src="https://chaintool.sg.larksuite.com/space/api/box/stream/download/asynccode/?code=ZDQ0ZmNlMzE1OTU5NmZlNGU2ZGIyYTZmNDdiM2E1MTNfc1IwNTkwOUdMS2Y3VVZUeXR0YnJYSTFtT2IwdUt4OExfVG9rZW46S2xhM2JDbUY2b3J6M2l4aDBFVWxLbWx2Z25oXzE3NjAwNjIyNTU6MTc2MDA2NTg1NV9WNA" alt=""><figcaption></figcaption></figure>

* Enter parameters:
  * `user`: your wallet address
  * `page`: page index, enter `0`
  * `size`: items per page, enter `1000`
* Click **Query** to get the result:
  * `rets`: an array that may contain multiple records, in the shape `[[submissionID, fingerprint]]`, where:
    * `submissionID`: e.g., `2025082903351000xxxxxx`
    * `fingerprint`: e.g.,`0x3f287de1fac99c807b8b23e67fa41b6e8547c45a7c37868f71457b1400xxxxxx`
  * `end`: whether the query is finished
    * `true`: finished
    * `false`: not finished — increase `page` and repeat until `end` is `true`.

**Note:**

* **1 fingerprint = 1 valid contribution.**
* The number of fingerprints equals the number of valid contributions recorded for that address.

***

### Aggregate your contribution data

Your contribution consists of **X-Data** and **Y-Data**.

* **X-Data**: original/raw data
* **Y-Data**: annotated/label data

**Example (food labeling task)**

* **X-Data**
  * Image (the original food image you uploaded)
* **Y-Data**
  * Food Name
  * Food Category
  * Brand / Store
  * Region
  * Quantity of food

All of the above are user-submitted. You can reconstruct and save them yourself.**Fill the template exactly as originally submitted**

> (replace the values in `<>`; if it was empty, use an empty string `""`). Case, spaces, punctuation, and brackets must match exactly.

```json
{
  "brand": "<brand/store at the time; empty string if none>",
  "images": [
    {
      "hash": "e6b024a0a5b3f202667300f3621190e666a52cadfd715664cd2e082cb0d3e03a"
    }
  ],
  "region": "the region you selected, e.g. PK",
  "foodName": "the Food Name you entered at the time",
  "quantity": "the exact dropdown text, e.g. Individual (1 person)",
  "foodCategory": "the exact category text you selected"
}
```

**Image hashing:** Because raw images are large, we typically include their **SHA-256** hash in the fingerprint input.

* Use an online tool (drag the image to the input box to get a SHA-256 hash), **or**
* Compute it yourself with a script/tool of your choice.

***

### Collect auxiliary fields

Alongside the contribution JSON, two auxiliary fields are used to generate the fingerprint:

* **Address\*** — your on-chain wallet address (identity).
* **Quality** — the rating of your contribution. After task review, the Codatta platform evaluates authenticity/completeness and assigns a rating. Only rated contributions are considered valid and recorded. For the food labeling example, ratings (high → low) are: S, A, B, C, D.

\
**Notes & strictness**

* Key names must mirror the task form exactly (e.g., `foodName`, `foodCategory`, `region`, `quantity`). Case and spelling must match the original form labels.
* Include all fields you completed on the task form. If you filled fields not listed in the template, add them with the exact original labels and values.
* Strict equality: any difference in key names / values / order (including spaces, case, punctuation) will change the fingerprint.
* If you forgot your original entries, you may look them up on the Codatta platform (if available).

***

## Generate the fingerprint (JCS → ABI.encode → keccak256)

Reconstruct the exact JSON from what you originally entered/uploaded in the form, then recompute the fingerprint **locally** using the public rules and compare it with the on-chain fingerprint, entry by entry, to complete independent verification.

**Step 1 | JCS-canonicalize the contribution JSON → produce `submissionData`**

Take the self-assembled raw JSON and canonicalize it using JCS. The canonicalized string is referred to as **`submissionData`**. You can follow the [https://github.com/codatta/submission-data-fingerprint/blob/main/tools/jcs.js](https://github.com/codatta/submission-data-fingerprint/blob/main/tools/jcs.js) to implement this.

**Step 2 | ABI-encode the contribution data together with the auxiliary fields (Solidity) → produce `encodedData`**

Encode the tuple using Solidity ABI. You can implement this with ethers.js; an example is shown below (running it will output `encodedData`).

```javascript
const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "string", "string"],
        [address, quality, submissionData]
    );
```

quality accepts "S","A","B","C","D"," (use empty string "" if the task had no rating)You can follow the [https://github.com/codatta/submission-data-fingerprint/blob/main/tools/fingerprint.js#L8](https://github.com/codatta/submission-data-fingerprint/blob/main/tools/fingerprint.js#L8) to implement this。\


**Step 3 | Compute `keccak256` → obtain the local fingerprint `localFingerprint`**

Compute it with the following **ethers.js** code.

```javascript
const hash = ethers.keccak256(encodedData);
```

The calculation yields a **0x…** value — that is the **localFingerprint**. You can follow the [https://github.com/codatta/submission-data-fingerprint/blob/main/tools/fingerprint.js#L14](https://github.com/codatta/submission-data-fingerprint/blob/main/tools/fingerprint.js#L14) to implement this。

**Step 4 | Verify**

Using the on-chain `fingerprint` obtained in [Retrieve your on-chain fingerprint](fingerprint-verification.md#preparation) via the block explorer, compare it with `localFingerprint`:

**Result semantics**

*   `localFingerprint == onChainFingerprint` → **Verification successful**&#x20;

    _This JSON matches the fingerprint recorded on-chain; your data has not been tampered with._
* **No on-chain fingerprint found** for the specified address / submission → _This address has no contribution attested on-chain._
*   `localFingerprint != onChainFingerprint` → **Verification failed**&#x20;

    _A step may be incorrect; please recheck your JSON/address/quality or contact support._

> When your locally recomputed fingerprints match the on-chain records **entry by entry**, it proves that all corresponding contributions have been **completely, correctly, and immutably** recorded on-chain.

## **Verify Fingerprint**&#x20;

[https://onchain-data-verify.codatta.io/](https://onchain-data-verify.codatta.io/)
