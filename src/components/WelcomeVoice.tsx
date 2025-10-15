import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';

const WelcomeVoice = () => {
  const [showPlayButton, setShowPlayButton] = useState(false);

  useEffect(() => {
    const hasHeardWelcome = localStorage.getItem('cartswift-welcome-voice-played');
    
    if (!hasHeardWelcome) {
      playWelcomeVoice();
    }
  }, []);

  const playWelcomeVoice = () => {
    try {
      const audio = new Audio('/welcome-message.mp3');

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
