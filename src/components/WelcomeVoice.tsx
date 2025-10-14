import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
import { toast } from 'sonner';

const WelcomeVoice = () => {
  const [showPlayButton, setShowPlayButton] = useState(false);

  useEffect(() => {
    const hasHeardWelcome = localStorage.getItem('cartswift-welcome-voice-played');
    
    if (!hasHeardWelcome) {
      playWelcomeVoice();
    }
  }, []);

  const playWelcomeVoice = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-welcome-voice');
      
      if (error) throw error;
      if (!data?.audioContent) throw new Error('No audio content received');

      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.play().catch(() => {
        // If autoplay fails, show button
        setShowPlayButton(true);
      });

      audio.onended = () => {
        localStorage.setItem('cartswift-welcome-voice-played', 'true');
        URL.revokeObjectURL(audioUrl);
        setShowPlayButton(false);
      };

    } catch (error) {
      console.error('Error playing welcome voice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to play welcome message';
      toast.error(errorMessage, { duration: 6000 });
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
