import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Zap, Check, Lock, Sparkles, Flame, Palette, Shield, CircleDashed, Layers, Eye, X, Wallet } from 'lucide-react';
import { UserProfile, ShopItem, AppTheme } from '../types';
import { dbService } from '../services/dbService';
import { customThemeService } from '../services/customThemeService';

interface NexusShopProps {
  user: UserProfile;
  onPurchase: (item: ShopItem) => void;
  onViewGallery?: (galleryId: string) => void;
}

const SHOP_ITEMS: ShopItem[] = [
  // Apple Signature Design Themes
  { id: 'theme_apple_monochrome', name: 'Monochrome (Black & White)', description: 'Clean high-contrast theme with pure white on pitch black.', price: 1000, type: 'theme', value: 'apple_monochrome' },
  { id: 'theme_apple_midnight', name: 'Midnight Blue', description: 'Deep dark blue finish inspired by modern laptops.', price: 1000, type: 'theme', value: 'apple_midnight' },
  { id: 'theme_apple_desert_titanium', name: 'Desert Gold', description: 'Warm metallic sand and gold color palette.', price: 1500, type: 'theme', value: 'apple_desert_titanium' },
  { id: 'theme_apple_natural_titanium', name: 'Natural Titanium', description: 'Brushed metallic titanium with soft warm gray tones.', price: 1200, type: 'theme', value: 'apple_natural_titanium' },
  { id: 'theme_apple_deep_purple', name: 'Deep Purple', description: 'Rich dark obsidian with royal purple accents.', price: 1400, type: 'theme', value: 'apple_deep_purple' },
  { id: 'theme_apple_sierra_blue', name: 'Sierra Blue', description: 'Cool sky blue and ice cyan tones.', price: 1200, type: 'theme', value: 'apple_sierra_blue' },
  { id: 'theme_apple_pacific_blue', name: 'Pacific Blue', description: 'Deep ocean sapphire and aqua accents.', price: 1200, type: 'theme', value: 'apple_pacific_blue' },
  { id: 'theme_apple_hermes', name: 'Hermès Orange', description: 'Obsidian black with vibrant heritage orange accents.', price: 2000, type: 'theme', value: 'apple_hermes' },
  { id: 'theme_apple_product_red', name: 'Product (RED)', description: 'Special edition deep crimson and bright red luster.', price: 1300, type: 'theme', value: 'apple_product_red' },
  { id: 'theme_apple_vision_os', name: 'Vision Glass', description: 'Iridescent spatial glass with glowing purple-cyan effects.', price: 2200, type: 'theme', value: 'apple_vision_os' },
  { id: 'theme_apple_ultra_orange', name: 'Action Orange', description: 'Rugged titanium with high-visibility orange highlights.', price: 1600, type: 'theme', value: 'apple_ultra_orange' },
  { id: 'theme_apple_light_sequoia', name: 'Light Mode Frost', description: 'Crisp clean light mode with system blue accents.', price: 1000, type: 'theme', value: 'apple_light_sequoia' },
  { id: 'theme_apple_starlight', name: 'Starlight Champagne', description: 'Warm champagne metallic luster.', price: 1500, type: 'theme', value: 'apple_starlight' },
  { id: 'theme_apple_fitness', name: 'Fitness Rings', description: 'Neon activity rings with green, pink, and cyan tones.', price: 1500, type: 'theme', value: 'apple_fitness' },
  { id: 'theme_apple_music', name: 'Music Magenta', description: 'Vibrant magenta and violet glow.', price: 1500, type: 'theme', value: 'apple_music' },
  { id: 'theme_apple_sonoma_sunset', name: 'Sonoma Sunset', description: 'Warm dusk coral and golden hour amber.', price: 1800, type: 'theme', value: 'apple_sonoma_sunset' },
  { id: 'theme_apple_alpine', name: 'Alpine Pine', description: 'Rugged pine and mint green tones.', price: 1800, type: 'theme', value: 'apple_alpine' },

  // Badges
  { id: 'badge_scholar', name: 'Scholar Badge', description: 'Badge showing verified study dedication on your profile.', price: 500, type: 'badge', value: 'scholar' },
  { id: 'badge_elite', name: 'Elite Focus Badge', description: 'Glowing gold badge for top-tier study champions.', price: 2000, type: 'badge', value: 'elite' },

  // Avatar Borders
  { id: 'border_neon', name: 'Cyan Glow Ring', description: 'A glowing cyan ring around your profile picture.', price: 600, type: 'avatar_border', value: 'neon' },
  { id: 'border_gold', name: 'Gold Ring Frame', description: 'Polished solid gold avatar frame.', price: 2500, type: 'avatar_border', value: 'gold' },

  // Profile Decos
  { id: 'deco_cyberpunk', name: 'Cyber Grid Deco', description: 'Glowing grid pattern for your profile card.', price: 1500, type: 'profile_deco', value: 'cyberpunk' },
  { id: 'deco_ethereal', name: 'Cloud Deco', description: 'Soft glowing atmospheric clouds for your profile.', price: 1500, type: 'profile_deco', value: 'ethereal' },
  { id: 'deco_crimson', name: 'Crimson Smoke Deco', description: 'Dark volumetric smoke and ruby red ember effects.', price: 1500, type: 'profile_deco', value: 'crimson' },

  // Utilities
  { id: 'streak_freeze', name: 'Streak Freeze', description: 'Protects your daily streak if you miss a study day.', price: 1000, type: 'streak_freeze' },
];

export const NexusShop: React.FC<NexusShopProps> = ({ user, onPurchase }) => {
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);

  useEffect(() => {
    if (previewItem && previewItem.type === 'theme') {
      customThemeService.removeCustomThemeFromDOM();
      document.body.setAttribute('data-theme', previewItem.value || 'default');
    } else {
      if (user.theme?.startsWith('custom_')) {
        const custom = customThemeService.getCustomThemeById(user.theme);
        if (custom) customThemeService.applyCustomThemeToDOM(custom);
      } else {
        customThemeService.removeCustomThemeFromDOM();
      }
      document.body.setAttribute('data-theme', user.theme || 'default');
    }
    return () => {
      if (user.theme?.startsWith('custom_')) {
        const custom = customThemeService.getCustomThemeById(user.theme);
        if (custom) customThemeService.applyCustomThemeToDOM(custom);
      } else {
        customThemeService.removeCustomThemeFromDOM();
      }
      document.body.setAttribute('data-theme', user.theme || 'default');
    };
  }, [previewItem, user.theme]);

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'theme', label: 'Themes' },
    { id: 'badge', label: 'Insignias' },
    { id: 'avatar_border', label: 'Avatar Auras' },
    { id: 'profile_deco', label: 'Decorations' },
    { id: 'streak_freeze', label: 'Shields' },
  ];

  const handleBuy = async (item: ShopItem) => {
    setIsPurchasing(item.id);
    try {
      await dbService.purchaseItem(user.uid, item);
      onPurchase(item);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPurchasing(null);
    }
  };

  const filteredItems = SHOP_ITEMS.filter(item => activeFilter === 'all' || item.type === activeFilter);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-7 animate-fade-in pb-20 pr-2">
      {/* Top Credit Balance Banner */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-8 h-8 text-nexus-electric" />
            Rewards Shop
          </h1>
          <p className="text-zinc-400 text-xs font-semibold mt-1">Unlock themes, badges, and streak freezes with your study credits.</p>
        </div>

        {/* Credit Balance Box */}
        <div className="liquid-glass border border-nexus-electric/30 px-6 py-3 rounded-2xl flex items-center gap-3.5 shadow-xl shadow-nexus-electric/10">
          <div className="w-9 h-9 rounded-xl bg-nexus-electric/20 border border-nexus-electric/40 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-nexus-electric" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Your Balance</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white font-mono tracking-tight">{user.credits || 0}</span>
              <span className="text-[10px] font-black text-nexus-electric uppercase tracking-widest">credits</span>
            </div>
          </div>
        </div>
      </header>

      {/* Categories Filter Capsule */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar liquid-glass p-1.5 rounded-2xl border border-white/10 w-fit">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all squish ${
              activeFilter === cat.id
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid of Refractive Glass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const isUnlocked = 
            (item.type === 'theme' && (user.unlockedThemes || []).includes(item.value as AppTheme)) ||
            (item.type === 'badge' && (user.unlockedBadges || []).includes(item.value as string)) ||
            (item.type === 'avatar_border' && (user.unlockedAvatarBorders || []).includes(item.value as string)) ||
            (item.type === 'profile_deco' && (user.unlockedProfileDecos || []).includes(item.value as string));
          const canAfford = (user.credits || 0) >= item.price;

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -3 }}
              className={`p-6 rounded-[2.2rem] liquid-glass-card flex flex-col justify-between relative overflow-hidden group ${
                isUnlocked 
                    ? 'border-emerald-500/30 bg-emerald-500/5' 
                    : ''
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-electric/10 blur-[40px] rounded-full pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 rounded-2xl liquid-glass border border-white/15 flex items-center justify-center shadow-lg">
                    {item.type === 'theme' ? <Palette className="w-5 h-5 text-nexus-violet" /> : 
                     item.type === 'badge' ? <Shield className="w-5 h-5 text-blue-400" /> :
                     item.type === 'avatar_border' ? <CircleDashed className="w-5 h-5 text-cyan-400" /> :
                     item.type === 'profile_deco' ? <Layers className="w-5 h-5 text-purple-400" /> :
                     <Flame className="w-5 h-5 text-orange-500" />}
                  </div>
                  {isUnlocked && (
                    <div className="px-3 py-1 border rounded-full flex items-center gap-1.5 bg-emerald-500/20 border-emerald-500/40 shadow-sm">
                      <Check className="w-3 h-3 text-emerald-400 stroke-[3px]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Unlocked</span>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-black text-white tracking-tight">
                  {item.name}
                </h3>
                <p className="text-xs mt-1.5 leading-relaxed text-zinc-400 font-medium">{item.description}</p>
              </div>

              <div className="mt-7 relative z-10 flex gap-2">
                <button
                  disabled={isUnlocked || (!isUnlocked && !canAfford) || isPurchasing === item.id}
                  onClick={() => handleBuy(item)}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 squish ${
                    isUnlocked ? 'bg-emerald-500/10 text-emerald-400 cursor-default border border-emerald-500/20' : 
                    canAfford ? 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10' : 
                    'liquid-glass text-zinc-500 cursor-not-allowed border-white/5'
                  }`}
                >
                  {isPurchasing === item.id ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : isUnlocked ? (
                    'Claimed'
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      {item.price} Credits
                    </>
                  )}
                </button>
                {['theme', 'avatar_border', 'profile_deco'].includes(item.type) && (
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="px-3.5 py-3 rounded-xl liquid-glass border border-white/10 text-zinc-400 hover:text-white transition-all flex items-center justify-center squish"
                    title="Preview Cosmetic"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Cosmetic Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-sm liquid-glass-card rounded-[2.8rem] p-8 shadow-2xl relative overflow-hidden border border-white/12 flex flex-col items-center text-center">
            <button onClick={() => setPreviewItem(null)} className="absolute top-6 right-6 p-2.5 text-zinc-500 hover:text-white liquid-glass rounded-xl transition-all squish z-10">
              <X className="w-4 h-4" />
            </button>
            
            <div className="mb-6 relative z-10">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-nexus-electric mb-1 block">Live Preview</span>
              <h2 className="text-xl font-black text-white tracking-tight">{previewItem.name}</h2>
              <p className="text-zinc-400 text-xs mt-1.5">{previewItem.description}</p>
            </div>

            <div className="flex flex-col items-center gap-4 mb-8 relative z-10">
              <div className="relative">
                <div className={`w-28 h-28 rounded-[2rem] border p-1 ${
                  previewItem.type === 'avatar_border' && previewItem.value === 'neon' ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] bg-cyan-500/10' :
                  previewItem.type === 'avatar_border' && previewItem.value === 'gold' ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] bg-yellow-500/10' :
                  'border-white/20 bg-gradient-to-br from-white/10 to-transparent'
                }`}>
                   <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-full h-full rounded-[1.75rem] object-cover shadow-2xl" alt="Preview Avatar" />
                </div>
              </div>
              
              <div>
                <h3 className="text-base font-bold text-white">{user.name || 'User'}</h3>
                <p className="text-nexus-electric text-[9px] font-black uppercase tracking-widest mt-1">
                   Level {user.level || 1} • {user.xp || 0} XP
                </p>
              </div>
            </div>

            <button onClick={() => setPreviewItem(null)} className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-white text-black hover:bg-zinc-200 transition-all squish shadow-xl">
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
