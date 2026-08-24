from pathlib import Path

from faster_whisper import WhisperModel


def _format_srt_time(seconds: float) -> str:
    """Convert seconds into SRT timestamp format."""
    total_ms = max(0, int(round(seconds * 1000)))

    hours = total_ms // 3_600_000
    total_ms %= 3_600_000

    minutes = total_ms // 60_000
    total_ms %= 60_000

    secs = total_ms // 1_000
    milliseconds = total_ms % 1_000

    return f"{hours:02}:{minutes:02}:{secs:02},{milliseconds:03}"


def generate_srt(
    audio_path: Path,
    output_path: Path,
    model_size: str = "small",
    language: str = "en",
):
    """
    Generate word-level SRT subtitles from the generated voice-over.

    Each spoken word receives its own start/end timestamp.
    """

    print(f"Loading Whisper model: {model_size}")

    model = WhisperModel(
        model_size,
        device="auto",
        compute_type="int8",
    )

    segments, _ = model.transcribe(
        str(audio_path),
        language=language,
        beam_size=5,
        vad_filter=True,
        word_timestamps=True,
    )

    entries = []

    for segment in segments:
        if not segment.words:
            continue

        for word in segment.words:
            text = word.word.strip()

            if not text:
                continue

            start = (
                word.start
                if word.start is not None
                else segment.start
            )

            end = (
                word.end
                if word.end is not None
                else segment.end
            )

            if end <= start:
                end = start + 0.08

            entries.append(
                {
                    "start": start,
                    "end": end,
                    "text": text,
                }
            )

    if not entries:
        raise RuntimeError(
            "Whisper did not produce word-level timestamps."
        )

    with output_path.open("w", encoding="utf-8") as srt:

        for index, entry in enumerate(entries, start=1):

            srt.write(f"{index}\n")

            srt.write(
                f"{_format_srt_time(entry['start'])} --> "
                f"{_format_srt_time(entry['end'])}\n"
            )

            srt.write(f"{entry['text']}\n\n")

    return output_path