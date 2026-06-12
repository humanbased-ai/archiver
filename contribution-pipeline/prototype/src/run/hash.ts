/** SHA-1 of an ArrayBuffer as hex string */
export async function sha1Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", buf);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 读取 File 的二进制, 计算 SHA-1 */
export async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  return sha1Hex(buf);
}

/**
 * 从 dataUrl 再计算一次 hash (用于已加载的预览图也能算).
 * 如果已经有 precomputed, 直接返回.
 */
export async function hashDataUrl(dataUrl: string): Promise<string> {
  const b64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return sha1Hex(bytes.buffer);
}

/**
 * 把完整 hash 截断成 similarityKey,
 * 模拟感知哈希的"近似"效果: 前 `bits/4` 个 hex 字符相同即判为相似.
 */
export function similarityKey(hash: string, thresholdBits: number): string {
  const chars = Math.max(1, Math.floor(thresholdBits / 4));
  return hash.slice(0, chars);
}
