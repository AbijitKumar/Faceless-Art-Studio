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
    max_words: int = 3,
    max_chars: int = 24,
    max_gap: float = 0.5,
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


def _hex_to_pysubs_color(hex_str: str, default: tuple[int, int, int] = (255, 255, 255)) -> pysubs2.Color:
    """Convert #RRGGBB string to pysubs2.Color object."""
    try:
        val = hex_str.lstrip("#")
        if len(val) == 6:
            r = int(val[0:2], 16)
            g = int(val[2:4], 16)
            b = int(val[4:6], 16)
            return pysubs2.Color(r, g, b)
    except Exception:
        pass
    return pysubs2.Color(*default)


def generate_ass(
    words: list[dict[str, Any]],
    output_path: Path,
    *,
    max_words: int = 4,
    max_chars: int = 30,
    max_gap: float = 0.75,
    font_name: str = "Manrope",
    font_size: int = 78,
    primary_color: str = "#FFFFFF",
    highlight_color: str = "#FFDC28",
    outline_color: str = "#000000",
    back_color: str = "#000000",
    bold: bool = True,
    italic: bool = False,
    outline: int = 5,
    shadow: int = 2,
    alignment: int = 2,
    margin_v: int = 360,
    preset: str = "bold",
) -> Path:
    """
    Generate animated ASS captions from Whisper word timestamps with custom styling.
    """
    if not words:
        raise ValueError("No word timestamps were provided.")

    groups = _group_words(
        words,
        max_words=max_words,
        max_chars=max_chars,
        max_gap=max_gap,
    )

    if not groups:
        raise ValueError("Could not create caption groups.")

    subs = pysubs2.SSAFile()
    subs.info["PlayResX"] = "1080"
    subs.info["PlayResY"] = "1920"

    # Apply presets if specified
    p_color = _hex_to_pysubs_color(primary_color, (255, 255, 255))
    h_color = _hex_to_pysubs_color(highlight_color, (255, 220, 40))
    o_color = _hex_to_pysubs_color(outline_color, (0, 0, 0))
    b_color = _hex_to_pysubs_color(back_color, (0, 0, 0))

    if preset == "neon":
        p_color = pysubs2.Color(255, 255, 255)
        h_color = pysubs2.Color(0, 240, 255)  # Cyan glow
        o_color = pysubs2.Color(20, 24, 33)
        outline = 6
        shadow = 3
    elif preset == "bold":
        p_color = pysubs2.Color(255, 255, 255)
        h_color = pysubs2.Color(255, 220, 40)  # Vibrant Yellow
        o_color = pysubs2.Color(0, 0, 0)
        outline = 5
        bold = True
    elif preset == "classic":
        p_color = pysubs2.Color(255, 255, 255)
        h_color = pysubs2.Color(255, 255, 255)
        o_color = pysubs2.Color(0, 0, 0)
        outline = 3
        shadow = 1
    elif preset == "minimal":
        p_color = pysubs2.Color(224, 224, 224)
        h_color = pysubs2.Color(255, 255, 255)
        o_color = pysubs2.Color(16, 18, 22)
        outline = 2
        shadow = 0
    elif preset == "creator":
        p_color = pysubs2.Color(255, 255, 255)
        h_color = pysubs2.Color(30, 140, 250)  # Faceless Blue
        o_color = pysubs2.Color(16, 18, 22)
        outline = 5
        shadow = 2
    elif preset == "karaoke":
        p_color = pysubs2.Color(255, 255, 255)
        h_color = pysubs2.Color(30, 140, 250)
        o_color = pysubs2.Color(0, 0, 0)
        outline = 5
        bold = True

    # Calculate vertical margin based on alignment
    # alignment: 2 = bottom (default), 5 = center, 8 = top
    calc_margin_v = margin_v
    if alignment == 8:
        calc_margin_v = 240
    elif alignment == 5:
        calc_margin_v = 0

    if preset == "karaoke":
        # Karaoke mode: words start in base color and wipe into highlight color
        style = pysubs2.SSAStyle(
            fontname=font_name or "Manrope",
            fontsize=font_size or 78,
            primarycolor=h_color,
            secondarycolor=p_color,
            outlinecolor=o_color,
            backcolor=b_color,
            bold=bold,
            italic=italic,
            outline=outline,
            shadow=shadow,
            alignment=alignment,
            marginl=60,
            marginr=60,
            marginv=calc_margin_v,
        )
    else:
        # High-impact styled phrase mode: crisp, perfectly timed with speech
        style = pysubs2.SSAStyle(
            fontname=font_name or "Manrope",
            fontsize=font_size or 78,
            primarycolor=h_color if preset in ("bold", "neon", "creator") else p_color,
            secondarycolor=p_color,
            outlinecolor=o_color,
            backcolor=b_color,
            bold=bold,
            italic=italic,
            outline=outline,
            shadow=shadow,
            alignment=alignment,
            marginl=60,
            marginr=60,
            marginv=calc_margin_v,
        )

    subs.styles["Caption"] = style

    for group in groups:
        group_start = _ms(float(group[0]["start"]))
        group_end = _ms(float(group[-1]["end"]))

        if group_end <= group_start:
            group_end = group_start + 120

        if preset == "karaoke":
            event_text = _build_karaoke_text(group)
        else:
            event_text = " ".join(w["text"] for w in group)

        event = pysubs2.SSAEvent(
            start=group_start,
            end=group_end,
            text=event_text,
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