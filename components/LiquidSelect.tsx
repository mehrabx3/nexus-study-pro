import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { audioEngine } from '../services/audioService';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

export interface LiquidSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  name?: string;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LiquidSelect: React.FC<LiquidSelectProps> = ({
  value,
  onChange,
  options,
  name,
  placeholder = 'Select an option',
  className = '',
  menuClassName = '',
  disabled = false,
  size = 'md',
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to SelectOption objects
  const normalizedOptions: SelectOption[] = options.map(opt => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (disabled) return;
    audioEngine.playHaptic('click');
    setIsOpen(prev => !prev);
  };

  const handleSelect = (val: string) => {
    audioEngine.playHaptic('pop');
    onChange(val);
    setIsOpen(false);
  };

  const sizeClasses = {
    sm: 'h-9 px-3 text-xs rounded-xl',
    md: 'h-11 px-4 text-xs font-semibold rounded-2xl',
    lg: 'h-13 px-5 text-sm font-semibold rounded-2xl'
  };

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      {/* Hidden input for standard form submission compatibility */}
      {name && <input type="hidden" name={name} value={value} />}

      {label && (
        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`
          w-full flex items-center justify-between gap-3 text-left transition-all duration-200
          liquid-select group relative overflow-hidden select-none cursor-pointer
          ${sizeClasses[size]}
          ${isOpen 
            ? 'ring-2 ring-nexus-electric/50 border-nexus-electric shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.25)]' 
            : 'border border-white/10 hover:border-white/25 hover:bg-white/[0.08]'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'squish'}
          ${className}
        `}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          {selectedOption?.icon && (
            <span className="shrink-0 text-nexus-electric">{selectedOption.icon}</span>
          )}
          <span className={`truncate ${selectedOption ? 'text-nexus-electric font-bold tracking-tight' : 'text-zinc-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="shrink-0 text-zinc-400 group-hover:text-white transition-colors"
        >
          <ChevronDown className="w-4 h-4 stroke-[2.5px]" />
        </motion.div>
      </button>

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: 'spring', damping: 24, stiffness: 350 }}
            className={`
              absolute left-0 right-0 z-[150] mt-2 p-1.5 rounded-2xl
              liquid-glass-menu border border-white/15 shadow-2xl overflow-hidden
              max-h-60 overflow-y-auto custom-scrollbar
              ${menuClassName}
            `}
            style={{
              background: 'linear-gradient(145deg, rgba(20, 20, 24, 0.96) 0%, rgba(10, 10, 12, 0.98) 100%)',
              boxShadow: '0 24px 60px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.18)',
              backdropFilter: 'blur(28px) saturate(190%)',
              WebkitBackdropFilter: 'blur(28px) saturate(190%)'
            }}
          >
            <div className="space-y-1">
              {normalizedOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`
                      w-full px-3.5 py-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-3
                      squish select-none group
                      ${isSelected 
                        ? 'bg-nexus-electric/20 text-nexus-electric font-black border border-nexus-electric/40 shadow-[0_0_12px_rgba(var(--nexus-accent-rgb),0.2)]' 
                        : 'text-zinc-300 hover:text-white hover:bg-white/10'}
                    `}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      {option.icon && (
                        <span className={`shrink-0 ${isSelected ? 'text-nexus-electric' : 'text-zinc-400 group-hover:text-white'}`}>
                          {option.icon}
                        </span>
                      )}
                      <div className="truncate">
                        <span className="block truncate">{option.label}</span>
                        {option.description && (
                          <span className="text-[10px] text-zinc-500 block truncate mt-0.5">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-4 h-4 rounded-full bg-nexus-electric text-white flex items-center justify-center shrink-0 shadow-sm"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3px]" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
