import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Crown, Star, Users, DollarSign, Instagram, Twitter } from 'lucide-react';
import Header from '@/components/Header';
import { motion } from 'framer-motion';

const tierBenefits = {
  bronze: { discount: 10, commission: 10, color: 'bg-amber-700' },
  silver: { discount: 15, commission: 12, color: 'bg-gray-400' },
  gold: { discount: 20, commission: 15, color: 'bg-yellow-500' },
  platinum: { discount: 25, commission: 20, color: 'bg-purple-600' },
};

const Ambassador = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [socialHandles, setSocialHandles] = useState({
    instagram: '',
    twitter: '',
    tiktok: '',
    youtube: '',
  });
  const [followerCount, setFollowerCount] = useState('');

  // Fetch ambassador data
  const { data: ambassador } = useQuery({
    queryKey: ['ambassador', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ambassadors')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in first');
      
      const ambassadorCode = `AMB${user.id.slice(0, 6).toUpperCase()}`;
      
      const { error } = await supabase
        .from('ambassadors')
        .insert({
          user_id: user.id,
          ambassador_code: ambassadorCode,
          social_handles: socialHandles,
          follower_count: parseInt(followerCount) || 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambassador'] });
      toast.success('Application submitted! We\'ll review it shortly.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyCode = () => {
    if (ambassador) {
      navigator.clipboard.writeText(ambassador.ambassador_code);
      toast.success('Ambassador code copied!');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Crown className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl font-bold mb-4">Ambassador Program</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to become a CartSwift Ambassador
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (ambassador) {
    const tier = ambassador.tier as keyof typeof tierBenefits;
    const benefits = tierBenefits[tier];

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="text-center mb-8">
            <div className={`w-20 h-20 ${benefits.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Ambassador Dashboard</h1>
            <Badge className={benefits.color + ' text-white text-lg px-4 py-1'}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Ambassador
            </Badge>
            {!ambassador.is_approved && (
              <Badge variant="secondary" className="ml-2">Pending Approval</Badge>
            )}
          </div>

          {/* Ambassador Code */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <Label className="text-sm text-muted-foreground">Your Ambassador Code</Label>
              <div className="flex gap-2 mt-1">
                <Input value={ambassador.ambassador_code} readOnly className="font-mono text-lg font-bold" />
                <Button onClick={copyCode}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Share this code with your followers for {benefits.discount}% off their purchase
              </p>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-600">${Number(ambassador.total_sales).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Sales Generated</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{benefits.commission}%</p>
                <p className="text-sm text-muted-foreground">Commission Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{ambassador.follower_count?.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </CardContent>
            </Card>
          </div>

          {/* Tier Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Your Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">Discount for Followers</p>
                  <p className="text-2xl font-bold text-primary">{benefits.discount}% OFF</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">Your Commission</p>
                  <p className="text-2xl font-bold text-green-600">{benefits.commission}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Application Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Crown className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl font-bold mb-2">Become an Ambassador</h1>
          <p className="text-muted-foreground">
            Partner with CartSwift and earn commission while giving your followers exclusive discounts
          </p>
        </motion.div>

        {/* Benefits Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {Object.entries(tierBenefits).map(([tier, benefits]) => (
            <Card key={tier} className="text-center p-3">
              <div className={`w-8 h-8 ${benefits.color} rounded-full mx-auto mb-2`} />
              <p className="font-medium capitalize text-sm">{tier}</p>
              <p className="text-xs text-muted-foreground">{benefits.commission}% commission</p>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Apply Now</CardTitle>
            <CardDescription>Tell us about your social media presence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> Instagram
                </Label>
                <Input
                  value={socialHandles.instagram}
                  onChange={(e) => setSocialHandles({ ...socialHandles, instagram: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Twitter className="w-4 h-4" /> Twitter/X
                </Label>
                <Input
                  value={socialHandles.twitter}
                  onChange={(e) => setSocialHandles({ ...socialHandles, twitter: e.target.value })}
                  placeholder="@username"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TikTok</Label>
                <Input
                  value={socialHandles.tiktok}
                  onChange={(e) => setSocialHandles({ ...socialHandles, tiktok: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label>YouTube</Label>
                <Input
                  value={socialHandles.youtube}
                  onChange={(e) => setSocialHandles({ ...socialHandles, youtube: e.target.value })}
                  placeholder="channel name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Follower Count (approx.)</Label>
              <Input
                type="number"
                value={followerCount}
                onChange={(e) => setFollowerCount(e.target.value)}
                placeholder="10000"
              />
            </div>

            <Button 
              onClick={() => applyMutation.mutate()} 
              disabled={applyMutation.isPending}
              className="w-full"
              size="lg"
            >
              {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Ambassador;
