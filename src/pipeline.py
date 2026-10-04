import logging
from pathlib import Path
import time

from src.core.tts import generate_voice_sync
from src.core.subtitles import generate_srt
from src.core.caption import generate_ass
from src.core.video import render_vertical_video
from src.utils.files import ensure_output_dirs, read_text, create_job_id

logger = logging.getLogger("faceless_studio.pipeline")


def run_pipeline(
    text=None,
    text_file=None,
    video_path: Path = None,
    voice: str = "en-US-AriaNeural",
    whisper_model: str = "base",
    language: str = "en",
    output_dir: Path = Path("output"),
    caption_settings: dict = None,
    video_settings: dict = None,
    stage_callback=None,
    job_id: str = None,
):
    t_start = time.perf_counter()
    if not job_id:
        job_id = create_job_id()

    logger.info(f"[Generation started] Job {job_id} | Voice: {voice} | Whisper: {whisper_model}")

    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    t_script_0 = time.perf_counter()
    text = read_text(text=text, text_file=text_file)
    paths = ensure_output_dirs(Path(output_dir))
    t_script = time.perf_counter() - t_script_0
    logger.info(f"[Script processing] Script validated ({len(text)} chars) in {t_script:.3f}s")

    voiceover = paths["voiceovers"] / f"{job_id}.wav"
    subtitles = paths["subtitles"] / f"{job_id}.srt"
    captions = paths["subtitles"] / f"{job_id}.ass"
    final_video = paths["videos"] / f"{job_id}.mp4"

    # Stage 1: TTS
    if stage_callback:
        stage_callback("generating_voice")
    logger.info(f"[TTS started] Generating voice-over with {voice}...")
    t_tts_0 = time.perf_counter()
    generate_voice_sync(text, voiceover, voice)
    t_tts = time.perf_counter() - t_tts_0
    logger.info(f"[TTS completed] Voice-over generated in {t_tts:.2f}s")

    caption_opts = caption_settings or {}
    captions_enabled = caption_opts.get("enabled", True)

    t_whisper = 0.0
    t_caption = 0.0

    if captions_enabled:
        # Stage 2: Whisper Transcription
        if stage_callback:
            stage_callback("transcribing")
        logger.info(f"[Whisper started] Transcribing voice-over ({whisper_model}, lang={language})...")
        t_whisper_0 = time.perf_counter()
        subtitle_result = generate_srt(
            voiceover,
            subtitles,
            whisper_model,
            language,
        )
        t_whisper = time.perf_counter() - t_whisper_0
        words_count = len(subtitle_result.get("words", []))
        logger.info(f"[Whisper completed] Transcribed {words_count} words in {t_whisper:.2f}s")

        # Stage 3: Subtitle ASS Generation
        if stage_callback:
            stage_callback("rendering_captions")
        t_cap_0 = time.perf_counter()
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
        t_caption = time.perf_counter() - t_cap_0
        logger.info(f"[Subtitle generation] Generated ASS captions in {t_caption:.3f}s")
        final_caption_path = captions
    else:
        logger.info("[Subtitle generation] Captions disabled, skipping Whisper and ASS generation.")
        final_caption_path = None
        subtitles = None
        captions = None

    # Stage 4: Video Preprocessing & FFmpeg
    vid_opts = video_settings or {}
    aspect_ratio = vid_opts.get("aspect_ratio", "9:16")
    resolution = vid_opts.get("resolution", "1080p")

    t_prep_0 = time.perf_counter()
    logger.info(f"[Video preprocessing] Source: {video_path.name} | Target: {aspect_ratio} {resolution}")
    t_prep = time.perf_counter() - t_prep_0

    if stage_callback:
        stage_callback("rendering_video")
    logger.info("[FFmpeg started] Rendering vertical video with FFmpeg...")
    t_ffmpeg_0 = time.perf_counter()
    render_vertical_video(
        video_path,
        voiceover,
        final_caption_path,
        final_video,
        aspect_ratio=aspect_ratio,
        resolution=resolution,
    )
    t_ffmpeg = time.perf_counter() - t_ffmpeg_0
    logger.info(f"[FFmpeg completed] Video rendered in {t_ffmpeg:.2f}s")

    # Finalization
    t_fin_0 = time.perf_counter()
    if stage_callback:
        stage_callback("completed")
    t_fin = time.perf_counter() - t_fin_0
    logger.info(f"[Finalization] Job finalized in {t_fin:.3f}s")

    total_time = time.perf_counter() - t_start
    logger.info(
        f"[Generation completed] Job {job_id} total: {total_time:.2f}s | "
        f"TTS: {t_tts:.2f}s, Whisper: {t_whisper:.2f}s, Subtitles: {t_caption:.2f}s, FFmpeg: {t_ffmpeg:.2f}s"
    )

    return {
        "job_id": job_id,
        "voiceover": voiceover,
        "subtitles": subtitles,
        "captions": captions,
        "video": final_video,
        "timings": {
            "tts_sec": round(t_tts, 2),
            "whisper_sec": round(t_whisper, 2),
            "captions_sec": round(t_caption, 2),
            "ffmpeg_sec": round(t_ffmpeg, 2),
            "total_sec": round(total_time, 2),
        },
    }

