import shutil
import subprocess


def require_ffmpeg():
    if not shutil.which("ffmpeg"):
        raise RuntimeError(
            "FFmpeg was not found in PATH. Install FFmpeg and run 'ffmpeg -version' first."
        )


def run_ffmpeg(args):
    require_ffmpeg()

    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args]
    completed = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    if completed.returncode != 0:
        raise RuntimeError(
            "FFmpeg failed:\n" + (completed.stderr.strip() or "Unknown FFmpeg error.")
        )

    return completed
