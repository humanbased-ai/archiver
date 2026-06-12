import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()

UPLOAD_DIR = Path(__file__).parent.parent.parent / "data" / "uploads"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024   # 10 MB for images
MAX_VIDEO_SIZE = 512 * 1024 * 1024  # 512 MB for videos


@router.post("/upload")
async def upload_media(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type}")

    contents = await file.read()
    is_video = file.content_type == "video/mp4"
    is_gif = file.content_type == "image/gif"
    max_size = MAX_VIDEO_SIZE if (is_video or is_gif) else MAX_IMAGE_SIZE
    if len(contents) > max_size:
        limit_label = "512 MB" if (is_video or is_gif) else "10 MB"
        raise HTTPException(status_code=400, detail=f"File too large (max {limit_label})")

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    filename = f"{uuid.uuid4()}.{ext}"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOAD_DIR / filename
    with open(dest, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/{filename}", "filename": filename, "content_type": file.content_type}
