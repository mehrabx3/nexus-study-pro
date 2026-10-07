import React, { useState, useEffect } from 'react';
import { Search, LayoutDashboard, CheckSquare, Calendar, Clock, BrainCircuit, BarChart2, Settings, X, ArrowRight, Zap, Share2 } from 'lucide-react';
import { AppView } from '../types';

interface CommandPaletteProps {
  onClose: () => void;
  onNavigate: (view: AppView) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  const commands = [
    { view: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Home', keywords: 'home dashboard main' },
    { view: AppView.TASKS, icon: CheckSquare, label: 'Tasks', keywords: 'todo homework assignment' },
    { view: AppView.SCHEDULE, icon: Calendar, label: 'Schedule', keywords: 'calendar schedule plan' },
    { view: AppView.TIMER, icon: Clock, label: 'Timer', keywords: 'pomodoro stopwatch timer session focus' },
    { view: AppView.HUB, icon: Share2, label: 'Social', keywords: 'social groups chat feed status' },
    { view: AppView.TUTOR, icon: BrainCircuit, label: 'AI Help', keywords: 'ai tutor gpt chat help' },
    { view: AppView.ANALYTICS, icon: BarChart2, label: 'Stats', keywords: 'stats graphs performance analytics' },
    { view: AppView.SETTINGS, icon: Settings, label: 'Settings', keywords: 'settings profile config theme' },
  ];

  const filtered = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase()) || 
    c.keywords.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xl" onClick={onClose} />
      
      <div className="w-full max-w-xl liquid-glass rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white/20 animate-slide-up">
        <div className="relative border-b border-white/10 p-2">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search views, timer, stats, and tools..."
            className="w-full bg-transparent border-none pl-14 pr-14 py-5 text-white placeholder-zinc-500 focus:outline-none text-base sm:text-lg font-medium tracking-tight"
          />
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto custom-scrollbar p-3 space-y-1">
           <div className="px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">Direct Navigation</div>
           <div className="space-y-1">
             {filtered.map((cmd) => (
               <button
                 key={cmd.view}
                 onClick={() => onNavigate(cmd.view)}
                 className="w-full flex items-center justify-between p-3.5 rounded-2xl text-left hover:bg-white/10 group transition-all squish"
               >
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-nexus-electric/15 border border-nexus-electric/30 flex items-center justify-center text-nexus-electric group-hover:bg-nexus-electric group-hover:text-white transition-all shadow-sm">
                       <cmd.icon className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="text-white font-bold text-sm group-hover:text-nexus-electric transition-colors leading-tight">{cmd.label}</div>
                       <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">Study Module</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                    <ArrowRight className="w-4 h-4 text-nexus-electric" />
                 </div>
               </button>
             ))}
             {filtered.length === 0 && (
               <div className="py-14 flex flex-col items-center justify-center text-center opacity-40">
                  <Zap className="w-10 h-10 mb-3 text-zinc-400" />
                  <p className="text-white font-bold text-base">No matching study module found.</p>
               </div>
             )}
           </div>
        </div>

        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
           <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <kbd className="text-[10px] font-black text-white bg-white/10 px-2 py-1 rounded-lg border border-white/15">ESC</kbd>
                 <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Close</span>
              </div>
           </div>
           <div className="text-[9px] font-black text-nexus-electric uppercase tracking-[0.25em]">Nexus OS Search</div>
        </div>
      </div>
    </div>
  );
};
