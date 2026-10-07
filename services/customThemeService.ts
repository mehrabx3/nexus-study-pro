import { CustomThemeConfig } from '../types';

const STORAGE_KEY = 'nexus_custom_themes';

// Helper to convert Hex to RGB components
export function hexToRgb(hex: string): { r: number; g: number; b: number; str: string } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) {
    return { r: 10, g: 132, b: 255, str: '10, 132, 255' };
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return { r, g, b, str: `${r}, ${g}, ${b}` };
}

// Helper to convert hex + opacity to rgba string
export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  config: Omit<CustomThemeConfig, 'id' | 'name' | 'createdAt'>;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'black_and_white',
    name: 'Black & White (Monochrome)',
    description: 'High-contrast studio minimalism with pure diamond white accents on deep pitch black',
    config: {
      basePreset: 'black_and_white',
      bg: '#000000',
      cardBg: '#121214',
      cardOpacity: 0.82,
      accent: '#FFFFFF',
      accentAlt: '#E4E4E7',
      textColor: '#FFFFFF',
      textMuted: '#A1A1AA',
      borderColor: '#FFFFFF',
      borderOpacity: 0.24,
      glassBlur: 32,
      glassOpacity: 0.12,
      glassSaturation: 100,
      specularOpacity: 0.35,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_space_black',
    name: 'Space Black Pro',
    description: 'iPhone 16 Pro Deep Obsidian & Cupertino Blue',
    config: {
      basePreset: 'apple_space_black',
      bg: '#000000',
      cardBg: '#1c1c1e',
      cardOpacity: 0.70,
      accent: '#0A84FF',
      accentAlt: '#5E5CE6',
      textColor: '#FFFFFF',
      textMuted: '#8E8E93',
      borderColor: '#38383A',
      borderOpacity: 0.16,
      glassBlur: 32,
      glassOpacity: 0.08,
      glassSaturation: 190,
      specularOpacity: 0.22,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_monochrome',
    name: 'Monochrome Slate',
    description: 'Studio High-Contrast Minimalism with Titanium White',
    config: {
      basePreset: 'apple_monochrome',
      bg: '#09090B',
      cardBg: '#141416',
      cardOpacity: 0.82,
      accent: '#F4F4F5',
      accentAlt: '#E4E4E7',
      textColor: '#FFFFFF',
      textMuted: '#A1A1AA',
      borderColor: '#E4E4E7',
      borderOpacity: 0.22,
      glassBlur: 32,
      glassOpacity: 0.10,
      glassSaturation: 100,
      specularOpacity: 0.30,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_midnight',
    name: 'Midnight',
    description: 'MacBook Air M3 Inky Midnight & Cobalt Luster',
    config: {
      basePreset: 'apple_midnight',
      bg: '#070A12',
      cardBg: '#0E1626',
      cardOpacity: 0.75,
      accent: '#388BFD',
      accentAlt: '#58A6FF',
      textColor: '#F0F6FC',
      textMuted: '#8B949E',
      borderColor: '#388BFD',
      borderOpacity: 0.22,
      glassBlur: 32,
      glassOpacity: 0.08,
      glassSaturation: 190,
      specularOpacity: 0.24,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_desert_titanium',
    name: 'Desert Titanium',
    description: 'iPhone 16 Pro Warm Metallic Sand & Gold Luster',
    config: {
      basePreset: 'apple_desert_titanium',
      bg: '#141210',
      cardBg: '#221D19',
      cardOpacity: 0.75,
      accent: '#D8B486',
      accentAlt: '#F0D6B2',
      textColor: '#FAF7F2',
      textMuted: '#A3998F',
      borderColor: '#D8B486',
      borderOpacity: 0.20,
      glassBlur: 30,
      glassOpacity: 0.07,
      glassSaturation: 180,
      specularOpacity: 0.20,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_deep_purple',
    name: 'Deep Purple',
    description: 'iPhone 14 Pro Obsidian & Royal Apple Violet',
    config: {
      basePreset: 'apple_deep_purple',
      bg: '#0D0817',
      cardBg: '#1B122B',
      cardOpacity: 0.75,
      accent: '#AF52DE',
      accentAlt: '#BF5AF2',
      textColor: '#F5EEFB',
      textMuted: '#9D8EA8',
      borderColor: '#AF52DE',
      borderOpacity: 0.24,
      glassBlur: 32,
      glassOpacity: 0.08,
      glassSaturation: 200,
      specularOpacity: 0.25,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_sierra_blue',
    name: 'Sierra Blue',
    description: 'iPhone 13 Pro Crystalline Icy Slate & Sky Cyan',
    config: {
      basePreset: 'apple_sierra_blue',
      bg: '#0A111A',
      cardBg: '#121E30',
      cardOpacity: 0.75,
      accent: '#64D2FF',
      accentAlt: '#8ADFFF',
      textColor: '#F0F8FF',
      textMuted: '#8E9FA8',
      borderColor: '#64D2FF',
      borderOpacity: 0.22,
      glassBlur: 30,
      glassOpacity: 0.07,
      glassSaturation: 185,
      specularOpacity: 0.22,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_hermes',
    name: 'Hermès Noir',
    description: 'Apple Watch Hermès Obsidian & Heritage Orange',
    config: {
      basePreset: 'apple_hermes',
      bg: '#09090A',
      cardBg: '#18181C',
      cardOpacity: 0.75,
      accent: '#FF6422',
      accentAlt: '#FF8542',
      textColor: '#FFFFFF',
      textMuted: '#929298',
      borderColor: '#FF6422',
      borderOpacity: 0.24,
      glassBlur: 32,
      glassOpacity: 0.08,
      glassSaturation: 195,
      specularOpacity: 0.25,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_vision_os',
    name: 'VisionOS Spatial',
    description: 'Apple Vision Pro Spatial Glass & Prism Glow',
    config: {
      basePreset: 'apple_vision_os',
      bg: '#09090D',
      cardBg: '#161722',
      cardOpacity: 0.75,
      accent: '#7B61FF',
      accentAlt: '#50E3C2',
      textColor: '#FFFFFF',
      textMuted: '#9A9EB0',
      borderColor: '#7B61FF',
      borderOpacity: 0.25,
      glassBlur: 40,
      glassOpacity: 0.10,
      glassSaturation: 220,
      specularOpacity: 0.30,
      borderRadius: 28,
    }
  },
  {
    id: 'apple_light_sequoia',
    name: 'Sequoia Frost Light',
    description: 'macOS Sequoia Pure Light Mode & Cupertino Blue',
    config: {
      basePreset: 'apple_light_sequoia',
      bg: '#F2F2F7',
      cardBg: '#FFFFFF',
      cardOpacity: 0.85,
      accent: '#007AFF',
      accentAlt: '#5856D6',
      textColor: '#1C1C1E',
      textMuted: '#636366',
      borderColor: '#D1D1D6',
      borderOpacity: 0.18,
      glassBlur: 28,
      glassOpacity: 0.12,
      glassSaturation: 160,
      specularOpacity: 0.40,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_starlight',
    name: 'Starlight Champagne',
    description: 'Apple Watch Champagne & Warm Metallic Luster',
    config: {
      basePreset: 'apple_starlight',
      bg: '#181715',
      cardBg: '#26231F',
      cardOpacity: 0.75,
      accent: '#E8DECE',
      accentAlt: '#F3EBDD',
      textColor: '#FAF7F2',
      textMuted: '#9E988E',
      borderColor: '#E8DECE',
      borderOpacity: 0.18,
      glassBlur: 30,
      glassOpacity: 0.08,
      glassSaturation: 180,
      specularOpacity: 0.22,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_product_red',
    name: 'Product (RED)',
    description: 'Special Edition Crimson & Radiant Scarlet',
    config: {
      basePreset: 'apple_product_red',
      bg: '#120505',
      cardBg: '#220E0E',
      cardOpacity: 0.75,
      accent: '#FF3B30',
      accentAlt: '#FF453A',
      textColor: '#FFF5F5',
      textMuted: '#A88D8D',
      borderColor: '#FF3B30',
      borderOpacity: 0.24,
      glassBlur: 32,
      glassOpacity: 0.08,
      glassSaturation: 200,
      specularOpacity: 0.25,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_ultra_orange',
    name: 'Ultra Action Orange',
    description: 'Apple Watch Ultra Titanium & International Orange',
    config: {
      basePreset: 'apple_ultra_orange',
      bg: '#0E0C0A',
      cardBg: '#1D1813',
      cardOpacity: 0.75,
      accent: '#FF9500',
      accentAlt: '#FFB340',
      textColor: '#FFFBF5',
      textMuted: '#A0968B',
      borderColor: '#FF9500',
      borderOpacity: 0.24,
      glassBlur: 32,
      glassOpacity: 0.08,
      glassSaturation: 190,
      specularOpacity: 0.22,
      borderRadius: 24,
    }
  },
  {
    id: 'apple_fitness',
    name: 'Fitness+ Rings',
    description: 'Activity Move, Exercise & Stand Tri-Color',
    config: {
      basePreset: 'apple_fitness',
      bg: '#000000',
      cardBg: '#141418',
      cardOpacity: 0.75,
      accent: '#30D158',
      accentAlt: '#FF2D55',
      textColor: '#FFFFFF',
      textMuted: '#8E8E93',
      borderColor: '#30D158',
      borderOpacity: 0.22,
      glassBlur: 32,
      glassOpacity: 0.08,
      glassSaturation: 210,
      specularOpacity: 0.24,
      borderRadius: 24,
    }
  }
];

class CustomThemeService {
  getCustomThemes(): CustomThemeConfig[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to read custom themes:', err);
      return [];
    }
  }

  getCustomThemeById(id: string): CustomThemeConfig | null {
    const list = this.getCustomThemes();
    return list.find(t => t.id === id) || null;
  }

  saveCustomTheme(theme: CustomThemeConfig): void {
    try {
      const list = this.getCustomThemes();
      const existingIdx = list.findIndex(t => t.id === theme.id);
      let updated: CustomThemeConfig[];
      if (existingIdx >= 0) {
        updated = [...list];
        updated[existingIdx] = theme;
      } else {
        updated = [theme, ...list];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save custom theme:', err);
    }
  }

  deleteCustomTheme(id: string): void {
    try {
      const list = this.getCustomThemes().filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error('Failed to delete custom theme:', err);
    }
  }

  createDefaultTheme(name = 'My Liquid Custom'): CustomThemeConfig {
    const defaultTemplate = PRESET_TEMPLATES[1]; // Midnight
    return {
      id: `custom_${Date.now()}`,
      name,
      createdAt: Date.now(),
      ...defaultTemplate.config
    };
  }

  createFromPreset(presetId: string, name?: string): CustomThemeConfig {
    const template = PRESET_TEMPLATES.find(p => p.id === presetId) || PRESET_TEMPLATES[0];
    return {
      id: `custom_${Date.now()}`,
      name: name || `${template.name} Custom`,
      createdAt: Date.now(),
      ...template.config
    };
  }

  applyCustomThemeToDOM(config: CustomThemeConfig | null): void {
    const styleId = 'nexus-custom-theme-vars';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!config) {
      if (styleTag) {
        styleTag.remove();
      }
      return;
    }

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    const { str: accentRgb } = hexToRgb(config.accent);
    const cardRgba = hexToRgba(config.cardBg, config.cardOpacity);
    const borderRgba = hexToRgba(config.borderColor, config.borderOpacity);
    const isLightMode = config.textColor.toLowerCase().startsWith('#1') || config.textColor.toLowerCase().startsWith('#2');

    styleTag.textContent = `
      :root, [data-theme='${config.id}'], [data-theme^='custom_'] {
        --nexus-bg: ${config.bg} !important;
        --nexus-card: ${cardRgba} !important;
        --nexus-accent: ${config.accent} !important;
        --nexus-accent-alt: ${config.accentAlt} !important;
        --nexus-accent-rgb: ${accentRgb} !important;
        --nexus-border: ${borderRgba} !important;
        --nexus-custom-text: ${config.textColor} !important;
        --nexus-custom-text-muted: ${config.textMuted} !important;
        --lg-accent: ${config.accent} !important;
        --lg-blur: ${config.glassBlur}px !important;
        --lg-saturate: ${config.glassSaturation}% !important;
        --lg-fill: rgba(255, 255, 255, ${config.glassOpacity}) !important;
        --lg-surface: rgba(255, 255, 255, ${config.glassOpacity * 0.8}) !important;
        --lg-border: ${borderRgba} !important;
        --lg-highlight: rgba(255, 255, 255, ${config.specularOpacity}) !important;
      }

      [data-theme='${config.id}'] body, 
      [data-theme^='custom_'] body {
        background-color: ${config.bg} !important;
        color: ${config.textColor} !important;
      }

      ${isLightMode ? `
        [data-theme='${config.id}'] .text-white,
        [data-theme='${config.id}'] .text-zinc-100,
        [data-theme='${config.id}'] .text-zinc-200,
        [data-theme='${config.id}'] .text-zinc-300 {
          color: ${config.textColor} !important;
        }
        [data-theme='${config.id}'] .text-zinc-400,
        [data-theme='${config.id}'] .text-zinc-500 {
          color: ${config.textMuted} !important;
        }
        [data-theme='${config.id}'] .bg-nexus-black,
        [data-theme='${config.id}'] .bg-zinc-900,
        [data-theme='${config.id}'] .bg-zinc-950 {
          background-color: ${config.bg} !important;
        }
      ` : ''}

      [data-theme='${config.id}'] .liquid-glass,
      [data-theme='${config.id}'] .liquid-dock {
        background: linear-gradient(135deg, rgba(255, 255, 255, ${config.glassOpacity}) 0%, rgba(255, 255, 255, ${Math.max(0.005, config.glassOpacity * 0.25)}) 100%) !important;
        backdrop-filter: blur(${config.glassBlur}px) saturate(${config.glassSaturation}%) !important;
        -webkit-backdrop-filter: blur(${config.glassBlur}px) saturate(${config.glassSaturation}%) !important;
        border-color: ${borderRgba} !important;
        box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, ${config.specularOpacity}) !important;
      }

      [data-theme='${config.id}'] .liquid-glass-card,
      [data-theme='${config.id}'] .lg-card {
        background: linear-gradient(135deg, rgba(255, 255, 255, ${config.glassOpacity * 0.85}) 0%, rgba(255, 255, 255, ${Math.max(0.005, config.glassOpacity * 0.18)}) 100%) !important;
        backdrop-filter: blur(${config.glassBlur}px) saturate(${config.glassSaturation}%) !important;
        -webkit-backdrop-filter: blur(${config.glassBlur}px) saturate(${config.glassSaturation}%) !important;
        border-color: ${borderRgba} !important;
        box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, ${config.specularOpacity * 0.85}) !important;
      }

      [data-theme='${config.id}'] .lg-sheet {
        background: linear-gradient(145deg, rgba(20, 20, 24, ${Math.min(0.98, config.cardOpacity + 0.1)}) 0%, rgba(10, 10, 12, 0.98) 100%) !important;
        backdrop-filter: blur(${config.glassBlur * 1.2}px) saturate(${config.glassSaturation}%) !important;
        -webkit-backdrop-filter: blur(${config.glassBlur * 1.2}px) saturate(${config.glassSaturation}%) !important;
        border-color: ${borderRgba} !important;
        box-shadow: 0 30px 80px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, ${config.specularOpacity}) !important;
      }
    `;
  }

  removeCustomThemeFromDOM(): void {
    const styleTag = document.getElementById('nexus-custom-theme-vars');
    if (styleTag) {
      styleTag.remove();
    }
  }
}

export const customThemeService = new CustomThemeService();
