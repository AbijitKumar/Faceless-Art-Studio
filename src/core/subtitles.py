from pathlib import Path
from faster_whisper import WhisperModel


def _srt_time(seconds: float):
    total_ms = max(0, int(round(seconds * 1000)))
    hours, remainder = divmod(total_ms, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, milliseconds = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{milliseconds:03}"


def generate_srt(audio_path: Path, output_path: Path, model_size="small", language="en"):
    print(f"Loading Whisper model: {model_size}")
    model = WhisperModel(model_size, device="auto", compute_type="int8")

    segments, _info = model.transcribe(
        str(audio_path),
        language=language,
        vad_filter=True,
        beam_size=5,
    )

    count = 0
    with output_path.open("w", encoding="utf-8") as srt:
        for count, segment in enumerate(segments, start=1):
            text = segment.text.strip()
            if not text:
                continue

            srt.write(f"{count}\n")
            srt.write(f"{_srt_time(segment.start)} --> {_srt_time(segment.end)}\n")
            srt.write(f"{text}\n\n")

    if count == 0:
        raise RuntimeError("Whisper did not produce any subtitle segments.")

    return output_path
