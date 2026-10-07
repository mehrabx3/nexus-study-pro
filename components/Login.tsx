
import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Lock, ArrowLeft, LogIn, PlusCircle, Delete, Loader2, X, Palette, Check } from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile, AppTheme } from '../types';
import { audioEngine } from '../services/audioService';
import { THEMES } from '../App';
import { customThemeService } from '../services/customThemeService';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  currentTheme?: AppTheme;
  onUpdateTheme?: (theme: AppTheme) => void;
}

type AuthStep = 'LANDING' | 'LOGIN_NAME' | 'ENTER_PIN' | 'REGISTER_NAME' | 'REGISTER_PIN';

export const Login: React.FC<LoginProps> = ({ onLogin, currentTheme, onUpdateTheme }) => {
  const [step, setStep] = useState<AuthStep>('LANDING');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);
  
  const [pin, setPin] = useState('');
  const [loginName, setLoginName] = useState('');
  const [newUserName, setNewUserName] = useState('');
  
  const [shakeError, setShakeError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeThemeId = currentTheme || (localStorage.getItem('nexus_app_theme') as AppTheme) || 'apple_space_black';
  const activeThemeObj = THEMES.find(t => t.id === activeThemeId);

  const isLightOrWhiteTheme = activeThemeId === 'black_and_white' || activeThemeId === 'apple_monochrome' || activeThemeId === 'apple_starlight' || activeThemeId === 'apple_natural_titanium';
  const primaryBtnTextColor = isLightOrWhiteTheme ? '#000000' : '#ffffff';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    const storedUsers = await authService.getUsers();
    setUsers(storedUsers);
    setIsLoadingUsers(false);
  };

  const selectTheme = (themeId: AppTheme) => {
    audioEngine.playHaptic('pop');
    if (onUpdateTheme) {
      onUpdateTheme(themeId);
    } else {
      localStorage.setItem('nexus_app_theme', themeId);
      document.body.setAttribute('data-theme', themeId);
      if (themeId.startsWith('custom_')) {
        const customConfig = customThemeService.getCustomThemeById(themeId);
        if (customConfig) customThemeService.applyCustomThemeToDOM(customConfig);
      } else {
        customThemeService.removeCustomThemeFromDOM();
      }
    }
  };

  const handleLoginNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.name.toLowerCase() === loginName.toLowerCase());
    if (user) {
      setSelectedUser(user);
      setPin('');
      setStep('ENTER_PIN');
    } else {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
    }
  };

  const handlePinInput = (digit: string) => {
    audioEngine.playHaptic('click');
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      if (newPin.length === 4) {
        if (step === 'ENTER_PIN' && selectedUser) {
           validateLogin(selectedUser.uid, newPin);
        } else if (step === 'REGISTER_PIN') {
           completeRegistration(newPin);
        }
      }
    }
  };

  const handleBackspace = () => {
    audioEngine.playHaptic('pop');
    setPin(prev => prev.slice(0, -1));
  };

  const validateLogin = async (uid: string, enteredPin: string) => {
    setIsProcessing(true);
    const result = await authService.login(uid, enteredPin);
    setIsProcessing(false);
    
    if (result.success && result.user) {
      onLogin(result.user);
    } else {
      setShakeError(true);
      setPin('');
      setTimeout(() => setShakeError(false), 500);
    }
  };

  const startRegistration = () => {
    setNewUserName('');
    setPin('');
    setStep('REGISTER_NAME');
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      setStep('REGISTER_PIN');
    }
  };

  const completeRegistration = async (finalPin: string) => {
     setIsProcessing(true);
     try {
         const newUser = await authService.register(newUserName, finalPin);
         onLogin(newUser);
     } catch (e) {
         console.error(e);
         setShakeError(true);
         setTimeout(() => setShakeError(false), 500);
     } finally {
         setIsProcessing(false);
     }
  };

  const Keypad = () => (
    <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto mt-8">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
        <button
          key={num}
          onClick={() => handlePinInput(num.toString())}
          disabled={isProcessing}
          className="w-16 h-16 rounded-full text-xl font-medium border transition-all hover:scale-105 active:scale-95 flex items-center justify-center backdrop-blur-md disabled:opacity-50 disabled:pointer-events-none squish"
          style={{
            backgroundColor: 'var(--lg-fill, rgba(255, 255, 255, 0.08))',
            borderColor: 'var(--nexus-border, rgba(255, 255, 255, 0.15))',
            color: 'var(--lg-text, #ffffff)'
          }}
        >
          {num}
        </button>
      ))}
      <div className="w-16 h-16" /> {/* Layout Spacing Spacer */}
      <button
        onClick={() => handlePinInput('0')}
        disabled={isProcessing}
        className="w-16 h-16 rounded-full text-xl font-medium border transition-all hover:scale-105 active:scale-95 flex items-center justify-center backdrop-blur-md disabled:opacity-50 disabled:pointer-events-none squish"
        style={{
          backgroundColor: 'var(--lg-fill, rgba(255, 255, 255, 0.08))',
          borderColor: 'var(--nexus-border, rgba(255, 255, 255, 0.15))',
          color: 'var(--lg-text, #ffffff)'
        }}
      >
        0
      </button>
      <button
        onClick={handleBackspace}
        disabled={isProcessing}
        className="w-16 h-16 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 active:scale-90"
      >
        <Delete className="w-6 h-6" />
      </button>
    </div>
  );

  const PinDisplay = () => (
    <div className="flex justify-center gap-4 my-8 h-4 items-center">
      {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin text-nexus-electric" />
      ) : (
          [0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`
                w-4 h-4 rounded-full border border-white/20 transition-all duration-300
                ${i < pin.length ? 'bg-nexus-electric border-nexus-electric scale-110 shadow-[0_0_12px_rgba(var(--nexus-accent-rgb),0.6)]' : 'bg-transparent'}
              `}
            />
          ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-nexus-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Top Floating Theme Switcher Button */}
      <div className="fixed top-5 right-5 z-50">
        <button
          type="button"
          onClick={() => {
            audioEngine.playHaptic('click');
            setShowThemeModal(true);
          }}
          className="px-4 py-2.5 rounded-2xl liquid-glass border border-white/15 hover:border-white/30 text-xs font-bold text-white flex items-center gap-2.5 shadow-xl squish transition-all hover:bg-white/10"
        >
          <Palette className="w-4 h-4 text-nexus-electric" />
          <span>{activeThemeObj ? activeThemeObj.name : 'Theme'}</span>
        </button>
      </div>

      {/* Liquid Ambient Organic Floating Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="blob-1 absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-nexus-electric/15 blur-[140px] opacity-70" />
        <div className="blob-2 absolute -bottom-[10%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-nexus-violet/15 blur-[150px] opacity-60" />
      </div>

      <div className={`
         w-full max-w-md relative z-10 transition-all duration-500
         ${shakeError ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}
      `}>
        
        {step === 'LANDING' && (
          <div className="animate-fade-in space-y-10 text-center liquid-glass-card rounded-[3rem] p-10 border border-white/12 shadow-2xl">
            <div className="space-y-4">
               <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-nexus-electric to-nexus-violet p-0.5 shadow-2xl relative overflow-hidden mb-2 group transition-transform duration-500">
                  <div className="w-full h-full bg-[#09090c] rounded-[1.4rem] flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white relative z-10" />
                  </div>
               </div>
               <div>
                 <h1 className="text-3xl font-black text-white tracking-tight">Nexus Study Pro</h1>
                 <p className="text-zinc-400 text-xs font-semibold uppercase tracking-[0.25em] mt-1">Academic Immersion</p>
               </div>
            </div>

            <div className="space-y-3.5 w-full">
               <button 
                  onClick={() => setStep('LOGIN_NAME')}
                  className="w-full group relative p-4 rounded-2xl liquid-glass border border-white/15 hover:border-white/30 transition-all flex items-center justify-between overflow-hidden squish"
               >
                  <div className="flex items-center gap-4 relative z-10">
                     <div className="w-10 h-10 rounded-xl bg-nexus-electric/20 text-nexus-electric flex items-center justify-center font-bold">
                        <LogIn className="w-4 h-4 text-nexus-electric" />
                     </div>
                     <div className="text-left">
                        <div className="text-white font-black text-sm">Sign In</div>
                        <div className="text-zinc-400 text-[10px]">Access student workspace</div>
                     </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-all relative z-10" />
               </button>

               <button 
                  onClick={startRegistration}
                  className="w-full group relative p-4 rounded-2xl liquid-glass border border-white/8 hover:border-white/20 transition-all flex items-center justify-between squish"
               >
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                        <PlusCircle className="w-4 h-4" />
                     </div>
                     <div className="text-left">
                        <div className="text-white font-bold text-sm">New Student</div>
                        <div className="text-zinc-400 text-[10px]">Initialize clean profile</div>
                     </div>
                  </div>
               </button>
            </div>

            <div className="text-zinc-500 text-[10px] font-semibold tracking-wider uppercase">
               Personalized Cognitive Tracker
            </div>
          </div>
        )}

        {step === 'LOGIN_NAME' && (
          <div className="animate-slide-up liquid-glass-card border border-white/12 p-8 md:p-10 rounded-[2.8rem] shadow-2xl">
             <button 
                onClick={() => setStep('LANDING')}
                className="mb-6 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm"
             >
                <ArrowLeft className="w-4 h-4" /> Back
             </button>
             
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                <p className="text-zinc-400 text-sm mt-1">Please enter your profile name to continue.</p>
             </div>
             
             <form onSubmit={handleLoginNameSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Profile Name</label>
                    <input 
                        autoFocus
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        className="w-full rounded-2xl px-4 py-3.5 text-white outline-none transition-all text-lg liquid-input"
                        style={{
                          backgroundColor: 'var(--lg-fill, rgba(255, 255, 255, 0.08))',
                          borderColor: 'var(--nexus-border, rgba(255, 255, 255, 0.15))'
                        }}
                        placeholder="Enter your name..."
                    />
                </div>
                <button 
                    type="submit"
                    disabled={!loginName.trim() || isLoadingUsers}
                    className="w-full py-4 font-black rounded-2xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl active:scale-98 squish"
                    style={{
                      backgroundColor: 'var(--nexus-accent)',
                      color: primaryBtnTextColor,
                      boxShadow: '0 8px 24px color-mix(in srgb, var(--nexus-accent, #0a84ff) 35%, transparent)'
                    }}
                >
                    {isLoadingUsers ? <Loader2 className="w-5 h-5 animate-spin"/> : <span>Continue</span>}
                    <ArrowRight className="w-4 h-4" />
                </button>
             </form>
          </div>
        )}

        {step === 'ENTER_PIN' && selectedUser && (
          <div className="animate-slide-up text-center">
            <button 
              onClick={() => { setStep('LOGIN_NAME'); setPin(''); }}
              className="absolute left-0 top-0 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <img 
              src={selectedUser.avatar} 
              alt={selectedUser.name} 
              className="w-24 h-24 rounded-full border-4 border-black shadow-2xl mx-auto mb-6" 
            />
            <h2 className="text-2xl font-bold text-white mb-1">{selectedUser.name}</h2>
            <p className="text-zinc-500 text-sm flex items-center justify-center gap-2">
              <Lock className="w-3 h-3" /> Please enter your PIN
            </p>

            <PinDisplay />
            <Keypad />
          </div>
        )}

        {step === 'REGISTER_NAME' && (
          <div className="animate-slide-up liquid-glass-card border border-white/12 p-8 md:p-10 rounded-[2.8rem] shadow-2xl">
             <button 
                onClick={() => setStep('LANDING')}
                className="mb-6 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm"
             >
                <ArrowLeft className="w-4 h-4" /> Back
             </button>
             
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Create Your Profile</h2>
                <p className="text-zinc-400 text-sm mt-1">Start your journey with us.</p>
             </div>
             
             <form onSubmit={handleNameSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">What's your name?</label>
                    <input 
                        autoFocus
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full rounded-2xl px-4 py-3.5 text-white outline-none transition-all text-lg liquid-input"
                        style={{
                          backgroundColor: 'var(--lg-fill, rgba(255, 255, 255, 0.08))',
                          borderColor: 'var(--nexus-border, rgba(255, 255, 255, 0.15))'
                        }}
                        placeholder="e.g. Alex"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={!newUserName.trim()}
                    className="w-full py-4 font-black rounded-2xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl active:scale-98 squish"
                    style={{
                      backgroundColor: 'var(--nexus-accent)',
                      color: primaryBtnTextColor,
                      boxShadow: '0 8px 24px color-mix(in srgb, var(--nexus-accent, #0a84ff) 35%, transparent)'
                    }}
                >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
             </form>
          </div>
        )}

        {step === 'REGISTER_PIN' && (
           <div className="animate-slide-up text-center">
             <button 
                onClick={() => setStep('REGISTER_NAME')}
                className="absolute left-0 top-0 p-2 text-zinc-500 hover:text-white transition-colors"
             >
               <ArrowLeft className="w-6 h-6" />
             </button>

             <h2 className="text-2xl font-bold text-white mb-2">Set a Security PIN</h2>
             <p className="text-zinc-500 text-sm mb-8">Choose a 4-digit code to keep your data safe.</p>
             
             <div className="bg-nexus-card p-8 rounded-3xl border border-nexus-border backdrop-blur-md">
                 <PinDisplay />
                 <Keypad />
             </div>
           </div>
        )}

      </div>

      {/* Theme Selector Modal on Login Screen */}
      {showThemeModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setShowThemeModal(false)}
        >
          <div 
            className="lg-sheet max-w-2xl w-full p-6 sm:p-7 space-y-5 max-h-[85vh] flex flex-col overflow-hidden relative text-left"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-nexus-electric/15 border border-nexus-electric/30 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-nexus-electric" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Select App Theme</h3>
                  <p className="text-xs text-zinc-400">Choose a visual preset for your study workspace.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowThemeModal(false)} 
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {THEMES.map(theme => {
                const isSelected = activeThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      selectTheme(theme.id);
                      setShowThemeModal(false);
                    }}
                    className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all squish ${
                      isSelected
                        ? 'bg-nexus-electric/20 border-nexus-electric shadow-[0_0_18px_rgba(var(--nexus-accent-rgb),0.3)] ring-1 ring-nexus-electric'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center shrink-0 shadow-md"
                        style={{ backgroundColor: theme.colors[0] }}
                      >
                        <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: theme.colors[1] }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{theme.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{theme.description}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check className="w-3 h-3 stroke-[3px]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

