import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Copy, DollarSign, Users, TrendingUp, Link as LinkIcon, Share2 } from 'lucide-react';
import Header from '@/components/Header';
import { motion } from 'framer-motion';

const Affiliate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch affiliate data
  const { data: affiliate, isLoading } = useQuery({
    queryKey: ['affiliate', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch conversions
  const { data: conversions = [] } = useQuery({
    queryKey: ['affiliate-conversions', affiliate?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_conversions')
        .select('*')
        .eq('affiliate_id', affiliate?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!affiliate?.id,
  });

  // Join affiliate program
  const joinProgram = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in first');
      
      const affiliateCode = `AFF${user.id.slice(0, 8).toUpperCase()}`;
      
      const { error } = await supabase
        .from('affiliates')
        .insert({
          user_id: user.id,
          affiliate_code: affiliateCode,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate'] });
      toast.success('Welcome to the Affiliate Program!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyLink = () => {
    if (affiliate) {
      const link = `${window.location.origin}?aff=${affiliate.affiliate_code}`;
      navigator.clipboard.writeText(link);
      toast.success('Affiliate link copied!');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Affiliate Program</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to join our affiliate program and start earning
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <DollarSign className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Join Our Affiliate Program</h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Earn 5% commission on every sale you refer. Share your unique link and start earning passive income!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
              {[
                { icon: Share2, title: 'Share Your Link', desc: 'Get your unique affiliate link' },
                { icon: Users, title: 'Refer Customers', desc: 'Share with friends & followers' },
                { icon: DollarSign, title: 'Earn Commission', desc: '5% on every successful sale' },
              ].map((step, i) => (
                <Card key={step.title}>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Step {i + 1}</p>
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button size="lg" onClick={() => joinProgram.mutate()} disabled={joinProgram.isPending}>
              {joinProgram.isPending ? 'Joining...' : 'Join Affiliate Program'}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
            <p className="text-muted-foreground">Track your earnings and referrals</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {(Number(affiliate.commission_rate) * 100).toFixed(0)}% Commission
          </Badge>
        </div>

        {/* Affiliate Link */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground mb-1 block">Your Affiliate Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}?aff=${affiliate.affiliate_code}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={copyLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-600">${Number(affiliate.total_earnings).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <LinkIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-2xl font-bold text-blue-600">{affiliate.total_clicks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                  <p className="text-2xl font-bold text-purple-600">{affiliate.total_conversions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conv. Rate</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {affiliate.total_clicks > 0 
                      ? ((affiliate.total_conversions / affiliate.total_clicks) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Conversions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversions</CardTitle>
            <CardDescription>Track your successful referrals</CardDescription>
          </CardHeader>
          <CardContent>
            {conversions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No conversions yet. Share your link to start earning!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversions.map((conv: any) => (
                  <div key={conv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Order #{conv.order_id?.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(conv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+${Number(conv.commission_earned).toFixed(2)}</p>
                      <Badge variant={conv.status === 'paid' ? 'default' : 'secondary'}>
                        {conv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Add missing import
import { Label } from '@/components/ui/label';

export default Affiliate;
