import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Smile, Crown, Sparkles, ShoppingCart, PartyPopper } from 'lucide-react';
import { motion } from 'framer-motion';

interface StickerSelectorProps {
  onSelect: (sticker: { id: string; emoji: string; name: string }) => void;
  onClose: () => void;
  selectedStickers: Array<{ id: string; emoji: string; name: string; x: number; y: number }>;
}

// Emoji stickers organized by category
const EMOJI_STICKERS = {
  'Shopping': ['🛒', '🛍️', '💰', '💵', '💳', '🏷️', '📦', '🎁', '✨', '🔥', '💯', '⭐', '🌟', '🎯', '📢', '📣'],
  'Reactions': ['❤️', '😍', '🥰', '😂', '🤣', '😮', '😱', '🤯', '👏', '🙌', '💪', '👍', '🎉', '🥳', '🤩', '😎'],
  'Arrows': ['👆', '👇', '👈', '👉', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '🔝', '🆕', '🆓', '📍', '🎯', '💫'],
  'Business': ['💼', '📈', '📊', '💹', '🏆', '🥇', '🎖️', '🏅', '✅', '☑️', '✔️', '💎', '👑', '🎭', '🎬', '📸'],
};

const StickerSelector = ({ onSelect, onClose, selectedStickers }: StickerSelectorProps) => {
  const [activeCategory, setActiveCategory] = useState('Shopping');

  // Fetch custom sticker packs from database
  const { data: stickerPacks = [] } = useQuery({
    queryKey: ['sticker-packs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_sticker_packs')
        .select('*, stickers:status_stickers(*)');
      if (error) throw error;
      return data || [];
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Shopping': return <ShoppingCart className="w-4 h-4" />;
      case 'Reactions': return <Smile className="w-4 h-4" />;
      case 'Arrows': return <Sparkles className="w-4 h-4" />;
      case 'Business': return <Crown className="w-4 h-4" />;
      default: return <PartyPopper className="w-4 h-4" />;
    }
  };

  const handleEmojiSelect = (emoji: string, category: string) => {
    onSelect({
      id: `${emoji}-${Date.now()}`,
      emoji: emoji,
      name: `${category} sticker`
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Smile className="h-5 w-5 text-primary" />
          <h2 className="text-white font-semibold">Add Stickers</h2>
          {selectedStickers.length > 0 && (
            <Badge className="bg-primary text-white text-xs">
              {selectedStickers.length} added
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
        <TabsList className="bg-transparent border-b border-white/10 rounded-none h-auto p-0 flex justify-start gap-0 overflow-x-auto">
          {Object.keys(EMOJI_STICKERS).map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-white/60 data-[state=active]:text-white px-4 py-3 flex items-center gap-2 flex-shrink-0"
            >
              {getCategoryIcon(category)}
              <span className="text-sm">{category}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="flex-1">
          {Object.entries(EMOJI_STICKERS).map(([category, emojis]) => (
            <TabsContent key={category} value={category} className="p-4 mt-0">
              <div className="grid grid-cols-6 gap-3">
                {emojis.map((emoji, idx) => {
                  const isSelected = selectedStickers.some(s => s.emoji === emoji);
                  return (
                    <motion.button
                      key={`${emoji}-${idx}`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEmojiSelect(emoji, category)}
                      className={`aspect-square rounded-xl flex items-center justify-center text-3xl transition-colors ${
                        isSelected 
                          ? 'bg-primary/30 ring-2 ring-primary' 
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </motion.button>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>

      {/* Selected Stickers Preview */}
      {selectedStickers.length > 0 && (
        <div className="px-4 py-3 border-t border-white/10 bg-black/50">
          <p className="text-white/60 text-xs mb-2">Added stickers (tap status to position):</p>
          <div className="flex gap-2 flex-wrap">
            {selectedStickers.map((sticker, idx) => (
              <span key={idx} className="text-2xl bg-white/10 rounded-lg p-2">
                {sticker.emoji}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Done Button */}
      <div className="p-4 border-t border-white/10">
        <Button 
          onClick={onClose}
          className="w-full bg-primary hover:bg-primary/90"
        >
          Done ({selectedStickers.length} stickers)
        </Button>
      </div>
    </motion.div>
  );
};

export default StickerSelector;
