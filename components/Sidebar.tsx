import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  CheckCircle2, 
  Calendar, 
  Timer, 
  BrainCircuit, 
  Activity, 
  LogOut,
  Menu,
  X,
  Sparkles, 
  Sliders, 
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Radio
} from 'lucide-react';
import { AppView, UserProfile } from '../types';
import { audioEngine } from '../services/audioService';

interface SidebarProps {
  user: UserProfile;
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
  activeTimerMins?: number | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, currentView, onChangeView, onLogout, activeTimerMins }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('nexus_sidebar_collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('nexus_sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const navGroups = [
    {
      title: 'Study',
      items: [
        { view: AppView.DASHBOARD, icon: LayoutGrid, label: 'Home' },
        { view: AppView.TIMER, icon: Timer, label: 'Timer' },
        { view: AppView.TASKS, icon: CheckCircle2, label: 'Tasks' },
        { view: AppView.SCHEDULE, icon: Calendar, label: 'Schedule' },
      ]
    },
    {
      title: 'Community & AI',
      items: [
        { view: AppView.HUB, icon: Radio, label: 'Live Arena' },
        { view: AppView.TUTOR, icon: BrainCircuit, label: 'AI Tutor' },
        { view: AppView.ANALYTICS, icon: Activity, label: 'Stats' },
      ]
    },
    {
      title: 'Rewards',
      items: [
        { view: AppView.SHOP, icon: ShoppingBag, label: 'Shop' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { view: AppView.SETTINGS, icon: Sliders, label: 'Settings' },
      ]
    }
  ];

  const handleNavClick = (view: AppView) => {
    audioEngine.playHaptic('click');
    onChangeView(view);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-5 right-5 z-50 p-2.5 liquid-glass rounded-full text-white shadow-xl active:scale-90 transition-transform"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Floating Liquid Glass Dock - Apple macOS & iPadOS Styling */}
      <aside 
        className={`
          fixed md:relative z-40 h-[calc(100%-2rem)] md:my-4 md:ml-4
          liquid-dock rounded-[2.2rem]
          flex flex-col justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
          shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]
          overflow-hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Subtle Specular Glow Refraction */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

        <div className={`p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center relative z-10 ${isCollapsed ? 'px-2' : 'px-5'}`}>
          
          {/* Apple macOS Traffic Light Window Dots */}
          {!isCollapsed && (
            <div className="w-full flex items-center justify-between mb-5 px-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/50 shadow-sm transition-transform hover:scale-110" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50 shadow-sm transition-transform hover:scale-110" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/50 shadow-sm transition-transform hover:scale-110" />
              </div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">macOS</span>
            </div>
          )}

          {/* Brand Wordmark & Collapse Toggle */}
          <div 
            className={`flex items-center gap-3 mb-6 group cursor-pointer w-full squish ${isCollapsed ? 'justify-center' : 'px-1'}`} 
            onClick={() => {
              audioEngine.playHaptic('click');
              setIsCollapsed(!isCollapsed);
            }}
          >
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-nexus-electric to-nexus-violet p-0.5 shadow-[0_8px_20px_rgba(var(--nexus-accent-rgb),0.35)] flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-[#0a0a0c] rounded-[0.9rem] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in whitespace-nowrap min-w-0">
                <span className="font-black text-white text-base tracking-tight block leading-none">Nexus</span>
                <span className="text-[9px] text-zinc-400 uppercase tracking-[0.2em] font-semibold mt-1 block">Study OS</span>
              </div>
            )}
            {!isCollapsed && (
              <ChevronLeft className="w-4 h-4 text-zinc-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>

          {/* Navigation Items Group */}
          <div className="space-y-6 w-full">
            {navGroups.map((group, idx) => (
              <div key={idx} className="w-full">
                {!isCollapsed && (
                  <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.25em] mb-2 px-3">
                    {group.title}
                  </h3>
                )}
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = currentView === item.view;
                    const hasTimer = item.view === AppView.TIMER && activeTimerMins !== null;
                    
                    return (
                      <button
                        key={item.view}
                        onClick={() => handleNavClick(item.view)}
                        className={`
                          w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-300 relative overflow-hidden squish
                          ${isCollapsed ? 'justify-center px-0' : ''}
                          ${isActive 
                            ? 'bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.3)] border border-white/15 font-bold' 
                            : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'}
                        `}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <item.icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-nexus-electric scale-110' : 'group-hover:text-zinc-200'}`} />
                        {!isCollapsed && <span className="truncate text-left">{item.label}</span>}
                        
                        {hasTimer && (
                          <span className={`px-2 py-0.5 rounded-full bg-nexus-electric text-[9px] font-black text-white animate-pulse shadow-[0_0_10px_rgba(var(--nexus-accent-rgb),0.5)] ${isCollapsed ? 'absolute top-1 right-1' : 'ml-auto'}`}>
                            {activeTimerMins}m
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Footer User Profile & Sign Out Capsule */}
        <div className={`p-4 space-y-2 flex flex-col relative z-10 border-t border-white/8 ${isCollapsed ? 'items-center px-2' : ''}`}>
          <div 
            onClick={() => handleNavClick(AppView.SETTINGS)}
            className={`flex items-center gap-3 p-2 rounded-2xl hover:bg-white/8 transition-all cursor-pointer squish w-full ${isCollapsed ? 'justify-center' : ''}`}
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/15 shrink-0 shadow-md">
              <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-full h-full object-cover" alt="Avatar" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 animate-fade-in flex-1">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">Level {user.level || 1}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              audioEngine.playHaptic('click');
              onLogout();
            }}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all squish w-full ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-30 md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
};
