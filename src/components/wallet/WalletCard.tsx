import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, TrendingUp, Gift, DollarSign, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import DepositModal from './DepositModal';

const WalletCard = () => {
  const { user } = useAuth();
  const [showDeposit, setShowDeposit] = useState(false);
  const queryClient = useQueryClient();

  // Fetch or create wallet
  const { data: wallet, isLoading } = useQuery({
    queryKey: ['my-wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Try to get existing wallet
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no wallet exists, create one
      if (!data) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: user.id })
          .select()
          .single();
        if (createError) throw createError;
        return newWallet;
      }
      
      return data;
    },
    enabled: !!user,
  });

  // Fetch pending deposit requests
  const { data: pendingDeposits = [] } = useQuery({
    queryKey: ['pending-deposits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch status view earnings
  const { data: viewEarnings = [] } = useQuery({
    queryKey: ['status-view-earnings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('status_view_earnings')
        .select('*')
        .eq('owner_id', user.id)
        .order('credited_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-12 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBalance = (wallet?.balance || 0) + (wallet?.bonus_balance || 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-background via-primary/5 to-pink-vibrant/10 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              My Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total Balance */}
            <div className="text-center py-4 bg-gradient-to-r from-primary/10 to-pink-vibrant/10 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-pink-vibrant bg-clip-text text-transparent">
                ${totalBalance.toFixed(2)}
              </p>
            </div>

            {/* Balance Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 rounded-xl text-center">
                <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Main Balance</p>
                <p className="text-lg font-bold text-green-600">${(wallet?.balance || 0).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-xl text-center">
                <Gift className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Bonus Balance</p>
                <p className="text-lg font-bold text-amber-600">${(wallet?.bonus_balance || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Total Earned from Views */}
            <div className="p-4 bg-primary/10 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="text-sm">Total Earned from Views</span>
                </div>
                <span className="font-bold text-primary">${(wallet?.total_earned || 0).toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                You earn $0.50 for each unique view on your status
              </p>
            </div>

            {/* Pending Deposits */}
            {pendingDeposits.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  Pending Deposits
                </h4>
                {pendingDeposits.map((deposit: any) => (
                  <div key={deposit.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">${deposit.amount}</p>
                      <p className="text-xs text-muted-foreground">{deposit.payment_method}</p>
                    </div>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Recent View Earnings */}
            {viewEarnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent View Earnings</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {viewEarnings.slice(0, 5).map((earning: any) => (
                    <div key={earning.id} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Status View</span>
                      <span className="text-green-600 font-medium">+$0.50</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deposit Button */}
            <Button 
              onClick={() => setShowDeposit(true)}
              className="w-full bg-gradient-to-r from-primary to-pink-vibrant hover:opacity-90 gap-2"
            >
              <Plus className="w-4 h-4" />
              Top Up Wallet
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {showDeposit && (
        <DepositModal 
          onClose={() => setShowDeposit(false)} 
          onSuccess={() => {
            setShowDeposit(false);
            queryClient.invalidateQueries({ queryKey: ['pending-deposits'] });
          }}
        />
      )}
    </>
  );
};

export default WalletCard;
