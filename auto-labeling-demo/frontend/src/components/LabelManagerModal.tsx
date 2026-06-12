import { useState } from 'react'
import { X, Plus, Trash2, RotateCcw, GripVertical } from 'lucide-react'
import { store, ActionLabel, COLOR_MAP, COLOR_OPTIONS, DEFAULT_LABELS } from '../store'

interface Props {
  onClose: () => void
  onChange: (labels: ActionLabel[]) => void
}

function genId() {
  return Math.random().toString(36).slice(2, 8)
}

function toValue(label: string) {
  return label
    .toLowerCase()
    .replace(/[\u4e00-\u9fa5]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'label_' + genId()
}

const RESERVED_KEYS = new Set([' ', 'ArrowLeft', 'ArrowRight', 'Escape'])

export default function LabelManagerModal({ onClose, onChange }: Props) {
  const [labels, setLabels] = useState<ActionLabel[]>(() => store.getLabels())
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const update = (next: ActionLabel[]) => {
    setLabels(next)
  }

  const save = () => {
    store.saveLabels(labels)
    onChange(labels)
    onClose()
  }

  const reset = () => {
    setLabels([...DEFAULT_LABELS])
  }

  const addLabel = () => {
    const usedKeys = new Set(labels.map(l => l.key))
    const nextKey = '123456789abcdefghijklmnopqrstuvwxyz'.split('').find(k => !usedKeys.has(k)) ?? ''
    const colorIdx = labels.length % COLOR_OPTIONS.length
    update([...labels, { id: genId(), key: nextKey, label: '', value: '', color: COLOR_OPTIONS[colorIdx] }])
  }

  const remove = (id: string) => {
    update(labels.filter(l => l.id !== id))
  }

  const patch = (id: string, field: keyof ActionLabel, value: string) => {
    update(labels.map(l => {
      if (l.id !== id) return l
      const next = { ...l, [field]: value }
      if (field === 'label' && !l.value) next.value = toValue(value)
      return next
    }))
  }

  const patchKey = (id: string, raw: string) => {
    const k = raw.slice(-1)
    if (!k || RESERVED_KEYS.has(k)) return
    if (labels.some(l => l.id !== id && l.key === k)) return
    patch(id, 'key', k)
  }

  // Drag-to-reorder
  const handleDragStart = (i: number) => setDragIndex(i)
  const handleDragEnter = (i: number) => setDragOver(i)
  const handleDragEnd = () => {
    if (dragIndex !== null && dragOver !== null && dragIndex !== dragOver) {
      const next = [...labels]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(dragOver, 0, moved)
      update(next)
    }
    setDragIndex(null)
    setDragOver(null)
  }

  const keyConflicts = (() => {
    const seen = new Map<string, number>()
    labels.forEach((l, i) => { if (l.key) seen.set(l.key, (seen.get(l.key) ?? 0) + 1) })
    return new Set(labels.filter(l => (seen.get(l.key) ?? 0) > 1).map(l => l.id))
  })()

  const hasErrors = labels.some(l => !l.key || !l.label || keyConflicts.has(l.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-800">描述语义管理</h2>
            <p className="text-xs text-slate-400 mt-0.5">编辑动作标签字典，标注时快捷键将同步更新</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Column headers */}
          <div className="grid grid-cols-[24px_56px_1fr_1fr_160px_32px] gap-2 items-center mb-2 px-1">
            <span />
            <span className="text-xs text-slate-400 font-medium">快捷键</span>
            <span className="text-xs text-slate-400 font-medium">显示名称</span>
            <span className="text-xs text-slate-400 font-medium">导出值</span>
            <span className="text-xs text-slate-400 font-medium">颜色</span>
            <span />
          </div>

          <div className="space-y-2">
            {labels.map((label, i) => {
              const c = COLOR_MAP[label.color] ?? COLOR_MAP.slate
              const keyErr = keyConflicts.has(label.id)
              return (
                <div
                  key={label.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragEnter={() => handleDragEnter(i)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className={`grid grid-cols-[24px_56px_1fr_1fr_160px_32px] gap-3 items-center p-3 rounded-xl border transition-all
                    ${dragOver === i && dragIndex !== i ? 'border-sky-300 bg-sky-50' : 'border-slate-100 bg-slate-50/50'}`}
                >
                  {/* Drag handle */}
                  <GripVertical size={14} className="text-slate-300 cursor-grab mx-auto" />

                  {/* Key */}
                  <input
                    value={label.key}
                    onChange={e => patchKey(label.id, e.target.value)}
                    maxLength={1}
                    placeholder="键"
                    className={`w-full text-center rounded-lg border px-2 py-1.5 text-sm font-mono outline-none focus:ring-2 transition-all
                      ${keyErr ? 'border-rose-300 bg-rose-50 focus:ring-rose-200' : 'border-slate-200 focus:ring-sky-200 focus:border-sky-400'}`}
                  />

                  {/* Label name */}
                  <input
                    value={label.label}
                    onChange={e => patch(label.id, 'label', e.target.value)}
                    placeholder="如：折叠纸箱"
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none focus:ring-2 transition-all
                      ${!label.label ? 'border-amber-200 focus:ring-amber-200' : 'border-slate-200 focus:ring-sky-200 focus:border-sky-400'}`}
                  />

                  {/* Value */}
                  <input
                    value={label.value}
                    onChange={e => patch(label.id, 'value', e.target.value)}
                    placeholder="如：fold_box"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                  />

                  {/* Color picker */}
                  <div className="grid grid-cols-5 gap-2 px-2">
                    {COLOR_OPTIONS.map(color => {
                      const isSelected = label.color === color
                      return (
                        <button
                          key={color}
                          title={color}
                          onClick={() => patch(label.id, 'color', color)}
                          className={`w-5 h-5 rounded-full ${COLOR_MAP[color].dot} transition-all flex items-center justify-center mx-auto
                            ${isSelected ? 'ring-[3px] ring-offset-2 ring-sky-100 shadow-sm' : 'hover:scale-110 opacity-60 hover:opacity-100'}`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => remove(label.id)}
                    className="w-7 h-7 rounded-lg hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center text-slate-300 transition-colors mx-auto"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>

          {labels.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              暂无标签，点击下方「添加」创建第一个
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
          <button onClick={addLabel} className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium">
            <Plus size={15} />
            添加标签
          </button>
          <button onClick={reset} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 ml-auto">
            <RotateCcw size={13} />
            恢复默认
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            取消
          </button>
          <button
            onClick={save}
            disabled={hasErrors}
            className="px-5 py-2 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
