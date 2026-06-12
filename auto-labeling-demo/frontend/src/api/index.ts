import axios from 'axios'

const http = axios.create({ baseURL: '/api' })

export interface HealthStatus {
  status: string
  ffmpeg: boolean
  yolo: boolean
}

export interface CulledFrameRecord {
  idx: number
  url: string
  state: string
  motion_score: number
  reason?: string
  timestamp?: number       // seconds from start (relative)
  timestamp_ns?: number    // absolute nanosecond timestamp
}

export interface CulledSegment {
  id: string
  state: string
  start_idx: number
  end_idx: number
  frame_count: number
  duration_ms: number
  thumb_url: string
  frames: CulledFrameRecord[]
  cull_reason?: string
}

export interface ActionSegment {
  action_idx: number
  start_idx: number
  end_idx: number
  start_ms: number
  end_ms: number
  frame_count: number
}

export interface ClipInfo {
  id: string
  start_ms: number
  end_ms: number
  start_ns: number | null
  end_ns: number | null
  start_idx: number | null
  end_idx: number | null
  clip_url: string | null
  frame_urls: string[] | null
  fps: number | null
  thumb_url: string | null
  blur_score: number | null
  brightness: number | null
  actions?: ActionSegment[]
}

export interface MergeSegmentsResponse {
  ok: boolean
  merged_segment: CulledSegment
  removed_ids: string[]
}

export interface ExtractClipResponse {
  ok: boolean
  clip: ClipInfo
  segment_removed: boolean
  remaining_segment: CulledSegment | null
}

export interface RestoreResponse {
  ok: boolean
  restored: number
  frame_urls: string[]
  segment_removed: boolean
  remaining_segment: CulledSegment | null
}

export interface AnnotateFrameRequest {
  frame_url: string
  detector: 'hog' | 'yolo' | 'pose'
  yolo_model?: string
  arm_conf_threshold?: number
}

export interface FrameAnnotations {
  person_boxes: [number, number, number, number, number][]  // [x1,y1,x2,y2,conf] normalised 0-1
  arm_keypoints: [number, number, number][]               // [x,y,conf] normalised 0-1
  width: number
  height: number
}

export interface PersonDetection {
  person_boxes: [number, number, number, number, number][]  // [x1,y1,x2,y2,conf] normalised 0-1
  width: number
  height: number
}

export interface DetectPersonsResponse {
  clip_id: string
  detections: Record<string, PersonDetection>
}

export interface FinalizeDecision {
  segment_id: string
  decision: 'valid' | 'invalid'
}

export interface LabelingMeta {
  taskname: string
  start_time: number
  end_time: number
  start_ms: number
  end_ms: number
  description: string
  scenario_code: string
}

export interface FinalizeReviewResponse {
  ok: boolean
  download_url: string
  version: string
  stats: {
    valid: number
    invalid: number
    merged: number
    new_clips: number
  }
  labeling_meta?: LabelingMeta[]
}

export interface ReprocessParams {
  task_name?: string
  filter_humans?: boolean
  detector?: 'hog' | 'yolo' | 'pose'
  yolo_model?: string
  detection_strategy?: 'single' | 'cascade'
  require_center?: boolean
  center_margin?: number
  require_arms?: boolean
  arm_conf_threshold?: number
  motion_threshold?: number
  low_action_threshold?: number
  hand_activity_threshold?: number
  smooth_window?: number
  frame_sample_step?: number
  continuity_gap_frames?: number
  compress_px?: number
}

export interface UnifiedSegment {
  id: string
  state: 'keep' | 'review' | 'culled_motion' | 'culled_low_action' | 'culled_person'
  start_idx: number
  end_idx: number
  frame_count: number
  duration_ms: number
  thumb_url: string
  frames: CulledFrameRecord[]
  cull_reason?: string
}

export interface JobStatus {
  id: string
  filename: string
  task_name: string
  scenario_code: string
  status: 'processing' | 'ready' | 'failed'
  input_type?: 'video' | 'sequence'
  detector?: 'hog' | 'yolo' | 'pose'
  step?: string
  step_pct?: number
  clips: ClipInfo[]
  culled_segments?: CulledSegment[]
  all_segments?: UnifiedSegment[]
  total_duration_ms: number
  error?: string
}

export const api = {
  health: () => http.get<HealthStatus>('/health'),
  process: (
    data: FormData,
    params: ReprocessParams = {},
    onUploadProgress?: (pct: number) => void,
  ) => {
    if (params.filter_humans) data.append('filter_humans', 'true')
    if (params.detector)              data.append('detector', params.detector)
    if (params.yolo_model)            data.append('yolo_model', params.yolo_model)
    if (params.detection_strategy)    data.append('detection_strategy', params.detection_strategy)
    if (params.require_center)        data.append('require_center', 'true')
    if (params.center_margin != null) data.append('center_margin', String(params.center_margin))
    if (params.require_arms)          data.append('require_arms', 'true')
    if (params.arm_conf_threshold != null) data.append('arm_conf_threshold', String(params.arm_conf_threshold))
    if (params.motion_threshold != null)   data.append('motion_threshold', String(params.motion_threshold))
    if (params.low_action_threshold != null) data.append('low_action_threshold', String(params.low_action_threshold))
    if (params.hand_activity_threshold != null) data.append('hand_activity_threshold', String(params.hand_activity_threshold))
    if (params.smooth_window != null) data.append('smooth_window', String(params.smooth_window))
    if (params.frame_sample_step != null) data.append('frame_sample_step', String(params.frame_sample_step))
    if (params.continuity_gap_frames != null) data.append('continuity_gap_frames', String(params.continuity_gap_frames))
    if (params.compress_px != null) data.append('compress_px', String(params.compress_px))
    return http.post<{ job_id: string; file_hash: string | null }>('/process', data, {
      onUploadProgress: onUploadProgress
        ? (e) => {
            const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0
            onUploadProgress(pct)
          }
        : undefined,
    })
  },
  getJob: (jobId: string) => http.get<JobStatus>(`/jobs/${jobId}`),
  deleteJob: (jobId: string) => http.delete<{ ok: boolean }>(`/jobs/${jobId}`),
  mergeSegments: (jobId: string, segmentIds: string[]) =>
    http.post<MergeSegmentsResponse>(`/jobs/${jobId}/merge-segments`, { segment_ids: segmentIds }),
  undoMerge: (jobId: string, mergedId: string, originalSegments: CulledSegment[]) =>
    http.post<{ ok: boolean }>(`/jobs/${jobId}/undo-merge`, {
      merged_id: mergedId,
      original_segments: originalSegments,
    }),
  extractClip: (
    jobId: string,
    segmentId: string,
    rangeStartIdx?: number,
    rangeEndIdx?: number,
  ) =>
    http.post<ExtractClipResponse>(`/jobs/${jobId}/extract-clip`, {
      segment_id: segmentId,
      range_start_idx: rangeStartIdx ?? null,
      range_end_idx: rangeEndIdx ?? null,
    }),
  reprocessJob: (jobId: string, params: ReprocessParams) =>
    http.post<{ job_id: string }>(`/jobs/${jobId}/reprocess`, params),
  getCulled: (jobId: string) => http.get<{ culled_segments: CulledSegment[] }>(`/jobs/${jobId}/culled`),
  restoreSegment: (
    jobId: string,
    segmentId: string,
    targetClipId: string,
    rangeStartIdx?: number,
    rangeEndIdx?: number,
  ) =>
    http.post<RestoreResponse>(`/jobs/${jobId}/restore`, {
      segment_id: segmentId,
      target_clip_id: targetClipId,
      range_start_idx: rangeStartIdx ?? null,
      range_end_idx: rangeEndIdx ?? null,
    }),
  annotateFrame: (req: AnnotateFrameRequest) =>
    http.post<FrameAnnotations>('/frames/annotate', req),
  finalizeReview: (jobId: string, decisions: FinalizeDecision[]) =>
    http.post<FinalizeReviewResponse>(`/jobs/${jobId}/finalize-review`, { decisions }),
  detectPersons: (
    jobId: string,
    clipId: string,
    detector: string = 'yolo',
    yoloModel: string = 'yolov8s.pt',
    sampleStep: number = 1,
  ) =>
    http.post<DetectPersonsResponse>(`/jobs/${jobId}/detect-persons`, {
      clip_id: clipId,
      detector,
      yolo_model: yoloModel,
      sample_step: sampleStep,
    }),
}
