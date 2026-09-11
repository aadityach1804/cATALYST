# 🎵 Cadence Studio

An intelligent, local-first songwriting studio and song deconstruction engine.

Built with **Tauri v2**, **React 19**, **Tone.js**, **Meta Demucs AI**, and **FastAPI**.

---

## 🌟 What This Software Does

* **🎼 Lyric & Chord Studio**:
  * Calculates 7th diatonic chords in any Key and Mode (Major, Minor, Dorian, Mixolydian) with instant click-to-play sound.
  * Section cards (Verse, Chorus, Bridge) with syllable counters, chord lines, and progression looping.
  * Microphone vocal scratchpad recording directly into each section.

* **🎛️ Arrangement Timeline & Multi-Track Studio**:
  * Interactive wave canvas where you draw melody curves that snap to scale notes across octaves.
  * 16-step visual drum machine (Kick, Snare, Hi-Hat).
  * 6 physical instruments: Grand Piano, Nylon Guitar, Orchestral Strings, Woodwind Flute, Sub Bass, and Ambient Pad.
  * Real-time controls: Mute, Delete, and `+ Add Track` while audio is actively playing without stopping.

* **🧠 Song Blueprint & Deconstruction Engine**:
  * Uses Librosa and Chroma STFT to automatically detect the **Key**, **BPM**, and **Beats** of any song.
  * Analyzes song structure and segments reference tracks into **Intro, Verse 1, Chorus, Verse 2, Outro** with exact bar counts.

* **🪓 AI Stem Isolation (Meta Demucs)**:
  * Separates reference tracks into isolated **Vocals** and **Instrumental** stems locally on your PC.
  * Decodes audio waveforms in the browser to visualize the real acoustic waveform across timeline lanes.

---

## 📁 Main Directory Layout

The app manages audio through this folder structure:

* `00_Inbox_New_Songs/` — Drop commercial reference songs here.
* `01_Vocal_Stem_Splits/` — AI separated stems (Vocals & Instrumental).
* `02_Instrument_Samples/` — Exported audio sample clips.
* `05_Blueprints/` — Saved arrangement timeline JSON files.

---

## 🚀 How to Run (Development)

### 1. Start the Python Backend
```bash
python backend/server.py
