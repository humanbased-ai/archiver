import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, CheckCircle2, XCircle, FileJson, BarChart3 } from 'lucide-react'
import { store, LabelingMeta } from '../store'

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`
}

export default function ExportPage() {
  const { videoId: jobId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()

  const job = useMemo(() => (jobId ? store.getJob(jobId) ?? null : null), [jobId])
  const clips = useMemo(() => (jobId ? store.getClips(jobId) : []), [jobId])
  const meta = useMemo<LabelingMeta[]>(() => (jobId ? store.buildExport(jobId) : []), [jobId])
  const labelMap = useMemo(() => {
    const map: Record<string, string> = {}
    store.getLabels().forEach(l => { map[l.value] = l.label })
    return map
  }, [])

  // Detect if timestamps are nanoseconds (> 1e9 distinguishes ns from ms for videos up to ~11 days)
  const isNs = meta.length > 0 && meta[0].start_time > 1e9
  const toMs = (t: number) => isNs ? t / 1e6 : t

  const handleDownload = () => {
    const content = JSON.stringify({ 'Labeling meta': meta }, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${job?.task_name || 'labeling'}_export.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const labelCounts = meta.reduce<Record<string, number>>((acc, item) => {
    const k = item.description || 'other_valid'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  const reviewedCount = clips.filter(c => c.is_reviewed).length

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(`/annotate/${jobId}`)} className="btn-ghost py-1.5 px-2">
            <ArrowLeft size={15} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-800">{job?.task_name || job?.filename}</h1>
            <p className="text-sm text-slate-400">{job?.scenario_code} · 标注导出</p>
          </div>
          <button
            onClick={handleDownload}
            disabled={meta.length === 0}
            className="btn-primary"
          >
            <Download size={15} />
            下载 JSON
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Stats cards */}
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{meta.length}</p>
              <p className="text-xs text-slate-400">有效动作片段</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <XCircle size={20} className="text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {reviewedCount - meta.length}
              </p>
              <p className="text-xs text-slate-400">无效/跳过片段</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <BarChart3 size={20} className="text-sky-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {meta.length > 0
                  ? Math.round(meta.reduce((s, m) => s + (toMs(m.end_time) - toMs(m.start_time)), 0) / 1000)
                  : 0}s
              </p>
              <p className="text-xs text-slate-400">有效动作总时长</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Label distribution */}
          <div className="lg:col-span-2 card p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">动作分布</h3>
            {Object.keys(labelCounts).length === 0 ? (
              <p className="text-slate-400 text-sm">暂无有效标注</p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(labelCounts).map(([key, count]) => {
                  const total = meta.length
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">{labelMap[key] || key}</span>
                        <span className="text-slate-400">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* JSON preview */}
          <div className="lg:col-span-3 card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <FileJson size={15} className="text-sky-500" />
                输出 JSON 预览
              </h3>
              <span className="text-xs text-slate-400">{meta.length} 条记录</span>
            </div>
            <div className="flex-1 bg-slate-900 rounded-xl p-4 overflow-auto max-h-80 text-xs font-mono leading-relaxed">
              {meta.length === 0 ? (
                <span className="text-slate-500">暂无有效标注数据</span>
              ) : (
                <pre className="text-slate-300 whitespace-pre-wrap">
                  {JSON.stringify({ 'Labeling meta': meta.slice(0, 5) }, null, 2)}
                  {meta.length > 5 && `\n  // ... 共 ${meta.length} 条，下载完整 JSON 查看全部`}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Detail table */}
        {meta.length > 0 && (
          <div className="mt-5 card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 text-sm">详细列表</h3>
              <span className="text-xs text-slate-400">共 {meta.length} 条</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500">
                    <th className="px-4 py-2.5 text-left font-medium">#</th>
                    <th className="px-4 py-2.5 text-left font-medium">开始时间</th>
                    <th className="px-4 py-2.5 text-left font-medium">结束时间</th>
                    <th className="px-4 py-2.5 text-left font-medium">时长</th>
                    <th className="px-4 py-2.5 text-left font-medium">动作描述</th>
                    <th className="px-4 py-2.5 text-left font-medium">场景代码</th>
                  </tr>
                </thead>
                <tbody>
                  {meta.map((item, i) => (
                    <tr key={i} className={`border-t border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-600 text-xs">{formatMs(toMs(item.start_time))}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-600 text-xs">{formatMs(toMs(item.end_time))}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{((toMs(item.end_time) - toMs(item.start_time)) / 1000).toFixed(1)}s</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-medium">
                          {labelMap[item.description] || item.description}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{item.scenario_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
