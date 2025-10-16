import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';

const WelcomeVoice = () => {
  const [showPlayButton, setShowPlayButton] = useState(false);

  const { data: welcomeVoiceUrl } = useQuery({
    queryKey: ['welcome-voice'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_files')
        .select('file_url')
        .eq('file_purpose', 'welcome_voice')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) return '/welcome-message.mp3'; // Fallback to default
      return data.file_url;
    },
  });

  useEffect(() => {
    const hasHeardWelcome = localStorage.getItem('cartswift-welcome-voice-played');
    
    if (!hasHeardWelcome && welcomeVoiceUrl) {
      playWelcomeVoice();
    }
  }, [welcomeVoiceUrl]);

  const playWelcomeVoice = () => {
    if (!welcomeVoiceUrl) return;
    
    try {
      const audio = new Audio(welcomeVoiceUrl);

      audio.play().catch(() => {
        // If autoplay fails, show button
        setShowPlayButton(true);
      });

      audio.onended = () => {
        localStorage.setItem('cartswift-welcome-voice-played', 'true');
        setShowPlayButton(false);
      };

    } catch (error) {
      console.error('Error playing welcome voice:', error);
      setShowPlayButton(false);
    }
  };

  if (!showPlayButton) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => {
          playWelcomeVoice();
          setShowPlayButton(false);
        }}
        className="shadow-lg"
        size="lg"
      >
        <Volume2 className="mr-2 h-5 w-5" />
        Play Welcome Message
      </Button>
    </div>
  );
};

export default WelcomeVoice;
