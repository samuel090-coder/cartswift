import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import ViralFeaturesManagement from '@/components/admin/ViralFeaturesManagement';
import ItemManagement from '@/components/admin/ItemManagement';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Package, ShoppingCart, FileText, Share, Zap, BarChart3, Star, FolderOpen, Settings, Bell, Crown, Mail, Users, Store, ClipboardList, Rocket, Wallet, Send, Headphones } from 'lucide-react';
import { NotificationManagement } from '@/components/admin/NotificationManagement';
import { NotificationProvider } from '@/contexts/NotificationContext';
import NotificationBell from '@/components/admin/NotificationBell';
import EmailTester from '@/components/admin/EmailTester';
import TemuIntegration from '@/components/admin/TemuIntegration';
import SupportChatManagement from '@/components/admin/SupportChatManagement';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('User fetch error:', userError);
          navigate('/admin');
          return;
        }

        if (!user) {
          navigate('/admin');
          return;
        }

        // Check if user email is in allowed_admins table
        const { data: allowedAdmin, error: adminError } = await supabase
          .from('allowed_admins')
          .select('email')
          .eq('email', user.email)
          .single();

        if (adminError || !allowedAdmin) {
          console.error('Admin check error:', adminError);
          toast({
            title: "Access denied",
            description: "Your email is not authorized for admin access.",
            variant: "destructive",
          });
          navigate('/admin');
          return;
        }

        // Access granted

        setUser(user);
      } catch (error) {
        console.error('Auth check error:', error);
        toast({
          title: "Error",
          description: "An error occurred while checking authentication.",
          variant: "destructive",
        });
        navigate('/admin');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "Successfully logged out of admin panel.",
    });
    navigate('/admin');
  };

  const handleOrderClick = (orderId: string) => {
    const orderElement = document.getElementById(`order-${orderId}`);
    if (orderElement) {
      orderElement.scrollIntoView({ behavior: 'smooth' });
      orderElement.classList.add('highlight-order');
      setTimeout(() => {
        orderElement.classList.remove('highlight-order');
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <div className="text-amber-300">Verifying admin access...</div>
        </div>
      </div>
    );
  }

  return (
    <NotificationProvider adminUserId={user?.id}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border-b border-amber-500/30 shadow-lg shadow-amber-500/5">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-2 rounded-lg">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                    CARTSWIFT Admin
                  </h1>
                  <p className="text-xs text-amber-400/60">Management Dashboard</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <NotificationBell onOrderClick={handleOrderClick} />
                <span className="text-sm text-amber-300/70 hidden md:block">Welcome, {user?.email}</span>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="border-amber-500/50 text-amber-300 hover:bg-amber-950/50 hover:text-amber-200"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="items" className="space-y-6">
            <TabsList className="w-full inline-flex overflow-x-auto flex-nowrap justify-start md:grid md:grid-cols-12 gap-1 bg-slate-900/80 border border-amber-500/20 p-1 rounded-lg">
              <TabsTrigger 
                value="items" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Package size={16} />
                <span className="hidden sm:inline">Items</span>
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <ShoppingCart size={16} />
                <span className="hidden sm:inline">Orders</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Bell size={16} />
                <span className="hidden sm:inline">Notify</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reviews" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Star size={16} />
                <span className="hidden sm:inline">Reviews</span>
              </TabsTrigger>
              <TabsTrigger 
                value="shares" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Share size={16} />
                <span className="hidden sm:inline">Shares</span>
              </TabsTrigger>
              <TabsTrigger 
                value="viral" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Zap size={16} />
                <span className="hidden sm:inline">Viral</span>
              </TabsTrigger>
              <TabsTrigger 
                value="gift-cards" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">Gift Cards</span>
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <BarChart3 size={16} />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger 
                value="media" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <FolderOpen size={16} />
                <span className="hidden sm:inline">Media</span>
              </TabsTrigger>
              <TabsTrigger 
                value="visitors" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Users size={16} />
                <span className="hidden sm:inline">Visitors</span>
              </TabsTrigger>
              <TabsTrigger 
                value="market" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Mail size={16} />
                <span className="hidden sm:inline">Marketing</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sellers" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Store size={16} />
                <span className="hidden sm:inline">Sellers</span>
              </TabsTrigger>
              <TabsTrigger 
                value="applications" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <ClipboardList size={16} />
                <span className="hidden sm:inline">Applications</span>
              </TabsTrigger>
              <TabsTrigger 
                value="boosts" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Rocket size={16} />
                <span className="hidden sm:inline">Boosts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="deposits" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Wallet size={16} />
                <span className="hidden sm:inline">Deposits</span>
              </TabsTrigger>
              <TabsTrigger 
                value="emails" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Send size={16} />
                <span className="hidden sm:inline">Emails</span>
              </TabsTrigger>
              <TabsTrigger 
                value="temu" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Package size={16} />
                <span className="hidden sm:inline">Marketplace</span>
              </TabsTrigger>
              <TabsTrigger 
                value="support" 
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 hover:text-amber-300"
              >
                <Headphones size={16} />
                <span className="hidden sm:inline">Support</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="support">
              <SupportChatManagement />
            </TabsContent>
            
            <TabsContent value="items">
              <ItemManagement />
            </TabsContent>
            
            <TabsContent value="orders">
              <OrderManagement />
            </TabsContent>
            
            <TabsContent value="notifications">
              <NotificationManagement />
            </TabsContent>
            
            <TabsContent value="reviews">
              <ReviewsManagement />
            </TabsContent>
            
            <TabsContent value="shares">
              <ShareManagement />
            </TabsContent>
            
            <TabsContent value="viral">
              <ViralFeaturesManagement />
            </TabsContent>
            
            <TabsContent value="gift-cards">
              <GiftCardPaymentManagement />
            </TabsContent>
            
            <TabsContent value="payments">
              <div className="space-y-6">
                <PriceFormatSetting />
                <PaymentSettingsManagement />
                <PaymentProofsManagement />
              </div>
            </TabsContent>
            
            <TabsContent value="analytics">
              <AnalyticsManagement />
            </TabsContent>
            
            <TabsContent value="media">
              <MediaManagement />
            </TabsContent>
            
            <TabsContent value="visitors">
              <VisitorAnalytics />
            </TabsContent>
            
            <TabsContent value="market">
              <MarketAdvert />
            </TabsContent>
            
            <TabsContent value="sellers">
              <SellerManagement />
            </TabsContent>
            
            <TabsContent value="applications">
              <ApplicationsManagement />
            </TabsContent>
            
            <TabsContent value="boosts">
              <BoostRequestsManagement />
            </TabsContent>
            
            <TabsContent value="deposits">
              <div className="space-y-6">
                <DepositPaymentMethodsManagement />
                <DepositManagement />
              </div>
            </TabsContent>

            <TabsContent value="emails">
              <EmailTester />
            </TabsContent>

            <TabsContent value="temu">
              <TemuIntegration />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </NotificationProvider>
  );
};

export default AdminDashboard;