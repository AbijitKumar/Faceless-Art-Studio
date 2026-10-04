import json
import os
from pathlib import Path
import subprocess
import wave

from src.utils.ffmpeg import run_ffmpeg


def get_media_duration(file_path: Path) -> float:
    """Get accurate duration of a media file in seconds using wave/ffprobe."""
    file_path = Path(file_path)
    # Fast path for standard WAV files (no subprocess overhead)
    if file_path.suffix.lower() == ".wav" and file_path.exists():
        try:
            with wave.open(str(file_path), "rb") as wf:
                frames = wf.getnframes()
                rate = wf.getframerate()
                if rate > 0:
                    return float(frames / rate)
        except Exception:
            pass

    try:
        cmd = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(file_path),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if res.returncode == 0:
            data = json.loads(res.stdout)
            return float(data.get("format", {}).get("duration", 0.0))
    except Exception:
        pass
    return 0.0


def get_dimensions(aspect_ratio: str = "9:16", resolution: str = "1080p") -> tuple[int, int]:
    """Calculate width and height from aspect ratio and resolution tier."""
    res_map = {
        "720p": {
            "9:16": (720, 1280),
            "16:9": (1280, 720),
            "1:1": (720, 720),
        },
        "1080p": {
            "9:16": (1080, 1920),
            "16:9": (1920, 1080),
            "1:1": (1080, 1080),
        },
        "4K": {
            "9:16": (2160, 3840),
            "16:9": (3840, 2160),
            "1:1": (2160, 2160),
        },
    }
    tier = res_map.get(resolution, res_map["1080p"])
    return tier.get(aspect_ratio, (1080, 1920))


def render_vertical_video(
    video_path: Path,
    audio_path: Path,
    caption_path: Path | None,
    output_path: Path,
    aspect_ratio: str = "9:16",
    resolution: str = "1080p",
):
    video_path = Path(video_path).resolve()
    audio_path = Path(audio_path).resolve()
    output_path = Path(output_path).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    w, h = get_dimensions(aspect_ratio, resolution)
    audio_duration = get_media_duration(audio_path)
    if audio_duration <= 0.0:
        raise ValueError(f"Could not determine valid duration for audio: {audio_path.name}")

    # Optimize scaling: crop to exact target aspect ratio first, then scale directly to target w:h.
    # This prevents the pathological 3413x1920 intermediate upscaling of 720p inputs.
    vf_filters = [
        f"crop='min(iw,ih*{w}/{h})':'min(ih,iw*{h}/{w})'",
        f"scale={w}:{h}",
    ]

    if caption_path and Path(caption_path).exists():
        caption_path_str = Path(caption_path).resolve().as_posix()
        caption_path_str = caption_path_str.replace(":", r"\:")
        caption_path_str = caption_path_str.replace("'", r"\'")
        vf_filters.append(f"subtitles='{caption_path_str}'")

    cpu_threads = str(min(4, max(1, os.cpu_count() or 2)))

    args = [
        "-stream_loop",
        "-1",
        "-i",
        str(video_path),
        "-i",
        str(audio_path),
        "-t",
        f"{audio_duration:.3f}",
        "-vf",
        ",".join(vf_filters),
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-r",
        "30",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ar",
        "44100",
        "-threads",
        cpu_threads,
        "-shortest",
        "-movflags",
        "+faststart",
        str(output_path),
    ]

    run_ffmpeg(args, timeout=600)
    return output_path

