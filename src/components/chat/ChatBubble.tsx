import { useState, useRef } from 'react';
import { Play, Pause, Download, FileText, ShoppingBag, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ChatBubbleProps {
  content: string;
  messageType: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  voiceDuration?: number | null;
  taggedProduct?: { id: string; title: string; image?: string; price?: number; currency?: string } | null;
  isMine: boolean;
  isAutoReply: boolean;
  timestamp: string;
}

const ChatBubble = ({
  content, messageType, fileUrl, fileName, fileSize, mimeType,
  voiceDuration, taggedProduct, isMine, isAutoReply, timestamp,
}: ChatBubbleProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMedia, setViewMedia] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const formatSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)}MB` : `${(b / 1024).toFixed(0)}KB`;

  const toggleAudio = () => {
    if (!fileUrl) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(fileUrl);
      audioRef.current = audio;
      audio.play();
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
    }
  };

  const bubbleClass = isMine
    ? 'bg-primary text-primary-foreground rounded-br-sm'
    : 'bg-secondary text-foreground rounded-bl-sm';

  const timeClass = isMine ? 'text-primary-foreground/60' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] rounded-2xl overflow-hidden ${bubbleClass}`}>
        {/* Tagged Product Card */}
        {taggedProduct && (
          <div className={`flex items-center gap-2 p-2 border-b ${isMine ? 'border-primary-foreground/20' : 'border-border'}`}>
            {taggedProduct.image && (
              <img src={taggedProduct.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{taggedProduct.title}</p>
              {taggedProduct.price && (
                <p className="text-[10px] opacity-80">
                  {taggedProduct.currency || '$'}{taggedProduct.price.toFixed(2)}
                </p>
              )}
            </div>
            <ShoppingBag className="h-3.5 w-3.5 opacity-60 shrink-0" />
          </div>
        )}

        {/* Voice Note */}
        {messageType === 'voice' && fileUrl && (
          <div className="flex items-center gap-2 px-3 py-2">
            <button onClick={toggleAudio} className="shrink-0">
              {isPlaying
                ? <Pause className="h-5 w-5" />
                : <Play className="h-5 w-5" />
              }
            </button>
            <div className="flex-1 flex items-center gap-[2px] h-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full ${isMine ? 'bg-primary-foreground/40' : 'bg-foreground/30'}`}
                  style={{ height: Math.random() * 14 + 4 }}
                />
              ))}
            </div>
            <span className="text-[10px] opacity-60 font-mono">
              {voiceDuration ? formatTime(Math.round(voiceDuration)) : '0:00'}
            </span>
          </div>
        )}

        {/* Image */}
        {messageType === 'image' && fileUrl && (
          <>
            <button onClick={() => setViewMedia(true)} className="block w-full">
              <img src={fileUrl} alt={fileName || 'Image'} className="w-full max-h-64 object-cover" />
            </button>
            <Dialog open={viewMedia} onOpenChange={setViewMedia}>
              <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/90 border-none">
                <img src={fileUrl} alt="" className="w-full h-full object-contain" />
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Video */}
        {messageType === 'video' && fileUrl && (
          <>
            <button onClick={() => setViewMedia(true)} className="block w-full relative">
              <video src={fileUrl} className="w-full max-h-64 object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-10 w-10 text-white" />
              </div>
            </button>
            <Dialog open={viewMedia} onOpenChange={setViewMedia}>
              <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-black/90 border-none">
                <video src={fileUrl} controls autoPlay className="w-full h-full" />
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* File attachment */}
        {messageType === 'file' && fileUrl && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2">
            <FileText className="h-8 w-8 opacity-60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{fileName || 'File'}</p>
              {fileSize && <p className="text-[10px] opacity-60">{formatSize(fileSize)}</p>}
            </div>
            <Download className="h-4 w-4 opacity-60" />
          </a>
        )}

        {/* Text content */}
        {content && (
          <div className="px-3 py-2">
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className={`flex items-center gap-1 px-3 pb-1.5 ${isMine ? 'justify-end' : ''}`}>
          {isAutoReply && <span className="text-[9px] opacity-60">🤖 Auto</span>}
          <span className={`text-[10px] ${timeClass}`}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
