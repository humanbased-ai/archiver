import { Upload, Scissors, Film, Tag, Download } from 'lucide-react'

export type WorkflowPhase = 'upload' | 'cull' | 'slice' | 'annotate' | 'export'

const STEPS: { phase: WorkflowPhase; label: string; icon: typeof Upload }[] = [
  { phase: 'upload',   label: '上传',  icon: Upload   },
  { phase: 'cull',     label: '裁剪',  icon: Scissors },
  { phase: 'slice',    label: '切片',  icon: Film     },
  { phase: 'annotate', label: '标注',  icon: Tag      },
  { phase: 'export',   label: '导出',  icon: Download },
]

interface Props {
  current: WorkflowPhase
}

export default function WorkflowStepper({ current }: Props) {
  const currentIdx = STEPS.findIndex(s => s.phase === current)

  return (
    <div className="w-full bg-white border-b border-slate-100 px-6 py-3">
      <div className="max-w-4xl mx-auto">
        <ol className="flex items-center gap-0">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            const isDone    = idx < currentIdx
            const isActive  = idx === currentIdx
            const isPending = idx > currentIdx
            const isLast    = idx === STEPS.length - 1

            return (
              <li key={step.phase} className="flex items-center flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors
                    ${isDone    ? 'bg-emerald-100 text-emerald-600' :
                      isActive  ? 'bg-sky-500 text-white shadow-sm shadow-sky-300' :
                                  'bg-slate-100 text-slate-400'}`}>
                    <Icon size={13} />
                  </div>
                  <span className={`text-sm font-medium whitespace-nowrap transition-colors
                    ${isDone    ? 'text-emerald-600' :
                      isActive  ? 'text-sky-600' :
                                  'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div className={`flex-1 h-px mx-3 transition-colors
                    ${idx < currentIdx ? 'bg-emerald-200' : 'bg-slate-150 bg-slate-200'}`} />
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
