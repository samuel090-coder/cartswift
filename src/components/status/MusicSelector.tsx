import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Music, Search, Play, Pause, X, TrendingUp, Headphones, Upload, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MusicUploadModal from './MusicUploadModal';

interface MusicSelectorProps {
  onSelect: (music: { url: string; title: string; artist: string }) => void;
  onClose: () => void;
  selectedMusic?: { url: string; title: string; artist: string } | null;
}

const MusicSelector = ({ onSelect, onClose, selectedMusic }: MusicSelectorProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch music library
  const { data: musicList = [] } = useQuery({
    queryKey: ['music-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_music_library')
        .select('*')
        .order('is_trending', { ascending: false })
        .order('play_count', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredMusic = musicList.filter((music: any) =>
    music.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (music.artist && music.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const togglePlay = (music: any) => {
    if (playingId === music.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(music.audio_url);
      audioRef.current.play();
      setPlayingId(music.id);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  const handleSelect = (music: any) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onSelect({
      url: music.audio_url,
      title: music.title,
      artist: music.artist || 'Unknown Artist'
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <h2 className="text-white font-semibold">Add Music</h2>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Button
                size="sm"
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-primary to-pink-vibrant hover:opacity-90"
              >
                <Upload className="w-4 h-4 mr-1" />
                <span className="text-white">Upload</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search music..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
        </div>

        {/* Upload CTA Banner */}
        {user && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-gradient-to-r from-primary/30 to-pink-vibrant/30 border border-primary/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Share Your Music</p>
                  <p className="text-white/60 text-xs">Upload tracks for everyone to use</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setShowUploadModal(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <span className="text-white">Upload</span>
              </Button>
            </div>
          </div>
        )}

        {/* Selected Music */}
        {selectedMusic && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-primary/20 border border-primary/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/30 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{selectedMusic.title}</p>
                  <p className="text-white/60 text-xs">{selectedMusic.artist}</p>
                </div>
              </div>
              <Badge className="bg-primary text-white">Selected</Badge>
            </div>
          </div>
        )}

        {/* Music List */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {filteredMusic.map((music: any) => (
              <motion.div
                key={music.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-3 rounded-xl bg-white/5 border ${
                  selectedMusic?.url === music.audio_url 
                    ? 'border-primary' 
                    : 'border-white/10'
                } hover:bg-white/10 transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => togglePlay(music)}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center flex-shrink-0"
                  >
                    {playingId === music.id ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm truncate">{music.title}</p>
                      {music.is_trending && (
                        <Badge variant="secondary" className="text-[10px] bg-orange-500/20 text-orange-400 flex-shrink-0">
                          <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                          Trending
                        </Badge>
                      )}
                    </div>
                    <p className="text-white/60 text-xs truncate">{music.artist || 'Unknown Artist'}</p>
                    <p className="text-white/40 text-[10px]">{music.genre}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSelect(music)}
                    className="bg-primary/20 hover:bg-primary/40 text-primary flex-shrink-0"
                  >
                    <span className="text-white">Use</span>
                  </Button>
                </div>
              </motion.div>
            ))}
            
            {filteredMusic.length === 0 && (
              <div className="text-center py-8">
                <Music className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60 text-sm">No music found</p>
                {user && (
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    className="mt-4 bg-primary hover:bg-primary/90"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="text-white">Be the first to upload!</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <MusicUploadModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['music-library'] });
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default MusicSelector;
