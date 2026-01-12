import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone, Zap, Bell, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (within 24 hours)
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt);
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay for better UX
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show prompt for iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !(navigator as any).standalone) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      >
        <Card className="bg-gradient-to-br from-background via-primary/5 to-pink-vibrant/10 border-primary/30 shadow-2xl shadow-primary/20">
          <CardContent className="p-4">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-pink-vibrant flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Install CartSwift App</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Get the best shopping experience with our app!
                </p>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="flex flex-col items-center text-center">
                    <Zap className="w-5 h-5 text-primary mb-1" />
                    <span className="text-[10px] text-muted-foreground">Faster</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <Bell className="w-5 h-5 text-primary mb-1" />
                    <span className="text-[10px] text-muted-foreground">Notifications</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <Sparkles className="w-5 h-5 text-primary mb-1" />
                    <span className="text-[10px] text-muted-foreground">Offline</span>
                  </div>
                </div>

                {isIOS ? (
                  <div className="bg-muted/50 rounded-lg p-3 text-xs">
                    <p className="font-medium mb-1">To install on iOS:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Tap the Share button <span className="inline-block">⬆️</span></li>
                      <li>Scroll and tap "Add to Home Screen"</li>
                      <li>Tap "Add" to confirm</li>
                    </ol>
                  </div>
                ) : (
                  <Button
                    onClick={handleInstall}
                    className="w-full bg-gradient-to-r from-primary to-pink-vibrant hover:opacity-90 gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install Now - It's Free!
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
