# 🎵 Cadence Studio (cATALYST)

> An intelligent, local-first songwriting studio and song deconstruction engine. Built with Tauri v2, React 19, Tone.js, Meta Demucs AI, and Librosa.

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue.svg)](https://tauri.app)
[![React 19](https://img.shields.io/badge/React-19.2-cyan.svg)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-teal.svg)](https://fastapi.tiangolo.com)
[![Demucs](https://img.shields.io/badge/Meta_AI-HTDemucs-purple.svg)](https://github.com/facebookresearch/demucs)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ⚡ Key Features

### 1. 🎼 Lyric & Harmonic Theory Studio
* **Diatonic 7th Chords**: Calculates diatonic chord sets across all 12 musical roots and 4 modes (Major, Minor, Dorian, Mixolydian) with one-click polyphonic auditioning.
* **Section Looper**: Create and edit Verse, Chorus, and Bridge blocks with syllable counters, chord lines, and progression loops.
* **Voice Scratchpad**: Record vocal ideas with your microphone directly into section cards.
* **Auto-Save**: Seamless state persistence backed by LocalStorage.

### 2. 🎛️ Arrangement Timeline & Multi-Track Studio
* **Scale-Quantized Wave Sculpting**: Draw melody curves with your mouse or touchscreen; notes snap in real time to the song's key and scale across octaves.
* **16-Step Drum Machine**: Program sub kicks, crisp snares, and closed hats.
* **6 Physical Instrument Models**: Switch between Acoustic Grand Piano, Nylon Guitar, Orchestral Strings, Woodwind Flute, Sub Bass, and Ambient Pad.
* **Real-Time DAW Controls**: Mute, Delete, and dynamically `+ Add Track` while audio is actively playing with zero interruptions.

### 3. 🧠 Song Blueprint & Deconstruction Engine
* **Krumhansl-Schmuckler Key Detection**: Analyzes audio chroma distribution to determine musical key and mode.
* **BPM & Beat Grid**: Extracts tempo and aligns 4/4 measure grids.
* **Bar-Snapped Segmentation**: Automatically delineates reference songs into `Intro`, `Verse 1`, `Chorus (The Drop)`, `Verse 2`, etc., and loads them into your studio with one click.

### 4. 🪓 AI Stem Isolation (Meta Demucs)
* Separates commercial reference tracks into isolated **Vocals** and **Instrumental** stems in the background.
* **Acoustic Waveform Visualizer**: Right-clicking any stem decodes the PCM audio in-browser and draws the real acoustic waveform across the timeline.

---

## 🏗️ System Architecture
[ User Upload / Inbox ]
│
├──► Local Python Backend (FastAPI / Port 8000)
│       ├── Meta HTDemucs AI (2-Stem & 4-Stem Separation)
│       ├── Librosa (BPM, Beat Grid, Chroma Key Profiling)
│       └── Streaming Media Server (HTTP Range / Partial Content)
│
└──► Native Desktop Client (Tauri v2 + React 19)
├── Tone.js & Web Audio API (Live Audio Synthesis)
├── Tonal.js (Music Theory Engine)
└── HTML5 Canvas & SVG Waveforms

---

## 🚀 Quick Start (Development)

### Prerequisites
* [Node.js](https://nodejs.org) (v20+)
* [Python](https://python.org) (3.11+) with `ffmpeg` installed

### 1. Clone the Repository
```bash
git clone [https://github.com/aadityach1804/cATALYST.git](https://github.com/aadityach1804/cATALYST.git)
cd cATALYST
