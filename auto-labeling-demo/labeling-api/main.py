"""
Labeling API — 标注平台 API 服务

任务管理、文件存储、帧文件组织、前端接口、裁剪审核。
所有资源文件存储在本服务，Vision Engine 仅返回分析 JSON。

Env vars:
    WORKER_URL   — Vision Engine 地址 (default: http://localhost:8001)
    API_BASE_URL — 本服务回调地址 (default: http://localhost:8000)

Start:
    cd labeling-api
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

import os
import uuid
import hashlib
import logging
import shutil
import zipfile
import json as _json
from pathlib import Path
from typing import Any
from datetime import datetime
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from worker_client import vision

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger("labeling-api")

app = FastAPI(title="Labeling API", version="2.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

BASE_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent / "data"))
UPLOADS_DIR = BASE_DIR / "uploads"
CLIPS_DIR = BASE_DIR / "clips"          # organized frames served to frontend

for d in [UPLOADS_DIR, CLIPS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

app.mount("/clips", StaticFiles(directory=str(CLIPS_DIR)), name="clips")

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")

jobs: dict[str, dict[str, Any]] = {}
zip_hash_store: dict[str, str] = {}
_executor = ThreadPoolExecutor(max_workers=4)


# ─── Frame organization (extract ZIP + build local frame dirs) ───────────────

def _organize_frames(job_id: str, source_path: str, analysis: dict):
    """
    Given analysis JSON from Vision Engine, extract source ZIP and organize
    frames into local clips/ directory structure.
    """
    job = jobs.get(job_id)
    if not job:
        return

    clips_data = analysis.get("clips_data", [])
    culled_segments = analysis.get("culled_segments", [])
    all_segments = analysis.get("all_segments", [])
    compress_px = job.get("compress_px", 0)

    is_zip = source_path.lower().endswith(".zip")
    if not is_zip:
        # Video mode — clips_data may have clip_filename (MP4) already
        # For now just build the response with what we have
        _finalize_job(job_id, analysis, clips_data, culled_segments, all_segments)
        return

    # Extract ZIP to discover frame files
    import tempfile
    tmpdir = tempfile.mkdtemp(prefix=f"labeling_{job_id}_")
    try:
        with zipfile.ZipFile(source_path, "r") as zf:
            zf.extractall(tmpdir)

        # Find all image files and build idx→path lookup
        all_images = sorted(
            [p for p in Path(tmpdir).rglob("*") if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp")],
            key=lambda p: p.name,
        )
        # Parse extraction_info for filename order if available
        info_path = Path(tmpdir) / "extraction_info.json"
        if info_path.exists():
            info = _json.loads(info_path.read_text())
            known_names = [f["filename"] for f in info.get("extracted_images", [])]
            name_to_path = {p.name: p for p in all_images}
            ordered = [name_to_path[n] for n in known_names if n in name_to_path]
            if ordered:
                all_images = ordered

        idx_to_path: dict[int, Path] = {}
        for i, img in enumerate(all_images):
            idx_to_path[i] = img

        # Organize culled frames
        culled_dir = CLIPS_DIR / "culled" / job_id
        culled_dir.mkdir(parents=True, exist_ok=True)

        for seg in culled_segments:
            for frame in seg.get("frames", []):
                idx = frame.get("idx")
                if idx is not None and idx in idx_to_path:
                    src = idx_to_path[idx]
                    dest = culled_dir / f"{idx:06d}{src.suffix}"
                    if not dest.exists():
                        _copy_frame(src, dest, compress_px)
                    frame["url"] = f"/clips/culled/{job_id}/{idx:06d}{src.suffix}"
            # Thumb = first frame URL
            if seg.get("frames"):
                seg["thumb_url"] = seg["frames"][0].get("url", "")

        for seg in all_segments:
            for frame in seg.get("frames", []):
                idx = frame.get("idx")
                if idx is not None and idx in idx_to_path:
                    src = idx_to_path[idx]
                    dest = culled_dir / f"{idx:06d}{src.suffix}"
                    if not dest.exists():
                        _copy_frame(src, dest, compress_px)
                    frame["url"] = f"/clips/culled/{job_id}/{idx:06d}{src.suffix}"
            if seg.get("frames"):
                seg["thumb_url"] = seg["frames"][0].get("url", "")

        # Organize clip frames
        built_clips = []
        for c in clips_data:
            clip_id = c["id"]
            frame_dir = CLIPS_DIR / "frames" / clip_id
            frame_dir.mkdir(parents=True, exist_ok=True)

            frame_indices = c.get("frame_indices", [])
            frame_urls = []
            for idx in frame_indices:
                if idx in idx_to_path:
                    src = idx_to_path[idx]
                    ext = src.suffix
                    dest = frame_dir / f"{idx:06d}{ext}"
                    if not dest.exists():
                        _copy_frame(src, dest, compress_px)
                    frame_urls.append(f"/clips/frames/{clip_id}/{idx:06d}{ext}")

            # Thumbnail
            thumb_url = None
            if frame_urls:
                mid = len(frame_urls) // 2
                thumb_url = frame_urls[mid]

            built_clips.append({
                "id": clip_id,
                "start_ms": c["start_ms"],
                "end_ms": c["end_ms"],
                "start_ns": c.get("start_ns"),
                "end_ns": c.get("end_ns"),
                "start_idx": c.get("start_idx"),
                "end_idx": c.get("end_idx"),
                "clip_url": None,
                "thumb_url": thumb_url,
                "frame_urls": frame_urls,
                "fps": c.get("fps"),
                "blur_score": c.get("blur_score"),
                "brightness": c.get("brightness"),
                "actions": c.get("actions", []),
            })

        _finalize_job(job_id, analysis, built_clips, culled_segments, all_segments)

    except Exception as e:
        logger.exception("Frame organization failed for job %s: %s", job_id, e)
        jobs[job_id].update({"status": "failed", "error": f"Frame organization failed: {e}"})
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _copy_frame(src: Path, dest: Path, compress_px: int = 0):
    """Copy frame, optionally resizing."""
    if compress_px > 0:
        try:
            from PIL import Image
            img = Image.open(src)
            w, h = img.size
            if max(w, h) > compress_px:
                ratio = compress_px / max(w, h)
                img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
            img.save(dest, quality=85)
            return
        except ImportError:
            pass
    shutil.copy2(str(src), str(dest))


def _finalize_job(job_id: str, analysis: dict, clips: list, culled: list, all_segs: list):
    if job_id not in jobs:
        return
    jobs[job_id].update({
        "status": "ready",
        "step": "done",
        "step_pct": 100,
        "total_duration_ms": analysis.get("total_duration_ms", 0),
        "clips": clips,
        "culled_segments": culled,
        "all_segments": all_segs,
    })
    logger.info("Job %s ready — %d clips, %d culled, %d all",
                job_id, len(clips), len(culled), len(all_segs))


# ─── Worker callback ─────────────────────────────────────────────────────────

class TaskCompletePayload(BaseModel):
    task_id: str
    status: str
    result: dict | None = None
    error: str | None = None


@app.post("/internal/tasks/{task_id}/complete")
def task_complete_callback(task_id: str, payload: TaskCompletePayload):
    if task_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    if payload.status == "done" and payload.result:
        # Vision Engine returned analysis JSON — now organize frames locally
        jobs[task_id]["step"] = "cut"
        jobs[task_id]["step_pct"] = 90
        source_path = jobs[task_id].get("upload_path", "")
        _executor.submit(_organize_frames, task_id, source_path, payload.result)
    elif payload.status == "failed":
        jobs[task_id].update({"status": "failed", "step": "failed", "error": payload.error or "Unknown"})

    return {"ok": True}


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    w = vision.health()
    return {"status": "ok", "ffmpeg": w.get("ffmpeg", False), "yolo": w.get("yolo", False),
            "worker": w.get("status", "unavailable")}


# ─── Process ─────────────────────────────────────────────────────────────────

@app.post("/api/process")
async def process(
    file: UploadFile = File(...),
    scenario_code: str = Form(default="SCENE_01"),
    task_name: str = Form(default=""),
    filter_humans: bool = Form(default=False),
    detector: str = Form(default="yolo"),
    yolo_model: str = Form(default="yolov8s.pt"),
    detection_strategy: str = Form(default="single"),
    require_center: bool = Form(default=False),
    center_margin: float = Form(default=0.20),
    require_arms: bool = Form(default=False),
    arm_conf_threshold: float = Form(default=0.30),
    motion_threshold: float = Form(default=0.015),
    low_action_threshold: float = Form(default=0.04),
    hand_activity_threshold: float = Form(default=0.0),
    smooth_window: int = Form(default=5),
    frame_sample_step: int = Form(default=1),
    continuity_gap_frames: int = Form(default=5),
    compress_px: int = Form(default=0),
):
    job_id = str(uuid.uuid4())
    original_name = file.filename or "upload"
    ext = Path(original_name).suffix.lower()
    is_zip = ext == ".zip"

    content = await file.read()
    if is_zip:
        file_hash = hashlib.sha256(content).hexdigest()[:12]
        local_path = str(UPLOADS_DIR / f"{file_hash}.zip")
    else:
        file_hash = None
        local_path = str(UPLOADS_DIR / f"{job_id}{ext or '.mp4'}")

    if not Path(local_path).exists():
        with open(local_path, "wb") as f:
            f.write(content)

    jobs[job_id] = {
        "id": job_id,
        "filename": original_name,
        "task_name": task_name or original_name,
        "scenario_code": scenario_code,
        "status": "processing",
        "step": "upload",
        "step_pct": 0,
        "clips": [],
        "total_duration_ms": 0,
        "input_type": "sequence" if is_zip else "video",
        "detector": detector,
        "upload_path": local_path,
        "file_hash": file_hash,
        "compress_px": compress_px,
        "parent_job_id": None,
    }

    try:
        params = {
            "input_type": "sequence" if is_zip else "video",
            "filter_humans": filter_humans,
            "detector": detector,
            "yolo_model": yolo_model,
            "detection_strategy": detection_strategy,
            "require_center": require_center,
            "center_margin": center_margin,
            "require_arms": require_arms,
            "arm_conf_threshold": arm_conf_threshold,
            "motion_threshold": motion_threshold,
            "low_action_threshold": low_action_threshold,
            "hand_activity_threshold": hand_activity_threshold,
            "smooth_window": smooth_window,
            "frame_sample_step": frame_sample_step,
            "continuity_gap_frames": continuity_gap_frames,
            "compress_px": compress_px,
        }
        vision.submit_process(
            local_path, job_id, params,
            callback_url=f"{API_BASE_URL}/internal/tasks/{job_id}/complete",
        )
        jobs[job_id]["step"] = "extract" if is_zip else "decode"
    except Exception as e:
        jobs[job_id].update({"status": "failed", "error": f"Vision Engine 不可用: {e}"})
        logger.error("Failed to submit job %s: %s", job_id, e)

    return {"job_id": job_id, "file_hash": file_hash}


# ─── Job status ──────────────────────────────────────────────────────────────

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] == "processing":
        progress = vision.get_progress(job_id)
        if progress:
            if progress["status"] == "done" and progress.get("result"):
                # Callback hasn't arrived yet — trigger frame organization
                jobs[job_id]["step"] = "cut"
                jobs[job_id]["step_pct"] = 90
                source_path = job.get("upload_path", "")
                _executor.submit(_organize_frames, job_id, source_path, progress["result"])
            elif progress["status"] == "failed":
                job.update({"status": "failed", "error": progress.get("error", "Unknown")})
            else:
                job["step"] = progress.get("step", job["step"])
                job["step_pct"] = progress.get("step_pct", job["step_pct"])
    return job


# ─── Culled segments ─────────────────────────────────────────────────────────

@app.get("/api/jobs/{job_id}/culled")
def get_culled(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"culled_segments": job.get("culled_segments", [])}


# ─── Restore / Extract / Merge / Undo ────────────────────────────────────────

class RestoreRequest(BaseModel):
    segment_id: str
    target_clip_id: str
    range_start_idx: int | None = None
    range_end_idx: int | None = None


@app.post("/api/jobs/{job_id}/restore")
def restore_segment(job_id: str, req: RestoreRequest):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    segments: list = job.get("culled_segments", [])
    seg = next((s for s in segments if s["id"] == req.segment_id), None)
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    clip = next((c for c in job.get("clips", []) if c["id"] == req.target_clip_id), None)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    all_frames = seg.get("frames", [])
    if req.range_start_idx is not None and req.range_end_idx is not None:
        frames_to_restore = [f for f in all_frames if req.range_start_idx <= f["idx"] <= req.range_end_idx]
    else:
        frames_to_restore = all_frames

    # Frames already exist in culled dir — just add URLs to clip
    new_urls = [f["url"] for f in frames_to_restore if f.get("url")]
    all_clip_urls = sorted(set(clip.get("frame_urls") or []) | set(new_urls),
                           key=lambda u: int(Path(u).stem))
    clip["frame_urls"] = all_clip_urls

    remaining = [f for f in all_frames if f not in frames_to_restore]
    remaining_seg = None
    if remaining and frames_to_restore != all_frames:
        seg["frames"] = remaining
        seg["frame_count"] = len(remaining)
        seg["start_idx"] = remaining[0]["idx"]
        seg["end_idx"] = remaining[-1]["idx"]
        seg["thumb_url"] = remaining[0].get("url", "")
        remaining_seg = seg
    else:
        job["culled_segments"] = [s for s in segments if s["id"] != req.segment_id]

    return {"ok": True, "restored": len(new_urls), "frame_urls": all_clip_urls,
            "segment_removed": remaining_seg is None, "remaining_segment": remaining_seg}


class ExtractClipRequest(BaseModel):
    segment_id: str
    range_start_idx: int | None = None
    range_end_idx: int | None = None


@app.post("/api/jobs/{job_id}/extract-clip")
def extract_clip(job_id: str, req: ExtractClipRequest):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    segments: list = job.get("culled_segments", [])
    seg = next((s for s in segments if s["id"] == req.segment_id), None)
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    all_frames = seg.get("frames", [])
    if req.range_start_idx is not None and req.range_end_idx is not None:
        frames_to_extract = [f for f in all_frames if req.range_start_idx <= f["idx"] <= req.range_end_idx]
    else:
        frames_to_extract = all_frames
    if not frames_to_extract:
        raise HTTPException(status_code=400, detail="No frames")

    fps = (job["clips"][0].get("fps") or 5.0) if job.get("clips") else 5.0
    new_clip_id = str(uuid.uuid4())
    frame_urls = [f["url"] for f in frames_to_extract if f.get("url")]
    s_idx, e_idx = frames_to_extract[0]["idx"], frames_to_extract[-1]["idx"]

    new_clip = {
        "id": new_clip_id,
        "start_ms": round(s_idx * (1000 / fps)), "end_ms": round((e_idx + 1) * (1000 / fps)),
        "start_ns": None, "end_ns": None, "start_idx": s_idx, "end_idx": e_idx,
        "clip_url": None, "thumb_url": frame_urls[0] if frame_urls else None,
        "frame_urls": frame_urls, "fps": fps, "blur_score": None, "brightness": None,
    }
    job["clips"].append(new_clip)

    remaining = [f for f in all_frames if f not in frames_to_extract]
    remaining_seg = None
    if remaining:
        seg["frames"] = remaining
        seg["frame_count"] = len(remaining)
        seg["start_idx"] = remaining[0]["idx"]
        seg["end_idx"] = remaining[-1]["idx"]
        seg["thumb_url"] = remaining[0].get("url", "")
        remaining_seg = seg
    else:
        job["culled_segments"] = [s for s in segments if s["id"] != req.segment_id]

    return {"ok": True, "clip": new_clip, "segment_removed": remaining_seg is None, "remaining_segment": remaining_seg}


class MergeSegmentsRequest(BaseModel):
    segment_ids: list[str]


@app.post("/api/jobs/{job_id}/merge-segments")
def merge_segments(job_id: str, req: MergeSegmentsRequest):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    segments: list = job.get("culled_segments", [])
    to_merge = [s for s in segments if s["id"] in req.segment_ids]
    if len(to_merge) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 segments")

    fps = (job["clips"][0].get("fps") or 5.0) if job.get("clips") else 5.0
    frame_map: dict = {}
    for seg in to_merge:
        for f in seg.get("frames", []):
            frame_map[f["idx"]] = f
    all_frames = sorted(frame_map.values(), key=lambda f: f["idx"])
    merged_state = Counter(s["state"] for s in to_merge).most_common(1)[0][0]

    new_id = str(uuid.uuid4())
    merged = {
        "id": new_id, "state": merged_state,
        "start_idx": all_frames[0]["idx"], "end_idx": all_frames[-1]["idx"],
        "frame_count": len(all_frames), "duration_ms": round(len(all_frames) * (1000 / fps)),
        "thumb_url": all_frames[0].get("url", ""), "frames": all_frames,
    }
    remaining = [s for s in segments if s["id"] not in set(req.segment_ids)]
    remaining.append(merged)
    remaining.sort(key=lambda s: s["start_idx"])
    job["culled_segments"] = remaining
    return {"ok": True, "merged_segment": merged, "removed_ids": list(req.segment_ids)}


class UndoMergeRequest(BaseModel):
    merged_id: str
    original_segments: list[dict]


@app.post("/api/jobs/{job_id}/undo-merge")
def undo_merge(job_id: str, req: UndoMergeRequest):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    segments = [s for s in job.get("culled_segments", []) if s["id"] != req.merged_id]
    segments.extend(req.original_segments)
    segments.sort(key=lambda s: s["start_idx"])
    job["culled_segments"] = segments
    return {"ok": True}


# ─── Finalize review ─────────────────────────────────────────────────────────

class FinalizeDecision(BaseModel):
    segment_id: str
    decision: str


class FinalizeReviewRequest(BaseModel):
    decisions: list[FinalizeDecision]


@app.post("/api/jobs/{job_id}/finalize-review")
def finalize_review(job_id: str, req: FinalizeReviewRequest):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    clips_list: list = job.get("clips", [])
    fps: float = (clips_list[0].get("fps") or 5.0) if clips_list else 5.0
    stats = {"valid": 0, "invalid": 0, "merged": 0, "new_clips": 0}
    dec_map = {d.segment_id: d.decision for d in req.decisions}

    for seg_id, decision in dec_map.items():
        seg = next((s for s in job.get("culled_segments", []) if s["id"] == seg_id), None)
        if not seg:
            continue
        if decision == "invalid":
            job["culled_segments"] = [s for s in job["culled_segments"] if s["id"] != seg_id]
            stats["invalid"] += 1
        elif decision == "valid":
            seg_urls = [f["url"] for f in seg.get("frames", []) if f.get("url")]
            sorted_clips = sorted(clips_list, key=lambda c: (c.get("start_idx") or 0))
            left_clip = next((c for c in reversed(sorted_clips) if (c.get("end_idx") or 0) < seg["start_idx"]), None)
            right_clip = next((c for c in sorted_clips if (c.get("start_idx") or 0) > seg["end_idx"]), None)
            target_clip = left_clip or right_clip

            if target_clip:
                all_urls = sorted(set(target_clip.get("frame_urls") or []) | set(seg_urls),
                                  key=lambda u: int(Path(u).stem))
                target_clip["frame_urls"] = all_urls
                if all_urls:
                    target_clip["start_idx"] = min(target_clip.get("start_idx", 999999), int(Path(all_urls[0]).stem))
                    target_clip["end_idx"] = max(target_clip.get("end_idx", 0), int(Path(all_urls[-1]).stem))
                stats["merged"] += 1
            else:
                new_clip_id = str(uuid.uuid4())
                s_idx, e_idx = seg["start_idx"], seg["end_idx"]
                job["clips"].append({
                    "id": new_clip_id,
                    "start_ms": round(s_idx * (1000 / fps)), "end_ms": round((e_idx + 1) * (1000 / fps)),
                    "start_ns": None, "end_ns": None, "start_idx": s_idx, "end_idx": e_idx,
                    "clip_url": None, "thumb_url": seg_urls[0] if seg_urls else None,
                    "frame_urls": seg_urls, "fps": fps, "blur_score": None, "brightness": None,
                })
                stats["new_clips"] += 1
            job["culled_segments"] = [s for s in job["culled_segments"] if s["id"] != seg_id]
            stats["valid"] += 1

    job["clips"].sort(key=lambda c: (c.get("start_idx") or 0))

    # Build versioned ZIP — all frames are local in clips/ dir
    version = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_name = (job.get("task_name") or "export").replace("/", "_").replace(" ", "_")
    zip_name = f"{safe_name}_{version}.zip"
    zip_path = CLIPS_DIR / zip_name

    json_frames: list[dict] = []
    txt_lines: list[str] = []
    seq_num = 0
    labeling_meta: list[dict] = []
    task_name_val = job.get("task_name") or job.get("filename") or "unknown"
    scenario_code = job.get("scenario_code") or "SCENE_01"

    with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
        for clip in sorted(job["clips"], key=lambda c: (c.get("start_idx") or 0)):
            clip_fps = clip.get("fps") or fps
            start_ns = clip.get("start_ns")
            frame_urls = sorted(clip.get("frame_urls") or [], key=lambda u: int(Path(u).stem))
            for i, url in enumerate(frame_urls):
                rel = url.removeprefix("/clips/")
                fpath = CLIPS_DIR / rel
                if not fpath.exists():
                    continue
                orig_idx = int(Path(url).stem)
                new_fname = f"{orig_idx:06d}{fpath.suffix or '.jpg'}"
                zf.write(str(fpath), new_fname)
                ts_ns = (start_ns + round(i * 1e9 / clip_fps)) if start_ns is not None else round(orig_idx * 1e9 / clip_fps)
                json_frames.append({"filename": new_fname, "timestamp_ns": ts_ns})
                txt_lines.append(f"{seq_num}, {ts_ns}, {new_fname}, 0, 0, 3")
                seq_num += 1

            actions = clip.get("actions", [])
            if not actions:
                actions = [{"action_idx": 0, "start_idx": clip.get("start_idx", 0), "end_idx": clip.get("end_idx", 0),
                            "start_ms": clip.get("start_ms", 0), "end_ms": clip.get("end_ms", 0)}]
            for act in actions:
                if start_ns is not None:
                    a_s = start_ns + round((act["start_idx"] - clip.get("start_idx", 0)) * 1e9 / clip_fps)
                    a_e = start_ns + round((act["end_idx"] - clip.get("start_idx", 0)) * 1e9 / clip_fps)
                else:
                    a_s = round(act["start_idx"] * 1e9 / clip_fps)
                    a_e = round(act["end_idx"] * 1e9 / clip_fps)
                labeling_meta.append({"taskname": task_name_val, "start_time": a_s, "end_time": a_e,
                                      "description": "", "scenario_code": scenario_code})

        zf.writestr("extraction_info.json", _json.dumps(
            {"version": version, "effective_frequency": fps, "target_frequency": fps,
             "total_frames": seq_num, "extracted_images": json_frames}, ensure_ascii=False, indent=2))
        txt_content = f"版本: {version}\n实际频率: {fps} Hz\n目标频率: {fps} Hz\n提取图像数量: {seq_num}\n\n图像列表\n序号, 时间戳(ns), 文件名, 宽度, 高度, 通道数\n" + "\n".join(txt_lines)
        zf.writestr("extraction_info.txt", txt_content)
        zf.writestr("labeling_meta.json", _json.dumps(labeling_meta, ensure_ascii=False, indent=2))

    return {"ok": True, "download_url": f"/clips/{zip_name}", "version": version,
            "stats": stats, "labeling_meta": labeling_meta}


# ─── Reprocess ───────────────────────────────────────────────────────────────

class ReprocessRequest(BaseModel):
    task_name: str = ""
    filter_humans: bool = False
    detector: str = "yolo"
    yolo_model: str = "yolov8s.pt"
    detection_strategy: str = "single"
    require_center: bool = False
    center_margin: float = 0.20
    require_arms: bool = False
    arm_conf_threshold: float = 0.30
    motion_threshold: float = 0.015
    low_action_threshold: float = 0.04
    hand_activity_threshold: float = 0.0
    smooth_window: int = 5
    frame_sample_step: int = 1
    continuity_gap_frames: int = 5
    compress_px: int = 0


@app.post("/api/jobs/{job_id}/reprocess")
def reprocess_job(job_id: str, req: ReprocessRequest):
    original = jobs.get(job_id)
    if not original:
        raise HTTPException(status_code=404, detail="Job not found")
    upload_path = original.get("upload_path", "")
    if not upload_path or not Path(upload_path).exists():
        raise HTTPException(status_code=400, detail="源文件不可用")

    is_zip = original.get("input_type") == "sequence"
    new_job_id = str(uuid.uuid4())
    task_name = req.task_name or f"{original.get('task_name', '')} (重新处理)"

    jobs[new_job_id] = {
        "id": new_job_id,
        "filename": original.get("filename", ""),
        "task_name": task_name,
        "scenario_code": original.get("scenario_code", ""),
        "status": "processing", "step": "upload", "step_pct": 0,
        "clips": [], "total_duration_ms": 0,
        "input_type": original.get("input_type", "video"),
        "upload_path": upload_path, "file_hash": original.get("file_hash"),
        "compress_px": req.compress_px, "parent_job_id": job_id,
    }

    try:
        params = {k: v for k, v in req.model_dump().items() if k != "task_name"}
        params["input_type"] = "sequence" if is_zip else "video"
        vision.submit_process(upload_path, new_job_id, params,
                              callback_url=f"{API_BASE_URL}/internal/tasks/{new_job_id}/complete")
        jobs[new_job_id]["step"] = "extract" if is_zip else "decode"
    except Exception as e:
        jobs[new_job_id].update({"status": "failed", "error": f"Vision Engine 不可用: {e}"})

    return {"job_id": new_job_id}


# ─── Frame annotation (proxy to Vision Engine) ──────────────────────────────

class AnnotateFrameRequest(BaseModel):
    frame_url: str
    detector: str = "yolo"
    yolo_model: str = "yolov8s.pt"
    arm_conf_threshold: float = 0.30


@app.post("/api/frames/annotate")
def annotate_frame_endpoint(req: AnnotateFrameRequest):
    rel = req.frame_url.lstrip("/")
    if not rel.startswith("clips/"):
        raise HTTPException(status_code=400, detail="frame_url must begin with /clips/")
    file_path = CLIPS_DIR / rel.removeprefix("clips/")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Frame not found")
    return vision.annotate_frame(str(file_path), detector=req.detector,
                                  yolo_model=req.yolo_model,
                                  arm_conf_threshold=req.arm_conf_threshold)


# ─── Batch person detection (proxy to Vision Engine) ─────────────────────────

class DetectPersonsRequest(BaseModel):
    clip_id: str
    detector: str = "yolo"
    yolo_model: str = "yolov8s.pt"
    sample_step: int = 1


@app.post("/api/jobs/{job_id}/detect-persons")
def detect_persons_in_clip(job_id: str, req: DetectPersonsRequest):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    clip = next((c for c in job.get("clips", []) if c["id"] == req.clip_id), None)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    frame_urls = clip.get("frame_urls") or []
    if not frame_urls:
        return {"clip_id": req.clip_id, "detections": {}}

    # Resolve to local paths, sample, send to Vision Engine
    step = max(1, req.sample_step)
    sampled_urls = frame_urls[::step]
    paths = []
    for url in sampled_urls:
        rel = url.lstrip("/").removeprefix("clips/")
        p = CLIPS_DIR / rel
        if p.exists():
            paths.append(str(p))

    result = vision.detect_persons(paths, detector=req.detector, yolo_model=req.yolo_model)

    # Map filenames back to URLs
    fname_to_url = {Path(u).name: u for u in sampled_urls}
    detections = {}
    for fname, det in result.get("detections", {}).items():
        url = fname_to_url.get(fname, fname)
        detections[url] = det

    return {"clip_id": req.clip_id, "detections": detections}


# ─── Delete job ──────────────────────────────────────────────────────────────

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str):
    job = jobs.pop(job_id, None)

    # Clean local frame dirs
    culled_dir = CLIPS_DIR / "culled" / job_id
    if culled_dir.exists():
        shutil.rmtree(str(culled_dir), ignore_errors=True)

    if job:
        for clip in job.get("clips", []):
            frame_dir = CLIPS_DIR / "frames" / clip.get("id", "")
            if frame_dir.exists():
                shutil.rmtree(str(frame_dir), ignore_errors=True)

        upload_path = job.get("upload_path", "")
        if upload_path:
            still_in_use = any(j.get("upload_path") == upload_path for j in jobs.values())
            if not still_in_use and Path(upload_path).exists():
                Path(upload_path).unlink(missing_ok=True)

    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
