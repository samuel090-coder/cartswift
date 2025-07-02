import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import ItemManagement from '@/components/admin/ItemManagement';
import OrderManagement from '@/components/admin/OrderManagement';
import PaymentProofsManagement from '@/components/admin/PaymentProofsManagement';
import AnalyticsManagement from '@/components/admin/AnalyticsManagement';
import GiftCardPaymentManagement from '@/components/admin/GiftCardPaymentManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut } from 'lucide-react';

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

        // Check if user is admin
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('is_admin, user_id')
          .eq('user_id', user.id)
          .single();

        if (adminError) {
          console.error('Admin user fetch error:', adminError);
          toast({
            title: "Access denied",
            description: "Unable to verify admin privileges. Please try logging in again.",
            variant: "destructive",
          });
          navigate('/admin');
          return;
        }

        if (!adminUser?.is_admin) {
          toast({
            title: "Access denied",
            description: "You don't have admin privileges.",
            variant: "destructive",
          });
          navigate('/admin');
          return;
        }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div>Verifying admin access...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">CARTSWIFT Admin</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="items" className="space-y-6">
          <TabsList>
            <TabsTrigger value="items">Item Management</TabsTrigger>
            <TabsTrigger value="orders">Order Management</TabsTrigger>
            <TabsTrigger value="proofs">Payment Proofs</TabsTrigger>
            <TabsTrigger value="gift-cards">Gift Card Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="items">
            <ItemManagement />
          </TabsContent>
          
          <TabsContent value="orders">
            <OrderManagement />
          </TabsContent>
          
          <TabsContent value="proofs">
            <PaymentProofsManagement />
          </TabsContent>
          
          <TabsContent value="gift-cards">
            <GiftCardPaymentManagement />
          </TabsContent>
          
          <TabsContent value="analytics">
            <AnalyticsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
