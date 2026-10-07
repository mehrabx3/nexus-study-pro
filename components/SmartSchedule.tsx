import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Calendar as CalendarIcon, Clock, Plus, Tag, X, ChevronRight, Trash2, Loader2, ChevronLeft, CalendarDays } from 'lucide-react';
import { ScheduleEvent, UserProfile } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { LiquidSelect } from './LiquidSelect';

interface SmartScheduleProps {
    user: UserProfile;
    subjects: string[];
    setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
}

export const SmartSchedule: React.FC<SmartScheduleProps> = ({ user, subjects, setSubjects }) => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showAiModal, setShowAiModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSubject, setManualSubject] = useState(subjects[0] || 'General');
  const [manualType, setManualType] = useState('study');
  
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, [user.uid]);

  const loadSchedule = async () => {
    setIsLoading(true);
    const fetchedEvents = await dbService.getSchedule(user.uid);
    setEvents(fetchedEvents);
    setIsLoading(false);
  };

  const deleteEvent = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    await dbService.deleteScheduleEvent(id);
  };

  const toDateString = (date: Date) => date.toISOString().split('T')[0];

  const navigateDate = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      if (viewMode === 'Day') newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
      if (viewMode === 'Week') newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
      if (viewMode === 'Month') newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
      setSelectedDate(newDate);
  };

  const getWeekDays = (date: Date) => {
      const start = new Date(date);
      start.setDate(date.getDate() - date.getDay()); 
      const days = [];
      for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          days.push(d);
      }
      return days;
  };

  const filteredEvents = useMemo(() => {
      if (viewMode === 'Day') {
          const dateStr = toDateString(selectedDate);
          return events.filter(e => (e.date || toDateString(new Date())) === dateStr);
      } 
      else if (viewMode === 'Week') {
          const days = getWeekDays(selectedDate);
          const startStr = toDateString(days[0]);
          const endStr = toDateString(days[6]);
          return events.filter(e => {
              const d = e.date || toDateString(new Date());
              return d >= startStr && d <= endStr;
          });
      }
      else { 
          const y = selectedDate.getFullYear();
          const m = selectedDate.getMonth();
          return events.filter(e => {
              const d = new Date(e.date || new Date());
              return d.getFullYear() === y && d.getMonth() === m;
          });
      }
  }, [events, viewMode, selectedDate]);

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      setSelectedSubjects(prev => prev.filter(s => s !== sub));
    } else {
      setSelectedSubjects(prev => [...prev, sub]);
    }
  };

  const addCustomSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubjectName.trim() && !subjects.includes(newSubjectName.trim())) {
        setSubjects(prev => [...prev, newSubjectName.trim()]);
        setSelectedSubjects(prev => [...prev, newSubjectName.trim()]); 
        setNewSubjectName('');
        setIsAddingSubject(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && selectedSubjects.length === 0) return;
    
    setIsGenerating(true);
    try {
      let finalPrompt = prompt;
      if (selectedSubjects.length > 0) {
        finalPrompt = `${prompt}. Subjects to include: ${selectedSubjects.join(", ")}.`;
      }
      
      const generated = await geminiService.generateSchedule(finalPrompt);
      const todayStr = toDateString(new Date());
      
      for (const event of generated) {
          const eventWithDate = { ...event, date: todayStr };
          await dbService.saveScheduleEvent(eventWithDate, user.uid);
      }
      
      await loadSchedule();
      setShowAiModal(false);
      setPrompt('');
      setSelectedSubjects([]);
    } catch (err) {
      alert("Plan generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dateVal = formData.get('date') as string || toDateString(new Date());
    
    const newEvent: ScheduleEvent = {
        id: crypto.randomUUID(),
        title: formData.get('title') as string,
        subject: formData.get('subject') as string || undefined,
        startTime: formData.get('startTime') as string,
        date: dateVal,
        durationMinutes: parseInt(formData.get('duration') as string),
        type: formData.get('type') as any,
        description: formData.get('description') as string
    };
    
    setShowManualModal(false);
    await dbService.saveScheduleEvent(newEvent, user.uid);
    await loadSchedule();
  };

  const GroupedEventList = ({ eventsForDay }: { eventsForDay: ScheduleEvent[] }) => (
      <div className="space-y-3">
          {eventsForDay.length === 0 ? (
              <div className="text-zinc-600 text-[10px] italic p-4 border border-dashed border-white/8 rounded-2xl text-center">Empty day</div>
          ) : (
              eventsForDay.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(event => (
                  <div key={event.id} className="relative pl-3 pr-6 border-l-2 border-nexus-electric/40 hover:border-nexus-electric transition-colors py-1 group">
                      <div className="text-[10px] text-zinc-500 font-mono mb-0.5">{event.startTime}</div>
                      <div className="font-bold text-white text-xs truncate pr-2 group-hover:text-nexus-electric transition-colors">{event.title}</div>
                      {event.subject && <div className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold mt-0.5">{event.subject}</div>}
                      
                      <button 
                        onClick={() => deleteEvent(event.id)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete event"
                      >
                          <Trash2 className="w-3.5 h-3.5" />
                      </button>
                  </div>
              ))
          )}
      </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in relative pb-16 pr-2">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-8 h-8 text-nexus-electric" />
            Study Schedule
          </h1>
          <p className="text-zinc-400 text-xs font-semibold mt-1">Timeline & session management.</p>
        </div>
        <div className="flex gap-2.5">
            <button 
                onClick={() => setShowManualModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 liquid-glass hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10 squish text-xs"
            >
                <Plus className="w-4 h-4" />
                <span>Add Event</span>
            </button>
            <button 
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-black rounded-2xl transition-all shadow-xl hover:bg-zinc-200 squish text-xs uppercase tracking-wider"
            >
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                <span>Auto Plan</span>
            </button>
        </div>
      </header>

      {/* Date Navigation & View Mode Capsule */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 liquid-glass-card p-2 rounded-2xl shadow-sm">
         <div className="flex items-center liquid-glass rounded-xl p-1">
             {['Day', 'Week', 'Month'].map(m => (
                 <button
                    key={m}
                    onClick={() => setViewMode(m as any)}
                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all squish ${viewMode === m ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
                 >
                     {m}
                 </button>
             ))}
         </div>
         
         <div className="flex items-center gap-3 px-3">
             <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white squish"><ChevronLeft className="w-4 h-4" /></button>
             <span className="text-white font-black text-xs min-w-[140px] text-center tracking-wider uppercase font-mono">
                 {viewMode === 'Day' && selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                 {viewMode === 'Week' && `Wk ${getWeekDays(selectedDate)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                 {viewMode === 'Month' && selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
             </span>
             <button onClick={() => navigateDate('next')} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white squish"><ChevronRight className="w-4 h-4" /></button>
         </div>
      </div>

      {/* Calendar Views */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative min-h-[400px]">
         {viewMode === 'Day' && (
            <div className="space-y-4 pl-0 pb-16 relative pt-2">
                {isLoading && (
                    <div className="absolute inset-0 flex items-start justify-center pt-20 bg-black/50 z-20 backdrop-blur-sm rounded-3xl">
                        <Loader2 className="w-8 h-8 animate-spin text-nexus-electric" />
                    </div>
                )}
                
                {!isLoading && filteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-600 liquid-glass rounded-3xl border border-dashed border-white/8 mx-2">
                        <CalendarIcon className="w-10 h-10 mb-3 opacity-20" />
                        <p className="font-bold text-xs uppercase tracking-widest text-zinc-500">No scheduled sessions</p>
                    </div>
                ) : (
                    filteredEvents.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((event, index) => (
                        <div key={event.id} className="relative pl-24 group animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
                            <div className="absolute left-3 top-5 w-16 text-right text-xs font-mono text-zinc-500 group-hover:text-white transition-colors font-bold">
                                {event.startTime}
                            </div>
                            <div className={`
                                absolute left-[86px] top-6 w-3.5 h-3.5 rounded-full border-2 z-10 bg-[#09090c] transition-all duration-300 group-hover:scale-125
                                ${event.type === 'study' ? 'border-nexus-electric text-nexus-electric' : 
                                event.type === 'break' ? 'border-emerald-500 text-emerald-500' : 
                                event.type === 'exam' ? 'border-rose-500 text-rose-500' : 'border-zinc-500 text-zinc-500'}
                            `} />
                            <div className={`
                                p-5 rounded-2xl liquid-glass-card border border-y border-r border-l-4 transition-all duration-300 relative overflow-hidden group-hover:translate-x-0.5
                                ${event.type === 'break' ? 'border-l-emerald-500' : 
                                event.type === 'exam' ? 'border-l-rose-500' : 
                                'border-l-nexus-electric'}
                            `}>
                                <div className="flex justify-between items-start mb-2 relative z-10">
                                    <div className="flex flex-col gap-0.5">
                                        <h3 className="font-bold text-white text-base tracking-tight group-hover:text-nexus-electric transition-colors">{event.title}</h3>
                                        {event.subject && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-nexus-electric">
                                                {event.subject}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center text-xs font-mono text-zinc-400 liquid-glass px-2.5 py-1 rounded-full border border-white/8">
                                            <Clock className="w-3 h-3 mr-1.5" />
                                            {event.durationMinutes}m
                                        </div>
                                        <button 
                                            onClick={() => deleteEvent(event.id)}
                                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 squish"
                                            title="Delete event"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed relative z-10">{event.description || `Session: ${event.title}`}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
         )}

         {viewMode === 'Week' && (
             <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-w-[750px] pb-8">
                 {getWeekDays(selectedDate).map((day) => {
                     const dateStr = toDateString(day);
                     const dayEvents = events.filter(e => (e.date || toDateString(new Date())) === dateStr);
                     const isToday = dateStr === toDateString(new Date());
                     return (
                         <div key={dateStr} className={`liquid-glass-card rounded-2xl p-3 min-h-[280px] transition-colors ${isToday ? 'border-nexus-electric/50 bg-nexus-electric/5' : ''}`}>
                             <div className="text-center mb-3 pb-2 border-b border-white/8">
                                 <div className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-nexus-electric' : 'text-zinc-500'}`}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                 <div className={`text-base font-black ${isToday ? 'text-white' : 'text-zinc-300'}`}>{day.getDate()}</div>
                             </div>
                             <GroupedEventList eventsForDay={dayEvents} />
                         </div>
                     );
                 })}
             </div>
         )}
         
         {viewMode === 'Month' && (
             <div className="grid grid-cols-7 gap-2">
                 {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() }, (_, i) => {
                     const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
                     const dateStr = toDateString(d);
                     const dayEvents = events.filter(e => (e.date || toDateString(new Date())) === dateStr);
                     const isToday = dateStr === toDateString(new Date());
                     return (
                         <div 
                           key={i} 
                           onClick={() => { setSelectedDate(d); setViewMode('Day'); }}
                           className={`aspect-square liquid-glass-card rounded-xl p-2.5 transition-all hover:scale-105 cursor-pointer relative group ${isToday ? 'border-nexus-electric shadow-lg shadow-nexus-electric/20' : ''}`}
                         >
                             <div className={`text-xs font-black ${isToday ? 'text-nexus-electric' : 'text-zinc-400'}`}>{i + 1}</div>
                             {dayEvents.length > 0 && (
                                 <div className="mt-2 space-y-1">
                                     {dayEvents.slice(0, 3).map(e => (
                                         <div key={e.id} className="w-full h-1 rounded-full bg-nexus-electric" />
                                     ))}
                                 </div>
                             )}
                         </div>
                     );
                 })}
             </div>
         )}
      </div>

      {/* AI Schedule Planner Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowAiModal(false)}>
          <div className="lg-sheet text-left max-w-lg w-full relative overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/10">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-nexus-electric/20 border border-nexus-electric/30 flex items-center justify-center">
                     <Sparkles className="w-5 h-5 text-nexus-electric" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-white m-0">Schedule Synthesizer</h3>
                     <p className="text-[11px] text-zinc-400 font-medium m-0">AI-optimized cognitive timetable.</p>
                   </div>
                 </div>
                 <button onClick={() => setShowAiModal(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white squish">
                     <X className="w-4 h-4" />
                 </button>
             </div>
             
             <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Target Subjects</label>
                    <div className="flex flex-wrap gap-2">
                        {subjects.map(sub => (
                            <button
                                key={sub}
                                type="button"
                                onClick={() => toggleSubject(sub)}
                                className={`text-xs px-3.5 py-1.5 rounded-xl border transition-all font-bold squish ${selectedSubjects.includes(sub) ? 'bg-nexus-electric text-white border-nexus-electric shadow-lg shadow-nexus-electric/30' : 'liquid-glass text-zinc-400 border-white/10 hover:text-white'}`}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Study Objectives & Constraints</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. Study 2 hours of Math in morning, review Biology after lunch..."
                        className="w-full h-28 p-4 text-white text-xs resize-none"
                    />
                </div>
                <div className="lg-sheet__actions pt-2">
                  <button 
                      type="submit" 
                      disabled={isGenerating || (!prompt && selectedSubjects.length === 0)}
                      className="lg-btn lg-btn--tinted lg-btn--lg w-full font-black uppercase tracking-wider text-xs shadow-xl disabled:opacity-50"
                  >
                      {isGenerating ? 'Synthesizing Plan...' : 'Generate Optimized Plan'}
                  </button>
                  <button 
                      type="button" 
                      onClick={() => setShowAiModal(false)}
                      className="lg-btn lg-btn--lg w-full text-xs font-bold text-zinc-400 hover:text-white"
                  >
                      Cancel
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Manual Add Event Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowManualModal(false)}>
          <div className="lg-sheet text-left max-w-md w-full relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/10">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-nexus-electric/20 border border-nexus-electric/30 flex items-center justify-center">
                     <CalendarIcon className="w-5 h-5 text-nexus-electric" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-white m-0">Add Calendar Event</h3>
                     <p className="text-[11px] text-zinc-400 font-medium m-0">Schedule a class or study block.</p>
                   </div>
                 </div>
                 <button onClick={() => setShowManualModal(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white squish"><X className="w-4 h-4" /></button>
             </div>
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Event Title</label>
                <input name="title" required className="w-full px-4 py-3 text-xs text-white" placeholder="e.g. Calculus Chapter 4" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Date</label>
                  <input name="date" type="date" required defaultValue={toDateString(new Date())} className="w-full px-4 py-3 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Start Time</label>
                  <input name="startTime" type="time" required className="w-full px-4 py-3 text-xs text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Subject</label>
                  <LiquidSelect
                    name="subject"
                    value={manualSubject}
                    onChange={setManualSubject}
                    options={subjects}
                  />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Type</label>
                   <LiquidSelect
                     name="type"
                     value={manualType}
                     onChange={setManualType}
                     options={[
                       { value: 'study', label: 'Study' },
                       { value: 'break', label: 'Break' },
                       { value: 'exam', label: 'Exam' },
                       { value: 'other', label: 'Other' }
                     ]}
                   />
                </div>
              </div>
              <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Duration (mins)</label>
                  <input name="duration" type="number" min="5" step="5" defaultValue="45" required className="w-full px-4 py-3 text-xs text-white" />
              </div>
              <div className="lg-sheet__actions pt-3">
                <button type="submit" className="lg-btn lg-btn--tinted lg-btn--lg w-full font-black uppercase tracking-wider text-xs shadow-xl">
                  Confirm Event
                </button>
                <button type="button" onClick={() => setShowManualModal(false)} className="lg-btn lg-btn--lg w-full text-xs font-bold text-zinc-400 hover:text-white">
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
