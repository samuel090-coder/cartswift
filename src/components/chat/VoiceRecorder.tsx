import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

const VoiceRecorder = ({ onSend, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    startRecording();
    return () => {
      clearInterval(timerRef.current);
      clearInterval(playbackTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      onCancel();
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (isPlaying) {
      audioRef.current?.pause();
      clearInterval(playbackTimerRef.current);
      setIsPlaying(false);
    } else {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setPlaybackTime(0);
      audio.play();
      setIsPlaying(true);
      playbackTimerRef.current = setInterval(() => setPlaybackTime(t => t + 1), 1000);
      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        clearInterval(playbackTimerRef.current);
      };
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSend = () => {
    if (audioBlob) onSend(audioBlob, recordingTime);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 p-3 bg-secondary rounded-2xl"
    >
      {isRecording ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="h-3 w-3 rounded-full bg-destructive"
          />
          <span className="text-sm text-foreground font-mono flex-1">{formatTime(recordingTime)}</span>
          <Button size="icon" variant="ghost" onClick={stopRecording} className="h-8 w-8">
            <Square className="h-4 w-4 text-destructive" />
          </Button>
        </>
      ) : (
        <>
          <Button size="icon" variant="ghost" onClick={togglePlayback} className="h-8 w-8">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          {/* Waveform visualization */}
          <div className="flex-1 flex items-center gap-[2px] h-8">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full bg-primary/60"
                animate={{
                  height: isPlaying
                    ? [4, Math.random() * 20 + 4, 4]
                    : Math.random() * 16 + 4,
                }}
                transition={isPlaying ? { repeat: Infinity, duration: 0.5, delay: i * 0.03 } : {}}
                style={{ height: Math.random() * 16 + 4 }}
              />
            ))}
          </div>

          <span className="text-xs text-muted-foreground font-mono">
            {isPlaying ? formatTime(playbackTime) : formatTime(recordingTime)}
          </span>

          <Button size="icon" variant="ghost" onClick={() => { if (audioUrl) URL.revokeObjectURL(audioUrl); onCancel(); }} className="h-8 w-8 text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={handleSend} className="h-8 w-8 bg-primary text-primary-foreground rounded-full">
            <Send className="h-4 w-4" />
          </Button>
        </>
      )}
    </motion.div>
  );
};

export default VoiceRecorder;
