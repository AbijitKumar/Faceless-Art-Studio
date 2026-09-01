import asyncio
from pathlib import Path
import edge_tts


async def generate_voice(text: str, output_path: Path, voice: str):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_mp3 = output_path.with_suffix(".temp.mp3")
    
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(temp_mp3))
    
    # Convert to standard PCM 16-bit stereo WAV with FFmpeg if .wav is requested
    if output_path.suffix.lower() == ".wav":
        from src.utils.ffmpeg import run_ffmpeg
        run_ffmpeg([
            "-i", str(temp_mp3),
            "-ar", "44100",
            "-ac", "2",
            "-c:a", "pcm_s16le",
            str(output_path)
        ])
        if temp_mp3.exists():
            try:
                temp_mp3.unlink()
            except Exception:
                pass
    else:
        if temp_mp3 != output_path:
            if output_path.exists():
                output_path.unlink()
            temp_mp3.rename(output_path)


async def list_voices():
    voices = await edge_tts.list_voices()
    common = [
        v for v in voices
        if v.get("Locale", "").startswith(("en-US", "en-GB", "en-IN"))
    ]

    print("Common English voices:\n")
    for voice in common[:80]:
        print(f"{voice['ShortName']:28} {voice.get('Gender', ''):8} {voice.get('Locale', '')}")


def generate_voice_sync(text: str, output_path: Path, voice: str):
    asyncio.run(generate_voice(text, output_path, voice))

