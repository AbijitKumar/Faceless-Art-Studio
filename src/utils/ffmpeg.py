import shutil
import subprocess


def require_ffmpeg():
    if not shutil.which("ffmpeg"):
        raise RuntimeError(
            "FFmpeg was not found in PATH. Install FFmpeg and run 'ffmpeg -version' first."
        )


def run_ffmpeg(args, timeout: int | None = 600):
    require_ffmpeg()

    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args]
    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError(
            f"FFmpeg process exceeded maximum allowed time of {timeout}s and was terminated."
        ) from exc

    if completed.returncode != 0:
        raise RuntimeError(
            "FFmpeg failed:\n" + (completed.stderr.strip() or "Unknown FFmpeg error.")
        )

    return completed
