import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, ShoppingBag, User, Sparkles, Crown, 
  Users, Store, Heart, LayoutGrid, Gift, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  gradient?: string;
  requiresAuth?: boolean;
  badge?: string;
}

const BottomNavigation = () => {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const primaryNavItems: NavItem[] = [
    { icon: <Home className="w-5 h-5" />, label: 'Home', path: '/', gradient: 'from-neon-cyan to-neon-blue' },
    { icon: <ShoppingBag className="w-5 h-5" />, label: 'Shop', path: '/?tab=shop', gradient: 'from-neon-violet to-primary' },
    { icon: <Gift className="w-5 h-5" />, label: 'Rewards', path: '/?tab=rewards', gradient: 'from-neon-amber to-coral', badge: 'NEW' },
    { icon: <LayoutGrid className="w-5 h-5" />, label: 'More', path: '#more', gradient: 'from-muted-foreground to-muted-foreground' },
    { icon: <User className="w-5 h-5" />, label: user ? 'Profile' : 'Login', path: user ? '/profile' : '/auth', gradient: 'from-primary to-neon-rose' },
  ];

  const moreItems: NavItem[] = [
    { icon: <Sparkles className="w-5 h-5" />, label: 'Ambassador', path: '/ambassador', gradient: 'from-neon-rose to-primary', requiresAuth: true },
    { icon: <Crown className="w-5 h-5" />, label: 'VIP', path: '/subscriptions', gradient: 'from-neon-amber to-coral', requiresAuth: true, badge: 'PRO' },
    { icon: <Users className="w-5 h-5" />, label: 'Affiliate', path: '/affiliate', gradient: 'from-neon-emerald to-neon-cyan', requiresAuth: true },
    { icon: <Store className="w-5 h-5" />, label: 'Sell', path: profile?.is_seller ? '/seller' : '/profile?tab=seller', gradient: 'from-neon-violet to-neon-blue', requiresAuth: true },
    { icon: <Heart className="w-5 h-5" />, label: 'Wishlist', path: '/profile?tab=wishlist', gradient: 'from-destructive to-neon-rose', requiresAuth: true },
    { icon: <MessageCircle className="w-5 h-5" />, label: 'Messages', path: '/messages', gradient: 'from-neon-cyan to-neon-emerald', requiresAuth: true },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path.startsWith('/?tab=')) {
      const tab = new URLSearchParams(location.search).get('tab');
      return location.pathname === '/' && path.includes(tab || '');
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <>
      {/* More Items Panel */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-20 left-0 right-0 mx-4 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                  <Sparkles className="w-5 h-5 text-primary" />
                  More Features
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {moreItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.requiresAuth && !user ? '/auth' : item.path}
                      onClick={() => setShowMore(false)}
                      className="relative"
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                          "bg-secondary/50 hover:bg-secondary",
                          "border border-border/30 hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          `bg-gradient-to-br ${item.gradient} text-white shadow-lg`
                        )}>
                          {item.icon}
                        </div>
                        <span className="text-xs font-medium text-foreground">{item.label}</span>
                        {item.badge && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom pb-6">
        <div className="flex items-center justify-around py-1.5 px-2 max-w-lg mx-auto">
          {primaryNavItems.map((item) => {
            const active = item.path === '#more' ? showMore : isActive(item.path);
            
            if (item.path === '#more') {
              return (
                <button
                  key={item.path}
                  onClick={() => setShowMore(!showMore)}
                  className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
                >
                  <motion.div
                    animate={{ scale: showMore ? 1.1 : 1, rotate: showMore ? 45 : 0 }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      showMore 
                        ? "bg-primary text-primary-foreground shadow-lg" 
                        : "bg-secondary text-muted-foreground"
                    )}
                    style={showMore ? { boxShadow: 'var(--shadow-glow-primary)' } : undefined}
                  >
                    {item.icon}
                  </motion.div>
                  <span className={cn(
                    "text-[10px] font-medium transition-colors",
                    showMore ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setShowMore(false)}
                className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
              >
                <motion.div
                  animate={{ scale: active ? 1.1 : 1 }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    active 
                      ? `bg-gradient-to-br ${item.gradient} text-white shadow-lg` 
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                  style={active ? { boxShadow: 'var(--shadow-glow-primary)' } : undefined}
                >
                  {item.icon}
                </motion.div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="absolute top-0 right-0 px-1 py-0.5 text-[8px] font-bold bg-primary text-primary-foreground rounded-full">
                    {item.badge}
                  </span>
                )}
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-36" />
    </>
  );
};

export default BottomNavigation;
