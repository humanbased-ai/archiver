import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Play, Pause, Download, Save,
  Settings, Plus, Trash2, CheckCircle2, RotateCcw,
} from 'lucide-react'
import { CulledFrameRecord } from '../api'
import { store, ActionLabel, COLOR_MAP, COLOR_OPTIONS, DEFAULT_LABELS, SavedAnnotateResult } from '../store'

// Solid hex colors for color picker swatches
const COLOR_SWATCH: Record<string, string> = {
  sky: '#38bdf8',
  blue: '#60a5fa',
  indigo: '#818cf8',
  violet: '#a78bfa',
  fuchsia: '#e879f9',
  rose: '#fb7185',
  orange: '#fb923c',
  amber: '#fbbf24',
  emerald: '#34d399',
  slate: '#94a3b8',
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AnnotateItem {
  id: string          // unique id
  segmentId: string
  subClipIndex: number
  frames: CulledFrameRecord[]
  startFrame: number
  endFrame: number
  startTimestampNs: number | null
  endTimestampNs: number | null
  label: string | null   // assigned action label value
}

interface Props {
  jobId: string
  items: AnnotateItem[]
  fps: number
  onSave?: (items: AnnotateItem[]) => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const frac = ms % 1000
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(frac).padStart(3, '0')}`
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Kbd({ k }: { k: string }) {
  return (
    <span className="ml-0.5 inline-flex items-center px-1 py-px rounded bg-white/20 text-[9px] font-mono font-bold border border-white/30 leading-none">{k}</span>
  )
}

// ─── Label Editor Modal ────────────────────────────────────────────────────

function LabelEditor({ labels, onChange, onClose }: {
  labels: ActionLabel[]
  onChange: (labels: ActionLabel[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<ActionLabel[]>(() => [...labels])

  const addLabel = () => {
    const nextKey = String(draft.length + 1)
    setDraft([...draft, {
      id: crypto.randomUUID(),
      key: nextKey.length === 1 ? nextKey : '',
      label: '',
      value: `cate_${nextKey}`,
      color: COLOR_OPTIONS[draft.length % COLOR_OPTIONS.length],
    }])
  }

  const removeLabel = (id: string) => setDraft(draft.filter(l => l.id !== id))

  const updateLabel = (id: string, patch: Partial<ActionLabel>) =>
    setDraft(draft.map(l => l.id === id ? { ...l, ...patch } : l))

  const handleSave = () => {
    const valid = draft.filter(l => l.label.trim())
    onChange(valid)
    store.saveLabels(valid)
    onClose()
  }

  const [expandedColor, setExpandedColor] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">编辑分类字典</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors text-lg">&times;</button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto max-h-[55vh]">
          {draft.map((label, i) => (
            <div key={label.id} className="rounded-lg border border-slate-150 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 w-5 text-right font-mono">{i + 1}</span>
                <input
                  type="text"
                  value={label.key}
                  onChange={e => {
                    const k = e.target.value.slice(0, 1)
                    const patch: Partial<ActionLabel> = { key: k }
                    // Auto-update value if it looks like a default
                    if (!label.value || label.value.startsWith('cate_')) patch.value = `cate_${k || i + 1}`
                    updateLabel(label.id, patch)
                  }}
                  className="w-9 text-center border border-slate-200 rounded-md px-1 py-1 text-xs font-mono bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none"
                  placeholder="键"
                  title="快捷键"
                />
                <input
                  type="text"
                  value={label.label}
                  onChange={e => updateLabel(label.id, { label: e.target.value })}
                  className="flex-1 border border-slate-200 rounded-md px-2.5 py-1 text-xs bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none"
                  placeholder="显示名称"
                  title="标签显示名称"
                />
                {/* Selected color swatch — click to toggle palette */}
                <button
                  type="button"
                  onClick={() => setExpandedColor(expandedColor === label.id ? null : label.id)}
                  className="w-7 h-7 rounded-lg border-2 border-slate-200 hover:border-slate-400 transition-colors flex-shrink-0"
                  style={{ backgroundColor: COLOR_SWATCH[label.color] }}
                  title="选择颜色"
                />
                <button onClick={() => removeLabel(label.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
              {/* Export field name */}
              <div className="flex items-center gap-2 mt-1.5 ml-7">
                <span className="text-[10px] text-slate-400 flex-shrink-0">导出字段</span>
                <input
                  type="text"
                  value={label.value}
                  onChange={e => updateLabel(label.id, { value: e.target.value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, '') })}
                  className="flex-1 border border-slate-200 rounded-md px-2 py-0.5 text-[10px] font-mono bg-white text-slate-600 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none"
                  placeholder={`cate_${label.key || i + 1}`}
                  title="JSON导出时使用的字段名"
                />
              </div>
              {/* Expanded color palette */}
              {expandedColor === label.id && (
                <div className="flex items-center gap-1.5 mt-2 ml-7 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { updateLabel(label.id, { color: c }); setExpandedColor(null) }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        label.color === c ? 'border-slate-700 scale-110 shadow-sm' : 'border-white hover:scale-110 hover:shadow'
                      }`}
                      style={{ backgroundColor: COLOR_SWATCH[c] }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          <button onClick={addLabel} className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium mt-1 ml-1">
            <Plus size={13} /> 添加标签
          </button>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center">
          <button onClick={() => { setDraft([...DEFAULT_LABELS]) }} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">恢复默认</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">取消</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-xs bg-sky-500 text-white rounded-lg hover:bg-sky-600 font-semibold transition-colors">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function AnnotateTab({ jobId, items: initialItems, fps, onSave }: Props) {
  // Initialize: use passed items, or fall back to stored items
  const [items, setItems] = useState<AnnotateItem[]>(() => {
    if (initialItems.length > 0) return initialItems
    return store.getAnnotateItems<AnnotateItem>(jobId)
  })
  const [currentIdx, setCurrentIdx] = useState(0)
  const [labels, setLabels] = useState<ActionLabel[]>(() => store.getLabels())
  const [showEditor, setShowEditor] = useState(false)
  const [sortMode, setSortMode] = useState<'default' | 'category'>('default')
  const [playing, setPlaying] = useState(false)
  const [playFrame, setPlayFrame] = useState(0)
  const [playSpeed, setPlaySpeed] = useState(5)
  const [showHistory, setShowHistory] = useState(false)
  const [activeResultId, setActiveResultId] = useState<string | null>(null)
  const [historyList, setHistoryList] = useState<SavedAnnotateResult[]>(() => store.getAnnotateResults(jobId))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshHistory = useCallback(() => setHistoryList(store.getAnnotateResults(jobId)), [jobId])

  // Sync with incoming items + persist to store
  useEffect(() => {
    if (initialItems.length > 0) {
      setItems(initialItems)
      store.saveAnnotateItems(jobId, initialItems)
    }
  }, [initialItems, jobId])

  const current = items[currentIdx] ?? null
  const totalFrames = current?.frames.length ?? 0
  const labeledCount = items.filter(i => i.label !== null).length

  // Sorted display list
  const displayList = useMemo(() => {
    const list = items.map((item, i) => ({ item, originalIndex: i }))
    if (sortMode === 'category') {
      const labelOrder = labels.map(l => l.value)
      list.sort((a, b) => {
        const aLabel = a.item.label
        const bLabel = b.item.label
        if (aLabel === null && bLabel !== null) return -1
        if (aLabel !== null && bLabel === null) return 1
        if (aLabel === null && bLabel === null) return a.originalIndex - b.originalIndex
        const aOrder = labelOrder.indexOf(aLabel!)
        const bOrder = labelOrder.indexOf(bLabel!)
        if (aOrder !== bOrder) return aOrder - bOrder
        return a.originalIndex - b.originalIndex
      })
    }
    return list
  }, [items, sortMode, labels])

  // Grouped display for category mode: { groupKey, groupLabel, groupColor, count, items }[]
  const groupedDisplay = useMemo(() => {
    if (sortMode !== 'category') return null
    const groups: { key: string; label: string; color: string; count: number; items: typeof displayList }[] = []
    let currentGroup: typeof groups[0] | null = null

    for (const entry of displayList) {
      const labelVal = entry.item.label
      const groupKey = labelVal ?? '__unlabeled__'

      if (!currentGroup || currentGroup.key !== groupKey) {
        const lbl = labelVal ? labels.find(l => l.value === labelVal) : null
        currentGroup = {
          key: groupKey,
          label: lbl?.label ?? '未标注',
          color: lbl?.color ?? 'slate',
          count: 0,
          items: [],
        }
        groups.push(currentGroup)
      }
      currentGroup.count++
      currentGroup.items.push(entry)
    }
    return groups
  }, [sortMode, displayList, labels])

  // ── Playback ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (!playing || totalFrames <= 1) return
    timerRef.current = setInterval(() => {
      setPlayFrame(i => {
        if (i >= totalFrames - 1) { setPlaying(false); return 0 }
        return i + 1
      })
    }, 1000 / playSpeed)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, playSpeed, totalFrames])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // Reset playback when switching item
  useEffect(() => { setPlayFrame(0); setPlaying(false) }, [currentIdx])

  // ── Navigation ────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    setCurrentIdx(i => Math.min(items.length - 1, i + 1))
  }, [items.length])

  const goPrev = useCallback(() => {
    setCurrentIdx(i => Math.max(0, i - 1))
  }, [])

  const goNextUnlabeled = useCallback(() => {
    const next = items.findIndex((it, i) => i > currentIdx && it.label === null)
    if (next >= 0) setCurrentIdx(next)
    else {
      const first = items.findIndex(it => it.label === null)
      if (first >= 0) setCurrentIdx(first)
    }
  }, [items, currentIdx])

  // ── Assign label ──────────────────────────────────────────────────────

  const assignLabel = useCallback((value: string | null) => {
    if (!current) return
    const updated = items.map((it, i) =>
      i === currentIdx ? { ...it, label: it.label === value ? null : value } : it
    )
    setItems(updated)
    onSave?.(updated)
    store.saveAnnotateItems(jobId, updated)
    // Auto-advance to next unlabeled
    if (value !== null) {
      setTimeout(() => {
        const next = updated.findIndex((it, i) => i > currentIdx && it.label === null)
        if (next >= 0) setCurrentIdx(next)
        else {
          const first = updated.findIndex(it => it.label === null)
          if (first >= 0) setCurrentIdx(first)
        }
      }, 200)
    }
  }, [current, items, currentIdx, onSave])

  // ── Keyboard ──────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
      else if (e.key === ' ') {
        e.preventDefault()
        setPlaying(v => {
          if (!v && playFrame >= totalFrames - 1) setPlayFrame(0)
          return !v
        })
      }
      else {
        const action = labels.find(a => a.key === e.key)
        if (action) { e.preventDefault(); assignLabel(action.value) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [labels, goPrev, goNext, assignLabel, playFrame, totalFrames])

  // ── Export ────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const job = store.getJob(jobId)
    const labelNameMap: Record<string, string> = {}
    for (const l of labels) labelNameMap[l.value] = l.label

    const nsToMs = (ns: number | null) => ns != null ? Math.round(ns / 1e6) : null

    const meta = items
      .filter(it => it.label !== null)
      .map(it => ({
        taskname: job?.task_name ?? '',
        start_time: nsToMs(it.startTimestampNs),
        end_time: nsToMs(it.endTimestampNs),
        description: labelNameMap[it.label!] ?? it.label,
        scenario_code: job?.scenario_code ?? '',
      }))

    const json = JSON.stringify({ 'Labeling meta': meta }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${job?.task_name ?? 'labeling'}_export.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [jobId, items, labels])

  // ── Current label info ────────────────────────────────────────────────

  // ── Save annotation result ─────────────────────────────────────────────

  const handleSaveResult = useCallback(() => {
    const now = Date.now()
    const itemLabels: Record<string, string | null> = {}
    for (const it of items) itemLabels[it.id] = it.label
    const result: SavedAnnotateResult = {
      id: activeResultId ?? crypto.randomUUID(),
      name: activeResultId
        ? historyList.find(r => r.id === activeResultId)?.name ?? `标注结果 ${formatDate(now)}`
        : `标注结果 ${formatDate(now)}`,
      createdAt: activeResultId
        ? historyList.find(r => r.id === activeResultId)?.createdAt ?? now
        : now,
      updatedAt: now,
      itemLabels,
      totalCount: items.length,
      labeledCount: items.filter(i => i.label !== null).length,
    }
    store.saveAnnotateResult(jobId, result)
    setActiveResultId(result.id)
    refreshHistory()
  }, [jobId, items, activeResultId, historyList, refreshHistory])

  const handleLoadResult = useCallback((result: SavedAnnotateResult) => {
    const updated = items.map(it => ({
      ...it,
      label: result.itemLabels[it.id] ?? it.label,
    }))
    setItems(updated)
    onSave?.(updated)
    store.saveAnnotateItems(jobId, updated)
    setActiveResultId(result.id)
    setShowHistory(false)
  }, [items, onSave, jobId])

  const handleDeleteResult = useCallback((resultId: string) => {
    if (!confirm('删除该标注结果？')) return
    store.removeAnnotateResult(jobId, resultId)
    if (activeResultId === resultId) setActiveResultId(null)
    refreshHistory()
  }, [jobId, activeResultId, refreshHistory])

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        handleSaveResult()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSaveResult])

  const currentLabel = current?.label ? labels.find(l => l.value === current.label) : null
  const currentColor = currentLabel ? COLOR_MAP[currentLabel.color] : null

  // ── Empty state ───────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xs">
          <p className="text-sm text-slate-500 mb-1">暂无可标注的片段</p>
          <p className="text-xs text-slate-400">在「精切」中完成切分后点击「进入标注」</p>
          {historyList.length > 0 && (
            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
              已有 {historyList.length} 条标注历史，通过精切重新进入标注后可加载
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
        <div className="text-sm font-semibold text-slate-700">
          {currentIdx + 1} / {items.length}
        </div>
        <div className="text-[10px] text-slate-400">
          已标注 {labeledCount}/{items.length}
        </div>
        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-400 rounded-full transition-all duration-300"
            style={{ width: `${(labeledCount / items.length) * 100}%` }} />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={handleSaveResult}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-sky-500 text-white hover:bg-sky-600 transition-colors">
            <Save size={11} /> 保存
          </button>
          <button onClick={() => { refreshHistory(); setShowHistory(!showHistory) }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              showHistory ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-100'
            }`}>
            历史 {historyList.length > 0 && <span className="text-[9px]">({historyList.length})</span>}
          </button>
          <button onClick={() => setShowEditor(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-slate-500 hover:bg-slate-100 transition-colors">
            <Settings size={11} /> 字典
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <Download size={11} /> 导出
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: item list */}
        <div className="w-52 flex-shrink-0 border-r border-slate-100 bg-white flex flex-col">
          {/* Sort toggle */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100 flex-shrink-0">
            <span className="text-[9px] text-slate-400 mr-0.5">排序</span>
            <button
              onClick={() => setSortMode('default')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                sortMode === 'default' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}>默认</button>
            <button
              onClick={() => setSortMode('category')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                sortMode === 'category' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}>分类</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {sortMode === 'category' && groupedDisplay ? (
              /* Grouped by category */
              groupedDisplay.map(group => (
                <div key={group.key} className="mb-2">
                  {/* Group header */}
                  <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5 sticky top-0 bg-white/95 backdrop-blur-sm z-5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLOR_SWATCH[group.color] ?? '#94a3b8' }} />
                    <span className="text-[10px] font-semibold text-slate-600">{group.label}</span>
                    <span className="text-[9px] text-slate-400">{group.count}</span>
                    <div className="flex-1 h-px bg-slate-100 ml-1" />
                  </div>
                  {/* Group items */}
                  {group.items.map(({ item, originalIndex }) => {
                    const isCurrent = originalIndex === currentIdx
                    return (
                      <div
                        key={item.id}
                        onClick={() => setCurrentIdx(originalIndex)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-[11px] mb-0.5 ml-2 ${
                          isCurrent
                            ? 'bg-indigo-50 border border-indigo-300 ring-1 ring-indigo-200'
                            : 'border border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-8 h-6 rounded overflow-hidden bg-black flex-shrink-0">
                          {item.frames[0] && <img src={item.frames[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                        </div>
                        <div className="flex-1 min-w-0 leading-tight">
                          <span className="text-slate-600 font-semibold">{originalIndex + 1}</span>
                          <span className="text-[9px] text-slate-400 ml-1">{item.frames.length}帧</span>
                        </div>
                        {item.label ? (
                          <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border-2 border-slate-200 flex-shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))
            ) : (
              /* Default order */
              displayList.map(({ item, originalIndex }) => {
                const isCurrent = originalIndex === currentIdx
                const lbl = item.label ? labels.find(l => l.value === item.label) : null
                const clr = lbl ? COLOR_MAP[lbl.color] : null
                return (
                  <div
                    key={item.id}
                    onClick={() => setCurrentIdx(originalIndex)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-[11px] mb-0.5 ${
                      isCurrent
                        ? 'bg-indigo-50 border border-indigo-300 ring-1 ring-indigo-200'
                        : 'border border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-6 rounded overflow-hidden bg-black flex-shrink-0">
                      {item.frames[0] && <img src={item.frames[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <div className="flex-1 min-w-0 leading-tight">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600 font-semibold">{originalIndex + 1}</span>
                        <span className="text-[9px] text-slate-400">{item.frames.length}帧</span>
                      </div>
                      {lbl && clr ? (
                        <span className={`text-[9px] font-medium ${clr.text}`}>{lbl.label}</span>
                      ) : (
                        <span className="text-[9px] text-slate-300">未标注</span>
                      )}
                    </div>
                    {item.label ? (
                      <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-slate-200 flex-shrink-0" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Center: video + controls */}
        <div className="flex-1 flex flex-col min-w-0">
          {current && (
            <>
              {/* Frame viewer */}
              <div className="flex-1 relative bg-black flex items-center justify-center min-h-[180px]">
                {current.frames[playFrame] && (
                  <img src={current.frames[playFrame].url} alt="" className="max-h-full max-w-full object-contain" />
                )}
                {totalFrames > 1 && (
                  <>
                    <button disabled={playFrame === 0}
                      onClick={() => { setPlaying(false); setPlayFrame(i => i - 1) }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70">
                      <ChevronLeft size={16} />
                    </button>
                    <button disabled={playFrame >= totalFrames - 1}
                      onClick={() => { setPlaying(false); setPlayFrame(i => i + 1) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
                {/* Current label badge */}
                {currentLabel && currentColor && (
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold ${currentColor.active}`}>
                    {currentLabel.label}
                  </div>
                )}
              </div>

              {/* Playback bar */}
              <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
                <button onClick={() => { setPlaying(false); setPlayFrame(0) }}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors flex-shrink-0">
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => {
                    if (!playing && playFrame >= totalFrames - 1) setPlayFrame(0)
                    setPlaying(v => !v)
                  }}
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shadow transition-colors flex-shrink-0">
                  {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>
                <div className="min-w-0">
                  <div className="text-sm font-mono font-semibold text-slate-700 tabular-nums leading-tight">
                    {playFrame + 1}<span className="text-slate-300 mx-0.5">/</span>{totalFrames}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono leading-tight">
                    帧#{current.frames[playFrame]?.idx}
                  </div>
                </div>
                {/* Progress */}
                {totalFrames > 1 && (
                  <div className="flex-1 h-6 flex items-center cursor-pointer"
                    onClick={e => {
                      const r = e.currentTarget.getBoundingClientRect()
                      setPlaying(false)
                      setPlayFrame(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (totalFrames - 1)))
                    }}>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full relative">
                      <div className="absolute h-full bg-indigo-400 rounded-full transition-all duration-100"
                        style={{ width: `${(playFrame / Math.max(1, totalFrames - 1)) * 100}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex gap-0.5 flex-shrink-0">
                  {[3, 5, 10].map(spd => (
                    <button key={spd} onClick={() => setPlaySpeed(spd)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        playSpeed === spd ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>{spd}fps</button>
                  ))}
                </div>
              </div>

              {/* Navigation + label buttons */}
              <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-slate-100 flex-shrink-0">
                {/* Prev / Next */}
                <button onClick={goPrev} disabled={currentIdx === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-25 transition-colors">
                  <ChevronLeft size={14} /> 上一个
                </button>
                <button onClick={goNext} disabled={currentIdx >= items.length - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-25 transition-colors">
                  下一个 <ChevronRight size={14} />
                </button>
                <button onClick={goNextUnlabeled}
                  disabled={items.every(i => i.label !== null)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-25 transition-colors">
                  下一未标注
                </button>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                {/* Label buttons */}
                <div className="flex items-center gap-1 flex-wrap flex-1">
                  {labels.map(lbl => {
                    const clr = COLOR_MAP[lbl.color]
                    const isActive = current?.label === lbl.value
                    return (
                      <button
                        key={lbl.id}
                        onClick={() => assignLabel(lbl.value)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                          isActive ? clr.active : `${clr.bg} ${clr.border} ${clr.text} hover:brightness-95`
                        }`}
                      >
                        <Kbd k={lbl.key} />
                        {lbl.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: history panel */}
        {showHistory && (
          <div className="w-56 flex-shrink-0 border-l border-slate-100 bg-white flex flex-col">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">标注历史</span>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 text-sm">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {historyList.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-4">暂无保存记录</p>
              ) : (
                <div className="space-y-1.5">
                  {historyList.map(result => {
                    const isActive = activeResultId === result.id
                    return (
                      <div key={result.id}
                        className={`rounded-lg border p-2 transition-all ${
                          isActive ? 'border-sky-300 bg-sky-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium text-slate-700 flex-1 truncate">{result.name}</span>
                          {isActive && <span className="text-[8px] text-sky-500 font-semibold flex-shrink-0">当前</span>}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {result.labeledCount}/{result.totalCount} 已标注 · {formatDate(result.updatedAt)}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <button
                            onClick={() => handleLoadResult(result)}
                            className="flex-1 px-2 py-0.5 rounded text-[9px] font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors text-center">
                            {isActive ? '重新加载' : '加载'}
                          </button>
                          <button
                            onClick={() => handleDeleteResult(result.id)}
                            className="px-1.5 py-0.5 rounded text-[9px] text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showEditor && (
        <LabelEditor
          labels={labels}
          onChange={setLabels}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
