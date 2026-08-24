# Faceless Art Studio — v1

A terminal-first application that turns:

1. A paragraph of text
2. A source video

into a faceless video containing:

- AI-generated voice-over
- `.srt` subtitles generated from the voice-over
- The original video with the new voice and subtitles integrated

## v1 scope

This version deliberately focuses on a clean working pipeline and file organization rather than a frontend.

### Pipeline

```text
Paragraph
   │
   ▼
Text-to-Speech
   │
   ├──► output/voiceovers/*.wav
   │
   ▼
Speech-to-Text
   │
   └──► output/subtitles/*.srt
                 │
Video ───────────┤
                 ▼
        FFmpeg video render
                 │
                 ▼
       output/videos/*.mp4
```

## Technology

- **Python 3.10+** — main application language.
- **edge-tts** — generates natural-sounding speech using Microsoft Edge's online TTS service.
- **faster-whisper** — locally transcribes the generated voice-over and provides subtitle timestamps.
- **FFmpeg** — mixes audio, scales/crops the video to a vertical 9:16 canvas, burns subtitles, and exports MP4.
- **argparse / pathlib / subprocess** — Python standard library components for the CLI and filesystem work.

The project intentionally uses Python because it fits a beginner-to-intermediate development workflow and is easy to evolve into a web/desktop application later.

## Important

`edge-tts` requires an internet connection because the voice generation service is online.

`faster-whisper` runs locally after its model is downloaded. The first transcription can therefore take longer.

FFmpeg must be installed and available in your system PATH.

---

# 1. Requirements

## Python

Recommended:

```text
Python 3.11 or 3.12
```

Python 3.10+ should work.

## FFmpeg

Check:

```bash
ffmpeg -version
```

If Windows says `ffmpeg is not recognized`, install FFmpeg and add its `bin` directory to PATH.

## Hardware

A CPU works, but subtitle transcription is considerably faster with a compatible GPU.

---

# 2. Installation

Create a virtual environment:

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

### macOS/Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

---

# 3. Quick start

Put a source video in:

```text
input/
```

Run:

```bash
python main.py --text "Your paragraph goes here." --video input/myvideo.mp4
```

Or use a text file:

```bash
python main.py --text-file input/script.txt --video input/myvideo.mp4
```

The program creates:

```text
output/
├── voiceovers/
│   └── <job_id>.wav
├── subtitles/
│   └── <job_id>.srt
└── videos/
    └── <job_id>.mp4
```

The final MP4 is the finished v1 faceless video.

---

# 4. Voice selection

Default voice:

```text
en-US-AriaNeural
```

List available voices:

```bash
python main.py --list-voices
```

Use another voice:

```bash
python main.py --text "Hello world." --video input/video.mp4 --voice en-US-GuyNeural
```

---

# 5. Subtitle model

Default:

```text
small
```

Use a smaller/faster model:

```bash
python main.py --text-file input/script.txt --video input/video.mp4 --model tiny
```

Use a better model:

```bash
python main.py --text-file input/script.txt --video input/video.mp4 --model medium
```

Available Whisper model sizes depend on the installed `faster-whisper` version and local resources.

---

# 6. Output design

The v1 renderer creates a vertical 9:16 video suitable as a starting point for Shorts/Reels/TikTok-style content.

The source video is:

- scaled to fill a 1080×1920 canvas
- center-cropped
- combined with the generated narration
- rendered with burned-in subtitles

If the source video is shorter than the narration, the final video is extended by looping the source.

If the source video is longer, the output is trimmed to the narration duration.

---

# 7. Project structure

```text
Faceless-Art-Studio-v1/
├── main.py
├── requirements.txt
├── .gitignore
├── LICENSE
├── README.md
├── input/
│   └── .gitkeep
├── output/
│   ├── voiceovers/
│   ├── subtitles/
│   └── videos/
├── assets/
├── src/
│   ├── __init__.py
│   ├── pipeline.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── tts.py
│   │   ├── subtitles.py
│   │   └── video.py
│   └── utils/
│       ├── __init__.py
│       ├── files.py
│       └── ffmpeg.py
└── docs/
    └── ROADMAP.md
```

---

# 8. Development philosophy

The application is intentionally modular.

Later we can replace:

```text
CLI
```

with:

```text
FastAPI backend
        │
        ▼
Web frontend
```

without rewriting the core media pipeline.

Potential future modules include:

- script generation
- automatic stock-footage selection
- scene segmentation
- background music
- sound effects
- subtitle animation
- word highlighting
- multiple subtitle styles
- automatic B-roll search
- content presets
- project history
- batch rendering
- GPU acceleration
- social-media export presets
- queue-based rendering
- user accounts
- analytics

---

# 9. Troubleshooting

### `ffmpeg is not recognized`

Install FFmpeg and ensure:

```text
ffmpeg.exe
```

is available through PATH.

### TTS fails

Check your internet connection and try again.

### Whisper is slow

Use:

```bash
--model tiny
```

or:

```bash
--model base
```

### The video has no sound

The renderer intentionally replaces the source audio with the generated narration in v1.

### Subtitles look basic

That is intentional. v1 prioritizes a reliable pipeline. Animated, branded subtitles are part of the next rendering layer.

---

# 10. Git workflow

Initialize the repository:

```bash
git init
git add .
git commit -m "feat: initial Faceless Art Studio v1"
```

Suggested future commits:

```text
feat: add project configuration
feat: add voice generation
feat: add subtitle generation
feat: add vertical video renderer
feat: add subtitle styling
feat: add background music
feat: add web interface
```
