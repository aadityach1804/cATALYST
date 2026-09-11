# 🎵 Cadence Studio

> **An intelligent, local-first songwriting studio and song deconstruction engine.**

Cadence Studio is a desktop music creation and analysis environment built for songwriters, producers, and creators who want to **write, arrange, analyze, and deconstruct music locally**.

Built with **Tauri v2 · React 19 · Tone.js · Meta Demucs · FastAPI · Librosa**

---

## ✨ Features

### 🎼 Lyric & Chord Studio

Write lyrics and experiment with harmonic ideas in real time.

* 🎹 Calculate **7th diatonic chords** for any:

  * Major
  * Minor
  * Dorian
  * Mixolydian
* 🔊 Instantly preview chords with click-to-play audio
* 📝 Section-based songwriting workspace:

  * Verse
  * Chorus
  * Bridge
  * Outro
* 🔢 Automatic **syllable counting**
* 🎸 Dedicated chord lines for every section
* 🔁 Loop chord progressions
* 🎙️ Record **vocal scratch ideas directly inside each section**

---

### 🎛️ Arrangement Timeline & Multi-Track Studio

Turn musical ideas into a complete arrangement.

* 🌊 Interactive waveform/melody canvas
* 🎵 Draw melody curves directly on the timeline
* 🎯 Automatic snapping to scale notes
* 🎚️ Multi-octave melody editing
* 🥁 Built-in **16-step drum machine**

  * Kick
  * Snare
  * Hi-Hat
* 🎹 Six built-in instruments:

| Instrument            | Role               |
| --------------------- | ------------------ |
| 🎹 Grand Piano        | Harmonic / melodic |
| 🎸 Nylon Guitar       | Acoustic harmony   |
| 🎻 Orchestral Strings | Pads / arrangement |
| 🪈 Woodwind Flute     | Lead / melody      |
| 🔊 Sub Bass           | Low-end            |
| 🌌 Ambient Pad        | Atmosphere         |

### ⚡ Real-Time Track Controls

Tracks can be modified while playback is running.

* 🔇 Mute tracks
* 🗑️ Delete tracks
* ➕ Add new tracks
* ▶️ Continue playback without restarting the arrangement

---

## 🧠 Song Blueprint & Deconstruction Engine

Analyze reference songs and automatically extract their musical structure.

Cadence Studio uses **Librosa** and **Chroma STFT** analysis to detect:

* 🎼 Musical key
* 🕐 BPM
* 🥁 Beat positions
* 📏 Bar structure
* 🧩 Song sections

Reference tracks can be automatically segmented into structures such as:

```text
Intro
Verse 1
Chorus
Verse 2
Chorus
Outro
```

Each section includes its corresponding **bar count**, giving you a structural blueprint that can be used as a reference while writing your own arrangement.

---

## 🪓 AI Stem Isolation

Cadence Studio integrates **Meta Demucs** for local AI-powered audio separation.

Reference songs can be separated into:

```text
🎙️ Vocals
🎛️ Instrumental
```

The stems are processed **locally on your computer**, allowing them to be used for analysis and arrangement workflows without requiring an external cloud service.

Audio waveforms are decoded directly in the browser and displayed across the timeline for visual analysis.

---

# 🏗️ Architecture

Cadence Studio combines a native desktop shell, web-based UI, real-time audio engine, and Python-based AI/audio-processing backend.

```text
┌──────────────────────────────────────────────┐
│                 Cadence Studio               │
├──────────────────────────────────────────────┤
│                                              │
│  React 19 UI                                 │
│      │                                       │
│      ├── Lyric & Chord Studio                │
│      ├── Arrangement Timeline                │
│      ├── Multi-Track Studio                  │
│      └── Song Blueprint UI                   │
│                                              │
│                │                             │
│                ▼                             │
│          Tauri v2 Desktop                   │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  Tone.js                                     │
│      └── Real-time audio & instruments       │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  FastAPI + Python                            │
│      ├── Librosa                             │
│      ├── Chroma STFT                         │
│      └── Meta Demucs                         │
│                                              │
└──────────────────────────────────────────────┘
```

---

# 📁 Project Audio Structure

Cadence Studio organizes audio assets using a dedicated folder structure:

```text
Cadence Studio/
│
├── 00_Inbox_New_Songs/
│   └── Reference songs
│
├── 01_Vocal_Stem_Splits/
│   ├── Vocals
│   └── Instrumental
│
├── 02_Instrument_Samples/
│   └── Exported audio clips
│
└── 05_Blueprints/
    └── Arrangement timeline JSON files
```

### Folder Purpose

| Folder                   | Purpose                                 |
| ------------------------ | --------------------------------------- |
| `00_Inbox_New_Songs/`    | Drop commercial/reference songs here    |
| `01_Vocal_Stem_Splits/`  | AI-generated vocal & instrumental stems |
| `02_Instrument_Samples/` | Exported audio sample clips             |
| `05_Blueprints/`         | Saved arrangement timeline JSON files   |

---

# 🛠️ Tech Stack

| Technology      | Purpose                              |
| --------------- | ------------------------------------ |
| **Tauri v2**    | Native desktop application           |
| **React 19**    | User interface                       |
| **Tone.js**     | Real-time audio synthesis & playback |
| **FastAPI**     | Python backend API                   |
| **Python**      | Audio analysis & AI processing       |
| **Librosa**     | Music/audio analysis                 |
| **Chroma STFT** | Harmonic/key analysis                |
| **Meta Demucs** | AI stem separation                   |

---

# 🚀 Getting Started

## Prerequisites

Make sure you have the required development tools installed:

* Node.js
* npm
* Python
* Rust / Cargo
* Tauri v2 prerequisites

---

## 1. Start the Python Backend

From the project root:

```bash
python backend/server.py
```

Keep the backend running while developing the desktop application.

---

## 2. Start the Desktop App

In another terminal:

```bash
npx tauri dev
```

The Tauri development application should launch automatically.

---

# 📦 Build the Windows Installer

To create a standalone Windows installer:

```bash
npx tauri build
```

The generated installer will be located at:

```text
src-tauri/target/release/bundle/nsis/
```

Typically:

```text
Cadence Studio_0.1.0_x64-setup.exe
```

---

# 🎯 Typical Workflow

A typical Cadence Studio workflow looks like this:

```text
       Reference Song
             │
             ▼
   ┌───────────────────┐
   │  AI Stem Isolation │
   │    Meta Demucs     │
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │ Song Deconstruction│
   │  Key · BPM · Beats │
   │   Song Structure   │
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │  Song Blueprint    │
   │ Intro · Verse ·    │
   │ Chorus · Bridge... │
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │   Songwriting      │
   │ Lyrics · Chords    │
   │ Melody · Harmony   │
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │    Arrangement     │
   │ Drums · Instruments│
   │ Tracks · Timeline  │
   └───────────────────┘
```

---

# 🧪 Development

Cadence Studio is currently being developed as a local-first desktop music creation environment.

The architecture is designed around:

* **Local processing**
* **Interactive audio**
* **AI-assisted analysis**
* **Non-destructive arrangement workflows**
* **Fast experimentation**

---

# 📜 Development History

For the complete technical architecture, implementation decisions, debugging history, and engineering record, see:

**Cadence Studio Development Transcript**

---

# 📄 License

This project is licensed under the **MIT License**.

---

## 🎵 Cadence Studio

**Write it. Analyze it. Arrange it.**

> Turn musical ideas and reference tracks into structured, playable arrangements.
