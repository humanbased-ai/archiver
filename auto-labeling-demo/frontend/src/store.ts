export interface ActionLabel {
  id: string
  key: string
  label: string
  value: string
  color: string
}

export const COLOR_MAP: Record<string, { bg: string; border: string; text: string; active: string; dot: string }> = {
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-700',     active: 'bg-sky-500 text-white shadow-md shadow-sky-500/20 scale-[1.02]',     dot: 'bg-sky-400' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    active: 'bg-blue-500 text-white shadow-md shadow-blue-500/20 scale-[1.02]',    dot: 'bg-blue-400' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  active: 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 scale-[1.02]',  dot: 'bg-indigo-400' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  active: 'bg-violet-500 text-white shadow-md shadow-violet-500/20 scale-[1.02]',  dot: 'bg-violet-400' },
  fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700', active: 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20 scale-[1.02]', dot: 'bg-fuchsia-400' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    active: 'bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-[1.02]',    dot: 'bg-rose-400' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  active: 'bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]',  dot: 'bg-orange-400' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   active: 'bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]',   dot: 'bg-amber-400' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', active: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]', dot: 'bg-emerald-400' },
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-600',   active: 'bg-slate-700 text-white shadow-md shadow-slate-500/20 scale-[1.02]',   dot: 'bg-slate-400' },
}

export const COLOR_OPTIONS = Object.keys(COLOR_MAP)

export const DEFAULT_LABELS: ActionLabel[] = [
  { id: '1', key: '1', label: '折叠纸箱',   value: 'fold_box',      color: 'sky' },
  { id: '2', key: '2', label: '折叠毛巾',   value: 'fold_textile',  color: 'emerald' },
  { id: '3', key: '3', label: '装袋/打包',  value: 'packing',       color: 'violet' },
  { id: '4', key: '4', label: '取放物品',   value: 'pick_place',    color: 'amber' },
  { id: '5', key: '5', label: '其他有效动作', value: 'other_valid', color: 'slate' },
]

export interface Job {
  id: string
  filename: string
  task_name: string
  scenario_code: string
  status: 'processing' | 'ready' | 'failed'
  created_at: string
  parent_job_id?: string | null
  file_hash?: string | null
}

export interface Clip {
  id: string
  start_ms: number
  end_ms: number
  start_ns: number | null
  end_ns: number | null
  clip_url: string | null
  frame_urls: string[] | null
  fps: number | null
  thumb_url: string | null
  blur_score: number | null
  brightness: number | null
  is_reviewed: boolean
  is_valid: boolean
  human_label: string | null
}

export interface LabelingMeta {
  taskname: string
  start_time: number
  end_time: number
  description: string
  scenario_code: string
}

import type { CulledFrameRecord } from './api'
import type { SubClipLabel } from './components/SegmentTimeline'

/** Per-segment editing state (mirrors SliceTab internal state) */
export interface SegState {
  frames: CulledFrameRecord[]
  extensionLeft: number
  extensionRight: number
  keyframes: number[]
  subClipLabels: SubClipLabel[]
}

/** Saved cull review result (lightweight — only stores IDs, not full segment data) */
export interface SavedCullResult {
  id: string
  name: string
  createdAt: number
  validSegmentIds: string[]      // IDs of segments marked valid
  totalSegments: number          // for display
  validCount: number             // for display
  invalidCount: number           // for display
}

/** Saved slice draft */
export interface SavedSliceDraft {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  cullResultId: string
  segStatesEntries: [string, SegState][]
  workingSegmentIds: string[]
}

/** Saved annotation result (lightweight — stores item IDs + labels, not frames) */
export interface SavedAnnotateResult {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  /** Map of item.id → label value */
  itemLabels: Record<string, string | null>
  totalCount: number
  labeledCount: number
}

const JOBS_KEY = 'al_jobs'
const LABELS_KEY = 'al_action_labels'
const clipsKey = (jobId: string) => `al_clips_${jobId}`
const culledKey = (jobId: string) => `al_culled_${jobId}`
const allSegsKey = (jobId: string) => `al_all_segs_${jobId}`
const validSegKey = (jobId: string) => `al_valid_segs_${jobId}`
const slicesKey = (jobId: string) => `al_slices_${jobId}`
const cullResultsKey = (jobId: string) => `al_cull_results_${jobId}`
const sliceDraftsKey = (jobId: string) => `al_slice_drafts_${jobId}`
const annotateResultsKey = (jobId: string) => `al_annotate_results_${jobId}`
const annotateItemsKey = (jobId: string) => `al_annotate_items_${jobId}`

function parse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.error(`[store] Failed to save key "${key}":`, e)
    return false
  }
}

export const store = {
  // ── Jobs ──────────────────────────────────────────────
  getJobs(): Job[] {
    return parse<Job[]>(JOBS_KEY, [])
  },

  upsertJob(job: Job) {
    const jobs = this.getJobs().filter(j => j.id !== job.id)
    save(JOBS_KEY, [job, ...jobs])
  },

  patchJob(id: string, patch: Partial<Job>) {
    const jobs = this.getJobs().map(j => (j.id === id ? { ...j, ...patch } : j))
    save(JOBS_KEY, jobs)
  },

  getJob(id: string): Job | undefined {
    return this.getJobs().find(j => j.id === id)
  },

  removeJob(id: string) {
    const jobs = this.getJobs().filter(j => j.id !== id)
    save(JOBS_KEY, jobs)
    localStorage.removeItem(clipsKey(id))
    localStorage.removeItem(culledKey(id))
    localStorage.removeItem(allSegsKey(id))
    localStorage.removeItem(validSegKey(id))
    localStorage.removeItem(slicesKey(id))
    localStorage.removeItem(cullResultsKey(id))
    localStorage.removeItem(sliceDraftsKey(id))
    localStorage.removeItem(annotateResultsKey(id))
    localStorage.removeItem(annotateItemsKey(id))
  },

  // ── Clips ─────────────────────────────────────────────
  getClips(jobId: string): Clip[] {
    return parse<Clip[]>(clipsKey(jobId), [])
  },

  saveClips(jobId: string, clips: Clip[]) {
    save(clipsKey(jobId), clips)
  },

  patchClip(jobId: string, clipId: string, patch: Partial<Clip>): Clip[] {
    const clips = this.getClips(jobId).map(c => (c.id === clipId ? { ...c, ...patch } : c))
    this.saveClips(jobId, clips)
    return clips
  },

  // ── All Segments (keep + culled, persisted for backend-restart recovery) ──
  getAllSegments<T = unknown>(jobId: string): T[] {
    return parse<T[]>(allSegsKey(jobId), [])
  },

  saveAllSegments<T = unknown>(jobId: string, segments: T[]) {
    save(allSegsKey(jobId), segments)
  },

  // ── Culled Segments ───────────────────────────────────────────────
  getCulledSegments<T = unknown>(jobId: string): T[] {
    return parse<T[]>(culledKey(jobId), [])
  },

  saveCulledSegments<T = unknown>(jobId: string, segments: T[]) {
    save(culledKey(jobId), segments)
  },

  removeCulledSegment<T extends { id: string }>(jobId: string, segmentId: string): T[] {
    const segments = this.getCulledSegments<T>(jobId).filter((s) => s.id !== segmentId)
    this.saveCulledSegments(jobId, segments)
    return segments
  },

  // ── Valid Segments (from cull review) ────────────────
  getValidSegments<T = unknown>(jobId: string): T[] {
    return parse<T[]>(validSegKey(jobId), [])
  },

  saveValidSegments<T = unknown>(jobId: string, segments: T[]) {
    save(validSegKey(jobId), segments)
  },

  // ── Slices ─────────────────────────────────────────────
  getSlices<T = unknown>(jobId: string): T[] {
    return parse<T[]>(slicesKey(jobId), [])
  },

  saveSlices<T = unknown>(jobId: string, slices: T[]) {
    save(slicesKey(jobId), slices)
  },

  // ── Labels ────────────────────────────────────────────
  getLabels(): ActionLabel[] {
    return parse<ActionLabel[]>(LABELS_KEY, DEFAULT_LABELS)
  },

  saveLabels(labels: ActionLabel[]) {
    save(LABELS_KEY, labels)
  },

  resetLabels() {
    localStorage.removeItem(LABELS_KEY)
  },

  // ── Cull Results ────────────────────────────────────────
  getCullResults(jobId: string): SavedCullResult[] {
    return parse<SavedCullResult[]>(cullResultsKey(jobId), [])
  },

  saveCullResult(jobId: string, result: SavedCullResult) {
    const list = this.getCullResults(jobId).filter(r => r.id !== result.id)
    save(cullResultsKey(jobId), [result, ...list])
  },

  removeCullResult(jobId: string, resultId: string) {
    const list = this.getCullResults(jobId).filter(r => r.id !== resultId)
    save(cullResultsKey(jobId), list)
    // Cascade delete associated drafts
    const drafts = this.getSliceDrafts(jobId).filter(d => d.cullResultId !== resultId)
    save(sliceDraftsKey(jobId), drafts)
  },

  // ── Slice Drafts ───────────────────────────────────────
  getSliceDrafts(jobId: string): SavedSliceDraft[] {
    return parse<SavedSliceDraft[]>(sliceDraftsKey(jobId), [])
  },

  saveSliceDraft(jobId: string, draft: SavedSliceDraft) {
    const list = this.getSliceDrafts(jobId).filter(d => d.id !== draft.id)
    save(sliceDraftsKey(jobId), [draft, ...list])
  },

  removeSliceDraft(jobId: string, draftId: string) {
    const list = this.getSliceDrafts(jobId).filter(d => d.id !== draftId)
    save(sliceDraftsKey(jobId), list)
  },

  // ── Annotate Results ────────────────────────────────────
  getAnnotateResults(jobId: string): SavedAnnotateResult[] {
    return parse<SavedAnnotateResult[]>(annotateResultsKey(jobId), [])
  },

  saveAnnotateResult(jobId: string, result: SavedAnnotateResult) {
    const list = this.getAnnotateResults(jobId).filter(r => r.id !== result.id)
    save(annotateResultsKey(jobId), [result, ...list])
  },

  removeAnnotateResult(jobId: string, resultId: string) {
    const list = this.getAnnotateResults(jobId).filter(r => r.id !== resultId)
    save(annotateResultsKey(jobId), list)
  },

  // ── Annotate Items (full item data for independent tab access) ──
  getAnnotateItems<T = unknown>(jobId: string): T[] {
    return parse<T[]>(annotateItemsKey(jobId), [])
  },

  saveAnnotateItems<T = unknown>(jobId: string, items: T[]) {
    save(annotateItemsKey(jobId), items)
  },

  // ── Export ────────────────────────────────────────────
  buildExport(jobId: string): LabelingMeta[] {
    const job = this.getJob(jobId)
    if (!job) return []
    return this.getClips(jobId)
      .filter(c => c.is_reviewed && c.is_valid)
      .map(c => ({
        taskname: job.task_name,
        start_time: c.start_ns ?? c.start_ms,
        end_time: c.end_ns ?? c.end_ms,
        description: c.human_label ?? '',
        scenario_code: job.scenario_code,
      }))
  },
}
