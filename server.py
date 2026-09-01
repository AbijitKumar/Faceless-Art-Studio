import asyncio
import os
import random
import re
import traceback
from pathlib import Path
from typing import Any, Dict, List

import aiohttp
from aiohttp import web
import edge_tts

from src.pipeline import run_pipeline
from src.utils.files import safe_stem

BASE_DIR = Path(__file__).resolve().parent
INPUT_DIR = BASE_DIR / "input"
UPLOADS_DIR = INPUT_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "output"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}

# In-memory job state tracking
jobs: Dict[str, Dict[str, Any]] = {}


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


@web.middleware
async def cors_middleware(request, handler):
    if request.method == "OPTIONS":
        response = web.Response(status=200)
    else:
        try:
            response = await handler(request)
        except web.HTTPException as ex:
            response = ex
        except Exception as ex:
            response = web.json_response({"error": str(ex)}, status=500)

    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Range, Authorization"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range, Content-Length, Accept-Ranges, Content-Disposition"
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
        return web.json_response({"error": f"Failed to fetch voices: {exc}"}, status=500)


async def get_input_files(request: web.Request) -> web.Response:
    """List available video files in input directory."""
    files = get_available_input_videos()
    return web.json_response({"files": files, "count": len(files)})


async def get_random_input(request: web.Request) -> web.Response:
    """Select and return a random video from input directory."""
    files = get_available_input_videos()
    if not files:
        return web.json_response({
            "error": "No source videos are available in the input folder."
        }, status=404)

    chosen = random.choice(files)
    return web.json_response({"file": chosen, "total_available": len(files)})


async def upload_video(request: web.Request) -> web.Response:
    """Handle multipart file upload for source video."""
    reader = await request.multipart()
    field = await reader.next()
    if not field or field.name != "file":
        return web.json_response({"error": "No 'file' field provided in multipart form."}, status=400)

    filename = field.filename or "uploaded_video.mp4"
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]+", "_", filename)
    target_path = UPLOADS_DIR / safe_name

    size = 0
    with open(target_path, "wb") as f:
        while True:
            chunk = await field.read_chunk()
            if not chunk:
                break
            size += len(chunk)
            f.write(chunk)

    rel_path = target_path.relative_to(BASE_DIR).as_posix()
    return web.json_response({
        "success": True,
        "name": safe_name,
        "path": str(target_path.resolve()),
        "relPath": rel_path,
        "url": f"/{rel_path}",
        "size": size,
    })


def _execute_pipeline_sync(job_id: str, payload: dict):
    """Synchronous worker function running inside thread executor."""
    try:
        def update_stage(stage_name: str):
            if job_id in jobs:
                jobs[job_id]["stage"] = stage_name

        text = payload.get("text", "").strip()
        raw_video_path = payload.get("video_path", "").strip()
        voice = payload.get("voice", "en-US-AriaNeural")
        whisper_model = payload.get("whisper_model", "small")
        language = payload.get("language", "en")
        caption_settings = payload.get("caption_settings", {})
        video_settings = payload.get("video_settings", {})

        # Resolve or randomly select video path
        if not raw_video_path or raw_video_path.lower() == "random":
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
            raise FileNotFoundError(f"Source video file not found at: {video_path}")

        jobs[job_id]["source_video"] = source_filename
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["stage"] = "preparing"

        result = run_pipeline(
            text=text,
            video_path=video_path,
            voice=voice,
            whisper_model=whisper_model,
            language=language,
            output_dir=OUTPUT_DIR,
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
        }

    except Exception as exc:
        traceback.print_exc()
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["stage"] = "failed"
        jobs[job_id]["error"] = str(exc)


async def generate_video(request: web.Request) -> web.Response:
    """Start video generation job asynchronously."""
    try:
        payload = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON body."}, status=400)

    text = payload.get("text", "").strip()
    raw_title = payload.get("title", "").strip() or "Untitled Video"
    # Sanitize title for filesystem safety
    safe_title = re.sub(r'[\\/*?:"<>|]', "", raw_title).strip() or "Untitled Video"

    if not text:
        return web.json_response({"error": "Script text is required."}, status=400)

    # Check input videos availability
    available_videos = get_available_input_videos()
    raw_video_path = payload.get("video_path", "").strip()

    if not raw_video_path or raw_video_path.lower() == "random":
        if not available_videos:
            return web.json_response({
                "error": "No source videos are available in the input folder."
            }, status=400)
        # Choose a random video right away for transparency
        selected = random.choice(available_videos)
        payload["video_path"] = selected["path"]
        source_name = selected["name"]
    else:
        v_path = Path(raw_video_path)
        if not v_path.is_absolute():
            v_path = (BASE_DIR / raw_video_path).resolve()
        if not v_path.exists():
            return web.json_response({
                "error": f"Source video not found: {raw_video_path}"
            }, status=400)
        source_name = v_path.name

    job_id = payload.get("job_id") or os.urandom(6).hex()

    jobs[job_id] = {
        "job_id": job_id,
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
    """Get status of a generation job."""
    job_id = request.match_info.get("job_id", "")
    if job_id not in jobs:
        return web.json_response({"error": f"Job {job_id} not found."}, status=404)

    return web.json_response(jobs[job_id])


async def download_file(request: web.Request) -> web.Response:
    """Safely stream/download generated output file with custom project name."""
    filename = request.match_info.get("filename", "")
    # Protect against path traversal
    safe_filename = Path(filename).name
    target_path = OUTPUT_DIR / "videos" / safe_filename

    if not target_path.exists():
        # Fallback to direct output
        target_path = OUTPUT_DIR / safe_filename

    if not target_path.exists() or not target_path.is_file():
        return web.json_response({"error": "File not found."}, status=404)

    # Determine desired download filename from query parameter or project title
    custom_title = request.query.get("title", "").strip() or request.query.get("filename", "").strip()
    if custom_title:
        # Sanitize filename: replace invalid Windows characters < > : " / \ | ? *
        clean_name = re.sub(r'[\\/*?:"<>|]', "", custom_title).strip()
        clean_name = clean_name.rstrip(". ")
        if not clean_name:
            clean_name = "faceless-art-studio-video"
        if not clean_name.lower().endswith(".mp4"):
            download_display_name = f"{clean_name}.mp4"
        else:
            download_display_name = clean_name
    else:
        # Fallback to job id filename
        download_display_name = safe_filename if safe_filename.endswith(".mp4") else f"{safe_filename}.mp4"

    return web.FileResponse(
        target_path,
        headers={
            "Content-Disposition": f'attachment; filename="{download_display_name}"',
            "Content-Type": "video/mp4",
        },
    )



def make_app() -> web.Application:
    app = web.Application(middlewares=[cors_middleware])

    # API routes
    app.router.add_get("/api/voices", get_voices)
    app.router.add_get("/api/input-files", get_input_files)
    app.router.add_get("/api/random-input", get_random_input)
    app.router.add_post("/api/upload", upload_video)
    app.router.add_post("/api/generate", generate_video)
    app.router.add_get("/api/jobs/{job_id}", get_job_status)
    app.router.add_get("/api/download/{filename}", download_file)

    # Static media routes for preview and video streaming
    app.router.add_static("/output", OUTPUT_DIR, show_index=True)
    app.router.add_static("/input", INPUT_DIR, show_index=True)

    return app


if __name__ == "__main__":
    app = make_app()
    print("=== Faceless Art Studio API Server ===")
    print("Running on http://127.0.0.1:8000")
    web.run_app(app, host="127.0.0.1", port=8000)

