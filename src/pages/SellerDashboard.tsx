import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Store, Clock, CheckCircle, XCircle } from 'lucide-react';
import Header from '@/components/Header';
import SellerApplicationForm from '@/components/seller/SellerApplicationForm';
import ApprovedSellerDashboard from '@/components/seller/ApprovedSellerDashboard';

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check for existing application
  const { data: application, isLoading } = useQuery({
    queryKey: ['seller-application', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_applications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Store className="w-16 h-16 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-bold mb-4">Become a Seller</h1>
          <p className="text-muted-foreground mb-6">Sign in to apply as a seller on CartSwift</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  // If approved, show the seller dashboard
  if (application?.status === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Button>
          <ApprovedSellerDashboard application={application} />
        </div>
      </div>
    );
  }

  // If pending or rejected, show status
  if (application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="p-8 text-center">
              {application.status === 'pending' ? (
                <>
                  <Clock className="w-16 h-16 mx-auto text-amber-500 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Application Under Review</h2>
                  <Badge className="mb-4 bg-amber-100 text-amber-700">Pending</Badge>
                  <p className="text-muted-foreground">
                    Your seller application for <strong>{application.store_name}</strong> is being reviewed. 
                    We'll notify you once a decision is made.
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Application Rejected</h2>
                  <Badge variant="destructive" className="mb-4">Rejected</Badge>
                  <p className="text-muted-foreground mb-4">
                    Unfortunately, your application was not approved. 
                    {application.admin_notes && <span className="block mt-2"><strong>Reason:</strong> {application.admin_notes}</span>}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show application form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-center mb-8">
          <Store className="w-12 h-12 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-bold mb-2">Become a Seller</h1>
          <p className="text-muted-foreground">Complete the application to start selling on CartSwift</p>
        </div>
        <SellerApplicationForm />
      </div>
    </div>
  );
};

export default SellerDashboard;
