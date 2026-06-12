import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Video, Clock, CheckCircle2, AlertCircle, ChevronRight, Zap, Download, ArrowLeft, ArrowRight, Trash2, RefreshCw, ChevronDown, ChevronUp, Bookmark, X, Scissors } from 'lucide-react'
import { api, ReprocessParams } from '../api'
import { store, Job } from '../store'
import { compressZip, formatBytes } from '../utils/compress-zip'

// ── Detection preset management ────────────────────────────────────────────
interface DetectionPreset {
  id: string
  name: string
  desc: string
  builtIn: boolean
  params: Omit<ReprocessParams, 'task_name'>
}

const BUILT_IN_PRESETS: DetectionPreset[] = [
  {
    id: 'universal',
    name: '通用（默认）',
    desc: '光流+动作检测，不过滤人员，自动校准阈值',
    builtIn: true,
    params: { filter_humans: false, detector: 'yolo', yolo_model: 'yolov8s.pt', detection_strategy: 'single', require_center: false, center_margin: 0.20, require_arms: false, arm_conf_threshold: 0.30, motion_threshold: 0.015, low_action_threshold: 0.04, hand_activity_threshold: 0, smooth_window: 5, frame_sample_step: 2, continuity_gap_frames: 5, compress_px: 640 },
  },
  {
    id: 'human_yolo',
    name: '人员过滤·YOLO',
    desc: 'YOLO 单模型检测人员 + 光流手部活跃判定',
    builtIn: true,
    params: { filter_humans: true, detector: 'yolo', yolo_model: 'yolov8s.pt', detection_strategy: 'single', require_center: false, center_margin: 0.20, require_arms: false, arm_conf_threshold: 0.30, motion_threshold: 0.015, low_action_threshold: 0.04, hand_activity_threshold: 0, smooth_window: 5, frame_sample_step: 2, continuity_gap_frames: 5, compress_px: 640 },
  },
  {
    id: 'workstation',
    name: '工位操作',
    desc: 'YOLO 人员检测 + 中心区域过滤 + 光流手部活跃',
    builtIn: true,
    params: { filter_humans: true, detector: 'yolo', yolo_model: 'yolov8s.pt', detection_strategy: 'single', require_center: true, center_margin: 0.10, require_arms: false, arm_conf_threshold: 0.30, motion_threshold: 0.020, low_action_threshold: 0.050, hand_activity_threshold: 0, smooth_window: 5, frame_sample_step: 2, continuity_gap_frames: 5, compress_px: 640 },
  },
  {
    id: 'workstation_pose',
    name: '工位精细（Pose）',
    desc: 'Pose 骨骼检测，要求人在中央且手臂可见',
    builtIn: true,
    params: { filter_humans: true, detector: 'pose', yolo_model: 'yolov8s.pt', detection_strategy: 'single', require_center: true, center_margin: 0.10, require_arms: true, arm_conf_threshold: 0.30, motion_threshold: 0.020, low_action_threshold: 0.050, hand_activity_threshold: 0, smooth_window: 5, frame_sample_step: 2, continuity_gap_frames: 5, compress_px: 640 },
  },
]

const PRESETS_KEY = 'auto-labeling-custom-presets'
function loadCustomPresets(): DetectionPreset[] {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '[]') } catch { return [] }
}

interface TipContent { use: string; when: string; rec: string }
function InfoTip({ tip }: { tip: TipContent }) {
  return (
    <span className="relative group inline-flex ml-1 align-middle cursor-help">
      <span className="text-[9px] text-slate-400 group-hover:text-slate-600 select-none">&#9432;</span>
      <span className="pointer-events-none absolute left-0 bottom-full mb-1 z-50 hidden group-hover:block w-56 rounded-xl bg-slate-900 p-2.5 shadow-2xl text-[10px] leading-relaxed whitespace-normal">
        <b className="block text-amber-300 mb-0.5">{'\u7528\u9014'}</b>
        <span className="block text-slate-300 mb-1.5">{tip.use}</span>
        <b className="block text-amber-300 mb-0.5">{'\u4f7f\u7528\u573a\u666f'}</b>
        <span className="block text-slate-300 mb-1.5">{tip.when}</span>
        <b className="block text-amber-300 mb-0.5">{'\u63a8\u8350\u8bbe\u7f6e'}</b>
        <span className="block text-slate-300">{tip.rec}</span>
      </span>
    </span>
  )
}

function formatDate(str: string) {
  return new Date(str).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_MAP: Record<Job['status'], { label: string; color: string; icon: typeof Clock }> = {
  processing: { label: '处理中', color: 'text-amber-500 bg-amber-50', icon: Clock },
  ready: { label: '待标注', color: 'text-sky-600 bg-sky-50', icon: CheckCircle2 },
  failed: { label: '处理失败', color: 'text-rose-500 bg-rose-50', icon: AlertCircle },
}

export default function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [jobs, setJobs] = useState<Job[]>(() => store.getJobs())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  interface ReprocessPanel extends ReprocessParams {
    jobId: string
  }
  const [reprocessPanel, setReprocessPanel] = useState<ReprocessPanel | null>(null)
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessError, setReprocessError] = useState('')
  const [customPresets, setCustomPresets] = useState<DetectionPreset[]>(loadCustomPresets)
  const [activePresetId, setActivePresetId] = useState<string | null>('universal')
  const [savingPreset, setSavingPreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [scenarioCode, setScenarioCode] = useState('HOTEL_01')
  const [taskName, setTaskName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStep, setUploadStep] = useState<1 | 2>(1)
  const [newJobParams, setNewJobParams] = useState<ReprocessParams>({ ...BUILT_IN_PRESETS[0].params })
  const [newJobActivePreset, setNewJobActivePreset] = useState<string>('universal')
  const [yoloAvailable, setYoloAvailable] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [compressInBrowser, setCompressInBrowser] = useState(false)
  const [compressMaxDim, setCompressMaxDim] = useState(640)
  const [compressing, setCompressing] = useState(false)
  const [compressProgress, setCompressProgress] = useState(0)
  const [compressedSize, setCompressedSize] = useState<number | null>(null)
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null)
  const [compressReady, setCompressReady] = useState(false)

  useEffect(() => {
    api.health().then(r => setYoloAvailable(r.data.yolo)).catch(() => {})
  }, [])

  const isZip = (file: File) => file.name.toLowerCase().endsWith('.zip')

  const handleDownloadCompressed = () => {
    if (!compressedBlob || !selectedFile) return
    const baseName = selectedFile.name.replace(/\.zip$/i, '')
    const url = URL.createObjectURL(compressedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}_compressed_${compressMaxDim}px.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetCompression = () => {
    setCompressReady(false)
    setCompressedBlob(null)
    setCompressedSize(null)
    setCompressProgress(0)
    setError('')
  }

  const handleFile = (file: File) => {
    setCompressedBlob(null)
    setCompressReady(false)
    const isVideo = file.type.startsWith('video/')
    const isZipFile = isZip(file)
    if (!isVideo && !isZipFile) {
      setError('请上传视频文件（mp4 / mov / avi）或序列帧 ZIP 压缩包')
      return
    }
    setError('')
    setSelectedFile(file)
    if (!taskName) setTaskName(file.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleCompress = async () => {
    if (!selectedFile || !isZip(selectedFile)) return
    setError('')
    setCompressedSize(null)
    setCompressReady(false)
    setCompressing(true)
    setCompressProgress(0)
    try {
      const blob = await compressZip(selectedFile, {
        maxDim: compressMaxDim,
        onProgress: (pct) => setCompressProgress(pct),
      })
      setCompressedSize(blob.size)
      setCompressedBlob(blob)
      setCompressReady(true)
    } catch {
      setError('前端压缩失败，请重试')
    } finally {
      setCompressing(false)
    }
  }

  const handleUploadNow = async (fileToUpload: File | Blob) => {
    if (!selectedFile) return
    setUploading(true)
    setUploadProgress(0)
    try {
      const form = new FormData()
      form.append('file', fileToUpload, selectedFile.name)
      form.append('scenario_code', scenarioCode)
      form.append('task_name', taskName)
      const res = await api.process(form, newJobParams, setUploadProgress)
      const jobId = res.data.job_id
      store.upsertJob({
        id: jobId,
        filename: selectedFile.name,
        task_name: taskName || selectedFile.name,
        scenario_code: scenarioCode,
        status: 'processing',
        created_at: new Date().toISOString(),
        file_hash: res.data.file_hash ?? null,
      })
      navigate(`/processing/${jobId}`)
    } catch {
      setError('上传失败，请检查后端服务是否启动')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleDirectUpload = () => {
    if (!selectedFile) return
    handleUploadNow(selectedFile)
  }

  const goToJob = (j: Job) => {
    if (j.status === 'processing') navigate(`/processing/${j.id}`)
    else navigate(`/annotate/${j.id}`)
  }

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets]

  const applyPreset = (preset: DetectionPreset) => {
    setActivePresetId(preset.id)
    setReprocessPanel(p => p ? { ...p, ...preset.params } : p)
  }

  const newJobApplyPreset = (preset: DetectionPreset) => {
    setNewJobActivePreset(preset.id)
    setNewJobParams({ ...preset.params })
  }

  const saveCurrentAsPreset = () => {
    if (!reprocessPanel || !newPresetName.trim()) return
    const { jobId: _jobId, task_name: _tn, ...params } = reprocessPanel
    const id = `custom_${Date.now()}`
    const newPreset: DetectionPreset = { id, name: newPresetName.trim(), desc: '自定义配置', builtIn: false, params }
    const updated = [...customPresets, newPreset]
    setCustomPresets(updated)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated))
    setActivePresetId(id)
    setSavingPreset(false)
    setNewPresetName('')
  }

  const deleteCustomPreset = (id: string) => {
    const updated = customPresets.filter(p => p.id !== id)
    setCustomPresets(updated)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated))
    if (activePresetId === id) setActivePresetId(null)
  }

  const openReprocess = (e: React.MouseEvent, j: Job) => {
    e.stopPropagation()
    setConfirmDelete(null)
    setSavingPreset(false)
    const defaultPreset = BUILT_IN_PRESETS[0]
    if (reprocessPanel?.jobId === j.id) {
      setReprocessPanel(null)
    } else {
      setActivePresetId(defaultPreset.id)
      setReprocessPanel({
        jobId: j.id,
        task_name: `${j.task_name} (重新处理)`,
        ...defaultPreset.params,
      })
    }
  }

  const handleReprocess = async () => {
    if (!reprocessPanel) return
    setReprocessing(true)
    setReprocessError('')
    try {
      const { jobId, ...params } = reprocessPanel
      const res = await api.reprocessJob(jobId, params)
      const newJobId = res.data.job_id
      const original = jobs.find(j => j.id === jobId)!
      store.upsertJob({
        id: newJobId,
        filename: original.filename,
        task_name: reprocessPanel.task_name || `${original.task_name} (重新处理)`,
        scenario_code: original.scenario_code,
        status: 'processing',
        created_at: new Date().toISOString(),
        parent_job_id: original.parent_job_id ?? original.id,
        file_hash: original.file_hash ?? null,
      })
      setJobs(store.getJobs())
      setReprocessPanel(null)
      navigate(`/processing/${newJobId}`)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        setReprocessError('服务端重启后原始任务已丢失，请重新上传文件。')
      } else {
        setReprocessError('重新处理失败，请确认后端服务正常且原始文件未被删除。')
      }
    } finally {
      setReprocessing(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation()
    if (confirmDelete !== jobId) {
      setConfirmDelete(jobId)
      return
    }
    setDeleting(jobId)
    try {
      await api.deleteJob(jobId)
    } catch {
      // ignore — backend may have restarted; still clean up local data
    } finally {
      store.removeJob(jobId)
      setJobs(store.getJobs())
      setConfirmDelete(null)
      setDeleting(null)
    }
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-slate-800">视频动作标注工具</h1>
          <p className="text-slate-400 text-sm mt-1">上传视频或序列帧，自动切分动作片段</p>
        </div>

          {/* Upload card — 2-step wizard */}
          <div className="card overflow-hidden">

            {/* ── Step tabs ── */}
            <div className="flex border-b border-slate-100">
              {[{ n: 1, label: '上传文件' }, { n: 2, label: '裁剪配置' }].map(({ n, label }) => {
                const done    = n < uploadStep
                const active  = n === uploadStep
                return (
                  <div key={n} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium border-b-2 transition-colors
                    ${active  ? 'border-sky-500 text-sky-600 bg-sky-50/40' :
                      done    ? 'border-emerald-400 text-emerald-600 bg-emerald-50/30' :
                                'border-transparent text-slate-400'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${active ? 'bg-sky-500 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {done ? '✓' : n}
                    </span>
                    {label}
                  </div>
                )
              })}
            </div>

            <div className="p-6">

              {/* ════════ STEP 1: Upload file ════════ */}
              {uploadStep === 1 && (
                <>
                  {/* Drop zone */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                      ${dragging ? 'border-sky-400 bg-sky-50' : selectedFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*,.zip,application/zip"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    {selectedFile ? (
                      <>
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                        <p className="font-medium text-emerald-700">{selectedFile.name}</p>
                        <p className="text-sm text-emerald-600 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        <p className="text-xs text-emerald-500 mt-2">点击更换文件</p>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="mx-auto mb-3 text-slate-400" />
                        <p className="font-medium text-slate-600">拖放视频或序列帧压缩包到此处</p>
                        <p className="text-sm text-slate-400 mt-1">或点击选择文件</p>
                        <p className="text-xs text-slate-300 mt-2">视频：mp4 / mov / avi &nbsp;|&nbsp; 序列帧：.zip（含 extraction_info.txt）</p>
                      </>
                    )}
                  </div>

                  {/* Meta fields */}
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">任务名称</label>
                      <input
                        type="text"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        placeholder="如：hotel_packing_batch01"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">场景代码</label>
                      <input
                        type="text"
                        value={scenarioCode}
                        onChange={(e) => setScenarioCode(e.target.value)}
                        placeholder="如：HOTEL_01"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
                      />
                    </div>
                    {/* Browser-side compression — only for ZIP */}
                    {selectedFile && isZip(selectedFile) && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCompressInBrowser(v => !v)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all
                            ${compressInBrowser ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            <Zap size={14} className={compressInBrowser ? 'text-amber-500' : 'text-slate-400'} />
                            上传前在浏览器压缩图片
                          </span>
                          <span className={`flex items-center gap-1.5 text-xs ${compressInBrowser ? 'text-amber-600' : 'text-slate-400'}`}>
                            {compressInBrowser ? '已开启，减小上传体积' : '已关闭，上传原始文件'}
                            <span className={`inline-flex w-8 h-[18px] rounded-full transition-colors relative ${
                              compressInBrowser ? 'bg-amber-400' : 'bg-slate-200'
                            }`}>
                              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${
                                compressInBrowser ? 'left-[18px]' : 'left-0.5'
                              }`} />
                            </span>
                          </span>
                        </button>
                        {compressInBrowser && (
                          <div className="flex gap-2">
                            {([320, 640, 960, 1280] as const).map(dim => (
                              <button
                                key={dim}
                                type="button"
                                onClick={() => setCompressMaxDim(dim)}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all
                                  ${compressMaxDim === dim
                                    ? 'bg-amber-400 border-amber-400 text-white shadow-sm'
                                    : 'border-amber-200 text-amber-600 hover:bg-amber-50'}`}
                              >
                                {dim}px
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {error && (
                    <div className="mt-3 flex items-center gap-2 text-rose-600 text-sm bg-rose-50 rounded-lg px-3 py-2">
                      <AlertCircle size={14} />{error}
                    </div>
                  )}

                  {/* Compressing progress */}
                  {compressing && (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <span className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                          <Zap size={12} />浏览器压缩中（{compressMaxDim}px）
                        </span>
                        <span className="font-mono tabular-nums text-amber-600">{compressProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-200"
                          style={{ width: `${compressProgress}%`, background: 'linear-gradient(90deg, #fbbf24, #f97316)' }} />
                      </div>
                      <p className="text-xs text-amber-500 text-center">压缩完成前请勿关闭页面</p>
                    </div>
                  )}

                  {/* Compress result */}
                  {compressReady && selectedFile && compressedSize != null && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                        <CheckCircle2 size={16} className="text-emerald-500" />压缩完成
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-lg p-2 border border-emerald-100">
                          <p className="text-[10px] text-slate-400 mb-0.5">原始大小</p>
                          <p className="text-sm font-semibold text-slate-700">{formatBytes(selectedFile.size)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-emerald-100">
                          <p className="text-[10px] text-slate-400 mb-0.5">压缩后</p>
                          <p className="text-sm font-semibold text-emerald-600">{formatBytes(compressedSize)}</p>
                        </div>
                        <div className="bg-amber-400 rounded-lg p-2">
                          <p className="text-[10px] text-amber-100 mb-0.5">节省</p>
                          <p className="text-sm font-bold text-white">{Math.round((1 - compressedSize / selectedFile.size) * 100)}%</p>
                        </div>
                      </div>
                      <p className="text-xs text-emerald-600 text-center">图片已缩放至最大边 {compressMaxDim}px</p>
                      <button type="button" onClick={handleDownloadCompressed}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-300 text-emerald-700 text-sm font-medium hover:bg-emerald-100 bg-white">
                        <Download size={13} />下载压缩包到本地
                      </button>
                      <button type="button" onClick={resetCompression}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={11} />重新压缩
                      </button>
                    </div>
                  )}

                  {/* Action: go to step 2 */}
                  {!compressing && (
                    <div className="mt-4">
                      {compressInBrowser && selectedFile && isZip(selectedFile) && !compressReady ? (
                        <button
                          className="btn-primary w-full"
                          style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316)' }}
                          disabled={!selectedFile}
                          onClick={handleCompress}
                        >
                          <Zap size={15} />先压缩，再配置裁剪
                        </button>
                      ) : (
                        <button
                          className="btn-primary w-full"
                          disabled={!selectedFile}
                          onClick={() => setUploadStep(2)}
                        >
                          下一步：裁剪配置
                          <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ════════ STEP 2: Slice config ════════ */}
              {uploadStep === 2 && (
                <>
                  {/* ── Preset bar ── */}
                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Bookmark size={10} /> 切片预设
                      </span>
                      {!savingPreset ? (
                        <button type="button"
                          onClick={() => { setSavingPreset(true); setNewPresetName('') }}
                          className="text-[10px] text-sky-600 hover:text-sky-700 flex items-center gap-0.5">
                          另存为…
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input autoFocus
                            value={newPresetName}
                            onChange={e => setNewPresetName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveCurrentAsPreset(); if (e.key === 'Escape') setSavingPreset(false) }}
                            placeholder="预设名称…"
                            className="text-[10px] border border-sky-300 rounded px-1.5 py-0.5 w-24 outline-none focus:ring-1 focus:ring-sky-400" />
                          <button type="button" onClick={saveCurrentAsPreset}
                            disabled={!newPresetName.trim()}
                            className="text-[10px] bg-sky-500 text-white rounded px-1.5 py-0.5 disabled:opacity-40">保存</button>
                          <button type="button" onClick={() => setSavingPreset(false)}
                            className="text-[10px] text-slate-400 hover:text-slate-600"><X size={10} /></button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allPresets.map(preset => (
                        <div key={preset.id} className="relative group">
                          <button type="button"
                            title={preset.desc}
                            onClick={() => newJobApplyPreset(preset)}
                            className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                              newJobActivePreset === preset.id
                                ? 'bg-sky-500 border-sky-500 text-white font-semibold'
                                : 'border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-600 bg-white'
                            }`}>
                            {preset.name}
                          </button>
                          {!preset.builtIn && (
                            <button type="button"
                              onClick={() => deleteCustomPreset(preset.id)}
                              className="absolute -top-1 -right-1 hidden group-hover:flex w-3.5 h-3.5 rounded-full bg-rose-400 text-white items-center justify-center">
                              <X size={7} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {newJobActivePreset && (() => {
                      const p = allPresets.find(p => p.id === newJobActivePreset)
                      return p ? <p className="text-[10px] text-slate-400 mt-1.5">{p.desc}</p> : null
                    })()}
                  </div>

                  {/* ── Frame resampling toggle + step ── */}
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setNewJobParams(p => ({
                        ...p,
                        frame_sample_step: (p.frame_sample_step ?? 2) > 1 ? 1 : 2,
                      }))}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all mb-2 ${
                        (newJobParams.frame_sample_step ?? 2) > 1
                          ? 'bg-sky-50 border-sky-200 text-sky-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-left">
                        <span className="text-xs font-medium flex items-center">
                          是否再抽样
                          <InfoTip tip={{ use: '处理时每隔 N 帧取 1 帧分析，加速处理。', when: '上传的序列帧已经过预采样时可关闭再抽样（全帧处理）；帧率较高时可开启。', rec: '已预采样→关闭；原始高帧率→开启，步长 2。' }} />
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">已预采样的序列帧可关闭再抽样</span>
                      </div>
                      <span className={`inline-flex w-8 h-[18px] rounded-full relative transition-colors ${
                        (newJobParams.frame_sample_step ?? 2) > 1 ? 'bg-sky-500' : 'bg-slate-200'
                      }`}>
                        <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${
                          (newJobParams.frame_sample_step ?? 2) > 1 ? 'left-[18px]' : 'left-0.5'
                        }`} />
                      </span>
                    </button>

                    {(newJobParams.frame_sample_step ?? 2) > 1 && (
                      <>
                        <div className="flex items-center justify-between px-1 mb-1">
                          <label className="text-xs text-slate-500 flex items-center font-medium">
                            帧抽样步长
                          </label>
                          <span className="text-xs font-mono text-sky-600">{newJobParams.frame_sample_step ?? 2}</span>
                        </div>
                        <div className="flex gap-1.5">
                          {[2, 3, 4, 5].map(v => (
                            <button key={v} type="button"
                              onClick={() => setNewJobParams(p => ({ ...p, frame_sample_step: v }))}
                              className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                (newJobParams.frame_sample_step ?? 2) === v
                                  ? 'bg-sky-500 border-sky-500 text-white'
                                  : 'border-slate-200 text-slate-500 hover:border-sky-300'
                              }`}>
                              {`1/${v}`}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Server-side frame compression ── */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        帧图片压缩
                        <InfoTip tip={{ use: '服务端保存帧图片时缩放至指定尺寸，降低磁盘占用，加快前端加载速度。', when: '原始序列帧分辨率很高（>720p）时建议开启。', rec: '640px 综合平衡；320px 节省空间最大；不压缩保持原始质量。' }} />
                      </label>
                      <span className="text-[10px] text-slate-400">最长边 ≤ 目标值时不处理</span>
                    </div>
                    <div className="flex gap-1.5">
                      {([0, 640, 320] as const).map(v => (
                        <button key={v} type="button"
                          onClick={() => setNewJobParams(p => ({ ...p, compress_px: v }))}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            (newJobParams.compress_px ?? 0) === v
                              ? 'bg-indigo-500 border-indigo-500 text-white'
                              : 'border-slate-200 text-slate-500 hover:border-indigo-300'
                          }`}>
                          {v === 0 ? '不压缩' : `${v}px`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Motion thresholds ── */}
                  <div className="space-y-3 mb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 flex items-center">
                          静止阈值
                          <InfoTip tip={{ use: '低于此值的帧被标记为静止时段，将被剔除。', when: '拍摄环境较暗或摄像机微抖时适当调高。', rec: '0.010–0.025；默认 0.015。' }} />
                        </label>
                        <input type="number" step="0.005" min="0" max="0.1"
                          value={newJobParams.motion_threshold ?? 0.015}
                          onChange={e => setNewJobParams(p => ({ ...p, motion_threshold: parseFloat(e.target.value) }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 flex items-center">
                          低动作阈值
                          <InfoTip tip={{ use: '区分过渡动作与有效操作的边界。', when: '细小手部操作场景可适当调低。', rec: '0.030–0.060；默认 0.040。' }} />
                        </label>
                        <input type="number" step="0.005" min="0" max="0.2"
                          value={newJobParams.low_action_threshold ?? 0.04}
                          onChange={e => setNewJobParams(p => ({ ...p, low_action_threshold: parseFloat(e.target.value) }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 flex items-center">
                          连续性阈值
                          <InfoTip tip={{ use: '允许有效时段中出现 ≤N 帧短暂中断后自动补全。', when: '帧率较低或动作节奏慢时调高。', rec: '3–8 帧；默认 3。' }} />
                        </label>
                        <input type="number" step="1" min="0" max="30"
                          value={newJobParams.continuity_gap_frames ?? 3}
                          onChange={e => setNewJobParams(p => ({ ...p, continuity_gap_frames: parseInt(e.target.value) }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 flex items-center">
                          手部活跃阈值
                          <InfoTip tip={{ use: '光流幅值低于此值的帧视为整理/空闲，非有效操作。', when: '0 = 自动校准（推荐）；手动设置时建议 1.0–3.0。', rec: '默认 0（自动）。' }} />
                        </label>
                        <input type="number" step="0.5" min="0" max="10"
                          value={newJobParams.hand_activity_threshold ?? 0}
                          onChange={e => setNewJobParams(p => ({ ...p, hand_activity_threshold: parseFloat(e.target.value) }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 flex items-center">
                          平滑窗口
                          <InfoTip tip={{ use: '对运动和光流信号做滑窗均值平滑，消除逐帧噪声。', when: '帧率低时调小，帧率高时可调大。', rec: '3–7 帧；默认 5。' }} />
                        </label>
                        <input type="number" step="1" min="1" max="15"
                          value={newJobParams.smooth_window ?? 5}
                          onChange={e => setNewJobParams(p => ({ ...p, smooth_window: parseInt(e.target.value) }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                    </div>

                    {/* ── Human detection toggle ── */}
                    <button
                      onClick={() => setNewJobParams(p => ({ ...p, filter_humans: !p.filter_humans }))}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                        newJobParams.filter_humans ? 'bg-violet-50 border-violet-200 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-medium flex items-center">
                        人体检测过滤
                        <InfoTip tip={{ use: '只保留检测到人员的活动帧，排除无人时段。', when: '监控视角较广或人员时常进出画面。', rec: '人员时现时没→开启；固定工位全程有人→可关闭。' }} />
                      </span>
                      <span className={`inline-flex w-7 h-[16px] rounded-full relative transition-colors ${
                        newJobParams.filter_humans ? 'bg-violet-500' : 'bg-slate-200'
                      }`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                          newJobParams.filter_humans ? 'left-[14px]' : 'left-0.5'
                        }`} />
                      </span>
                    </button>

                    {newJobParams.filter_humans && (
                      <div className="space-y-2 pl-1">
                        {/* Detector */}
                        <div>
                          <label className="text-xs text-slate-500 mb-1 flex items-center font-medium">
                            检测器
                            <InfoTip tip={{ use: '识别人员存在性的算法。', when: 'HOG：CPU 无需 GPU。YOLO：深度学习，准确率高。Pose：骨骼关键点，对弯腰/蹲姿最鲁棒。', rec: '无 GPU→HOG；有 GPU+通用→YOLO 级联；工位操作→Pose 级联。' }} />
                          </label>
                          <div className="flex gap-2">
                            {(['hog', 'yolo', 'pose'] as const).map(d => (
                              <button key={d} type="button"
                                disabled={(d === 'yolo' || d === 'pose') && !yoloAvailable}
                                onClick={() => setNewJobParams(p => ({ ...p, detector: d }))}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                  newJobParams.detector === d
                                    ? 'bg-violet-500 border-violet-500 text-white'
                                    : (d === 'yolo' || d === 'pose') && !yoloAvailable
                                      ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                      : 'border-violet-200 text-violet-600 hover:bg-violet-50'
                                }`}>
                                {d === 'hog' ? 'HOG' : d === 'yolo' ? `YOLO${!yoloAvailable ? '✗' : ''}` : `Pose${!yoloAvailable ? '✗' : ''}`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {newJobParams.detector === 'yolo' && yoloAvailable && (
                          <div>
                            <label className="text-xs text-slate-500 mb-1 flex items-center">
                              YOLO 模型大小
                              <InfoTip tip={{ use: '模型越大精度越高，推理越慢。', when: 'n：极受限。s：速度快、精度平衡，首选。m：更准确。l：高精度。', rec: 'yolov8s 首选。' }} />
                            </label>
                            <select
                              value={newJobParams.yolo_model ?? 'yolov8s.pt'}
                              onChange={e => setNewJobParams(p => ({ ...p, yolo_model: e.target.value }))}
                              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-300 bg-white">
                              <option value="yolov8n.pt">yolov8n — 极速，较低精度</option>
                              <option value="yolov8s.pt">yolov8s — 快速，平衡（推荐）</option>
                              <option value="yolov8m.pt">yolov8m — 中等速度，更准确</option>
                              <option value="yolov8l.pt">yolov8l — 较慢，高精度</option>
                            </select>
                          </div>
                        )}

                        {/* Spatial & pose fine filters */}
                        <div className="border-t border-violet-100 pt-2 space-y-2">
                          <p className="text-xs font-medium text-slate-500">精细筛选条件</p>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-600 flex items-center">
                                人必须在画面中心区
                                <InfoTip tip={{ use: '排除从边缘经过的人。', when: '摄像头正对工位，主操作人员始终居中。', rec: '20% 适合大多数工位。' }} />
                              </span>
                              <span className="text-[10px] text-slate-400">（排除边缘路过的人）</span>
                            </div>
                            <button type="button"
                              onClick={() => setNewJobParams(p => ({ ...p, require_center: !p.require_center }))}
                              className={`inline-flex w-7 h-[16px] rounded-full relative transition-colors flex-shrink-0 ${
                                newJobParams.require_center ? 'bg-violet-500' : 'bg-slate-200'
                              }`}>
                              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                                newJobParams.require_center ? 'left-[14px]' : 'left-0.5'
                              }`} />
                            </button>
                          </div>

                          {newJobParams.require_center && (
                            <div>
                              <label className="text-xs text-slate-500 mb-1 flex items-center">
                                边缘排除幅度（两侧各排除）
                                <span className="ml-1 font-mono text-violet-600">{Math.round((newJobParams.center_margin ?? 0.2) * 100)}%</span>
                              </label>
                              <input type="range" min="0.05" max="0.45" step="0.05"
                                value={newJobParams.center_margin ?? 0.20}
                                onChange={e => setNewJobParams(p => ({ ...p, center_margin: parseFloat(e.target.value) }))}
                                className="w-full accent-violet-500" />
                              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                <span>中央区 90%</span><span>中央区 10%</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-600 flex items-center">
                                要求手臂可见
                                <InfoTip tip={{ use: '确保人员正在进行手部操作。仅 Pose 模式有效。', when: '精细操作标注场景，排除只站立的帧。', rec: '搭配置信度 0.25–0.35。' }} />
                              </span>
                              <span className="text-[10px] text-slate-400">（肩/肘/腕，Pose 模式有效）</span>
                            </div>
                            <button type="button"
                              disabled={newJobParams.detector !== 'pose'}
                              onClick={() => setNewJobParams(p => ({ ...p, require_arms: !p.require_arms }))}
                              className={`inline-flex w-7 h-[16px] rounded-full relative transition-colors flex-shrink-0 ${
                                newJobParams.detector !== 'pose'
                                  ? 'bg-slate-100 cursor-not-allowed'
                                  : newJobParams.require_arms ? 'bg-violet-500' : 'bg-slate-200'
                              }`}>
                              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                                newJobParams.require_arms && newJobParams.detector === 'pose' ? 'left-[14px]' : 'left-0.5'
                              }`} />
                            </button>
                          </div>

                          {newJobParams.require_arms && newJobParams.detector === 'pose' && (
                            <div>
                              <label className="text-xs text-slate-500 mb-1 flex items-center">
                                手臂关键点置信度
                                <span className="ml-1 font-mono text-violet-600">{newJobParams.arm_conf_threshold ?? 0.30}</span>
                              </label>
                              <input type="range" min="0.1" max="0.8" step="0.05"
                                value={newJobParams.arm_conf_threshold ?? 0.30}
                                onChange={e => setNewJobParams(p => ({ ...p, arm_conf_threshold: parseFloat(e.target.value) }))}
                                className="w-full accent-violet-500" />
                              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                <span>宽松 (0.1)</span><span>严格 (0.8)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="mt-2 flex items-center gap-2 text-rose-600 text-sm bg-rose-50 rounded-lg px-3 py-2">
                      <AlertCircle size={14} />{error}
                    </div>
                  )}

                  {/* Upload progress */}
                  {uploading && (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                          {uploadProgress < 100 ? '上传中…' : '等待后端处理…'}
                        </span>
                        <span className="font-mono tabular-nums">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%`, background: uploadProgress < 100 ? 'linear-gradient(90deg, #38bdf8, #818cf8)' : '#10b981' }} />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!uploading && (
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setUploadStep(1)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
                        <ArrowLeft size={13} />返回
                      </button>
                      <button
                        className="btn-primary flex-1"
                        onClick={() => compressedBlob ? handleUploadNow(compressedBlob) : handleDirectUpload()}
                      >
                        <Scissors size={15} />
                        {compressedBlob ? '上传压缩版并开始裁剪' : '开始上传并裁剪'}
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>


        {/* Job history */}
        {jobs.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-500 mb-3">历史任务</h2>
            {(() => {
              const rootId = (j: Job) => j.parent_job_id ?? j.id
              const groupMap = new Map<string, Job[]>()
              jobs.forEach(j => {
                const r = rootId(j)
                if (!groupMap.has(r)) groupMap.set(r, [])
                groupMap.get(r)!.push(j)
              })
              const groups = Array.from(groupMap.entries())
                .map(([rid, group]) => ({
                  root: group.find(j => j.id === rid) ?? group[0],
                  reruns: group.filter(j => j.id !== rid).sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  ),
                }))
                .sort((a, b) => new Date(b.root.created_at).getTime() - new Date(a.root.created_at).getTime())

              const JobRow = ({ j, isRerun }: { j: Job; isRerun?: boolean }) => {
                const s = STATUS_MAP[j.status] ?? STATUS_MAP.failed
                const StatusIcon = s.icon
                const clips = store.getClips(j.id)
                const reviewed = clips.filter(c => c.is_reviewed).length
                return (
                  <>
                    <div
                      onClick={() => goToJob(j)}
                      className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${isRerun ? 'pl-10 bg-slate-50/50' : ''}`}
                    >
                      {isRerun && <span className="text-slate-300 text-xs absolute left-5">↳</span>}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isRerun ? 'bg-slate-100' : 'bg-sky-50'}`}>
                        <Video size={14} className={isRerun ? 'text-slate-300' : 'text-sky-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-700 text-sm truncate">{j.task_name || j.filename}</p>
                          {isRerun && <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-medium">重新处理</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-400">{j.scenario_code}</span>
                          <span className="text-xs text-slate-400">{formatDate(j.created_at)}</span>
                        </div>
                        {clips.length > 0 && (
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${Math.round((reviewed / clips.length) * 100)}%` }} />
                            </div>
                            <span className="text-xs text-slate-400">{reviewed}/{clips.length}</span>
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${s.color}`}>
                        <StatusIcon size={11} />
                        {s.label}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {(j.status === 'ready' || j.status === 'failed') && (
                          <button
                            onClick={(e) => openReprocess(e, j)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              reprocessPanel?.jobId === j.id
                                ? 'bg-amber-100 text-amber-500'
                                : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'
                            }`}
                            title="重新处理"
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                        {confirmDelete === j.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-rose-500 font-medium">确认?</span>
                            <button disabled={deleting === j.id} onClick={(e) => handleDelete(e, j.id)}
                              className="px-2 py-0.5 rounded text-xs bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50">
                              {deleting === j.id ? '…' : '删除'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }}
                              className="px-2 py-0.5 rounded text-xs border border-slate-200 text-slate-500 hover:bg-slate-50">
                              取消
                            </button>
                          </div>
                        ) : (
                          <button onClick={(e) => handleDelete(e, j.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition-colors" title="删除">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                    </div>

                    {/* Inline reprocess panel — full config */}
                    {reprocessPanel?.jobId === j.id && (
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200" onClick={e => e.stopPropagation()}>
                        <div className="mb-3">
                          <label className="text-xs text-slate-500 mb-1 block">任务名称</label>
                          <input type="text" value={reprocessPanel.task_name ?? ''}
                            onChange={e => setReprocessPanel(p => p ? { ...p, task_name: e.target.value } : p)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                        </div>
                        {/* Preset bar */}
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {allPresets.map(preset => (
                            <div key={preset.id} className="relative group">
                              <button type="button" title={preset.desc}
                                onClick={() => applyPreset(preset)}
                                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                                  activePresetId === preset.id
                                    ? 'bg-sky-500 border-sky-500 text-white font-semibold'
                                    : 'border-slate-200 text-slate-500 hover:border-sky-300 bg-white'
                                }`}>{preset.name}</button>
                              {!preset.builtIn && (
                                <button type="button" onClick={() => deleteCustomPreset(preset.id)}
                                  className="absolute -top-1 -right-1 hidden group-hover:flex w-3.5 h-3.5 rounded-full bg-rose-400 text-white items-center justify-center"><X size={7} /></button>
                              )}
                            </div>
                          ))}
                        </div>
                        {activePresetId && (() => { const p = allPresets.find(p => p.id === activePresetId); return p ? <p className="text-[10px] text-slate-400 mb-3">{p.desc}</p> : null })()}

                        {/* Frame resampling */}
                        <div className="mb-3">
                          <button type="button"
                            onClick={() => setReprocessPanel(p => p ? { ...p, frame_sample_step: (p.frame_sample_step ?? 1) > 1 ? 1 : 2 } : p)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                              (reprocessPanel.frame_sample_step ?? 1) > 1 ? 'bg-sky-50 border-sky-200 text-sky-700' : 'border-slate-200 text-slate-500'
                            }`}>
                            <span className="text-xs font-medium">是否再抽样</span>
                            <span className={`inline-flex w-8 h-[18px] rounded-full relative transition-colors ${(reprocessPanel.frame_sample_step ?? 1) > 1 ? 'bg-sky-500' : 'bg-slate-200'}`}>
                              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${(reprocessPanel.frame_sample_step ?? 1) > 1 ? 'left-[18px]' : 'left-0.5'}`} />
                            </span>
                          </button>
                          {(reprocessPanel.frame_sample_step ?? 1) > 1 && (
                            <div className="flex gap-1.5 mt-2">
                              {[2, 3, 4, 5].map(v => (
                                <button key={v} type="button"
                                  onClick={() => setReprocessPanel(p => p ? { ...p, frame_sample_step: v } : p)}
                                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                    (reprocessPanel.frame_sample_step ?? 1) === v ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-200 text-slate-500'
                                  }`}>{`1/${v}`}</button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Compression */}
                        <div className="mb-3">
                          <label className="text-xs text-slate-500 mb-1.5 block font-medium">帧图片压缩</label>
                          <div className="flex gap-1.5">
                            {([0, 640, 320] as const).map(v => (
                              <button key={v} type="button"
                                onClick={() => setReprocessPanel(p => p ? { ...p, compress_px: v } : p)}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                  (reprocessPanel.compress_px ?? 0) === v ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-200 text-slate-500'
                                }`}>{v === 0 ? '不压缩' : `${v}px`}</button>
                            ))}
                          </div>
                        </div>

                        {/* Thresholds */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">静止阈值</label>
                            <input type="number" step="0.005" min="0" max="0.1"
                              value={reprocessPanel.motion_threshold ?? 0.015}
                              onChange={e => setReprocessPanel(p => p ? { ...p, motion_threshold: parseFloat(e.target.value) } : p)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">低动作阈值</label>
                            <input type="number" step="0.005" min="0" max="0.2"
                              value={reprocessPanel.low_action_threshold ?? 0.04}
                              onChange={e => setReprocessPanel(p => p ? { ...p, low_action_threshold: parseFloat(e.target.value) } : p)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">连续性阈值</label>
                            <input type="number" step="1" min="0" max="30"
                              value={reprocessPanel.continuity_gap_frames ?? 5}
                              onChange={e => setReprocessPanel(p => p ? { ...p, continuity_gap_frames: parseInt(e.target.value) } : p)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">手部活跃阈值</label>
                            <input type="number" step="0.5" min="0" max="10"
                              value={reprocessPanel.hand_activity_threshold ?? 0}
                              onChange={e => setReprocessPanel(p => p ? { ...p, hand_activity_threshold: parseFloat(e.target.value) } : p)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">平滑窗口</label>
                            <input type="number" step="1" min="1" max="15"
                              value={reprocessPanel.smooth_window ?? 5}
                              onChange={e => setReprocessPanel(p => p ? { ...p, smooth_window: parseInt(e.target.value) } : p)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
                          </div>
                        </div>

                        {/* Human detection */}
                        <button type="button"
                          onClick={() => setReprocessPanel(p => p ? { ...p, filter_humans: !p.filter_humans } : p)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all mb-2 ${
                            reprocessPanel.filter_humans ? 'bg-violet-50 border-violet-200 text-violet-700' : 'border-slate-200 text-slate-500'
                          }`}>
                          <span className="text-xs font-medium">人体检测过滤</span>
                          <span className={`inline-flex w-7 h-[16px] rounded-full relative transition-colors ${reprocessPanel.filter_humans ? 'bg-violet-500' : 'bg-slate-200'}`}>
                            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${reprocessPanel.filter_humans ? 'left-[14px]' : 'left-0.5'}`} />
                          </span>
                        </button>
                        {reprocessPanel.filter_humans && (
                          <div className="space-y-2 mb-3 pl-1">
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block font-medium">检测器</label>
                              <div className="flex gap-2">
                                {(['hog', 'yolo', 'pose'] as const).map(d => (
                                  <button key={d} type="button"
                                    disabled={(d === 'yolo' || d === 'pose') && !yoloAvailable}
                                    onClick={() => setReprocessPanel(p => p ? { ...p, detector: d } : p)}
                                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                      reprocessPanel.detector === d ? 'bg-violet-500 border-violet-500 text-white'
                                        : (d === 'yolo' || d === 'pose') && !yoloAvailable ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                        : 'border-violet-200 text-violet-600 hover:bg-violet-50'
                                    }`}>{d === 'hog' ? 'HOG' : d === 'yolo' ? `YOLO${!yoloAvailable ? '✗' : ''}` : `Pose${!yoloAvailable ? '✗' : ''}`}</button>
                                ))}
                              </div>
                            </div>
                            {reprocessPanel.detector === 'yolo' && yoloAvailable && (
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">YOLO 模型</label>
                                <select value={reprocessPanel.yolo_model ?? 'yolov8s.pt'}
                                  onChange={e => setReprocessPanel(p => p ? { ...p, yolo_model: e.target.value } : p)}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-300 bg-white">
                                  <option value="yolov8n.pt">yolov8n — 极速</option>
                                  <option value="yolov8s.pt">yolov8s — 平衡（推荐）</option>
                                  <option value="yolov8m.pt">yolov8m — 更准确</option>
                                  <option value="yolov8l.pt">yolov8l — 高精度</option>
                                </select>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-600">人必须在画面中心区</span>
                              <button type="button"
                                onClick={() => setReprocessPanel(p => p ? { ...p, require_center: !p.require_center } : p)}
                                className={`inline-flex w-7 h-[16px] rounded-full relative transition-colors flex-shrink-0 ${reprocessPanel.require_center ? 'bg-violet-500' : 'bg-slate-200'}`}>
                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${reprocessPanel.require_center ? 'left-[14px]' : 'left-0.5'}`} />
                              </button>
                            </div>
                            {reprocessPanel.require_center && (
                              <div>
                                <label className="text-xs text-slate-500 mb-1 flex items-center">
                                  边缘排除 <span className="ml-1 font-mono text-violet-600">{Math.round((reprocessPanel.center_margin ?? 0.2) * 100)}%</span>
                                </label>
                                <input type="range" min="0.05" max="0.45" step="0.05"
                                  value={reprocessPanel.center_margin ?? 0.20}
                                  onChange={e => setReprocessPanel(p => p ? { ...p, center_margin: parseFloat(e.target.value) } : p)}
                                  className="w-full accent-violet-500" />
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-600">要求手臂可见（Pose）</span>
                              <button type="button"
                                disabled={reprocessPanel.detector !== 'pose'}
                                onClick={() => setReprocessPanel(p => p ? { ...p, require_arms: !p.require_arms } : p)}
                                className={`inline-flex w-7 h-[16px] rounded-full relative transition-colors flex-shrink-0 ${
                                  reprocessPanel.detector !== 'pose' ? 'bg-slate-100 cursor-not-allowed' : reprocessPanel.require_arms ? 'bg-violet-500' : 'bg-slate-200'
                                }`}>
                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                                  reprocessPanel.require_arms && reprocessPanel.detector === 'pose' ? 'left-[14px]' : 'left-0.5'
                                }`} />
                              </button>
                            </div>
                          </div>
                        )}

                        {reprocessError && (
                          <div className="mb-2 flex items-start gap-1.5 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
                            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                            <span>{reprocessError}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => { setReprocessPanel(null); setReprocessError('') }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50">
                            取消
                          </button>
                          <button onClick={handleReprocess} disabled={reprocessing}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 disabled:opacity-50">
                            <RefreshCw size={11} className={reprocessing ? 'animate-spin' : ''} />
                            {reprocessing ? '提交中…' : '重新处理'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              }

              return (
                <div className="space-y-4">
                  {groups.map(({ root, reruns }) => {
                    const expanded = expandedGroups.has(root.id)
                    return (
                      <div key={root.id} className="card overflow-hidden">
                        <JobRow j={root} />
                        {reruns.length > 0 && (
                          <>
                            <button
                              onClick={() => setExpandedGroups(prev => {
                                const s = new Set(prev)
                                s.has(root.id) ? s.delete(root.id) : s.add(root.id)
                                return s
                              })}
                              className="w-full flex items-center gap-1.5 px-5 py-1.5 text-xs text-slate-400 hover:bg-slate-50 border-t border-slate-100 transition-colors"
                            >
                              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              {reruns.length} 次重新处理结果
                            </button>
                            {expanded && reruns.map(r => <JobRow key={r.id} j={r} isRerun />)}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
