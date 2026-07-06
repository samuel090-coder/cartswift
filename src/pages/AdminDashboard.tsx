import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import ViralFeaturesManagement from '@/components/admin/ViralFeaturesManagement';
import ItemManagement from '@/components/admin/ItemManagement';
import BulkProductPoster from '@/components/admin/BulkProductPoster';
import OrderManagement from '@/components/admin/OrderManagement';
import PaymentProofsManagement from '@/components/admin/PaymentProofsManagement';
import AnalyticsManagement from '@/components/admin/AnalyticsManagement';
import MediaManagement from '@/components/admin/MediaManagement';
import GiftCardPaymentManagement from '@/components/admin/GiftCardPaymentManagement';
import ShareManagement from '@/components/admin/ShareManagement';
import ReviewsManagement from '@/components/admin/ReviewsManagement';
import PaymentSettingsManagement from '@/components/admin/PaymentSettingsManagement';
import SellerManagement from '@/components/admin/SellerManagement';
import ApplicationsManagement from '@/components/admin/ApplicationsManagement';
import BoostRequestsManagement from '@/components/admin/BoostRequestsManagement';
import DepositManagement from '@/components/admin/DepositManagement';
import DepositPaymentMethodsManagement from '@/components/admin/DepositPaymentMethodsManagement';
import PriceFormatSetting from '@/components/admin/PriceFormatSetting';
import { MarketAdvert } from '@/components/admin/MarketAdvert';
import { VisitorAnalytics } from '@/components/admin/VisitorAnalytics';
import {
  LogOut, Package, ShoppingCart, FileText, Share, Zap, BarChart3, Star,
  FolderOpen, Settings, Bell, Mail, Users, Store, ClipboardList, Rocket,
  Wallet, Send, Headphones, Sparkles, ChevronLeft, Search,
} from 'lucide-react';
import { NotificationManagement } from '@/components/admin/NotificationManagement';
import { NotificationProvider } from '@/contexts/NotificationContext';
import NotificationBell from '@/components/admin/NotificationBell';
import EmailTester from '@/components/admin/EmailTester';
import TemuIntegration from '@/components/admin/TemuIntegration';
import SupportChatManagement from '@/components/admin/SupportChatManagement';
import RewardsManagement from '@/components/admin/RewardsManagement';

type SectionId =
  | 'rewards' | 'items' | 'ai-bulk' | 'orders' | 'notifications' | 'reviews'
  | 'shares' | 'viral' | 'gift-cards' | 'payments' | 'analytics' | 'media'
  | 'visitors' | 'market' | 'sellers' | 'applications' | 'boosts'
  | 'deposits' | 'emails' | 'temu' | 'support';

interface SectionMeta {
  id: SectionId;
  title: string;
  subtitle: string;
  icon: any;
  group: 'Featured' | 'Commerce' | 'Growth' | 'Community' | 'System';
}

const SECTIONS: SectionMeta[] = [
  { id: 'rewards',      title: 'Smart Rewards',     subtitle: 'Mystery boxes · claims · payouts',   icon: Sparkles,      group: 'Featured' },
  { id: 'orders',       title: 'Orders',            subtitle: 'Track and manage every order',       icon: ShoppingCart,  group: 'Featured' },
  { id: 'items',        title: 'Products',          subtitle: 'Catalog, stock & pricing',           icon: Package,       group: 'Commerce' },
  { id: 'ai-bulk',      title: 'AI Bulk Poster',    subtitle: 'Post many products at once',         icon: Sparkles,      group: 'Commerce' },
  { id: 'gift-cards',   title: 'Gift Cards',        subtitle: 'Gift card requests & payouts',       icon: FileText,      group: 'Commerce' },
  { id: 'payments',     title: 'Payments',          subtitle: 'Paystack, price format, proofs',     icon: Settings,      group: 'Commerce' },
  { id: 'deposits',     title: 'Wallet Deposits',   subtitle: 'Deposit methods & approvals',        icon: Wallet,        group: 'Commerce' },
  { id: 'shares',       title: 'Share Pages',       subtitle: 'Product share URLs',                 icon: Share,         group: 'Growth' },
  { id: 'viral',        title: 'Viral Features',    subtitle: 'Trending, boosts, engagement',       icon: Zap,           group: 'Growth' },
  { id: 'market',       title: 'Marketing',         subtitle: 'Email blasts & campaigns',           icon: Mail,          group: 'Growth' },
  { id: 'notifications',title: 'Notifications',     subtitle: 'Push & in-app messages',             icon: Bell,          group: 'Growth' },
  { id: 'emails',       title: 'Email Tester',      subtitle: 'Preview transactional emails',       icon: Send,          group: 'Growth' },
  { id: 'sellers',      title: 'Sellers',           subtitle: 'Approved seller directory',          icon: Store,         group: 'Community' },
  { id: 'applications', title: 'Applications',      subtitle: 'Seller & partner requests',          icon: ClipboardList, group: 'Community' },
  { id: 'boosts',       title: 'Boost Requests',    subtitle: 'Product boost approvals',            icon: Rocket,        group: 'Community' },
  { id: 'reviews',      title: 'Reviews',           subtitle: 'Ratings & moderation',               icon: Star,          group: 'Community' },
  { id: 'support',      title: 'Support Chat',      subtitle: 'Live chat with buyers',              icon: Headphones,    group: 'Community' },
  { id: 'analytics',    title: 'Analytics',         subtitle: 'Sales & performance',                icon: BarChart3,     group: 'System' },
  { id: 'visitors',     title: 'Visitors',          subtitle: 'Live traffic analytics',             icon: Users,         group: 'System' },
  { id: 'media',        title: 'Media',             subtitle: 'Uploads & static assets',            icon: FolderOpen,    group: 'System' },
  { id: 'temu',         title: 'Marketplace Sync',  subtitle: 'External catalog import',            icon: Package,       group: 'System' },
];

const renderSection = (id: SectionId) => {
  switch (id) {
    case 'rewards':      return <RewardsManagement />;
    case 'items':        return <ItemManagement />;
    case 'ai-bulk':      return <BulkProductPoster />;
    case 'orders':       return <OrderManagement />;
    case 'notifications':return <NotificationManagement />;
    case 'reviews':      return <ReviewsManagement />;
    case 'shares':       return <ShareManagement />;
    case 'viral':        return <ViralFeaturesManagement />;
    case 'gift-cards':   return <GiftCardPaymentManagement />;
    case 'payments':     return (
      <div className="space-y-6">
        <PriceFormatSetting />
        <PaymentSettingsManagement />
        <PaymentProofsManagement />
      </div>
    );
    case 'analytics':    return <AnalyticsManagement />;
    case 'media':        return <MediaManagement />;
    case 'visitors':     return <VisitorAnalytics />;
    case 'market':       return <MarketAdvert />;
    case 'sellers':      return <SellerManagement />;
    case 'applications': return <ApplicationsManagement />;
    case 'boosts':       return <BoostRequestsManagement />;
    case 'deposits':     return (
      <div className="space-y-6">
        <DepositPaymentMethodsManagement />
        <DepositManagement />
      </div>
    );
    case 'emails':       return <EmailTester />;
    case 'temu':         return <TemuIntegration />;
    case 'support':      return <SupportChatManagement />;
  }
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SectionId | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) { navigate('/admin'); return; }
        const { data: allowedAdmin, error: adminError } = await supabase
          .from('allowed_admins').select('email').eq('email', user.email).single();
        if (adminError || !allowedAdmin) {
          toast({ title: 'Access denied', description: 'Your email is not authorized for admin access.', variant: 'destructive' });
          navigate('/admin'); return;
        }
        setUser(user);
      } catch {
        navigate('/admin');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: 'Logged out', description: 'Successfully logged out of admin panel.' });
    navigate('/admin');
  };

  const handleOrderClick = (orderId: string) => {
    setActive('orders');
    setTimeout(() => {
      const el = document.getElementById(`order-${orderId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        el.classList.add('highlight-order');
        setTimeout(() => el.classList.remove('highlight-order'), 3000);
      }
    }, 250);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.filter(s => s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q));
  }, [query]);

  const grouped = useMemo(() => {
    const g: Record<string, SectionMeta[]> = {};
    filtered.forEach(s => { (g[s.group] = g[s.group] || []).push(s); });
    return g;
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4" />
          <div className="text-pink-300">Verifying admin access…</div>
        </div>
      </div>
    );
  }

  const activeMeta = active ? SECTIONS.find(s => s.id === active) : null;

  return (
    <NotificationProvider adminUserId={user?.id}>
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Mobile-app framed shell */}
        <div className="mx-auto w-full max-w-[420px] min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0f0810] to-[#0a0a0f] relative">

          {/* Header */}
          <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0f]/85 border-b border-pink-500/10">
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
              {active ? (
                <button
                  onClick={() => setActive(null)}
                  className="flex items-center gap-1 text-sm text-pink-300 hover:text-pink-200"
                >
                  <ChevronLeft className="h-5 w-5" /> Dashboard
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center shadow-lg shadow-pink-500/30">
                    <Sparkles className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold leading-none">
                      <span className="text-white">Cart</span><span className="text-pink-500">Swift</span>
                    </div>
                    <div className="text-[10px] text-pink-300/60 mt-0.5">Admin Console</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <NotificationBell onOrderClick={handleOrderClick} />
                <button
                  onClick={handleLogout}
                  className="h-9 w-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-pink-300 hover:bg-pink-500/10"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!active && (
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-300/60" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search sections…"
                    className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 pl-9 pr-4 text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/40 focus:bg-white/[0.07]"
                  />
                </div>
              </div>
            )}
          </header>

          {/* Body */}
          <main className="px-4 pt-4 pb-40">
            {active ? (
              <div>
                <div className="mb-4">
                  <div className="text-[11px] uppercase tracking-widest text-pink-400/70">{activeMeta?.group}</div>
                  <h2 className="text-xl font-bold mt-0.5">{activeMeta?.title}</h2>
                  <p className="text-xs text-white/50 mt-0.5">{activeMeta?.subtitle}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-3 overflow-x-auto">
                  {renderSection(active)}
                </div>
              </div>
            ) : (
              <>
                {/* Hero */}
                <div className="rounded-3xl p-5 mb-5 relative overflow-hidden border border-pink-500/20 bg-gradient-to-br from-pink-600/25 via-fuchsia-700/15 to-rose-900/25">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pink-500/25 blur-3xl" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/90">
                      <Sparkles className="h-3 w-3 text-pink-300" /> LIVE CONTROL CENTER
                    </div>
                    <h1 className="mt-2.5 text-2xl font-extrabold leading-tight">
                      Welcome back<span className="text-pink-400">.</span>
                    </h1>
                    <p className="text-xs text-white/70 mt-1 truncate">{user?.email}</p>
                    <button
                      onClick={() => setActive('rewards')}
                      className="mt-4 w-full rounded-2xl bg-white text-slate-900 font-semibold text-sm py-3 flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 active:scale-[0.98] transition"
                    >
                      <Sparkles className="h-4 w-4 text-pink-500" /> Manage Smart Rewards
                    </button>
                  </div>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { label: 'Orders',   icon: ShoppingCart, id: 'orders' as const },
                    { label: 'Rewards',  icon: Sparkles,     id: 'rewards' as const },
                    { label: 'Sellers',  icon: Store,        id: 'sellers' as const },
                  ].map(q => (
                    <button
                      key={q.id}
                      onClick={() => setActive(q.id)}
                      className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 flex flex-col items-center gap-1.5 hover:border-pink-500/40 hover:bg-pink-500/[0.06] transition"
                    >
                      <q.icon className="h-5 w-5 text-pink-400" />
                      <span className="text-[11px] text-white/80 font-medium">{q.label}</span>
                    </button>
                  ))}
                </div>

                {/* Grouped sections */}
                {Object.entries(grouped).map(([group, list]) => (
                  <section key={group} className="mb-6">
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <h3 className="text-[11px] uppercase tracking-widest text-pink-300/70 font-semibold">{group}</h3>
                      <span className="text-[10px] text-white/30">{list.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {list.map(s => {
                        const Icon = s.icon;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setActive(s.id)}
                            className="group text-left rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 p-3 hover:border-pink-500/40 hover:from-pink-500/[0.08] transition active:scale-[0.98]"
                          >
                            <div className="h-9 w-9 rounded-xl bg-pink-500/15 border border-pink-500/30 grid place-items-center mb-2">
                              <Icon className="h-4 w-4 text-pink-400" />
                            </div>
                            <div className="text-sm font-semibold text-white truncate">{s.title}</div>
                            <div className="text-[10px] text-white/50 line-clamp-2 mt-0.5">{s.subtitle}</div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}

                {filtered.length === 0 && (
                  <div className="text-center text-white/40 text-sm py-16">No sections match "{query}"</div>
                )}
              </>
            )}
          </main>

          {/* Bottom quick-nav */}
          <nav className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
            <div className="mx-auto max-w-[420px] px-3 pb-4">
              <div className="pointer-events-auto rounded-2xl bg-[#0a0a0f]/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-pink-500/10 px-2 py-1.5 flex items-center justify-around">
                {[
                  { id: null,          label: 'Home',    icon: BarChart3 },
                  { id: 'orders' as const,   label: 'Orders',  icon: ShoppingCart },
                  { id: 'rewards' as const,  label: 'Rewards', icon: Sparkles, primary: true },
                  { id: 'items' as const,    label: 'Items',   icon: Package },
                  { id: 'support' as const,  label: 'Support', icon: Headphones },
                ].map((it: any, i) => {
                  const Icon = it.icon;
                  const isActive = active === it.id || (it.id === null && !active);
                  if (it.primary) {
                    return (
                      <button
                        key={i}
                        onClick={() => setActive(it.id)}
                        className="-mt-6 h-14 w-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center shadow-xl shadow-pink-500/50 border-4 border-[#0a0a0f]"
                        aria-label={it.label}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </button>
                    );
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setActive(it.id)}
                      className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition ${
                        isActive ? 'text-pink-400' : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      <span className="text-[9px] font-medium">{it.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </NotificationProvider>
  );
};

export default AdminDashboard;
