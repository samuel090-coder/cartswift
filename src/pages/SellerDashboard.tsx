import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Store, Clock, CheckCircle, XCircle, Shield, DollarSign, TrendingUp, Package, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import SellerApplicationForm from '@/components/seller/SellerApplicationForm';
import ApprovedSellerDashboard from '@/components/seller/ApprovedSellerDashboard';
import { motion } from 'framer-motion';

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
        <div className="container mx-auto px-4 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-6">
              <Store className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Become a Seller on CartSwift</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of successful sellers and start earning today
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { icon: Shield, title: 'Verified Platform', desc: 'Trusted by buyers worldwide' },
                { icon: DollarSign, title: '88% Earnings', desc: 'Keep most of your sales' },
                { icon: TrendingUp, title: 'Growth Tools', desc: 'Analytics & promotion' },
              ].map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <Card key={i} className="text-left">
                    <CardContent className="p-4">
                      <Icon className="w-8 h-8 text-primary mb-2" />
                      <h3 className="font-semibold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
              Sign In to Apply
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your seller profile...</p>
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
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-2">
              <CardContent className="p-8">
                {application.status === 'pending' ? (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Clock className="w-10 h-10 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Application Under Review</h2>
                    <Badge className="mb-4 bg-amber-100 text-amber-700 text-sm px-4 py-1">Pending Review</Badge>
                    <p className="text-muted-foreground mb-6">
                      Your seller application for <strong className="text-foreground">{application.store_name}</strong> is being reviewed by our team. 
                      We'll notify you via email once a decision is made.
                    </p>
                    
                    <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Submitted</span>
                        <span>{new Date(application.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Store Name</span>
                        <span>{application.store_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categories</span>
                        <span>{application.product_categories?.join(', ')}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-6">
                      Review typically takes 24-48 hours. Check your email for updates.
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <XCircle className="w-10 h-10 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Application Not Approved</h2>
                    <Badge variant="destructive" className="mb-4 text-sm px-4 py-1">Rejected</Badge>
                    <p className="text-muted-foreground mb-4">
                      Unfortunately, your application for <strong className="text-foreground">{application.store_name}</strong> was not approved.
                    </p>
                    
                    {application.admin_notes && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-left mb-6">
                        <p className="text-sm font-medium text-destructive mb-1">Reason:</p>
                        <p className="text-sm">{application.admin_notes}</p>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground">
                      You may submit a new application with updated information.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show application form with intro
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 mb-8">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                {[
                  { icon: Package, value: '1000+', label: 'Active Sellers' },
                  { icon: DollarSign, value: '88%', label: 'You Keep' },
                  { icon: TrendingUp, value: '24-48h', label: 'Approval Time' },
                  { icon: Shield, value: '100%', label: 'Secure Platform' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="p-4">
                      <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <SellerApplicationForm />
      </div>
    </div>
  );
};

export default SellerDashboard;