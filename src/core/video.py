from pathlib import Path

from src.utils.ffmpeg import run_ffmpeg


def render_vertical_video(
    video_path: Path,
    audio_path: Path,
    caption_path: Path,
    output_path: Path,
):
    # Convert the Windows subtitle path into a format FFmpeg's
    # subtitles filter can safely understand.
    caption_path = caption_path.resolve().as_posix()
    caption_path = caption_path.replace(":", r"\:")
    caption_path = caption_path.replace("'", r"\'")

    caption_filter = f"subtitles='{caption_path}'"

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
        + caption_filter,
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