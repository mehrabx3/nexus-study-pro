
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { TaskManager } from './components/TaskManager.tsx';
import { SmartSchedule } from './components/SmartSchedule.tsx';
import { FocusTimer } from './components/FocusTimer.tsx';
import { AITutor } from './components/AITutor.tsx';
import { Analytics } from './components/Analytics.tsx';
import { NexusHub } from './components/NexusHub.tsx';
import { NexusShop } from './components/NexusShop.tsx';
import { Achievements } from './components/Achievements.tsx';
import { DailyQuests } from './components/DailyQuests.tsx';
import { Login } from './components/Login.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { GamificationOverlay } from './components/GamificationOverlay.tsx';
import { DynamicIsland } from './components/DynamicIsland.tsx';
import { CustomThemeStudio } from './components/CustomThemeStudio.tsx';
import { audioEngine } from './services/audioService.ts';
import { authService } from './services/authService.ts';
import { dbService } from './services/dbService.ts';
import { customThemeService } from './services/customThemeService.ts';
import { increment, query, collection, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './services/firebase.ts';
import { AppView, UserProfile, AppTheme, CustomThemeConfig, DailyQuest, Task, TaskPriority, TaskStatus } from './types.ts';
import { BellRing, X, User as UserIcon, Check, Sparkles, Target, Palette, Moon, Sun, Monitor, Zap, ShoppingBag, Award, Lock, Plus, Pencil, Trash2, Sliders, Radio } from 'lucide-react';

const XP_PER_LEVEL = 1000;
const INITIAL_DAILY_QUESTS: DailyQuest[] = [
  { id: 'q1', title: 'Deep Focus', description: 'Study for 60 minutes', target: 60, current: 0, rewardXp: 100, rewardCredits: 50, completed: false, type: 'study_time' },
  { id: 'q2', title: 'Task Master', description: 'Complete 3 tasks', target: 3, current: 0, rewardXp: 150, rewardCredits: 75, completed: false, type: 'tasks_done' },
  { id: 'q3', title: 'Pomodoro Streak', description: 'Complete 4 Pomodoros', target: 4, current: 0, rewardXp: 200, rewardCredits: 100, completed: false, type: 'pomodoro_count' },
];

const DEFAULT_SUBJECTS = ["Math", "Physics", "Chemistry", "Biology"];

const AVATAR_PRESETS = [
  { style: 'micah', seed: 'Felix' },
  { style: 'micah', seed: 'Aneka' },
  { style: 'micah', seed: 'Julian' },
  { style: 'avataaars', seed: 'Lily' },
  { style: 'avataaars', seed: 'Jack' },
  { style: 'avataaars', seed: 'Luna' },
  { style: 'lorelei', seed: 'Maya' },
  { style: 'lorelei', seed: 'Oliver' },
  { style: 'bottts', seed: 'Robo1' },
  { style: 'bottts', seed: 'Robo2' },
  { style: 'pixel-art', seed: 'Hero' },
  { style: 'pixel-art', seed: 'Quest' },
];

export const THEMES: { id: AppTheme; name: string; description: string; colors: string[]; isPremium?: boolean }[] = [
  { id: 'black_and_white', name: 'Black & White', description: 'Studio High-Contrast Pure Black Obsidian & Diamond White Accents', colors: ['#000000', '#FFFFFF'] },
  { id: 'apple_space_black', name: 'Space Black Pro', description: 'iPhone 16 Pro Deep Obsidian & System Blue', colors: ['#000000', '#0A84FF'] },
  { id: 'apple_monochrome', name: 'Monochrome Slate', description: 'Studio High-Contrast Minimalism & Titanium White', colors: ['#09090B', '#F4F4F5'] },
  { id: 'apple_midnight', name: 'Midnight', description: 'MacBook Air M3 Inky Midnight & Cobalt Anodized Luster', colors: ['#070A12', '#388BFD'] },
  { id: 'apple_desert_titanium', name: 'Desert Titanium', description: 'iPhone 16 Pro Warm Metallic Sand & Gold Luster', colors: ['#141210', '#D8B486'] },
  { id: 'apple_natural_titanium', name: 'Natural Titanium', description: 'Brushed Metallic Warm Titanium & Platinum', colors: ['#151413', '#D4C5B9'] },
  { id: 'apple_deep_purple', name: 'Deep Purple', description: 'iPhone 14 Pro Obsidian & Royal Apple Violet', colors: ['#0D0817', '#AF52DE'] },
  { id: 'apple_sierra_blue', name: 'Sierra Blue', description: 'iPhone 13 Pro Crystalline Icy Slate & Sky Cyan', colors: ['#0A111A', '#64D2FF'] },
  { id: 'apple_pacific_blue', name: 'Pacific Blue', description: 'iPhone 12 Pro Marine Sapphire & Electric Aqua', colors: ['#061219', '#00C2CB'] },
  { id: 'apple_hermes', name: 'Hermès Noir', description: 'Apple Watch Hermès Obsidian & Heritage Orange', colors: ['#09090A', '#FF6422'] },
  { id: 'apple_product_red', name: 'Product (RED)', description: 'Special Edition Crimson & Radiant Scarlet', colors: ['#120505', '#FF3B30'] },
  { id: 'apple_vision_os', name: 'VisionOS Spatial', description: 'Apple Vision Pro Spatial Glass & Prism Glow', colors: ['#09090D', '#7B61FF'] },
  { id: 'apple_ultra_orange', name: 'Ultra Action Orange', description: 'Apple Watch Ultra Titanium & International Orange', colors: ['#0E0C0A', '#FF9500'] },
  { id: 'apple_space_gray', name: 'Space Gray', description: 'MacBook Pro Aluminum & Cyan Refraction', colors: ['#141416', '#64D2FF'] },
  { id: 'apple_starlight', name: 'Starlight', description: 'Apple Watch Champagne & Warm Metallic Luster', colors: ['#181715', '#E8DECE'] },
  { id: 'apple_light_sequoia', name: 'Sequoia Frost Light', description: 'macOS Sequoia Pure Light & Cupertino Blue', colors: ['#F2F2F7', '#007AFF'] },
  { id: 'apple_fitness', name: 'Fitness+ Rings', description: 'Activity Move, Exercise & Stand Tri-Color', colors: ['#000000', '#30D158'] },
  { id: 'apple_music', name: 'Apple Music Spatial', description: 'Dolby Atmos Electric Magenta & Violet', colors: ['#12071A', '#FC3D99'] },
  { id: 'apple_sonoma_sunset', name: 'Sonoma Sunset', description: 'California Dusk Coral & Sunset Amber', colors: ['#1B1028', '#FF6B4A'] },
  { id: 'apple_alpine', name: 'Alpine Ultra', description: 'Apple Watch Ultra Trail Pine & Mint', colors: ['#0A120D', '#30D158'] },
];

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('apple_space_black');
  const [xpPopups, setXpPopups] = useState<{ id: string; amount: number; x: number; y: number }[]>([]);
  const [levelUp, setLevelUp] = useState<{ level: number; rewards: { xp: number; credits: number } } | null>(null);
  const [globalRankings, setGlobalRankings] = useState<UserProfile[]>([]);

  const [subjects, setSubjects] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexus_subjects');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SUBJECTS;
    } catch {
      return DEFAULT_SUBJECTS;
    }
  });

  const [settingsTab, setSettingsTab] = useState<'profile' | 'appearance' | 'preferences'>('profile');
  const [isThemeStudioOpen, setIsThemeStudioOpen] = useState(false);
  const [editingCustomTheme, setEditingCustomTheme] = useState<CustomThemeConfig | null>(null);
  const [customThemesList, setCustomThemesList] = useState<CustomThemeConfig[]>(() => {
    return customThemeService.getCustomThemes();
  });

  // --- TIMER STATE ---
  const [timerType, setTimerType] = useState<'stopwatch' | 'pomodoro'>(() => {
    return (localStorage.getItem('nexus_timer_type') as 'stopwatch' | 'pomodoro') || 'stopwatch';
  });
  const [timerMode, setTimerMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [timerTimeValue, setTimerTimeValue] = useState(0); 
  const [timerTotalTime, setTimerTotalTime] = useState(25 * 60);
  const [timerSubject, setTimerSubject] = useState(() => {
    return localStorage.getItem('nexus_timer_subject') || DEFAULT_SUBJECTS[0];
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('nexus_timer_muted') === 'true';
  });
  const [showAlarmToast, setShowAlarmToast] = useState(false);
  
  const timerIntervalRef = useRef<any>(null);
  const timerTargetTimeRef = useRef<number | null>(null); 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('nexus_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('nexus_timer_subject', timerSubject);
  }, [timerSubject]);

  useEffect(() => {
    localStorage.setItem('nexus_timer_muted', isMuted.toString());
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('nexus_timer_type', timerType);
  }, [timerType]);

  useEffect(() => {
    const initSession = async () => {
      try {
        const savedUser = await authService.restoreSession();
        if (savedUser) {
          setUser(savedUser);
          if (savedUser.theme) {
            setCurrentTheme(savedUser.theme);
            document.body.setAttribute('data-theme', savedUser.theme);
            if (savedUser.theme.startsWith('custom_')) {
              const customConfig = customThemeService.getCustomThemeById(savedUser.theme);
              if (customConfig) {
                customThemeService.applyCustomThemeToDOM(customConfig);
              }
            }
          }
          await dbService.updateUserStatus(savedUser.uid, 'online');
        }
      } finally {
        setIsLoading(false);
      }
    };
    initSession();

    const handleUnload = () => {
        if (user) dbService.updateUserStatus(user.uid, 'offline');
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Give "test" account unlimited credits
  useEffect(() => {
    if (user && user.name === 'test' && (user.credits || 0) < 9999999) {
      const giveUnlimitedCredits = async () => {
        await dbService.updateUserProfile(user.uid, { credits: 9999999 });
        setUser(prev => prev ? { ...prev, credits: 9999999 } : null);
      };
      giveUnlimitedCredits();
    }
  }, [user?.name, user?.credits, user?.uid]);

  useEffect(() => {
    const resetXP = async () => {
      if (!user) return;
      const hasReset = localStorage.getItem('nexus_xp_reset_done');
      if (!hasReset) {
        await dbService.resetAllUsersXP(user.uid);
        localStorage.setItem('nexus_xp_reset_done', 'true');
        setUser(prev => prev ? { ...prev, xp: 0, level: 1 } : null);
      }
    };
    resetXP();
  }, [user]);

  // --- DAILY QUESTS LOGIC ---
  const DAILY_TASK_IDEAS = [
    "Review yesterday's notes",
    "Organize study space",
    "Read 1 chapter of current book",
    "Do a 10-minute meditation",
    "Plan tomorrow's schedule",
    "Drink 2 liters of water",
    "Stretch for 5 minutes",
    "Write down 3 things you learned today",
    "Clear out email inbox",
    "Review upcoming deadlines"
  ];

  const generateDailyTasks = async (userId: string) => {
    const shuffled = [...DAILY_TASK_IDEAS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2); // pick 2 unique tasks
    
    for (const title of selected) {
      const task: Task = {
        id: crypto.randomUUID(),
        title: `Daily: ${title}`,
        subject: 'General',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
        createdAt: Date.now()
      };
      await dbService.addTask(task, userId);
    }
  };

  const generateDailyQuests = (level: number): DailyQuest[] => {
    const rewardScale = Math.max(1, Math.floor(level / 5)); 
    const diffScale = Math.max(1, Math.floor(level / 10)); // Slower difficulty scaling
    
    return [
      { 
        id: crypto.randomUUID(), 
        title: 'Deep Focus', 
        description: `Study for ${30 * diffScale} minutes`, 
        target: 30 * diffScale, 
        current: 0, 
        rewardXp: 100 * rewardScale, 
        rewardCredits: 50 * rewardScale, 
        completed: false, 
        type: 'study_time' 
      },
      { 
        id: crypto.randomUUID(), 
        title: 'Task Master', 
        description: `Complete ${2 + diffScale} tasks`, 
        target: 2 + diffScale, 
        current: 0, 
        rewardXp: 150 * rewardScale, 
        rewardCredits: 75 * rewardScale, 
        completed: false, 
        type: 'tasks_done' 
      },
      { 
        id: crypto.randomUUID(), 
        title: 'Pomodoro Streak', 
        description: `Complete ${2 + diffScale} Pomodoros`, 
        target: 2 + diffScale, 
        current: 0, 
        rewardXp: 200 * rewardScale, 
        rewardCredits: 100 * rewardScale, 
        completed: false, 
        type: 'pomodoro_count' 
      },
    ];
  };

  useEffect(() => {
    const processDailyLogin = async () => {
      if (!user) return;
      
      const today = new Date().toISOString().split('T')[0];
      const lastActive = user.lastActiveDate;
      
      let needsUpdate = false;
      const updates: Partial<UserProfile> = {};

      let newStreak = user.streak || 0;
      
      if (lastActive !== today || !user.streak) {
        needsUpdate = true;
        updates.lastActiveDate = today;
        
        if (lastActive) {
          const lastDate = new Date(lastActive);
          const todayDate = new Date(today);
          const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            if ((user.streakFreezeCount || 0) > 0) {
              updates.streakFreezeCount = (user.streakFreezeCount || 0) - 1;
              // Streak is maintained
            } else {
              newStreak = 1;
            }
          } else if (diffDays === 0) {
            newStreak = Math.max(1, newStreak);
          }
        } else {
          newStreak = 1;
        }
        
        if (newStreak !== user.streak) {
          updates.streak = newStreak;
        }
      }

      if (lastActive !== today || !user.dailyQuests || user.dailyQuests.length === 0) {
        needsUpdate = true;
        updates.dailyQuests = generateDailyQuests(user.level || 1);
        
        // Generate daily unique tasks only if it's a new day
        if (lastActive !== today) {
          await generateDailyTasks(user.uid);
        }
      }

      if (needsUpdate && Object.keys(updates).length > 0) {
        console.log("Processing daily login...", updates);
        setUser(prev => prev ? { ...prev, ...updates } : null);
        await dbService.updateUserProfile(user.uid, updates);
      }
    };
    
    if (user && !isLoading) {
      processDailyLogin();
    }
  }, [user?.uid, isLoading]);

  const refreshDailyQuests = async () => {
    if (!user) return;
    const newQuests = generateDailyQuests(user.level || 1);
    const updates: Partial<UserProfile> = { dailyQuests: newQuests };
    setUser(prev => prev ? { ...prev, ...updates } : null);
    await dbService.updateUserProfile(user.uid, updates);
    await generateDailyTasks(user.uid);
  };

  const triggerXP = async (amount: number, x?: number, y?: number) => {
    if (!user) return;
    
    audioEngine.playHaptic('pop');
    const id = crypto.randomUUID();
    setXpPopups(prev => [...prev, { id, amount, x: x || window.innerWidth / 2, y: y || window.innerHeight / 2 }]);
    setTimeout(() => setXpPopups(prev => prev.filter(p => p.id !== id)), 2000);

    const newXP = (user.xp || 0) + amount;
    const currentLevel = user.level || 1;
    const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;

    const updates: Partial<UserProfile> = { xp: newXP };
    
    if (newLevel > currentLevel) {
      audioEngine.playHaptic('levelUp');
      const rewards = { xp: 0, credits: newLevel * 50 };
      setLevelUp({ level: newLevel, rewards });
      updates.level = newLevel;
      updates.credits = (user.credits || 0) + rewards.credits;
    }

    setUser(prev => prev ? { ...prev, ...updates } : null);
    await dbService.updateUserProfile(user.uid, updates);
    checkAchievements();
  };

  const checkAchievements = async () => {
    if (!user) return;
    const badges = user.badges || [];
    const newBadges = [...badges];
    let changed = false;

    // A1: Novice Scholar (1 session)
    if (!badges.includes('a1')) {
      const sessions = await dbService.getSessions(user.uid);
      if (sessions.length >= 1) { newBadges.push('a1'); changed = true; }
    }
    // A2: Deep Diver (10 sessions)
    if (!badges.includes('a2')) {
      const sessions = await dbService.getSessions(user.uid);
      if (sessions.length >= 10) { newBadges.push('a2'); changed = true; }
    }
    // A3: Task Ninja (20 tasks)
    if (!badges.includes('a3')) {
      const tasks = await dbService.getTasks(user.uid);
      const done = tasks.filter(t => t.status === 'DONE').length;
      if (done >= 20) { newBadges.push('a3'); changed = true; }
    }
    // A4: Unstoppable (7 day streak)
    if (!badges.includes('a4') && (user.streak || 0) >= 7) {
      newBadges.push('a4'); changed = true;
    }
    // A5: Nexus Sage (Level 10)
    if (!badges.includes('a5') && (user.level || 1) >= 10) {
      newBadges.push('a5'); changed = true;
    }

    if (changed) {
      setUser(prev => prev ? { ...prev, badges: newBadges } : null);
      await dbService.updateUserProfile(user.uid, { badges: newBadges });
      triggerXP(500); // Bonus for any achievement
    }
  };

  const fetchGlobalRankings = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(10));
      const snap = await getDocs(q);
      setGlobalRankings(snap.docs.map(d => d.data() as UserProfile));
    } catch (err) {
      console.error("Failed to fetch rankings:", err);
    }
  };

  useEffect(() => {
    if (currentView === AppView.HUB) {
      fetchGlobalRankings();
    }
  }, [currentView]);

  const updateQuestProgress = async (type: DailyQuest['type'], amount: number) => {
    if (!user || !user.dailyQuests) return;

    let changed = false;
    const newQuests = user.dailyQuests.map(q => {
      if (q.type === type && !q.completed) {
        const newCurrent = Math.min(q.target, q.current + amount);
        if (newCurrent !== q.current) {
          changed = true;
          const completed = newCurrent >= q.target;
          if (completed) {
            triggerXP(q.rewardXp);
            // Credits are handled in triggerXP via level up or separately
            dbService.awardRewards(user.uid, 0, q.rewardCredits);
            setUser(prev => prev ? { ...prev, credits: (prev.credits || 0) + q.rewardCredits } : null);
          }
          return { ...q, current: newCurrent, completed };
        }
      }
      return q;
    });

    if (changed) {
      setUser(prev => prev ? { ...prev, dailyQuests: newQuests } : null);
      await dbService.updateDailyQuests(user.uid, newQuests);
    }
  };

  // Restore Timer State from LocalStorage
  useEffect(() => {
    const savedTarget = localStorage.getItem('nexus_timer_target');
    const savedActive = localStorage.getItem('nexus_timer_active') === 'true';
    const savedType = (localStorage.getItem('nexus_timer_type') as 'stopwatch' | 'pomodoro') || 'stopwatch';
    const savedMode = (localStorage.getItem('nexus_timer_mode') as any) || 'focus';
    const savedValue = parseInt(localStorage.getItem('nexus_timer_value') || '0');
    const savedTotal = parseInt(localStorage.getItem('nexus_timer_total') || '1500');

    setTimerType(savedType);
    setTimerMode(savedMode);
    setTimerTotalTime(savedTotal);

    if (savedActive && savedTarget) {
      const targetTime = parseInt(savedTarget);
      timerTargetTimeRef.current = targetTime;
      setTimerIsActive(true);
      
      if (savedType === 'pomodoro') {
        const remaining = Math.round((targetTime - Date.now()) / 1000);
        if (remaining > 0) {
          setTimerTimeValue(remaining);
        } else {
          handleTimerComplete();
        }
      } else {
        const elapsed = Math.round((Date.now() - targetTime) / 1000);
        setTimerTimeValue(elapsed);
      }
    } else {
      setTimerTimeValue(savedValue);
      setTimerIsActive(false);
    }
  }, []);

  // Timer Tick Logic
  useEffect(() => {
    if (timerIsActive) {
      timerIntervalRef.current = setInterval(() => {
        if (timerTargetTimeRef.current) {
          if (timerType === 'pomodoro') {
            const remaining = Math.max(0, Math.round((timerTargetTimeRef.current - Date.now()) / 1000));
            setTimerTimeValue(remaining);
            if (remaining <= 0) handleTimerComplete();
          } else {
            const elapsed = Math.max(0, Math.round((Date.now() - timerTargetTimeRef.current) / 1000));
            setTimerTimeValue(elapsed);
          }
        }
      }, 500);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerIsActive, timerType]);

  const playFeedbackSound = (type: 'start' | 'stop' | 'complete' | 'break') => {
    if (isMuted) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number, volume: number = 0.2, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    switch (type) {
      case 'start':
        playTone(440, now, 0.4);
        playTone(880, now + 0.1, 0.4);
        break;
      case 'stop':
        playTone(440, now, 0.5);
        playTone(220, now + 0.1, 0.6);
        break;
      case 'break':
        playTone(523.25, now, 1.0, 0.1);
        playTone(659.25, now + 0.1, 1.0, 0.05);
        break;
      case 'complete':
        playTone(880, now, 1);
        playTone(1108, now + 0.2, 1);
        playTone(1318, now + 0.4, 1);
        playTone(1760, now + 0.6, 1.5);
        break;
    }
  };

  const handleTimerComplete = async () => {
    setTimerIsActive(false);
    setTimerTimeValue(0);
    localStorage.removeItem('nexus_timer_active');
    localStorage.removeItem('nexus_timer_target');
    localStorage.setItem('nexus_timer_value', '0');
    
    playFeedbackSound('complete');
    setShowAlarmToast(true);

    if (timerType === 'pomodoro' && timerMode === 'focus' && user) {
        await saveSession(timerTotalTime);
        await dbService.updateUserStatus(user.uid, 'break');
        
        // Gamification: Award XP for completed Pomodoro
        const xpAmount = Math.floor(timerTotalTime / 60) * 2; // 2 XP per minute
        triggerXP(xpAmount);
        updateQuestProgress('pomodoro_count', 1);
        updateQuestProgress('study_time', Math.floor(timerTotalTime / 60));
    }
  };

  const saveSession = async (durationSecs: number) => {
    if (!user || durationSecs < 1) return;
    try {
        const xpAmount = Math.floor(durationSecs / 60) * 2;
        if (timerType === 'stopwatch') {
          triggerXP(xpAmount);
          updateQuestProgress('study_time', Math.floor(durationSecs / 60));
        }
        await dbService.logSession({
            id: crypto.randomUUID(),
            userId: user.uid,
            subject: timerSubject,
            duration: durationSecs,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
        });
        await dbService.logActivity({
            userId: user.uid,
            userName: user.name,
            type: 'session_completed',
            subject: timerSubject,
            duration: durationSecs
        });
    } catch (err) {
        console.error("Failed to save session:", err);
    }
  };

  const handleManualEnd = async () => {
      if (!user) return;
      const duration = timerType === 'pomodoro' ? (timerTotalTime - timerTimeValue) : timerTimeValue;
      
      setTimerIsActive(false);
      localStorage.removeItem('nexus_timer_active');
      localStorage.removeItem('nexus_timer_target');
      
      if (timerMode === 'focus' && duration > 1) {
          await saveSession(duration);
      }
      
      resetToDefault();
      await dbService.updateUserStatus(user.uid, 'online');
      playFeedbackSound('stop');
  };

  const resetToDefault = () => {
    if (timerType === 'stopwatch') {
      setTimerTimeValue(0);
      localStorage.setItem('nexus_timer_value', '0');
    } else {
      const settings = JSON.parse(localStorage.getItem('nexus_timer_settings') || '{"focus": 25, "short": 5, "long": 15}');
      const dur = settings[timerMode] * 60;
      setTimerTimeValue(dur);
      setTimerTotalTime(dur);
      localStorage.setItem('nexus_timer_value', dur.toString());
      localStorage.setItem('nexus_timer_total', dur.toString());
    }
  };

  const handleStartTimer = (value: number, type: 'stopwatch' | 'pomodoro', mode: string, subject: string) => {
    const isPomodoro = type === 'pomodoro';
    const target = isPomodoro ? (Date.now() + value * 1000) : (Date.now() - value * 1000);
    
    timerTargetTimeRef.current = target;
    localStorage.setItem('nexus_timer_active', 'true');
    localStorage.setItem('nexus_timer_target', target.toString());
    localStorage.setItem('nexus_timer_type', type);
    localStorage.setItem('nexus_timer_mode', mode);
    localStorage.setItem('nexus_timer_subject', subject);
    localStorage.setItem('nexus_timer_total', timerTotalTime.toString());
    
    setTimerTimeValue(value);
    setTimerIsActive(true);
    setTimerType(type);
    setTimerMode(mode as any);
    setTimerSubject(subject);

    if (mode === 'focus') {
      playFeedbackSound('start');
      if (user) {
        dbService.updateUserStatus(user.uid, 'studying', subject);
        dbService.logActivity({
          userId: user.uid,
          userName: user.name,
          type: 'session_started',
          subject: subject
        });
      }
    } else {
      playFeedbackSound('break');
      if (user) {
        dbService.updateUserStatus(user.uid, 'break', 'Break');
      }
    }
  };

  const handleStopTimer = () => {
    setTimerIsActive(false);
    localStorage.removeItem('nexus_timer_active');
    localStorage.removeItem('nexus_timer_target');
    localStorage.setItem('nexus_timer_value', timerTimeValue.toString());
    
    if (user) dbService.updateUserStatus(user.uid, 'online');
    playFeedbackSound('stop');
  };

  const handleResetTimer = (value: number) => {
    setTimerIsActive(false);
    localStorage.removeItem('nexus_timer_active');
    localStorage.removeItem('nexus_timer_target');
    setTimerTimeValue(value);
    if (timerType === 'pomodoro') setTimerTotalTime(value);
    localStorage.setItem('nexus_timer_value', value.toString());
    localStorage.setItem('nexus_timer_total', value.toString());
    playFeedbackSound('stop');
  };

  const handleLogin = async (newUser: UserProfile) => {
    const userWithGamification = {
      ...newUser,
      xp: newUser.xp || 0,
      level: newUser.level || 1,
      credits: newUser.credits || 0,
      unlockedThemes: newUser.unlockedThemes || ['default']
    };
    
    setUser(userWithGamification);

    if (newUser.theme) {
      setCurrentTheme(newUser.theme);
      document.body.setAttribute('data-theme', newUser.theme);
      if (newUser.theme.startsWith('custom_')) {
        const customConfig = customThemeService.getCustomThemeById(newUser.theme);
        if (customConfig) {
          customThemeService.applyCustomThemeToDOM(customConfig);
        }
      }
    }
    setCurrentView(AppView.DASHBOARD);
    dbService.updateUserStatus(newUser.uid, 'online');
  };

  const handleLogout = () => {
    if (user) dbService.updateUserStatus(user.uid, 'offline');
    authService.logout();
    setUser(null);
  };

  const handleUpdateAvatar = async (url: string) => {
    if (!user) return;
    const updatedUser = { ...user, avatar: url };
    setUser(updatedUser);
    await dbService.updateUserProfile(user.uid, { avatar: url });
  };

  const handleUpdateTheme = async (theme: AppTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem('nexus_app_theme', theme);
    document.body.setAttribute('data-theme', theme);
    if (theme.startsWith('custom_')) {
      const customConfig = customThemeService.getCustomThemeById(theme);
      if (customConfig) {
        customThemeService.applyCustomThemeToDOM(customConfig);
      }
    } else {
      customThemeService.removeCustomThemeFromDOM();
    }
    if (user) {
      const updatedUser = { ...user, theme };
      setUser(updatedUser);
      await dbService.updateUserProfile(user.uid, { theme });
    }
  };

  if (isLoading) {
     return (
        <div className="flex h-screen w-screen items-center justify-center bg-nexus-black text-white">
           <div className="w-12 h-12 border-4 border-nexus-electric border-t-transparent rounded-full animate-spin" />
        </div>
     );
  }

  if (!user) return <Login onLogin={handleLogin} currentTheme={currentTheme} onUpdateTheme={handleUpdateTheme} />;

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return (
        <Dashboard 
          user={user} 
          onViewChange={setCurrentView} 
          onTriggerXP={triggerXP} 
          onUpdateQuest={updateQuestProgress} 
          subjects={subjects}
          setSubjects={setSubjects}
          globalTimer={{
            isActive: timerIsActive,
            timeValue: timerTimeValue,
            totalTime: timerTotalTime,
            type: timerType,
            mode: timerMode,
            subject: timerSubject,
            isMuted: isMuted,
            setIsMuted: setIsMuted,
            start: handleStartTimer,
            stop: handleStopTimer,
            reset: handleResetTimer,
            manualEnd: handleManualEnd,
            setType: setTimerType,
            setMode: setTimerMode,
            setSubject: setTimerSubject
          }}
          onRefreshQuests={refreshDailyQuests}
        />
      );
      case AppView.TASKS: return <TaskManager user={user} onTriggerXP={triggerXP} onUpdateQuest={updateQuestProgress} />;
      case AppView.SCHEDULE: return <SmartSchedule user={user} subjects={subjects} setSubjects={setSubjects} />;
      case AppView.TIMER: return (
        <FocusTimer 
          user={user} 
          subjects={subjects}
          setSubjects={setSubjects}
          onTriggerXP={triggerXP}
          onUpdateQuest={updateQuestProgress}
          globalTimer={{
            isActive: timerIsActive,
            timeValue: timerTimeValue,
            totalTime: timerTotalTime,
            type: timerType,
            mode: timerMode,
            subject: timerSubject,
            isMuted: isMuted,
            setIsMuted: setIsMuted,
            start: handleStartTimer,
            stop: handleStopTimer,
            reset: handleResetTimer,
            manualEnd: handleManualEnd,
            setType: setTimerType,
            setMode: setTimerMode,
            setSubject: setTimerSubject
          }} 
        />
      );
      case AppView.HUB: return <NexusHub user={user} />;
      case AppView.SHOP: return (
        <NexusShop 
          user={user} 
          onViewGallery={(id) => {
            // Unused
          }}
          onPurchase={(item) => {
            // User state is updated inside NexusShop via dbService and onPurchase callback
            // But we need to refresh the local user state to show new credits/themes
            setUser(prev => {
              if (!prev) return null;
              const updates: any = { credits: prev.credits - item.price };
              if (item.type === 'theme') {
                updates.unlockedThemes = [...(prev.unlockedThemes || []), item.value];
                // Also apply the theme immediately if it's a theme purchase
                handleUpdateTheme(item.value as AppTheme);
              } else if (item.type === 'badge') {
                updates.unlockedBadges = [...(prev.unlockedBadges || []), item.value];
              } else if (item.type === 'sound_pack') {
                updates.unlockedSoundPacks = [...(prev.unlockedSoundPacks || []), item.value];
              } else if (item.type === 'avatar_border') {
                updates.unlockedAvatarBorders = [...(prev.unlockedAvatarBorders || []), item.value];
              } else if (item.type === 'profile_deco') {
                updates.unlockedProfileDecos = [...(prev.unlockedProfileDecos || []), item.value];
              } else if (item.type === 'streak_freeze') {
                updates.streakFreezeCount = (prev.streakFreezeCount || 0) + 1;
              }
              return { ...prev, ...updates };
            });
          }} 
        />
      );
      case AppView.ACHIEVEMENTS: return <Achievements user={user} />;
      case AppView.DAILY_QUESTS: return <DailyQuests user={user} onUpdateQuest={updateQuestProgress} onRefresh={refreshDailyQuests} />;
      case AppView.TUTOR: return <AITutor user={user} />;
      case AppView.ANALYTICS: return <Analytics user={user} />;
      case AppView.SETTINGS: return (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in p-8 pb-32 overflow-y-auto h-full custom-scrollbar">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">System Configuration</h2>
                    <p className="text-zinc-500 text-sm mt-1">Manage your identity and visual experience.</p>
                  </div>
                  <div className="flex gap-2 bg-nexus-card/40 p-1.5 rounded-2xl border border-nexus-border backdrop-blur-md shadow-sm">
                    <button 
                      onClick={() => setSettingsTab('profile')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settingsTab === 'profile' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Profile
                    </button>
                    <button 
                      onClick={() => setSettingsTab('appearance')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settingsTab === 'appearance' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Appearance
                    </button>
                    <button 
                      onClick={() => setSettingsTab('preferences')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settingsTab === 'preferences' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Preferences
                    </button>
                  </div>
              </header>

              {settingsTab === 'preferences' && (
                <div className="space-y-6">
                  {/* Daily Goal Objective */}
                  <div className="p-8 rounded-3xl bg-nexus-card/60 border border-nexus-border space-y-6 backdrop-blur-md animate-fade-in shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-sm">
                              <Target className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Daily Objective</h3>
                              <p className="text-xs text-zinc-500">Set your daily focus target in minutes.</p>
                          </div>
                      </div>
                      <div className="max-w-xs">
                          <div className="relative group">
                              <input 
                                type="number" 
                                 value={user.dailyGoalMinutes || 60}
                                 onChange={async (e) => {
                                   const val = parseInt(e.target.value) || 0;
                                   setUser(prev => prev ? { ...prev, dailyGoalMinutes: val } : null);
                                   await dbService.updateUserProfile(user.uid, { dailyGoalMinutes: val });
                                 }}
                                className="w-full bg-nexus-black/50 border border-nexus-border rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 outline-none transition-all font-bold text-xl shadow-inner"
                              />
                              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest pointer-events-none">Minutes</span>
                          </div>
                      </div>
                  </div>

                  {/* Dynamic Island Overlay Toggle */}
                  <div className="p-8 rounded-3xl bg-nexus-card/60 border border-nexus-border space-y-6 backdrop-blur-md animate-fade-in shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-nexus-electric/10 border border-nexus-electric/20 flex items-center justify-center shadow-sm">
                                  <Radio className="w-6 h-6 text-nexus-electric" />
                              </div>
                              <div>
                                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">Dynamic Island Overlay</h3>
                                  <p className="text-xs text-zinc-400 mt-0.5">Minimized floating notch at top center for live study session HUD and audio controls.</p>
                              </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const next = user.enableDynamicIsland === false ? true : false;
                              setUser(prev => prev ? { ...prev, enableDynamicIsland: next } : null);
                              await dbService.updateUserProfile(user.uid, { enableDynamicIsland: next });
                            }}
                            className={`px-5 py-2.5 rounded-2xl font-bold text-xs transition-all squish ${
                              user.enableDynamicIsland !== false
                                ? 'bg-nexus-electric text-black shadow-lg'
                                : 'bg-white/10 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {user.enableDynamicIsland !== false ? 'Enabled' : 'Disabled'}
                          </button>
                      </div>
                  </div>
                </div>
              )}

              {settingsTab === 'profile' && (
                <>
                  <div className="p-8 rounded-3xl bg-nexus-card/60 border border-nexus-border space-y-8 backdrop-blur-md animate-fade-in shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-nexus-electric/10 border border-nexus-electric/20 flex items-center justify-center shadow-sm">
                              <UserIcon className="w-6 h-6 text-nexus-electric" />
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Identity Presence</h3>
                              <p className="text-xs text-zinc-500">How you appear to the community.</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                          {AVATAR_PRESETS.map((preset, idx) => {
                              const url = `https://api.dicebear.com/7.x/${preset.style}/svg?seed=${preset.seed}&backgroundColor=transparent`;
                              const isActive = user.avatar === url;
                              return (
                                  <button 
                                    key={idx}
                                    onClick={() => handleUpdateAvatar(url)}
                                    className={`relative aspect-square rounded-2xl border-2 transition-all p-1 group ${isActive ? 'border-nexus-electric bg-nexus-electric/10 shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.3)]' : 'border-nexus-border bg-nexus-black/50 hover:border-nexus-electric/50 hover:bg-nexus-card/50'}`}
                                  >
                                      <img src={url} className="w-full h-full rounded-xl transition-transform group-hover:scale-110" alt="Avatar option" />
                                      {isActive && (
                                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-nexus-electric rounded-full flex items-center justify-center border-4 border-nexus-black animate-scale-in shadow-xl">
                                              <Check className="w-3 h-3 text-white stroke-[4px]" />
                                          </div>
                                      )}
                                  </button>
                              );
                          })}
                      </div>
                  </div>

                  <div className="p-8 rounded-3xl bg-nexus-card/60 border border-nexus-border space-y-8 backdrop-blur-md animate-fade-in shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-sm">
                              <Award className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Profile Customization</h3>
                              <p className="text-xs text-zinc-500">Equip your badges, borders, and profile decos.</p>
                          </div>
                      </div>

                      <div className="space-y-8">
                        {/* Badges */}
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Active Badge</h4>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={async () => {
                                setUser(prev => prev ? { ...prev, activeBadge: undefined } : null);
                                await dbService.updateUserProfile(user.uid, { activeBadge: null });
                              }}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${!user.activeBadge ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                            >
                              None
                            </button>
                            {(user.unlockedBadges || []).map(badge => (
                              <button
                                key={badge}
                                onClick={async () => {
                                  setUser(prev => prev ? { ...prev, activeBadge: badge } : null);
                                  await dbService.updateUserProfile(user.uid, { activeBadge: badge });
                                }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all capitalize shadow-sm ${user.activeBadge === badge ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                              >
                                {badge}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Avatar Borders */}
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Avatar Border</h4>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={async () => {
                                setUser(prev => prev ? { ...prev, activeAvatarBorder: undefined } : null);
                                await dbService.updateUserProfile(user.uid, { activeAvatarBorder: null });
                              }}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${!user.activeAvatarBorder ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                            >
                              None
                            </button>
                            {(user.unlockedAvatarBorders || []).map(border => (
                              <button
                                key={border}
                                onClick={async () => {
                                  setUser(prev => prev ? { ...prev, activeAvatarBorder: border } : null);
                                  await dbService.updateUserProfile(user.uid, { activeAvatarBorder: border });
                                }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all capitalize shadow-sm ${user.activeAvatarBorder === border ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                              >
                                {border}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Profile Decos */}
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Profile Deco</h4>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={async () => {
                                setUser(prev => prev ? { ...prev, activeProfileDeco: undefined } : null);
                                await dbService.updateUserProfile(user.uid, { activeProfileDeco: null });
                              }}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${!user.activeProfileDeco ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                            >
                              None
                            </button>
                            {(user.unlockedProfileDecos || []).map(deco => (
                              <button
                                key={deco}
                                onClick={async () => {
                                  setUser(prev => prev ? { ...prev, activeProfileDeco: deco } : null);
                                  await dbService.updateUserProfile(user.uid, { activeProfileDeco: deco });
                                }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all capitalize shadow-sm ${user.activeProfileDeco === deco ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                              >
                                {deco}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                  </div>
                </>
              )}

              {settingsTab === 'appearance' && (
                <>
                  <div className="p-8 rounded-[2.5rem] liquid-glass-card border border-white/12 space-y-8 backdrop-blur-2xl animate-fade-in shadow-xl">
                      {/* Custom Theme Studio Launch Banner */}
                      <div className="p-6 sm:p-7 rounded-[2rem] bg-gradient-to-r from-nexus-electric/15 via-purple-500/10 to-transparent border border-nexus-electric/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg shrink-0">
                            <Sliders className="w-6 h-6 text-nexus-electric" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-black text-white">Custom Liquid Theme Studio</h4>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-nexus-electric/20 text-nexus-electric border border-nexus-electric/30">
                                Pro
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 max-w-lg leading-relaxed">
                              Design your own Apple & Samsung aesthetic. Pick custom shades for canvas, cards, text, and accents, or refine liquid frosted optics and blur depth.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            audioEngine.playHaptic('click');
                            setEditingCustomTheme(null);
                            setIsThemeStudioOpen(true);
                          }}
                          className="px-6 py-3 rounded-2xl bg-white text-black font-black text-xs transition-all shadow-xl hover:bg-zinc-200 squish flex items-center gap-2 shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3px]" />
                          <span>Create Custom Theme</span>
                        </button>
                      </div>

                      {/* My Custom Creations (if any exist) */}
                      {customThemesList.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-nexus-electric" />
                              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">My Custom Creations</h4>
                            </div>
                            <span className="text-[11px] text-zinc-500 font-medium">{customThemesList.length} custom themes</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {customThemesList.map((custom) => {
                              const isActive = currentTheme === custom.id;
                              return (
                                <div
                                  key={custom.id}
                                  onClick={() => {
                                    audioEngine.playHaptic('pop');
                                    handleUpdateTheme(custom.id);
                                  }}
                                  className={`p-5 rounded-3xl border transition-all text-left flex flex-col gap-4 group relative overflow-hidden cursor-pointer squish ${
                                    isActive
                                      ? 'bg-nexus-electric/15 border-nexus-electric shadow-[0_0_24px_rgba(var(--nexus-accent-rgb),0.3)] ring-1 ring-nexus-electric/40'
                                      : 'liquid-glass border-white/10 hover:border-white/20 hover:bg-white/5'
                                  }`}
                                >
                                  <div className="flex justify-between items-center relative z-10">
                                    <div 
                                      className="w-10 h-10 rounded-2xl border border-white/15 flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
                                      style={{ backgroundColor: custom.bg }}
                                    >
                                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: custom.accent }} />
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {isActive && (
                                        <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                        </div>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          audioEngine.playHaptic('click');
                                          setEditingCustomTheme(custom);
                                          setIsThemeStudioOpen(true);
                                        }}
                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all"
                                        title="Edit Theme"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          audioEngine.playHaptic('pop');
                                          customThemeService.deleteCustomTheme(custom.id);
                                          setCustomThemesList(customThemeService.getCustomThemes());
                                          if (currentTheme === custom.id) {
                                            handleUpdateTheme('apple_space_black');
                                          }
                                        }}
                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all"
                                        title="Delete Theme"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="relative z-10">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-black text-white group-hover:text-nexus-electric transition-colors">{custom.name}</p>
                                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/70">Custom</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 font-medium mt-0.5 leading-snug">
                                      Blur: {custom.glassBlur}px • Accent: {custom.accent}
                                    </p>
                                  </div>
                                  <div 
                                    className="absolute -bottom-6 -right-6 w-24 h-24 transition-opacity opacity-15 group-hover:opacity-25 pointer-events-none rounded-full blur-xl"
                                    style={{ backgroundColor: custom.accent }} 
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Apple Design Editions Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-nexus-electric/15 border border-nexus-electric/30 flex items-center justify-center shadow-sm">
                                <Palette className="w-6 h-6 text-nexus-electric" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Apple Design Editions</h3>
                                <p className="text-xs text-zinc-400 mt-0.5">Hardware & OS inspired finishes (iOS 18, macOS Sequoia, Apple Watch).</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {THEMES.map((theme) => {
                            const isActive = currentTheme === theme.id;
                            return (
                              <div
                                key={theme.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                  audioEngine.playHaptic('pop');
                                  handleUpdateTheme(theme.id);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    audioEngine.playHaptic('pop');
                                    handleUpdateTheme(theme.id);
                                  }
                                }}
                                className={`
                                  p-5 rounded-3xl border transition-all text-left flex flex-col gap-4 group relative overflow-hidden cursor-pointer squish
                                  ${isActive 
                                    ? 'bg-nexus-electric/15 border-nexus-electric shadow-[0_0_24px_rgba(var(--nexus-accent-rgb),0.3)] ring-1 ring-nexus-electric/40' 
                                    : 'liquid-glass border-white/10 hover:border-white/20 hover:bg-white/5'}
                                `}
                              >
                                <div className="flex justify-between items-center relative z-10">
                                  <div className="w-10 h-10 rounded-2xl border border-white/15 flex items-center justify-center shadow-md transition-transform group-hover:scale-105" style={{ backgroundColor: theme.colors[0] }}>
                                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: theme.colors[1] }} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        audioEngine.playHaptic('click');
                                        const customized = customThemeService.createFromPreset(theme.id, `${theme.name} Custom`);
                                        setEditingCustomTheme(customized);
                                        setIsThemeStudioOpen(true);
                                      }}
                                      className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 text-[10px] font-bold text-zinc-400 hover:text-white transition-all flex items-center gap-1 border border-white/10"
                                      title="Edit this preset in Theme Studio"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      <span>Tweak</span>
                                    </button>
                                    {isActive && (
                                      <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="relative z-10">
                                  <p className="text-sm font-black text-white group-hover:text-nexus-electric transition-colors">{theme.name}</p>
                                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5 leading-snug">{theme.description}</p>
                                </div>
                                <div className="absolute -bottom-6 -right-6 w-24 h-24 transition-opacity opacity-10 group-hover:opacity-20 pointer-events-none rounded-full blur-xl" style={{ backgroundColor: theme.colors[1] }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                  </div>
                </>
              )}
          </div>
      );
      default: return (
        <Dashboard 
          user={user} 
          onViewChange={setCurrentView} 
          onTriggerXP={triggerXP} 
          onUpdateQuest={updateQuestProgress} 
          subjects={subjects}
          setSubjects={setSubjects}
          globalTimer={{
            isActive: timerIsActive,
            timeValue: timerTimeValue,
            totalTime: timerTotalTime,
            type: timerType,
            mode: timerMode,
            subject: timerSubject,
            isMuted: isMuted,
            setIsMuted: setIsMuted,
            start: handleStartTimer,
            stop: handleStopTimer,
            reset: handleResetTimer,
            manualEnd: handleManualEnd,
            setType: setTimerType,
            setMode: setTimerMode,
            setSubject: setTimerSubject
          }}
          onRefreshQuests={refreshDailyQuests}
        />
      );
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden bg-nexus-black text-zinc-100 font-sans transition-all duration-1000 relative selection:bg-nexus-electric selection:text-white`}>
      {/* Liquid Ambient Organic Floating Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="blob-1 absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-nexus-electric/15 blur-[140px] opacity-70" />
        <div className="blob-2 absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-nexus-violet/15 blur-[150px] opacity-60" />
        <div className="absolute top-[35%] left-[30%] w-[35vw] h-[35vw] rounded-full bg-indigo-500/8 blur-[160px] opacity-40" />
      </div>
      <div className={`fixed inset-0 bg-gradient-to-tr from-nexus-electric/5 via-transparent to-transparent pointer-events-none z-0`} />
      {isCommandPaletteOpen && (
        <CommandPalette 
          onClose={() => setIsCommandPaletteOpen(false)} 
          onNavigate={(v) => {
            setCurrentView(v);
            setIsCommandPaletteOpen(false);
          }}
        />
      )}
      {showAlarmToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] animate-slide-up">
            <div className="bg-nexus-electric text-white px-8 py-4 rounded-2xl shadow-[0_0_50px_rgba(var(--nexus-accent-rgb),0.5)] border border-nexus-violet/50 flex items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center animate-bounce">
                    <BellRing className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-lg leading-tight text-white">Session Complete</h4>
                    <p className="text-white/70 text-sm">Time for a well-deserved break.</p>
                </div>
                <button onClick={() => setShowAlarmToast(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-5 h-5 text-white" />
                </button>
            </div>
        </div>
      )}
      {/* Apple Dynamic Island Floating HUD */}
      <DynamicIsland 
        user={user}
        timer={{
          isActive: timerIsActive,
          timeValue: timerTimeValue,
          totalTime: timerTotalTime,
          type: timerType,
          mode: timerMode,
          subject: timerSubject,
          start: () => handleStartTimer(timerTimeValue > 0 ? timerTimeValue : (timerType === 'pomodoro' ? timerTotalTime : 0), timerType, timerMode, timerSubject),
          stop: handleStopTimer,
          reset: () => handleResetTimer(timerType === 'pomodoro' ? timerTotalTime : 0)
        }}
        onNavigate={setCurrentView}
      />

      <div className="relative z-50 h-full">
        <Sidebar 
            user={user}
            currentView={currentView} 
            onChangeView={setCurrentView} 
            onLogout={handleLogout} 
            activeTimerMins={timerIsActive ? Math.ceil(timerTimeValue / 60) : (timerType === 'pomodoro' && timerTimeValue < timerTotalTime ? Math.ceil(timerTimeValue/60) : null)}
        />
      </div>
      <GamificationOverlay 
        levelUp={levelUp} 
        onCloseLevelUp={() => setLevelUp(null)} 
        xpPopups={xpPopups} 
      />
      {isThemeStudioOpen && (
        <CustomThemeStudio
          initialTheme={editingCustomTheme}
          activeAppTheme={currentTheme}
          onClose={() => {
            setIsThemeStudioOpen(false);
            setEditingCustomTheme(null);
          }}
          onSave={(theme, shouldApply) => {
            setCustomThemesList(customThemeService.getCustomThemes());
            if (shouldApply) {
              handleUpdateTheme(theme.id);
            }
            setIsThemeStudioOpen(false);
            setEditingCustomTheme(null);
          }}
        />
      )}
      <main className="flex-1 h-full relative z-10 overflow-hidden">
        <div className="h-full w-full p-3 md:p-6">{renderView()}</div>
      </main>
    </div>
  );
};

export default App;
