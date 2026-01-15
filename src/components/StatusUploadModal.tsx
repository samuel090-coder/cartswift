import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Camera, Image, Video, Mic, Type, X, Check, 
  Sparkles, Palette, Send, ChevronLeft, Music, ShoppingBag, Smile
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import MusicSelector from './status/MusicSelector';
import ProductLinker from './status/ProductLinker';
import StickerSelector from './status/StickerSelector';

interface StatusUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BACKGROUND_COLORS = [
  '#FF69B4', '#FF1493', '#DB7093', '#C71585',
  '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6',
  '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF',
  '#06B6D4', '#0891B2', '#0E7490', '#155E75',
  '#10B981', '#059669', '#047857', '#065F46',
  '#F59E0B', '#D97706', '#B45309', '#92400E',
  '#EF4444', '#DC2626', '#B91C1C', '#991B1B',
  '#EC4899', '#DB2777', '#BE185D', '#9D174D',
  '#1F2937', '#111827', '#374151', '#4B5563',
  'linear-gradient(135deg, #FF69B4, #8B5CF6)',
  'linear-gradient(135deg, #3B82F6, #06B6D4)',
  'linear-gradient(135deg, #10B981, #3B82F6)',
  'linear-gradient(135deg, #F59E0B, #EF4444)',
];

const StatusUploadModal = ({ onClose, onSuccess }: StatusUploadModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'type' | 'content' | 'preview'>('type');
  const [contentType, setContentType] = useState<'text' | 'image' | 'video' | 'voice'>('text');
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#FF69B4');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // New marketplace features
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showProductLinker, setShowProductLinker] = useState(false);
  const [showStickerSelector, setShowStickerSelector] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{ url: string; title: string; artist: string } | null>(null);
  const [linkedProduct, setLinkedProduct] = useState<any>(null);
  const [stickers, setStickers] = useState<Array<{ id: string; emoji: string; name: string; x: number; y: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File is too large. Max size is 50MB');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
        setStep('preview');
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const selectType = (type: 'text' | 'image' | 'video' | 'voice') => {
    setContentType(type);
    if (type === 'text') {
      setStep('content');
    } else {
      // Trigger file input
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to post a status');
      return;
    }

    if (contentType === 'text' && !textContent.trim()) {
      toast.error('Please enter some text');
      return;
    }

    if (['image', 'video', 'voice'].includes(contentType) && !file) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);

    try {
      let contentUrl = null;

      // Upload file if needed
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('status-media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload file. Please try again.');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('status-media')
          .getPublicUrl(fileName);

        contentUrl = publicUrl;
      }

      // Create status with marketplace features
      const { error: statusError } = await supabase
        .from('user_statuses')
        .insert({
          user_id: user.id,
          content_type: contentType,
          content_url: contentUrl,
          text_content: contentType === 'text' ? textContent : null,
          background_color: contentType === 'text' ? backgroundColor : null,
          caption: caption || null,
          visibility: 'all',
          music_url: selectedMusic?.url || null,
          music_title: selectedMusic?.title || null,
          music_artist: selectedMusic?.artist || null,
          linked_product_id: linkedProduct?.type === 'seller_product' ? linkedProduct.id : null,
          linked_item_id: linkedProduct?.type === 'item' ? linkedProduct.id : null,
          stickers: stickers.length > 0 ? stickers : null,
          call_to_action: linkedProduct ? 'Buy Now' : null
        });

      if (statusError) throw statusError;

      toast.success('Status posted! ✨ Only your followers can see it.');
      onSuccess();
    } catch (error: any) {
      console.error('Error posting status:', error);
      toast.error(error.message || 'Failed to post status');
    } finally {
      setIsUploading(false);
    }
  };

  const getAcceptType = () => {
    switch (contentType) {
      case 'image': return 'image/*';
      case 'video': return 'video/*';
      case 'voice': return 'audio/*';
      default: return '*/*';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptType()}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === 'type') onClose();
            else if (step === 'content') setStep('type');
            else setStep('content');
          }}
          className="text-white hover:bg-white/10"
        >
          {step === 'type' ? <X className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
        </Button>
        <h2 className="text-white font-semibold text-lg">
          {step === 'type' && 'Create Status'}
          {step === 'content' && 'Text Status'}
          {step === 'preview' && 'Preview'}
        </h2>
        {(step === 'content' || step === 'preview') && (
          <Button
            onClick={handleSubmit}
            disabled={isUploading}
            className="bg-primary hover:bg-primary/90 text-white rounded-full px-6"
          >
            {isUploading ? (
              <span className="animate-pulse">Posting...</span>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Post
              </>
            )}
          </Button>
        )}
        {step === 'type' && <div className="w-10" />}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Select Type */}
        {step === 'type' && (
          <motion.div
            key="type"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col items-center justify-center gap-6 p-6"
          >
            <div className="text-center mb-8">
              <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">What would you like to share?</h3>
              <p className="text-white/60">Your status will be visible for 24 hours</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => selectType('text')}
                className="aspect-square rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex flex-col items-center justify-center gap-3 p-4"
              >
                <Type className="h-12 w-12 text-white" />
                <span className="text-white font-semibold">Text</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => selectType('image')}
                className="aspect-square rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex flex-col items-center justify-center gap-3 p-4"
              >
                <Image className="h-12 w-12 text-white" />
                <span className="text-white font-semibold">Photo</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => selectType('video')}
                className="aspect-square rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex flex-col items-center justify-center gap-3 p-4"
              >
                <Video className="h-12 w-12 text-white" />
                <span className="text-white font-semibold">Video</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => selectType('voice')}
                className="aspect-square rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex flex-col items-center justify-center gap-3 p-4"
              >
                <Mic className="h-12 w-12 text-white" />
                <span className="text-white font-semibold">Voice</span>
              </motion.button>
            </div>

            <p className="text-white/40 text-sm text-center mt-4">
              Only your followers can view your status
            </p>
          </motion.div>
        )}

        {/* Step 2: Text Content */}
        {step === 'content' && contentType === 'text' && (
          <motion.div
            key="content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            {/* Preview */}
            <div 
              className="flex-1 flex items-center justify-center p-6 min-h-[50vh]"
              style={{ 
                background: backgroundColor.startsWith('linear') ? backgroundColor : undefined,
                backgroundColor: !backgroundColor.startsWith('linear') ? backgroundColor : undefined
              }}
            >
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your status..."
                className="bg-transparent border-none text-white text-2xl font-bold text-center resize-none placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ minHeight: '200px' }}
                maxLength={500}
              />
            </div>

            {/* Color Picker */}
            <div className="p-4 bg-black">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-5 w-5 text-white/60" />
                <span className="text-white/60 text-sm">Background</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {BACKGROUND_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    className={`w-10 h-10 rounded-full flex-shrink-0 transition-transform ${
                      backgroundColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : ''
                    }`}
                    style={{ 
                      background: color.startsWith('linear') ? color : undefined,
                      backgroundColor: !color.startsWith('linear') ? color : undefined
                    }}
                    onClick={() => setBackgroundColor(color)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Media Preview */}
        {step === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col bg-black"
          >
            {/* Media Preview */}
            <div className="flex-1 flex items-center justify-center p-4">
              {contentType === 'image' && filePreview && (
                <img 
                  src={filePreview} 
                  alt="Preview" 
                  className="max-h-[60vh] max-w-full object-contain rounded-2xl"
                />
              )}
              {contentType === 'video' && filePreview && (
                <video 
                  src={filePreview} 
                  controls 
                  className="max-h-[60vh] max-w-full rounded-2xl"
                />
              )}
              {contentType === 'voice' && filePreview && (
                <div className="w-full max-w-sm p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-white/10">
                  <Mic className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <audio src={filePreview} controls className="w-full" />
                </div>
              )}
            </div>

            {/* Caption Input */}
            <div className="p-4 bg-black border-t border-white/10 space-y-3">
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              
              {/* Marketplace Enhancement Buttons */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMusicSelector(true)}
                  className={`flex-shrink-0 ${selectedMusic ? 'border-primary text-primary' : 'border-white/20 text-white'}`}
                >
                  <Music className="w-4 h-4 mr-1" />
                  {selectedMusic ? selectedMusic.title.slice(0, 10) + '...' : 'Music'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowProductLinker(true)}
                  className={`flex-shrink-0 ${linkedProduct ? 'border-green-500 text-green-400' : 'border-white/20 text-white'}`}
                >
                  <ShoppingBag className="w-4 h-4 mr-1" />
                  {linkedProduct ? 'Linked!' : 'Link Product'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowStickerSelector(true)}
                  className={`flex-shrink-0 ${stickers.length > 0 ? 'border-yellow-500 text-yellow-400' : 'border-white/20 text-white'}`}
                >
                  <Smile className="w-4 h-4 mr-1" />
                  Stickers {stickers.length > 0 && `(${stickers.length})`}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Music Selector Modal */}
      {showMusicSelector && (
        <MusicSelector
          onSelect={(music) => {
            setSelectedMusic(music);
            setShowMusicSelector(false);
          }}
          onClose={() => setShowMusicSelector(false)}
          selectedMusic={selectedMusic}
        />
      )}
      
      {/* Product Linker Modal */}
      {showProductLinker && (
        <ProductLinker
          onSelect={(product) => {
            setLinkedProduct(product);
            setShowProductLinker(false);
          }}
          onClose={() => setShowProductLinker(false)}
          selectedProduct={linkedProduct}
        />
      )}
      
      {/* Sticker Selector Modal */}
      {showStickerSelector && (
        <StickerSelector
          onSelect={(sticker) => {
            setStickers(prev => [...prev, { ...sticker, x: 50, y: 50 }]);
          }}
          onClose={() => setShowStickerSelector(false)}
          selectedStickers={stickers}
        />
      )}
    </motion.div>
  );
};

export default StatusUploadModal;