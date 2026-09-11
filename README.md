@'
# 🎵 Cadence Studio (cATALYST)

An intelligent, local-first songwriting studio and song deconstruction engine.
Built with **Tauri v2**, **React 19**, **Tone.js**, **Meta Demucs AI**, and **FastAPI**.

---

## 🌟 What This Software Does

* **🎼 Lyric & Chord Studio**:
  * 7th diatonic chords across all 12 roots and 4 modes (Major, Minor, Dorian, Mixolydian) with instant click-to-play synthesis.
  * Section cards (Verse, Chorus, Bridge) with syllable counters, chord lines, and progression looping.
  * Microphone vocal scratchpad recording directly into each section.

* **🎛️ Arrangement Timeline & Multi-Track Studio**:
  * Interactive wave-drawing canvas that pitch-quantizes melody curves to scale notes across octaves.
  * 16-step visual drum machine (Kick, Snare, Hi-Hat).
  * 6 physical instrument models: Grand Piano, Nylon Guitar, Orchestral Strings, Woodwind Flute, Sub Bass, and Ambient Pad.
  * Real-time DAW controls: Mute, Delete, and `+ Add Track` while audio is actively playing without stopping.

* **🧠 Song Blueprint & Deconstruction Engine**:
  * Automatic Key, BPM, and beat tracking using Librosa and Chroma STFT.
  * Structural song segmentation mapping reference tracks into bar-snapped Intro, Verse, and Chorus blocks.

* **🪓 AI Stem Isolation (Meta Demucs)**:
  * Separates reference tracks into isolated Vocals and Instrumental stems in the background.
  * In-browser audio decoding to visualize real acoustic waveforms on timeline lanes.

---

## 📁 Directory Structure

* `main_directory/00_Inbox_New_Songs/` — Drop incoming songs here.
* `main_directory/01_Vocal_Stem_Splits/` — AI separated stems (Vocals & Instrumental).
* `main_directory/02_Instrument_Samples/` — Sliced audio samples.
* `main_directory/05_Blueprints/` — Saved timeline arrangement JSON files.

---

## 🚀 Development Quick Start

```bash
# 1. Start Python Backend
python backend/server.py

# 2. Start Desktop App
npx tauri dev
