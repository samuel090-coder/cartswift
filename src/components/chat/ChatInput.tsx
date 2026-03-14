import { useState, useRef } from 'react';
import { Send, Mic, Paperclip, ShoppingBag, Image, Video, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnimatePresence, motion } from 'framer-motion';
import VoiceRecorder from './VoiceRecorder';
import ProductTagger from './ProductTagger';
import { supabase } from '@/integrations/supabase/client';

interface TaggedProduct {
  id: string;
  title: string;
  image?: string;
  price?: number;
  currency?: string;
  source: 'item' | 'seller_product';
}

interface ChatInputProps {
  onSendText: (text: string, taggedProduct?: TaggedProduct) => void;
  onSendVoice: (blob: Blob, duration: number) => void;
  onSendFile: (file: File) => void;
  disabled?: boolean;
  userId: string;
}

const ChatInput = ({ onSendText, onSendVoice, onSendFile, disabled, userId }: ChatInputProps) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showProductTag, setShowProductTag] = useState(false);
  const [taggedProduct, setTaggedProduct] = useState<TaggedProduct | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim() && !taggedProduct) return;
    onSendText(text, taggedProduct || undefined);
    setText('');
    setTaggedProduct(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendFile(file);
      setShowAttach(false);
    }
    e.target.value = '';
  };

  if (isRecording) {
    return (
      <div className="p-3 border-t border-border">
        <VoiceRecorder
          onSend={(blob, dur) => { onSendVoice(blob, dur); setIsRecording(false); }}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    );
  }

  return (
    <div className="border-t border-border relative">
      {/* Tagged product preview */}
      <AnimatePresence>
        {taggedProduct && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 pt-2">
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-2 py-1.5 flex-1">
                {taggedProduct.image && (
                  <img src={taggedProduct.image} alt="" className="h-7 w-7 rounded object-cover" />
                )}
                <span className="text-xs text-foreground truncate flex-1">{taggedProduct.title}</span>
                <button onClick={() => setTaggedProduct(null)}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment menu */}
      <AnimatePresence>
        {showAttach && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 mb-2 ml-2 bg-card border border-border rounded-xl shadow-lg p-2 flex gap-1 z-50"
          >
            <Button
              size="icon" variant="ghost"
              onClick={() => { imageInputRef.current?.click(); }}
              className="h-10 w-10 rounded-xl flex-col gap-0.5"
            >
              <Image className="h-5 w-5 text-emerald-500" />
            </Button>
            <Button
              size="icon" variant="ghost"
              onClick={() => { videoInputRef.current?.click(); }}
              className="h-10 w-10 rounded-xl flex-col gap-0.5"
            >
              <Video className="h-5 w-5 text-blue-500" />
            </Button>
            <Button
              size="icon" variant="ghost"
              onClick={() => { fileInputRef.current?.click(); }}
              className="h-10 w-10 rounded-xl flex-col gap-0.5"
            >
              <FileText className="h-5 w-5 text-orange-500" />
            </Button>
            <Button
              size="icon" variant="ghost"
              onClick={() => { setShowAttach(false); setShowProductTag(true); }}
              className="h-10 w-10 rounded-xl flex-col gap-0.5"
            >
              <ShoppingBag className="h-5 w-5 text-purple-500" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product tagger */}
      <AnimatePresence>
        {showProductTag && (
          <ProductTagger
            onSelect={(p) => { setTaggedProduct(p); setShowProductTag(false); }}
            onClose={() => setShowProductTag(false)}
          />
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Input bar */}
      <form
        onSubmit={e => { e.preventDefault(); handleSend(); }}
        className="flex items-center gap-1.5 p-2.5"
      >
        <Button
          type="button" size="icon" variant="ghost"
          onClick={() => { setShowAttach(!showAttach); setShowProductTag(false); }}
          className="h-9 w-9 shrink-0"
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>

        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-secondary border-none rounded-full h-9 text-sm"
          disabled={disabled}
        />

        {text.trim() || taggedProduct ? (
          <Button type="submit" size="icon" className="h-9 w-9 rounded-full bg-primary text-primary-foreground shrink-0" disabled={disabled}>
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="icon" variant="ghost" onClick={() => setIsRecording(true)} className="h-9 w-9 shrink-0">
            <Mic className="h-5 w-5 text-primary" />
          </Button>
        )}
      </form>
    </div>
  );
};

export default ChatInput;
