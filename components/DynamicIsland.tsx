import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Flame, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Radio, 
  Maximize2, 
  CloudRain, 
  Moon, 
  Waves, 
  Headphones,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { AppView, UserProfile } from '../types';
import { audioEngine } from '../services/audioService';
import { dbService } from '../services/dbService';

interface DynamicIslandProps {
  user: UserProfile;
  timer: {
    isActive: boolean;
    timeValue: number;
    totalTime: number;
    type: 'stopwatch' | 'pomodoro';
    mode: 'focus' | 'short' | 'long';
    subject: string;
    start: () => void;
    stop: () => void;
    reset: () => void;
  };
  onNavigate: (view: AppView) => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({ user, timer, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClickedOpen, setIsClickedOpen] = useState(false);
  const [ambientType, setAmbientType] = useState<'binaural' | 'rain' | 'space' | 'river' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(audioEngine.getSoundEnabled());
  const [volume, setVolume] = useState(0.4);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const islandRef = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        setIsClickedOpen(false);
      }
    };
    if (isClickedOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClickedOpen]);

  // If disabled in user settings, hide completely
  if (user.enableDynamicIsland === false) {
    return null;
  }

  // 3-Stage Dynamic Island State Machine:
  // 1. Fully Expanded: When clicked open by the user
  // 2. Compact Mini HUD: When hovered OR when study session is running
  // 3. Idle Notch: Default minimized state
  const isFullyExpanded = isClickedOpen;
  const isCompactHUD = !isFullyExpanded && (isHovered || timer.isActive);
  const isIdleNotch = !isFullyExpanded && !isCompactHUD;

  // Sync ambient sound status & load today's study minutes
  useEffect(() => {
    setAmbientType(audioEngine.getCurrentAmbientType());
    
    const loadTodayStudy = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const sessions = await dbService.getSessions(user.uid);
        const todaySessions = sessions.filter(s => s.date === todayStr);
        const totalSecs = todaySessions.reduce((acc, s) => acc + s.duration, 0);
        setTodayMinutes(Math.round(totalSecs / 60));
      } catch (e) {}
    };
    loadTodayStudy();
  }, [user.uid, timer.isActive]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const remaining = timer.type === 'pomodoro' 
    ? Math.max(0, timer.totalTime - timer.timeValue) 
    : timer.timeValue;

  const progressPct = timer.type === 'pomodoro'
    ? Math.min(100, Math.round((timer.timeValue / timer.totalTime) * 100))
    : Math.min(100, Math.round((timer.timeValue / 3600) * 100));

  const toggleAmbient = (type: 'binaural' | 'rain' | 'space' | 'river') => {
    audioEngine.playHaptic('click');
    if (ambientType === type) {
      audioEngine.stopAmbient();
      setAmbientType(null);
    } else {
      audioEngine.startAmbient(type, volume);
      setAmbientType(type);
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    audioEngine.setSoundEnabled(next);
    setSoundEnabled(next);
    if (next) audioEngine.playHaptic('pop');
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setAmbientVolume(newVol);
  };

  const handlePopoutDesktop = async () => {
    audioEngine.playHaptic('click');
    if ('documentPictureInPicture' in window) {
      try {
        const pipWin = await (window as any).documentPictureInPicture.requestWindow({
          width: 330,
          height: 195,
        });

        // Copy all stylesheets & inline styles from main app to PiP window
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            if (styleSheet.cssRules) {
              const newStyleEl = pipWin.document.createElement('style');
              for (const cssRule of styleSheet.cssRules) {
                newStyleEl.appendChild(pipWin.document.createTextNode(cssRule.cssText));
              }
              pipWin.document.head.appendChild(newStyleEl);
            } else if (styleSheet.href) {
              const newLinkEl = pipWin.document.createElement('link');
              newLinkEl.rel = 'stylesheet';
              newLinkEl.href = styleSheet.href;
              pipWin.document.head.appendChild(newLinkEl);
            }
          } catch (e) {
            if (styleSheet.href) {
              const newLinkEl = pipWin.document.createElement('link');
              newLinkEl.rel = 'stylesheet';
              newLinkEl.href = styleSheet.href;
              pipWin.document.head.appendChild(newLinkEl);
            }
          }
        });

        const activeTheme = document.body.getAttribute('data-theme') || 'apple_space_black';
        pipWin.document.body.setAttribute('data-theme', activeTheme);
        pipWin.document.body.style.margin = '0';
        pipWin.document.body.style.padding = '10px';
        pipWin.document.body.style.background = 'var(--nexus-bg, #000000)';
        pipWin.document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif';
        pipWin.document.body.style.display = 'flex';
        pipWin.document.body.style.alignItems = 'center';
        pipWin.document.body.style.justifyContent = 'center';
        pipWin.document.body.style.boxSizing = 'border-box';
        pipWin.document.body.style.height = '100vh';
        pipWin.document.body.style.overflow = 'hidden';
        
        const renderPip = () => {
          const currentTheme = document.body.getAttribute('data-theme') || 'apple_space_black';
          pipWin.document.body.setAttribute('data-theme', currentTheme);
          
          const isStudying = timer.isActive;
          const rem = timer.type === 'pomodoro' 
            ? Math.max(0, timer.totalTime - timer.timeValue) 
            : timer.timeValue;
          const pct = timer.type === 'pomodoro'
            ? Math.min(100, Math.round((timer.timeValue / timer.totalTime) * 100))
            : Math.min(100, Math.round((timer.timeValue / 3600) * 100));

          pipWin.document.body.innerHTML = `
            <div style="width: 100%; height: 100%; background: var(--nexus-card, rgba(28,28,30,0.85)); border-radius: 22px; border: 1px solid rgba(255,255,255,0.22); box-shadow: 0 16px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.25); padding: 14px 16px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: space-between; position: relative; overflow: hidden; backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); user-select: none;">
              
              <!-- Specular Liquid Highlight -->
              <div style="position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent); pointer-events: none;"></div>

              <!-- Header: Subject & Mode Tag -->
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;">
                <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: var(--nexus-accent, #0a84ff);">
                  ${timer.subject || 'Focus Session'}
                </span>
                <span style="font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.3);">•</span>
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.6);">
                  ${timer.type.toUpperCase()}
                </span>
              </div>

              <!-- Live Timer Display -->
              <div style="font-size: 40px; font-weight: 900; font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace; color: #ffffff; letter-spacing: -1.5px; text-shadow: 0 0 24px rgba(var(--nexus-accent-rgb, 10,132,255), 0.55); margin: 2px 0;">
                ${formatTime(rem)}
              </div>

              <!-- Live Status Pill -->
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 4px 14px; border-radius: 999px; background: rgba(var(--nexus-accent-rgb, 10,132,255), 0.18); border: 1px solid rgba(var(--nexus-accent-rgb, 10,132,255), 0.35); color: var(--nexus-accent, #0a84ff); font-size: 11px; font-weight: 800;">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--nexus-accent, #0a84ff); ${isStudying ? 'box-shadow: 0 0 10px var(--nexus-accent, #0a84ff);' : ''}"></span>
                <span>${isStudying ? '🔥 Focusing Live' : 'Ready to Focus'}</span>
              </div>

              <!-- Progress Bar -->
              <div style="width: 100%; height: 4px; border-radius: 999px; background: rgba(255,255,255,0.12); overflow: hidden; margin-top: 4px;">
                <div style="width: ${pct}%; height: 100%; background: var(--nexus-accent, #0a84ff); border-radius: 999px; transition: width 0.3s ease; box-shadow: 0 0 10px var(--nexus-accent, #0a84ff);"></div>
              </div>
            </div>
          `;
        };
        renderPip();
        const interval = setInterval(renderPip, 1000);
        pipWin.addEventListener('unload', () => clearInterval(interval));
      } catch (err) {
        alert("Floating Picture-in-Picture window is active!");
      }
    } else {
      alert("Floating overlay is active over all app views! Chrome/Edge Document Picture-in-Picture is supported for OS popouts.");
    }
  };

  const dailyGoalMinutes = user.dailyGoalMinutes || 60;
  const goalProgress = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));

  return (
    <div 
      ref={islandRef}
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[200] select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`
          liquid-dock border border-white/20
          shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          overflow-hidden cursor-pointer
          ${isFullyExpanded 
            ? 'w-[360px] md:w-[440px] rounded-[2.2rem] p-4 bg-black/90 backdrop-blur-3xl' 
            : isCompactHUD 
              ? 'h-11 px-4 rounded-full bg-black/85 backdrop-blur-2xl flex items-center justify-between gap-3'
              : 'w-24 h-6 rounded-full px-2.5 bg-black/90 border-white/10 flex items-center justify-between'}
        `}
        onClick={() => {
          if (!isFullyExpanded) {
            audioEngine.playHaptic('click');
            setIsClickedOpen(true);
          }
        }}
      >
        {/* Specular Highlight Strip */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* --- STAGE 1: DEFAULT IDLE NOTCH --- */}
        {isIdleNotch && (
          <div className="flex items-center justify-between w-full h-full text-[10px] font-black text-white">
            <span className="w-2 h-2 rounded-full bg-nexus-electric/70 animate-pulse shrink-0" />
            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest">Nexus</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shrink-0" />
          </div>
        )}

        {/* --- STAGE 2: COMPACT MINI HUD (HOVERED OR SESSION RUNNING) --- */}
        {isCompactHUD && (
          <div className="flex items-center justify-between w-full h-full text-xs">
            {/* Left: Study status or Streak */}
            <div className="flex items-center gap-2">
              {timer.isActive ? (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nexus-electric opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-nexus-electric" />
                  </span>
                  <span className="font-bold text-white text-xs tracking-tight">{timer.subject}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span className="font-bold text-white text-[11px]">{user.streak || 1}d Streak</span>
                </div>
              )}
            </div>

            {/* Center: Live Timer or Goal Pill */}
            <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/8 border border-white/10">
              {timer.isActive ? (
                <span className="font-mono font-bold text-nexus-electric text-xs tracking-wider">
                  {formatTime(remaining)}
                </span>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                  <span className="font-semibold text-white">{todayMinutes}m</span>
                  <span>/</span>
                  <span>{dailyGoalMinutes}m</span>
                  <div className="w-8 h-1.5 rounded-full bg-white/10 overflow-hidden ml-1">
                    <div 
                      className="h-full bg-gradient-to-r from-nexus-electric to-emerald-400 rounded-full transition-all duration-500" 
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right: Ambient Sound Wave or Sparkles */}
            <div className="flex items-center gap-2">
              {ambientType ? (
                <div className="flex items-center gap-0.5 h-3 px-1.5 py-0.5 rounded-full bg-nexus-electric/20 text-nexus-electric">
                  <span className="w-0.5 h-2 bg-nexus-electric rounded-full animate-pulse" />
                  <span className="w-0.5 h-3 bg-nexus-electric rounded-full animate-pulse delay-75" />
                  <span className="w-0.5 h-1.5 bg-nexus-electric rounded-full animate-pulse delay-150" />
                </div>
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </div>
          </div>
        )}

        {/* --- STAGE 3: FULLY EXPANDED CONTROL CENTER (WHEN CLICKED) --- */}
        {isFullyExpanded && (
          <div className="space-y-4 animate-fade-in text-zinc-200 cursor-default">
            {/* Header: Title & Minimize Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-nexus-electric/20 border border-nexus-electric/30 flex items-center justify-center">
                  <Radio className="w-3.5 h-3.5 text-nexus-electric" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                    Nexus Island
                    {timer.isActive && (
                      <span className="px-1.5 py-0.2 rounded-md bg-nexus-electric/20 text-nexus-electric text-[9px] font-black uppercase tracking-wider">
                        Live Focus
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-medium">Session & Audio Control Center</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePopoutDesktop();
                  }}
                  className="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all squish text-[10px] font-bold flex items-center gap-1"
                  title="Pop out Floating Desktop Window (over other apps)"
                >
                  <Maximize2 className="w-3 h-3 text-nexus-electric" />
                  <span className="hidden sm:inline">Float OS</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSound();
                  }}
                  className={`p-1.5 rounded-xl border transition-all squish ${soundEnabled ? 'bg-white/10 text-white border-white/15' : 'bg-transparent text-zinc-500 border-transparent hover:text-white'}`}
                  title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    audioEngine.playHaptic('click');
                    setIsClickedOpen(false);
                  }}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors squish"
                  title="Minimize Island"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Timer Controller Card */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {timer.subject} · {timer.type.toUpperCase()}
                </span>
                <span className="text-2xl font-black font-mono tracking-tight text-white block mt-0.5">
                  {formatTime(remaining)}
                </span>
                <div className="w-36 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-nexus-electric rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {timer.isActive ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audioEngine.playHaptic('pop');
                      timer.stop();
                    }}
                    className="w-10 h-10 rounded-2xl bg-nexus-electric/20 hover:bg-nexus-electric/30 text-nexus-electric border border-nexus-electric/40 flex items-center justify-center transition-all squish shadow-lg"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audioEngine.playHaptic('pop');
                      timer.start();
                    }}
                    className="w-10 h-10 rounded-2xl bg-nexus-electric text-black flex items-center justify-center transition-all squish shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.4)]"
                  >
                    <Play className="w-4 h-4 fill-black translate-x-0.5" />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    audioEngine.playHaptic('click');
                    timer.reset();
                  }}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 flex items-center justify-center transition-colors squish"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Native Ambient Sound Synthesizer Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5">
                  <Headphones className="w-3 h-3 text-nexus-electric" />
                  Synthesized Focus Ambiance
                </span>
                {ambientType && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      audioEngine.stopAmbient();
                      setAmbientType(null);
                    }}
                    className="text-rose-400 hover:underline cursor-pointer"
                  >
                    Stop Ambiance
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'binaural', label: '40Hz Gamma', icon: Radio },
                  { id: 'rain', label: 'Pink Rain', icon: CloudRain },
                  { id: 'space', label: 'Deep Space', icon: Moon },
                  { id: 'river', label: 'Zen Stream', icon: Waves },
                ].map((s) => {
                  const isCur = ambientType === s.id;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAmbient(s.id as any);
                      }}
                      className={`
                        p-2 rounded-xl text-center flex flex-col items-center gap-1.5 border transition-all squish
                        ${isCur 
                          ? 'bg-nexus-electric/25 border-nexus-electric text-white shadow-[0_0_15px_rgba(var(--nexus-accent-rgb),0.3)]' 
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/8'}
                      `}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isCur ? 'text-nexus-electric' : ''}`} />
                      <span className="text-[10px] font-bold truncate w-full">{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {ambientType && (
                <div className="pt-2 px-1 flex items-center gap-3">
                  <span className="text-[10px] text-zinc-400 shrink-0">Volume</span>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full accent-nexus-electric h-1 rounded-lg cursor-pointer bg-white/20"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Quick Daily Progress Summary */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
              <span className="text-[11px]">Today's Progress</span>
              <span className="font-bold text-white text-[11px]">
                {todayMinutes}m of {dailyGoalMinutes}m goal ({goalProgress}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
