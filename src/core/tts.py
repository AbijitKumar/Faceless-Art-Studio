import asyncio
from pathlib import Path
import edge_tts


async def generate_voice(text: str, output_path: Path, voice: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(output_path))


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
