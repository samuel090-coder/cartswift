import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Cookie, X } from 'lucide-react';
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
    await trackVisitor();
  };

  const handleDecline = () => {
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <Card className="max-w-2xl mx-auto bg-background/95 backdrop-blur-lg border-primary/20 shadow-2xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-full shrink-0">
                  <Cookie className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="font-semibold text-lg">We Value Your Privacy 🍪</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to enhance your shopping experience, analyze site traffic, 
                    and personalize content. By clicking "Accept", you consent to our use of cookies.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleAccept} className="gap-2">
                      Accept All Cookies
                    </Button>
                    <Button variant="outline" onClick={handleDecline}>
                      Decline
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={handleDecline}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};