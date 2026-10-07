import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { UserProfile, AppView, ScheduleEvent, TaskStatus, ActivityLog } from '../types';
import { 
  Zap, Target, BookOpen, Clock, ArrowRight, Play, Pause, RotateCcw, 
  Sparkles, Calendar, Activity, TrendingUp, Flame, Trophy, Brain, Check, 
  FastForward, Star, Lock, Eye, ListTodo, CheckCircle2
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { DailyQuests } from './DailyQuests';
import { Achievements } from './Achievements';
import { audioEngine } from '../services/audioService';
import { LiquidSelect } from './LiquidSelect';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="liquid-glass p-4 rounded-2xl border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-1.5">
        <p className="text-[10px] font-black text-zinc-400 mb-0.5 uppercase tracking-widest">{payload[0].payload.label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-nexus-electric" />
          <p className="text-xs font-bold text-white">
            Studied: <span className="font-mono text-nexus-electric">{payload[0].value} hrs</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-600" />
          <p className="text-xs text-zinc-400 font-medium">
            Goal: <span className="font-mono">{payload[1]?.value || payload[0].payload.goal} hrs</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

interface DashboardProps {
  user: UserProfile;
  onViewChange: (view: AppView) => void;
  onTriggerXP: (amount: number, x?: number, y?: number) => void;
  onUpdateQuest: (type: 'study_time' | 'tasks_done' | 'pomodoro_count', amount: number) => void;
  subjects: string[];
  setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
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
  onRefreshQuests: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, onViewChange, onTriggerXP, onUpdateQuest, subjects, setSubjects, globalTimer, onRefreshQuests 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'quests' | 'trophies'>('overview');
  const [stats, setStats] = useState({ pending: 0, done: 0, eventsToday: 0, total: 0 });
  const [nextEvent, setNextEvent] = useState<ScheduleEvent | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [dailyProgress, setDailyProgress] = useState(0);
  const [todayStudyMinutes, setTodayStudyMinutes] = useState(0);
  const [pomodorosDone, setPomodorosDone] = useState(0);
  const [focusPulse, setFocusPulse] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ label: string; date: string; hours: number; goal: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const [tasks, schedule, allSessions] = await Promise.all([
          dbService.getTasks(user.uid),
          dbService.getSchedule(user.uid),
          dbService.getSessions(user.uid) 
        ]);

        const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;
        const done = tasks.filter(t => t.status === TaskStatus.DONE).length;
        
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const todayEvents = schedule.filter(e => (e.date || todayStr) === todayStr);
        const upcoming = [...todayEvents]
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .find(e => {
            const [h, m] = e.startTime.split(':').map(Number);
            return (h * 60 + m) > currentMinutes;
          });

        const todaySessions = allSessions.filter(s => s.date === todayStr);
        const todayStudySeconds = todaySessions.reduce((acc, s) => acc + s.duration, 0);
        const studyMins = Math.round(todayStudySeconds / 60);
        setTodayStudyMinutes(studyMins);

        const dailyGoalSecs = (user.dailyGoalMinutes || 120) * 60;
        setDailyProgress(Math.min(100, (todayStudySeconds / dailyGoalSecs) * 100));

        // Count pomodoros done from sessions >= 20 mins or quests
        const poms = todaySessions.filter(s => s.duration >= 20 * 60).length;
        setPomodorosDone(poms);

        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const last7DaysSessions = allSessions.filter(s => s.timestamp >= sevenDaysAgo);

        const totalActualMins = last7DaysSessions.reduce((acc, s) => acc + s.duration, 0) / 60;
        const totalGoalMins = (user.dailyGoalMinutes || 120) * 7;
        const volumeScore = Math.min(1, totalActualMins / totalGoalMins);

        const uniqueDaysStudied = new Set(last7DaysSessions.map(s => s.date)).size;
        const rhythmScore = uniqueDaysStudied / 7;

        const momentumScore = Math.min(1, (user.streak || 0) / 7);

        const calculatedPulse = Math.round(
          (volumeScore * 0.4 + rhythmScore * 0.4 + momentumScore * 0.2) * 100
        );

        setFocusPulse(calculatedPulse);
        setStats({ pending, done, eventsToday: todayEvents.length, total: tasks.length });
        setNextEvent(upcoming || null);

        const generatedChartData = Array.from({ length: 7 }, (_, i) => {
          const day = new Date();
          day.setDate(day.getDate() - (6 - i));
          const dateStr = day.toISOString().split('T')[0];
          
          const sessionsForDay = allSessions.filter(s => s.date === dateStr);
          const totalSeconds = sessionsForDay.reduce((acc, s) => acc + s.duration, 0);
          const hours = Number((totalSeconds / 3600).toFixed(2));
          const goalHours = Number(((user.dailyGoalMinutes || 120) / 60).toFixed(2));

          const isToday = dateStr === todayStr;
          const label = isToday ? 'Today' : day.toLocaleDateString('en-US', { weekday: 'short' });

          return {
            date: dateStr,
            label,
            hours,
            goal: goalHours,
          };
        });

        setChartData(generatedChartData);
      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const actQuery = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(5));
    const unsubActs = onSnapshot(actQuery, (snap) => {
       setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
    });

    return () => unsubActs();
  }, [user.uid, user.dailyGoalMinutes, user.streak]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const formatTime = (s: number) => {
    const hours = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rs = s % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
    return hours > 0 ? `${hours}:${timeStr}` : timeStr;
  };

  const handleMiniTimerToggle = async () => {
    audioEngine.playHaptic('pop');
    if (globalTimer.isActive) {
      globalTimer.stop();
    } else {
      const isPomodoro = globalTimer.type === 'pomodoro';
      const startVal = globalTimer.timeValue > 0 ? globalTimer.timeValue : (isPomodoro ? 25 * 60 : 0);
      globalTimer.start(startVal, globalTimer.type, globalTimer.mode, globalTimer.subject || subjects[0] || 'Math');
      await dbService.updateUserStatus(user.uid, globalTimer.mode === 'focus' ? 'studying' : 'break', globalTimer.subject);
    }
  };

  // Concentric Liquid Rings Math (Apple Fitness style)
  const ring1Goal = user.dailyGoalMinutes || 120;
  const ring1Percent = Math.min(100, (todayStudyMinutes / ring1Goal) * 100);
  
  const ring2Goal = Math.max(3, stats.total || 4);
  const ring2Percent = Math.min(100, (stats.done / ring2Goal) * 100);
  
  const ring3Goal = 4;
  const ring3Percent = Math.min(100, (pomodorosDone / ring3Goal) * 100);

  const r1 = 56;
  const c1 = 2 * Math.PI * r1;
  const r2 = 42;
  const c2 = 2 * Math.PI * r2;
  const r3 = 28;
  const c3 = 2 * Math.PI * r3;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar animate-fade-in pb-24 px-1 space-y-6">
      {/* Top Banner Navigation & Apple-style Segment Selector */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            {greeting()}, <span className="text-nexus-electric font-black">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-zinc-400 text-xs font-semibold mt-1">High-performance academic environment.</p>
        </div>

        {/* Sliding Liquid Capsule Segment Switcher */}
        <div className="flex gap-1 liquid-glass p-1.5 rounded-2xl self-start md:self-center shrink-0">
          <button 
            onClick={() => { audioEngine.playHaptic('click'); setActiveTab('overview'); }}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap squish ${activeTab === 'overview' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-400 hover:text-white'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => { audioEngine.playHaptic('click'); setActiveTab('quests'); }}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap squish ${activeTab === 'quests' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-400 hover:text-white'}`}
          >
            Protocols
          </button>
          <button 
            onClick={() => { audioEngine.playHaptic('click'); setActiveTab('trophies'); }}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap squish ${activeTab === 'trophies' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-400 hover:text-white'}`}
          >
            Trophies
          </button>
        </div>

        {/* Global Progression Stats Capsules */}
        <div className="flex items-center gap-2.5 shrink-0">
            <div className="liquid-glass px-3.5 py-2 rounded-2xl flex flex-col gap-1 min-w-[110px]">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-nexus-electric fill-nexus-electric" />
                  <span className="text-xs font-black text-white">LVL {user.level || 1}</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-nexus-electric transition-all duration-700" 
                    style={{ width: `${((user.xp || 0) % 1000) / 10}%` }} 
                  />
                </div>
            </div>
            <div className="liquid-glass px-3.5 py-2 rounded-2xl flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                <span className="text-xs font-black text-white">{user.streak || 0}d</span>
            </div>
            <div className="liquid-glass px-3.5 py-2 rounded-2xl flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-nexus-violet fill-nexus-violet" />
                <span className="text-xs font-black text-white font-mono">{user.credits || 0}c</span>
            </div>
        </div>
      </header>

      {/* Render Content Based on Active Tab */}
      {activeTab === 'quests' && (
        <div className="animate-fade-in">
          <DailyQuests user={user} onUpdateQuest={onUpdateQuest} onRefresh={onRefreshQuests} />
        </div>
      )}

      {activeTab === 'trophies' && (
        <div className="animate-fade-in">
          <Achievements user={user} />
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 auto-rows-[minmax(180px,auto)]">
          
          {/* Main Hero Card: Apple Health Concentric Study Rings & Daily Objective */}
          <div className="md:col-span-8 row-span-2 liquid-glass-card rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-nexus-electric/15 blur-[120px] rounded-full -mr-20 -mt-20 group-hover:bg-nexus-electric/25 transition-all duration-700 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-[10px] font-black text-nexus-electric uppercase tracking-[0.3em]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Activity Rings
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight">Today's Focus Flow</h3>
                <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                  Close all three liquid rings today to earn double XP and shield your active streak.
                </p>

                {/* Ring Legends */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FA114F] shadow-[0_0_8px_rgba(250,17,79,0.7)]" />
                    <span className="text-xs text-zinc-300 font-bold">{todayStudyMinutes}/{ring1Goal}m Study</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A1FE35] shadow-[0_0_8px_rgba(161,254,53,0.7)]" />
                    <span className="text-xs text-zinc-300 font-bold">{stats.done}/{ring2Goal} Tasks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.7)]" />
                    <span className="text-xs text-zinc-300 font-bold">{pomodorosDone}/{ring3Goal} Poms</span>
                  </div>
                </div>
              </div>

              {/* Concentric SVG Liquid Rings */}
              <div className="relative w-40 h-40 flex items-center justify-center shrink-0 self-center md:self-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                  {/* Background Track Circles */}
                  <circle cx="70" cy="70" r={r1} strokeWidth="9" stroke="rgba(250,17,79,0.18)" fill="transparent" />
                  <circle cx="70" cy="70" r={r2} strokeWidth="9" stroke="rgba(161,254,53,0.18)" fill="transparent" />
                  <circle cx="70" cy="70" r={r3} strokeWidth="9" stroke="rgba(0,240,255,0.18)" fill="transparent" />

                  {/* Ring 1: Study Time (Apple Move Pink #FA114F) */}
                  <circle 
                    cx="70" cy="70" r={r1} 
                    strokeWidth="9" 
                    stroke="#FA114F" 
                    strokeLinecap="round" 
                    fill="transparent"
                    strokeDasharray={c1}
                    strokeDashoffset={c1 - (c1 * ring1Percent) / 100}
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(250,17,79,0.5))' }}
                  />

                  {/* Ring 2: Tasks Done (Apple Exercise Neon Lime #A1FE35) */}
                  <circle 
                    cx="70" cy="70" r={r2} 
                    strokeWidth="9" 
                    stroke="#A1FE35" 
                    strokeLinecap="round" 
                    fill="transparent"
                    strokeDasharray={c2}
                    strokeDashoffset={c2 - (c2 * ring2Percent) / 100}
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(161,254,53,0.5))' }}
                  />

                  {/* Ring 3: Pomodoro Sessions (Apple Stand Electric Cyan #00F0FF) */}
                  <circle 
                    cx="70" cy="70" r={r3} 
                    strokeWidth="9" 
                    stroke="#00F0FF" 
                    strokeLinecap="round" 
                    fill="transparent"
                    strokeDasharray={c3}
                    strokeDashoffset={c3 - (c3 * ring3Percent) / 100}
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(0,240,255,0.5))' }}
                  />
                </svg>

                {/* Center Pulse Icon */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <Flame className="w-5 h-5 text-nexus-electric animate-pulse" />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="relative z-10 flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/8">
              <button 
                onClick={() => onViewChange(AppView.TIMER)} 
                className="px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-wider rounded-2xl flex items-center gap-2 squish shadow-xl shadow-white/10 hover:bg-zinc-200"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                Start Focus Session
              </button>
              <button 
                onClick={() => onViewChange(AppView.ANALYTICS)} 
                className="px-6 py-3 liquid-glass text-white text-xs font-bold rounded-2xl border border-white/10 hover:bg-white/10 squish"
              >
                Detailed Analytics
              </button>
            </div>
          </div>

          {/* Mini Zen Focus Timer Widget inside Dashboard overview */}
          <div className="md:col-span-4 row-span-2 liquid-glass-card rounded-[2.5rem] p-7 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-36 h-36 bg-nexus-electric/15 blur-[50px] rounded-full pointer-events-none" />
            
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Zen Mini-Timer</span>
                <Clock className="w-4 h-4 text-nexus-electric" />
              </div>

              {/* Focus Ring & Digital Display */}
              <div className="flex items-center gap-4 py-3">
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" strokeWidth="4" stroke="rgba(255,255,255,0.06)" fill="transparent" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="42" 
                      strokeWidth="5" 
                      stroke="var(--nexus-accent)" 
                      fill="transparent" 
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={globalTimer.type === 'pomodoro' ? (2 * Math.PI * 42 * (1 - (globalTimer.totalTime - globalTimer.timeValue) / globalTimer.totalTime)) : (globalTimer.isActive ? undefined : 2 * Math.PI * 42)}
                      className={`${globalTimer.isActive ? 'animate-pulse' : ''} transition-all duration-500`}
                      style={{ filter: 'drop-shadow(0 0 8px rgba(var(--nexus-accent-rgb),0.5))' }}
                    />
                  </svg>
                  <Brain className="w-7 h-7 text-nexus-electric" />
                </div>

                <div className="min-w-0">
                  <div className="text-3xl font-black text-white tabular-nums tracking-tight font-mono">
                    {formatTime(globalTimer.timeValue)}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 uppercase font-black tracking-widest truncate">
                    {globalTimer.isActive ? `Studying ${globalTimer.subject}` : `Standby`}
                  </div>
                </div>
              </div>

              {/* Subject Selector Mini Form */}
              {!globalTimer.isActive && (
                <div className="mt-3">
                  <LiquidSelect 
                    value={globalTimer.subject} 
                    onChange={val => globalTimer.setSubject(val)}
                    options={subjects}
                    size="sm"
                    className="py-2 px-3 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Quick Control Actions */}
            <div className="flex gap-2.5 mt-4">
              <button 
                onClick={handleMiniTimerToggle} 
                className={`flex-1 py-3 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 squish shadow-lg ${globalTimer.isActive ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-white text-black shadow-white/10'}`}
              >
                {globalTimer.isActive ? <><Pause className="w-3.5 h-3.5 fill-current" /> Pause</> : <><Play className="w-3.5 h-3.5 fill-current" /> Sprint</>}
              </button>
              {globalTimer.isActive && (
                <button 
                  onClick={() => globalTimer.manualEnd()}
                  className="px-4 liquid-glass border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all flex items-center justify-center squish"
                  title="Finish session"
                >
                  <FastForward className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Next Academic Node Bento Card */}
          <div className="md:col-span-4 row-span-1 liquid-glass-card rounded-[2.2rem] p-7 flex flex-col justify-between relative overflow-hidden group">
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-nexus-violet">Next Academic Node</span>
                   <BookOpen className="w-4 h-4 text-zinc-400 group-hover:text-nexus-violet transition-colors" />
                </div>
                {nextEvent ? (
                  <>
                    <h4 className="text-xl font-black text-white truncate leading-tight">{nextEvent.title}</h4>
                    <p className="text-xs text-zinc-400 font-semibold mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-nexus-electric" /> {nextEvent.startTime} • {nextEvent.subject}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No events scheduled today.</p>
                )}
             </div>
             <button onClick={() => onViewChange(AppView.SCHEDULE)} className="mt-4 flex items-center gap-2 text-xs font-bold text-white group-hover:gap-3 transition-all uppercase tracking-wider relative z-10">
                Open Schedule <ArrowRight className="w-3.5 h-3.5 text-nexus-electric" />
             </button>
          </div>

          {/* Tasks Completed Metric Card */}
          <div className="md:col-span-2 row-span-1 liquid-glass-card rounded-[2.2rem] p-6 flex flex-col justify-center text-left relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-1">Tasks Done</p>
                <p className="text-4xl font-black text-white tracking-tight">{stats.done}<span className="text-zinc-500 text-lg ml-1 font-semibold">/{stats.total}</span></p>
             </div>
          </div>

          {/* Focus Pulse Metric Card */}
          <div className="md:col-span-2 row-span-1 liquid-glass-card rounded-[2.2rem] p-6 flex flex-col justify-center text-left relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-1">Focus Pulse</p>
                <p className="text-4xl font-black text-white tracking-tight">{focusPulse}<span className="text-zinc-500 text-lg ml-1 font-semibold">%</span></p>
             </div>
          </div>

          {/* Visual Progress Chart Bento Card */}
          <div id="visual-progress-chart-card" className="md:col-span-12 row-span-2 liquid-glass-card rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-nexus-violet/8 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Weekly Rhythm</span>
                  <h3 className="text-xl font-black text-white mt-1">Study Hours vs. Daily Target</h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-nexus-electric shadow-[0_0_8px_rgba(var(--nexus-accent-rgb),0.5)]" />
                    <span>Studied</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-zinc-600 rounded-full" />
                    <span>Target ({((user.dailyGoalMinutes || 120) / 60).toFixed(1)}h/d)</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorHoursBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--nexus-accent)" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="var(--nexus-accent)" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        stroke="#71717a"
                        fontSize={11}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#71717a"
                        fontSize={11}
                        fontWeight={500}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}h`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                      <Bar 
                        dataKey="hours" 
                        fill="url(#colorHoursBar)" 
                        radius={[8, 8, 2, 2]} 
                        barSize={32}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="goal" 
                        stroke="#71717a" 
                        strokeWidth={1.5} 
                        strokeDasharray="4 4" 
                        dot={{ r: 2.5, fill: '#71717a', strokeWidth: 0 }}
                        activeDot={{ r: 4.5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-30 text-zinc-500">
                    <Activity className="w-12 h-12 mb-4 animate-pulse" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Loading Study Chart...</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center border-t border-white/8 pt-4 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                <span>Total study time this week</span>
                <span className="text-sm font-mono font-black text-white">
                  {chartData.reduce((sum, item) => sum + item.hours, 0).toFixed(1)} hrs
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
