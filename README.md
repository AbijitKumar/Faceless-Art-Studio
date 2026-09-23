# Faceless Art Studio

> **AI-powered faceless short-video creation — from script to finished vertical video.**

Faceless Art Studio is a local-first AI video creation platform designed to turn written scripts into polished **9:16 short-form videos** with AI narration, synchronized captions, source-video processing, and an integrated web editor.

The project started as a terminal-based Python media pipeline and has evolved into a full browser-based video creation application while preserving the underlying media-processing architecture.

---

## Highlights

* AI-powered vertical video generation
* Script input and `.txt` upload
* AI voice generation with Edge TTS
* Faster-Whisper transcription
* Timestamp-synchronized captions
* Multiple caption presets and positioning options
* 9:16 / 1080×1920 video output
* Automatic source-video selection and looping
* Automatic source-audio replacement
* My Projects
* Reusable video Templates
* Local Media Library
* Supabase authentication foundation
* Application Settings
* Built-in Help and bug-report workflow
* React + TypeScript web interface
* Python media-processing backend
* FFmpeg-based rendering pipeline

---

# Current Release

## v1.7.0 — Pre-v2 Product Milestone

This release represents the current **v1.x development milestone** before the planned `v2.0.0` completed application release.

The application has progressed substantially beyond the original terminal pipeline and now includes a browser-based editing experience, project management, templates, media management, authentication infrastructure, settings, and help functionality.

> **v2.0.0 is planned as the completed application milestone.**

---

# Core Workflow

```text
                    ┌─────────────────────┐
                    │       Script        │
                    │ Text / .txt Upload  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Project Settings  │
                    │                     │
                    │ • Project name      │
                    │ • AI voice          │
                    │ • Captions          │
                    │ • Caption position  │
                    │ • Caption size      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Source Video      │
                    │   Selection / Roll  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Edge TTS       │
                    │   AI Voiceover      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Faster-Whisper    │
                    │ Word-level Timing   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Caption Engine    │
                    │                     │
                    │ • Phrase grouping   │
                    │ • Timing            │
                    │ • Presets           │
                    │ • Position          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       FFmpeg        │
                    │                     │
                    │ • 9:16 conversion   │
                    │ • Crop / scale      │
                    │ • Audio replacement │
                    │ • Caption burn-in   │
                    │ • Duration sync    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Final MP4       │
                    │    1080 × 1920      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    My Projects      │
                    │ Preview / Download  │
                    └─────────────────────┘
```

---

# Features

## Video Generation

Faceless Art Studio can generate a complete short-form video from a written script.

### Script

* Enter a script directly in the editor
* Upload `.txt` scripts
* Configure project names
* Preserve the current editor draft while authentication is completed

### Source Video

* Select videos from the local `input/` directory
* Randomly select a source video
* Roll another source video before generation
* Automatically loop shorter source videos
* Automatically trim longer source videos

### AI Narration

The application uses **Edge TTS** to generate AI narration.

The selected voice is converted into a WAV voiceover before entering the transcription and rendering stages.

### Captions

Captions are generated from the **actual generated narration**, rather than simply displaying the original script.

```text
AI Voice
   ↓
Faster-Whisper
   ↓
Word-level timestamps
   ↓
Phrase grouping
   ↓
ASS subtitles
   ↓
FFmpeg burn-in
```

This allows caption timing to follow the generated speech.

Current caption functionality includes:

* Word-level timing
* Phrase grouping
* Multiple presets
* Caption positioning
* Caption size adjustment
* Live preview
* Burned-in captions

---

# Video Templates

The Templates section provides reusable starting points for video creation.

Features include:

* Template browsing
* Search
* Filtering
* Sorting
* Favorites
* Template preview
* Use Template workflow

Templates are designed to provide a faster starting point without replacing the underlying generation pipeline.

---

# Media Library

The Media Library provides a centralized interface for locally available project media.

It supports:

* Browsing local media
* Search
* Filtering
* Sorting
* Grid/list views
* Media preview
* Download
* Import/upload
* Using media in the editor
* Filename/path copying
* Storage usage information

The current Media Library is **local-first** and does not represent cloud media storage.

---

# My Projects

Generated projects can be managed through the My Projects interface.

Project information can include:

* Project name
* Source video
* Generation status
* Duration
* Resolution
* Aspect ratio
* Generated video
* Voiceover
* Subtitle information

Completed videos can be previewed and downloaded from the application.

The current project system remains local-first.

---

# Authentication

Faceless Art Studio uses **Supabase Auth** as the authentication foundation.

The application supports the authentication architecture for:

* Email/password authentication
* Email OTP
* Phone OTP
* Password reset
* Google OAuth
* GitHub OAuth
* Email verification
* Persistent sessions
* User profile information

Authentication-sensitive video generation is protected by the backend rather than relying only on frontend UI checks.

### Important

The authentication system requires a configured Supabase project and environment variables.

Provider availability also depends on the corresponding provider being configured in Supabase.

The current release should be considered the authentication foundation leading into the completed `v2.0.0` release.

---

# Settings

The application includes a dedicated Settings area for user and application preferences.

Current settings architecture includes:

* Account information
* Profile information
* Appearance
* Preferences
* Notification preferences
* Application information
* Current application version
* Repository information

Settings are designed to remain lightweight and avoid exposing low-level rendering controls that belong to the media-processing pipeline.

---

# Help

Faceless Art Studio includes an integrated Help section containing:

### About

An overview of the application and its major areas.

### Video Creation

A visual explanation of the complete generation workflow:

```text
Write / Enter Script
        ↓
Choose Source Video
        ↓
Choose Voice
        ↓
Configure Captions
        ↓
Generate Video
        ↓
Processing
        ↓
Preview
        ↓
Download / Save Project
```

### Report a Bug

Users can report problems with information such as:

* What happened
* Expected behavior
* Page or feature used
* Steps to reproduce
* Screenshot, if available

---

# Media Processing Pipeline

The core rendering architecture is shared between the application interfaces.

```text
                    Web Interface
                         │
                         ▼
                      server.py
                         │
                         ▼
                     Pipeline
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
           TTS        Whisper      Captions
             │           │           │
             └───────────┼───────────┘
                         ▼
                       FFmpeg
                         │
                         ▼
                     Final MP4
```

The architecture keeps the media-processing layer separate from the frontend interface.

---

# Audio Design

The generated video's primary audio is the AI-generated narration.

```text
Source Video
     │
     └── Video Frames
             │
             ▼
      ┌──────────────┐
      │ Final Render │
      └──────────────┘
             ▲
             │
      AI Voiceover
```

The original source-video audio is intentionally excluded from the generated result.

This prevents existing dialogue or background audio from competing with the generated narration.

---

# Output Format

Generated videos are designed for short-form vertical platforms.

| Property     | Output                    |
| ------------ | ------------------------- |
| Resolution   | 1080 × 1920               |
| Aspect Ratio | 9:16                      |
| Container    | MP4                       |
| Audio        | Generated narration       |
| Captions     | Burned into video         |
| Duration     | Synchronized to narration |

---

# Technology Stack

## Backend

| Technology     | Purpose                           |
| -------------- | --------------------------------- |
| Python         | Application and media pipeline    |
| aiohttp        | Backend API                       |
| Edge TTS       | AI text-to-speech                 |
| Faster-Whisper | Speech recognition and timestamps |
| pysubs2        | Subtitle / ASS generation         |
| FFmpeg         | Video and audio processing        |
| pathlib        | File management                   |
| subprocess     | Media-process execution           |

## Frontend

| Technology  | Purpose                    |
| ----------- | -------------------------- |
| React       | User interface             |
| TypeScript  | Type-safe frontend         |
| Vite        | Frontend build system      |
| CSS         | UI and responsive styling  |
| Supabase JS | Authentication integration |

---

# Project Structure

```text
Faceless-Art-Studio/
│
├── main.py
├── server.py
├── requirements.txt
├── README.md
├── .gitignore
├── LICENSE
│
├── input/
│
├── output/
│   ├── voiceovers/
│   ├── subtitles/
│   └── videos/
│
├── assets/
│
├── docs/
│
├── src/
│   ├── __init__.py
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
        ├── TemplatesPage.tsx
        ├── MediaLibraryPage.tsx
        ├── LoginPage.tsx
        ├── SignUpPage.tsx
        ├── SettingsPage.tsx
        ├── HelpPage.tsx
        └── ...
```

---

# Requirements

### Python

Recommended:

```text
Python 3.11+
```

### Node.js

A modern Node.js installation with npm is required.

Verify:

```bash
node --version
npm --version
```

### FFmpeg

FFmpeg must be installed and available through the system PATH.

Verify:

```bash
ffmpeg -version
```

---

# Installation

Clone the repository:

```bash
git clone https://github.com/AbijitKumar/Faceless-Art-Studio.git
cd Faceless-Art-Studio
```

Create and activate a Python virtual environment.

### Windows

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install backend dependencies:

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

# Supabase Configuration

Authentication requires a Supabase project.

Create environment files using the project's environment variable examples.

Frontend variables include:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Backend variables include:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Do **not** commit environment files or Supabase secrets to Git.

Provider-specific authentication such as Google, GitHub, email delivery, and phone SMS also requires the corresponding configuration inside Supabase.

---

# Running the Application

The application uses a local backend and frontend development server.

## Terminal 1 — Backend

From the project root:

```powershell
.\.venv\Scripts\python server.py
```

The backend normally runs at:

```text
http://127.0.0.1:8000
```

## Terminal 2 — Frontend

```powershell
cd frontend
npm run dev
```

Vite normally provides:

```text
http://localhost:5173/
```

Open the URL displayed by Vite.

---

# Backend API

The local backend exposes API routes used by the frontend.

Important routes include:

```text
GET  /api/voices
GET  /api/input-files
GET  /api/random-input

POST /api/generate
GET  /api/jobs/{job_id}
GET  /api/download/{filename}

GET  /api/media
POST /api/upload
```

Authentication-sensitive operations are handled by the backend authentication layer.

---

# Verification

Before releasing changes, verify the application with:

### Frontend

```bash
cd frontend
npm run build
```

### Backend

```bash
python -m py_compile server.py
```

For media-processing changes, perform a real generation test with a valid source video.

Recommended verification areas:

* Frontend production build
* Authentication flow
* Email verification
* Login/logout
* Password reset
* Video generation authorization
* Script processing
* Edge TTS generation
* Faster-Whisper transcription
* Caption timing
* Caption rendering
* Audio replacement
* Duration synchronization
* 1080×1920 output
* Video preview
* Project creation
* Download
* Templates
* Media Library

---

# Git & Output Hygiene

Generated media should normally remain outside Git.

```text
output/videos/*.mp4
output/voiceovers/*.wav
output/subtitles/*.srt
```

Local source videos inside `input/` should also normally remain untracked unless they are intentionally included as project assets.

Never commit:

```text
.env
.env.local
frontend/.env
frontend/.env.local
```

or any other file containing private credentials.

---

# Roadmap

## v1.x — Foundation

Completed milestones include:

* Terminal media pipeline
* Edge TTS
* Faster-Whisper
* FFmpeg rendering
* Web Video Editor
* Script input
* AI voice selection
* Caption customization
* Project management
* Video preview
* Video downloads
* Templates
* Media Library
* Settings
* Help
* Supabase authentication foundation

---

# v2.0.0 — Completed Application

`v2.0.0` is planned as the major completed-application milestone.

Potential areas for the v2 release include:

### Video Creation

* Advanced caption animation
* Per-word highlighting
* More caption animation presets
* Background music
* Sound effects
* Volume controls
* Video speed controls
* Transitions
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

* More complete authentication
* Cloud project storage
* Rendering queue
* Batch generation
* Project duplication
* Project version history
* Cloud rendering
* GPU acceleration
* Social-media export presets
* Analytics

Potential export targets:

```text
YouTube Shorts
Instagram Reels
TikTok
```

The exact v2 scope will be determined as development progresses.

---

# Development Philosophy

Faceless Art Studio is being developed as a modular application rather than a monolithic media editor.

The core principle is:

```text
Stable Media Pipeline
        +
Replaceable Interface
        +
Incremental AI Features
```

The frontend can evolve independently while the underlying media-processing engine remains reusable.

---

# Contributing

Development is currently focused on completing the core application.

Before submitting changes:

1. Keep the media pipeline modular.
2. Avoid duplicating processing logic.
3. Test real video generation when media-processing code changes.
4. Verify generated audio.
5. Verify caption synchronization.
6. Verify final video duration.
7. Run the frontend production build.
8. Keep generated media and secrets out of Git.
9. Avoid unrelated changes to existing working features.

Frontend verification:

```bash
cd frontend
npm run build
```

---

# License

See the [`LICENSE`](LICENSE) file included in the repository.

---

# Project Status

**Status: Active Development — v1.7.0**

Faceless Art Studio has evolved from a terminal-based video-generation experiment into a local-first AI video creation platform with a browser-based editor and supporting application infrastructure.

```text
v1.0.0
Terminal Pipeline
      │
      ▼
v1.3.0
Web Video Editor
      │
      ▼
v1.5.0
Templates
      │
      ▼
v1.6.0
Media Library
      │
      ▼
v1.7.0
Pre-v2 Product Milestone
      │
      ▼
v2.0.0
Completed Application
```

---

> **Faceless Art Studio**
>
> **Script it. Voice it. Caption it. Render it.**
