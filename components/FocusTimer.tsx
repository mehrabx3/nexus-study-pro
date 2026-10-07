import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Brain, Plus, X, Volume2, VolumeX, Settings2, 
  Check, FastForward, Maximize2, Minimize2, Timer as TimerIcon, Hourglass,
  Sliders, Music, Waves, CloudRain, Radio, Headphones
} from 'lucide-react';
import { UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { audioEngine } from '../services/audioService';
import { LiquidSelect } from './LiquidSelect';

interface FocusTimerProps {
  user: UserProfile;
  subjects: string[];
  setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
  onTriggerXP: (amount: number) => void;
  onUpdateQuest: (type: 'study_time' | 'tasks_done' | 'pomodoro_count', amount: number) => void;
  globalTimer: {
    isActive: boolean;
    timeValue: number;
    totalTime: number;
    type: 'stopwatch' | 'pomodoro';
    mode: 'focus' | 'short' | 'long';
    subject: string;
    isMuted: boolean;
    setIsMuted: (muted: boolean) => void;
    start: (value: number, type: 'stopwatch' | 'pomodoro', mode: string, subject: string) => void;
    stop: () => void;
    reset: (value: number) => void;
    manualEnd: () => void;
    setType: (type: 'stopwatch' | 'pomodoro') => void;
    setMode: (mode: 'focus' | 'short' | 'long') => void;
    setSubject: (sub: string) => void;
  };
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ user, subjects, setSubjects, onTriggerXP, onUpdateQuest, globalTimer }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('nexus_timer_settings');
    return saved ? JSON.parse(saved) : { focus: 25, short: 5, long: 15 };
  });

  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showSoundscape, setShowSoundscape] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editSettings, setEditSettings] = useState(settings);
  const [manualData, setManualData] = useState({ duration: 30, subject: subjects[0] || 'Math' });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Soundscape Mixer States
  const [soundscapeActive, setSoundscapeActive] = useState(false);
  const [volumes, setVolumes] = useState({
    binaural: 0.3,
    rain: 0.25,
    synth: 0.2,
    noise: 0.15
  });
  const [channels, setChannels] = useState({
    binaural: true,
    rain: false,
    synth: true,
    noise: false
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<{ [key: string]: GainNode }>({});
  const activeSourcesRef = useRef<any[]>([]);

  useEffect(() => {
    localStorage.setItem('nexus_timer_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  // Audio Synthesizer Engine (Web Audio API)
  const stopAudio = () => {
    activeSourcesRef.current.forEach(s => {
      try { s.stop?.(); s.disconnect?.(); } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const startAudio = () => {
    stopAudio();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    // Master Gain
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.8, ctx.currentTime);
    master.connect(ctx.destination);

    // 1. Binaural Beats (210Hz Left, 224Hz Right = 14Hz Beta/Alpha Focus)
    const binauralGain = ctx.createGain();
    binauralGain.gain.setValueAtTime(channels.binaural ? volumes.binaural : 0, ctx.currentTime);
    binauralGain.connect(master);
    gainNodesRef.current.binaural = binauralGain;

    const oscL = ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(216, ctx.currentTime);
    const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panL) { panL.pan.setValueAtTime(-1, ctx.currentTime); oscL.connect(panL); panL.connect(binauralGain); }
    else oscL.connect(binauralGain);

    const oscR = ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(230, ctx.currentTime);
    const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panR) { panR.pan.setValueAtTime(1, ctx.currentTime); oscR.connect(panR); panR.connect(binauralGain); }
    else oscR.connect(binauralGain);

    oscL.start(); oscR.start();
    activeSourcesRef.current.push(oscL, oscR);

    // 2. Synthesized Pink Rain Noise
    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(channels.rain ? volumes.rain : 0, ctx.currentTime);
    rainGain.connect(master);
    gainNodesRef.current.rain = rainGain;

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
    }
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(1200, ctx.currentTime);
    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainSource.start();
    activeSourcesRef.current.push(rainSource);

    // 3. Ambient Drone Synth Pad
    const synthGain = ctx.createGain();
    synthGain.gain.setValueAtTime(channels.synth ? volumes.synth : 0, ctx.currentTime);
    synthGain.connect(master);
    gainNodesRef.current.synth = synthGain;

    [110, 164.81, 220, 329.63].forEach(freq => {
      const drone = ctx.createOscillator();
      drone.type = 'triangle';
      drone.frequency.setValueAtTime(freq, ctx.currentTime);
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(450, ctx.currentTime);
      drone.connect(droneFilter);
      droneFilter.connect(synthGain);
      drone.start();
      activeSourcesRef.current.push(drone);
    });

    // 4. Pure Focus White Noise
    const whiteNoiseGain = ctx.createGain();
    whiteNoiseGain.gain.setValueAtTime(channels.noise ? volumes.noise : 0, ctx.currentTime);
    whiteNoiseGain.connect(master);
    gainNodesRef.current.noise = whiteNoiseGain;

    const whiteBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const whiteOut = whiteBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) whiteOut[i] = (Math.random() * 2 - 1) * 0.08;
    const whiteSrc = ctx.createBufferSource();
    whiteSrc.buffer = whiteBuffer;
    whiteSrc.loop = true;
    whiteSrc.connect(whiteNoiseGain);
    whiteSrc.start();
    activeSourcesRef.current.push(whiteSrc);
  };

  useEffect(() => {
    if (soundscapeActive) startAudio();
    else stopAudio();
    return () => stopAudio();
  }, [soundscapeActive]);

  const updateChannelVolume = (ch: keyof typeof volumes, val: number) => {
    setVolumes(prev => ({ ...prev, [ch]: val }));
    if (gainNodesRef.current[ch] && audioCtxRef.current) {
      gainNodesRef.current[ch].gain.setValueAtTime(channels[ch] ? val : 0, audioCtxRef.current.currentTime);
    }
  };

  const toggleChannel = (ch: keyof typeof channels) => {
    const nextState = !channels[ch];
    setChannels(prev => ({ ...prev, [ch]: nextState }));
    if (gainNodesRef.current[ch] && audioCtxRef.current) {
      gainNodesRef.current[ch].gain.setValueAtTime(nextState ? volumes[ch] : 0, audioCtxRef.current.currentTime);
    }
  };

  const toggleTimer = async () => {
    if (globalTimer.isActive) {
      globalTimer.stop();
    } else {
      const isPomodoro = globalTimer.type === 'pomodoro';
      const startVal = isPomodoro 
        ? (globalTimer.timeValue > 0 ? globalTimer.timeValue : settings[globalTimer.mode] * 60) 
        : globalTimer.timeValue;
      
      globalTimer.start(startVal, globalTimer.type, globalTimer.mode, globalTimer.subject);
      
      const sessionSubject = globalTimer.mode === 'focus' ? globalTimer.subject : 'Break';
      await dbService.updateUserStatus(user.uid, globalTimer.mode === 'focus' ? 'studying' : 'break', sessionSubject);
      
      if (globalTimer.mode === 'focus' && globalTimer.timeValue === 0) {
         await dbService.logActivity({ userId: user.uid, userName: user.name, type: 'session_started', subject: sessionSubject });
      }
    }
  };

  const switchType = (t: 'stopwatch' | 'pomodoro') => {
    globalTimer.stop();
    globalTimer.setType(t);
    if (t === 'stopwatch') globalTimer.reset(0);
    else globalTimer.reset(settings[globalTimer.mode] * 60);
  };

  const switchMode = (m: 'focus' | 'short' | 'long') => {
    globalTimer.stop();
    globalTimer.setMode(m);
    if (globalTimer.type === 'pomodoro') globalTimer.reset(settings[m] * 60);
    else globalTimer.reset(0);
  };

  const handleReset = () => {
    const resetVal = globalTimer.type === 'pomodoro' ? settings[globalTimer.mode] * 60 : 0;
    globalTimer.reset(resetVal);
  };

  const formatTime = (s: number) => {
    const hours = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rs = s % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
    return hours > 0 ? `${hours}:${timeStr}` : timeStr;
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(editSettings);
    setShowConfig(false);
    if (!globalTimer.isActive && globalTimer.type === 'pomodoro') {
      globalTimer.reset(editSettings[globalTimer.mode] * 60);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualData.duration <= 0) return;
    
    setIsSubmittingManual(true);
    try {
      const session = {
        id: crypto.randomUUID(),
        userId: user.uid,
        subject: manualData.subject,
        duration: manualData.duration * 60,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      };
      
      await dbService.logSession(session);
      await dbService.logActivity({ 
        userId: user.uid, 
        userName: user.name, 
        type: 'manual_session_added', 
        subject: manualData.subject,
        duration: manualData.duration * 60
      });
      
      onTriggerXP(manualData.duration * 2);
      onUpdateQuest('study_time', manualData.duration);
      
      setShowManual(false);
      setManualData({ ...manualData, duration: 30 });
    } catch (error) {
      console.error("Failed to log manual session:", error);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const addSubject = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newSubjectName.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects(prev => [...prev, trimmed]);
      globalTimer.setSubject(trimmed);
      setNewSubjectName('');
      setIsAddingSubject(false);
    }
  };

  const isPomodoro = globalTimer.type === 'pomodoro';
  const progress = isPomodoro 
    ? ((globalTimer.totalTime - globalTimer.timeValue) / globalTimer.totalTime) * 100 
    : 100;

  const renderFullscreen = () => (
    <div className="fixed inset-0 z-[9999] bg-[#050507] flex flex-col items-center justify-center animate-fade-in overflow-hidden select-none">
      <div className="blob-1 absolute top-[20%] left-[25%] w-[50vw] h-[50vw] rounded-full bg-nexus-electric/15 blur-[150px] pointer-events-none" />
      <button onClick={() => setIsFullscreen(false)} className="absolute top-10 right-10 p-4 liquid-glass rounded-3xl text-zinc-400 hover:text-white transition-all squish" title="Exit (ESC)">
        <Minimize2 className="w-6 h-6" />
      </button>

      <div className="relative flex items-center justify-center" style={{ width: 560, height: 560 }}>
        <svg viewBox="0 0 560 560" className="w-full h-full transform -rotate-90 absolute inset-0">
          <circle cx="280" cy="280" r="230" strokeWidth="6" stroke="rgba(255,255,255,0.05)" fill="transparent" />
          <circle cx="280" cy="280" r="230" strokeWidth="8" stroke="var(--nexus-accent)" fill="transparent" 
            strokeDasharray={2 * Math.PI * 230}
            strokeDashoffset={isPomodoro ? (2 * Math.PI * 230 * (1 - progress / 100)) : (globalTimer.isActive ? undefined : 2 * Math.PI * 230)}
            strokeLinecap="round"
            className={`${!isPomodoro && globalTimer.isActive ? 'animate-pulse' : ''} transition-all duration-700 ease-out`}
            style={{ filter: 'drop-shadow(0 0 16px rgba(var(--nexus-accent-rgb),0.6))' }}
          />
        </svg>

        <div className="flex flex-col items-center justify-center text-center z-10">
          <div className="text-[11rem] font-black text-white tabular-nums tracking-tighter leading-none font-mono">
            {formatTime(globalTimer.timeValue)}
          </div>
          <div className="mt-6 flex flex-col items-center gap-3">
            <span className="px-6 py-2 rounded-full liquid-glass text-xs font-black uppercase tracking-[0.3em] text-white">
              {globalTimer.type} • {globalTimer.mode}
            </span>
            {globalTimer.mode === 'focus' && (
              <span className="text-xl font-bold text-zinc-400 tracking-wide flex items-center gap-2">
                <Brain className="w-5 h-5 text-nexus-electric" /> {globalTimer.subject}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 flex items-center gap-8">
          <button onClick={handleReset} className="w-16 h-16 rounded-full liquid-glass text-zinc-400 hover:text-white flex items-center justify-center squish"><RotateCcw className="w-5 h-5" /></button>
          <button onClick={toggleTimer} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all hover:scale-105 squish ${globalTimer.isActive ? 'bg-nexus-electric/20 text-nexus-electric border border-nexus-electric/40 shadow-[0_0_50px_rgba(var(--nexus-accent-rgb),0.35)]' : 'bg-nexus-electric text-black shadow-[0_0_50px_rgba(var(--nexus-accent-rgb),0.4)]'}`}>
            {globalTimer.isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-black ml-1" />}
          </button>
          <button onClick={() => globalTimer.manualEnd()} className="w-16 h-16 rounded-full liquid-glass border border-nexus-electric/30 text-nexus-electric flex items-center justify-center squish"><FastForward className="w-5 h-5" /></button>
      </div>
    </div>
  );

  if (isFullscreen) return renderFullscreen();

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-20 animate-fade-in relative space-y-8">
      {/* Top Floating Control Capsule */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Hourglass className="w-8 h-8 text-nexus-electric" />
            Focus Clock
          </h1>
          <p className="text-zinc-400 text-xs font-semibold mt-1">Calibrated for deep cognitive immersion.</p>
        </div>

        <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSoundscape(!showSoundscape)} 
              className={`p-3 rounded-2xl border transition-all squish flex items-center gap-2 text-xs font-bold ${soundscapeActive ? 'bg-nexus-electric text-white border-nexus-electric shadow-lg shadow-nexus-electric/30' : 'liquid-glass border-white/10 text-zinc-400 hover:text-white'}`}
              title="Focus Soundscape Studio"
            >
              <Headphones className="w-4 h-4" />
              <span className="hidden sm:inline">Soundscape</span>
            </button>
            <button onClick={() => setIsFullscreen(true)} className="p-3 liquid-glass rounded-2xl text-zinc-400 hover:text-white transition-all squish" title="Fullscreen Zen (ESC)"><Maximize2 className="w-4 h-4" /></button>
            <button onClick={() => globalTimer.setIsMuted(!globalTimer.isMuted)} className={`p-3 rounded-2xl border transition-all squish ${globalTimer.isMuted ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'liquid-glass border-white/10 text-zinc-400 hover:text-white'}`} title={globalTimer.isMuted ? "Unmute alarm" : "Mute alarm"}>{globalTimer.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
            <button onClick={() => { setEditSettings(settings); setShowConfig(true); }} className="p-3 liquid-glass rounded-2xl text-zinc-400 hover:text-white transition-all squish" title="Timer Settings"><Settings2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Soundscape Studio Popover Drawer */}
      {showSoundscape && (
        <div className="liquid-glass-card rounded-[2.2rem] p-6 animate-slide-up space-y-5 border border-nexus-electric/30 relative overflow-hidden">
          <div className="flex justify-between items-center pb-3 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-nexus-electric/20 border border-nexus-electric/30 flex items-center justify-center">
                <Waves className="w-5 h-5 text-nexus-electric" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Acoustic Focus Studio</h3>
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-widest">Real-time Web Audio Synthesizer</p>
              </div>
            </div>

            <button 
              onClick={() => setSoundscapeActive(!soundscapeActive)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all squish ${soundscapeActive ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white text-black'}`}
            >
              {soundscapeActive ? 'Stop Audio' : 'Start Atmosphere'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Binaural Beat Channel */}
            <div className={`p-4 rounded-2xl liquid-glass border transition-all ${channels.binaural ? 'border-nexus-electric/40 bg-nexus-electric/5' : 'border-white/5 opacity-60'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-nexus-electric" /> Binaural Beta</span>
                <label className="lg-switch scale-90 origin-right">
                  <input 
                    type="checkbox" 
                    checked={channels.binaural} 
                    onChange={() => { audioEngine.playHaptic('click'); toggleChannel('binaural'); }} 
                  />
                  <span className="lg-switch__track" />
                  <span className="lg-switch__thumb" />
                </label>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={volumes.binaural} 
                onChange={e => updateChannelVolume('binaural', parseFloat(e.target.value))} 
                className="lg-slider" 
                style={{ '--v': `${volumes.binaural * 100}%` } as React.CSSProperties}
              />
            </div>

            {/* Pink Rain Channel */}
            <div className={`p-4 rounded-2xl liquid-glass border transition-all ${channels.rain ? 'border-cyan-400/40 bg-cyan-400/5' : 'border-white/5 opacity-60'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5"><CloudRain className="w-3.5 h-3.5 text-cyan-400" /> Liquid Rain</span>
                <label className="lg-switch scale-90 origin-right">
                  <input 
                    type="checkbox" 
                    checked={channels.rain} 
                    onChange={() => { audioEngine.playHaptic('click'); toggleChannel('rain'); }} 
                  />
                  <span className="lg-switch__track" />
                  <span className="lg-switch__thumb" />
                </label>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={volumes.rain} 
                onChange={e => updateChannelVolume('rain', parseFloat(e.target.value))} 
                className="lg-slider" 
                style={{ '--v': `${volumes.rain * 100}%` } as React.CSSProperties}
              />
            </div>

            {/* Ambient Synth Drone */}
            <div className={`p-4 rounded-2xl liquid-glass border transition-all ${channels.synth ? 'border-purple-400/40 bg-purple-400/5' : 'border-white/5 opacity-60'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5"><Music className="w-3.5 h-3.5 text-purple-400" /> Synth Drone Pad</span>
                <label className="lg-switch scale-90 origin-right">
                  <input 
                    type="checkbox" 
                    checked={channels.synth} 
                    onChange={() => { audioEngine.playHaptic('click'); toggleChannel('synth'); }} 
                  />
                  <span className="lg-switch__track" />
                  <span className="lg-switch__thumb" />
                </label>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={volumes.synth} 
                onChange={e => updateChannelVolume('synth', parseFloat(e.target.value))} 
                className="lg-slider" 
                style={{ '--v': `${volumes.synth * 100}%` } as React.CSSProperties}
              />
            </div>

            {/* Pure White Noise */}
            <div className={`p-4 rounded-2xl liquid-glass border transition-all ${channels.noise ? 'border-emerald-400/40 bg-emerald-400/5' : 'border-white/5 opacity-60'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-emerald-400" /> White Static</span>
                <label className="lg-switch scale-90 origin-right">
                  <input 
                    type="checkbox" 
                    checked={channels.noise} 
                    onChange={() => { audioEngine.playHaptic('click'); toggleChannel('noise'); }} 
                  />
                  <span className="lg-switch__track" />
                  <span className="lg-switch__thumb" />
                </label>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={volumes.noise} 
                onChange={e => updateChannelVolume('noise', parseFloat(e.target.value))} 
                className="lg-slider" 
                style={{ '--v': `${volumes.noise * 100}%` } as React.CSSProperties}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Focus Center */}
      <div className="liquid-glass-card rounded-[3rem] p-8 md:p-14 flex flex-col items-center justify-center space-y-10 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-nexus-electric/10 blur-[130px] rounded-full pointer-events-none" />

        {/* Stopwatch vs Pomodoro Mode Selectors */}
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="flex p-1.5 liquid-glass rounded-full border border-white/10 shrink-0">
              <button onClick={() => switchType('stopwatch')} className={`px-7 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 squish ${globalTimer.type === 'stopwatch' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-400 hover:text-white'}`}><TimerIcon className="w-3.5 h-3.5" /> Stopwatch</button>
              <button onClick={() => switchType('pomodoro')} className={`px-7 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 squish ${globalTimer.type === 'pomodoro' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-400 hover:text-white'}`}><Hourglass className="w-3.5 h-3.5" /> Pomodoro</button>
          </div>
          {globalTimer.type === 'pomodoro' && (
            <div className="flex p-1 liquid-glass rounded-full border border-white/10 shrink-0 animate-fade-in">
                {(['focus', 'short', 'long'] as const).map(m => (
                    <button key={m} onClick={() => switchMode(m)} className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all squish ${globalTimer.mode === m ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{m}</button>
                ))}
            </div>
          )}
        </div>

        {/* Active Subject Selector */}
        {globalTimer.mode === 'focus' && !globalTimer.isActive && (
            <div className="w-full max-w-md space-y-2 relative z-10">
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.25em] text-center block">Target Academic Field</span>
                <div className="flex flex-wrap justify-center gap-2">
                    {subjects.map(s => (
                        <button key={s} onClick={() => globalTimer.setSubject(s)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all squish ${globalTimer.subject === s ? 'bg-nexus-electric text-white shadow-lg shadow-nexus-electric/30' : 'liquid-glass border border-white/8 text-zinc-400 hover:text-white'}`}>
                            {s}
                        </button>
                    ))}
                    {isAddingSubject ? (
                      <form onSubmit={addSubject} className="inline-flex"><input autoFocus value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} onBlur={() => { if (!newSubjectName.trim()) setIsAddingSubject(false); else addSubject(); }} placeholder="Subject..." className="px-3 py-1.5 liquid-glass rounded-xl text-xs text-white outline-none w-28" /></form>
                    ) : (
                      <button onClick={() => setIsAddingSubject(true)} className="px-3 py-2 rounded-xl text-xs font-bold border border-dashed border-zinc-700 text-zinc-500 hover:text-white transition-all flex items-center gap-1 squish"><Plus className="w-3.5 h-3.5" /> Add</button>
                    )}
                </div>
            </div>
        )}

        {globalTimer.isActive && globalTimer.mode === 'focus' && (
            <div className="px-6 py-2 rounded-full liquid-glass border border-nexus-electric/30 text-nexus-electric text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.2)] animate-pulse relative z-10"><Brain className="w-4 h-4" />Immersion: {globalTimer.subject}</div>
        )}

        {/* Liquid Dial */}
        <div className="relative flex items-center justify-center shrink-0 z-10" style={{ width: 330, height: 330 }}>
            <svg viewBox="0 0 330 330" className="w-full h-full transform -rotate-90">
                <circle cx="165" cy="165" r="140" strokeWidth="6" stroke="rgba(255,255,255,0.06)" fill="transparent" />
                <circle cx="165" cy="165" r="140" strokeWidth="8" stroke="var(--nexus-accent)" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 140}
                  strokeDashoffset={isPomodoro ? (2 * Math.PI * 140 * (1 - progress / 100)) : (globalTimer.isActive ? undefined : 2 * Math.PI * 140)}
                  strokeLinecap="round"
                  className={`${!isPomodoro && globalTimer.isActive ? 'animate-pulse' : ''} transition-all duration-500 ease-out`}
                  style={{ filter: 'drop-shadow(0 0 14px rgba(var(--nexus-accent-rgb),0.55))' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[5.5rem] font-black text-white tabular-nums tracking-tighter leading-none font-mono drop-shadow-2xl">{formatTime(globalTimer.timeValue)}</div>
                <div className="mt-4 px-4 py-1.5 liquid-glass rounded-full text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">{globalTimer.type} • {globalTimer.mode}</div>
            </div>
        </div>

        {/* Bottom Playback Controls */}
        <div className="flex items-center gap-6 relative z-10">
            <button onClick={handleReset} className="w-14 h-14 rounded-full liquid-glass text-zinc-400 hover:text-white flex items-center justify-center transition-all squish" title="Reset Session"><RotateCcw className="w-5 h-5" /></button>
            <button onClick={toggleTimer} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all hover:scale-105 squish ${globalTimer.isActive ? 'bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/40 shadow-[0_0_30px_rgba(255,159,10,0.3)]' : 'bg-[#30D158] text-black shadow-[0_0_40px_rgba(48,209,88,0.35)]'}`}>
              {globalTimer.isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1.5" />}
            </button>
            {(globalTimer.isActive || (!isPomodoro && globalTimer.timeValue > 0)) ? (
                <button onClick={() => globalTimer.manualEnd()} className="w-14 h-14 rounded-full liquid-glass border border-nexus-electric/30 text-nexus-electric flex items-center justify-center transition-all squish" title="Finish and Save"><FastForward className="w-5 h-5" /></button>
            ) : (
                <button onClick={() => setShowManual(true)} className="w-14 h-14 rounded-full liquid-glass text-zinc-400 hover:text-white flex items-center justify-center transition-all squish" title="Log Manual Session"><Plus className="w-5 h-5" /></button>
            )}
        </div>
      </div>

      {/* Manual Session Log Modal */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowManual(false)}>
          <div className="lg-sheet text-left space-y-6 relative overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center pb-2 border-b border-white/10">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-nexus-electric/20 border border-nexus-electric/30 flex items-center justify-center">
                     <Plus className="w-5 h-5 text-nexus-electric" />
                   </div>
                   <div>
                     <h3 className="text-lg font-black text-white m-0">Log Focus Session</h3>
                     <p className="text-[11px] text-zinc-400 font-medium m-0">Record manual offline study time.</p>
                   </div>
                 </div>
                 <button onClick={() => setShowManual(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white squish"><X className="w-4 h-4" /></button>
             </div>
             <form onSubmit={handleManualSubmit} className="space-y-5">
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">Study Subject</label>
                        <LiquidSelect 
                          value={manualData.subject} 
                          onChange={val => setManualData({ ...manualData, subject: val })}
                          options={subjects}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">Duration (Minutes)</label>
                        <input 
                          type="number" 
                          min="1"
                          max="1440"
                          value={manualData.duration} 
                          onChange={e => setManualData({ ...manualData, duration: parseInt(e.target.value) || 0 })} 
                          className="w-full liquid-glass border border-white/15 rounded-2xl px-4 py-3 text-white outline-none font-mono text-sm focus:border-nexus-electric" 
                        />
                    </div>
                </div>
                <div className="lg-sheet__actions">
                  <button 
                    type="submit" 
                    disabled={isSubmittingManual}
                    className="lg-btn lg-btn--tinted lg-btn--lg w-full font-black uppercase tracking-wider text-xs shadow-xl"
                  >
                    {isSubmittingManual ? 'Saving...' : 'Confirm & Award XP'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowManual(false)}
                    className="lg-btn lg-btn--lg w-full text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Timer Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm liquid-glass-card rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden border border-white/10">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-black text-white flex items-center gap-2"><Settings2 className="w-4 h-4 text-nexus-electric" />Timer Settings</h3>
                 <button onClick={() => setShowConfig(false)} className="text-zinc-500 hover:text-white squish"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="space-y-3">
                    {(['focus', 'short', 'long'] as const).map(m => (
                      <div key={m} className="flex items-center justify-between p-3 liquid-glass rounded-xl">
                          <label className="text-xs font-bold text-zinc-300 uppercase">{m} (mins)</label>
                          <input type="number" min="1" max="180" value={editSettings[m]} onChange={e => setEditSettings({...editSettings, [m]: parseInt(e.target.value) || 1})} className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-center text-white outline-none font-mono font-bold" />
                      </div>
                    ))}
                </div>
                <button type="submit" className="w-full py-4 bg-white text-black font-black uppercase tracking-wider text-xs rounded-xl squish shadow-xl">Apply Changes</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
