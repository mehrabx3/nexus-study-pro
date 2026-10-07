import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Radio, 
  Trophy, 
  Users, 
  Flame, 
  Play, 
  Clock, 
  Sparkles, 
  Plus, 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  X, 
  Search, 
  BookOpen, 
  ChevronRight, 
  ArrowLeft,
  Crown,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import { UserProfile, StudyGroup, GroupMessage, StudySession, ActivityLog } from '../types';
import { dbService } from '../services/dbService';
import { audioEngine } from '../services/audioService';
import { collection, query, orderBy, onSnapshot, doc, limit, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { LiquidSelect } from './LiquidSelect';

interface NexusHubProps {
  user: UserProfile;
}

type HubTab = 'live_room' | 'leaderboard' | 'groups';

// Format duration in simple English
export const formatDurationSimple = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '1 min';
  const totalMins = Math.round(seconds / 60);
  if (totalMins < 60) {
    return `${Math.max(1, totalMins)} ${totalMins <= 1 ? 'min' : 'mins'}`;
  }
  const hours = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;
  if (remainingMins === 0) {
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  }
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ${remainingMins} mins`;
};

// Relative time formatter in simple English
const formatTimeAgo = (timestamp: number): string => {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const NexusHub: React.FC<NexusHubProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<HubTab>('live_room');
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<'today' | 'week' | 'all_time'>('all_time');
  
  const [currentUserData, setCurrentUserData] = useState<UserProfile>(user);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPrivacy, setNewGroupPrivacy] = useState('public');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Quick sprint widget state
  const [quickSubject, setQuickSubject] = useState('Math');
  const [quickDuration, setQuickDuration] = useState('25');
  const [isStartingSprint, setIsStartingSprint] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync Data from Firestore
  useEffect(() => {
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data() as UserProfile;
      if (data) setCurrentUserData(data);
    });

    const unsubAllUsers = onSnapshot(query(collection(db, 'users'), limit(50)), (snap) => {
      setAllUsers(snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)));
    });

    const unsubSessions = onSnapshot(query(collection(db, 'sessions'), orderBy('timestamp', 'desc'), limit(500)), (snap) => {
      setAllSessions(snap.docs.map(d => d.data() as StudySession));
    });

    const unsubMyGroups = onSnapshot(query(collection(db, 'groups'), where("members", "array-contains", user.uid)), (snap) => {
      setMyGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGroup)));
    });

    const unsubPublicGroups = onSnapshot(query(collection(db, 'groups'), where("isPublic", "==", true)), (snap) => {
      setPublicGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGroup)));
    });

    const unsubActivities = onSnapshot(query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(30)), (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
    });

    return () => { 
      unsubUser(); 
      unsubAllUsers(); 
      unsubSessions();
      unsubMyGroups(); 
      unsubPublicGroups(); 
      unsubActivities();
    };
  }, [user.uid]);

  // Sync group chat when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;
    const unsubMessages = onSnapshot(
      query(collection(db, 'groups', selectedGroup.id, 'messages'), orderBy('timestamp', 'asc'), limit(60)),
      (snap) => {
        setGroupMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupMessage)));
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    );
    return () => unsubMessages();
  }, [selectedGroup]);

  // Online / studying peers
  const onlinePeers = useMemo(() => {
    return allUsers.filter(u => u.uid !== user.uid && u.status && u.status !== 'offline');
  }, [allUsers, user.uid]);

  // Community summary metrics
  const communityStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = allSessions.filter(s => s.date === todayStr);
    const totalTodayMins = todaySessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
    const totalTodayHours = (totalTodayMins / 60).toFixed(1);

    const subjectCounts: Record<string, number> = {};
    todaySessions.forEach(s => {
      if (s.subject) {
        subjectCounts[s.subject] = (subjectCounts[s.subject] || 0) + (s.duration || 0);
      }
    });

    let topSubject = 'General';
    let topMax = 0;
    Object.entries(subjectCounts).forEach(([subj, count]) => {
      if (count > topMax) {
        topMax = count;
        topSubject = subj;
      }
    });

    const activeCount = onlinePeers.filter(p => p.status === 'studying').length + (currentUserData.status === 'studying' ? 1 : 0);

    return {
      activeNow: Math.max(1, activeCount),
      totalHoursToday: totalTodayHours,
      topSubjectToday: topSubject
    };
  }, [allSessions, onlinePeers, currentUserData.status]);

  // Leaderboard ranking computation
  const rankings = useMemo(() => {
    const now = Date.now();
    let lowerBound = 0;
    if (leaderboardTimeframe === 'today') {
      lowerBound = now - (24 * 60 * 60 * 1000);
    } else if (leaderboardTimeframe === 'week') {
      lowerBound = now - (7 * 24 * 60 * 60 * 1000);
    }

    return allUsers.map(u => {
      const userSessions = allSessions.filter(s => s.userId === u.uid);
      let totalMins = 0;
      if (leaderboardTimeframe === 'all_time') {
        totalMins = userSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
      } else {
        totalMins = userSessions
          .filter(s => s.timestamp >= lowerBound)
          .reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
      }
      return {
        ...u,
        totalHours: Number((totalMins / 60).toFixed(1))
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
  }, [allUsers, allSessions, leaderboardTimeframe]);

  // Create Group Handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    audioEngine.playHaptic('success');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await dbService.createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || 'A study group for focused learners.',
        isPublic: newGroupPrivacy === 'public',
        ownerId: user.uid,
        members: [user.uid],
        groupCode: code,
        createdAt: Date.now()
      });
      await dbService.logActivity({
        userId: user.uid,
        userName: user.name,
        type: 'created_group',
        subject: newGroupName.trim()
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreateGroupModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Join Group Handler
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    audioEngine.playHaptic('click');
    try {
      await dbService.joinGroupByCode(user.uid, joinCodeInput.trim().toUpperCase());
      await dbService.logActivity({
        userId: user.uid,
        userName: user.name,
        type: 'joined_group'
      });
      setJoinCodeInput('');
    } catch (err: any) {
      alert(err.message || 'Could not join group with this code.');
    }
  };

  // Send Group Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedGroup) return;
    audioEngine.playHaptic('pop');
    const text = chatInput.trim();
    setChatInput('');
    try {
      await dbService.sendGroupMessage(selectedGroup.id, {
        senderId: user.uid,
        senderName: user.name,
        text,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Sprint Start
  const handleStartQuickSprint = async () => {
    audioEngine.playHaptic('success');
    setIsStartingSprint(true);
    const durationMins = parseInt(quickDuration) || 25;
    const durationSecs = durationMins * 60;
    
    // Set user to studying and log activity in exact format
    await dbService.updateUserStatus(user.uid, 'studying', quickSubject);
    await dbService.logActivity({
      userId: user.uid,
      userName: user.name,
      type: 'session_started',
      subject: quickSubject
    });

    // Save session in localStorage so timer activates
    localStorage.setItem('nexus_timer_active', 'true');
    localStorage.setItem('nexus_timer_target', (Date.now() + durationSecs * 1000).toString());
    localStorage.setItem('nexus_timer_type', 'pomodoro');
    localStorage.setItem('nexus_timer_mode', 'focus');
    localStorage.setItem('nexus_timer_subject', quickSubject);
    localStorage.setItem('nexus_timer_total', durationSecs.toString());
    localStorage.setItem('nexus_timer_value', durationSecs.toString());

    setTimeout(() => {
      setIsStartingSprint(false);
      window.location.reload();
    }, 400);
  };

  const copyGroupCode = (code: string) => {
    audioEngine.playHaptic('click');
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="h-full flex flex-col text-white animate-fade-in relative overflow-y-auto custom-scrollbar pb-24 px-1 space-y-7">
      
      {/* Top Header & Simple Tab Switcher */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-2 shrink-0 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Radio className="w-7 h-7 text-nexus-electric animate-pulse" />
            Live Study Arena
          </h1>
          <p className="text-zinc-400 text-xs font-medium mt-1">
            Study together in real time, see who is focusing, and compete on the leaderboard.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl liquid-glass border border-white/10 w-fit">
          <button
            type="button"
            onClick={() => {
              audioEngine.playHaptic('click');
              setSelectedGroup(null);
              setActiveTab('live_room');
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 squish ${
              !selectedGroup && activeTab === 'live_room'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Study Room</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playHaptic('click');
              setSelectedGroup(null);
              setActiveTab('leaderboard');
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 squish ${
              !selectedGroup && activeTab === 'leaderboard'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playHaptic('click');
              setActiveTab('groups');
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 squish ${
              selectedGroup || activeTab === 'groups'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Study Groups</span>
          </button>
        </div>
      </header>

      {/* TAB 1: LIVE STUDY ROOM */}
      {!selectedGroup && activeTab === 'live_room' && (
        <div className="space-y-7 animate-fade-in">
          
          {/* 3 Summary Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl liquid-glass-card border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Studying Right Now</span>
                <span className="text-2xl font-black text-white mt-0.5 block">{communityStats.activeNow} students</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl liquid-glass-card border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-nexus-electric/15 border border-nexus-electric/30 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-nexus-electric" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Total Hours Today</span>
                <span className="text-2xl font-black text-white mt-0.5 block">{communityStats.totalHoursToday} hrs</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl liquid-glass-card border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Most Popular Subject</span>
                <span className="text-2xl font-black text-white mt-0.5 block truncate max-w-[150px]">{communityStats.topSubjectToday}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            
            {/* Left Column: Live Peers Grid (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="p-6 sm:p-7 rounded-[2.2rem] liquid-glass-card border border-white/12 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-nexus-electric/15 border border-nexus-electric/30 flex items-center justify-center shadow-sm">
                      <Users className="w-5 h-5 text-nexus-electric" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Active Study Peers</h3>
                      <p className="text-xs text-zinc-400">See what others are currently working on.</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </div>

                {/* Peer Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pinned Current User Card */}
                  <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    currentUserData.status === 'studying'
                      ? 'bg-nexus-electric/15 border-nexus-electric shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.25)]'
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <img 
                          src={currentUserData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`} 
                          alt="You" 
                          className="w-11 h-11 rounded-xl object-cover border border-white/20 shadow-md"
                        />
                        {currentUserData.status === 'studying' && (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-nexus-electric border-2 border-black" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-white truncate">{user.name} (You)</p>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-white/80">Lvl {currentUserData.level || 1}</span>
                        </div>
                        <p className={`text-[11px] font-bold mt-0.5 truncate ${
                          currentUserData.status === 'studying' ? 'text-nexus-electric' : 'text-zinc-400'
                        }`}>
                          {currentUserData.status === 'studying' 
                            ? `Studying ${currentUserData.currentSubject || 'General'}` 
                            : 'Ready to study'}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg shrink-0 ${
                      currentUserData.status === 'studying'
                        ? 'bg-nexus-electric text-black shadow-sm'
                        : 'bg-white/10 text-zinc-300'
                    }`}>
                      {currentUserData.status === 'studying' ? 'Focusing' : 'Online'}
                    </span>
                  </div>

                  {/* Other Online Peers */}
                  {onlinePeers.map((peer) => {
                    const isStudying = peer.status === 'studying';
                    return (
                      <div 
                        key={peer.uid}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 group squish ${
                          isStudying
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative shrink-0">
                            <img 
                              src={peer.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.name}`} 
                              alt={peer.name} 
                              className="w-11 h-11 rounded-xl object-cover border border-white/10"
                            />
                            {isStudying && (
                              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-400 border-2 border-black animate-pulse" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-white truncate">{peer.name}</p>
                              <span className="text-[9px] font-semibold text-zinc-400">Lvl {peer.level || 1}</span>
                            </div>
                            <p className={`text-[11px] font-semibold mt-0.5 truncate ${
                              isStudying ? 'text-blue-300' : 'text-zinc-400'
                            }`}>
                              {isStudying 
                                ? `Studying ${peer.currentSubject || 'General'}` 
                                : 'Online'}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                          isStudying
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-white/5 text-zinc-400'
                        }`}>
                          {isStudying ? 'Studying' : 'Online'}
                        </span>
                      </div>
                    );
                  })}

                  {onlinePeers.length === 0 && (
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center col-span-1 sm:col-span-2 space-y-1">
                      <p className="text-xs font-bold text-zinc-300">You are the first in the arena!</p>
                      <p className="text-[11px] text-zinc-500">Other students will appear here as they log in.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Study Sprint Widget */}
              <div className="p-6 sm:p-7 rounded-[2.2rem] liquid-glass-card border border-white/12 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-sm">
                      <Zap className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Start a Study Session</h3>
                      <p className="text-xs text-zinc-400">Jump right into focus mode with your peers.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Subject</label>
                    <input 
                      type="text"
                      value={quickSubject}
                      onChange={(e) => setQuickSubject(e.target.value)}
                      placeholder="e.g. Math, Biology, Physics..."
                      className="w-full px-4 py-2.5 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Duration</label>
                    <LiquidSelect
                      value={quickDuration}
                      onChange={setQuickDuration}
                      options={[
                        { value: '15', label: '15 Minutes' },
                        { value: '25', label: '25 Minutes (Standard)' },
                        { value: '45', label: '45 Minutes (Deep)' },
                        { value: '60', label: '60 Minutes (Intense)' }
                      ]}
                      size="sm"
                    />
                  </div>

                  <div className="sm:col-span-3 sm:pt-5">
                    <button
                      type="button"
                      disabled={isStartingSprint}
                      onClick={handleStartQuickSprint}
                      className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-black text-xs transition-all shadow-xl hover:bg-zinc-200 squish flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isStartingSprint ? 'Starting...' : 'Start Timer'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Feed (4 cols) */}
            <div className="lg:col-span-4">
              <div className="p-6 sm:p-7 rounded-[2.2rem] liquid-glass-card border border-white/12 space-y-5 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <Activity className="w-5 h-5 text-nexus-electric" />
                      <h3 className="text-base font-black text-white">Live Activity</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Feed</span>
                  </div>

                  {/* Activity Stream */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                    {activities.map((act) => {
                      const isStart = act.type === 'session_started';
                      const isComplete = act.type === 'session_completed' || act.type === 'manual_session_added';

                      return (
                        <div 
                          key={act.id} 
                          className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5 transition-all hover:bg-white/5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-zinc-400">{formatTimeAgo(act.timestamp)}</span>
                            {act.subject && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
                                {act.subject}
                              </span>
                            )}
                          </div>

                          {/* EXACT PHRASING REQUESTED BY USER */}
                          <p className="text-xs text-white leading-relaxed">
                            {isStart && (
                              <>
                                <span className="font-black text-nexus-electric">{act.userName}</span>
                                {' '}started studying{' '}
                                <span className="font-bold">{act.subject || 'General'}</span>
                              </>
                            )}

                            {isComplete && (
                              <>
                                <span className="font-black text-emerald-400">{act.userName}</span>
                                {' '}studied{' '}
                                <span className="font-bold">{act.subject || 'General'}</span>
                                {' '}for{' '}
                                <span className="font-bold text-emerald-300 font-mono">
                                  {formatDurationSimple(act.duration || 0)}
                                </span>
                              </>
                            )}

                            {!isStart && !isComplete && (
                              <>
                                <span className="font-black text-white">{act.userName}</span>
                                {act.type === 'created_group' && ` created the group "${act.subject || 'New Group'}"`}
                                {act.type === 'joined_group' && ` joined a study group`}
                                {act.type === 'badge_earned' && ` earned a new badge`}
                              </>
                            )}
                          </p>
                        </div>
                      );
                    })}

                    {activities.length === 0 && (
                      <div className="py-12 text-center text-zinc-500 text-xs italic">
                        No activity yet. Start a study session to post the first update!
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-nexus-electric shrink-0" />
                  <span>Updates appear automatically whenever someone starts or finishes studying.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: LEADERBOARD */}
      {!selectedGroup && activeTab === 'leaderboard' && (
        <div className="space-y-7 animate-fade-in">
          
          {/* Header & Timeframe Switcher */}
          <div className="p-6 sm:p-7 rounded-[2.2rem] liquid-glass-card border border-white/12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                <Trophy className="w-6 h-6 text-amber-400" />
                Community Leaderboard
              </h3>
              <p className="text-xs text-zinc-400 mt-1">See top learners ranked by total hours studied.</p>
            </div>

            {/* Timeframe Pills */}
            <div className="flex gap-1.5 p-1 rounded-2xl liquid-glass border border-white/10">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'all_time', label: 'All Time' }
              ].map(tf => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => {
                    audioEngine.playHaptic('click');
                    setLeaderboardTimeframe(tf.id as any);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all squish ${
                    leaderboardTimeframe === tf.id
                      ? 'bg-white text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Top 3 Podium (if >= 3 users) */}
          {rankings.length >= 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Silver #2 */}
              <div className="p-6 rounded-[2rem] liquid-glass-card border border-zinc-400/30 flex flex-col items-center text-center space-y-3 order-2 sm:order-1 relative overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-zinc-300 text-black font-black text-xs flex items-center justify-center shadow-md">
                  #2
                </div>
                <img 
                  src={rankings[1]?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${rankings[1]?.name}`} 
                  alt={rankings[1]?.name} 
                  className="w-16 h-16 rounded-2xl border-2 border-zinc-300 shadow-xl object-cover"
                />
                <div>
                  <p className="text-sm font-black text-white">{rankings[1]?.name}</p>
                  <p className="text-xs text-zinc-400">Level {rankings[1]?.level || 1}</p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/10 text-white font-mono font-black text-sm">
                  {rankings[1]?.totalHours} hrs
                </div>
              </div>

              {/* Gold #1 */}
              <div className="p-7 rounded-[2rem] liquid-glass-card border border-amber-400/50 flex flex-col items-center text-center space-y-3.5 order-1 sm:order-2 relative overflow-hidden shadow-2xl bg-amber-500/10">
                <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs uppercase tracking-wider">
                  <Crown className="w-4 h-4 fill-amber-400" />
                  Champion
                </div>
                <img 
                  src={rankings[0]?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${rankings[0]?.name}`} 
                  alt={rankings[0]?.name} 
                  className="w-20 h-20 rounded-2xl border-2 border-amber-400 shadow-2xl object-cover"
                />
                <div>
                  <p className="text-base font-black text-white">{rankings[0]?.name}</p>
                  <p className="text-xs text-amber-300 font-medium">Level {rankings[0]?.level || 1}</p>
                </div>
                <div className="px-5 py-2 rounded-full bg-amber-400 text-black font-mono font-black text-base shadow-lg">
                  {rankings[0]?.totalHours} hrs
                </div>
              </div>

              {/* Bronze #3 */}
              <div className="p-6 rounded-[2rem] liquid-glass-card border border-amber-700/40 flex flex-col items-center text-center space-y-3 order-3 sm:order-3 relative overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                  #3
                </div>
                <img 
                  src={rankings[2]?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${rankings[2]?.name}`} 
                  alt={rankings[2]?.name} 
                  className="w-16 h-16 rounded-2xl border-2 border-amber-700 shadow-xl object-cover"
                />
                <div>
                  <p className="text-sm font-black text-white">{rankings[2]?.name}</p>
                  <p className="text-xs text-zinc-400">Level {rankings[2]?.level || 1}</p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/10 text-white font-mono font-black text-sm">
                  {rankings[2]?.totalHours} hrs
                </div>
              </div>
            </div>
          )}

          {/* Full Rankings Table */}
          <div className="p-6 sm:p-7 rounded-[2.2rem] liquid-glass-card border border-white/12 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">All Rankings</h4>
            <div className="space-y-2.5">
              {rankings.map((rankedUser, index) => {
                const isMe = rankedUser.uid === user.uid;
                return (
                  <div
                    key={rankedUser.uid || index}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isMe 
                        ? 'bg-nexus-electric/15 border-nexus-electric shadow-md ring-1 ring-nexus-electric/40' 
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="w-6 text-center font-mono font-black text-sm text-zinc-400">
                        #{index + 1}
                      </span>
                      <img 
                        src={rankedUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${rankedUser.name}`} 
                        alt={rankedUser.name} 
                        className="w-10 h-10 rounded-xl object-cover border border-white/10"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {rankedUser.name} {isMe && '(You)'}
                        </p>
                        <p className="text-[11px] text-zinc-400 font-medium">
                          Level {rankedUser.level || 1} • {rankedUser.streak || 0} day streak
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-mono font-black text-white">{rankedUser.totalHours} hrs</span>
                      <span className="text-[10px] text-zinc-500 block font-medium">Studied</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: STUDY GROUPS */}
      {activeTab === 'groups' && !selectedGroup && (
        <div className="space-y-7 animate-fade-in">
          
          {/* Action Bar: Create & Join Group */}
          <div className="p-6 sm:p-7 rounded-[2.2rem] liquid-glass-card border border-white/12 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                <Users className="w-6 h-6 text-nexus-electric" />
                Study Groups
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Join a group to study together and share tips in group chat.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Join Code Input Form */}
              <form onSubmit={handleJoinByCode} className="flex items-center gap-2 w-full sm:w-auto">
                <input 
                  type="text" 
                  value={joinCodeInput} 
                  onChange={(e) => setJoinCodeInput(e.target.value)} 
                  placeholder="Enter 6-digit Code..."
                  className="px-3.5 py-2.5 text-xs text-white uppercase font-mono w-44"
                />
                <button 
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all squish"
                >
                  Join
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="px-5 py-2.5 rounded-xl bg-white text-black font-black text-xs transition-all shadow-xl hover:bg-zinc-200 squish flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
                <span>Create Group</span>
              </button>
            </div>
          </div>

          {/* My Groups Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">My Groups ({myGroups.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => {
                    audioEngine.playHaptic('click');
                    setSelectedGroup(group);
                  }}
                  className="p-5 rounded-3xl liquid-glass-card border border-white/10 hover:border-white/25 transition-all text-left flex flex-col justify-between gap-4 cursor-pointer group squish"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-nexus-electric/20 text-nexus-electric border border-nexus-electric/30">
                        {group.isPublic ? 'Public' : 'Private'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">Code: {group.groupCode}</span>
                    </div>
                    <h5 className="text-base font-black text-white group-hover:text-nexus-electric transition-colors">{group.name}</h5>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{group.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Users className="w-3.5 h-3.5" />
                      {group.members.length} members
                    </span>
                    <span className="font-bold text-white flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Open <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}

              {myGroups.length === 0 && (
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 text-center col-span-full space-y-2">
                  <p className="text-sm font-bold text-zinc-300">You haven't joined any groups yet.</p>
                  <p className="text-xs text-zinc-500">Join a public group below or create your own with friends!</p>
                </div>
              )}
            </div>
          </div>

          {/* Public Groups Directory */}
          <div className="space-y-4 pt-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Explore Public Groups</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicGroups.filter(g => !g.members.includes(user.uid)).map((group) => (
                <div
                  key={group.id}
                  className="p-5 rounded-3xl liquid-glass-card border border-white/10 flex flex-col justify-between gap-4"
                >
                  <div>
                    <h5 className="text-base font-black text-white">{group.name}</h5>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{group.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <span className="text-xs text-zinc-400 font-semibold">{group.members.length} members</span>
                    <button
                      type="button"
                      onClick={async () => {
                        audioEngine.playHaptic('success');
                        await dbService.joinGroupByCode(user.uid, group.groupCode);
                      }}
                      className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs transition-all hover:bg-zinc-200 squish"
                    >
                      Join Group
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* GROUP DETAIL & CHAT VIEW */}
      {selectedGroup && (
        <div className="space-y-5 animate-fade-in">
          {/* Group Header */}
          <div className="p-6 rounded-[2rem] liquid-glass-card border border-white/12 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all squish"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white truncate">{selectedGroup.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                    {selectedGroup.members.length} members
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate mt-0.5">{selectedGroup.description}</p>
              </div>
            </div>

            {/* Invite Code Button */}
            <button
              type="button"
              onClick={() => copyGroupCode(selectedGroup.groupCode)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold text-white transition-all flex items-center gap-2 shrink-0 squish"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied!' : `Code: ${selectedGroup.groupCode}`}</span>
            </button>
          </div>

          {/* Group Chat Window */}
          <div className="p-6 rounded-[2.2rem] liquid-glass-card border border-white/12 h-[520px] flex flex-col justify-between">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 pr-2">
              {groupMessages.map((msg) => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[10px] font-bold text-zinc-400">{isMe ? 'You' : msg.senderName}</span>
                      <span className="text-[9px] text-zinc-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed shadow-sm ${
                      isMe 
                        ? 'bg-nexus-electric text-black font-semibold rounded-br-sm' 
                        : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              {groupMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-zinc-500">
                  <MessageSquare className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-semibold">No messages yet.</p>
                  <p className="text-[11px]">Send a greeting to start chatting with your group!</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="pt-4 border-t border-white/10 flex items-center gap-2.5">
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                placeholder="Type a message to your study group..."
                className="flex-1 px-4 py-3 text-xs text-white"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-2xl bg-white text-black font-black text-xs transition-all shadow-xl hover:bg-zinc-200 squish flex items-center gap-2 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowCreateGroupModal(false)}>
          <div className="lg-sheet text-left max-w-md w-full p-7 space-y-5 relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-black text-white">Create Study Group</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1.5">Group Name</label>
                <input 
                  type="text" 
                  required
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)} 
                  placeholder="e.g. Calculus Champions"
                  className="w-full px-4 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1.5">Description</label>
                <textarea 
                  value={newGroupDesc} 
                  onChange={(e) => setNewGroupDesc(e.target.value)} 
                  placeholder="What is this study group about?"
                  className="w-full px-4 py-2.5 text-xs text-white h-20 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1.5">Privacy</label>
                <LiquidSelect
                  value={newGroupPrivacy}
                  onChange={setNewGroupPrivacy}
                  options={[
                    { value: 'public', label: 'Public (Anyone can join)' },
                    { value: 'private', label: 'Private (Invite code only)' }
                  ]}
                />
              </div>

              <div className="lg-sheet__actions pt-3">
                <button type="submit" className="lg-btn lg-btn--tinted lg-btn--lg w-full font-black uppercase tracking-wider text-xs shadow-xl">
                  Create Group
                </button>
                <button type="button" onClick={() => setShowCreateGroupModal(false)} className="lg-btn lg-btn--lg w-full text-xs font-bold text-zinc-400 hover:text-white">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
