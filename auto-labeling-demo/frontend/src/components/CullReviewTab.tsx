import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight,
  Play, Pause, CheckCircle2,
  XCircle, Package, ExternalLink, Undo2,
  History, Trash2, Upload,
} from 'lucide-react'
import { api, CulledSegment, ClipInfo, UnifiedSegment } from '../api'
import { store, SavedCullResult } from '../store'

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const STATE_CONFIG: Record<string, { label: string; badge: string; bar: string; dot: string }> = {
  keep:              { label: '有效时段', badge: 'bg-emerald-50 text-emerald-600 border-emerald-300',  bar: 'bg-emerald-400', dot: 'bg-emerald-500' },
  review:            { label: '待审核',   badge: 'bg-orange-50 text-orange-600 border-orange-300',    bar: 'bg-orange-400',  dot: 'bg-orange-500' },
  culled_motion:     { label: '静止时段', badge: 'bg-slate-100 text-slate-500 border-slate-200',      bar: 'bg-slate-300',   dot: 'bg-slate-400' },
  culled_low_action: { label: '整理时段', badge: 'bg-amber-50 text-amber-600 border-amber-200',       bar: 'bg-amber-300',   dot: 'bg-amber-400' },
  culled_person:     { label: '无人时段', badge: 'bg-blue-50 text-blue-600 border-blue-200',          bar: 'bg-blue-300',    dot: 'bg-blue-400'  },
}

function stateCfg(state: string) {
  return STATE_CONFIG[state] ?? { label: state, badge: 'bg-slate-100 text-slate-500 border-slate-200', bar: 'bg-slate-300', dot: 'bg-slate-400' }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  jobId: string
  culledSegments: CulledSegment[]
  allSegments: UnifiedSegment[]
  clips: ClipInfo[]
  detector?: 'hog' | 'yolo' | 'pose'
  onCullReviewComplete?: (validSegments: UnifiedSegment[], poseLabels: Record<string, string>, cullResultId?: string) => void
}

// ─── MacroTimeline ──────────────────────────────────────────────────────────

function MacroTimeline({
  segments,
  selectedId,
  reviewDecisions,
  onSelect,
}: {
  segments: UnifiedSegment[]
  selectedId: string | null
  reviewDecisions: Map<string, 'valid' | 'invalid'>
  onSelect: (id: string) => void
}) {
  const totalFrames = segments.reduce((a, s) => a + s.frame_count, 0) || 1
  return (
    <div className="flex w-full h-6 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer flex-shrink-0">
      {segments.map(seg => {
        const w = Math.max(0.3, (seg.frame_count / totalFrames) * 100)
        const cfg = stateCfg(seg.state)
        const dec = reviewDecisions.get(seg.id)
        const isSelected = seg.id === selectedId
        let bgClass = cfg.bar
        if (dec === 'valid') bgClass = 'bg-emerald-500'
        else if (dec === 'invalid') bgClass = 'bg-red-400'
        return (
          <div
            key={seg.id}
            onClick={() => onSelect(seg.id)}
            title={`${cfg.label} · 帧 ${seg.start_idx}–${seg.end_idx} · ${seg.frame_count}帧`}
            className={`${bgClass} transition-all hover:brightness-110 relative border-r border-white/40 last:border-r-0 ${
              isSelected ? 'ring-2 ring-sky-500 ring-inset z-10' : ''
            }`}
            style={{ width: `${w}%`, minWidth: 3 }}
          >
            {isSelected && <div className="absolute inset-0 bg-white/30" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Semantic selection style ─────────────────────────────────────────────

function selectionClasses(state: string, dec?: 'valid' | 'invalid') {
  if (dec === 'invalid') return 'bg-red-50 border border-red-400 ring-2 ring-red-200'
  if (dec === 'valid') return 'bg-emerald-50 border border-emerald-400 ring-2 ring-emerald-200'
  switch (state) {
    case 'keep':              return 'bg-emerald-50 border border-emerald-400 ring-2 ring-emerald-200'
    case 'review':            return 'bg-orange-50 border border-orange-400 ring-2 ring-orange-200'
    case 'culled_motion':     return 'bg-slate-100 border border-slate-400 ring-2 ring-slate-200'
    case 'culled_low_action': return 'bg-amber-50 border border-amber-400 ring-2 ring-amber-200'
    case 'culled_person':     return 'bg-blue-50 border border-blue-400 ring-2 ring-blue-200'
    default:                  return 'bg-slate-100 border border-slate-400 ring-2 ring-slate-200'
  }
}

// ─── SegmentGrid ──────────────────────────────────────────────────────────

function SegmentGrid({
  segments,
  allSegments,
  selectedId,
  reviewDecisions,
  fps,
  sortMode,
  onSelect,
}: {
  segments: UnifiedSegment[]
  allSegments: UnifiedSegment[]  // original full list for stable index lookup
  selectedId: string | null
  reviewDecisions: Map<string, 'valid' | 'invalid'>
  fps: number
  sortMode: 'time' | 'type'
  onSelect: (id: string) => void
}) {
  const gridRef = useRef<HTMLDivElement>(null)

  // Build original-index lookup (stable across sort/filter)
  const origIndexMap = useMemo(() => {
    const m = new Map<string, number>()
    allSegments.forEach((s, i) => m.set(s.id, i + 1))
    return m
  }, [allSegments])

  useEffect(() => {
    if (!selectedId || !gridRef.current) return
    const el = gridRef.current.querySelector(`[data-seg-id="${selectedId}"]`) as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedId])

  // Track group headers in type sort mode
  let lastState = ''

  return (
    <div ref={gridRef} className="flex flex-col gap-1 overflow-y-auto pr-1" style={{ maxHeight: '100%' }}>
      {segments.map((seg) => {
        const cfg = stateCfg(seg.state)
        const dec = reviewDecisions.get(seg.id)
        const isSelected = seg.id === selectedId
        const startMs = Math.round(seg.start_idx / fps * 1000)
        const endMs = Math.round((seg.end_idx + 1) / fps * 1000)
        const origIdx = origIndexMap.get(seg.id) ?? 0

        // Group header for type sort mode
        let groupHeader: React.ReactNode = null
        if (sortMode === 'type' && seg.state !== lastState) {
          lastState = seg.state
          const groupCount = segments.filter(s => s.state === seg.state).length
          groupHeader = (
            <div key={`hdr-${seg.state}`} className="flex items-center gap-1.5 px-2 pt-2 pb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className={`text-[10px] font-semibold ${cfg.badge} px-1.5 py-px rounded border`}>
                {cfg.label}
              </span>
              <span className="text-[9px] text-slate-400">{groupCount}段</span>
            </div>
          )
        }

        return (
          <div key={seg.id}>
            {groupHeader}
            <div
              data-seg-id={seg.id}
              onClick={() => onSelect(seg.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-[11px] ${
                isSelected
                  ? selectionClasses(seg.state, dec)
                  : 'border border-transparent hover:bg-slate-50'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                dec === 'valid' ? 'bg-emerald-500'
                : dec === 'invalid' ? 'bg-red-400'
                : cfg.dot
              }`} />
              <div className="w-10 h-7 rounded overflow-hidden bg-black flex-shrink-0">
                <img src={seg.thumb_url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="flex items-center gap-1">
                  <span className="text-slate-600 font-medium">{origIdx}</span>
                  <span className={`px-1 py-px rounded text-[9px] font-semibold border ${cfg.badge}`}>{cfg.label}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate font-mono">
                  {formatMs(startMs)}–{formatMs(endMs)}
                </div>
              </div>
              {dec === 'valid' && <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />}
              {dec === 'invalid' && <XCircle size={12} className="text-red-400 flex-shrink-0" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CullReviewTab({
  jobId, culledSegments, allSegments, clips,
  onCullReviewComplete,
}: Props) {
  const propSource = (allSegments && allSegments.length > 0)
    ? allSegments
    : culledSegments as unknown as UnifiedSegment[]

  const [segments, setSegments] = useState<UnifiedSegment[]>(propSource)

  // Sync when props update (e.g. API fetch completes after mount)
  useEffect(() => {
    if (propSource.length > 0 && segments.length === 0) {
      setSegments(propSource)
    }
  }, [propSource])

  const fps = useMemo(() => clips.find(c => c.fps !== null)?.fps ?? 5, [clips])

  // ── Selection state
  const [selectedId, setSelectedId] = useState<string | null>(() => segments[0]?.id ?? null)
  const selectedSeg = segments.find(s => s.id === selectedId) ?? null

  // ── Inline playback
  const [inlineIdx, setInlineIdx] = useState(0)
  const [inlinePlaying, setInlinePlaying] = useState(false)
  const [inlineSpeed, setInlineSpeed] = useState(5)
  const inlineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingAdvanceRef = useRef<string | null>(null)

  // ── Review decisions (all segments start unreviewed — including keep segments)
  const [reviewDecisions, setReviewDecisions] = useState<Map<string, 'valid' | 'invalid'>>(new Map())

  // ── Filters & Sort
  const [filterReview, setFilterReview] = useState<'all' | 'unreviewed' | 'valid' | 'invalid'>('all')
  const [sortMode, setSortMode] = useState<'time' | 'type'>('time')

  // ── Cull history
  const [showHistory, setShowHistory] = useState(false)
  const [cullHistory, setCullHistory] = useState<SavedCullResult[]>(() => store.getCullResults(jobId))
  const refreshHistory = useCallback(() => setCullHistory(store.getCullResults(jobId)), [jobId])

  const handleLoadHistory = useCallback((result: SavedCullResult) => {
    const validIds = new Set(result.validSegmentIds)
    const newDecisions = new Map<string, 'valid' | 'invalid'>()
    for (const seg of segments) {
      newDecisions.set(seg.id, validIds.has(seg.id) ? 'valid' : 'invalid')
    }
    setReviewDecisions(newDecisions)
    setShowHistory(false)
    setFinalizeResult(null)
  }, [segments])

  const handleDeleteHistory = useCallback((resultId: string) => {
    if (!confirm('删除该裁剪记录？关联的精切草稿也将被删除。')) return
    store.removeCullResult(jobId, resultId)
    refreshHistory()
  }, [jobId, refreshHistory])

  // ── Finalize
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [finalizeResult, setFinalizeResult] = useState<{ downloadUrl: string; version: string; stats: Record<string, number> } | null>(null)

  // ── Computed counts
  const { validCount, invalidCount, unreviewedCount, validFrameCount, invalidFrameCount, totalFrames } = useMemo(() => {
    let validCount = 0, invalidCount = 0, unreviewedCount = 0
    let validFrameCount = 0, invalidFrameCount = 0, totalFrames = 0
    for (const s of segments) {
      totalFrames += s.frame_count
      const dec = reviewDecisions.get(s.id)
      if (dec === 'valid') { validCount++; validFrameCount += s.frame_count }
      else if (dec === 'invalid') { invalidCount++; invalidFrameCount += s.frame_count }
      else unreviewedCount++
    }
    return { validCount, invalidCount, unreviewedCount, validFrameCount, invalidFrameCount, totalFrames }
  }, [segments, reviewDecisions])

  // ── State type sort order: keep first, then review, then culled types
  const STATE_ORDER: Record<string, number> = {
    keep: 0,
    review: 1,
    culled_motion: 2,
    culled_low_action: 3,
    culled_person: 4,
  }

  // ── Filtered + sorted segments
  const filtered = useMemo(() => {
    const list = segments.filter(s => {
      const dec = reviewDecisions.get(s.id)
      return filterReview === 'all'
        || (filterReview === 'unreviewed' && !dec)
        || (filterReview === 'valid' && dec === 'valid')
        || (filterReview === 'invalid' && dec === 'invalid')
    })
    if (sortMode === 'type') {
      list.sort((a, b) => {
        const ta = STATE_ORDER[a.state] ?? 99
        const tb = STATE_ORDER[b.state] ?? 99
        if (ta !== tb) return ta - tb
        return a.start_idx - b.start_idx
      })
    }
    // 'time' = original time order (already sorted by start_idx from backend)
    return list
  }, [segments, filterReview, reviewDecisions, sortMode])

  const selectedIdx = useMemo(
    () => selectedId ? filtered.findIndex(s => s.id === selectedId) : -1,
    [filtered, selectedId]
  )

  // ── When filter changes and current selection leaves view, re-select first visible
  useEffect(() => {
    if (filtered.length === 0) return
    if (!selectedId || !filtered.find(s => s.id === selectedId)) {
      setSelectedId(filtered[0].id)
      setInlineIdx(0)
      setInlinePlaying(false)
    }
  }, [filtered, selectedId])

  // ── Reset on segment change
  useEffect(() => {
    setInlineIdx(0)
    setInlinePlaying(false)
  }, [selectedId])

  // ── Inline playback loop
  useEffect(() => {
    if (inlineTimerRef.current) { clearInterval(inlineTimerRef.current); inlineTimerRef.current = null }
    if (!inlinePlaying || !selectedSeg) return
    inlineTimerRef.current = setInterval(() => {
      setInlineIdx(i => {
        if (i >= selectedSeg.frames.length - 1) { setInlinePlaying(false); return i }
        return i + 1
      })
    }, 1000 / inlineSpeed)
    return () => { if (inlineTimerRef.current) clearInterval(inlineTimerRef.current) }
  }, [inlinePlaying, inlineSpeed, selectedSeg?.id, selectedSeg?.frames.length])

  useEffect(() => () => { if (inlineTimerRef.current) clearInterval(inlineTimerRef.current) }, [])

  // ── Helpers
  const handleSelect = (id: string) => {
    setSelectedId(id)
    setInlineIdx(0)
    setInlinePlaying(true)
  }

  const makeDecision = useCallback((segId: string, decision: 'valid' | 'invalid') => {
    setReviewDecisions(prev => new Map(prev).set(segId, decision))
    pendingAdvanceRef.current = segId
  }, [])

  // Auto-advance to next unreviewed after a decision
  useEffect(() => {
    const segId = pendingAdvanceRef.current
    if (!segId) return
    pendingAdvanceRef.current = null
    const currentIdxInFiltered = filtered.findIndex(s => s.id === segId)
    const searchFrom = currentIdxInFiltered >= 0 ? currentIdxInFiltered + 1 : 0
    for (let i = searchFrom; i < filtered.length; i++) {
      if (!reviewDecisions.has(filtered[i].id)) {
        setSelectedId(filtered[i].id)
        setInlineIdx(0)
        setInlinePlaying(true)
        return
      }
    }
    for (let i = 0; i < searchFrom && i < filtered.length; i++) {
      if (!reviewDecisions.has(filtered[i].id)) {
        setSelectedId(filtered[i].id)
        setInlineIdx(0)
        setInlinePlaying(true)
        return
      }
    }
  }, [reviewDecisions, filtered])

  const clearDecision = (segId: string) => {
    setReviewDecisions(prev => { const m = new Map(prev); m.delete(segId); return m })
  }

  const handleFinalize = () => {
    const decisions = [...reviewDecisions.entries()]
      .filter(([, d]) => d === 'valid' || d === 'invalid')
      .map(([segment_id, decision]) => ({ segment_id, decision }))
    if (decisions.length === 0) return

    // Save cull result locally (always succeeds regardless of backend)
    const validSegs = segments.filter(s => reviewDecisions.get(s.id) === 'valid')
    const invalidSegs = segments.filter(s => reviewDecisions.get(s.id) === 'invalid')
    const cullResult: SavedCullResult = {
      id: crypto.randomUUID(),
      name: `裁剪结果 #${store.getCullResults(jobId).length + 1}`,
      createdAt: Date.now(),
      validSegmentIds: validSegs.map(s => s.id),
      totalSegments: segments.length,
      validCount: validSegs.length,
      invalidCount: invalidSegs.length,
    }
    store.saveCullResult(jobId, cullResult)
    refreshHistory()

    // Close modal + transition to slice immediately (don't wait for backend)
    setShowFinalizeModal(false)
    onCullReviewComplete?.(validSegs, {}, cullResult.id)

    // Backend finalize — fire and forget (generates download zip)
    api.finalizeReview(jobId, decisions)
      .then(res => {
        setFinalizeResult({ downloadUrl: res.data.download_url, version: res.data.version, stats: res.data.stats })
      })
      .catch(() => {
        // Backend unavailable — user already transitioned to slice, no action needed
      })
  }

  // ── Keyboard handler (simplified: only Y/N/P/Space/arrows/brackets)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tgt.tagName)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (!selectedId) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          setInlinePlaying(v => !v)
          break
        case 'ArrowLeft':
          e.preventDefault()
          setInlinePlaying(false)
          setInlineIdx(i => Math.max(0, i - 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          setInlinePlaying(false)
          setInlineIdx(i => selectedSeg ? Math.min(selectedSeg.frames.length - 1, i + 1) : i)
          break
        case 'y': case 'Y':
          e.preventDefault()
          if (selectedId) makeDecision(selectedId, 'valid')
          break
        case 'n': case 'N':
          e.preventDefault()
          if (selectedId) makeDecision(selectedId, 'invalid')
          break
        case 'p': case 'P':
          e.preventDefault()
          if (selectedId) clearDecision(selectedId)
          break
        case '[': {
          e.preventDefault()
          const cur = filtered.findIndex(s => s.id === selectedId)
          if (cur > 0) handleSelect(filtered[cur - 1].id)
          break
        }
        case ']': {
          e.preventDefault()
          const cur = filtered.findIndex(s => s.id === selectedId)
          if (cur < filtered.length - 1) handleSelect(filtered[cur + 1].id)
          break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, selectedSeg, filtered, makeDecision])

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
        <p className="text-3xl">✓</p>
        <p className="text-sm">无时段数据</p>
      </div>
    )
  }

  const seg = selectedSeg
  const n = seg?.frames.length ?? 0
  const decision = seg ? reviewDecisions.get(seg.id) : undefined
  const isValid = decision === 'valid'
  const isInvalid = decision === 'invalid'
  const segStartMs = seg ? Math.round(seg.start_idx / fps * 1000) : 0
  const segEndMs = seg ? Math.round((seg.end_idx + 1) / fps * 1000) : 0
  const cullRate = totalFrames > 0 ? ((invalidFrameCount / totalFrames) * 100).toFixed(1) : '0.0'

  return (
    <div className="flex flex-col h-full relative">
      {/* MacroTimeline */}
      <div className="px-4 pt-3 pb-1 flex-shrink-0">
        <MacroTimeline
          segments={segments}
          selectedId={selectedId}
          reviewDecisions={reviewDecisions}
          onSelect={handleSelect}
        />
      </div>

      {/* Stats / filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-white flex-shrink-0 flex-wrap">
        <span className="text-xs text-slate-500 flex items-center gap-1.5">
          <strong className="text-slate-700">{segments.length}</strong> 段
          <span className="text-slate-300">·</span>
          <strong className="text-slate-700">{totalFrames}</strong> 帧
          {unreviewedCount > 0 && <span className="text-amber-500 font-medium">· 待审 {unreviewedCount}</span>}
          {validCount > 0 && <span className="text-emerald-600 font-medium">· 有效 {validCount}({validFrameCount}帧)</span>}
          {invalidCount > 0 && <span className="text-red-400 font-medium">· 无效 {invalidCount}({invalidFrameCount}帧)</span>}
        </span>

        {/* Sort toggle */}
        <div className="ml-auto flex rounded-lg border border-slate-200 overflow-hidden text-[10px] font-medium">
          {([['time','默认排序'],['type','按类别']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setSortMode(v)}
              className={`px-2 py-1 transition-colors ${
                sortMode === v ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Review filter */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[10px] font-medium">
          {([['all','全部'],['unreviewed','未审'],['valid','有效'],['invalid','无效']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setFilterReview(v)}
              className={`px-2 py-1 transition-colors ${
                filterReview === v ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main area: SegmentGrid + FocusView */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: SegmentGrid */}
        <div className="w-56 flex-shrink-0 border-r border-slate-100 bg-white overflow-hidden p-2">
          <SegmentGrid
            segments={filtered}
            allSegments={segments}
            selectedId={selectedId}
            reviewDecisions={reviewDecisions}
            fps={fps}
            sortMode={sortMode}
            onSelect={handleSelect}
          />
        </div>

        {/* Right: FocusView */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {seg ? (
            <>
              {/* Segment header */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-100 flex-shrink-0">
                <span className={`flex-shrink-0 min-w-[32px] h-8 px-2 rounded-full flex items-center justify-center gap-1 ${
                  isValid ? 'bg-emerald-500 text-white'
                  : isInvalid ? 'bg-red-500 text-white'
                  : 'bg-slate-100 text-slate-500'
                }`}>
                  <span className="text-sm font-bold leading-none tabular-nums">
                    {selectedIdx + 1}
                  </span>
                  {isValid && <CheckCircle2 size={12} strokeWidth={2.5} />}
                  {isInvalid && <XCircle size={12} strokeWidth={2.5} />}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 ${stateCfg(seg.state).badge}`}>
                  {stateCfg(seg.state).label}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {formatMs(segStartMs)} – {formatMs(segEndMs)}
                </span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  {seg.frame_count}帧 · {formatDur(seg.duration_ms)}
                </span>
                {/* Navigation */}
                <div className="ml-auto flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => { if (selectedIdx > 0) handleSelect(filtered[selectedIdx - 1].id) }}
                    disabled={selectedIdx === 0}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-25">
                    <ChevronLeft size={12} />
                  </button>
                  <span className="text-[11px] text-slate-500 font-medium tabular-nums px-1">
                    {selectedIdx + 1} / {filtered.length}
                  </span>
                  <button
                    onClick={() => { if (selectedIdx < filtered.length - 1) handleSelect(filtered[selectedIdx + 1].id) }}
                    disabled={selectedIdx >= filtered.length - 1}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-25">
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* Frame viewer */}
              {n >= 1 && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="relative flex-1 bg-black flex items-center justify-center min-h-[200px]">
                    <img
                      src={seg.frames[inlineIdx]?.url ?? seg.thumb_url}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                    {n > 1 && (
                      <>
                        <button disabled={inlineIdx === 0}
                          onClick={() => { setInlinePlaying(false); setInlineIdx(i => i - 1) }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70">
                          <ChevronLeft size={16} />
                        </button>
                        <button disabled={inlineIdx >= n - 1}
                          onClick={() => { setInlinePlaying(false); setInlineIdx(i => i + 1) }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70">
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/80 text-xs bg-black/50 px-2 py-0.5 rounded font-mono">
                      {inlineIdx + 1}/{n} · {formatMs(Math.round((seg.frames[inlineIdx]?.idx ?? 0) / fps * 1000))}
                    </div>
                  </div>

                  {/* Playback controls */}
                  {n >= 3 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 flex-shrink-0">
                      <button onClick={() => setInlinePlaying(v => !v)}
                        className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center">
                        {inlinePlaying ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                      <div className="flex-1 h-5 flex items-center cursor-pointer"
                        onClick={e => {
                          const r = e.currentTarget.getBoundingClientRect()
                          setInlinePlaying(false)
                          setInlineIdx(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (n - 1)))
                        }}>
                        <div className="w-full h-1.5 bg-white/20 rounded-full relative">
                          <div className="absolute h-full bg-sky-400 rounded-full transition-all duration-100"
                            style={{ width: `${(inlineIdx / Math.max(1, n - 1)) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[5, 10, 15].map(spd => (
                          <button key={spd} onClick={() => setInlineSpeed(spd)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              inlineSpeed === spd ? 'bg-white/20 text-white' : 'text-slate-500 hover:text-slate-300'
                            }`}>{spd}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Decision bar — Y/N only */}
              <div className="flex items-stretch gap-2 px-4 py-3 bg-white border-t border-slate-100 flex-shrink-0">
                <button
                  onClick={() => makeDecision(seg.id, 'valid')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isValid
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}>
                  <CheckCircle2 size={15} />
                  有效
                  <Kbd k="Y" />
                </button>
                <button
                  onClick={() => makeDecision(seg.id, 'invalid')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isInvalid
                      ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                  }`}>
                  <XCircle size={15} />
                  无效
                  <Kbd k="N" />
                </button>
                {(isValid || isInvalid) && (
                  <button onClick={() => clearDecision(seg.id)}
                    title="重置审核 (P)"
                    className="w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200 flex-shrink-0">
                    <Undo2 size={14} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              点击左侧时段开始审核
            </div>
          )}
        </div>
      </div>

      {/* Cull history panel */}
      {showHistory && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 max-h-[200px] overflow-y-auto">
          <div className="px-4 py-2 space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <History size={13} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">裁剪历史</span>
              <span className="text-[10px] text-slate-400">{cullHistory.length} 条记录</span>
            </div>
            {cullHistory.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-2">暂无裁剪记录</p>
            ) : (
              cullHistory.map(result => (
                <div key={result.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-700">{result.name}</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-px rounded border border-emerald-200">
                        {result.validCount} 有效
                      </span>
                      <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-px rounded border border-red-200">
                        {result.invalidCount} 无效
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatDate(result.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleLoadHistory(result)}
                    title="加载此裁剪结果的审核决策"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors flex-shrink-0">
                    <Upload size={10} />
                    加载
                  </button>
                  <button
                    onClick={() => handleDeleteHistory(result.id)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-rose-400 hover:bg-rose-50 transition-colors flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Finalize bottom bar */}
      {(reviewDecisions.size > 0 || cullHistory.length > 0) && !finalizeResult && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-2 flex items-center gap-3">
          {/* History toggle */}
          <button
            onClick={() => { setShowHistory(v => !v); refreshHistory() }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showHistory
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            <History size={12} />
            裁剪历史
            {cullHistory.length > 0 && (
              <span className={`px-1.5 py-px rounded-full text-[10px] leading-none ${
                showHistory ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{cullHistory.length}</span>
            )}
          </button>

          {unreviewedCount > 0 && (
            <span className="text-xs text-amber-500">还有 {unreviewedCount} 段未审</span>
          )}
          <button
            onClick={() => setShowFinalizeModal(true)}
            disabled={unreviewedCount > 0 || reviewDecisions.size === 0}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              unreviewedCount > 0 || reviewDecisions.size === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}>
            <Package size={12} />
            确认并进入精切
          </button>
        </div>
      )}

      {/* Finalize result bar */}
      {finalizeResult && (
        <div className="flex-shrink-0 border-t border-emerald-200 bg-emerald-50 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-emerald-700 font-medium">
            ✓ 已完成 v{finalizeResult.version} — 有效 {finalizeResult.stats.valid} 段，无效 {finalizeResult.stats.invalid} 段
          </span>
          <a href={finalizeResult.downloadUrl} download
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
            <ExternalLink size={12} />下载压缩包
          </a>
          <button onClick={() => setFinalizeResult(null)} className="text-emerald-500 hover:text-emerald-700 text-xs">关闭</button>
        </div>
      )}

      {/* Finalize confirm modal */}
      {showFinalizeModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 w-full max-w-md">
            <h3 className="text-base font-bold text-slate-800 mb-1">确认审核结果</h3>
            <p className="text-xs text-slate-500 mb-4">确认后将进入精切环节，对有效时段进行精细切分。</p>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">总帧数</span>
                <span className="font-semibold text-slate-700">{totalFrames} 帧</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-600">有效帧数</span>
                <span className="font-semibold text-emerald-600">{validFrameCount} 帧</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-red-500">剔除帧数</span>
                <span className="font-semibold text-red-500">{invalidFrameCount} 帧</span>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between text-xs">
                <span className="text-slate-500">剔除率</span>
                <span className="font-bold text-slate-700">{cullRate}%</span>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-emerald-700">
                  <strong>{validCount}</strong> 段 ({validFrameCount} 帧) 将进入精切
                </span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                <XCircle size={14} className="text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">
                  <strong>{invalidCount}</strong> 段 ({invalidFrameCount} 帧) 将被丢弃
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFinalizeModal(false)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                取消
              </button>
              <button onClick={handleFinalize}
                className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                确认并进入精切
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
