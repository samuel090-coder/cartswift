import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Copy, Mail, Share, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Referral {
  id: string;
  referral_code: string;
  referred_email: string;
  status: string;
  reward_amount: number;
  created_at: string;
  completed_at?: string;
}

const ReferralSystem = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = sessionStorage.getItem('sessionId') || '';
  const userEmail = localStorage.getItem('userEmail') || '';
  
  const [referrerEmail, setReferrerEmail] = useState(userEmail);
  const [referredEmail, setReferredEmail] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', sessionId],
    queryFn: async (): Promise<Referral[]> => {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .or(`referrer_session_id.eq.${sessionId},referrer_email.eq.${userEmail}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createReferral = useMutation({
    mutationFn: async () => {
      if (!referredEmail.trim()) {
        throw new Error('Please enter a valid email');
      }

      const referralCode = `REF${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      await supabase
        .from('referrals')
        .insert({
          referrer_session_id: sessionId,
          referrer_email: referrerEmail.trim() || null,
          referred_email: referredEmail.trim(),
          referral_code: referralCode,
          reward_amount: 50, // $50 reward for successful referral
        });

      return { referralCode, email: referredEmail.trim() };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['referrals', sessionId] });
      setReferredEmail('');
      setIsDialogOpen(false);
      
      // Copy referral link to clipboard
      const referralLink = `${window.location.origin}?ref=${data.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      
      toast({
        title: '🎉 Referral Created!',
        description: 'Referral link copied to clipboard. Share it to earn $50!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create referral',
        variant: 'destructive',
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const totalEarned = referrals
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + Number(r.reward_amount), 0);

  const pendingRewards = referrals
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + Number(r.reward_amount), 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            Referral Program
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Share size={16} />
                Refer Friend
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Refer a Friend & Earn $50!</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">How it works:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>1. Enter your friend's email</li>
                    <li>2. Share the referral link with them</li>
                    <li>3. Earn $50 when they make their first purchase!</li>
                  </ul>
                </div>
                
                <div>
                  <Label htmlFor="referrer-email">Your Email (optional)</Label>
                  <Input
                    id="referrer-email"
                    type="email"
                    value={referrerEmail}
                    onChange={(e) => setReferrerEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="referred-email">Friend's Email *</Label>
                  <Input
                    id="referred-email"
                    type="email"
                    value={referredEmail}
                    onChange={(e) => setReferredEmail(e.target.value)}
                    placeholder="friend@email.com"
                  />
                </div>
                
                <Button 
                  onClick={() => createReferral.mutate()} 
                  disabled={createReferral.isPending}
                  className="w-full"
                >
                  {createReferral.isPending ? 'Creating...' : 'Create Referral Link'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${totalEarned}</div>
            <div className="text-xs text-muted-foreground">Total Earned</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">${pendingRewards}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">{referrals.length}</div>
            <div className="text-xs text-muted-foreground">Total Referrals</div>
          </div>
        </div>

        {referrals.length === 0 ? (
          <div className="text-center py-6">
            <Gift className="mx-auto mb-2 text-gray-400" size={48} />
            <p className="text-muted-foreground">Start referring friends to earn rewards!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {referrals.map((referral) => (
              <div key={referral.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium">{referral.referred_email}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(referral.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(referral.status)} text-white text-xs`}>
                    {referral.status.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-medium">${referral.reward_amount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            💡 <strong>Pro Tip:</strong> Share referral links on social media for maximum reach!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralSystem;