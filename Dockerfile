# ============================================================
# Faceless Art Studio - Production Dockerfile
# Target: Render Web Service (Docker)
# ============================================================

# Python 3.11 matches the local development environment.
# slim variant keeps the image small; FFmpeg is added below.
FROM python:3.11-slim

# -- System dependencies --------------------------------------
# ffmpeg   - required by the video pipeline (src/core/video.py,
#             src/utils/ffmpeg.py)
# Build tools are not installed permanently; apt cache is purged
# after use to keep layer size small.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify FFmpeg is on PATH (build will fail here if missing)
RUN ffmpeg -version

# -- Working directory -----------------------------------------
WORKDIR /app

# -- Python dependencies --------------------------------------
# Copy requirements first so Docker can cache this layer
# independently of application-code changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# -- Application code -----------------------------------------
COPY server.py   ./
COPY main.py     ./
COPY src/        ./src/

# -- Runtime directories --------------------------------------
# server.py already calls .mkdir(parents=True, exist_ok=True)
# for input/uploads and output at import time, but pre-creating
# them here makes the intent explicit and avoids any ordering
# edge-case if the working directory is read-only at the surface
# level.
RUN mkdir -p \
        input/uploads \
        output/videos \
        output/voiceovers \
        output/subtitles \
        output/users

# -- Environment defaults -------------------------------------
# PORT is set by Render automatically at runtime.
# These defaults are safe fallbacks and are overridden by the
# environment variables you configure in the Render dashboard.
ENV PORT=8000
ENV DEBUG=false

# Expose the default port for local `docker run` convenience.
# Render ignores EXPOSE and maps its own external port.
EXPOSE 8000

# -- Entry point ----------------------------------------------
# Run server.py directly; aiohttp's web.run_app() is its own
# event-loop runner - no gunicorn/uvicorn wrapper is needed.
CMD ["python", "server.py"]
