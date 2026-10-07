import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Check, Trash2, Calendar, Tag, Filter, Loader2, Bell, X, AlertCircle, History, ListTodo } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { audioEngine } from '../services/audioService';
import { LiquidSelect } from './LiquidSelect';

interface TaskManagerProps {
    user: UserProfile;
    onTriggerXP: (amount: number, x?: number, y?: number) => void;
    onUpdateQuest: (type: 'study_time' | 'tasks_done' | 'pomodoro_count', amount: number) => void;
}

const REMINDER_OPTIONS = [
    { label: 'None', value: 0 },
    { label: '15 mins before', value: 15 },
    { label: '1 hour before', value: 60 },
    { label: '1 day before', value: 1440 },
];

export const TaskManager: React.FC<TaskManagerProps> = ({ user, onTriggerXP, onUpdateQuest }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'Today' | 'History' | 'Done'>('Today');
  const [historyPeriod, setHistoryPeriod] = useState<'Week' | 'Month' | 'All'>('Week');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPriority, setModalPriority] = useState<string>(TaskPriority.MEDIUM);
  const [modalReminder, setModalReminder] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [user.uid]);

  const loadTasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedTasks = await dbService.getTasks(user.uid);
        setTasks(fetchedTasks);
      } catch (err: any) {
        setError(`Sync error: ${err.code || 'Sync failed'}`);
      } finally {
        setIsLoading(false);
      }
  };

  const toggleStatus = async (id: string, e: React.MouseEvent) => {
    const originalTasks = [...tasks];
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.PENDING : TaskStatus.DONE;
    
    if (newStatus === TaskStatus.DONE) {
      audioEngine.playHaptic('success');
    } else {
      audioEngine.playHaptic('pop');
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    try {
      await dbService.updateTaskStatus(id, newStatus);
      if (newStatus === TaskStatus.DONE) {
        const xp = task.priority === TaskPriority.HIGH ? 50 : task.priority === TaskPriority.MEDIUM ? 30 : 15;
        
        // Calculate position for XP popup
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        onTriggerXP(xp, rect.left, rect.top);
        
        onUpdateQuest('tasks_done', 1);
      }
    } catch (err) {
      setTasks(originalTasks);
      setError("Update failed.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const deleteTask = async (id: string) => {
    audioEngine.playHaptic('click');
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await dbService.deleteTask(id);
    } catch (err) {
      setTasks(originalTasks);
      setError("Delete failed.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const addTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    audioEngine.playHaptic('pop');
    const formData = new FormData(e.currentTarget);
    const reminderVal = parseInt(formData.get('reminderOffset') as string);
    const dueDateVal = formData.get('dueDate') as string;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: formData.get('title') as string,
      subject: formData.get('subject') as string,
      priority: formData.get('priority') as TaskPriority,
      status: TaskStatus.PENDING,
      dueDate: dueDateVal || undefined,
      reminderOffset: reminderVal > 0 ? reminderVal : undefined,
      createdAt: Date.now()
    };
    
    const originalTasks = [...tasks];
    setTasks([newTask, ...tasks]);
    setIsModalOpen(false);
    
    try {
      await dbService.addTask(newTask, user.uid);
    } catch (err: any) {
      setTasks(originalTasks);
      setError(`Save failed.`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.subject.toLowerCase().includes(searchTerm.toLowerCase());
      
      const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
      const isToday = taskDate === todayStr;

      if (filter === 'Today') return matchesSearch && isToday && t.status === TaskStatus.PENDING;
      if (filter === 'Done') return matchesSearch && t.status === TaskStatus.DONE;
      if (filter === 'History') return matchesSearch && !isToday;
      return matchesSearch;
    });
  }, [tasks, filter, searchTerm]);

  const historyStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = Date.now();
    let ms = 0;
    if (historyPeriod === 'Week') ms = 7 * 24 * 60 * 60 * 1000;
    else if (historyPeriod === 'Month') ms = 30 * 24 * 60 * 60 * 1000;
    else ms = Infinity;

    const pastTasks = tasks.filter(t => {
        const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
        return taskDate !== todayStr && (ms === Infinity || t.createdAt >= now - ms);
    });
    
    const completed = pastTasks.filter(t => t.status === TaskStatus.DONE).length;
    const missed = pastTasks.filter(t => t.status === TaskStatus.PENDING).length;
    return { completed, missed };
  }, [tasks, historyPeriod]);

  return (
    <div className="h-full flex flex-col animate-fade-in relative pr-2 space-y-8">
      {error && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-rose-600/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-3 animate-bounce border border-rose-400/50">
           <AlertCircle className="w-5 h-5" />
           <span>{error}</span>
           <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Modern Header Zone */}
      <div className="shrink-0 space-y-6 pb-2 border-b border-nexus-border/40">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <ListTodo className="w-8 h-8 text-nexus-electric" />
                Active Tasks
              </h1>
              <p className="text-nexus-slate text-sm font-medium mt-1">Manage and track your cognitive obligations.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl transition-all shadow-xl hover:bg-zinc-200 active:scale-95 text-xs uppercase tracking-wider shrink-0"
            >
              <Plus className="w-4 h-4 fill-black" />
              <span>Add Task</span>
            </button>
        </header>

        {/* Search & Tabs Filter Section */}
        <div className="flex flex-col md:flex-row gap-4">
            <label className="lg-field flex-1">
                <Search className="w-4 h-4 text-zinc-400" />
                <input 
                    type="text" 
                    placeholder="Search assignments & goals..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </label>
            <div className="flex gap-1 liquid-glass p-1 rounded-2xl shrink-0 border border-white/10">
                {['Today', 'History', 'Done'].map((f) => (
                    <button
                      key={f}
                      onClick={() => { audioEngine.playHaptic('click'); setFilter(f as any); }}
                      className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest squish
                          ${filter === f 
                          ? 'bg-white text-black shadow-md' 
                          : 'text-zinc-400 hover:text-white'}`}
                    >
                      {f}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Main List Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pb-10">
        {filter === 'History' && (
          <div className="space-y-6 mb-8 animate-slide-up">
            <div className="flex justify-center">
                <div className="flex bg-nexus-card/50 backdrop-blur-md p-1 rounded-xl border border-nexus-border">
                    {['Week', 'Month', 'All'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => setHistoryPeriod(p as any)}
                            className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${historyPeriod === p ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="p-8 bg-nexus-card/50 backdrop-blur-md border border-nexus-border rounded-3xl text-center group relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Check className="w-12 h-12 text-emerald-400" />
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 group-hover:scale-110 transition-transform relative z-10 animate-fade-in">
                      <Check className="w-6 h-6 text-emerald-400" />
                   </div>
                   <p className="text-4xl font-black text-white relative z-10">{historyStats.completed}</p>
                   <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-2 relative z-10">Finished</p>
                </div>
                <div className="p-8 bg-nexus-card/50 backdrop-blur-md border border-nexus-border rounded-3xl text-center group relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <X className="w-12 h-12 text-rose-400" />
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4 border border-rose-500/20 group-hover:scale-110 transition-transform relative z-10 animate-fade-in">
                      <X className="w-6 h-6 text-rose-400" />
                   </div>
                   <p className="text-4xl font-black text-white relative z-10">{historyStats.missed}</p>
                   <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-2 relative z-10">Not Done</p>
                </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 relative min-h-[200px]">
            {isLoading && (
                <div className="absolute inset-0 flex items-start justify-center pt-20 bg-nexus-black/50 z-10 backdrop-blur-sm rounded-xl animate-fade-in">
                    <Loader2 className="w-8 h-8 animate-spin text-nexus-electric" />
                </div>
            )}
            
            {filteredTasks.map(task => {
              const isHigh = task.priority === TaskPriority.HIGH;
              const isMed = task.priority === TaskPriority.MEDIUM;
              const colorLeftBorder = isHigh ? 'border-l-rose-500' : isMed ? 'border-l-amber-500' : 'border-l-emerald-500';
              
              return (
                <div 
                    key={task.id}
                    className={`
                    group flex items-center gap-5 p-6 rounded-2xl border border-y border-r border-l-4 transition-all duration-300 animate-fade-in backdrop-blur-md
                    ${colorLeftBorder}
                    ${task.status === TaskStatus.DONE 
                        ? 'bg-nexus-card/30 border-nexus-border opacity-50' 
                        : 'bg-nexus-card/60 border-nexus-border hover:border-nexus-electric/20 hover:bg-nexus-card hover:translate-x-0.5'}
                    `}
                >
                    <button 
                        onClick={(e) => toggleStatus(task.id, e)} 
                        className={`
                            w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 active:scale-90 shrink-0
                            ${task.status === TaskStatus.DONE 
                                ? 'bg-nexus-electric border-nexus-electric text-white shadow-lg shadow-nexus-electric/30' 
                                : 'border-zinc-600 hover:border-nexus-electric hover:shadow-[0_0_8px_rgba(var(--nexus-accent-rgb),0.5)] text-transparent'}
                        `}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-base text-white truncate transition-all ${task.status === TaskStatus.DONE ? 'line-through text-zinc-500' : ''}`}>{task.title}</h3>
                        {/* Unboxed inline category metadata with separators */}
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1.5 font-medium">
                            <span className="uppercase font-bold tracking-widest text-[10px] text-nexus-electric">
                                {task.subject}
                            </span>
                            <span aria-hidden="true" className="opacity-30">·</span>
                            <span className="text-[10px] opacity-70">
                                {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    {/* Highly aesthetic Apple Liquid Glass Chip priority tag */}
                    <div className="lg-chip text-[10px] font-black uppercase tracking-wider shrink-0 gap-1.5 h-7 px-3">
                      <span className={`w-2 h-2 rounded-full shadow-sm ${isHigh ? 'bg-rose-500 shadow-rose-500/50' : isMed ? 'bg-amber-400 shadow-amber-400/50' : 'bg-emerald-400 shadow-emerald-400/50'}`} />
                      <span className={isHigh ? 'text-rose-400' : isMed ? 'text-amber-400' : 'text-emerald-400'}>
                        {task.priority}
                      </span>
                    </div>

                    <button onClick={() => deleteTask(task.id)} className="p-2 text-zinc-600 hover:text-rose-400 transition-all hover:bg-rose-500/10 rounded-lg shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              );
            })}
            {!isLoading && filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-600 border border-dashed border-nexus-border rounded-3xl bg-nexus-card/10 animate-fade-in">
                {filter === 'Today' ? (
                  <>
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4"><Check className="w-6 h-6 text-zinc-700" /></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">All tasks completed</p>
                  </>
                ) : (
                  <>
                    <Filter className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">No tasks found</p>
                  </>
                )}
            </div>
            )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="lg-sheet text-left max-w-md w-full relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-nexus-electric/20 border border-nexus-electric/30 flex items-center justify-center">
                  <ListTodo className="w-5 h-5 text-nexus-electric" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white m-0">Create Task</h3>
                  <p className="text-[11px] text-zinc-400 font-medium m-0">New cognitive assignment.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white squish">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={addTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Task Title</label>
                <input name="title" required className="w-full px-4 py-3 text-white text-xs" placeholder="e.g. Solve Calculus Chapter 4" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Subject</label>
                  <input name="subject" required className="w-full px-4 py-3 text-white text-xs" placeholder="e.g. Math" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Priority</label>
                  <LiquidSelect
                    name="priority"
                    value={modalPriority}
                    onChange={setModalPriority}
                    options={[
                      { value: TaskPriority.MEDIUM, label: 'Medium Priority' },
                      { value: TaskPriority.HIGH, label: 'High Priority' },
                      { value: TaskPriority.LOW, label: 'Low Priority' }
                    ]}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Due Date</label>
                  <input name="dueDate" type="datetime-local" className="w-full px-4 py-3 text-white text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Reminder</label>
                  <LiquidSelect
                    name="reminderOffset"
                    value={modalReminder}
                    onChange={setModalReminder}
                    options={REMINDER_OPTIONS.map(opt => ({
                      value: opt.value.toString(),
                      label: opt.label
                    }))}
                  />
                </div>
              </div>

              <div className="lg-sheet__actions pt-3">
                <button type="submit" className="lg-btn lg-btn--tinted lg-btn--lg w-full font-black uppercase tracking-wider text-xs shadow-xl">
                  Create Assignment
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="lg-btn lg-btn--lg w-full text-xs font-bold text-zinc-400 hover:text-white">
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
