import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Film, Scissors, Tag } from 'lucide-react'
import { store, Clip, Job } from '../store'
import CullReviewTab from '../components/CullReviewTab'
import SliceTab from '../components/SliceTab'
import AnnotateTab from '../components/AnnotateTab'
import type { AnnotateItem } from '../components/AnnotateTab'
import { api, CulledSegment, ClipInfo, UnifiedSegment } from '../api'

export default function AnnotatePage() {
  const { videoId: jobId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()

  const [job] = useState<Job | null>(() => (jobId ? store.getJob(jobId) ?? null : null))
  const [clips] = useState<Clip[]>(() => (jobId ? store.getClips(jobId) : []))
  const [activeTab, setActiveTab] = useState<'cull' | 'slice' | 'annotate'>('cull')
  const [culledSegments, setCulledSegments] = useState<CulledSegment[]>(() =>
    jobId ? store.getCulledSegments<CulledSegment>(jobId) : []
  )

  const [allSegments, setAllSegments] = useState<UnifiedSegment[]>(() =>
    jobId ? store.getAllSegments<UnifiedSegment>(jobId) : []
  )
  const [detector, setDetector] = useState<'hog' | 'yolo' | 'pose'>('yolo')

  const [validSegments, setValidSegments] = useState<UnifiedSegment[]>(() =>
    jobId ? store.getValidSegments<UnifiedSegment>(jobId) : []
  )
  const [activeCullResultId, setActiveCullResultId] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return
    const hasLocal = store.getAllSegments(jobId).length > 0
    if (hasLocal) return
    let cancelled = false
    api.getJob(jobId).then(res => {
      if (cancelled) return
      const data = res.data
      if (data.all_segments && data.all_segments.length > 0) {
        setAllSegments(data.all_segments)
        store.saveAllSegments(jobId, data.all_segments)
      }
      if (data.detector) setDetector(data.detector)
      if (data.culled_segments && data.culled_segments.length > 0) {
        setCulledSegments(data.culled_segments as CulledSegment[])
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [jobId])

  const fps = clips.find(c => c.fps !== null)?.fps ?? 5

  const handleCullReviewComplete = useCallback((segs: UnifiedSegment[], _poseLabels: Record<string, string>, cullResultId?: string) => {
    setValidSegments(segs)
    if (jobId) store.saveValidSegments(jobId, segs)
    if (cullResultId) setActiveCullResultId(cullResultId)
    setActiveTab('slice')
  }, [jobId])

  const [hasSliceLabels, setHasSliceLabels] = useState(false)
  const [annotateItems, setAnnotateItems] = useState<AnnotateItem[]>([])

  return (
    <div className="h-screen bg-slate-50 flex justify-center overflow-hidden">
  <div className="w-full max-w-[1440px] h-full flex flex-col bg-white shadow-sm border-x border-slate-100 overflow-hidden">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-5 py-2.5 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => navigate('/')} className="btn-ghost py-1 px-2 text-sm">
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-slate-800 text-sm truncate">{job?.task_name || job?.filename || '标注'}</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden text-xs font-medium bg-slate-100 p-0.5 gap-0.5">
          {([
            { key: 'cull' as const, icon: Scissors, label: '裁剪' },
            { key: 'slice' as const, icon: Film, label: '精切', badge: validSegments.length || undefined },
            { key: 'annotate' as const, icon: Tag, label: '标注' },
          ]).map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={12} /> {tab.label}
                {tab.badge && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
                    isActive ? 'bg-sky-100 text-sky-600' : 'bg-slate-200 text-slate-500'
                  }`}>{tab.badge}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 裁剪 tab */}
      {activeTab === 'cull' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <CullReviewTab
            jobId={jobId!}
            culledSegments={culledSegments}
            allSegments={allSegments}
            clips={clips as unknown as ClipInfo[]}
            detector={detector}
            onCullReviewComplete={handleCullReviewComplete}
          />
        </div>
      )}

      {/* 切片 tab */}
      {activeTab === 'slice' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <SliceTab
            jobId={jobId!}
            validSegments={validSegments}
            allSegments={allSegments}
            fps={fps}
            initialCullResultId={activeCullResultId}
            onHasLabelsChange={setHasSliceLabels}
            onGoAnnotate={(items) => {
              if (items) setAnnotateItems(items)
              setActiveTab('annotate')
            }}
          />
        </div>
      )}

      {/* 标注 tab */}
      {activeTab === 'annotate' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnnotateTab
            jobId={jobId!}
            items={annotateItems}
            fps={fps}
            onSave={setAnnotateItems}
          />
        </div>
      )}
    </div>
  </div>
  )
}
