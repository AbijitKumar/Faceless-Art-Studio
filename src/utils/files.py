from pathlib import Path
import re
import uuid


def ensure_output_dirs(output_dir: Path):
    paths = {
        "voiceovers": output_dir / "voiceovers",
        "subtitles": output_dir / "subtitles",
        "videos": output_dir / "videos",
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    return paths


def read_text(text=None, text_file=None):
    if text:
        value = text.strip()
    elif text_file:
        value = Path(text_file).read_text(encoding="utf-8").strip()
    else:
        raise ValueError("No paragraph was provided.")

    if not value:
        raise ValueError("The paragraph is empty.")

    return value


def create_job_id():
    return uuid.uuid4().hex[:12]


def safe_stem(value: str):
    value = re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-")
    return value[:60] or "faceless-video"
