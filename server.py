import asyncio
from collections import defaultdict
import logging
import os
from pathlib import Path
import random
import re
import shutil
import time
import traceback
from typing import Any, Dict, List
import uuid

import mimetypes
import aiohttp
from aiohttp import web
import edge_tts

from src.pipeline import run_pipeline
from src.utils.files import safe_stem
from src.utils.supabase_storage import (
    is_supabase_configured,
    upload_to_supabase_storage,
    create_signed_storage_url,
    insert_media_asset_metadata,
    query_user_media_assets,
    delete_media_asset_record_and_file,
    download_storage_file_sync,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("faceless_studio")

BASE_DIR = Path(__file__).resolve().parent
INPUT_DIR = BASE_DIR / "input"
UPLOADS_DIR = INPUT_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "output"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
SUPPORTED_AUDIO_EXTS = {".wav", ".mp3", ".m4a", ".aac", ".ogg"}
SUPPORTED_SUBTITLE_EXTS = {".srt", ".ass", ".vtt"}
SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
ALL_ALLOWED_UPLOAD_EXTS = SUPPORTED_VIDEO_EXTS | SUPPORTED_AUDIO_EXTS | SUPPORTED_IMAGE_EXTS

# In-memory job state tracking
jobs: Dict[str, Dict[str, Any]] = {}

def _load_env_file():
    for candidate in [BASE_DIR / ".env", BASE_DIR / "frontend" / ".env"]:
        if candidate.exists() and candidate.is_file():
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip("'\"")
                        if key and key not in os.environ:
                            os.environ[key] = val
            except Exception:
                pass

_load_env_file()

DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1")
SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").strip().rstrip("/")
SUPABASE_ANON_KEY = (
    os.getenv("SUPABASE_ANON_KEY") or
    os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY") or
    os.getenv("VITE_SUPABASE_ANON_KEY") or
    ""
).strip()

MAX_UPLOAD_SIZE_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_MB", "150")) * 1024 * 1024
RATE_LIMIT_GENERATE = int(os.getenv("RATE_LIMIT_GENERATE", "10"))
RATE_LIMIT_UPLOAD = int(os.getenv("RATE_LIMIT_UPLOAD", "20"))
RATE_LIMIT_API = int(os.getenv("RATE_LIMIT_API", "120"))

ALLOWED_ORIGINS = {
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if o.strip()
}

# Simple sliding window rate limiter
class InMemoryRateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int = 60) -> tuple[bool, int]:
        now = time.time()
        timestamps = [t for t in self.requests[key] if now - t < window_seconds]
        if len(timestamps) >= max_requests:
            oldest = timestamps[0]
            retry_after = max(1, int(window_seconds - (now - oldest)))
            self.requests[key] = timestamps
            return False, retry_after
        timestamps.append(now)
        self.requests[key] = timestamps
        return True, 0

rate_limiter = InMemoryRateLimiter()


async def verify_supabase_token(request: web.Request) -> tuple[bool, str | None, dict | None]:
    """
    Validates the Supabase Bearer token against the Supabase Auth API.
    Returns: (is_valid: bool, error_code: str | None, user_data: dict | None)
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return False, "AUTH_NOT_CONFIGURED", None

    token = ""
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "token" in request.query:
        token = request.query.get("token", "").strip()

    if not token:
        return False, "TOKEN_MISSING", None

    verify_url = f"{SUPABASE_URL}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY,
    }

    try:
        timeout = aiohttp.ClientTimeout(total=8)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(verify_url, headers=headers) as resp:
                if resp.status == 200:
                    user_data = await resp.json()
                    return True, None, user_data
                else:
                    return False, "INVALID_TOKEN", None
    except Exception as exc:
        logger.error(f"Failed to connect to Supabase Auth API: {exc}")
        return False, "INVALID_TOKEN", None


def extract_bearer_token(request: web.Request) -> str:
    """Extract Bearer token from Authorization header or query parameter."""
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return request.query.get("token", "").strip()



def get_available_input_videos() -> List[Dict[str, Any]]:
    """Scan INPUT_DIR and return list of valid video files."""
    files = []
    if not INPUT_DIR.exists():
        return files

    for p in INPUT_DIR.rglob("*"):
        if p.is_file() and p.suffix.lower() in SUPPORTED_VIDEO_EXTS:
            rel_path = p.relative_to(BASE_DIR).as_posix()
            files.append({
                "name": p.name,
                "path": str(p.resolve()),
                "relPath": rel_path,
                "url": f"/{rel_path}",
                "size": p.stat().st_size,
            })
    return files


def get_all_media_assets(user_id: str | None = None) -> Dict[str, Any]:
    """Scan input and output directories and return all real creative assets, scoped to user if specified."""
    assets: List[Dict[str, Any]] = []

    # 1. Input directory (source videos and images) - shared creative inputs
    if INPUT_DIR.exists():
        for p in sorted(INPUT_DIR.rglob("*"), key=lambda x: x.stat().st_mtime, reverse=True):
            if not p.is_file() or p.name.startswith("."):
                continue
            ext = p.suffix.lower()
            rel_path = p.relative_to(BASE_DIR).as_posix()
            stat = p.stat()

            media_type = None
            if ext in SUPPORTED_VIDEO_EXTS:
                media_type = "video"
            elif ext in SUPPORTED_IMAGE_EXTS:
                media_type = "image"
            elif ext in SUPPORTED_AUDIO_EXTS:
                media_type = "audio"
            elif ext in SUPPORTED_SUBTITLE_EXTS:
                media_type = "subtitle"

            if media_type:
                assets.append({
                    "id": f"in_{safe_stem(p.name)}_{stat.st_size}",
                    "name": p.name,
                    "path": str(p.resolve()),
                    "relPath": rel_path,
                    "url": f"/{rel_path}",
                    "category": "input",
                    "type": media_type,
                    "extension": ext,
                    "size": stat.st_size,
                    "modified": int(stat.st_mtime * 1000),
                })

    # 2. Output directory - scan user-scoped folder if user_id is provided
    search_dirs = []
    if user_id:
        user_dir = OUTPUT_DIR / "users" / str(user_id)
        if user_dir.exists():
            search_dirs.append(user_dir)
    else:
        # Fallback for unauthenticated legacy items if any
        search_dirs.extend([
            OUTPUT_DIR / "videos",
            OUTPUT_DIR / "voiceovers",
            OUTPUT_DIR / "subtitles",
        ])

    for base_search in search_dirs:
        if not base_search.exists():
            continue
        for p in sorted(base_search.rglob("*"), key=lambda x: x.stat().st_mtime, reverse=True):
            if not p.is_file() or p.name.startswith("."):
                continue
            ext = p.suffix.lower()
            rel_path = p.relative_to(BASE_DIR).as_posix()
            stat = p.stat()

            cat = "output_other"
            m_type = None
            if ext in SUPPORTED_VIDEO_EXTS:
                cat = "output_video"
                m_type = "video"
            elif ext in SUPPORTED_AUDIO_EXTS:
                cat = "voiceover"
                m_type = "audio"
            elif ext in SUPPORTED_SUBTITLE_EXTS:
                cat = "subtitles"
                m_type = "subtitle"

            if m_type:
                assets.append({
                    "id": f"out_{safe_stem(p.name)}_{stat.st_size}",
                    "name": p.name,
                    "path": str(p.resolve()),
                    "relPath": rel_path,
                    "url": f"/{rel_path}",
                    "category": cat,
                    "type": m_type,
                    "extension": ext,
                    "size": stat.st_size,
                    "modified": int(stat.st_mtime * 1000),
                })

    # Calculate Summary
    video_count = sum(1 for a in assets if a["type"] == "video")
    audio_count = sum(1 for a in assets if a["type"] == "audio")
    subtitle_count = sum(1 for a in assets if a["type"] == "subtitle")
    image_count = sum(1 for a in assets if a["type"] == "image")
    total_size = sum(a["size"] for a in assets)

    return {
        "assets": assets,
        "summary": {
            "total": len(assets),
            "videos": video_count,
            "audio": audio_count,
            "subtitles": subtitle_count,
            "images": image_count,
            "totalSizeBytes": total_size,
        },
    }


async def get_media_library(request: web.Request) -> web.Response:
    """Return all media assets in the workspace with metadata and summary, merging cloud storage assets for authenticated users."""
    try:
        is_valid, _, user_data = await verify_supabase_token(request)
        caller_user_id = user_data.get("id") if (is_valid and user_data) else None
        user_token = extract_bearer_token(request)
        data = get_all_media_assets(caller_user_id)

        # Merge user's persistent cloud source videos from Supabase
        if caller_user_id and is_supabase_configured():
            try:
                db_assets = await query_user_media_assets(str(caller_user_id), category="input", user_token=user_token)
                for rec in db_assets:
                    storage_path = rec.get("storage_path") or f"{caller_user_id}/{rec.get('name')}"
                    ext = Path(rec.get("name", "")).suffix.lower()
                    try:
                        signed_url = await create_signed_storage_url(storage_path, expires_in_seconds=3600, user_token=user_token)
                    except Exception:
                        signed_url = ""

                    data["assets"].insert(0, {
                        "id": str(rec.get("id", "")),
                        "name": rec.get("name"),
                        "original_name": rec.get("original_name", rec.get("name")),
                        "path": storage_path,
                        "relPath": storage_path,
                        "storage_path": storage_path,
                        "url": signed_url,
                        "category": "input",
                        "type": "video",
                        "extension": ext,
                        "size": rec.get("size", 0),
                        "modified": int(time.time() * 1000),
                    })
                # Recalculate summary metrics
                data["summary"]["total"] = len(data["assets"])
                data["summary"]["videos"] = sum(1 for a in data["assets"] if a.get("type") == "video")
                data["summary"]["totalSizeBytes"] = sum(a.get("size", 0) for a in data["assets"])
            except Exception as exc:
                logger.error(f"Error merging user media assets for library: {exc}")

        return web.json_response(data)
    except Exception as exc:
        logger.error(f"Failed to list media assets: {exc}")
        if DEBUG:
            return web.json_response({"error": f"Failed to list media assets: {exc}"}, status=500)
        return web.json_response({"error": "Failed to list media assets."}, status=500)


@web.middleware
async def cors_and_security_middleware(request: web.Request, handler):
    origin = request.headers.get("Origin", "")

    if request.method == "OPTIONS":
        response = web.Response(status=200)
    else:
        try:
            response = await handler(request)
        except web.HTTPException as ex:
            response = ex
        except Exception as ex:
            logger.error(f"Unhandled server error on {request.method} {request.path}: {ex}", exc_info=True)
            if DEBUG:
                response = web.json_response({"error": str(ex)}, status=500)
            else:
                response = web.json_response({"error": "An internal server error occurred."}, status=500)

    # CORS configuration
    if origin:
        if origin in ALLOWED_ORIGINS or "*" in ALLOWED_ORIGINS or DEBUG:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Vary"] = "Origin"
    elif DEBUG:
        response.headers["Access-Control-Allow-Origin"] = "*"

    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Range, Authorization, X-Requested-With"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range, Content-Length, Accept-Ranges, Content-Disposition"

    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    if request.secure or request.headers.get("X-Forwarded-Proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response


async def get_voices(request: web.Request) -> web.Response:
    """Return available Edge TTS voices."""
    try:
        raw_voices = await edge_tts.list_voices()
        voices = []
        for v in raw_voices:
            voices.append({
                "shortName": v.get("ShortName", ""),
                "friendlyName": v.get("FriendlyName", v.get("ShortName", "")),
                "gender": v.get("Gender", "Unknown"),
                "locale": v.get("Locale", "en-US"),
                "localeName": v.get("LocaleName", ""),
            })
        return web.json_response({"voices": voices})
    except Exception as exc:
        logger.error(f"Failed to fetch voices: {exc}")
        return web.json_response({"error": "Failed to fetch voices."}, status=500)


async def get_input_files(request: web.Request) -> web.Response:
    """List available video files. Authenticated users receive their persistent cloud-stored source videos."""
    is_valid, _, user_data = await verify_supabase_token(request)
    caller_user_id = user_data.get("id") if (is_valid and user_data) else None
    user_token = extract_bearer_token(request)

    files = []
    if caller_user_id and is_supabase_configured():
        try:
            records = await query_user_media_assets(
                user_id=str(caller_user_id),
                category="input",
                user_token=user_token,
            )
            for rec in records:
                storage_path = rec.get("storage_path") or f"{caller_user_id}/{rec.get('name')}"
                try:
                    signed_url = await create_signed_storage_url(
                        storage_path=storage_path,
                        expires_in_seconds=3600,
                        user_token=user_token,
                    )
                except Exception as sign_err:
                    logger.warning(f"Could not generate signed URL for {storage_path}: {sign_err}")
                    signed_url = ""

                files.append({
                    "id": str(rec.get("id", "")),
                    "name": rec.get("name"),
                    "original_name": rec.get("original_name", rec.get("name")),
                    "url": signed_url,
                    "storage_path": storage_path,
                    "path": storage_path,
                    "relPath": storage_path,
                    "size": rec.get("size", 0),
                })
        except Exception as exc:
            logger.error(f"Error fetching user media assets: {exc}")

    # For local development backward compatibility, also include local files if present
    local_files = get_available_input_videos()
    for lf in local_files:
        if not any(f["name"] == lf["name"] for f in files):
            files.append(lf)

    return web.json_response({"files": files, "count": len(files)})


async def get_random_input(request: web.Request) -> web.Response:
    """Select and return a random video from cloud storage or local input directory."""
    is_valid, _, user_data = await verify_supabase_token(request)
    caller_user_id = user_data.get("id") if (is_valid and user_data) else None
    user_token = extract_bearer_token(request)

    if caller_user_id and is_supabase_configured():
        try:
            records = await query_user_media_assets(str(caller_user_id), category="input", user_token=user_token)
            if records:
                rec = random.choice(records)
                storage_path = rec.get("storage_path") or f"{caller_user_id}/{rec.get('name')}"
                signed_url = await create_signed_storage_url(storage_path, expires_in_seconds=3600, user_token=user_token)
                return web.json_response({
                    "file": {
                        "id": str(rec.get("id", "")),
                        "name": rec.get("name"),
                        "original_name": rec.get("original_name", rec.get("name")),
                        "url": signed_url,
                        "storage_path": storage_path,
                        "path": storage_path,
                        "relPath": storage_path,
                        "size": rec.get("size", 0),
                    },
                    "total_available": len(records),
                })
        except Exception as exc:
            logger.error(f"Error getting random cloud asset: {exc}")

    files = get_available_input_videos()
    if not files:
        return web.json_response({
            "error": "No source videos are available. Please upload a background video."
        }, status=404)

    chosen = random.choice(files)
    return web.json_response({"file": chosen, "total_available": len(files)})


async def upload_video(request: web.Request) -> web.Response:
    """Handle multipart file upload for source video with persistent storage in Supabase."""
    is_valid, err_code, user_data = await verify_supabase_token(request)
    if err_code == "AUTH_NOT_CONFIGURED":
        return web.json_response({
            "error": "Authentication backend is not configured on the server."
        }, status=503)
    if not is_valid:
        return web.json_response({
            "error": "Unauthorized: A valid authenticated session is required to upload media."
        }, status=401)

    caller_user_id = user_data.get("id") if user_data else None
    user_token = extract_bearer_token(request)
    client_ip = request.remote or "unknown"
    rate_key = f"upload_{caller_user_id or client_ip}"
    allowed, retry_after = rate_limiter.is_allowed(rate_key, RATE_LIMIT_UPLOAD, window_seconds=60)
    if not allowed:
        return web.json_response(
            {"error": f"Upload rate limit exceeded. Please wait {retry_after} seconds before uploading again."},
            status=429,
            headers={"Retry-After": str(retry_after)},
        )

    try:
        reader = await request.multipart()
    except Exception:
        return web.json_response({"error": "Invalid multipart payload."}, status=400)

    field = await reader.next()
    if not field or field.name != "file":
        return web.json_response({"error": "No 'file' field provided in multipart form."}, status=400)

    raw_filename = field.filename or "uploaded_video.mp4"
    file_ext = Path(raw_filename).suffix.lower()

    if file_ext not in ALL_ALLOWED_UPLOAD_EXTS:
        return web.json_response({
            "error": f"Unsupported file type '{file_ext}'. Allowed formats: {', '.join(sorted(ALL_ALLOWED_UPLOAD_EXTS))}"
        }, status=400)

    safe_stem_part = safe_stem(Path(raw_filename).stem)[:40] or "media"
    unique_prefix = uuid.uuid4().hex[:10]
    safe_name = f"{unique_prefix}_{safe_stem_part}{file_ext}"

    # Read file content safely in memory buffer (capped by MAX_UPLOAD_SIZE_BYTES)
    chunks = []
    size = 0
    while True:
        chunk = await field.read_chunk()
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_UPLOAD_SIZE_BYTES:
            return web.json_response({
                "error": f"File exceeds maximum allowed size of {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB."
            }, status=413)
        chunks.append(chunk)

    file_bytes = b"".join(chunks)
    detected_mime = mimetypes.guess_type(raw_filename)[0] or "video/mp4"

    # If Supabase is configured, store permanently in Supabase Storage & DB
    if is_supabase_configured():
        storage_path = f"{caller_user_id}/{safe_name}"
        try:
            # 1. Upload to Supabase Storage
            await upload_to_supabase_storage(
                file_bytes=file_bytes,
                storage_path=storage_path,
                mime_type=detected_mime,
                user_token=user_token,
            )

            # 2. Insert metadata into public.media_assets
            db_record = await insert_media_asset_metadata(
                record={
                    "user_id": caller_user_id,
                    "name": safe_name,
                    "original_name": raw_filename,
                    "storage_path": storage_path,
                    "mime_type": detected_mime,
                    "size": size,
                    "category": "input",
                },
                user_token=user_token,
            )

            # 3. Create signed URL for instant frontend playback
            signed_url = await create_signed_storage_url(
                storage_path=storage_path,
                expires_in_seconds=3600,
                user_token=user_token,
            )

            record_id = str(db_record.get("id", "")) if isinstance(db_record, dict) else ""
            return web.json_response({
                "success": True,
                "id": record_id,
                "name": safe_name,
                "original_name": raw_filename,
                "storage_path": storage_path,
                "path": storage_path,
                "relPath": storage_path,
                "type": "video",
                "category": "input",
                "size": size,
                "url": signed_url,
            })
        except Exception as exc:
            logger.error(f"Failed to persist upload in Supabase Storage: {exc}", exc_info=True)
            return web.json_response({
                "error": f"Storage upload failed: {exc}"
            }, status=500)

    # Local fallback for pure offline development
    target_path = (UPLOADS_DIR / safe_name).resolve()
    try:
        with open(target_path, "wb") as f:
            f.write(file_bytes)
        rel_path = target_path.relative_to(BASE_DIR).as_posix()
        return web.json_response({
            "success": True,
            "id": safe_name,
            "name": safe_name,
            "original_name": raw_filename,
            "path": str(target_path),
            "relPath": rel_path,
            "url": f"/{rel_path}",
            "size": size,
        })
    except Exception as exc:
        logger.error(f"Local upload write error: {exc}")
        return web.json_response({"error": "Failed to save uploaded file."}, status=500)


async def delete_media_asset(request: web.Request) -> web.Response:
    """Delete a user-owned media asset from Supabase Storage and database."""
    is_valid, err_code, user_data = await verify_supabase_token(request)
    if not is_valid:
        return web.json_response({"error": "Unauthorized: Session required to delete assets."}, status=401)

    caller_user_id = user_data.get("id") if user_data else None
    user_token = extract_bearer_token(request)
    asset_id = request.match_info.get("asset_id", "").strip()

    if not asset_id:
        return web.json_response({"error": "Asset ID is required."}, status=400)

    # 1. Query user assets to find matching asset and verify ownership
    user_assets = await query_user_media_assets(str(caller_user_id), category="input", user_token=user_token)
    matched = next((a for a in user_assets if str(a.get("id")) == asset_id or a.get("name") == asset_id), None)

    if not matched:
        return web.json_response({"error": "Asset not found or access denied."}, status=404)

    storage_path = matched.get("storage_path") or f"{caller_user_id}/{matched.get('name')}"
    actual_id = str(matched.get("id"))

    success = await delete_media_asset_record_and_file(
        asset_id=actual_id,
        user_id=str(caller_user_id),
        storage_path=storage_path,
        user_token=user_token,
    )

    if not success:
        return web.json_response({"error": "Failed to delete media asset."}, status=500)

    return web.json_response({"success": True, "message": "Asset deleted successfully."})


def _execute_pipeline_sync(job_id: str, payload: dict):
    """Synchronous worker function running inside thread executor."""
    temp_download_dir = None
    try:
        def update_stage(stage_name: str):
            if job_id in jobs:
                jobs[job_id]["stage"] = stage_name

        text = payload.get("text", "").strip()
        raw_video_path = payload.get("video_path", "").strip()
        storage_path = payload.get("storage_path")
        auth_token = payload.get("auth_token")
        voice = payload.get("voice", "en-US-AriaNeural")
        whisper_model = payload.get("whisper_model", "base")
        language = payload.get("language", "en")
        caption_settings = payload.get("caption_settings", {})
        video_settings = payload.get("video_settings", {})

        # Resolve video path: cloud storage vs local file
        if storage_path:
            temp_download_dir = BASE_DIR / "output" / "temp" / job_id
            temp_download_dir.mkdir(parents=True, exist_ok=True)
            source_filename = Path(storage_path).name
            temp_video_path = temp_download_dir / source_filename
            logger.info(f"Downloading persistent source video from Supabase Storage: {storage_path}")
            download_storage_file_sync(
                storage_path=storage_path,
                local_dest=temp_video_path,
                user_token=auth_token,
            )
            video_path = temp_video_path
        elif not raw_video_path or raw_video_path.lower() == "random":
            available = get_available_input_videos()
            if not available:
                raise FileNotFoundError("No source videos are available in the input folder.")
            chosen_item = random.choice(available)
            video_path = Path(chosen_item["path"])
            source_filename = chosen_item["name"]
        else:
            video_path = Path(raw_video_path)
            if not video_path.is_absolute():
                video_path = (BASE_DIR / raw_video_path).resolve()
            source_filename = video_path.name

        if not video_path.exists():
            raise FileNotFoundError(f"Source video file not found: {source_filename}")

        jobs[job_id]["source_video"] = source_filename
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["stage"] = "preparing"

        # Resolve account-scoped persistent output directory
        user_id = payload.get("user_id")
        if user_id:
            user_output_dir = OUTPUT_DIR / "users" / str(user_id) / job_id
        else:
            user_output_dir = OUTPUT_DIR
        user_output_dir.mkdir(parents=True, exist_ok=True)

        result = run_pipeline(
            text=text,
            video_path=video_path,
            voice=voice,
            whisper_model=whisper_model,
            language=language,
            output_dir=user_output_dir,
            caption_settings=caption_settings,
            video_settings=video_settings,
            stage_callback=update_stage,
            job_id=job_id,
        )

        final_video_path = Path(result["video"])
        final_video_rel = final_video_path.relative_to(BASE_DIR).as_posix()
        voiceover_rel = Path(result["voiceover"]).relative_to(BASE_DIR).as_posix() if result.get("voiceover") else None
        subtitles_rel = Path(result["subtitles"]).relative_to(BASE_DIR).as_posix() if result.get("subtitles") else None

        # Measure accurate duration
        from src.core.video import get_media_duration
        exact_duration_sec = get_media_duration(final_video_path)
        mins = int(exact_duration_sec // 60)
        secs = int(round(exact_duration_sec % 60))
        formatted_duration = f"{mins}:{secs:02d}"

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["stage"] = "completed"
        jobs[job_id]["result"] = {
            "job_id": job_id,
            "title": jobs[job_id].get("title", "Untitled Video"),
            "source_video": source_filename,
            "video_path": str(final_video_path),
            "video_url": f"/{final_video_rel}",
            "voiceover_url": f"/{voiceover_rel}" if voiceover_rel else None,
            "subtitles_url": f"/{subtitles_rel}" if subtitles_rel else None,
            "duration": formatted_duration,
            "duration_sec": exact_duration_sec,
            "resolution": video_settings.get("resolution", "1080p"),
            "aspect_ratio": video_settings.get("aspect_ratio", "9:16"),
            "timings": result.get("timings", {}),
        }

    except Exception as exc:
        logger.error(f"Pipeline execution failed for job {job_id}: {exc}", exc_info=True)
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["stage"] = "failed"
        # Sanitize error message to prevent leaking server paths
        err_msg = str(exc)
        if str(BASE_DIR) in err_msg:
            err_msg = err_msg.replace(str(BASE_DIR), "[studio_root]")
        jobs[job_id]["error"] = err_msg if DEBUG else "Video generation failed. Please check your script and settings."

    finally:
        # Clean up temporary downloaded source video
        if temp_download_dir and temp_download_dir.exists():
            try:
                shutil.rmtree(temp_download_dir, ignore_errors=True)
                logger.info(f"Cleaned up temporary source workspace: {temp_download_dir}")
            except Exception as clean_err:
                logger.warning(f"Error cleaning up temp directory {temp_download_dir}: {clean_err}")


async def generate_video(request: web.Request) -> web.Response:
    """Start video generation job asynchronously with strict input validation."""
    is_valid, err_code, user_data = await verify_supabase_token(request)
    if err_code == "AUTH_NOT_CONFIGURED":
        return web.json_response({
            "error": "Authentication backend is not configured on the server. SUPABASE_URL and SUPABASE_ANON_KEY must be set in the server environment before generation can proceed."
        }, status=503)
    if not is_valid:
        return web.json_response({
            "error": "Unauthorized: A valid authenticated session is required to generate videos."
        }, status=401)

    caller_user_id = user_data.get("id") if user_data else None
    client_ip = request.remote or "unknown"
    rate_key = f"gen_{caller_user_id or client_ip}"
    allowed, retry_after = rate_limiter.is_allowed(rate_key, RATE_LIMIT_GENERATE, window_seconds=60)
    if not allowed:
        return web.json_response(
            {"error": f"Generation rate limit exceeded. Please wait {retry_after} seconds before starting another video."},
            status=429,
            headers={"Retry-After": str(retry_after)},
        )

    try:
        payload = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON body."}, status=400)

    # 1. Script validation
    text = payload.get("text", "")
    if not isinstance(text, str) or not text.strip():
        return web.json_response({"error": "Script text is required and cannot be empty."}, status=400)
    if len(text.strip()) > 100000:
        return web.json_response({"error": "Script text is too long (maximum 100,000 characters)."}, status=400)
    text = text.strip()

    # 2. Title validation
    raw_title = payload.get("title", "")
    if not isinstance(raw_title, str):
        raw_title = "Untitled Video"
    safe_title = re.sub(r'[\\/*?:"<>|]', "", raw_title).strip()[:150] or "Untitled Video"

    # 3. Voice validation
    voice = payload.get("voice", "en-US-AriaNeural")
    if not isinstance(voice, str) or not re.match(r"^[a-zA-Z0-9_\-\+]+$", voice):
        voice = "en-US-AriaNeural"

    # 4. Whisper model validation
    whisper_model = payload.get("whisper_model", "base")
    if whisper_model not in {"tiny", "base", "small", "medium", "large"}:
        whisper_model = "base"

    # 5. Language validation
    language = payload.get("language", "en")
    if not isinstance(language, str) or not re.match(r"^[a-zA-Z0-9_\-]+$", language):
        language = "en"

    # 6. Video settings validation
    video_settings = payload.get("video_settings", {})
    if not isinstance(video_settings, dict):
        video_settings = {}
    aspect_ratio = video_settings.get("aspect_ratio", "9:16")
    if aspect_ratio not in {"9:16", "16:9", "1:1"}:
        aspect_ratio = "9:16"
    resolution = video_settings.get("resolution", "1080p")
    if resolution not in {"720p", "1080p", "4K"}:
        resolution = "1080p"
    video_settings["aspect_ratio"] = aspect_ratio
    video_settings["resolution"] = resolution

    # 7. Caption settings validation
    caption_settings = payload.get("caption_settings", {})
    if not isinstance(caption_settings, dict):
        caption_settings = {}
    preset = caption_settings.get("preset", "bold")
    if preset not in {"bold", "neon", "classic", "minimal", "karaoke", "creator"}:
        preset = "bold"
    caption_settings["preset"] = preset

    # Hex colors validation
    hex_color_re = re.compile(r"^#[0-9a-fA-F]{6}$")
    for color_field, default_val in [
        ("primary_color", "#FFFFFF"),
        ("highlight_color", "#FFDC28"),
        ("outline_color", "#000000"),
    ]:
        val = caption_settings.get(color_field, default_val)
        if not isinstance(val, str) or not hex_color_re.match(val):
            caption_settings[color_field] = default_val

    # Numeric bounds
    try:
        caption_settings["font_size"] = max(10, min(200, int(caption_settings.get("font_size", 78))))
        caption_settings["alignment"] = max(1, min(9, int(caption_settings.get("alignment", 2))))
        caption_settings["outline"] = max(0, min(20, int(caption_settings.get("outline", 5))))
        caption_settings["shadow"] = max(0, min(20, int(caption_settings.get("shadow", 2))))
        caption_settings["max_words"] = max(1, min(20, int(caption_settings.get("max_words", 4))))
    except (ValueError, TypeError):
        caption_settings["font_size"] = 78
        caption_settings["alignment"] = 2
        caption_settings["outline"] = 5
        caption_settings["shadow"] = 2
        caption_settings["max_words"] = 4

    # 8. Source video path validation - support persistent Supabase cloud videos and local files
    caller_user_id = user_data.get("id") if user_data else None
    user_token = extract_bearer_token(request)
    raw_video_path = payload.get("video_path", "").strip()
    storage_path = payload.get("storage_path", "").strip()

    resolved_storage_path = None
    source_name = "source_video.mp4"

    # Case A: Explicit storage_path provided
    if storage_path:
        if not storage_path.startswith(f"{caller_user_id}/") and not SUPABASE_SERVICE_ROLE_KEY:
            return web.json_response({
                "error": "Forbidden: You do not have permission to use another account's source video."
            }, status=403)
        resolved_storage_path = storage_path
        source_name = Path(storage_path).name

    # Case B: raw_video_path is given as a storage path (e.g. "{user_id}/{filename}")
    elif raw_video_path and not Path(raw_video_path).is_absolute() and "/" in raw_video_path and not raw_video_path.startswith("input"):
        parts = raw_video_path.split("/", 1)
        if parts[0] == str(caller_user_id) or SUPABASE_SERVICE_ROLE_KEY:
            resolved_storage_path = raw_video_path
            source_name = Path(raw_video_path).name
        else:
            return web.json_response({
                "error": "Forbidden: You do not have permission to use another account's source video."
            }, status=403)

    # Case C: "random" or empty video_path
    elif not raw_video_path or raw_video_path.lower() == "random":
        user_assets = []
        if caller_user_id and is_supabase_configured():
            try:
                user_assets = await query_user_media_assets(str(caller_user_id), category="input", user_token=user_token)
            except Exception as err:
                logger.warning(f"Failed to query user media assets during random selection: {err}")

        if user_assets:
            chosen_asset = random.choice(user_assets)
            resolved_storage_path = chosen_asset.get("storage_path") or f"{caller_user_id}/{chosen_asset.get('name')}"
            source_name = chosen_asset.get("name", "source_video.mp4")
        else:
            available_videos = get_available_input_videos()
            if not available_videos:
                return web.json_response({
                    "error": "No source videos are available. Please upload a background video first."
                }, status=400)
            selected = random.choice(available_videos)
            payload["video_path"] = selected["path"]
            source_name = selected["name"]

    # Case D: Local file path on disk
    else:
        v_path = Path(raw_video_path)
        if not v_path.is_absolute():
            v_path = (BASE_DIR / raw_video_path).resolve()
        else:
            v_path = v_path.resolve()

        allowed_parents = [
            INPUT_DIR.resolve(),
            UPLOADS_DIR.resolve(),
            (OUTPUT_DIR / "users" / str(caller_user_id)).resolve(),
        ]
        is_safe_path = any(str(v_path).startswith(str(p)) for p in allowed_parents)
        if not is_safe_path:
            return web.json_response({
                "error": "Invalid source video path: Path must reside in an approved media folder."
            }, status=400)

        if not v_path.exists():
            return web.json_response({
                "error": f"Source video not found: {v_path.name}"
            }, status=400)
        source_name = v_path.name
        payload["video_path"] = str(v_path)

    # 9. Job ID validation
    job_id = payload.get("job_id")
    if not job_id or not isinstance(job_id, str) or not re.match(r"^[a-zA-Z0-9_\-]{4,64}$", job_id):
        job_id = os.urandom(6).hex()

    # Overwrite payload with validated sanitized parameters
    payload["job_id"] = job_id
    payload["title"] = safe_title
    payload["text"] = text
    payload["voice"] = voice
    payload["whisper_model"] = whisper_model
    payload["language"] = language
    payload["video_settings"] = video_settings
    payload["caption_settings"] = caption_settings
    payload["user_id"] = caller_user_id
    payload["storage_path"] = resolved_storage_path
    payload["auth_token"] = user_token

    jobs[job_id] = {
        "job_id": job_id,
        "user_id": caller_user_id,
        "title": safe_title,
        "source_video": source_name,
        "status": "processing",
        "stage": "preparing",
        "result": None,
        "error": None,
    }

    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _execute_pipeline_sync, job_id, payload)

    return web.json_response({
        "success": True,
        "job_id": job_id,
        "title": safe_title,
        "source_video": source_name,
        "status": "processing",
        "stage": "preparing",
    })


async def get_job_status(request: web.Request) -> web.Response:
    """Get status of a generation job with ownership validation."""
    is_valid, err_code, user_data = await verify_supabase_token(request)
    if err_code == "AUTH_NOT_CONFIGURED":
        return web.json_response({
            "error": "Authentication backend is not configured on the server."
        }, status=503)
    if not is_valid:
        return web.json_response({
            "error": "Unauthorized: A valid session is required to check job status."
        }, status=401)

    job_id = request.match_info.get("job_id", "").strip()
    if job_id not in jobs:
        return web.json_response({"error": f"Job {job_id} not found."}, status=404)

    job = jobs[job_id]
    caller_user_id = user_data.get("id") if user_data else None
    job_user_id = job.get("user_id")

    # Check caller ownership if job has an assigned user_id
    if job_user_id and caller_user_id and job_user_id != caller_user_id:
        return web.json_response({
            "error": "Forbidden: You do not have access to this generation job."
        }, status=403)

    return web.json_response(job)


async def download_user_file(request: web.Request) -> web.Response:
    """Safely stream/download an account-scoped file with strict ownership validation."""
    is_valid, err_code, user_data = await verify_supabase_token(request)
    if not is_valid:
        return web.json_response({
            "error": "Unauthorized: A valid session is required to download this video."
        }, status=401)

    caller_user_id = user_data.get("id") if user_data else None
    target_user_id = request.match_info.get("user_id", "").strip()
    job_id = request.match_info.get("job_id", "").strip()
    raw_filename = request.match_info.get("filename", "").strip()

    # Block path traversal attempts
    safe_filename = Path(raw_filename).name

    # Strict account ownership check
    if not caller_user_id or caller_user_id != target_user_id:
        return web.json_response({
            "error": "Forbidden: You do not have permission to access another account's project files."
        }, status=403)

    base_user_job_dir = (OUTPUT_DIR / "users" / target_user_id / job_id).resolve()
    candidate_paths = [
        base_user_job_dir / "videos" / safe_filename,
        base_user_job_dir / "voiceovers" / safe_filename,
        base_user_job_dir / "subtitles" / safe_filename,
        base_user_job_dir / safe_filename,
    ]

    target_path = None
    for cand in candidate_paths:
        if cand.exists() and cand.is_file():
            if str(cand.resolve()).startswith(str(base_user_job_dir)):
                target_path = cand
                break

    if not target_path:
        return web.json_response({"error": "File not found."}, status=404)

    ext = target_path.suffix.lower()
    content_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".srt": "text/plain; charset=utf-8",
        ".ass": "text/plain; charset=utf-8",
        ".vtt": "text/vtt; charset=utf-8",
    }
    content_type = content_types.get(ext, "application/octet-stream")

    custom_title = request.query.get("title", "").strip()
    if custom_title:
        clean_name = re.sub(r'[\\/*?:"<>|]', "", custom_title).strip().rstrip(". ")
        if not clean_name:
            clean_name = target_path.stem
        download_display_name = f"{clean_name}{ext}" if not clean_name.lower().endswith(ext) else clean_name
    else:
        download_display_name = safe_filename

    return web.FileResponse(
        target_path,
        headers={
            "Content-Disposition": f'attachment; filename="{download_display_name}"',
            "Content-Type": content_type,
        },
    )


async def stream_user_output(request: web.Request) -> web.Response:
    """
    Safely stream private user-scoped media files with strict token and ownership verification.
    Prevents unauthorized access to other accounts' generated videos, audio, and subtitles.
    """
    is_valid, err_code, user_data = await verify_supabase_token(request)
    if not is_valid:
        return web.json_response({
            "error": "Unauthorized: A valid session is required to access private generated media."
        }, status=401)

    caller_user_id = user_data.get("id") if user_data else None
    target_user_id = request.match_info.get("user_id", "").strip()
    job_id = request.match_info.get("job_id", "").strip()
    rest = request.match_info.get("rest", "").strip()

    if not caller_user_id or caller_user_id != target_user_id:
        return web.json_response({
            "error": "Forbidden: You do not have permission to access another account's generated media."
        }, status=403)

    user_job_dir = (OUTPUT_DIR / "users" / target_user_id / job_id).resolve()
    target_file = (user_job_dir / rest).resolve()

    # Enforce file is strictly within user_job_dir
    if not str(target_file).startswith(str(user_job_dir)) or not target_file.exists() or not target_file.is_file():
        return web.json_response({"error": "Media file not found."}, status=404)

    return web.FileResponse(target_file)


async def download_file(request: web.Request) -> web.Response:
    """Safely stream/download media files from approved directories."""
    filename = request.match_info.get("filename", "")
    safe_filename = Path(filename).name

    is_valid, _, user_data = await verify_supabase_token(request)
    caller_user_id = user_data.get("id") if (is_valid and user_data) else None

    candidates = [
        INPUT_DIR / safe_filename,
        UPLOADS_DIR / safe_filename,
    ]

    # Only search user folder if caller is authenticated
    if caller_user_id:
        user_folder = OUTPUT_DIR / "users" / str(caller_user_id)
        if user_folder.exists():
            candidates.extend(user_folder.rglob(safe_filename))

    candidates.extend([
        OUTPUT_DIR / "videos" / safe_filename,
        OUTPUT_DIR / "voiceovers" / safe_filename,
        OUTPUT_DIR / "subtitles" / safe_filename,
        OUTPUT_DIR / safe_filename,
    ])

    target_path = None
    for cand in candidates:
        if cand.exists() and cand.is_file():
            target_path = cand
            break

    if not target_path:
        # Check if caller has this file stored in Supabase Storage
        if caller_user_id and is_supabase_configured():
            try:
                user_token = extract_bearer_token(request)
                user_assets = await query_user_media_assets(str(caller_user_id), category="input", user_token=user_token)
                matched = next((a for a in user_assets if a.get("name") == safe_filename), None)
                if matched:
                    storage_path = matched.get("storage_path") or f"{caller_user_id}/{safe_filename}"
                    signed_url = await create_signed_storage_url(storage_path, expires_in_seconds=600, user_token=user_token)
                    raise web.HTTPFound(signed_url)
            except web.HTTPFound:
                raise
            except Exception as exc:
                logger.warning(f"Error checking cloud storage for download {safe_filename}: {exc}")
        return web.json_response({"error": "File not found."}, status=404)

    ext = target_path.suffix.lower()
    content_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".srt": "text/plain; charset=utf-8",
        ".ass": "text/plain; charset=utf-8",
        ".vtt": "text/vtt; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }
    content_type = content_types.get(ext, "application/octet-stream")

    custom_title = request.query.get("title", "").strip()
    if custom_title:
        clean_name = re.sub(r'[\\/*?:"<>|]', "", custom_title).strip().rstrip(". ")
        if not clean_name:
            clean_name = target_path.stem
        download_display_name = f"{clean_name}{ext}" if not clean_name.lower().endswith(ext) else clean_name
    else:
        download_display_name = safe_filename

    return web.FileResponse(
        target_path,
        headers={
            "Content-Disposition": f'attachment; filename="{download_display_name}"',
            "Content-Type": content_type,
        },
    )


async def cleanup_user_account(request: web.Request) -> web.Response:
    """Safely delete all generated filesystem objects for the authenticated user."""
    is_valid, err_code, user_data = await verify_supabase_token(request)
    if not is_valid:
        return web.json_response({"error": "Unauthorized: Session token required for account cleanup."}, status=401)

    caller_user_id = user_data.get("id") if user_data else None
    if not caller_user_id:
        return web.json_response({"error": "Invalid user identity."}, status=400)

    user_dir = (OUTPUT_DIR / "users" / str(caller_user_id)).resolve()
    if user_dir.exists() and str(user_dir).startswith(str(OUTPUT_DIR.resolve())):
        try:
            shutil.rmtree(user_dir, ignore_errors=True)
            logger.info(f"Cleaned up filesystem data for user {caller_user_id}")
        except Exception as exc:
            logger.error(f"Error during account cleanup for {caller_user_id}: {exc}")
            return web.json_response({"error": "Failed to delete user media assets."}, status=500)

    return web.json_response({
        "success": True,
        "message": "User media assets cleaned up successfully.",
    })


async def health_check(request: web.Request) -> web.Response:
    """Unauthenticated liveness probe. Returns HTTP 200 with minimal JSON."""
    return web.json_response({"status": "ok"})


def make_app() -> web.Application:
    app = web.Application(middlewares=[cors_and_security_middleware])

    # Health probe (no authentication required)
    app.router.add_get("/health", health_check)

    # API routes
    app.router.add_get("/api/voices", get_voices)
    app.router.add_get("/api/input-files", get_input_files)
    app.router.add_get("/api/random-input", get_random_input)
    app.router.add_get("/api/media", get_media_library)
    app.router.add_delete("/api/media/{asset_id}", delete_media_asset)
    app.router.add_post("/api/upload", upload_video)
    app.router.add_post("/api/generate", generate_video)
    app.router.add_get("/api/jobs/{job_id}", get_job_status)
    app.router.add_get("/api/download/{user_id}/{job_id}/{filename}", download_user_file)
    app.router.add_get("/api/download/{filename}", download_file)
    app.router.add_post("/api/account/cleanup", cleanup_user_account)

    # Protected account-scoped media streaming route
    app.router.add_get("/output/users/{user_id}/{job_id}/{rest:.*}", stream_user_output)

    # Static shared media routes (show_index disabled for security)
    # Notice: /output/users is protected above and NOT exposed via static routes!
    for legacy_folder in ["videos", "voiceovers", "subtitles"]:
        sub = OUTPUT_DIR / legacy_folder
        sub.mkdir(parents=True, exist_ok=True)
        app.router.add_static(f"/output/{legacy_folder}", sub, show_index=False)

    app.router.add_static("/input", INPUT_DIR, show_index=False)

    return app


if __name__ == "__main__":
    app = make_app()
    # Bind to 0.0.0.0 so the container exposes the port on all interfaces.
    # Read the PORT variable supplied by Render (or any PaaS); fall back to
    # 8000 so local development continues to work exactly as before.
    host = "0.0.0.0"
    port = int(os.getenv("PORT", "8000"))
    print("=== Faceless Art Studio API Server ===")
    print(f"Running on http://{host}:{port}")
    web.run_app(app, host=host, port=port)
