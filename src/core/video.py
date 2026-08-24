from pathlib import Path

from src.utils.ffmpeg import run_ffmpeg


def render_vertical_video(
    video_path: Path,
    audio_path: Path,
    srt_path: Path,
    output_path: Path,
):
    # Convert the Windows subtitle path into a format FFmpeg's
    # subtitles filter can safely understand.
    subtitle_path = srt_path.resolve().as_posix()
    subtitle_path = subtitle_path.replace(":", r"\:")
    subtitle_path = subtitle_path.replace("'", r"\'")

    subtitle_filter = f"subtitles='{subtitle_path}'"

    args = [
        "-stream_loop",
        "-1",
        "-i",
        str(video_path),
        "-i",
        str(audio_path),
        "-vf",
        "scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,"
        + subtitle_filter,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        str(output_path),
    ]

    run_ffmpeg(args)
    return output_path