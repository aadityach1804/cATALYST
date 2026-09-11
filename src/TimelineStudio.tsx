import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { 
  Play, Square, ZoomIn, ZoomOut, Activity, Drum, Music, Sparkles, 
  AudioWaveform, Trash2, Volume2, VolumeX
} from 'lucide-react';
import { Scale, Chord } from '@tonaljs/tonal';

export interface Section {
  id: string;
  type: 'verse' | 'chorus' | 'bridge' | 'intro';
  title: string;
  chords: string;
  lyrics: string;
  audioUrl?: string;
}

export interface ImportedTrack {
  name: string;
  url: string;
  peaks: number[];
  duration: number;
}

export type InstrumentPreset = 'piano' | 'guitar' | 'strings' | 'flute' | 'bass' | 'pad';

export interface DynamicTrack {
  id: string;
  name: string;
  type: 'flute' | 'drums' | 'harmony' | 'audio';
  instrument: InstrumentPreset;
  muted: boolean;
}

interface TimelineStudioProps {
  bpm: number;
  keyRoot: string;
  keyMode: string;
  sections: Section[];
  soundPreset: string;
  setSoundPreset: (preset: any) => void;
  importedTrack?: ImportedTrack | null;
  onClearImportedTrack?: () => void;
}

export const TimelineStudio: React.FC<TimelineStudioProps> = ({
  bpm,
  keyRoot,
  keyMode,
  sections,
  soundPreset: _soundPreset,
  setSoundPreset: _setSoundPreset,
  importedTrack,
  onClearImportedTrack
}) => {
  const [zoomSeconds, setZoomSeconds] = useState(60);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('t_flute');

  // Dynamic Tracks List
  const [tracks, setTracks] = useState<DynamicTrack[]>([
    { id: 't_flute', name: 'Flute (Lead)', type: 'flute', instrument: 'flute', muted: false },
    { id: 't_drums', name: 'Drums (Beat)', type: 'drums', instrument: 'piano', muted: false },
    { id: 't_chords', name: 'Harmony (Chords)', type: 'harmony', instrument: 'piano', muted: false }
  ]);

  const [fluteVibrato, setFluteVibrato] = useState(5.0);
  const [fluteBreath, setFluteBreath] = useState(35);
  const [wavePoints, setWavePoints] = useState<number[]>([70, 55, 40, 50, 30, 20, 35, 60]);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingWave = useRef(false);

  const [drumPattern, setDrumPattern] = useState({
    kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
  });
  const [currentDrumStep, setCurrentDrumStep] = useState(0);

  // --- LIVE REFS TO PREVENT STALE CLOSURES ---
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const wavePointsRef = useRef(wavePoints);
  wavePointsRef.current = wavePoints;

  const drumPatternRef = useRef(drumPattern);
  drumPatternRef.current = drumPattern;

  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  const keyRootRef = useRef(keyRoot);
  keyRootRef.current = keyRoot;

  const keyModeRef = useRef(keyMode);
  keyModeRef.current = keyMode;

  const importedTrackRef = useRef(importedTrack);
  importedTrackRef.current = importedTrack;

  // Audio Synths
  const fluteSynthRef = useRef<Tone.MonoSynth | null>(null);
  const kickSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const snareSynthRef = useRef<Tone.NoiseSynth | null>(null);
  const hihatSynthRef = useRef<Tone.NoiseSynth | null>(null);
  const harmonicSynthRef = useRef<Tone.PolySynth | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const timelineAnimRef = useRef<number | null>(null);
  const lastStepRef = useRef<number>(-1);
  const lastBarRef = useRef<number>(-1);
  const lastFluteStepRef = useRef<number>(-1);

  const activeHarmonicTrack = tracks.find(t => t.type === 'harmony') || tracks[0];
  const harmonicInstrument = activeHarmonicTrack ? activeHarmonicTrack.instrument : 'piano';
  const harmonicInstrumentRef = useRef(harmonicInstrument);
  harmonicInstrumentRef.current = harmonicInstrument;

  const getScalePitches = () => {
    const rawNotes = Scale.get(`${keyRootRef.current} ${keyModeRef.current}`).notes;
    if (!rawNotes.length) return ['F4', 'G4', 'Ab4', 'Bb4', 'C5', 'Db5', 'Eb5', 'F5'];
    const oct4 = rawNotes.map(n => `${n}4`);
    const oct5 = rawNotes.map(n => `${n}5`);
    return [...oct4, ...oct5];
  };

  const quantizeYToPitch = (yVal: number) => {
    const pitches = getScalePitches();
    const clampedY = Math.max(5, Math.min(95, yVal));
    const normalized = (clampedY - 5) / 90;
    const index = Math.min(pitches.length - 1, Math.floor((1 - normalized) * pitches.length));
    return pitches[index];
  };

  // Build Harmonic Synth with Acoustic Profiles
  useEffect(() => {
    let synthOptions: any = {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.35, sustain: 0.4, release: 1.2 }
    };

    if (harmonicInstrument === 'guitar') {
      synthOptions = {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 0.8 }
      };
    } else if (harmonicInstrument === 'strings') {
      synthOptions = {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.35, decay: 0.5, sustain: 0.85, release: 1.8 }
      };
    } else if (harmonicInstrument === 'bass') {
      synthOptions = {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.4, sustain: 0.3, release: 0.5 }
      };
    } else if (harmonicInstrument === 'pad') {
      synthOptions = {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.6, decay: 0.8, sustain: 0.7, release: 2.2 }
      };
    } else if (harmonicInstrument === 'flute') {
      synthOptions = {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.08, decay: 0.2, sustain: 0.8, release: 0.6 }
      };
    }

    const synth = new Tone.PolySynth(Tone.Synth, synthOptions).toDestination();
    synth.volume.value = -8;
    harmonicSynthRef.current = synth;

    return () => {
      synth.dispose();
    };
  }, [harmonicInstrument]);

  // Flute & Drums Synths
  useEffect(() => {
    const flute = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      filter: { Q: 2, type: 'lowpass', frequency: 1200 },
      envelope: { attack: 0.04, decay: 0.15, sustain: 0.8, release: 0.4 },
      portamento: 0.04
    }).toDestination();
    flute.volume.value = -3;
    fluteSynthRef.current = flute;

    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.4 }
    }).toDestination();
    kick.volume.value = -2;
    kickSynthRef.current = kick;

    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.005, decay: 0.18, sustain: 0 }
    }).toDestination();
    snare.volume.value = -8;
    snareSynthRef.current = snare;

    const hihat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0 }
    }).toDestination();
    hihat.volume.value = -16;
    hihatSynthRef.current = hihat;

    return () => {
      flute.dispose();
      kick.dispose();
      snare.dispose();
      hihat.dispose();
      if (timelineAnimRef.current) cancelAnimationFrame(timelineAnimRef.current);
    };
  }, []);

  useEffect(() => {
    if (fluteSynthRef.current) {
      fluteSynthRef.current.filter.frequency.value = 400 + (fluteBreath / 100) * 3200;
    }
  }, [fluteBreath]);

  // Wave Canvas Render
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1e2433';
    ctx.lineWidth = 1;
    for (let y = 20; y < canvas.height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const stepX = canvas.width / (wavePoints.length - 1);

    wavePoints.forEach((pt, i) => {
      const x = i * stepX;
      const y = (pt / 100) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    wavePoints.forEach((pt, i) => {
      const x = i * stepX;
      const y = (pt / 100) * canvas.height;
      const pitch = quantizeYToPitch(pt);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      const labelY = y > 25 ? y - 10 : y + 18;
      ctx.fillText(pitch, x, labelY);
    });
  }, [wavePoints, keyRoot, keyMode]);

  const updateWavePoint = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1, x / canvas.width));
    const normY = Math.max(5, Math.min(95, (y / canvas.height) * 100));
    const idx = Math.round(normX * (wavePoints.length - 1));

    setWavePoints(prev => {
      const copy = [...prev];
      copy[idx] = normY;
      return copy;
    });

    await Tone.start();
    const pitch = quantizeYToPitch(normY);
    fluteSynthRef.current?.triggerAttackRelease(pitch, '8n');
  };

  const playFullWaveMelody = async () => {
    await Tone.start();
    const now = Tone.now();
    const stepDuration = 0.22;

    wavePoints.forEach((pt, i) => {
      const pitch = quantizeYToPitch(pt);
      fluteSynthRef.current?.triggerAttackRelease(pitch, '16n', now + (i * stepDuration));
    });
  };

  const triggerTimelineChord = (chordName: string) => {
    const chordInfo = Chord.get(chordName);
    if (!chordInfo || !chordInfo.notes.length) return;
    const currentInst = harmonicInstrumentRef.current;
    const voiced = chordInfo.notes.map((n, i) => {
      const octave = currentInst === 'bass' ? (i === 0 ? 2 : 3) : (i === 0 ? 3 : 4);
      return `${n}${octave}`;
    });
    harmonicSynthRef.current?.triggerAttackRelease(voiced, '2n');
  };

  const toggleMute = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  };

  const deleteTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const addNewTrack = (type: 'flute' | 'drums' | 'harmony', instrument: InstrumentPreset = 'guitar') => {
    const count = tracks.length + 1;
    const nameMap: Record<string, string> = {
      flute: `Woodwind Lead ${count}`,
      drums: `Percussion ${count}`,
      harmony: `${instrumentLabels[instrument].name} ${count}`
    };
    const newTrack: DynamicTrack = {
      id: `t_${Date.now()}`,
      name: nameMap[type] || `Track ${count}`,
      type,
      instrument,
      muted: false
    };
    setTracks(prev => [...prev, newTrack]);
    setSelectedTrackId(newTrack.id);
  };

  // --- REAL-TIME PLAYBACK LOOP ---
  const toggleTimelinePlay = async () => {
    await Tone.start();
    if (isTimelinePlaying) {
      setIsTimelinePlaying(false);
      if (timelineAnimRef.current) cancelAnimationFrame(timelineAnimRef.current);
      if (audioElRef.current) audioElRef.current.pause();
      lastStepRef.current = -1;
      lastBarRef.current = -1;
      lastFluteStepRef.current = -1;
    } else {
      setIsTimelinePlaying(true);
      const startTime = performance.now() - (playheadPos * 1000);
      lastStepRef.current = -1;
      lastBarRef.current = -1;
      lastFluteStepRef.current = -1;

      if (audioElRef.current && importedTrackRef.current) {
        audioElRef.current.currentTime = playheadPos;
        audioElRef.current.play().catch(() => {});
      }

      const loop = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > zoomSeconds) {
          setPlayheadPos(0);
          setIsTimelinePlaying(false);
          if (audioElRef.current) audioElRef.current.pause();
          lastStepRef.current = -1;
          lastBarRef.current = -1;
          lastFluteStepRef.current = -1;
          return;
        }
        setPlayheadPos(elapsed);

        const currentBpm = bpmRef.current;
        const beats = elapsed * (currentBpm / 60);
        const step = Math.floor((beats * 4) % 16);
        setCurrentDrumStep(step);

        const currentTracks = tracksRef.current;
        const currentDrumPattern = drumPatternRef.current;
        const currentWavePoints = wavePointsRef.current;
        const currentSections = sectionsRef.current;

        const activeFluteTrack = currentTracks.find(t => t.type === 'flute' && !t.muted);
        const activeDrumTrack = currentTracks.find(t => t.type === 'drums' && !t.muted);
        const activeHarmonyTracks = currentTracks.filter(t => t.type === 'harmony' && !t.muted);

        if (activeDrumTrack && step !== lastStepRef.current) {
          lastStepRef.current = step;
          if (currentDrumPattern.kick[step]) kickSynthRef.current?.triggerAttackRelease('C1', '8n');
          if (currentDrumPattern.snare[step]) snareSynthRef.current?.triggerAttackRelease('16n');
          if (currentDrumPattern.hihat[step]) hihatSynthRef.current?.triggerAttackRelease('32n');
        }

        if (activeFluteTrack) {
          const fluteStep = Math.floor((beats * 2) % currentWavePoints.length);
          if (fluteStep !== lastFluteStepRef.current) {
            lastFluteStepRef.current = fluteStep;
            const pitch = quantizeYToPitch(currentWavePoints[fluteStep]);
            fluteSynthRef.current?.triggerAttackRelease(pitch, '16n');
          }
        }

        if (activeHarmonyTracks.length > 0) {
          const allChords = currentSections.flatMap(s => 
            s.chords.split(/[\s,-]+/).map(c => c.trim()).filter(Boolean)
          );

          if (allChords.length > 0) {
            const chordBeatStep = Math.floor(beats / 2);
            if (chordBeatStep !== lastBarRef.current) {
              lastBarRef.current = chordBeatStep;
              const chordIndex = chordBeatStep % allChords.length;
              triggerTimelineChord(allChords[chordIndex]);
            }
          }
        }

        timelineAnimRef.current = requestAnimationFrame(loop);
      };

      timelineAnimRef.current = requestAnimationFrame(loop);
    }
  };

  const toggleDrumStep = (instrument: 'kick' | 'snare' | 'hihat', index: number) => {
    setDrumPattern(prev => {
      const copy = [...prev[instrument]];
      copy[index] = !copy[index];
      return { ...prev, [instrument]: copy };
    });
  };

  const renderAudioWaveformSVG = (peaks: number[]) => {
    if (!peaks || !peaks.length) return '';
    const w = 1000;
    const h = 56;
    const step = w / peaks.length;
    const parts: string[] = [];

    peaks.forEach((p, i) => {
      const x = i * step;
      const topY = (h / 2) - (p * (h / 2) * 0.95);
      const bottomY = (h / 2) + (p * (h / 2) * 0.95);
      parts.push(`M ${x.toFixed(1)} ${topY.toFixed(1)} L ${x.toFixed(1)} ${bottomY.toFixed(1)}`);
    });

    return parts.join(' ');
  };

  const instrumentLabels: Record<InstrumentPreset, { name: string; icon: string }> = {
    piano: { name: 'Acoustic Grand Piano', icon: '🎹' },
    guitar: { name: 'Acoustic Nylon Guitar', icon: '🎸' },
    strings: { name: 'Orchestral Strings / Violin', icon: '🎻' },
    flute: { name: 'Concert Woodwind Flute', icon: '🪈' },
    bass: { name: 'Electric / Sub Bass', icon: '🎸' },
    pad: { name: 'Warm Ambient Pad', icon: '🌌' },
  };

  const selectedTrackObj = tracks.find(t => t.id === selectedTrackId);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {importedTrack && (
        <audio ref={audioElRef} src={importedTrack.url} preload="auto" className="hidden" />
      )}

      {/* Timeline Toolbar */}
      <div className="flex items-center justify-between px-6 py-2 bg-[#141720] border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTimelinePlay}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              isTimelinePlaying
                ? 'bg-red-500 text-white shadow-lg animate-pulse'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
            }`}
          >
            {isTimelinePlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {isTimelinePlaying ? 'Stop Timeline' : 'Play Timeline'}
          </button>
          <span className="font-mono text-slate-400">
            {Math.floor(playheadPos / 60)}:{(playheadPos % 60).toFixed(1).padStart(4, '0')}s / {Math.floor(zoomSeconds / 60)}:00
          </span>
          {isTimelinePlaying && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Audio Live (Real-Time Sync)
            </span>
          )}
        </div>

        {/* Add Track & Zoom Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-[#1c2130] p-1 rounded-lg border border-slate-700 text-[11px]">
            <span className="text-slate-400 font-semibold px-1.5">+ Add Track:</span>
            <button
              onClick={() => addNewTrack('harmony', 'guitar')}
              className="bg-[#242b3d] hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded transition cursor-pointer"
            >
              🎸 Guitar
            </button>
            <button
              onClick={() => addNewTrack('harmony', 'strings')}
              className="bg-[#242b3d] hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded transition cursor-pointer"
            >
              🎻 Strings
            </button>
            <button
              onClick={() => addNewTrack('harmony', 'bass')}
              className="bg-[#242b3d] hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded transition cursor-pointer"
            >
              🎸 Bass
            </button>
            <button
              onClick={() => addNewTrack('drums')}
              className="bg-[#242b3d] hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded transition cursor-pointer"
            >
              🥁 Drums
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min={15}
              max={240}
              step={15}
              value={zoomSeconds}
              onChange={(e) => setZoomSeconds(Number(e.target.value))}
              className="w-28 accent-cyan-500 cursor-pointer"
            />
            <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-mono text-cyan-400 font-bold min-w-[35px]">
              {zoomSeconds}s
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Track Canvas */}
      <div className="flex-1 overflow-y-auto bg-[#0d0f14] p-6 space-y-3.5 relative">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none z-30 transition-all duration-75"
          style={{
            left: `${Math.max(24, Math.min(window.innerWidth - 48, (playheadPos / zoomSeconds) * (window.innerWidth - 80) + 160))}px`,
            boxShadow: '0 0 10px #06b6d4',
          }}
        >
          <div className="w-2.5 h-2.5 bg-cyan-400 -ml-1 rounded-full shadow"></div>
        </div>

        {/* Imported Audio Track */}
        {importedTrack && (
          <div
            onClick={() => setSelectedTrackId('t_audio')}
            className={`flex rounded-xl border transition cursor-pointer overflow-hidden ${
              selectedTrackId === 't_audio'
                ? 'border-emerald-500 bg-[#161f22] shadow-md shadow-emerald-500/10'
                : 'border-slate-800 bg-[#141720] hover:border-slate-700'
            }`}
          >
            <div className="w-48 p-3.5 border-r border-slate-800 flex flex-col justify-between bg-[#11141c]">
              <div className="flex items-center gap-2">
                <AudioWaveform className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200 truncate" title={importedTrack.name}>
                  {importedTrack.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] mt-2">
                <span className="text-emerald-400 font-mono">
                  {Math.floor(importedTrack.duration / 60)}:{(importedTrack.duration % 60).toFixed(0).padStart(2, '0')}
                </span>
                {onClearImportedTrack && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onClearImportedTrack(); }}
                    className="text-slate-500 hover:text-red-400 p-0.5"
                    title="Remove Track"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-3 flex items-center relative overflow-hidden bg-[#0d1217]">
              <svg className="w-full h-12" preserveAspectRatio="none" viewBox="0 0 1000 56">
                <path
                  d={renderAudioWaveformSVG(importedTrack.peaks)}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        )}

        {/* DYNAMIC TIMELINE TRACKS */}
        {tracks.map((track) => {
          const isSelected = selectedTrackId === track.id;

          return (
            <div
              key={track.id}
              onClick={() => setSelectedTrackId(track.id)}
              className={`flex rounded-xl border transition cursor-pointer overflow-hidden ${
                isSelected
                  ? 'border-cyan-500 bg-[#181b24] shadow-md shadow-cyan-500/10'
                  : 'border-slate-800 bg-[#141720] hover:border-slate-700'
              } ${track.muted ? 'opacity-50' : ''}`}
            >
              <div className="w-48 p-3.5 border-r border-slate-800 flex flex-col justify-between bg-[#11141c]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    {track.type === 'flute' && <Activity className="w-4 h-4 text-cyan-400 shrink-0" />}
                    {track.type === 'drums' && <Drum className="w-4 h-4 text-pink-400 shrink-0" />}
                    {track.type === 'harmony' && <Music className="w-4 h-4 text-indigo-400 shrink-0" />}
                    <span className="text-xs font-bold text-slate-200 truncate">{track.name}</span>
                  </div>

                  <button
                    onClick={(e) => deleteTrack(track.id, e)}
                    className="text-slate-500 hover:text-red-400 p-1 transition cursor-pointer"
                    title="Delete Track"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={(e) => toggleMute(track.id, e)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer flex items-center gap-1 ${
                      track.muted
                        ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    title={track.muted ? 'Unmute Track' : 'Mute Track'}
                  >
                    {track.muted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-slate-400" />}
                    <span>{track.muted ? 'MUTED' : 'MUTE'}</span>
                  </button>

                  {track.type === 'harmony' ? (
                    <select
                      value={track.instrument}
                      onChange={(e) => {
                        const val = e.target.value as InstrumentPreset;
                        setTracks(prev => prev.map(t => t.id === track.id ? { ...t, instrument: val, name: `${instrumentLabels[val].name}` } : t));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#181b24] border border-slate-700 text-[10px] font-semibold text-cyan-400 rounded px-1 py-0.5 outline-none cursor-pointer"
                    >
                      {Object.entries(instrumentLabels).map(([key, item]) => (
                        <option key={key} value={key}>{item.icon} {item.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {track.type === 'flute' ? 'Wave Synth' : '16-Step'}
                    </span>
                  )}
                </div>
              </div>

              {/* Track Content Lane */}
              <div className="flex-1 p-3 flex items-center relative overflow-hidden">
                {track.type === 'flute' && (
                  <div className="w-full flex items-center justify-between gap-1 overflow-hidden">
                    {wavePoints.map((pt, i) => {
                      const pitch = quantizeYToPitch(pt);
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center justify-center bg-[#181b24] border border-cyan-500/20 rounded py-1"
                        >
                          <span className="text-[10px] font-mono font-extrabold text-cyan-300">{pitch}</span>
                          <div 
                            className="w-1.5 bg-cyan-400 rounded-full mt-0.5" 
                            style={{ height: `${Math.max(4, Math.round((100 - pt) / 4))}px` }}
                          ></div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {track.type === 'drums' && (
                  <div className="w-full flex items-center gap-1 overflow-x-auto">
                    {drumPattern.kick.map((active, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-9 rounded flex items-center justify-center text-[10px] font-mono font-bold transition ${
                          currentDrumStep === i && isTimelinePlaying
                            ? 'bg-pink-400 text-slate-950 scale-105 shadow-md shadow-pink-500/50'
                            : active
                            ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                            : 'bg-[#181b24] text-slate-600 border border-slate-800'
                        }`}
                      >
                        {active ? '●' : '·'}
                      </div>
                    ))}
                  </div>
                )}

                {track.type === 'harmony' && (
                  <div className="w-full flex items-center gap-2 overflow-x-auto">
                    {sections.map((sec) => (
                      <div key={sec.id} className="flex-1 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-2 min-w-[130px]">
                        <div className="text-[10px] font-bold text-indigo-400 uppercase">{sec.title}</div>
                        <div className="text-xs font-mono font-bold text-slate-300 truncate">{sec.chords}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lower Deck Sound Design Center */}
      <div className="h-64 bg-[#181b24] border-t border-slate-800 p-5 flex gap-6 overflow-hidden">
        {selectedTrackObj?.type === 'flute' && (
          <div className="flex-1 flex gap-6 items-center">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Draw Melody Wave (Snapped to {keyRoot} {keyMode})
                </span>
                <button
                  onClick={() => setWavePoints([70, 55, 40, 50, 30, 20, 35, 60])}
                  className="text-[10px] text-slate-400 hover:text-cyan-400 cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <canvas
                ref={waveCanvasRef}
                width={360}
                height={120}
                onMouseDown={(e) => { isDrawingWave.current = true; updateWavePoint(e); }}
                onMouseMove={(e) => { if (isDrawingWave.current) updateWavePoint(e); }}
                onMouseUp={() => { isDrawingWave.current = false; }}
                className="bg-[#11141c] border border-slate-700 rounded-lg cursor-crosshair shadow-inner"
              />
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Changes apply in real time during playback.
              </span>
            </div>

            <div className="flex-1 bg-[#222634] border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Flute Expression Matrix</span>
                <button
                  onClick={playFullWaveMelody}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer shadow flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" /> Audition Melody Phrase
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Vibrato Modulation</span>
                    <span className="font-mono text-cyan-400">{fluteVibrato} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={fluteVibrato}
                    onChange={(e) => setFluteVibrato(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Breath & Resonance</span>
                    <span className="font-mono text-cyan-400">{fluteBreath}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={fluteBreath}
                    onChange={(e) => setFluteBreath(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTrackObj?.type === 'drums' && (
          <div className="flex-1 flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
              <Drum className="w-3.5 h-3.5" /> 16-Step Drum Grid (Updates live while playing)
            </span>
            <div className="space-y-2">
              {(['kick', 'snare', 'hihat'] as const).map((inst) => (
                <div key={inst} className="flex items-center gap-2">
                  <span className="w-16 text-xs font-mono font-bold text-slate-400 uppercase">{inst}</span>
                  <div className="flex-1 flex gap-1.5">
                    {drumPattern[inst].map((active, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleDrumStep(inst, idx)}
                        className={`flex-1 h-7 rounded text-xs font-mono font-bold transition cursor-pointer ${
                          active ? 'bg-pink-500 text-slate-950 shadow' : 'bg-[#222634] hover:bg-slate-700 text-slate-500'
                        }`}
                      >
                        {active ? '●' : '·'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTrackObj?.type === 'harmony' && (
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" /> Harmonic Instrument Studio ({keyRoot} {keyMode})
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Select an acoustic or synth model to voice this track's chord progressions:
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {Object.entries(instrumentLabels).map(([key, item]) => {
                const isSelected = selectedTrackObj.instrument === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      const val = key as InstrumentPreset;
                      setTracks(prev => prev.map(t => t.id === selectedTrackObj.id ? { ...t, instrument: val, name: `${item.name}` } : t));
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                        : 'bg-[#222634] hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono capitalize">{key} Engine</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedTrackId === 't_audio' && importedTrack && (
          <div className="flex-1 flex flex-col justify-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <AudioWaveform className="w-4 h-4" /> Loaded Stem Waveform Analysis
            </span>
            <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
              Currently visualizing the raw decoded acoustic waveform for <strong>{importedTrack.name}</strong> ({Math.floor(importedTrack.duration / 60)}:{(importedTrack.duration % 60).toFixed(0).padStart(2, '0')}).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};