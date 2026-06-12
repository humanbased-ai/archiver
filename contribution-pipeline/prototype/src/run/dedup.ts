import type { StepConfig } from "../types";
import type { RunItem, DedupInput } from "./types";
import { hashDataUrl, similarityKey, sha1Hex } from "./hash";
import { getFieldValues, valuesToStrings } from "./field-path";

/**
 * Dedup 字段类型枚举 = dedup 节点的 implementation key
 * = DedupInput 上的桶名.
 *
 * 每种类型一个 handler. 加新类型只需:
 *   1) DedupInput 加桶
 *   2) DedupFieldType 加 union
 *   3) HANDLERS 注册
 *   4) steps.ts 加配置 implementation
 */
export type DedupFieldType = keyof DedupInput;

/** 单条 item 经 dedup handler 处理后的判决 */
export interface DedupVerdict {
  hashes: string[];
  dedupKeys: string[];
  kept: boolean;
  duplicateOf: string | null;
  duplicateMatchKey?: string;
}

/**
 * 采集环节根据 **dedup 节点配置** 把 formData 中的字段抽取到固定桶 (DedupInput).
 *
 * 单一信息源: dedup 节点的 `implementation` 决定桶名, `source_field` 决定 formData 路径.
 * 直接图片上传 (kind=image, 无 formData) 自动用 item.dataUrl 兜底.
 */
export function buildDedupInput(
  item: Pick<RunItem, "dataUrl" | "kind" | "formData">,
  dedupConfig: StepConfig
): DedupInput {
  const bucket = dedupConfig.implementation as DedupFieldType;
  const sourceField = String(dedupConfig.params.source_field ?? "");

  // 1) 直接图片上传: 没有 formData, 把 dataUrl 直接塞进 images 桶 (不论 source_field)
  if (item.kind === "image" || !item.formData) {
    return item.dataUrl && bucket === "images" ? { images: [item.dataUrl] } : {};
  }

  // 2) 表单数据: 按 source_field 从 formData 抽值
  if (!sourceField) return {};
  const values = valuesToStrings(getFieldValues(item.formData, sourceField));
  if (values.length === 0) return {};
  return { [bucket]: values } as DedupInput;
}

/**
 * 入口: 对单条 item 即时判重.
 * dedup 只看 dedupInput, 不看 formData.
 */
export async function dedupAgainst(
  dedupInput: DedupInput,
  existing: RunItem[],
  stageConfig: StepConfig
): Promise<DedupVerdict> {
  const fieldType = stageConfig.implementation as DedupFieldType;
  const handler = HANDLERS[fieldType];
  if (!handler) return emptyKept();
  return handler(dedupInput, existing, stageConfig);
}

type Handler = (
  dedupInput: DedupInput,
  existing: RunItem[],
  stageConfig: StepConfig
) => Promise<DedupVerdict>;

const HANDLERS: Record<DedupFieldType, Handler> = {
  images: dedupImage,
  addresses: dedupCryptoAddress,
};

// ───────────────────────────────────────────────────────────── image handler ──

/**
 * image handler: 对 dedupInput.images 桶里的所有值做哈希比对.
 *  - data: URL → 二进制 SHA-1; 其他字符串 → UTF-8 SHA-1
 *  - algo: exact_hash | perceptual_hash | embedding
 */
async function dedupImage(
  dedupInput: DedupInput,
  existing: RunItem[],
  stageConfig: StepConfig
): Promise<DedupVerdict> {
  const algo = String(stageConfig.params.algo ?? "exact_hash");
  const threshold = Number(stageConfig.params.threshold ?? 0);

  const rawValues = dedupInput.images ?? [];
  if (rawValues.length === 0) return emptyKept();

  const hashes: string[] = [];
  for (const v of rawValues) hashes.push(await hashAny(v));
  const dedupKeys = hashes.map((h) => keyOf(algo, h, threshold));

  return matchAgainst(hashes, dedupKeys, existing);
}

async function hashAny(value: string): Promise<string> {
  if (value.startsWith("data:")) return hashDataUrl(value);
  const enc = new TextEncoder().encode(value);
  return sha1Hex(enc.buffer);
}

function keyOf(algo: string, hash: string, threshold: number): string {
  if (algo === "perceptual_hash") return similarityKey(hash, Math.max(4, threshold * 4));
  if (algo === "embedding") return similarityKey(hash, 6);
  return hash; // exact_hash
}

// ──────────────────────────────────────────────── crypto_address handler ──
// 当前为占位实现: 仅做字符串规范化后精确比对. 真实场景需按链解析校验.

async function dedupCryptoAddress(
  dedupInput: DedupInput,
  existing: RunItem[],
  stageConfig: StepConfig
): Promise<DedupVerdict> {
  const chain = String(stageConfig.params.chain ?? "any");
  const caseSensitive = String(stageConfig.params.case_sensitive ?? "false") === "true";

  const rawValues = dedupInput.addresses ?? [];
  if (rawValues.length === 0) return emptyKept();

  const normalized = rawValues.map((v) => normalizeAddress(v, chain, caseSensitive));
  const hashes: string[] = [];
  for (const v of normalized) hashes.push(await hashAny(v));
  const dedupKeys = hashes.slice(); // exact 比对

  return matchAgainst(hashes, dedupKeys, existing);
}

function normalizeAddress(addr: string, chain: string, caseSensitive: boolean): string {
  let s = addr.trim();
  if (chain === "evm") s = s.toLowerCase();
  if (!caseSensitive && chain !== "evm") s = s.toLowerCase();
  return s;
}

// ────────────────────────────────────────────────────────────────── shared ──

/** 用 dedupKeys 与历史 kept 项比对; 任一交集即重复 */
function matchAgainst(
  hashes: string[],
  dedupKeys: string[],
  existing: RunItem[]
): DedupVerdict {
  const known = existing.filter((i) => i.kept && i.dedupKeys && i.dedupKeys.length > 0);
  for (const k of dedupKeys) {
    const hit = known.find((i) => i.dedupKeys!.includes(k));
    if (hit) {
      return { hashes, dedupKeys, kept: false, duplicateOf: hit.id, duplicateMatchKey: k };
    }
  }
  return { hashes, dedupKeys, kept: true, duplicateOf: null };
}

function emptyKept(): DedupVerdict {
  return { hashes: [], dedupKeys: [], kept: true, duplicateOf: null };
}
