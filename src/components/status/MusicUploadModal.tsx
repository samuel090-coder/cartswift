import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X, Upload, Music, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface MusicUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const MusicUploadModal = ({ onClose, onSuccess }: MusicUploadModalProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('Audio file is too large. Max size is 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to upload music');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a song title');
      return;
    }

    if (!file) {
      toast.error('Please select an audio file');
      return;
    }

    setIsUploading(true);

    try {
      // Upload audio file
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/music/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('status-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload audio file');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('status-media')
        .getPublicUrl(fileName);

      // Create music record
      const { error: dbError } = await supabase
        .from('status_music_library')
        .insert({
          title: title.trim(),
          artist: artist.trim() || user.email?.split('@')[0] || 'Unknown Artist',
          genre: genre.trim() || 'General',
          audio_url: publicUrl,
          uploaded_by: user.id,
          is_public: true,
          is_approved: true,
          duration_seconds: null
        });

      if (dbError) throw dbError;

      toast.success('Music uploaded successfully! 🎵');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error uploading music:', error);
      toast.error(error.message || 'Failed to upload music');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-background rounded-2xl overflow-hidden border border-primary/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-primary/20 to-pink-vibrant/20">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <h2 className="text-foreground font-semibold">Upload Music</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Share your music with the community! Upload a track that others can use in their statuses.
          </p>

          <div className="space-y-2">
            <Label htmlFor="title">Song Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter song title..."
              className="bg-muted/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist">Artist Name</Label>
            <Input
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Your name or artist name..."
              className="bg-muted/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Input
              id="genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g. Pop, Hip-Hop, R&B..."
              className="bg-muted/50"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Audio File *</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-20 border-dashed border-2 hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload audio (max 10MB)</span>
                </div>
              )}
            </Button>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !title.trim() || !file}
            className="w-full bg-gradient-to-r from-primary to-pink-vibrant hover:opacity-90"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Music
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MusicUploadModal;
