import { BlobReader, BlobWriter, TextReader, ZipReader, ZipWriter } from '@zip.js/zip.js'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'])
const META_NAMES = new Set(['extraction_info.json', 'extraction_info.txt'])

function getExt(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

function getBaseName(name: string): string {
  return name.split('/').pop() ?? name
}

interface CompressResult {
  blob: Blob
  w: number
  h: number
}

function compressImageBlob(blob: Blob, maxDim: number, quality = 0.82): Promise<CompressResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => resolve({ blob: b ?? blob, w, h }), 'image/jpeg', quality)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ blob, w: 0, h: 0 })
    }
    img.src = url
  })
}

// ── Metadata patching ───────────────────────────────────────────────────────

function patchMetaJson(text: string, w: number, h: number): string {
  try {
    const obj = JSON.parse(text)
    // Update any top-level width / height variants
    const wKeys = ['image_width',  'width',  'img_width',  'frame_width']
    const hKeys = ['image_height', 'height', 'img_height', 'frame_height']
    let changed = false
    for (const k of wKeys) if (k in obj) { obj[k] = w; changed = true }
    for (const k of hKeys) if (k in obj) { obj[k] = h; changed = true }
    // Update resolution string e.g. "1920x1080"
    for (const k of ['resolution', 'image_size', 'frame_size']) {
      if (typeof obj[k] === 'string' && /\d+\s*[x×]\s*\d+/i.test(obj[k])) {
        obj[k] = `${w}x${h}`
        changed = true
      }
    }
    // Update per-image entries if they carry width/height
    if (Array.isArray(obj.extracted_images)) {
      for (const img of obj.extracted_images) {
        if ('width'  in img) { img.width  = w; changed = true }
        if ('height' in img) { img.height = h; changed = true }
      }
    }
    return changed ? JSON.stringify(obj, null, 2) : text
  } catch {
    return text
  }
}

function patchMetaTxt(text: string, w: number, h: number): string {
  return text
    .split('\n')
    .map(line => {
      // Match "key: value" or "key = value" patterns
      const dimMatch = line.match(/^(\s*)([\w\u4e00-\u9fa5]+)\s*[:=]\s*(.+)$/)
      if (!dimMatch) {
        // CSV image list: 序号, 时间戳, 文件名, 宽度, 高度, 通道数
        const csvMatch = line.match(
          /^(.*?,\s*\d+,\s*[^,]+\.(?:jpg|jpeg|png|webp|bmp|tiff|tif),\s*)(\d+)(,\s*)(\d+)(,?.*)$/i
        )
        if (csvMatch) {
          const [, prefix, , sep, , suffix] = csvMatch
          return `${prefix}${w}${sep}${h}${suffix}`
        }
        return line
      }
      const [, indent, key, val] = dimMatch
      const keyLow = key.toLowerCase().replace(/[\s_]/g, '')
      // width-like keys
      if (['imagewidth','width','imgwidth','framewidth','图像宽度','宽度'].includes(keyLow)) {
        return `${indent}${key}: ${w}`
      }
      // height-like keys
      if (['imageheight','height','imgheight','frameheight','图像高度','高度'].includes(keyLow)) {
        return `${indent}${key}: ${h}`
      }
      // resolution "1920x1080" or "1920 x 1080"
      if (['resolution','imagesize','framesize','分辨率','图像尺寸','图片尺寸'].includes(keyLow)) {
        if (/\d+\s*[x×]\s*\d+/i.test(val)) return `${indent}${key}: ${w}x${h}`
      }
      return line
    })
    .join('\n')
}

// ────────────────────────────────────────────────────────────────────────────

export interface CompressZipOptions {
  maxDim: number
  quality?: number
  onProgress?: (pct: number, done: number, total: number) => void
}

export async function compressZip(file: File, opts: CompressZipOptions): Promise<Blob> {
  const { maxDim, quality = 0.82, onProgress } = opts

  const reader = new ZipReader(new BlobReader(file))
  const entries = await reader.getEntries()
  const fileEntries = entries.filter((e) => !e.directory)
  const total = fileEntries.length
  let done = 0

  // Collect actual compressed dimensions from first image
  let firstDim: { w: number; h: number } | null = null

  // Buffer metadata file contents (tiny — a few KB each)
  const metaBuffers = new Map<string, { name: string; originalText: string }>()

  // ── Pass 1: compress images, buffer metadata ───────────────────────────
  const processedEntries: Array<{ name: string; blob: Blob }> = []

  for (const entry of fileEntries) {
    const name = entry.filename
    const base = getBaseName(name)
    const ext = getExt(name)
    const entryBlob = await entry.getData!(new BlobWriter())

    if (META_NAMES.has(base)) {
      // Buffer as text for later patching
      const text = await entryBlob.text()
      metaBuffers.set(name, { name, originalText: text })
      processedEntries.push({ name, blob: entryBlob }) // placeholder, replaced below
    } else if (IMAGE_EXTS.has(ext)) {
      const result = await compressImageBlob(entryBlob, maxDim, quality)
      if (!firstDim && result.w > 0) firstDim = { w: result.w, h: result.h }
      const newName = ext === '.jpg' || ext === '.jpeg' ? name : name.replace(/\.[^.]+$/, '.jpg')
      processedEntries.push({ name: newName, blob: result.blob })
    } else {
      processedEntries.push({ name, blob: entryBlob })
    }

    done++
    onProgress?.(Math.round((done / total) * 100), done, total)
  }

  await reader.close()

  // ── Pass 2: write to output ZIP, patching metadata if we have dimensions ─
  const outBlobWriter = new BlobWriter('application/zip')
  const writer = new ZipWriter(outBlobWriter)

  for (const { name, blob } of processedEntries) {
    const base = getBaseName(name)
    if (META_NAMES.has(base) && firstDim && metaBuffers.has(name)) {
      const { originalText } = metaBuffers.get(name)!
      const patched = base.endsWith('.json')
        ? patchMetaJson(originalText, firstDim.w, firstDim.h)
        : patchMetaTxt(originalText, firstDim.w, firstDim.h)
      await writer.add(name, new TextReader(patched))
    } else {
      await writer.add(name, new BlobReader(blob))
    }
  }

  return writer.close()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
