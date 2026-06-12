import { useState, useEffect, useRef } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Text } from 'react-konva'
import { Pause, Play } from 'lucide-react'
import type { PersonDetection } from '../api'

interface FramePlayerProps {
  frameUrls: string[]
  fps: number
  personDetections?: Record<string, PersonDetection> | null
}

export default function FramePlayer({ frameUrls, fps, personDetections }: FramePlayerProps) {
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [loadProgress, setLoadProgress] = useState(0)
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>()
  const lastTickRef = useRef(0)
  const idxRef = useRef(0)
  const interval = 1000 / Math.max(fps, 1)

  // Measure container with ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect
      if (r) setStageSize({ w: r.width, h: r.height })
    })
    obs.observe(el)
    setStageSize({ w: el.clientWidth, h: el.clientHeight })
    return () => obs.disconnect()
  }, [])

  // Load frames; reset index when frameUrls changes (clip switch)
  useEffect(() => {
    if (frameUrls.length === 0) return
    setImages([])
    setLoadProgress(0)
    setFrameIdx(0)
    idxRef.current = 0
    lastTickRef.current = 0  // reset playback timing on clip switch

    let cancelled = false
    let loadedCount = 0

    const imgs = frameUrls.map(url => {
      const img = new window.Image()
      img.src = url
      return img
    })

    const onOneLoaded = () => {
      loadedCount++
      if (cancelled) return
      setLoadProgress(Math.round((loadedCount / imgs.length) * 100))
      if (loadedCount === imgs.length) {
        setImages([...imgs])
      }
    }

    imgs.forEach(img => {
      if (img.complete) {
        onOneLoaded()
      } else {
        img.onload = onOneLoaded
        img.onerror = onOneLoaded
      }
    })

    return () => {
      cancelled = true
      imgs.forEach(img => { img.onload = null; img.onerror = null })
    }
  }, [frameUrls])

  // RAF playback loop
  useEffect(() => {
    if (images.length === 0 || !playing) return

    const loop = (now: number) => {
      if (now - lastTickRef.current >= interval) {
        idxRef.current = (idxRef.current + 1) % images.length
        setFrameIdx(idxRef.current)
        lastTickRef.current = now
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    }
  }, [images, playing, interval])

  const currentImage = images[frameIdx] ?? null
  const { w, h } = stageSize
  const isLoaded = images.length > 0

  // Compute object-contain dimensions
  let drawX = 0, drawY = 0, drawW = w, drawH = h
  if (currentImage && w > 0 && h > 0) {
    const aspect = currentImage.naturalWidth / currentImage.naturalHeight || 16 / 9
    if (w / aspect <= h) {
      drawW = w
      drawH = w / aspect
      drawY = (h - drawH) / 2
    } else {
      drawH = h
      drawW = h * aspect
      drawX = (w - drawW) / 2
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Stage — fills container */}
      {isLoaded && w > 0 && h > 0 && currentImage ? (
        <Stage width={w} height={h} className="cursor-pointer" onClick={() => setPlaying(p => !p)}>
          <Layer>
            <KonvaImage image={currentImage} x={drawX} y={drawY} width={drawW} height={drawH} />
          </Layer>
          {personDetections && (() => {
            const currentUrl = frameUrls[frameIdx]
            const det = currentUrl ? personDetections[currentUrl] : null
            if (!det || !det.person_boxes.length) return null
            return (
              <Layer>
                {det.person_boxes.map((box, i) => {
                  const [x1, y1, x2, y2, conf] = box
                  const rx = drawX + x1 * drawW
                  const ry = drawY + y1 * drawH
                  const rw = (x2 - x1) * drawW
                  const rh = (y2 - y1) * drawH
                  return (
                    <>
                      <Rect
                        key={`rect-${i}`}
                        x={rx} y={ry} width={rw} height={rh}
                        stroke="cyan" strokeWidth={2}
                        fill="rgba(0,255,255,0.08)"
                      />
                      <Text
                        key={`text-${i}`}
                        x={rx} y={ry - 16}
                        text={`${Math.round(conf * 100)}%`}
                        fontSize={12} fill="cyan"
                        fontStyle="bold"
                      />
                    </>
                  )
                })}
              </Layer>
            )
          })()}
        </Stage>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full gap-3 text-slate-400 text-sm">
          {frameUrls.length === 0 ? (
            <p>无帧数据</p>
          ) : (
            <>
              <div className="w-32 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-200"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <p>加载帧中… {loadProgress}%</p>
            </>
          )}
        </div>
      )}

      {/* Play/Pause overlay */}
      {isLoaded && (
        <button
          onClick={() => setPlaying(p => !p)}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5
            px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-medium
            opacity-0 hover:opacity-100 transition-opacity backdrop-blur-sm"
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
          {playing ? '暂停' : '播放'}
        </button>
      )}

      {/* Frame counter */}
      {isLoaded && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] font-mono pointer-events-none">
          {frameIdx + 1} / {images.length}
        </div>
      )}
    </div>
  )
}
