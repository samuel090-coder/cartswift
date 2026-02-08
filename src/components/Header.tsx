import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Store, Crown, Users, Sparkles, Search, X, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import LanguageCurrencySelector from '@/components/LanguageCurrencySelector';
import NotificationCenter from '@/components/NotificationCenter';
import MiniCart from '@/components/MiniCart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const Header = ({ onSearch }: HeaderProps) => {
  const { user, profile, signOut, loading } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${
      isScrolled 
        ? 'bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-lg' 
        : 'bg-background/60 backdrop-blur-md border-b border-border/30'
    }`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-xl font-black tracking-tight text-gradient">
              CARTSWIFT
            </h1>
          </Link>

          {/* Collapsible Search Bar */}
          <AnimatePresence>
            {searchOpen && (
              <motion.form
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSearchSubmit}
                className="flex-1 max-w-md"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      onSearch?.(e.target.value);
                    }}
                    placeholder="Search products..."
                    className="pl-9 pr-9 bg-secondary border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      onSearch?.('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
          
          {/* Right Actions */}
          <div className="flex items-center gap-1.5">
            {!searchOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            <LanguageCurrencySelector />
            <NotificationCenter />

            <MiniCart />

            {!loading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                        <Avatar className="h-9 w-9 border-2 border-primary/30">
                          <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                            {getInitials(profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-popover border-border" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium text-foreground">{profile?.full_name || 'User'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="cursor-pointer"><User className="mr-2 h-4 w-4" />Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/orders" className="cursor-pointer"><ShoppingBag className="mr-2 h-4 w-4" />My Orders</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/subscriptions" className="cursor-pointer"><Crown className="mr-2 h-4 w-4" />VIP Membership</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/affiliate" className="cursor-pointer"><Users className="mr-2 h-4 w-4" />Affiliate Program</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/ambassador" className="cursor-pointer"><Sparkles className="mr-2 h-4 w-4" />Ambassador</Link>
                      </DropdownMenuItem>
                      {profile?.is_seller && (
                        <DropdownMenuItem asChild>
                          <Link to="/seller" className="cursor-pointer"><Store className="mr-2 h-4 w-4" />Seller Dashboard</Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/auth">
                    <Button size="sm" className="btn-premium text-xs px-3">
                      <User className="h-3.5 w-3.5 mr-1.5" />Sign In
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
