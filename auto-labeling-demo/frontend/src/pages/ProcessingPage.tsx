import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, ArrowLeft, AlertCircle, Video } from 'lucide-react'
import { api } from '../api'
import { store, Clip } from '../store'

// startPct: cumulative progress start; weight: this step's share of 100%
const VIDEO_STEPS = [
  { key: 'decode', label: '解析视频信息', desc: '读取帧率、时长等元数据', startPct: 0,  weight: 10 },
  { key: 'motion', label: '运动检测分析', desc: '检测有效动作片段',       startPct: 10, weight: 70 },
  { key: 'cut',    label: '切分视频片段', desc: '将有效片段导出为独立文件', startPct: 80, weight: 20 },
  { key: 'done',   label: '准备完毕',    desc: '可以开始标注',            startPct: 100, weight: 0 },
]

const SEQ_STEPS = [
  { key: 'extract', label: '解压序列帧',   desc: '解压 ZIP 压缩包',            startPct: 0,  weight: 10 },
  { key: 'parse',   label: '解析元数据',   desc: '读取 extraction_info.txt',   startPct: 10, weight: 5  },
  { key: 'motion',  label: '运动检测分析', desc: '在序列帧上检测有效片段',       startPct: 15, weight: 70 },
  { key: 'cut',     label: '整理帧片段',   desc: '按片段复制帧到服务目录',       startPct: 85, weight: 15 },
  { key: 'done',    label: '准备完毕',     desc: '可以开始标注',               startPct: 100, weight: 0 },
]

export default function ProcessingPage() {
  const { videoId: jobId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'ready' | 'failed'>('processing')
  const [step, setStep] = useState<string>('decode')
  const [stepPct, setStepPct] = useState(0)
  const [jobName, setJobName] = useState('')
  const [inputType, setInputType] = useState<'video' | 'sequence'>('video')
  const [elapsed, setElapsed] = useState(0)
  const [dots, setDots] = useState('')
  const [backendError, setBackendError] = useState('')

  useEffect(() => {
    const t1 = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    const t2 = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])

  useEffect(() => {
    if (!jobId) return
    const localJob = store.getJob(jobId)
    if (localJob) setJobName(localJob.task_name || localJob.filename)

    let stopped = false

    const poll = async () => {
      try {
        const res = await api.getJob(jobId)
        const job = res.data
        setJobName(job.task_name || job.filename)
        setStatus(job.status)
        if (job.input_type) setInputType(job.input_type)
        if (job.step) setStep(job.step)
        if (job.step_pct !== undefined) setStepPct(job.step_pct)

        if (job.status === 'ready') {
          stopped = true
          clearInterval(timer)
          const clips: Clip[] = job.clips.map(c => ({
            id: c.id,
            start_ms: c.start_ms,
            end_ms: c.end_ms,
            start_ns: c.start_ns ?? null,
            end_ns: c.end_ns ?? null,
            clip_url: c.clip_url ?? null,
            frame_urls: c.frame_urls ?? null,
            fps: c.fps ?? null,
            thumb_url: c.thumb_url ?? null,
            blur_score: c.blur_score ?? null,
            brightness: c.brightness ?? null,
            is_reviewed: false,
            is_valid: false,
            human_label: null,
          }))
          store.saveClips(jobId, clips)
          store.saveCulledSegments(jobId, job.culled_segments ?? [])
          store.saveAllSegments(jobId, job.all_segments ?? [])
          store.patchJob(jobId, { status: 'ready' })
          navigate(`/annotate/${jobId}`, { replace: true })
        } else if (job.status === 'failed') {
          stopped = true
          clearInterval(timer)
          store.patchJob(jobId, { status: 'failed' })
          if (job.error) setBackendError(job.error)
        }
      } catch {
        // backend may not have the job if server restarted
      }
    }

    poll()
    const timer = setInterval(() => { if (!stopped) poll() }, 2000)
    return () => clearInterval(timer)
  }, [jobId, navigate])

  const STEPS = inputType === 'sequence' ? SEQ_STEPS : VIDEO_STEPS
  const STEP_KEYS = STEPS.map(s => s.key)
  const currentStep = status === 'failed' ? -1 : status === 'ready' ? STEPS.length : STEP_KEYS.indexOf(step)

  // Global progress: sum of completed steps + fractional current step
  const globalPct = (() => {
    const meta = STEPS.find(s => s.key === step)
    if (!meta || status !== 'processing') return status === 'ready' ? 100 : 0
    return meta.startPct + (stepPct / 100) * meta.weight
  })()

  // ETA: only show when global progress > 3% to avoid noisy early estimates
  const etaStr = (() => {
    if (globalPct < 3 || status !== 'processing') return null
    const remaining = Math.round(elapsed / (globalPct / 100) - elapsed)
    if (remaining <= 0) return null
    return remaining < 60 ? `约 ${remaining}s` : `约 ${Math.floor(remaining / 60)}m ${remaining % 60}s`
  })()

  const formatElapsed = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <button onClick={() => navigate('/')} className="btn-ghost mb-6 text-sm">
          <ArrowLeft size={15} />
          返回主页
        </button>

        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-4">
              {status === 'failed' ? (
                <AlertCircle size={28} className="text-rose-500" />
              ) : status === 'ready' ? (
                <CheckCircle2 size={28} className="text-emerald-500" />
              ) : (
                <Video size={28} className="text-sky-500" />
              )}
            </div>
            <h1 className="text-lg font-semibold text-slate-800">
              {status === 'failed' ? '处理失败' : status === 'ready' ? '处理完成' : inputType === 'sequence' ? `序列帧处理中${dots}` : `视频处理中${dots}`}
            </h1>
            <p className="text-sm text-slate-400 mt-1 truncate max-w-xs mx-auto">
              {jobName || '加载中…'}
            </p>
          </div>

          {status === 'failed' ? (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 text-center">
              视频处理失败，请检查文件格式是否正确，或确认后端日志中的错误信息。
              {backendError && (
                <div className="mt-2 font-mono text-xs bg-rose-100 rounded-lg px-3 py-2 text-left break-all text-rose-800">
                  {backendError}
                </div>
              )}
              <br />
              <button onClick={() => navigate('/')} className="mt-3 btn-primary text-xs px-4 py-2">
                重新上传
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-6">
                {STEPS.map((s, i) => {
                  const isDone = i < currentStep
                  const isActive = i === currentStep
                  const isPending = i > currentStep
                  return (
                    <div
                      key={s.key}
                      className={`p-3 rounded-xl transition-all border
                        ${isActive ? 'bg-sky-50 border-sky-200' : isPending ? 'opacity-35 border-transparent' : 'bg-emerald-50/60 border-transparent'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                          ${isDone ? 'bg-emerald-100' : isActive ? 'bg-sky-100' : 'bg-slate-100'}`}>
                          {isDone ? (
                            <CheckCircle2 size={13} className="text-emerald-600" />
                          ) : isActive ? (
                            <Loader2 size={13} className="text-sky-500 animate-spin" />
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">{i + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isDone ? 'text-emerald-700' : isActive ? 'text-sky-700' : 'text-slate-400'}`}>
                            {s.label}
                          </p>
                          {isActive && <p className="text-xs text-sky-400 mt-0.5">{s.desc}</p>}
                        </div>
                        {isActive && <span className="text-xs text-sky-500 font-mono tabular-nums">{stepPct}%</span>}
                      </div>
                      {isActive && (
                        <div className="mt-2 h-1 bg-sky-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-400 rounded-full transition-all duration-500"
                            style={{ width: `${stepPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Global progress bar */}
              {globalPct > 0 && globalPct < 100 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>总进度</span>
                    <span className="font-mono tabular-nums">{Math.round(globalPct)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full transition-all duration-700"
                      style={{ width: `${globalPct}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="text-center text-xs text-slate-400">
                已用时 {formatElapsed(elapsed)}
                {etaStr && <span className="ml-2 text-indigo-400 font-medium">{etaStr}</span>}
                <span className="ml-2">· 每 2 秒自动刷新</span>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
