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
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="fixed inset-x-3 bottom-40 z-50 mx-auto max-w-sm md:bottom-6 md:left-auto md:right-6 md:mx-0"
        role="dialog"
        aria-label="Install CartSwift"
      >
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl">
          <div className="h-0.5 w-full bg-gradient-to-r from-primary via-pink-vibrant to-primary" />
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="absolute right-2.5 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-4">
            <div className="flex items-center gap-3 pr-7">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-pink-vibrant shadow-lg shadow-primary/25">
                <Smartphone className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Free app</p>
                <h3 className="truncate text-base font-semibold leading-tight text-foreground">Get the CartSwift app</h3>
                <p className="truncate text-xs text-muted-foreground">Shop faster, right from your home screen</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {[
                { icon: Zap, label: 'Faster' },
                { icon: Bell, label: 'Deal alerts' },
                { icon: Sparkles, label: 'One tap' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2 py-1.5">
                  <Icon className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <span className="truncate text-[11px] font-medium text-foreground/80">{label}</span>
                </div>
              ))}
            </div>

            {isIOS ? (
              <div className="mt-3 rounded-xl border border-border/50 bg-muted/40 p-3 text-xs text-muted-foreground">
                Tap <span className="font-semibold text-foreground">Share</span>, then{' '}
                <span className="font-semibold text-foreground">Add to Home Screen</span>.
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" onClick={handleDismiss} className="h-10 flex-1 text-sm text-muted-foreground">
                  Not now
                </Button>
                <Button
                  onClick={handleInstall}
                  className="h-10 flex-[1.6] gap-2 bg-gradient-to-r from-primary to-pink-vibrant text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  Install
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
