import { useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export type SubClipLabel = 'annotate' | 'invalid' | null

export interface SubClip {
  start: number  // frame index within the segment frames array
  end: number    // inclusive
}

interface Props {
  totalFrames: number
  currentIdx: number
  extensionLeft: number
  extensionRight: number
  keyframes: number[]        // sorted frame indices within segment
  subClips: SubClip[]
  subClipLabels: SubClipLabel[]
  activeSubClip: number | null
  onSeek: (idx: number) => void
  onClickSubClip?: (idx: number) => void
}

// ─── Color helpers ──────────────────────────────────────────────────────────

function subClipColor(label: SubClipLabel, active: boolean): string {
  const base = label === 'annotate' ? 'bg-emerald-400' : label === 'invalid' ? 'bg-rose-400' : 'bg-slate-400'
  return active ? base + ' ring-2 ring-white ring-inset brightness-110' : base + ' opacity-70'
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SegmentTimeline({
  totalFrames,
  currentIdx,
  extensionLeft,
  extensionRight,
  keyframes,
  subClips,
  subClipLabels,
  activeSubClip,
  onSeek,
  onClickSubClip,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const n = totalFrames
  if (n === 0) return null

  const getPosFromX = (clientX: number) => {
    if (!barRef.current) return 0
    const r = barRef.current.getBoundingClientRect()
    return Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * (n - 1))
  }

  // Drag-to-scrub: mousedown starts continuous seeking
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    onSeek(getPosFromX(e.clientX))
    const onMove = (ev: MouseEvent) => onSeek(getPosFromX(ev.clientX))
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Extension percentages
  const leftPct = n > 0 ? (extensionLeft / n) * 100 : 0
  const rightPct = n > 0 ? (extensionRight / n) * 100 : 0

  // Cursor position percentage
  const cursorPct = n > 1 ? (currentIdx / (n - 1)) * 100 : 0

  return (
    <div className="flex-shrink-0 select-none">
      {/* Main timeline bar */}
      <div
        ref={barRef}
        className="relative h-8 bg-slate-800 cursor-crosshair"
        onMouseDown={handleMouseDown}
      >
        {/* Extension overlay - left (darker) */}
        {extensionLeft > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-black/30 border-r border-sky-400/50 z-10 pointer-events-none"
            style={{ width: `${leftPct}%` }}
          />
        )}

        {/* Extension overlay - right (darker) */}
        {extensionRight > 0 && (
          <div
            className="absolute top-0 bottom-0 right-0 bg-black/30 border-l border-sky-400/50 z-10 pointer-events-none"
            style={{ width: `${rightPct}%` }}
          />
        )}

        {/* Keyframe markers (red vertical lines) */}
        {keyframes.map((kf, i) => {
          const isAutoFirst = i === 0
          const isAutoLast = i === keyframes.length - 1
          const pct = n > 1 ? (kf / (n - 1)) * 100 : 0
          return (
            <div
              key={`kf-${kf}`}
              className={`absolute top-0 bottom-0 z-20 pointer-events-none ${
                isAutoFirst || isAutoLast ? 'w-px bg-violet-400/60' : 'w-0.5 bg-red-500'
              }`}
              style={{ left: `${pct}%` }}
            >
              {/* Marker triangle at top */}
              {!isAutoFirst && !isAutoLast && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-0 h-0
                  border-l-[3px] border-r-[3px] border-t-[5px]
                  border-l-transparent border-r-transparent border-t-red-500" />
              )}
            </div>
          )
        })}

        {/* Playback cursor (blue line) */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-sky-400 z-30 pointer-events-none transition-[left] duration-75"
          style={{ left: `${cursorPct}%` }}
        >
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-0 h-0
            border-l-[4px] border-r-[4px] border-t-[6px]
            border-l-transparent border-r-transparent border-t-sky-400" />
        </div>

        {/* Frame counter */}
        <div className="absolute bottom-0.5 right-2 text-[9px] text-white/40 font-mono pointer-events-none">
          {currentIdx + 1}/{n}
        </div>
      </div>

      {/* Sub-clip color bar */}
      {subClips.length > 0 && (
        <div className="flex h-3 bg-slate-900">
          {subClips.map((sc, i) => {
            const width = sc.end - sc.start + 1
            const widthPct = (width / n) * 100
            const label = subClipLabels[i] ?? null
            const isActive = activeSubClip === i
            return (
              <div
                key={i}
                className={`${subClipColor(label, isActive)} cursor-pointer transition-all border-r border-slate-900/50 last:border-r-0`}
                style={{ width: `${widthPct}%`, minWidth: 2 }}
                onClick={(e) => { e.stopPropagation(); onClickSubClip?.(i) }}
                title={`子片段 ${i + 1}: ${label === 'annotate' ? '标注' : label === 'invalid' ? '无效' : '未标记'} (${width}帧)`}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
