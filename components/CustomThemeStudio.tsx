import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Eye, 
  Save, 
  X, 
  Layers, 
  Sliders, 
  Sun, 
  Moon,
  Flame,
  Clock,
  ArrowRight
} from 'lucide-react';
import { CustomThemeConfig, AppTheme } from '../types';
import { 
  customThemeService, 
  PRESET_TEMPLATES, 
  hexToRgb, 
  hexToRgba 
} from '../services/customThemeService';
import { audioEngine } from '../services/audioService';

interface CustomThemeStudioProps {
  initialTheme?: CustomThemeConfig | null;
  onSave: (theme: CustomThemeConfig, shouldApply: boolean) => void;
  onClose: () => void;
  activeAppTheme: AppTheme;
}

const CURATED_ACCENTS = [
  '#0A84FF', // System Blue
  '#388BFD', // Midnight Cobalt
  '#64D2FF', // System Cyan
  '#30D158', // Activity Green
  '#AF52DE', // Deep Purple
  '#FC3D99', // Apple Music Pink
  '#FF9500', // Ultra Orange
  '#FF6422', // Hermès Orange
  '#FF3B30', // Product RED
  '#D8B486', // Desert Titanium
  '#E8DECE', // Starlight
  '#7B61FF', // VisionOS Violet
];

export const CustomThemeStudio: React.FC<CustomThemeStudioProps> = ({
  initialTheme,
  onSave,
  onClose,
  activeAppTheme
}) => {
  // Config state
  const [themeConfig, setThemeConfig] = useState<CustomThemeConfig>(() => {
    if (initialTheme) return { ...initialTheme };
    return customThemeService.createDefaultTheme('My Liquid Theme');
  });

  const [activeTab, setActiveTab] = useState<'colors' | 'glass' | 'presets'>('colors');
  const [isLivePreviewing, setIsLivePreviewing] = useState(false);

  // Live preview effect
  useEffect(() => {
    if (isLivePreviewing) {
      customThemeService.applyCustomThemeToDOM(themeConfig);
      document.body.setAttribute('data-theme', themeConfig.id);
    } else {
      // Revert to user active theme
      const currentCustom = customThemeService.getCustomThemeById(activeAppTheme);
      if (currentCustom) {
        customThemeService.applyCustomThemeToDOM(currentCustom);
      } else {
        customThemeService.removeCustomThemeFromDOM();
      }
      document.body.setAttribute('data-theme', activeAppTheme);
    }

    return () => {
      if (isLivePreviewing) {
        const currentCustom = customThemeService.getCustomThemeById(activeAppTheme);
        if (currentCustom) {
          customThemeService.applyCustomThemeToDOM(currentCustom);
        } else {
          customThemeService.removeCustomThemeFromDOM();
        }
        document.body.setAttribute('data-theme', activeAppTheme);
      }
    };
  }, [isLivePreviewing, themeConfig, activeAppTheme]);

  const updateField = <K extends keyof CustomThemeConfig>(field: K, value: CustomThemeConfig[K]) => {
    setThemeConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyPreset = (presetId: string) => {
    audioEngine.playHaptic('pop');
    const template = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (!template) return;
    setThemeConfig(prev => ({
      ...prev,
      basePreset: presetId,
      ...template.config
    }));
  };

  const handleSave = (shouldApply: boolean) => {
    audioEngine.playHaptic('success');
    customThemeService.saveCustomTheme(themeConfig);
    if (shouldApply) {
      customThemeService.applyCustomThemeToDOM(themeConfig);
      document.body.setAttribute('data-theme', themeConfig.id);
    }
    onSave(themeConfig, shouldApply);
  };

  const cardRgba = hexToRgba(themeConfig.cardBg, themeConfig.cardOpacity);
  const borderRgba = hexToRgba(themeConfig.borderColor, themeConfig.borderOpacity);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 animate-fade-in bg-black/85 backdrop-blur-2xl">
      <div 
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-[2.5rem] overflow-hidden border border-white/15 shadow-2xl relative"
        style={{
          background: 'linear-gradient(145deg, rgba(20, 20, 24, 0.95) 0%, rgba(10, 10, 12, 0.98) 100%)',
          boxShadow: '0 30px 90px -15px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.18)'
        }}
      >
        {/* Top Liquid Header */}
        <div className="p-6 sm:p-7 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform"
              style={{ 
                background: `linear-gradient(135deg, ${themeConfig.accent}30, ${themeConfig.accentAlt}20)`,
                border: `1px solid ${themeConfig.accent}50` 
              }}
            >
              <Palette className="w-6 h-6" style={{ color: themeConfig.accent }} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <input 
                  type="text" 
                  value={themeConfig.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Theme Name..."
                  className="bg-transparent text-white font-black text-xl sm:text-2xl focus:outline-none focus:ring-1 focus:ring-white/20 rounded-lg px-1.5 py-0.5 border-b border-transparent hover:border-white/20 transition-all max-w-[260px] sm:max-w-xs"
                />
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
                  Studio
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Customize colors, optics, and liquid frosted glass depth.</p>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              onClick={() => {
                audioEngine.playHaptic('click');
                setIsLivePreviewing(!isLivePreviewing);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border squish ${
                isLivePreviewing 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10' 
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
              }`}
              title="Preview changes in full application"
            >
              <Eye className="w-4 h-4" />
              <span>{isLivePreviewing ? 'Exit Full Preview' : 'Test Drive'}</span>
            </button>

            <button
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 rounded-2xl text-xs font-black text-black transition-all flex items-center gap-2 shadow-xl squish"
              style={{
                background: themeConfig.accent,
                boxShadow: `0 8px 24px ${themeConfig.accent}40`
              }}
            >
              <Check className="w-4 h-4 stroke-[3px]" />
              <span>Save & Apply</span>
            </button>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all squish"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Body: Split View (Controls + Real-Time Live Preview) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Controls Column (7 cols on lg) */}
          <div className="lg:col-span-7 p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-7 border-b lg:border-b-0 lg:border-r border-white/10">
            
            {/* Segment Switcher */}
            <div className="flex gap-1.5 p-1.5 rounded-2xl bg-white/5 border border-white/10 w-fit">
              <button
                onClick={() => { audioEngine.playHaptic('click'); setActiveTab('colors'); }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'colors' 
                    ? 'bg-white text-black shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Colors & Shading</span>
              </button>
              <button
                onClick={() => { audioEngine.playHaptic('click'); setActiveTab('glass'); }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'glass' 
                    ? 'bg-white text-black shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Glass & Optics</span>
              </button>
              <button
                onClick={() => { audioEngine.playHaptic('click'); setActiveTab('presets'); }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'presets' 
                    ? 'bg-white text-black shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Templates</span>
              </button>
            </div>

            {/* TAB 1: COLORS */}
            {activeTab === 'colors' && (
              <div className="space-y-6 animate-fade-in">
                {/* Quick Apple Accent Row */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-2.5">
                    Quick Apple Accents
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {CURATED_ACCENTS.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => {
                          audioEngine.playHaptic('pop');
                          updateField('accent', hex);
                        }}
                        className={`w-8 h-8 rounded-full border transition-transform squish relative ${
                          themeConfig.accent.toLowerCase() === hex.toLowerCase() 
                            ? 'scale-110 border-white ring-2 ring-white/40 shadow-lg' 
                            : 'border-white/20 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                      >
                        {themeConfig.accent.toLowerCase() === hex.toLowerCase() && (
                          <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto stroke-[3px]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Canvas Background Color */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Main Canvas</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{themeConfig.bg}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-inner shrink-0">
                        <input 
                          type="color" 
                          value={themeConfig.bg}
                          onChange={(e) => updateField('bg', e.target.value)}
                          className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-100"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={themeConfig.bg}
                        onChange={(e) => updateField('bg', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  {/* Primary Accent Color */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Primary Accent</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{themeConfig.accent}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-inner shrink-0">
                        <input 
                          type="color" 
                          value={themeConfig.accent}
                          onChange={(e) => updateField('accent', e.target.value)}
                          className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-100"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={themeConfig.accent}
                        onChange={(e) => updateField('accent', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  {/* Secondary Glow / Alt Accent */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Secondary Accent</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{themeConfig.accentAlt}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-inner shrink-0">
                        <input 
                          type="color" 
                          value={themeConfig.accentAlt}
                          onChange={(e) => updateField('accentAlt', e.target.value)}
                          className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-100"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={themeConfig.accentAlt}
                        onChange={(e) => updateField('accentAlt', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  {/* Card Surface Base */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Card Base</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{themeConfig.cardBg}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-inner shrink-0">
                        <input 
                          type="color" 
                          value={themeConfig.cardBg}
                          onChange={(e) => updateField('cardBg', e.target.value)}
                          className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-100"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={themeConfig.cardBg}
                        onChange={(e) => updateField('cardBg', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  {/* Primary Text Color */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Primary Text</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{themeConfig.textColor}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-inner shrink-0">
                        <input 
                          type="color" 
                          value={themeConfig.textColor}
                          onChange={(e) => updateField('textColor', e.target.value)}
                          className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-100"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={themeConfig.textColor}
                        onChange={(e) => updateField('textColor', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  {/* Subtitle / Muted Text Color */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Muted Text</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{themeConfig.textMuted}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-inner shrink-0">
                        <input 
                          type="color" 
                          value={themeConfig.textMuted}
                          onChange={(e) => updateField('textMuted', e.target.value)}
                          className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-100"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={themeConfig.textMuted}
                        onChange={(e) => updateField('textMuted', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  {/* Border Rim Color */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Border Rim Tint</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{themeConfig.borderColor}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-inner shrink-0">
                        <input 
                          type="color" 
                          value={themeConfig.borderColor}
                          onChange={(e) => updateField('borderColor', e.target.value)}
                          className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-100"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={themeConfig.borderColor}
                        onChange={(e) => updateField('borderColor', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Glass Transparency Shortcut */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Glass Transparency</span>
                      <span className="text-[10px] text-zinc-400">Quick adjust liquid glass opacity</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">{Math.round(themeConfig.glassOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.00" 
                    max="0.40" 
                    step="0.01"
                    value={themeConfig.glassOpacity}
                    onChange={(e) => updateField('glassOpacity', parseFloat(e.target.value))}
                    className="lg-slider"
                    style={{ '--v': `${(themeConfig.glassOpacity / 0.40) * 100}%` } as React.CSSProperties}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: GLASS & OPTICS */}
            {activeTab === 'glass' && (
              <div className="space-y-6 animate-fade-in">
                {/* Primary Glass Transparency Slider */}
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/15 space-y-4 shadow-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white block">Glass Transparency</span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-nexus-electric/20 text-nexus-electric border border-nexus-electric/30">
                          Liquid Layer
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400">Controls how see-through the liquid glass surfaces & frosted reflections appear</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-white">{Math.round(themeConfig.glassOpacity * 100)}%</span>
                      <span className="text-[9px] text-zinc-500 block font-medium">Surface Opacity</span>
                    </div>
                  </div>
                  
                  <input 
                    type="range" 
                    min="0.00" 
                    max="0.40" 
                    step="0.01"
                    value={themeConfig.glassOpacity}
                    onChange={(e) => updateField('glassOpacity', parseFloat(e.target.value))}
                    className="lg-slider"
                    style={{ '--v': `${(themeConfig.glassOpacity / 0.40) * 100}%` } as React.CSSProperties}
                  />

                  {/* Quick Glass Transparency Presets */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {[
                      { label: 'Crystal Clear', val: 0.02, desc: '2% sheen' },
                      { label: 'Apple Standard', val: 0.08, desc: '8% liquid' },
                      { label: 'Medium Frost', val: 0.16, desc: '16% frost' },
                      { label: 'Heavy Glass', val: 0.28, desc: '28% dense' }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          audioEngine.playHaptic('pop');
                          updateField('glassOpacity', preset.val);
                        }}
                        className={`p-2 rounded-xl text-left border transition-all squish ${
                          Math.abs(themeConfig.glassOpacity - preset.val) < 0.02
                            ? 'bg-white/15 border-white text-white shadow-md'
                            : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <p className="text-[11px] font-bold leading-tight">{preset.label}</p>
                        <p className="text-[9px] text-zinc-500">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Surface Base Transparency Slider */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-white block">Card Background Opacity</span>
                      <span className="text-[10px] text-zinc-400">Underlying solid card surface fill level</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">{Math.round(themeConfig.cardOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.20" 
                    max="1.00" 
                    step="0.05"
                    value={themeConfig.cardOpacity}
                    onChange={(e) => updateField('cardOpacity', parseFloat(e.target.value))}
                    className="lg-slider"
                    style={{ '--v': `${((themeConfig.cardOpacity - 0.20) / 0.80) * 100}%` } as React.CSSProperties}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                    <span>Sheer (20%)</span>
                    <span>Translucent (50%)</span>
                    <span>Balanced (75%)</span>
                    <span>Solid (100%)</span>
                  </div>
                </div>

                {/* Backdrop Blur Intensity */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-white block">Backdrop Blur Depth</span>
                      <span className="text-[10px] text-zinc-400">Frost diffusion on background elements</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">{themeConfig.glassBlur}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    step="2"
                    value={themeConfig.glassBlur}
                    onChange={(e) => updateField('glassBlur', parseInt(e.target.value))}
                    className="lg-slider"
                    style={{ '--v': `${(themeConfig.glassBlur / 50) * 100}%` } as React.CSSProperties}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                    <span>Clear (0px)</span>
                    <span>Subtle (16px)</span>
                    <span>Apple HIG (32px)</span>
                    <span>Ultra Mist (50px)</span>
                  </div>
                </div>

                {/* Specular Rim Reflection */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-white block">Specular Rim Highlight</span>
                      <span className="text-[10px] text-zinc-400">Polished top-edge liquid light reflection</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">{Math.round(themeConfig.specularOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="0.45" 
                    step="0.02"
                    value={themeConfig.specularOpacity}
                    onChange={(e) => updateField('specularOpacity', parseFloat(e.target.value))}
                    className="lg-slider"
                    style={{ '--v': `${(themeConfig.specularOpacity / 0.45) * 100}%` } as React.CSSProperties}
                  />
                </div>

                {/* Saturation Vibrancy */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-white block">Refraction Saturation</span>
                      <span className="text-[10px] text-zinc-400">Boost color vibrancy through frosted glass</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">{themeConfig.glassSaturation}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="240" 
                    step="10"
                    value={themeConfig.glassSaturation}
                    onChange={(e) => updateField('glassSaturation', parseInt(e.target.value))}
                    className="lg-slider"
                    style={{ '--v': `${((themeConfig.glassSaturation - 100) / 140) * 100}%` } as React.CSSProperties}
                  />
                </div>

                {/* Border Outline Opacity */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-white block">Border Outline Stroke</span>
                      <span className="text-[10px] text-zinc-400">Subtle outer silhouette intensity</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">{Math.round(themeConfig.borderOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="0.40" 
                    step="0.01"
                    value={themeConfig.borderOpacity}
                    onChange={(e) => updateField('borderOpacity', parseFloat(e.target.value))}
                    className="lg-slider"
                    style={{ '--v': `${((themeConfig.borderOpacity - 0.05) / 0.35) * 100}%` } as React.CSSProperties}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: PREMADE TEMPLATES */}
            {activeTab === 'presets' && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-zinc-400">
                  Select any iconic Apple design edition below to load its exact color palette and optical parameters as your starting canvas:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                  {PRESET_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => handleApplyPreset(tmpl.id)}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between group squish ${
                        themeConfig.basePreset === tmpl.id 
                          ? 'bg-white/15 border-white ring-1 ring-white/30' 
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div 
                          className="w-10 h-10 rounded-xl border border-white/15 flex items-center justify-center shadow-md shrink-0" 
                          style={{ backgroundColor: tmpl.config.bg }}
                        >
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: tmpl.config.accent }} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white leading-tight">{tmpl.name}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{tmpl.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Real-time Interactive Preview Column (5 cols on lg) */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-black/40 overflow-y-auto custom-scrollbar">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" />
                  Live Liquid Preview
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Real-time Optic Render</span>
              </div>

              {/* Mockup Canvas Screen */}
              <div 
                className="rounded-3xl p-5 border shadow-2xl relative overflow-hidden transition-all duration-300"
                style={{
                  backgroundColor: themeConfig.bg,
                  borderColor: borderRgba,
                }}
              >
                {/* Background Ambient Glow */}
                <div 
                  className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-500"
                  style={{ backgroundColor: themeConfig.accent }}
                />
                <div 
                  className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500"
                  style={{ backgroundColor: themeConfig.accentAlt }}
                />

                <div className="relative z-10 space-y-4">
                  {/* Mock Dynamic Island */}
                  <div 
                    className="mx-auto w-fit px-4 py-1.5 rounded-full flex items-center gap-2.5 shadow-lg border transition-all"
                    style={{
                      background: `linear-gradient(180deg, rgba(255,255,255,${themeConfig.glassOpacity * 1.5}) 0%, rgba(255,255,255,0.02) 100%)`,
                      backdropFilter: `blur(${themeConfig.glassBlur}px) saturate(${themeConfig.glassSaturation}%)`,
                      borderColor: borderRgba,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,${themeConfig.specularOpacity})`
                    }}
                  >
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeConfig.accent }} />
                    <span className="text-[10px] font-bold" style={{ color: themeConfig.textColor }}>
                      Deep Focus • 25:00
                    </span>
                    <Clock className="w-3 h-3" style={{ color: themeConfig.accent }} />
                  </div>

                  {/* Mock Liquid Bento Card */}
                  <div 
                    className="p-5 rounded-2xl border transition-all duration-300 space-y-3"
                    style={{
                      backgroundColor: cardRgba,
                      backdropFilter: `blur(${themeConfig.glassBlur}px) saturate(${themeConfig.glassSaturation}%)`,
                      borderColor: borderRgba,
                      boxShadow: `0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,${themeConfig.specularOpacity})`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: themeConfig.textMuted }}>
                        Bento Module
                      </span>
                      <span 
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${themeConfig.accent}20`,
                          color: themeConfig.accent,
                          border: `1px solid ${themeConfig.accent}40`
                        }}
                      >
                        Active
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black tracking-tight" style={{ color: themeConfig.textColor }}>
                        {themeConfig.name || 'Sample Title'}
                      </h4>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: themeConfig.textMuted }}>
                        Crisp SF typography with specular highlights and liquid frosted transparency.
                      </p>
                    </div>

                    {/* Mock Progress Activity Ring & Button */}
                    <div className="pt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: themeConfig.accent }}>
                          <Flame className="w-3.5 h-3.5" style={{ color: themeConfig.accent }} />
                        </div>
                        <div>
                          <span className="text-[11px] font-black block leading-none" style={{ color: themeConfig.textColor }}>420 XP</span>
                          <span className="text-[9px]" style={{ color: themeConfig.textMuted }}>Today</span>
                        </div>
                      </div>

                      <button 
                        className="px-4 py-2 rounded-xl text-xs font-black shadow-md transition-transform"
                        style={{
                          backgroundColor: themeConfig.accent,
                          color: themeConfig.bg.startsWith('#f') || themeConfig.bg.startsWith('#e') ? '#ffffff' : '#000000',
                          boxShadow: `0 4px 14px ${themeConfig.accent}40`
                        }}
                      >
                        Action
                      </button>
                    </div>
                  </div>

                  {/* Secondary Liquid Pill */}
                  <div 
                    className="p-3 rounded-xl border flex items-center justify-between"
                    style={{
                      backgroundColor: cardRgba,
                      borderColor: borderRgba,
                      backdropFilter: `blur(${themeConfig.glassBlur}px)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,${themeConfig.specularOpacity})`
                    }}
                  >
                    <span className="text-xs font-medium" style={{ color: themeConfig.textColor }}>
                      Segmented State
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeConfig.accentAlt }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">Theme Blueprint</span>
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-zinc-400">
                <span>Blur: {themeConfig.glassBlur}px</span>
                <span>•</span>
                <span>Shine: {Math.round(themeConfig.specularOpacity * 100)}%</span>
                <span>•</span>
                <span>Sat: {themeConfig.glassSaturation}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
