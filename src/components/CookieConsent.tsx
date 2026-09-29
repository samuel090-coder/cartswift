import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

// Parse user agent for device info
const parseUserAgent = (ua: string) => {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  
  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';
  
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('iPhone')) os = 'iOS';
  else if (ua.includes('iPad')) os = 'iPadOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';
  
  return {
    device: isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop',
    browser,
    os
  };
};

const getOrCreateVisitorId = (): string => {
  const cookieName = 'cartswift_visitor_id';
  const existing = document.cookie
    .split('; ')
    .find(row => row.startsWith(cookieName + '='));
  
  if (existing) {
    return existing.split('=')[1];
  }
  
  const newId = crypto.randomUUID();
  // Set cookie for 1 year
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${cookieName}=${newId}; expires=${expires}; path=/; SameSite=Lax`;
  return newId;
};

const hasConsentCookie = (): boolean => {
  return document.cookie.includes('cartswift_cookie_consent=accepted');
};

const setConsentCookie = () => {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `cartswift_cookie_consent=accepted; expires=${expires}; path=/; SameSite=Lax`;
};

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only show banner if consent hasn't been given
    if (!hasConsentCookie()) {
      setShowBanner(true);
    } else {
      // If consent was already given, track the visit
      trackVisitor();
    }
  }, []);

  const trackVisitor = async () => {
    try {
      const visitorId = getOrCreateVisitorId();
      const ua = navigator.userAgent;
      const parsed = parseUserAgent(ua);
      
      // Check if visitor exists
      const { data: existing } = await supabase
        .from('site_visitors')
        .select('id, visit_count')
        .eq('visitor_id', visitorId)
        .single();

      if (existing) {
        // Update existing visitor
        await supabase
          .from('site_visitors')
          .update({
            last_visit: new Date().toISOString(),
            visit_count: existing.visit_count + 1,
            user_agent: ua,
          })
          .eq('visitor_id', visitorId);
      } else {
        // Insert new visitor
        await supabase
          .from('site_visitors')
          .insert({
            visitor_id: visitorId,
            device_type: parsed.device,
            browser: parsed.browser,
            operating_system: parsed.os,
            user_agent: ua,
            language: navigator.language,
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            referrer: document.referrer || null,
            cookie_consent_given: true,
            consent_given_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error tracking visitor:', error);
    }
  };

  const handleAccept = async () => {
    setConsentCookie();
    setShowBanner(false);
    window.dispatchEvent(new Event('cookie-consent-closed'));
    await trackVisitor();
  };

  const handleDecline = () => {
    setShowBanner(false);
    window.dispatchEvent(new Event('cookie-consent-closed'));
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 48, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5"
        >
          <Card className="mx-auto max-w-[420px] overflow-hidden rounded-2xl border-border/80 bg-card/95 shadow-2xl backdrop-blur-2xl">
            <div className="h-1 bg-gradient-to-r from-primary via-neon-violet to-neon-cyan" />
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase text-primary">Privacy controls</p>
                  <h3 className="mt-0.5 text-lg font-semibold text-foreground">Your privacy, protected</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"
                  onClick={handleDecline}
                  aria-label="Close privacy notice"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                We use cookies to improve shopping, understand traffic, and personalize your experience.
              </p>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-neon-emerald" />
                Your choices remain in your control.
              </div>

              <div className="mt-4 grid grid-cols-[1fr_1.6fr] gap-2.5">
                <Button variant="outline" onClick={handleDecline} className="h-11 rounded-xl">
                  Decline
                </Button>
                <Button onClick={handleAccept} className="h-11 rounded-xl font-semibold shadow-lg shadow-primary/15">
                  Accept all
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};