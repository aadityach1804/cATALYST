import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Scale, Chord } from '@tonaljs/tonal';
import { 
  Play, Square, Volume2, Plus, Trash2, 
  Sparkles, Layers, FileText, FolderGit2, Music2, ShieldCheck, AudioWaveform
} from 'lucide-react';
import { TimelineStudio, type Section, type ImportedTrack } from './TimelineStudio';
import { FileExplorer, type AudioFile } from './FileExplorer';
import { SystemDiagnostics } from './SystemDiagnostics';

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MODES = [
  { label: 'Major (Ionian)', val: 'major' },
  { label: 'Natural Minor (Aeolian)', val: 'minor' },
  { label: 'Dorian', val: 'dorian' },
  { label: 'Mixolydian', val: 'mixolydian' },
];

export default function App() {
  const [activeView, setActiveView] = useState<'lyrics' | 'timeline'>('lyrics');
  const [showExplorer, setShowExplorer] = useState(true);
  const [selectedSong, setSelectedSong] = useState<AudioFile | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [importedTrack, setImportedTrack] = useState<ImportedTrack | null>(null);

  // Persistent Song Meta
  const [songTitle, setSongTitle] = useState(() => localStorage.getItem('cadence_v2_title') || 'Midnight Echoes');
  const [keyRoot, setKeyRoot] = useState(() => localStorage.getItem('cadence_v2_keyRoot') || 'C');
  const [keyMode, setKeyMode] = useState(() => localStorage.getItem('cadence_v2_keyMode') || 'major');
  const [bpm, setBpm] = useState(() => Number(localStorage.getItem('cadence_v2_bpm')) || 118);
  const [soundPreset] = useState<'piano' | 'pad'>('piano');
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);

  // Sections
  const [sections, setSections] = useState<Section[]>(() => {
    const saved = localStorage.getItem('cadence_v2_sections');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: '1',
        type: 'verse',
        title: 'Verse 1',
        chords: 'Cmaj7   Am7   Dm7   G7',
        lyrics: 'Midnight streetlights painting shadows on the concrete floor,\nQuiet whisperings of things we haven\'t said before.\nWatching second hands tick slower than the falling rain,\nTracing patterns on the window like a silver chain.',
      },
      {
        id: '2',
        type: 'chorus',
        title: 'Chorus',
        chords: 'Fmaj7   Em7   Dm7   Cmaj7',
        lyrics: 'And we\'re running through the open sky,\nChasing echoes that will never die.\nHold the flame before the fire clears,\nWe are louder than our oldest fears.',
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('cadence_v2_title', songTitle);
    localStorage.setItem('cadence_v2_keyRoot', keyRoot);
    localStorage.setItem('cadence_v2_keyMode', keyMode);
    localStorage.setItem('cadence_v2_bpm', String(bpm));
    localStorage.setItem('cadence_v2_sections', JSON.stringify(sections));
  }, [songTitle, keyRoot, keyMode, bpm, sections]);

  // Audio Waveform Extraction via Web Audio API
  const handleVisualizeAudioOnTimeline = async (name: string, url: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const rawData = audioBuffer.getChannelData(0);
      const sampleCount = 350;
      const blockSize = Math.floor(rawData.length / sampleCount);
      const peaks: number[] = [];

      for (let i = 0; i < sampleCount; i++) {
        const blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j] || 0);
        }
        peaks.push(Math.min(1, (sum / blockSize) * 2.8));
      }

      setImportedTrack({ name, url, peaks, duration: audioBuffer.duration });
      setActiveView('timeline');
    } catch (e: any) {
      alert('Could not decode audio: ' + e.message);
    }
  };

  const [playingSectionId, setPlayingSectionId] = useState<string | null>(null);
  const [currentChordIndex] = useState<number>(-1);
  const playbackTimerRef = useRef<number | null>(null);

  const pianoSynthRef = useRef<Tone.PolySynth | null>(null);
  const metronomeInterval = useRef<number | null>(null);

  useEffect(() => {
    const piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: soundPreset === 'piano' ? 'triangle' : 'sawtooth' },
      envelope: {
        attack: soundPreset === 'piano' ? 0.02 : 0.2,
        decay: 0.3,
        sustain: soundPreset === 'piano' ? 0.4 : 0.7,
        release: 1.2,
      },
    }).toDestination();
    piano.volume.value = -6;
    pianoSynthRef.current = piano;

    return () => { piano.dispose(); };
  }, [soundPreset]);

  const playChordNotes = (chordName: string) => {
    const chordInfo = Chord.get(chordName);
    if (!chordInfo || !chordInfo.notes.length) return;
    const voiced = chordInfo.notes.map((n, i) => `${n}${i === 0 ? 3 : 4}`);
    pianoSynthRef.current?.triggerAttackRelease(voiced, '2n');
  };

  const handlePlayChord = async (chordName: string) => {
    await Tone.start();
    playChordNotes(chordName);
  };

  const stopSectionPlayback = () => {
    if (playbackTimerRef.current) {
      window.clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setPlayingSectionId(null);
  };

  const togglePlaySection = async (section: Section) => {
    await Tone.start();
    if (playingSectionId === section.id) {
      stopSectionPlayback();
      return;
    }
    stopSectionPlayback();
    const chords = section.chords.split(/[\s,-]+/).map(c => c.trim()).filter(Boolean);
    if (!chords.length) return;

    setPlayingSectionId(section.id);
    let step = 0;
    playChordNotes(chords[0]);

    playbackTimerRef.current = window.setInterval(() => {
      step = (step + 1) % chords.length;
      playChordNotes(chords[step]);
    }, (60 / bpm) * 2000);
  };

  const toggleMetronome = async () => {
    await Tone.start();
    if (isMetronomeActive) {
      if (metronomeInterval.current) clearInterval(metronomeInterval.current);
      setIsMetronomeActive(false);
    } else {
      setIsMetronomeActive(true);
      const clickSynth = new Tone.MembraneSynth().toDestination();
      clickSynth.volume.value = -10;
      let beat = 0;
      metronomeInterval.current = window.setInterval(() => {
        clickSynth.triggerAttackRelease(beat === 0 ? 'C5' : 'G4', '32n');
        beat = (beat + 1) % 4;
      }, (60 / bpm) * 1000);
    }
  };

  const getDiatonicChords = () => {
    const scaleNotes = Scale.get(`${keyRoot} ${keyMode}`).notes;
    if (!scaleNotes.length) return [];
    const romans = keyMode === 'major' 
      ? ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
      : ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

    return scaleNotes.map((note, i) => {
      let quality = 'maj7';
      if (keyMode === 'major') {
        if (i === 1 || i === 2 || i === 5) quality = 'm7';
        else if (i === 4) quality = '7';
        else if (i === 6) quality = 'm7b5';
      } else {
        if (i === 0 || i === 3 || i === 4) quality = 'm7';
        else if (i === 2 || i === 5) quality = 'maj7';
        else if (i === 1) quality = 'm7b5';
        else if (i === 6) quality = '7';
      }
      return { roman: romans[i] || '', name: `${note}${quality}` };
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f1117] text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-[#181b24] border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExplorer(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showExplorer ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow' : 'bg-[#222634] text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Google Drive Main Directory"
          >
            <FolderGit2 className="w-4 h-4" />
            <span>Drive</span>
          </button>

          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-bold text-white shadow text-sm">
            ♩
          </div>
          <input
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            className="bg-transparent text-base font-bold text-slate-100 border border-transparent hover:border-slate-700 focus:border-indigo-500 rounded px-2 py-0.5 outline-none"
          />
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-[#11141c] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveView('lyrics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeView === 'lyrics' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Lyrics & Chords
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeView === 'timeline' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Timeline & Sound Design
          </button>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-3 bg-[#222634] border border-slate-800 rounded-lg px-3 py-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-400">Key</span>
            <select
              value={keyRoot}
              onChange={(e) => setKeyRoot(e.target.value)}
              className="bg-[#181b24] border border-slate-700 text-xs font-semibold rounded px-2 py-0.5 outline-none cursor-pointer"
            >
              {ROOTS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={keyMode}
              onChange={(e) => setKeyMode(e.target.value)}
              className="bg-[#181b24] border border-slate-700 text-xs font-semibold rounded px-2 py-0.5 outline-none cursor-pointer"
            >
              {MODES.map((m) => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-400">BPM</span>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-12 bg-[#181b24] border border-slate-700 text-xs font-semibold rounded px-1.5 py-0.5 outline-none"
            />
            <button
              onClick={toggleMetronome}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${
                isMetronomeActive ? 'bg-indigo-600 text-white' : 'bg-[#181b24] text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" /> Click
            </button>
          </div>
        </div>

        {/* Diagnostics & Auto-Save */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowDiagnostics(true)}
            className="flex items-center gap-1.5 bg-[#222634] hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Run Automated Diagnostics"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Diagnostics</span>
          </button>

          <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Auto-Saved
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {showExplorer && (
          <FileExplorer
            onSelectSong={(file) => setSelectedSong(file)}
            selectedSongId={selectedSong?.id || null}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active Song Banner */}
          {selectedSong && (
            <div className="px-5 py-2.5 bg-[#161a25] border-b border-slate-800 flex items-center justify-between text-xs shrink-0 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-slate-400 font-semibold">Active:</span>
                <span className="font-bold text-slate-100">{selectedSong.name}</span>
                <span className="font-mono text-slate-500 text-[11px]">({selectedSong.size})</span>
              </div>

              {/* STEM PLAYERS */}
              {selectedSong.stems && selectedSong.stems.length > 0 ? (
                <div className="flex items-center gap-3 flex-wrap">
                  {selectedSong.stems.map((stem) => {
                    const isVocal = stem.toLowerCase().includes('vocal') && !stem.toLowerCase().includes('no_');
                    const label = isVocal ? 'Vocals' : 'Instrumental';
                    const streamUrl = selectedSong.stemUrls?.[stem] || `http://127.0.0.1:8000/media/01_Vocal_Stem_Splits/htdemucs/${encodeURIComponent(selectedSong.name.replace(' (Stems)', ''))}/${stem}`;

                    return (
                      <div
                        key={stem}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleVisualizeAudioOnTimeline(`${selectedSong.name} (${label})`, streamUrl);
                        }}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg border shadow-sm cursor-context-menu ${
                          isVocal
                            ? 'bg-pink-950/20 border-pink-500/40 text-pink-300'
                            : 'bg-cyan-950/20 border-cyan-500/40 text-cyan-300'
                        }`}
                        title="Right-click to Visualize Waveform on Timeline"
                      >
                        <span className="font-bold text-[11px] uppercase tracking-wider">{label}</span>
                        <audio controls src={streamUrl} className="h-7 w-48" />
                        <button
                          onClick={() => handleVisualizeAudioOnTimeline(`${selectedSong.name} (${label})`, streamUrl)}
                          className="p-1 hover:text-white transition cursor-pointer"
                          title="Open in Timeline Visualizer"
                        >
                          <AudioWaveform className="w-3.5 h-3.5 text-cyan-400 hover:scale-110" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* RAW INBOX PREVIEW & ACTIONS */
                <div className="flex items-center gap-2.5">
                  <audio
                    controls
                    src={selectedSong.url || `http://127.0.0.1:8000/media/00_Inbox_New_Songs/${encodeURIComponent(selectedSong.name)}`}
                    className="h-7 w-44"
                  />
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('http://127.0.0.1:8000/api/analyze-blueprint', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fileName: selectedSong.name })
                        });
                        if (res.ok) {
                          const data = await res.json();
                          const manifest = data.manifest;
                          if (manifest?.musicalProfile) {
                            setKeyRoot(manifest.musicalProfile.detectedKey.root);
                            setKeyMode(manifest.musicalProfile.detectedKey.mode);
                            setBpm(Math.round(manifest.musicalProfile.bpm));
                          }
                          if (manifest?.sections?.length) {
                            setSections(manifest.sections.map((s: any, idx: number) => ({
                              id: String(idx + 1),
                              type: s.type || 'verse',
                              title: `${s.title} (${s.bars} bars)`,
                              chords: s.chords || 'Cmaj7 Am7 Dm7 G7',
                              lyrics: ''
                            })));
                          }
                          alert(`Blueprint Loaded for "${selectedSong.name}":\n• Key: ${manifest.musicalProfile.detectedKey.root} ${manifest.musicalProfile.detectedKey.mode}\n• BPM: ${manifest.musicalProfile.bpm}\n• ${manifest.sections.length} Structural Sections mapped to Studio!`);
                        } else {
                          alert(`Analysis returned status ${res.status}.`);
                        }
                      } catch (err: any) {
                        alert(`Could not connect to backend: ${err.message}`);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer shadow flex items-center gap-1.5"
                    title="Extract BPM, Key, and Structural Sections"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                    <span>Extract Blueprint</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('http://127.0.0.1:8000/api/split-stems', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fileName: selectedSong.name, mode: '2stems' })
                        });
                        if (res.ok) {
                          const data = await res.json();
                          alert(`Backend: ${data.message}`);
                        } else {
                          alert(`Backend returned status ${res.status}.`);
                        }
                      } catch {
                        alert(`Backend offline on port 8000. Run 'python backend/server.py' in a separate terminal.`);
                      }
                    }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer shadow"
                  >
                    Split Stems
                  </button>
                </div>
              )}
            </div>
          )}

          {/* View Content */}
          {activeView === 'lyrics' ? (
            <div className="flex flex-1 overflow-hidden p-6 space-y-6">
              <main className="flex-1 overflow-y-auto space-y-6 pr-2">
                <div className="bg-[#181b24] border border-slate-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase text-slate-400 block mb-3">
                    Diatonic Chords in {keyRoot} {keyMode}
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {getDiatonicChords().map((chord) => (
                      <button
                        key={chord.name}
                        onClick={() => handlePlayChord(chord.name)}
                        className="flex flex-col items-center justify-center bg-[#222634] hover:bg-[#2e3447] active:bg-cyan-500 active:text-slate-950 border border-slate-700 rounded-lg px-4 py-2 min-w-[72px] transition cursor-pointer"
                      >
                        <span className="text-[10px] text-slate-400">{chord.roman}</span>
                        <span className="text-base font-bold text-cyan-400">{chord.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {sections.map((section) => {
                    const isPlaying = playingSectionId === section.id;
                    const parsedChords = section.chords.split(/[\s,-]+/).filter(Boolean);

                    return (
                      <div key={section.id} className="bg-[#181b24] border border-slate-800 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold uppercase px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              {section.title}
                            </span>
                            <button
                              onClick={() => togglePlaySection(section)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                isPlaying ? 'bg-cyan-500 text-slate-950 animate-pulse' : 'bg-[#222634] text-cyan-400 border border-slate-700'
                              }`}
                            >
                              {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                              {isPlaying ? 'Stop Loop' : 'Play Progression'}
                            </button>
                          </div>
                          <button
                            onClick={() => setSections(prev => prev.filter(s => s.id !== section.id))}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={section.chords}
                          onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, chords: e.target.value } : s))}
                          placeholder="Chords..."
                          className="w-full bg-[#222634] border border-dashed border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-cyan-400 outline-none"
                        />

                        {isPlaying && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                            <Sparkles className="w-3 h-3 text-cyan-400" /> Playing:
                            {parsedChords.map((c, i) => (
                              <span key={i} className={`px-1.5 py-0.5 rounded ${currentChordIndex === i ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800'}`}>
                                {c}
                              </span>
                            ))}
                          </div>
                        )}

                        <textarea
                          rows={4}
                          value={section.lyrics}
                          onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, lyrics: e.target.value } : s))}
                          placeholder="Write lyrics..."
                          className="w-full bg-transparent text-sm leading-relaxed text-slate-200 resize-y outline-none"
                        />
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setSections(prev => [...prev, { id: Date.now().toString(), type: 'verse', title: `Verse ${prev.length + 1}`, chords: 'Cmaj7 Am7 Fmaj7 G7', lyrics: '' }])}
                  className="flex items-center gap-1 bg-[#181b24] hover:bg-[#222634] text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Section
                </button>
              </main>
            </div>
          ) : (
            <TimelineStudio
              bpm={bpm}
              keyRoot={keyRoot}
              keyMode={keyMode}
              sections={sections}
              soundPreset={soundPreset}
              setSoundPreset={() => {}}
              importedTrack={importedTrack}
              onClearImportedTrack={() => setImportedTrack(null)}
            />
          )}
        </div>
      </div>

      <SystemDiagnostics
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        bpm={bpm}
        keyRoot={keyRoot}
        keyMode={keyMode}
      />
    </div>
  );
}