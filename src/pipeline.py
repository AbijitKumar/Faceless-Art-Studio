from pathlib import Path

from src.core.tts import generate_voice_sync
from src.core.subtitles import generate_srt
from src.core.caption import generate_ass
from src.core.video import render_vertical_video
from src.utils.files import ensure_output_dirs, read_text, create_job_id


def run_pipeline(
    text=None,
    text_file=None,
    video_path: Path = None,
    voice: str = "en-US-AriaNeural",
    whisper_model: str = "small",
    language: str = "en",
    output_dir: Path = Path("output"),
    caption_settings: dict = None,
    video_settings: dict = None,
    stage_callback=None,
    job_id: str = None,
):
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    text = read_text(text=text, text_file=text_file)
    paths = ensure_output_dirs(Path(output_dir))
    if not job_id:
        job_id = create_job_id()

    voiceover = paths["voiceovers"] / f"{job_id}.wav"
    subtitles = paths["subtitles"] / f"{job_id}.srt"
    captions = paths["subtitles"] / f"{job_id}.ass"
    final_video = paths["videos"] / f"{job_id}.mp4"

    if stage_callback:
        stage_callback("generating_voice")
    print("[1/3] Generating voice-over...")
    generate_voice_sync(text, voiceover, voice)

    caption_opts = caption_settings or {}
    captions_enabled = caption_opts.get("enabled", True)

    if captions_enabled:
        if stage_callback:
            stage_callback("transcribing")
        print("[2/3] Transcribing voice-over and creating SRT...")
        subtitle_result = generate_srt(
            voiceover,
            subtitles,
            whisper_model,
            language,
        )

        if stage_callback:
            stage_callback("rendering_captions")
        generate_ass(
            subtitle_result["words"],
            captions,
            preset=caption_opts.get("preset", "bold"),
            font_name=caption_opts.get("font_name", "Manrope"),
            font_size=int(caption_opts.get("font_size", 78)),
            primary_color=caption_opts.get("primary_color", "#FFFFFF"),
            highlight_color=caption_opts.get("highlight_color", "#FFDC28"),
            outline_color=caption_opts.get("outline_color", "#000000"),
            alignment=int(caption_opts.get("alignment", 2)),
            outline=int(caption_opts.get("outline", 5)),
            shadow=int(caption_opts.get("shadow", 2)),
            max_words=int(caption_opts.get("max_words", 4)),
        )
        final_caption_path = captions
    else:
        print("[2/3] Captions disabled, skipping transcription & subtitle burn-in.")
        final_caption_path = None
        subtitles = None
        captions = None

    if stage_callback:
        stage_callback("rendering_video")
    print("[3/3] Rendering final vertical video...")
    vid_opts = video_settings or {}
    render_vertical_video(
        video_path,
        voiceover,
        final_caption_path,
        final_video,
        aspect_ratio=vid_opts.get("aspect_ratio", "9:16"),
        resolution=vid_opts.get("resolution", "1080p"),
    )

    if stage_callback:
        stage_callback("completed")

    return {
        "job_id": job_id,
        "voiceover": voiceover,
        "subtitles": subtitles,
        "captions": captions,
        "video": final_video,
    }

