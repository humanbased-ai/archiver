import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Play, Pause, Plus, Minus,
  Trash2, Undo2, Redo2, CheckCircle2, XCircle,
  RotateCcw, Bookmark, Save, ArrowLeftCircle, FolderOpen, FileText, Download,
} from 'lucide-react'
import { UnifiedSegment, CulledFrameRecord } from '../api'
import { SubClip, SubClipLabel } from './SegmentTimeline'
import FilmstripScrubber from './FilmstripScrubber'
import { store, SegState, SavedCullResult, SavedSliceDraft } from '../store'
import type { AnnotateItem } from './AnnotateTab'

// ─── Helpers ────────────────────────────────────────────────────────────────

function Kbd({ k }: { k: string }) {
  return (
    <span className="ml-1 inline-flex items-center px-1 py-px rounded bg-white/20 text-[9px] font-mono font-bold border border-white/30 leading-none">{k}</span>
  )
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const frac = ms % 1000
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(frac).padStart(3, '0')}`
}

function formatDur(ms: number) {
  if (ms < 1000) return `${ms}ms`
  const s = (ms / 1000).toFixed(1)
  return `${s}s`
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── Sub-clip derivation ────────────────────────────────────────────────────

function deriveSubClips(kfs: number[], totalFrames: number): SubClip[] {
  if (kfs.length < 2) return totalFrames > 0 ? [{ start: 0, end: totalFrames - 1 }] : []
  const sorted = [...kfs].sort((a, b) => a - b)
  const clips: SubClip[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    clips.push({
      start: sorted[i],
      end: i < sorted.length - 2 ? sorted[i + 1] - 1 : sorted[i + 1],
    })
  }
  return clips
}

// ─── Types ──────────────────────────────────────────────────────────────────

type HistEntry = {
  segStates: Map<string, SegState>
  selectedId: string | null
  playIdx: number
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  jobId: string
  validSegments: UnifiedSegment[]
  allSegments: UnifiedSegment[]
  fps: number
  initialCullResultId?: string | null
  onSliceComplete?: (subClips: { segId: string; start: number; end: number; label: SubClipLabel }[]) => void
  onHasLabelsChange?: (hasLabels: boolean) => void
  onGoAnnotate?: (items?: AnnotateItem[]) => void
}

// ─── Management Panel ───────────────────────────────────────────────────────

function ManagePanel({
  jobId,
  onLoadCullResult,
  onLoadDraft,
}: {
  jobId: string
  onLoadCullResult: (result: SavedCullResult) => void
  onLoadDraft: (draft: SavedSliceDraft) => void
}) {
  const [cullResults, setCullResults] = useState(() => store.getCullResults(jobId))
  const [drafts, setDrafts] = useState(() => store.getSliceDrafts(jobId))

  const refresh = useCallback(() => {
    setCullResults(store.getCullResults(jobId))
    setDrafts(store.getSliceDrafts(jobId))
  }, [jobId])

  const handleDeleteCullResult = useCallback((resultId: string) => {
    if (!confirm('删除该裁剪结果？关联的精切草稿也将被删除。')) return
    store.removeCullResult(jobId, resultId)
    refresh()
  }, [jobId, refresh])

  const handleDeleteDraft = useCallback((draftId: string) => {
    if (!confirm('删除该精切草稿？')) return
    store.removeSliceDraft(jobId, draftId)
    refresh()
  }, [jobId, refresh])

  if (cullResults.length === 0 && drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
        <FolderOpen size={28} className="text-slate-300" />
        <p className="text-sm">请先在「裁剪」步骤完成审核，有效时段将自动传入此处</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Cull Results */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen size={16} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700">裁剪结果</h2>
            <span className="text-[10px] text-slate-400">{cullResults.length} 个</span>
          </div>
          {cullResults.length === 0 ? (
            <p className="text-xs text-slate-400 pl-6">暂无保存的裁剪结果</p>
          ) : (
            <div className="space-y-1.5">
              {cullResults.map(result => {
                const relatedDrafts = drafts.filter(d => d.cullResultId === result.id)
                return (
                  <div key={result.id} className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">{result.name}</span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {result.validCount} 个有效时段
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatDate(result.createdAt)}
                        {relatedDrafts.length > 0 && (
                          <span className="ml-2 text-violet-500">{relatedDrafts.length} 个草稿</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onLoadCullResult(result)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors">
                      加载
                    </button>
                    <button
                      onClick={() => handleDeleteCullResult(result.id)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Slice Drafts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-700">精切草稿</h2>
            <span className="text-[10px] text-slate-400">{drafts.length} 个</span>
          </div>
          {drafts.length === 0 ? (
            <p className="text-xs text-slate-400 pl-6">暂无保存的精切草稿</p>
          ) : (
            <div className="space-y-1.5">
              {drafts.map(draft => {
                const cullResult = cullResults.find(r => r.id === draft.cullResultId)
                const totalSegs = draft.workingSegmentIds.length
                const annotated = draft.segStatesEntries.filter(([id, st]) =>
                  draft.workingSegmentIds.includes(id) && st.subClipLabels.some(l => l === 'annotate')
                ).length
                return (
                  <div key={draft.id} className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">{draft.name}</span>
                        {cullResult && (
                          <span className="text-[10px] text-slate-400">基于 {cullResult.name}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        已标注 {annotated}/{totalSegs} 段 · {formatDate(draft.updatedAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => onLoadDraft(draft)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 transition-colors">
                      继续编辑
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SliceTab({ jobId, validSegments, allSegments, fps, initialCullResultId, onSliceComplete, onHasLabelsChange, onGoAnnotate }: Props) {
  // ── Mode state
  const [mode, setMode] = useState<'manage' | 'edit'>('manage')
  const [activeCullResultId, setActiveCullResultId] = useState<string | null>(initialCullResultId ?? null)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // ── Session segments (may come from props or from store)
  const [sessionValidSegments, setSessionValidSegments] = useState<UnifiedSegment[]>(validSegments)
  const [sessionAllSegments, setSessionAllSegments] = useState<UnifiedSegment[]>(allSegments)

  // ── Build initial per-segment state
  const buildInitialStates = useCallback((segs: UnifiedSegment[]) => {
    const m = new Map<string, SegState>()
    for (const seg of segs) {
      m.set(seg.id, {
        frames: [...seg.frames],
        extensionLeft: 0,
        extensionRight: 0,
        keyframes: [0, seg.frames.length - 1],
        subClipLabels: [null],
      })
    }
    return m
  }, [])

  const [segStates, setSegStates] = useState<Map<string, SegState>>(() => buildInitialStates(sessionValidSegments))
  const [selectedId, setSelectedId] = useState<string | null>(() => sessionValidSegments[0]?.id ?? null)
  const [playIdx, setPlayIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(5)
  const [activeSubClip, setActiveSubClip] = useState<number | null>(null)
  const [subClipPlayRange, setSubClipPlayRange] = useState<{ start: number; end: number } | null>(null)
  const [showUnfinished, setShowUnfinished] = useState(false)
  // Preview frame index when hovering filmstrip (null = show playIdx)
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  // Split preview when hovering a divider: [leftFrame, rightFrame]
  const [dividerPreview, setDividerPreview] = useState<[number, number] | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Undo / Redo
  const MAX_HIST = 20
  const [undoStack, setUndoStack] = useState<HistEntry[]>([])
  const [redoStack, setRedoStack] = useState<HistEntry[]>([])
  const segStatesRef = useRef(segStates)
  const selectedIdRef = useRef(selectedId)
  const playIdxRef = useRef(playIdx)
  segStatesRef.current = segStates
  selectedIdRef.current = selectedId
  playIdxRef.current = playIdx

  // ── Auto-enter edit mode when coming from cull tab with fresh data
  const hasAutoEntered = useRef(false)
  useEffect(() => {
    if (hasAutoEntered.current) return
    if (validSegments.length > 0 && initialCullResultId) {
      hasAutoEntered.current = true
      setSessionValidSegments(validSegments)
      setSessionAllSegments(allSegments)
      setActiveCullResultId(initialCullResultId)
      setActiveDraftId(null)
      const states = buildInitialStates(validSegments)
      setSegStates(states)
      setSelectedId(validSegments[0]?.id ?? null)
      setPlayIdx(0)
      setPlaying(false)
      setActiveSubClip(null)
      setUndoStack([])
      setRedoStack([])
      setIsDirty(false)
      setMode('edit')
    }
  }, [validSegments, allSegments, initialCullResultId, buildInitialStates])

  // ── Load cull result → enter edit mode (reconstruct from allSegments prop)
  const handleLoadCullResult = useCallback((result: SavedCullResult) => {
    const validIds = new Set(result.validSegmentIds)
    const reconstructedValid = allSegments.filter(s => validIds.has(s.id))
    setSessionValidSegments(reconstructedValid)
    setSessionAllSegments(allSegments)
    setActiveCullResultId(result.id)
    setActiveDraftId(null)
    const states = buildInitialStates(reconstructedValid)
    setSegStates(states)
    setSelectedId(reconstructedValid[0]?.id ?? null)
    setPlayIdx(0)
    setPlaying(false)
    setActiveSubClip(null)
    setUndoStack([])
    setRedoStack([])
    setIsDirty(false)
    setMode('edit')
  }, [allSegments, buildInitialStates])

  // ── Load draft → enter edit mode
  const handleLoadDraft = useCallback((draft: SavedSliceDraft) => {
    // Reconstruct valid segments from allSegments prop + cull result IDs
    const cullResult = store.getCullResults(jobId).find(r => r.id === draft.cullResultId)
    if (!cullResult) {
      alert('找不到关联的裁剪结果，可能已被删除。')
      return
    }
    const validIds = new Set(cullResult.validSegmentIds)
    const reconstructedValid = allSegments.filter(s => validIds.has(s.id))
    setSessionValidSegments(reconstructedValid)
    setSessionAllSegments(allSegments)
    setActiveCullResultId(draft.cullResultId)
    setActiveDraftId(draft.id)
    // Restore segStates from draft
    const restoredStates = new Map<string, SegState>(draft.segStatesEntries)
    setSegStates(restoredStates)
    // Select first working segment
    const firstWorking = reconstructedValid.find(s => draft.workingSegmentIds.includes(s.id))
    setSelectedId(firstWorking?.id ?? null)
    setPlayIdx(0)
    setPlaying(false)
    setActiveSubClip(null)
    setUndoStack([])
    setRedoStack([])
    setIsDirty(false)
    setMode('edit')
  }, [jobId])

  // ── Save draft
  const handleSaveDraft = useCallback(() => {
    if (!activeCullResultId) return
    const workingSegmentIds = [...segStates.keys()]
    const now = Date.now()
    const draft: SavedSliceDraft = {
      id: activeDraftId ?? crypto.randomUUID(),
      name: activeDraftId
        ? store.getSliceDrafts(jobId).find(d => d.id === activeDraftId)?.name ?? `精切草稿 ${formatDate(now)}`
        : `精切草稿 ${formatDate(now)}`,
      createdAt: activeDraftId
        ? store.getSliceDrafts(jobId).find(d => d.id === activeDraftId)?.createdAt ?? now
        : now,
      updatedAt: now,
      cullResultId: activeCullResultId,
      segStatesEntries: [...segStates.entries()],
      workingSegmentIds,
    }
    store.saveSliceDraft(jobId, draft)
    setActiveDraftId(draft.id)
    setIsDirty(false)
  }, [jobId, activeCullResultId, activeDraftId, segStates])

  // ── Export slice data as JSON download
  // ── Build annotate items from current segStates
  const buildAnnotateItems = useCallback((): AnnotateItem[] => {
    const items: AnnotateItem[] = []
    for (const seg of sessionValidSegments) {
      const st = segStates.get(seg.id)
      if (!st) continue
      const kfs = st.keyframes
      const scs = deriveSubClips(kfs, st.frames.length)
      for (let i = 0; i < scs.length; i++) {
        const label = st.subClipLabels[i]
        if (label !== 'annotate') continue // only "annotate" sub-clips go to annotation
        const sc = scs[i]
        const scFrames = st.frames.slice(sc.start, sc.end + 1)
        const startF = scFrames[0]
        const endF = scFrames[scFrames.length - 1]
        items.push({
          id: `${seg.id}_sc${i}`,
          segmentId: seg.id,
          subClipIndex: i,
          frames: scFrames,
          startFrame: startF?.idx ?? sc.start,
          endFrame: endF?.idx ?? sc.end,
          startTimestampNs: startF?.timestamp_ns ?? null,
          endTimestampNs: endF?.timestamp_ns ?? null,
          label: null,
        })
      }
    }
    return items
  }, [sessionValidSegments, segStates])

  const handleExportSlice = useCallback(() => {
    handleSaveDraft()
    const job = store.getJob(jobId)
    const getTs = (frame: CulledFrameRecord | undefined) => frame?.timestamp_ns ?? null

    const exportData = {
      job_id: jobId,
      task_name: job?.task_name ?? '',
      scenario_code: job?.scenario_code ?? '',
      fps,
      exported_at: new Date().toISOString(),
      segments: [] as {
        segment_id: string
        start_idx: number
        end_idx: number
        start_timestamp_ns: number | null
        end_timestamp_ns: number | null
        sub_clips: {
          index: number
          start_frame: number
          end_frame: number
          start_timestamp_ns: number | null
          end_timestamp_ns: number | null
          frame_count: number
          label: string | null
        }[]
      }[],
    }

    for (const seg of sessionValidSegments) {
      const st = segStates.get(seg.id)
      if (!st) continue
      const kfs = st.keyframes
      const scs = deriveSubClips(kfs, st.frames.length)
      const subClips = scs.map((sc, i) => {
        const startF = st.frames[sc.start]
        const endF = st.frames[sc.end]
        return {
          index: i + 1,
          start_frame: startF?.idx ?? sc.start,
          end_frame: endF?.idx ?? sc.end,
          start_timestamp_ns: getTs(startF),
          end_timestamp_ns: getTs(endF),
          frame_count: sc.end - sc.start + 1,
          label: st.subClipLabels[i] ?? null,
        }
      })
      if (subClips.some(sc => sc.label !== null)) {
        const segStartF = st.frames[0]
        const segEndF = st.frames[st.frames.length - 1]
        exportData.segments.push({
          segment_id: seg.id,
          start_idx: seg.start_idx,
          end_idx: seg.end_idx,
          start_timestamp_ns: getTs(segStartF),
          end_timestamp_ns: getTs(segEndF),
          sub_clips: subClips,
        })
      }
    }

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `slice_${job?.task_name ?? jobId}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [jobId, segStates, sessionValidSegments, handleSaveDraft])

  // ── Back to manage
  const handleBackToManage = useCallback(() => {
    if (isDirty && !confirm('有未保存的更改，确定返回？')) return
    setMode('manage')
    setPlaying(false)
  }, [isDirty])

  // ── Current state helpers
  const selected = sessionValidSegments.find(s => s.id === selectedId) ?? null
  const state = selectedId ? segStates.get(selectedId) : undefined
  const currentFrames = state?.frames ?? []
  const n = currentFrames.length

  const currentKeyframes = useMemo(() => state?.keyframes ?? [0, Math.max(0, n - 1)], [state, n])
  const currentSubClips = useMemo(() => deriveSubClips(currentKeyframes, n), [currentKeyframes, n])
  const currentLabels = state?.subClipLabels ?? []

  // ── Sorted segment list for display
  const sortedSegments = useMemo(
    () => [...sessionValidSegments].sort((a, b) => a.start_idx - b.start_idx),
    [sessionValidSegments]
  )

  // ── All segments sorted (for finding neighbors)
  const allSorted = useMemo(
    () => [...sessionAllSegments].sort((a, b) => a.start_idx - b.start_idx),
    [sessionAllSegments]
  )

  // ── Push undo (+ dirty)
  const pushUndo = useCallback(() => {
    setUndoStack(s => [...s.slice(-(MAX_HIST - 1)), {
      segStates: new Map(segStatesRef.current),
      selectedId: selectedIdRef.current,
      playIdx: playIdxRef.current,
    }])
    setRedoStack([])
    setIsDirty(true)
  }, [])

  const handleUndo = useCallback(() => {
    setUndoStack(stack => {
      if (!stack.length) return stack
      const entry = stack[stack.length - 1]
      setRedoStack(r => [{
        segStates: new Map(segStatesRef.current),
        selectedId: selectedIdRef.current,
        playIdx: playIdxRef.current,
      }, ...r.slice(0, MAX_HIST - 1)])
      setSegStates(entry.segStates)
      setSelectedId(entry.selectedId)
      setPlayIdx(entry.playIdx)
      setPlaying(false)
      return stack.slice(0, -1)
    })
    setIsDirty(true)
  }, [])

  const handleRedo = useCallback(() => {
    setRedoStack(stack => {
      if (!stack.length) return stack
      const entry = stack[0]
      setUndoStack(s => [...s.slice(-(MAX_HIST - 1)), {
        segStates: new Map(segStatesRef.current),
        selectedId: selectedIdRef.current,
        playIdx: playIdxRef.current,
      }])
      setSegStates(entry.segStates)
      setSelectedId(entry.selectedId)
      setPlayIdx(entry.playIdx)
      setPlaying(false)
      return stack.slice(1)
    })
    setIsDirty(true)
  }, [])

  // ── Update segment state helper
  const updateState = useCallback((segId: string, patch: Partial<SegState>) => {
    pushUndo()
    setSegStates(prev => {
      const m = new Map(prev)
      const old = m.get(segId)
      if (!old) return prev
      m.set(segId, { ...old, ...patch })
      return m
    })
  }, [pushUndo])

  // ── Find neighbor frames for extension
  const findNeighborFrames = useCallback((segId: string, dir: 'left' | 'right'): CulledFrameRecord[] => {
    const segIdx = allSorted.findIndex(s => s.id === segId)
    if (segIdx < 0) return []
    if (dir === 'left' && segIdx > 0) {
      return allSorted[segIdx - 1].frames
    }
    if (dir === 'right' && segIdx < allSorted.length - 1) {
      return allSorted[segIdx + 1].frames
    }
    return []
  }, [allSorted])

  // ── Extension operations
  const extendSeg = useCallback((dir: 'left' | 'right', count: number) => {
    if (!selectedId || !state) return
    const neighborFrames = findNeighborFrames(selectedId, dir)
    if (dir === 'left') {
      const alreadyBorrowed = state.extensionLeft
      const available = neighborFrames.length - alreadyBorrowed
      const take = Math.min(count, available)
      if (take <= 0) return
      const borrowed = neighborFrames.slice(neighborFrames.length - alreadyBorrowed - take, neighborFrames.length - alreadyBorrowed)
      const newFrames = [...borrowed, ...state.frames]
      const newKfs = state.keyframes.map(k => k + take)
      updateState(selectedId, {
        frames: newFrames,
        extensionLeft: alreadyBorrowed + take,
        keyframes: newKfs,
        subClipLabels: state.subClipLabels,
      })
      setPlayIdx(i => i + take)
    } else {
      const alreadyBorrowed = state.extensionRight
      const available = neighborFrames.length - alreadyBorrowed
      const take = Math.min(count, available)
      if (take <= 0) return
      const borrowed = neighborFrames.slice(alreadyBorrowed, alreadyBorrowed + take)
      const newFrames = [...state.frames, ...borrowed]
      updateState(selectedId, {
        frames: newFrames,
        extensionRight: alreadyBorrowed + take,
        keyframes: [...state.keyframes.slice(0, -1), newFrames.length - 1],
        subClipLabels: state.subClipLabels,
      })
    }
  }, [selectedId, state, findNeighborFrames, updateState])

  const trimSeg = useCallback((dir: 'left' | 'right', count: number) => {
    if (!selectedId || !state || state.frames.length <= 1) return
    const trim = Math.min(count, state.frames.length - 1)
    if (trim <= 0) return
    pushUndo()
    if (dir === 'left') {
      const newFrames = state.frames.slice(trim)
      const extTrimmed = Math.min(trim, state.extensionLeft)
      const newExtLeft = state.extensionLeft - extTrimmed
      const newKfs = state.keyframes
        .map(k => k - trim)
        .filter(k => k >= 0 && k < newFrames.length)
      if (!newKfs.includes(0)) newKfs.unshift(0)
      if (!newKfs.includes(newFrames.length - 1)) newKfs.push(newFrames.length - 1)
      newKfs.sort((a, b) => a - b)
      const newSubClips = deriveSubClips(newKfs, newFrames.length)
      const newLabels = newSubClips.map((_, i) => state.subClipLabels[i] ?? null)
      setSegStates(prev => {
        const m = new Map(prev)
        m.set(selectedId, { ...state, frames: newFrames, extensionLeft: newExtLeft, keyframes: newKfs, subClipLabels: newLabels })
        return m
      })
      setPlayIdx(i => Math.max(0, i - trim))
    } else {
      const newFrames = state.frames.slice(0, state.frames.length - trim)
      const extTrimmed = Math.min(trim, state.extensionRight)
      const newExtRight = state.extensionRight - extTrimmed
      const newKfs = state.keyframes
        .filter(k => k < newFrames.length)
      if (!newKfs.includes(0)) newKfs.unshift(0)
      if (!newKfs.includes(newFrames.length - 1)) newKfs.push(newFrames.length - 1)
      newKfs.sort((a, b) => a - b)
      const newSubClips = deriveSubClips(newKfs, newFrames.length)
      const newLabels = newSubClips.map((_, i) => state.subClipLabels[i] ?? null)
      setSegStates(prev => {
        const m = new Map(prev)
        m.set(selectedId, { ...state, frames: newFrames, extensionRight: newExtRight, keyframes: newKfs, subClipLabels: newLabels })
        return m
      })
      setPlayIdx(i => Math.min(i, newFrames.length - 1))
    }
  }, [selectedId, state, pushUndo])

  // ── Keyframe operations
  const addKeyframe = useCallback(() => {
    if (!selectedId || !state) return
    if (playIdx <= 0 || playIdx >= state.frames.length - 1) return
    if (state.keyframes.includes(playIdx)) return
    const newKfs = [...state.keyframes, playIdx].sort((a, b) => a - b)
    const newSubClips = deriveSubClips(newKfs, state.frames.length)
    const kfIdx = newKfs.indexOf(playIdx)
    const newLabels = [...state.subClipLabels]
    newLabels.splice(kfIdx, 0, null)
    while (newLabels.length > newSubClips.length) newLabels.pop()
    while (newLabels.length < newSubClips.length) newLabels.push(null)
    updateState(selectedId, { keyframes: newKfs, subClipLabels: newLabels })
  }, [selectedId, state, playIdx, updateState])

  // Add keyframe at a specific position (used by filmstrip double-click)
  const addKeyframeAt = useCallback((pos: number) => {
    if (!selectedId || !state) return
    if (pos <= 0 || pos >= state.frames.length - 1) return
    if (state.keyframes.includes(pos)) return
    const newKfs = [...state.keyframes, pos].sort((a, b) => a - b)
    const newSubClips = deriveSubClips(newKfs, state.frames.length)
    const kfIdx = newKfs.indexOf(pos)
    const newLabels = [...state.subClipLabels]
    newLabels.splice(kfIdx, 0, null)
    while (newLabels.length > newSubClips.length) newLabels.pop()
    while (newLabels.length < newSubClips.length) newLabels.push(null)
    updateState(selectedId, { keyframes: newKfs, subClipLabels: newLabels })
  }, [selectedId, state, updateState])

  const removeKeyframe = useCallback(() => {
    if (!selectedId || !state) return
    const manualKfs = state.keyframes.filter((_, i) => i > 0 && i < state.keyframes.length - 1)
    if (manualKfs.length === 0) return
    let closest = manualKfs[0]
    let closestDist = Math.abs(playIdx - closest)
    for (const kf of manualKfs) {
      const dist = Math.abs(playIdx - kf)
      if (dist < closestDist) { closest = kf; closestDist = dist }
    }
    const kfIdx = state.keyframes.indexOf(closest)
    const newKfs = state.keyframes.filter(k => k !== closest)
    const newSubClips = deriveSubClips(newKfs, state.frames.length)
    const newLabels = [...state.subClipLabels]
    if (kfIdx > 0 && kfIdx < newLabels.length) {
      newLabels.splice(kfIdx, 1)
    }
    while (newLabels.length > newSubClips.length) newLabels.pop()
    while (newLabels.length < newSubClips.length) newLabels.push(null)
    updateState(selectedId, { keyframes: newKfs, subClipLabels: newLabels })
  }, [selectedId, state, playIdx, updateState])

  // Move a keyframe from one position to another (drag)
  const moveKeyframe = useCallback((oldIdx: number, newIdx: number) => {
    if (!selectedId || !state) return
    if (newIdx <= 0 || newIdx >= state.frames.length - 1) return
    if (state.keyframes.includes(newIdx)) return
    const kfPos = state.keyframes.indexOf(oldIdx)
    if (kfPos <= 0 || kfPos >= state.keyframes.length - 1) return // can't move edge kfs
    const newKfs = state.keyframes.map(k => k === oldIdx ? newIdx : k).sort((a, b) => a - b)
    const newSubClips = deriveSubClips(newKfs, state.frames.length)
    // Try to preserve labels by index
    const newLabels = newSubClips.map((_, i) => state.subClipLabels[i] ?? null)
    updateState(selectedId, { keyframes: newKfs, subClipLabels: newLabels })
  }, [selectedId, state, updateState])

  // Remove a specific keyframe by frame index
  const removeKeyframeAt = useCallback((kfIdx: number) => {
    if (!selectedId || !state) return
    const pos = state.keyframes.indexOf(kfIdx)
    if (pos <= 0 || pos >= state.keyframes.length - 1) return // can't remove edge
    const newKfs = state.keyframes.filter(k => k !== kfIdx)
    const newSubClips = deriveSubClips(newKfs, state.frames.length)
    const newLabels = [...state.subClipLabels]
    if (pos > 0 && pos < newLabels.length) newLabels.splice(pos, 1)
    while (newLabels.length > newSubClips.length) newLabels.pop()
    while (newLabels.length < newSubClips.length) newLabels.push(null)
    updateState(selectedId, { keyframes: newKfs, subClipLabels: newLabels })
  }, [selectedId, state, updateState])

  // Cycle sub-clip label: null → annotate → invalid → null (click on label track)
  const cycleSubClipLabel = useCallback((clipIdx: number) => {
    if (!selectedId || !state) return
    const cur = state.subClipLabels[clipIdx] ?? null
    const next: SubClipLabel = cur === null ? 'annotate' : cur === 'annotate' ? 'invalid' : null
    const newLabels = [...state.subClipLabels]
    newLabels[clipIdx] = next
    updateState(selectedId, { subClipLabels: newLabels })
    setActiveSubClip(clipIdx)
  }, [selectedId, state, updateState])

  // ── Sub-clip labeling
  const labelSubClip = useCallback((clipIdx: number, label: SubClipLabel) => {
    if (!selectedId || !state) return
    const newLabels = [...state.subClipLabels]
    newLabels[clipIdx] = newLabels[clipIdx] === label ? null : label
    updateState(selectedId, { subClipLabels: newLabels })
  }, [selectedId, state, updateState])

  // ── Delete segment from working set
  const deleteSeg = useCallback(() => {
    if (!selectedId) return
    pushUndo()
    const idx = sortedSegments.findIndex(s => s.id === selectedId)
    const newId = sortedSegments[idx + 1]?.id ?? sortedSegments[idx - 1]?.id ?? null
    setSegStates(prev => { const m = new Map(prev); m.delete(selectedId); return m })
    setSelectedId(newId)
    setPlayIdx(0)
    setPlaying(false)
    setActiveSubClip(null)
  }, [selectedId, sortedSegments, pushUndo])

  // ── Select segment
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setPlayIdx(0)
    setPlaying(false)
    setActiveSubClip(null)
    setSubClipPlayRange(null)
  }, [])

  // ── Playback (with optional sub-clip range constraint)
  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (!playing || n <= 1) return
    const rangeEnd = subClipPlayRange ? subClipPlayRange.end : n - 1
    timerRef.current = setInterval(() => {
      setPlayIdx(i => {
        if (i >= rangeEnd) {
          // Loop within sub-clip range if constrained
          if (subClipPlayRange) {
            return subClipPlayRange.start
          }
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, 1000 / playSpeed)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, playSpeed, n, subClipPlayRange])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // ── Set start / end at current frame
  const setStart = useCallback(() => {
    if (playIdx > 0) trimSeg('left', playIdx)
  }, [playIdx, trimSeg])

  const setEnd = useCallback(() => {
    if (n > 0 && playIdx < n - 1) trimSeg('right', n - 1 - playIdx)
  }, [playIdx, n, trimSeg])

  // ── Keyboard handler (only active in edit mode)
  useEffect(() => {
    if (mode !== 'edit') return
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tgt.tagName)) return

      if (e.ctrlKey || e.metaKey) {
        if (!e.altKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); handleUndo(); return }
        if (!e.altKey && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); handleRedo(); return }
        if (!e.altKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); handleSaveDraft(); return }
        return
      }
      if (e.altKey) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          setPlaying(prev => {
            if (!prev && playIdx >= n - 1) setPlayIdx(0)
            return !prev
          })
          break
        case 'ArrowLeft':
          e.preventDefault()
          setPlaying(false)
          setPlayIdx(i => Math.max(0, i - 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          setPlaying(false)
          setPlayIdx(i => Math.min(n - 1, i + 1))
          break
        case 'k': case 'K':
          e.preventDefault()
          // Add keyframe at hover position if available, otherwise at playhead
          { const kfPos = previewIdx ?? playIdx
            if (kfPos > 0 && kfPos < n - 1) addKeyframeAt(kfPos) }
          break
        case 'j': case 'J':
          e.preventDefault()
          removeKeyframe()
          break
        case '[': {
          e.preventDefault()
          const idx = sortedSegments.findIndex(s => s.id === selectedId)
          if (idx > 0) handleSelect(sortedSegments[idx - 1].id)
          break
        }
        case ']': {
          e.preventDefault()
          const idx = sortedSegments.findIndex(s => s.id === selectedId)
          if (idx < sortedSegments.length - 1) handleSelect(sortedSegments[idx + 1].id)
          break
        }
        case 'y': case 'Y':
          e.preventDefault()
          if (activeSubClip !== null) labelSubClip(activeSubClip, 'annotate')
          break
        case 'n': case 'N':
          e.preventDefault()
          if (activeSubClip !== null) labelSubClip(activeSubClip, 'invalid')
          break
        case 'Tab':
          e.preventDefault()
          if (currentSubClips.length > 0) {
            const next = activeSubClip === null ? 0 : (activeSubClip + 1) % currentSubClips.length
            setActiveSubClip(next)
            if (currentSubClips[next]) {
              setPlayIdx(currentSubClips[next].start)
              setSubClipPlayRange({ start: currentSubClips[next].start, end: currentSubClips[next].end })
              setPlaying(false)
            }
          }
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, selectedId, n, sortedSegments, addKeyframe, removeKeyframe, handleSelect, handleUndo, handleRedo, handleSaveDraft, activeSubClip, labelSubClip, currentSubClips])

  // ── Click sub-clip (sets play range constraint)
  const handleClickSubClip = useCallback((idx: number) => {
    if (activeSubClip === idx) {
      // Deselect
      setActiveSubClip(null)
      setSubClipPlayRange(null)
    } else {
      setActiveSubClip(idx)
      if (currentSubClips[idx]) {
        setPlayIdx(currentSubClips[idx].start)
        setSubClipPlayRange({ start: currentSubClips[idx].start, end: currentSubClips[idx].end })
        setPlaying(false)
      }
    }
  }, [currentSubClips, activeSubClip])

  // Play a single sub-clip (used by left panel play button)
  const playSubClip = useCallback((idx: number) => {
    if (!currentSubClips[idx]) return
    setActiveSubClip(idx)
    const sc = currentSubClips[idx]
    setSubClipPlayRange({ start: sc.start, end: sc.end })
    setPlayIdx(sc.start)
    setPlaying(true)
  }, [currentSubClips])

  // ── Current segment index in sorted list
  const segIdx = sortedSegments.findIndex(s => s.id === selectedId)

  // ── Segments that still have states (not deleted)
  const workingSegments = useMemo(
    () => sortedSegments.filter(s => segStates.has(s.id)),
    [sortedSegments, segStates]
  )

  // ── Unfinished segments: segments where not all sub-clips have a label
  // A segment is "finished" if at least one sub-clip has been labeled (annotate or invalid)
  const unfinishedSegments = useMemo(() => {
    return workingSegments.filter(seg => {
      const st = segStates.get(seg.id)
      if (!st) return true
      const subClips = deriveSubClips(st.keyframes, st.frames.length)
      if (subClips.length === 0) return true
      // Finished = at least one sub-clip has a label
      const hasAnyLabel = st.subClipLabels.some((l, i) => i < subClips.length && (l === 'annotate' || l === 'invalid'))
      return !hasAnyLabel
    })
  }, [workingSegments, segStates])

  // ── Can extend?
  const canExtendLeft = selectedId ? findNeighborFrames(selectedId, 'left').length - (state?.extensionLeft ?? 0) > 0 : false
  const canExtendRight = selectedId ? findNeighborFrames(selectedId, 'right').length - (state?.extensionRight ?? 0) > 0 : false

  // ── Manual keyframe count
  const manualKfCount = currentKeyframes.length - 2

  // ── Notify parent when any sub-clip has a label
  useEffect(() => {
    let hasAny = false
    for (const [, st] of segStates) {
      if (st.subClipLabels.some(l => l === 'annotate' || l === 'invalid')) {
        hasAny = true
        break
      }
    }
    onHasLabelsChange?.(hasAny)
  }, [segStates, onHasLabelsChange])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (mode === 'manage') {
    return (
      <div className="flex flex-col h-full">
        <ManagePanel
          jobId={jobId}
          onLoadCullResult={handleLoadCullResult}
          onLoadDraft={handleLoadDraft}
        />
      </div>
    )
  }

  // ── Edit mode: empty state check
  if (sessionValidSegments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
        <FolderOpen size={28} className="text-slate-300" />
        <p className="text-sm">请先在「裁剪」步骤完成审核，有效时段将自动传入此处</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Overview timeline */}
      <div className="flex w-full h-5 bg-slate-100 border-b border-slate-200 flex-shrink-0 cursor-pointer">
        {workingSegments.map((seg, i) => {
          const st = segStates.get(seg.id)
          const fc = st?.frames.length ?? seg.frame_count
          const total = workingSegments.reduce((a, s) => a + (segStates.get(s.id)?.frames.length ?? s.frame_count), 0)
          const w = Math.max(1, (fc / Math.max(1, total)) * 100)
          return (
            <div
              key={seg.id}
              onClick={() => handleSelect(seg.id)}
              className={`transition-all hover:brightness-110 border-r border-white/50 last:border-r-0 ${
                seg.id === selectedId ? 'bg-sky-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${w}%`, minWidth: 3 }}
              title={`片段 ${i + 1} · ${fc}帧`}
            />
          )
        })}
      </div>

      {/* Main area: Segment list + editing stage */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: segment list with inline sub-clips */}
        <div className="w-56 flex-shrink-0 border-r border-slate-100 bg-white overflow-y-auto p-2">
          {workingSegments.map((seg, i) => {
            const st = segStates.get(seg.id)
            const fc = st?.frames.length ?? seg.frame_count
            const isSelected = seg.id === selectedId
            const startMs = Math.round(seg.start_idx / fps * 1000)
            const endMs = Math.round((seg.end_idx + 1) / fps * 1000)
            const labels = st?.subClipLabels ?? []
            const annotated = labels.filter(l => l === 'annotate').length
            const totalSc = labels.length
            const kfs = st?.keyframes ?? [0, Math.max(0, fc - 1)]
            const scs = deriveSubClips(kfs, fc)

            return (
              <div key={seg.id} className="mb-1">
                <div
                  onClick={() => handleSelect(seg.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-[11px] ${
                    isSelected
                      ? 'bg-sky-50 border border-sky-300 ring-2 ring-sky-200'
                      : 'border border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-7 rounded overflow-hidden bg-black flex-shrink-0">
                    <img src={seg.thumb_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0 leading-tight">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600 font-semibold">{i + 1}</span>
                      <span className="text-[10px] text-slate-400">{fc}帧</span>
                      {st && st.extensionLeft + st.extensionRight > 0 && (
                        <span className="text-[9px] text-sky-500 font-medium">+{st.extensionLeft + st.extensionRight}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">
                      {formatMs(startMs)}–{formatMs(endMs)}
                    </div>
                    {totalSc > 1 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {labels.map((l, li) => (
                          <div key={li} className={`h-1 flex-1 rounded-full ${
                            l === 'annotate' ? 'bg-emerald-400' : l === 'invalid' ? 'bg-rose-400' : 'bg-slate-200'
                          }`} />
                        ))}
                      </div>
                    )}
                  </div>
                  {annotated > 0 && (
                    <span className="text-[9px] text-emerald-600 font-semibold flex-shrink-0">{annotated}/{totalSc}</span>
                  )}
                </div>

              </div>
            )
          })}
        </div>

        {/* Right: editing stage */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected && state ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
                <button
                  onClick={handleBackToManage}
                  title="返回管理面板"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0">
                  <ArrowLeftCircle size={12} />
                  返回
                </button>
                <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-700">片段 {segIdx + 1}</span>
                <span className="text-[11px] font-mono text-slate-500">
                  帧 {currentFrames[0]?.idx ?? '?'}–{currentFrames[n - 1]?.idx ?? '?'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {n}帧 · {formatDur(Math.round(n / fps * 1000))}
                </span>
                {(state.extensionLeft > 0 || state.extensionRight > 0) && (
                  <span className="text-[10px] text-sky-500 font-medium">
                    延展: 左{state.extensionLeft} 右{state.extensionRight}
                  </span>
                )}
                {manualKfCount > 0 && (
                  <span className="text-[10px] text-violet-500 font-medium">
                    {manualKfCount} 关键帧 · {currentSubClips.length} 子片段
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={handleSaveDraft}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors flex-shrink-0 ${
                      isDirty
                        ? 'bg-sky-500 text-white hover:bg-sky-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                    title="保存草稿 (Ctrl+S)">
                    <Save size={11} />
                    {isDirty ? '保存' : '已保存'}
                  </button>
                  <button
                    onClick={handleExportSlice}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0">
                    <Download size={11} />
                    导出精切
                  </button>
                  {onGoAnnotate && (
                    <button
                      onClick={() => {
                        if (unfinishedSegments.length === 0) {
                          handleSaveDraft()
                          onGoAnnotate(buildAnnotateItems())
                        } else {
                          setShowUnfinished(true)
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors flex-shrink-0">
                      进入标注 →
                    </button>
                  )}
                  <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
                  <button disabled={segIdx <= 0}
                    onClick={() => handleSelect(sortedSegments[segIdx - 1].id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-25">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[11px] text-slate-500 tabular-nums">{segIdx + 1}/{workingSegments.length}</span>
                  <button disabled={segIdx >= sortedSegments.length - 1}
                    onClick={() => handleSelect(sortedSegments[segIdx + 1].id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-25">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Frame viewer — shows previewIdx, divider split, or playIdx */}
              {(() => {
                const displayIdx = previewIdx ?? playIdx
                const displayFrame = currentFrames[displayIdx]
                const isSplit = dividerPreview !== null
                const leftFrame = isSplit ? currentFrames[dividerPreview[0]] : null
                const rightFrame = isSplit ? currentFrames[dividerPreview[1]] : null
                return (
                  <div className="flex-1 relative bg-black flex items-center justify-center min-h-[180px]">
                    {isSplit && leftFrame && rightFrame ? (
                      /* Split preview: left / right of divider */
                      <div className="flex items-stretch h-full w-full">
                        <div className="flex-1 relative flex items-center justify-center">
                          <img src={leftFrame.url} alt="" className="max-h-full max-w-full object-contain" />
                          <div className="absolute bottom-2 left-2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded font-mono">
                            ← 帧 {dividerPreview[0] + 1}
                          </div>
                        </div>
                        <div className="w-[2px] bg-red-500 flex-shrink-0 self-stretch" />
                        <div className="flex-1 relative flex items-center justify-center">
                          <img src={rightFrame.url} alt="" className="max-h-full max-w-full object-contain" />
                          <div className="absolute bottom-2 right-2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded font-mono">
                            帧 {dividerPreview[1] + 1} →
                          </div>
                        </div>
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] bg-red-500/80 text-white px-2 py-0.5 rounded font-semibold">
                          分割线预览
                        </div>
                      </div>
                    ) : (
                      /* Normal single-frame preview */
                      <>
                        {displayFrame && (
                          <img src={displayFrame.url} alt="" className="max-h-full max-w-full object-contain" />
                        )}
                        {n > 1 && (
                          <>
                            <button disabled={playIdx === 0}
                              onClick={() => { setPlaying(false); setPlayIdx(i => i - 1) }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70">
                              <ChevronLeft size={16} />
                            </button>
                            <button disabled={playIdx >= n - 1}
                              onClick={() => { setPlaying(false); setPlayIdx(i => i + 1) }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70">
                              <ChevronRight size={16} />
                            </button>
                          </>
                        )}
                        {state.extensionLeft > 0 && displayIdx < state.extensionLeft && (
                          <div className="absolute top-2 left-2 text-[10px] bg-sky-500/80 text-white px-1.5 py-0.5 rounded">延展区</div>
                        )}
                        {state.extensionRight > 0 && displayIdx >= n - state.extensionRight && (
                          <div className="absolute top-2 right-2 text-[10px] bg-sky-500/80 text-white px-1.5 py-0.5 rounded">延展区</div>
                        )}
                        {previewIdx !== null && (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] bg-black/60 text-white/90 px-2 py-0.5 rounded font-mono">
                            预览帧 {displayIdx + 1}/{n}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Playback controls — below video, left-aligned classic layout */}
              <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
                <button
                  onClick={() => { setPlaying(false); setPlayIdx(0); setSubClipPlayRange(null) }}
                  title="回到开头"
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors flex-shrink-0">
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => {
                    if (!playing && playIdx >= n - 1) {
                      setPlayIdx(0)
                    }
                    setPlaying(v => !v)
                  }}
                  title="播放/暂停 (Space)"
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shadow transition-colors flex-shrink-0">
                  {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>
                <div className="min-w-0">
                  <div className="text-sm font-mono font-semibold text-slate-700 tabular-nums leading-tight">
                    {playIdx + 1}<span className="text-slate-300 mx-0.5">/</span>{n}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono leading-tight">
                    帧#{currentFrames[playIdx]?.idx} · {formatMs(Math.round((currentFrames[playIdx]?.idx ?? 0) / fps * 1000))}
                  </div>
                </div>
                {subClipPlayRange && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium flex-shrink-0">
                    循环 #{activeSubClip !== null ? activeSubClip + 1 : '?'}
                  </span>
                )}
                <div className="flex gap-1 ml-auto flex-shrink-0">
                  {[3, 5, 10, 15].map(spd => (
                    <button key={spd} onClick={() => setPlaySpeed(spd)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        playSpeed === spd ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>{spd}fps</button>
                  ))}
                </div>
              </div>

              {/* Filmstrip Scrubber (replaces old timeline) */}
              <FilmstripScrubber
                frames={currentFrames}
                currentIdx={playIdx}
                extensionLeft={state.extensionLeft}
                extensionRight={state.extensionRight}
                keyframes={currentKeyframes}
                subClips={currentSubClips}
                subClipLabels={currentLabels}
                activeSubClip={activeSubClip}
                fps={fps}
                onSeek={idx => { setPlaying(false); setSubClipPlayRange(null); setPlayIdx(idx) }}
                onClickSubClip={handleClickSubClip}
                onAddKeyframe={addKeyframeAt}
                onMoveKeyframe={moveKeyframe}
                onRemoveKeyframe={removeKeyframeAt}
                onLabelSubClip={cycleSubClipLabel}
                onHoverFrame={setPreviewIdx}
                onHoverDivider={setDividerPreview}
              />

              {/* ═══ Toolbar ═══ */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-white border-t border-slate-100 flex-shrink-0 flex-wrap">
                {/* Extension — drag counters */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-sky-600 font-semibold select-none">←扩展</span>
                    <button onClick={() => { if (state.extensionLeft > 0) trimSeg('left', 1) }}
                      disabled={state.extensionLeft <= 0}
                      className="w-5 h-5 rounded flex items-center justify-center text-sky-600 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-25 text-[11px] font-bold">
                      −
                    </button>
                    <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5 min-w-[28px] text-center select-none">
                      {state.extensionLeft}
                    </span>
                    <button onClick={() => { if (state.extensionLeft < 20 && canExtendLeft) extendSeg('left', 1) }}
                      disabled={state.extensionLeft >= 20 || !canExtendLeft}
                      className="w-5 h-5 rounded flex items-center justify-center text-sky-600 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-25 text-[11px] font-bold">
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-sky-600 font-semibold select-none">扩展→</span>
                    <button onClick={() => { if (state.extensionRight > 0) trimSeg('right', 1) }}
                      disabled={state.extensionRight <= 0}
                      className="w-5 h-5 rounded flex items-center justify-center text-sky-600 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-25 text-[11px] font-bold">
                      −
                    </button>
                    <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5 min-w-[28px] text-center select-none">
                      {state.extensionRight}
                    </span>
                    <button onClick={() => { if (state.extensionRight < 20 && canExtendRight) extendSeg('right', 1) }}
                      disabled={state.extensionRight >= 20 || !canExtendRight}
                      className="w-5 h-5 rounded flex items-center justify-center text-sky-600 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-25 text-[11px] font-bold">
                      +
                    </button>
                  </div>
                </div>

                <div className="w-px h-4 bg-slate-200 flex-shrink-0" />

                {/* Keyframe */}
                <button onClick={addKeyframe}
                  disabled={playIdx <= 0 || playIdx >= n - 1 || currentKeyframes.includes(playIdx)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 disabled:opacity-25 transition-colors flex-shrink-0">
                  <Plus size={9} />分割<Kbd k="K" />
                </button>
                <button onClick={removeKeyframe}
                  disabled={manualKfCount === 0}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 disabled:opacity-25 transition-colors flex-shrink-0">
                  <Minus size={9} />删除<Kbd k="J" />
                </button>

                <div className="w-px h-4 bg-slate-200 flex-shrink-0" />

                {/* Active sub-clip label actions */}
                {activeSubClip !== null && (
                  <>
                    <button
                      onClick={() => labelSubClip(activeSubClip, 'annotate')}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all flex-shrink-0 ${
                        currentLabels[activeSubClip] === 'annotate'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                      }`}>
                      <CheckCircle2 size={9} />标注<Kbd k="Y" />
                    </button>
                    <button
                      onClick={() => labelSubClip(activeSubClip, 'invalid')}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all flex-shrink-0 ${
                        currentLabels[activeSubClip] === 'invalid'
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                      }`}>
                      <XCircle size={9} />无效<Kbd k="N" />
                    </button>
                  </>
                )}

                {/* Right: Undo/Redo + Delete */}
                <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                  <button onClick={handleUndo} disabled={!undoStack.length} title="撤销 Ctrl+Z"
                    className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-25 transition-colors">
                    <Undo2 size={12} />
                  </button>
                  <button onClick={handleRedo} disabled={!redoStack.length} title="重做 Ctrl+Y"
                    className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-25 transition-colors">
                    <Redo2 size={12} />
                  </button>
                  <div className="w-px h-4 bg-slate-200" />
                  <button onClick={deleteSeg} title="删除整段"
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100 transition-colors">
                    <Trash2 size={9} />删除
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              点击左侧片段开始精切
            </div>
          )}
        </div>

        {/* Right: sub-clip list panel */}
        {selected && state && currentSubClips.length > 0 && (
          <div className="w-48 flex-shrink-0 border-l border-slate-100 bg-white overflow-y-auto">
            {/* Summary header */}
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
              <div className="text-[11px] font-semibold text-slate-700">子片段</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-500">共 {currentSubClips.length} 段</span>
                {(() => {
                  const ac = currentLabels.filter(l => l === 'annotate').length
                  const ic = currentLabels.filter(l => l === 'invalid').length
                  return (
                    <>
                      {ac > 0 && <span className="text-[10px] text-emerald-600 font-medium">{ac} 标注</span>}
                      {ic > 0 && <span className="text-[10px] text-rose-500 font-medium">{ic} 无效</span>}
                    </>
                  )
                })()}
              </div>
            </div>
            {/* Sub-clip items */}
            <div className="p-2 space-y-1">
              {currentSubClips.map((sc, si) => {
                const scLabel = currentLabels[si] ?? null
                const scFrameCount = sc.end - sc.start + 1
                const isActiveSc = activeSubClip === si
                return (
                  <div
                    key={si}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all ${
                      isActiveSc
                        ? 'bg-sky-50 border border-sky-300 ring-1 ring-sky-200'
                        : 'border border-transparent hover:bg-slate-50'
                    }`}
                    onClick={() => handleClickSubClip(si)}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      scLabel === 'annotate' ? 'bg-emerald-400' : scLabel === 'invalid' ? 'bg-rose-400' : 'bg-slate-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600 font-semibold">#{si + 1}</span>
                        <span className="text-[9px] text-slate-400">{scFrameCount}帧</span>
                        {scLabel === 'annotate' && <span className="text-[8px] text-emerald-600 font-medium">标注</span>}
                        {scLabel === 'invalid' && <span className="text-[8px] text-rose-500 font-medium">无效</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); playSubClip(si) }}
                      className="w-5 h-5 rounded-full bg-slate-100 hover:bg-sky-100 flex items-center justify-center flex-shrink-0"
                      title={`播放子片段 ${si + 1}`}
                    >
                      <Play size={8} className="text-slate-500 ml-px" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Unfinished segments panel */}
        {showUnfinished && unfinishedSegments.length > 0 && (
          <div className="w-56 flex-shrink-0 border-l border-amber-200 bg-amber-50 overflow-y-auto flex flex-col">
            <div className="px-3 py-2 border-b border-amber-200 flex items-center justify-between">
              <div className="text-[11px] font-semibold text-amber-800">未完成片段 ({unfinishedSegments.length})</div>
              <button
                onClick={() => setShowUnfinished(false)}
                className="w-5 h-5 rounded flex items-center justify-center text-amber-500 hover:bg-amber-100"
                title="关闭"
              >
                <XCircle size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {unfinishedSegments.map((seg) => {
                const st = segStates.get(seg.id)
                const subClips = st ? deriveSubClips(st.keyframes, st.frames.length) : []
                const totalSc = subClips.length
                const labeledSc = st ? st.subClipLabels.filter((l, i) => i < totalSc && (l === 'annotate' || l === 'invalid')).length : 0
                const frameCount = st?.frames.length ?? seg.frame_count
                const segNum = workingSegments.indexOf(seg) + 1
                return (
                  <div
                    key={seg.id}
                    onClick={() => { handleSelect(seg.id); setShowUnfinished(false) }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all border ${
                      seg.id === selectedId
                        ? 'bg-amber-100 border-amber-300'
                        : 'border-transparent hover:bg-amber-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="text-amber-900 font-semibold">片段 #{segNum}</span>
                      <span className="text-[9px] text-amber-600">{frameCount}帧</span>
                    </div>
                    <div className="mt-0.5 ml-3.5 text-[9px] text-amber-700">
                      已标注 {labeledSc}/{totalSc} 子片段
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-3 py-2 border-t border-amber-200">
              <button
                onClick={() => { handleSaveDraft(); onGoAnnotate?.(buildAnnotateItems()) }}
                className="text-[10px] text-amber-700 hover:text-amber-900 underline underline-offset-2"
              >
                跳过未完成，直接进入标注
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
