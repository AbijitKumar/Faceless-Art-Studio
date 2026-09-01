# Faceless Art Studio

> **AI-powered faceless short-video generation platform — from script to finished vertical video.**

Faceless Art Studio is a modular video-generation application that transforms a written script and a source video into a finished **9:16 faceless video** with AI-generated narration and synchronized animated captions.

The project began as a terminal-first Python media pipeline and has now evolved into a working web-based Video Editor while keeping the original processing pipeline intact.

---

## Current Version

**v1.3.0 — Video Generator + Web Video Editor**

This release introduces the first complete web-based video-generation workflow.

### Current pipeline

```text
                 ┌─────────────────────┐
                 │      User Script     │
                 │ Text / .txt Upload   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Project Settings  │
                 │                     │
                 │ • Project name      │
                 │ • AI voice          │
                 │ • Caption style     │
                 │ • Caption position  │
                 │ • Caption size      │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Source Video Pool   │
                 │      input/         │
                 │                     │
                 │ Random video        │
                 │ selection           │
                 └──────────┬──────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │     AI Text-to-Speech    │
              │        Edge TTS          │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │     Voice-over WAV      │
              │   PCM 16-bit / 44.1kHz  │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │    Faster-Whisper        │
              │ Word-level timestamps    │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │ Animated Caption Engine  │
              │                          │
              │ • Phrase grouping        │
              │ • Exact timestamps       │
              │ • Configurable size      │
              │ • Multiple presets       │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │       FFmpeg             │
              │                          │
              │ • 9:16 conversion        │
              │ • Center crop            │
              │ • Audio replacement      │
              │ • Caption burn-in        │
              │ • Duration synchronization│
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │      Final MP4 Video     │
              │      1080 × 1920         │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │      My Projects         │
              │                          │
              │ • Preview                │
              │ • Project metadata       │
              │ • Download               │
              │ • Project naming         │
              └──────────────────────────┘
```

---

# 🚀 Features

## Video Generation

* Generate videos directly from written scripts.
* Enter scripts directly into the Video Editor.
* Drag and drop `.txt` files into the editor.
* Automatically select a random source video from `input/`.
* Roll another random source video before generation.
* Generate natural AI narration using Edge TTS.
* Automatically transcribe the generated narration with Faster-Whisper.
* Generate synchronized captions from Whisper timestamps.
* Burn captions directly into the final video.
* Replace the source video's audio with the generated narration.
* Automatically mute source-video audio.
* Automatically synchronize video duration with narration duration.
* Loop shorter source videos when necessary.
* Trim longer source videos when necessary.
* Export vertical 9:16 videos at 1080×1920.

---

# AI Voice Generation

Faceless Art Studio uses **Edge TTS** for AI voice generation.

The application can dynamically retrieve available voices and allows the user to select a voice from the Video Editor.

Default voice:

```text
en-US-AriaNeural
```

Example CLI usage:

```bash
python main.py --text "Hello world." --video input/video.mp4
```

Specify a voice:

```bash
python main.py --text "Hello world." --video input/video.mp4 --voice en-US-GuyNeural
```

List available voices:

```bash
python main.py --list-voices
```

### Audio pipeline

Generated Edge TTS audio is converted into a standard PCM WAV format:

```text
PCM 16-bit
44.1 kHz
Stereo
```

The final MP4 contains the generated narration as its primary audio stream.

The original source-video audio is intentionally excluded from the final render.

---

# Intelligent Captions

Captions are generated from the actual generated voice-over rather than simply displaying the original script.

The workflow is:

```text
AI Voice
   ↓
Faster-Whisper
   ↓
Word-level timestamps
   ↓
Caption phrase grouping
   ↓
ASS subtitle generation
   ↓
FFmpeg burn-in
```

This allows captions to follow the actual spoken timing.

### Caption capabilities

* Word-level timing
* Short phrase grouping
* Multiple caption presets
* Caption positioning
* Configurable caption size
* Live caption preview
* Burned-in captions
* Millisecond-level timing based on Whisper timestamps

Current caption presets include:

```text
Bold Yellow
Neon Cyan
Studio Blue
Classic White
Minimal Gray
Karaoke Blue
```

Available positions:

```text
Top
Center
Bottom
```

Caption size can be adjusted from:

```text
50% → 200%
```

---

# Video Processing

FFmpeg is responsible for the final media-processing stage.

Source videos are converted into:

```text
1080 × 1920
9:16
```

The source video is scaled to fill the vertical canvas and center-cropped when necessary.

The generated narration determines the final duration.

### Duration behavior

If:

```text
Source video < narration
```

the source video is looped until the narration finishes.

If:

```text
Source video > narration
```

the source video is trimmed to the narration duration.

The final result therefore remains synchronized with the generated voice.

---

# Web Video Editor

The v1.3.0 release introduces a complete working browser-based Video Editor.

Start the application locally and open the web interface to access the editor.

### Editor workflow

```text
1. Enter or upload script
        ↓
2. Name the project
        ↓
3. Select AI voice
        ↓
4. Configure captions
        ↓
5. Select / randomize source video
        ↓
6. Generate video
        ↓
7. Monitor rendering progress
        ↓
8. Preview finished video
        ↓
9. Save project
        ↓
10. Download MP4
```

---

# Project Management

Generated videos are tracked inside **My Projects**.

Each generated project can contain metadata including:

* Project name
* Source video
* Generation status
* Duration
* Resolution
* Aspect ratio
* Generated video
* Voice-over
* Subtitle file

Projects can be opened from the application and completed videos can be downloaded.

The internal job ID is used for backend storage and tracking, while the user's project name is used for the downloaded filename.

For example:

```text
Project name:
My First AI Reel

Downloaded file:
My First AI Reel.mp4
```

---

# Project Structure

```text
Faceless-Art-Studio-v1/
│
├── main.py
├── server.py
├── requirements.txt
├── README.md
├── .gitignore
├── LICENSE
│
├── input/
│   ├── .gitkeep
│   ├── Input1.mp4
│   ├── Input2.mp4
│   └── ...
│
├── output/
│   ├── voiceovers/
│   ├── subtitles/
│   └── videos/
│
├── assets/
│
├── docs/
│   └── ROADMAP.md
│
├── src/
│   ├── __init__.py
│   │
│   ├── pipeline.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── tts.py
│   │   ├── subtitles.py
│   │   ├── caption.py
│   │   └── video.py
│   │
│   └── utils/
│       ├── __init__.py
│       ├── files.py
│       └── ffmpeg.py
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── EditorPage.tsx
        ├── editorApi.ts
        ├── projectStore.ts
        └── styles.css
```

---

# Architecture

Faceless Art Studio is designed around a shared media-processing core.

```text
                 Web UI
                   │
                   ▼
              server.py
                   │
                   ▼
             pipeline.py
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
      TTS       Whisper     Captions
        │          │          │
        └──────────┼──────────┘
                   ▼
                FFmpeg
                   │
                   ▼
              Final MP4
```

The terminal application and web application use the same core processing pipeline.

This avoids maintaining separate implementations for CLI and web-based generation.

---

# Backend API

The local backend runs on:

```text
http://127.0.0.1:8000
```

The frontend communicates with the backend through the API.

## Available endpoints

### Get available voices

```http
GET /api/voices
```

### List source videos

```http
GET /api/input-files
```

### Select a random source video

```http
GET /api/random-input
```

### Start video generation

```http
POST /api/generate
```

### Check generation status

```http
GET /api/jobs/{job_id}
```

### Download generated video

```http
GET /api/download/{filename}
```

The download endpoint supports the project title as the user-facing filename while retaining the internal job ID for backend storage.

---

# Technology Stack

## Backend

| Technology     | Purpose                                 |
| -------------- | --------------------------------------- |
| Python         | Core application and pipeline           |
| aiohttp        | Lightweight asynchronous API server     |
| edge-tts       | AI text-to-speech                       |
| faster-whisper | Local speech recognition and timestamps |
| pysubs2        | Subtitle / ASS generation               |
| FFmpeg         | Video and audio processing              |
| pathlib        | File management                         |
| subprocess     | External media-process execution        |
| argparse       | CLI interface                           |

## Frontend

| Technology | Purpose                             |
| ---------- | ----------------------------------- |
| React      | User interface                      |
| TypeScript | Type-safe frontend development      |
| Vite       | Development server and build system |
| CSS        | UI styling and responsive layout    |

---

# Requirements

## Python

Recommended:

```text
Python 3.11 or 3.12
```

Python 3.10+ should generally work.

## Node.js

The frontend requires a modern Node.js installation with npm.

Verify:

```bash
node --version
npm --version
```

## FFmpeg

Verify:

```bash
ffmpeg -version
```

FFmpeg must be available through the system PATH.

---

# Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd Faceless-Art-Studio-v1
```

Create a Python virtual environment.

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

---

# Running the Web Application

The web application uses two local processes.

## Terminal 1 — Backend

From the project root:

```bash
.\venv\Scripts\python server.py
```

The backend should start at:

```text
http://127.0.0.1:8000
```

## Terminal 2 — Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Vite will display the local development URL, normally:

```text
http://localhost:5173/
```

If that port is already occupied, Vite may automatically select another available port.

Open the displayed URL in your browser.

---

# Running the Original CLI Pipeline

The original terminal workflow remains available.

Place a source video inside:

```text
input/
```

Then run:

```bash
python main.py --text "Your paragraph goes here." --video input/myvideo.mp4
```

Or:

```bash
python main.py --text-file input/script.txt --video input/myvideo.mp4
```

The output is stored in:

```text
output/
├── voiceovers/
│   └── <job_id>.wav
├── subtitles/
│   └── <job_id>.srt
└── videos/
    └── <job_id>.mp4
```

---

# Example CLI Workflow

```bash
python main.py \
  --text-file input/script.txt \
  --video input/Input1.mp4 \
  --voice en-US-AriaNeural \
  --model small
```

The pipeline performs:

```text
Script
  ↓
Edge TTS
  ↓
Voice-over WAV
  ↓
Faster-Whisper
  ↓
SRT / caption timing
  ↓
FFmpeg
  ↓
Vertical MP4
```

---

# Audio Design

The final generated video intentionally does not retain the source video's original audio.

Instead:

```text
Source video
     │
     └── Video frames only
                │
                ▼
Generated AI voice ───────► Final MP4 audio
```

This prevents the background video's original dialogue or music from competing with the generated narration.

The editor's source-video preview is muted by default.

Once generation is complete, the generated MP4 can be previewed with its AI narration.

---

# Verification

The v1.3.0 implementation has been tested through both the terminal pipeline and the web API.

Verified areas include:

* Frontend production build
* TypeScript compilation
* API generation
* Random input-video selection
* Edge TTS voice generation
* PCM WAV generation
* Faster-Whisper transcription
* Word-level timestamps
* Caption generation
* Caption burn-in
* Caption size scaling
* Audio stream replacement
* Source audio exclusion
* Narration-duration synchronization
* 1080×1920 output
* 9:16 aspect ratio
* Project naming
* Download filename handling
* Video download endpoint
* My Projects integration

Example verified output characteristics:

```text
Resolution:       1080 × 1920
Aspect ratio:     9:16
Audio:            AAC
Sample rate:      44.1 kHz
Channels:         Stereo
Video format:     MP4
```

---

# 🛠️ Troubleshooting

## FFmpeg is not recognized

If:

```bash
ffmpeg -version
```

fails, install FFmpeg and make sure its `bin` directory is included in PATH.

---

## TTS generation fails

Edge TTS requires an internet connection.

Check your connection and try again.

---

## Whisper transcription is slow

Smaller models are faster.

Try:

```bash
--model tiny
```

or:

```bash
--model base
```

Larger models generally provide better transcription quality at the cost of processing time.

---

## Port 8000 is already in use

This normally means another backend instance is already running.

Do not start a second backend process on the same port.

Check which process is using port 8000 on Windows:

```powershell
Get-NetTCPConnection -LocalPort 8000
```

---

## Port 5173 is already in use

Vite automatically attempts another available port.

For example:

```text
5173 → 5174
```

Use the URL printed by Vite.

---

## Source video has no audio in the final output

This is intentional.

The final video uses the generated AI narration instead of the source video's original audio.

---

## Captions appear incorrectly

Caption timing is generated from the generated voice using Faster-Whisper.

If timing problems occur, verify that the generated voice-over itself is valid and that the selected Whisper model completed successfully.

---

# Output & Git Hygiene

Generated media can become large very quickly.

The repository should not normally contain generated:

```text
output/videos/*.mp4
output/voiceovers/*.wav
output/subtitles/*.srt
```

unless a specific test asset is intentionally being tracked.

Use `.gitignore` to keep generated files out of Git.

Source videos placed in `input/` should also generally remain local unless they are intentionally included in the repository.

---

# Version History

## v1.3.0 — Video Generator + Web Editor

Major milestone.

### Added

* Working web-based Video Editor
* Script text input
* `.txt` drag-and-drop upload
* Random source-video selection
* Project naming
* Edge TTS voice selection
* Faster-Whisper transcription
* Synchronized captions
* Caption presets
* Caption position controls
* Caption size slider
* Real-time generation progress
* Generated-video preview
* My Projects integration
* Video downloads
* User-friendly download filenames
* Collapsible icon sidebar
* Improved project menus
* Shared CLI/API processing pipeline
* Source-audio removal
* Narration-duration-based video trimming/looping

### Verification

```text
Frontend build:       PASS
API generation:       PASS
CLI generation:       PASS
Voice generation:     PASS
Caption generation:   PASS
Caption burn-in:      PASS
Audio replacement:    PASS
Duration sync:        PASS
Download endpoint:    PASS
```

---

# Roadmap

The project is intentionally being developed incrementally.

## Completed

### v1.0.0

* Terminal-first video-generation pipeline
* Edge TTS
* Faster-Whisper
* SRT generation
* FFmpeg rendering
* Vertical 9:16 output

### v1.3.0

* Web Video Editor
* Script upload
* Random source-video selection
* AI voice selection
* Animated captions
* Caption customization
* Project management
* Video preview
* Download system
* API backend
* Responsive editor layout

---

## Planned

### Rendering & Editing

* Advanced caption animations
* Per-word highlighting
* Caption animation presets
* Background music
* Sound effects
* Volume controls
* Video speed controls
* More video transitions
* Scene segmentation
* B-roll support
* Multiple source clips
* Timeline editing

### AI Features

* AI script generation
* Script rewriting
* Automatic scene generation
* Automatic B-roll selection
* Content summarization
* Hook generation
* Voice recommendations
* Automatic caption styling
* Content-specific visual selection

### Platform Features

* User authentication
* Cloud project storage
* Rendering queue
* Batch generation
* Project duplication
* Project version history
* Cloud rendering
* GPU acceleration
* Social-media export presets
* Analytics

Potential export presets:

```text
YouTube Shorts
Instagram Reels
TikTok
```

---

# Development Philosophy

Faceless Art Studio is being developed as a modular system rather than a single monolithic application.

The core principle is:

```text
Stable media pipeline
        +
Replaceable interface
        +
Incremental AI features
```

The current architecture allows the frontend to evolve without rewriting the underlying video-generation engine.

Future architecture can therefore grow toward:

```text
                    ┌───────────────┐
                    │ Web / Desktop │
                    │    Clients    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   API Layer   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Job / Queue   │
                    │   Manager     │
                    └───────┬───────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Rendering Engine  │
                  └─────────┬─────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
          TTS Engine     Whisper       FFmpeg
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                     Final Video
```

---

# Contributing

Development is currently focused on building the core product incrementally.

Before submitting changes:

1. Keep the media pipeline modular.
2. Avoid duplicating processing logic between CLI and API.
3. Test video generation with a real input video.
4. Verify generated audio.
5. Verify caption synchronization.
6. Verify final video duration.
7. Run the frontend production build.
8. Keep generated media out of Git unless intentionally required.

Frontend verification:

```bash
cd frontend
npm run build
```

Backend verification should include a real generation test whenever media-processing code is modified.

---

# License

See the `LICENSE` file included in this repository.

---

#  Project Status

**Current status: Active development**

Faceless Art Studio has progressed from a terminal-based prototype into a functional local video-generation platform.

The current priority is improving the rendering engine and editor experience while maintaining a reliable, testable media pipeline underneath.

```text
v1.0.0
Terminal Pipeline
      │
      ▼
v1.3.0
Web Video Generator
      │
      ▼
Future
AI-powered Video Creation Platform
```

---

> **Faceless Art Studio — Script it. Voice it. Caption it. Render it.**
