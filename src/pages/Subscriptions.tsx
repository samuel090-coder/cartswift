import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Check, Crown, Sparkles, Zap, Gift, Truck, Star } from 'lucide-react';
import Header from '@/components/Header';
import { motion } from 'framer-motion';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    icon: Star,
    color: 'bg-gray-100 text-gray-600',
    features: [
      'Browse all products',
      'Basic rewards program',
      'Standard shipping rates',
      'Email support',
    ],
    notIncluded: [
      'Free shipping',
      'Early access to deals',
      'Bonus loyalty points',
      'Exclusive VIP deals',
    ],
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 9.99,
    period: '/month',
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-600',
    popular: true,
    features: [
      'Everything in Free',
      'Free shipping on orders $25+',
      'Early access to flash sales',
      '2x loyalty points',
      'VIP-only deals',
      'Priority support',
    ],
    notIncluded: [
      'Unlimited free shipping',
      '3x loyalty points',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    period: '/month',
    icon: Crown,
    color: 'bg-amber-100 text-amber-600',
    features: [
      'Everything in VIP',
      'Unlimited free shipping',
      '3x loyalty points',
      'Exclusive premium deals',
      'Personal shopping assistant',
      'Free returns',
      'Birthday bonus rewards',
      '24/7 phone support',
    ],
    notIncluded: [],
  },
];

const Subscriptions = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Fetch current subscription
  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (tier: string) => {
      if (!user) throw new Error('Please sign in first');

      const benefits = {
        free: { free_shipping: false, early_access: false, bonus_points_multiplier: 1, exclusive_deals: false },
        vip: { free_shipping: true, early_access: true, bonus_points_multiplier: 2, exclusive_deals: true },
        premium: { free_shipping: true, early_access: true, bonus_points_multiplier: 3, exclusive_deals: true },
      };

      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          tier: tier as 'free' | 'vip' | 'premium',
          benefits: benefits[tier as keyof typeof benefits],
          is_active: true,
          expires_at: tier === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: (_, tier) => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success(`Successfully subscribed to ${tier.toUpperCase()}!`);
      setSelectedPlan(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubscribe = (planId: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      navigate('/auth');
      return;
    }
    subscribeMutation.mutate(planId);
  };

  const currentTier = subscription?.tier || 'free';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shop
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlock premium benefits, exclusive deals, and faster shipping with our subscription plans
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentTier === plan.id;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative h-full ${plan.popular ? 'border-purple-500 border-2 shadow-lg' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-purple-600 text-white">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 rounded-full ${plan.color} flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                      {plan.notIncluded.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 opacity-50">
                          <div className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm line-through">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full mt-6"
                      variant={isCurrentPlan ? 'outline' : plan.popular ? 'default' : 'secondary'}
                      disabled={isCurrentPlan || subscribeMutation.isPending}
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      {isCurrentPlan ? 'Current Plan' : `Subscribe to ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Why Go Premium?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Free Shipping', desc: 'Save on every order with free delivery' },
              { icon: Zap, title: 'Early Access', desc: 'Shop flash sales before everyone else' },
              { icon: Gift, title: 'Bonus Points', desc: 'Earn up to 3x loyalty points' },
              { icon: Crown, title: 'VIP Support', desc: '24/7 priority customer service' },
            ].map((benefit) => (
              <Card key={benefit.title}>
                <CardContent className="p-6 text-center">
                  <benefit.icon className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
