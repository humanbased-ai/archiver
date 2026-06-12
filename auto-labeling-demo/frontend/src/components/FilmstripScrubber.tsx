import { useState, useRef, useCallback, useMemo } from 'react'
import { CulledFrameRecord } from '../api'
import { SubClip, SubClipLabel } from './SegmentTimeline'

interface Props {
  frames: CulledFrameRecord[]
  currentIdx: number
  extensionLeft: number
  extensionRight: number
  keyframes: number[]
  subClips: SubClip[]
  subClipLabels: SubClipLabel[]
  activeSubClip: number | null
  fps: number
  onSeek: (idx: number) => void
  onClickSubClip: (idx: number) => void
  onAddKeyframe: (idx: number) => void
  onMoveKeyframe?: (oldIdx: number, newIdx: number) => void
  onRemoveKeyframe?: (idx: number) => void
  onLabelSubClip?: (scIdx: number) => void
  onHoverFrame?: (idx: number | null) => void
  onHoverDivider?: (pair: [number, number] | null) => void
}

// ─── Layout (top→bottom: ruler, thumbs, track, labels, progress bar) ────

const RULER_H = 16
const THUMB_H = 38
const THUMB_W = 44
const TRACK_H = 24
const LABEL_H = 16
const PROGRESS_H = 12
const TOTAL_H = RULER_H + THUMB_H + TRACK_H + LABEL_H + PROGRESS_H

const TRACK_TOP = RULER_H + THUMB_H
const DIVIDER_TOP = TRACK_TOP
const DIVIDER_H = TRACK_H + LABEL_H

// All positions use a cell-based model: each frame is a cell of width 1/n.
// Frame i occupies [i/n, (i+1)/n].

// Center of frame cell (for ruler ticks, playhead, thumbnails)
function cellCenter(idx: number, n: number) {
  if (n <= 1) return 50
  return ((idx + 0.5) / n) * 100
}

// Left edge of frame cell (= boundary between frame idx-1 and frame idx)
// Used for divider lines: a divider at keyframe kf sits at the boundary before frame kf
function cellEdge(idx: number, n: number) {
  if (n <= 1) return 0
  return (idx / n) * 100
}

// Sub-clip block: left edge and width
function blockLeft(start: number, n: number) {
  if (n <= 1) return 0
  return (start / n) * 100
}
function blockWidth(start: number, end: number, n: number) {
  if (n <= 1) return 100
  return ((end - start + 1) / n) * 100
}

function scBg(label: SubClipLabel | undefined, idx: number, active: boolean): string {
  if (active) {
    if (label === 'annotate') return '#6ee7b7'
    if (label === 'invalid') return '#fda4af'
    return '#93c5fd'
  }
  if (label === 'annotate') return idx % 2 === 0 ? '#a7f3d0' : '#86efac'
  if (label === 'invalid') return idx % 2 === 0 ? '#fecdd3' : '#fda4af'
  return idx % 2 === 0 ? '#e2e8f0' : '#cbd5e1'
}

function scBorder(label: SubClipLabel | undefined, active: boolean): string {
  if (active) return '#3b82f6'
  if (label === 'annotate') return '#34d399'
  if (label === 'invalid') return '#fb7185'
  return '#94a3b8'
}

export default function FilmstripScrubber({
  frames, currentIdx, extensionLeft, extensionRight,
  keyframes, subClips, subClipLabels, activeSubClip, fps,
  onSeek, onClickSubClip, onAddKeyframe, onMoveKeyframe, onRemoveKeyframe,
  onLabelSubClip, onHoverFrame, onHoverDivider,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [hoverKf, setHoverKf] = useState<number | null>(null)
  const [draggingKf, setDraggingKf] = useState<{ orig: number; current: number } | null>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [hoverClientX, setHoverClientX] = useState(0)
  const n = frames.length
  if (n === 0) return null

  const manualKfs = useMemo(
    () => keyframes.filter((_, i) => i > 0 && i < keyframes.length - 1),
    [keyframes],
  )

  const getIdx = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0
    const r = trackRef.current.getBoundingClientRect()
    return Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * (n - 1))
  }, [n])

  // ── Scrub (progress bar or track click) ───────────────────────────────

  const startScrub = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-kf-handle]')) return
    if ((e.target as HTMLElement).closest('[data-divider]')) return
    if ((e.target as HTMLElement).closest('[data-sc-block]')) return
    e.preventDefault()
    const idx = getIdx(e.clientX)
    onSeek(idx)
    setIsScrubbing(true)
    onHoverFrame?.(idx)

    const onMove = (ev: MouseEvent) => {
      const i = getIdx(ev.clientX)
      onSeek(i)
      onHoverFrame?.(i)
      setHoverIdx(i)
      setHoverClientX(ev.clientX)
    }
    const onUp = () => {
      setIsScrubbing(false)
      onHoverFrame?.(null)
      setHoverIdx(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [getIdx, onSeek, onHoverFrame])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const idx = getIdx(e.clientX)
    setHoverIdx(idx)
    setHoverClientX(e.clientX)
    if (isScrubbing) return
    if ((e.target as HTMLElement).closest('[data-divider]')) return
    onHoverFrame?.(idx)
    setHoverKf(null)
    onHoverDivider?.(null)
  }, [getIdx, onHoverFrame, onHoverDivider, isScrubbing])

  const handleMouseLeave = useCallback(() => {
    setHoverIdx(null)
    if (!isScrubbing) {
      setHoverKf(null)
      onHoverFrame?.(null)
      onHoverDivider?.(null)
    }
  }, [onHoverFrame, onHoverDivider, isScrubbing])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-kf-handle]')) return
    if ((e.target as HTMLElement).closest('[data-divider]')) return
    const idx = getIdx(e.clientX)
    if (idx > 0 && idx < n - 1 && !keyframes.includes(idx)) onAddKeyframe(idx)
  }, [getIdx, n, keyframes, onAddKeyframe])

  // ── Drag divider ──────────────────────────────────────────────────────

  const startKfDrag = useCallback((e: React.MouseEvent, kfIdx: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingKf({ orig: kfIdx, current: kfIdx })
    onHoverDivider?.([Math.max(0, kfIdx - 1), Math.min(n - 1, kfIdx)])

    const onMove = (ev: MouseEvent) => {
      const p = getIdx(ev.clientX)
      setDraggingKf(prev => prev ? { ...prev, current: p } : null)
      onHoverDivider?.([Math.max(0, p - 1), Math.min(n - 1, p)])
      onHoverFrame?.(p)
    }
    const onUp = (ev: MouseEvent) => {
      const newIdx = getIdx(ev.clientX)
      setDraggingKf(null)
      onHoverDivider?.(null)
      onHoverFrame?.(null)
      if (newIdx <= 0 || newIdx >= n - 1) onRemoveKeyframe?.(kfIdx)
      else if (newIdx !== kfIdx && !keyframes.includes(newIdx)) onMoveKeyframe?.(kfIdx, newIdx)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [getIdx, n, keyframes, onMoveKeyframe, onRemoveKeyframe, onHoverDivider, onHoverFrame])

  const handleDividerEnter = useCallback((kf: number) => {
    setHoverKf(kf)
    onHoverDivider?.([Math.max(0, kf - 1), Math.min(n - 1, kf)])
    onHoverFrame?.(kf)
  }, [n, onHoverDivider, onHoverFrame])

  const handleDividerLeave = useCallback(() => {
    if (!draggingKf) { setHoverKf(null); onHoverDivider?.(null); onHoverFrame?.(null) }
  }, [draggingKf, onHoverDivider, onHoverFrame])

  // ── Ruler ticks ───────────────────────────────────────────────────────

  const ticks = useMemo(() => {
    const t: number[] = []
    const interval = n <= 20 ? 1 : n <= 50 ? 5 : n <= 100 ? 10 : n <= 300 ? 25 : 50
    for (let i = 0; i < n; i += interval) t.push(i)
    if (t[t.length - 1] !== n - 1) t.push(n - 1)
    return t
  }, [n])

  const playheadPct = cellCenter(currentIdx, n)

  return (
    <div className="flex-shrink-0 select-none bg-slate-50 border-t border-slate-200">
      <div
        ref={trackRef}
        className="relative mx-2 my-1"
        style={{ height: TOTAL_H }}
        onMouseDown={startScrub}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      >
        {/* ═══ 1. Ruler ═══ */}
        <div className="absolute top-0 left-0 right-0" style={{ height: RULER_H }}>
          {ticks.map(t => (
            <div key={t} className="absolute top-0" style={{ left: `${cellCenter(t, n)}%`, transform: 'translateX(-50%)' }}>
              <div className="w-px h-1.5 bg-slate-300 mx-auto" />
              <span className="block text-center text-[7px] text-slate-400 font-mono leading-none mt-px">{t + 1}</span>
            </div>
          ))}
        </div>

        {/* ═══ 2. Keyframe thumbnails ═══ */}
        {keyframes.map((kf, ki) => {
          const frame = frames[kf]
          if (!frame) return null
          const isEdge = ki === 0 || ki === keyframes.length - 1
          const isManual = !isEdge
          const displayPos = draggingKf?.orig === kf ? draggingKf.current : kf
          // Edge thumbnails at frame center, manual thumbnails at divider position (cell edge)
          const thumbPct = isManual ? cellEdge(displayPos, n) : cellCenter(displayPos, n)

          return (
            <div
              key={`kf-t-${kf}`}
              className="absolute z-20"
              style={{ left: `${thumbPct}%`, top: RULER_H, transform: 'translateX(-50%)' }}
              data-kf-handle="true"
              onMouseDown={isManual ? (e) => startKfDrag(e, kf) : undefined}
            >
              <img
                src={frame.url} alt=""
                className="object-cover rounded pointer-events-none"
                style={{
                  width: THUMB_W, height: THUMB_H,
                  border: isManual ? '2px solid #ef4444' : '1.5px solid rgba(139,92,246,0.5)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  cursor: isManual ? 'grab' : 'default',
                }}
                draggable={false}
              />
            </div>
          )
        })}

        {/* ═══ 3. Sub-clip track (below thumbs) ═══ */}

        {/* Extension zones */}
        {extensionLeft > 0 && (
          <div className="absolute left-0" style={{
            top: TRACK_TOP, height: TRACK_H,
            width: `${blockWidth(0, extensionLeft - 1, n)}%`,
            background: 'repeating-linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.12) 3px, rgba(56,189,248,0.03) 3px, rgba(56,189,248,0.03) 6px)',
            borderRight: '1.5px dashed #38bdf8',
          }} />
        )}
        {extensionRight > 0 && (
          <div className="absolute right-0" style={{
            top: TRACK_TOP, height: TRACK_H,
            width: `${blockWidth(n - extensionRight, n - 1, n)}%`,
            background: 'repeating-linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.12) 3px, rgba(56,189,248,0.03) 3px, rgba(56,189,248,0.03) 6px)',
            borderLeft: '1.5px dashed #38bdf8',
          }} />
        )}

        {/* Sub-clip blocks */}
        {subClips.map((sc, i) => {
          const label = subClipLabels[i] ?? undefined
          const isActive = activeSubClip === i

          return (
            <div
              key={`sc-${i}`}
              data-sc-block="true"
              className="absolute cursor-pointer transition-all"
              style={{
                left: `${blockLeft(sc.start, n)}%`,
                width: `${blockWidth(sc.start, sc.end, n)}%`,
                top: TRACK_TOP, height: TRACK_H,
                backgroundColor: scBg(label, i, isActive),
                border: `${isActive ? 2 : 1}px solid ${scBorder(label, isActive)}`,
                borderRadius: 3,
                boxShadow: isActive ? `0 0 0 2px ${scBorder(label, isActive)}40` : undefined,
              }}
              onClick={(e) => { e.stopPropagation(); onClickSubClip(i) }}
            />
          )
        })}

        {/* Frame cell grid (alternating background, extension frames distinct) */}
        <div className="absolute left-0 right-0 flex pointer-events-none"
          style={{ top: TRACK_TOP, height: TRACK_H }}>
          {frames.map((_, i) => {
            const isExt = i < extensionLeft || i >= n - extensionRight
            return (
              <div key={i} className="flex-1 min-w-0" style={{
                backgroundColor: isExt
                  ? (i % 2 === 0 ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.25)')
                  : (i % 2 === 0 ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.18)'),
                borderRight: isExt ? '0.5px solid rgba(56,189,248,0.3)' : '0.5px solid rgba(148,163,184,0.2)',
              }} />
            )
          })}
        </div>

        {/* Track outline */}
        <div className="absolute left-0 right-0 border border-slate-200 rounded-sm pointer-events-none"
          style={{ top: TRACK_TOP, height: TRACK_H }} />

        {/* ═══ 4. Sub-clip labels (with sequence number) ═══ */}
        {subClips.map((sc, i) => {
          const label = subClipLabels[i] ?? null
          const isActive = activeSubClip === i
          const fc = sc.end - sc.start + 1

          return (
            <div
              key={`lbl-${i}`}
              className={`absolute flex items-center justify-center cursor-pointer ${
                isActive ? 'opacity-100' : 'opacity-50 hover:opacity-75'
              }`}
              style={{
                left: `${blockLeft(sc.start, n)}%`,
                width: `${blockWidth(sc.start, sc.end, n)}%`,
                top: TRACK_TOP + TRACK_H, height: LABEL_H,
              }}
              onClick={(e) => { e.stopPropagation(); onLabelSubClip?.(i) }}
              title={`片段 ${i + 1} (${fc}帧)`}
            >
              <span className={`text-[8px] font-semibold px-1 rounded ${
                label === 'annotate' ? 'text-emerald-700 bg-emerald-100'
                  : label === 'invalid' ? 'text-rose-700 bg-rose-100'
                  : 'text-slate-400'
              }`}>
                {i + 1}{label === 'annotate' ? ' 标注' : label === 'invalid' ? ' 无效' : ''}
              </span>
            </div>
          )
        })}

        {/* ═══ Divider lines (below thumbs, through track + labels) ═══ */}
        {manualKfs.map(kf => {
          const displayPos = draggingKf?.orig === kf ? draggingKf.current : kf
          const isHovered = hoverKf === kf || draggingKf?.orig === kf

          return (
            <div
              key={`div-${kf}`}
              data-divider="true"
              className="absolute z-15"
              style={{
                left: `${cellEdge(displayPos, n)}%`, top: DIVIDER_TOP, height: DIVIDER_H,
                transform: 'translateX(-50%)', cursor: 'col-resize', padding: '0 5px',
              }}
              onMouseDown={(e) => startKfDrag(e, kf)}
              onMouseEnter={() => handleDividerEnter(kf)}
              onMouseLeave={handleDividerLeave}
            >
              <div className="h-full mx-auto transition-all" style={{
                width: isHovered ? 3 : 2,
                backgroundColor: isHovered ? '#dc2626' : '#ef4444',
                boxShadow: isHovered ? '0 0 6px rgba(239,68,68,0.4)' : undefined,
              }} />
            </div>
          )
        })}

        {/* Edge lines */}
        {[keyframes[0], keyframes[keyframes.length - 1]].map((kf, i) => {
          if (kf === undefined) return null
          return (
            <div key={`edge-${i}`} className="absolute w-px bg-violet-300/40 pointer-events-none z-10"
              style={{ left: `${cellEdge(kf, n)}%`, top: DIVIDER_TOP, height: DIVIDER_H, transform: 'translateX(-50%)' }} />
          )
        })}

        {/* ═══ 5. Progress bar (bottom) ═══ */}
        <div
          className="absolute left-0 right-0 cursor-pointer group"
          style={{ top: TRACK_TOP + TRACK_H + LABEL_H, height: PROGRESS_H }}
        >
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-200 rounded-full" />
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 bg-yellow-400 rounded-full transition-[width] duration-75"
            style={{ width: `${playheadPct}%` }}
          />
          <div
            className="absolute top-1/2 w-3.5 h-3.5 bg-yellow-500 rounded-full shadow border-2 border-white group-hover:scale-125 transition-transform z-10"
            style={{ left: `${playheadPct}%`, transform: 'translateX(-50%) translateY(-50%)' }}
          />
        </div>

        {/* ═══ Playhead line (through ruler + thumbs + track, not progress) ═══ */}
        <div className="absolute z-5 pointer-events-none"
          style={{ left: `${playheadPct}%`, top: 0, height: TRACK_TOP + TRACK_H + LABEL_H, transform: 'translateX(-50%)' }}>
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-yellow-500/50" />
        </div>
      </div>

      {/* Summary + hint */}
      <div className="flex items-center justify-center gap-3 pb-1">
        <span className="text-[9px] text-slate-500 font-medium">
          共 <b>{subClips.length}</b> 段
        </span>
        {(() => {
          const annotateCount = subClipLabels.filter(l => l === 'annotate').length
          const invalidCount = subClipLabels.filter(l => l === 'invalid').length
          const unlabeledCount = subClips.length - annotateCount - invalidCount
          return (
            <>
              {annotateCount > 0 && (
                <span className="text-[9px] text-emerald-600 font-medium">标注 <b>{annotateCount}</b></span>
              )}
              {invalidCount > 0 && (
                <span className="text-[9px] text-rose-500 font-medium">无效 <b>{invalidCount}</b></span>
              )}
              {unlabeledCount > 0 && (
                <span className="text-[9px] text-slate-400">未标记 {unlabeledCount}</span>
              )}
            </>
          )
        })()}
        <span className="text-[8px] text-slate-300">|</span>
        <span className="text-[8px] text-slate-400">双击添加分割线 · 拖拽移动 · 点击片段切换标注</span>
      </div>

      {/* Hover frame tooltip — follows mouse */}
      {hoverIdx !== null && trackRef.current && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: hoverClientX,
            top: trackRef.current.getBoundingClientRect().top - 6,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          <div className="bg-slate-800 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
            帧 {hoverIdx + 1}
          </div>
          <div className="w-0 h-0 mx-auto border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  )
}
