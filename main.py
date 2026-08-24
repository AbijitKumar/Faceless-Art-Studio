import argparse
import asyncio
import sys
from pathlib import Path

from src.pipeline import run_pipeline
from src.core.tts import list_voices


def build_parser():
    parser = argparse.ArgumentParser(
        description="Faceless Art Studio v1 - terminal-first faceless video generator."
    )

    source = parser.add_mutually_exclusive_group()
    source.add_argument("--text", help="Paragraph to convert into narration.")
    source.add_argument("--text-file", type=Path, help="UTF-8 text file containing the paragraph.")

    parser.add_argument("--video", type=Path, help="Source video path.")
    parser.add_argument("--voice", default="en-US-AriaNeural", help="Edge TTS voice.")
    parser.add_argument("--model", default="small", help="faster-whisper model size.")
    parser.add_argument("--language", default="en", help="Whisper language code.")
    parser.add_argument("--output-dir", type=Path, default=Path("output"))
    parser.add_argument("--list-voices", action="store_true", help="List common Edge voices and exit.")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.list_voices:
        asyncio.run(list_voices())
        return 0

    if not args.text and not args.text_file:
        parser.error("Provide --text or --text-file.")

    if not args.video:
        parser.error("Provide --video.")

    try:
        result = run_pipeline(
            text=args.text,
            text_file=args.text_file,
            video_path=args.video,
            voice=args.voice,
            whisper_model=args.model,
            language=args.language,
            output_dir=args.output_dir,
        )

        print("\n=== Faceless Art Studio v1 ===")
        print(f"Job ID:       {result['job_id']}")
        print(f"Voice-over:   {result['voiceover']}")
        print(f"Subtitles:    {result['subtitles']}")
        print(f"Final video:  {result['video']}")
        print("\nPipeline completed successfully.")
        return 0

    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        print("\nCheck README.md for installation and troubleshooting.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
