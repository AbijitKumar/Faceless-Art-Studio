from pathlib import Path
from typing import Any

import pysubs2


def _ms(seconds: float) -> int:
    """Convert seconds into milliseconds."""
    return max(0, int(round(seconds * 1000)))


def _ass_color(hex_color: str) -> str:
    """
    Convert #RRGGBB to ASS BGR format.

    ASS uses:
        &HBBGGRR
    """
    value = hex_color.lstrip("#")

    if len(value) != 6:
        raise ValueError("Color must be in #RRGGBB format.")

    red = value[0:2]
    green = value[2:4]
    blue = value[4:6]

    return f"&H{blue}{green}{red}"


def _group_words(
    words: list[dict[str, Any]],
    max_words: int = 4,
    max_chars: int = 30,
    max_gap: float = 0.75,
) -> list[list[dict[str, Any]]]:
    """
    Group words into short readable caption phrases.

    A new group is created when:
    - maximum word count is reached
    - maximum character count is reached
    - there is a large pause between words
    """

    groups: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []
    current_chars = 0

    for word in words:
        text = str(word.get("text", "")).strip()

        if not text:
            continue

        start = float(word.get("start", 0))
        end = float(word.get("end", start))

        if end <= start:
            end = start + 0.08

        cleaned_word = {
            "start": start,
            "end": end,
            "text": text,
        }

        if current:
            previous_end = float(current[-1]["end"])
            gap = start - previous_end

            would_exceed_words = len(current) >= max_words

            would_exceed_chars = (
                current_chars + 1 + len(text) > max_chars
            )

            would_have_large_gap = gap > max_gap

            if (
                would_exceed_words
                or would_exceed_chars
                or would_have_large_gap
            ):
                groups.append(current)
                current = []
                current_chars = 0

        current.append(cleaned_word)
        current_chars += len(text)

    if current:
        groups.append(current)

    return groups


def _karaoke_duration_centiseconds(
    start: float,
    end: float,
) -> int:
    """
    ASS karaoke timing uses centiseconds.

    Example:
        0.50 seconds -> 50
    """

    duration = max(0.01, end - start)

    return max(1, int(round(duration * 100)))


def _build_karaoke_text(
    group: list[dict[str, Any]],
) -> str:
    """
    Build ASS karaoke markup.

    Example:

        \\k50Thank \\k78you \\k20world

    Each \\k value controls how long that word remains
    unhighlighted before becoming highlighted.
    """

    parts: list[str] = []

    for word in group:
        text = word["text"]

        duration = _karaoke_duration_centiseconds(
            word["start"],
            word["end"],
        )

        parts.append(
            f"{{\\k{duration}}}{text}"
        )

    return " ".join(parts)


def generate_ass(
    words: list[dict[str, Any]],
    output_path: Path,
    *,
    max_words: int = 4,
    max_chars: int = 30,
    max_gap: float = 0.75,
    font_name: str = "Arial",
    font_size: int = 78,
) -> Path:
    """
    Generate animated ASS captions from Whisper word timestamps.

    The captions use ASS karaoke timing so the currently spoken
    word becomes highlighted according to the actual speech timing.

    Designed for:
        Instagram Reels
        YouTube Shorts
        TikTok-style vertical videos
    """

    if not words:
        raise ValueError(
            "No word timestamps were provided."
        )

    groups = _group_words(
        words,
        max_words=max_words,
        max_chars=max_chars,
        max_gap=max_gap,
    )

    if not groups:
        raise ValueError(
            "Could not create caption groups."
        )

    subs = pysubs2.SSAFile()

    # ---------------------------------------------------------
    # Video coordinate system
    # ---------------------------------------------------------

    subs.info["PlayResX"] = "1080"
    subs.info["PlayResY"] = "1920"

    # ---------------------------------------------------------
    # Caption style
    # ---------------------------------------------------------

    style = pysubs2.SSAStyle(
        fontname=font_name,
        fontsize=font_size,

        # Normal word color
        primarycolor=pysubs2.Color(
            255,
            255,
            255,
        ),

        # Karaoke-highlight color
        secondarycolor=pysubs2.Color(
            255,
            220,
            40,
        ),

        # Thick black outline
        outlinecolor=pysubs2.Color(
            0,
            0,
            0,
        ),

        # Background
        backcolor=pysubs2.Color(
            0,
            0,
            0,
        ),

        bold=True,
        italic=False,

        # Strong outline for readability
        outline=5,

        # Small shadow
        shadow=2,

        # Bottom-center alignment
        alignment=2,

        # Horizontal margins
        marginl=60,
        marginr=60,

        # Distance from bottom
        marginv=360,
    )

    subs.styles["Caption"] = style

    # ---------------------------------------------------------
    # Create caption events
    # ---------------------------------------------------------

    for group in groups:

        group_start = _ms(
            float(group[0]["start"])
        )

        group_end = _ms(
            float(group[-1]["end"])
        )

        if group_end <= group_start:
            group_end = group_start + 100

        karaoke_text = _build_karaoke_text(group)

        event = pysubs2.SSAEvent(
            start=group_start,
            end=group_end,
            text=karaoke_text,
            style="Caption",
        )

        subs.events.append(event)

    # ---------------------------------------------------------
    # Save ASS file
    # ---------------------------------------------------------

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    subs.save(str(output_path))

    return output_path