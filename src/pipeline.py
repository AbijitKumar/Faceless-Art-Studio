from pathlib import Path

from src.core.tts import generate_voice_sync
from src.core.subtitles import generate_srt
from src.core.video import render_vertical_video
from src.utils.files import ensure_output_dirs, read_text, create_job_id


def run_pipeline(
    text,
    text_file,
    video_path: Path,
    voice: str,
    whisper_model: str,
    language: str,
    output_dir: Path,
):
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    text = read_text(text=text, text_file=text_file)
    paths = ensure_output_dirs(Path(output_dir))
    job_id = create_job_id()

    voiceover = paths["voiceovers"] / f"{job_id}.wav"
    subtitles = paths["subtitles"] / f"{job_id}.srt"
    final_video = paths["videos"] / f"{job_id}.mp4"

    print("[1/3] Generating voice-over...")
    generate_voice_sync(text, voiceover, voice)

    print("[2/3] Transcribing voice-over and creating SRT...")
    generate_srt(voiceover, subtitles, whisper_model, language)

    print("[3/3] Rendering final vertical video...")
    render_vertical_video(video_path, voiceover, subtitles, final_video)

    return {
        "job_id": job_id,
        "voiceover": voiceover,
        "subtitles": subtitles,
        "video": final_video,
    }
