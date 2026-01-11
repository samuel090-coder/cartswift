import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  DollarSign, CheckCircle, XCircle, Clock, ExternalLink, 
  User, CreditCard, Image, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';

const DepositManagement = () => {
  const queryClient = useQueryClient();
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch all deposit requests
  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ['admin-deposit-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch user profiles
      const userIds = [...new Set(data?.map(d => d.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      
      return data?.map(d => ({
        ...d,
        profile: profiles?.find(p => p.id === d.user_id)
      })) || [];
    },
  });

  // Approve deposit mutation
  const approveMutation = useMutation({
    mutationFn: async (deposit: any) => {
      // Update deposit status
      const { error: depositError } = await supabase
        .from('deposit_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', deposit.id);
      
      if (depositError) throw depositError;

      // Update user's wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', deposit.user_id)
        .maybeSingle();

      if (walletError) throw walletError;

      if (wallet) {
        // Update existing wallet
        const { error: updateError } = await supabase
          .from('wallets')
          .update({ 
            balance: wallet.balance + deposit.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', wallet.id);
        if (updateError) throw updateError;
      } else {
        // Create new wallet with balance
        const { error: createError } = await supabase
          .from('wallets')
          .insert({ 
            user_id: deposit.user_id,
            balance: deposit.amount
          });
        if (createError) throw createError;
      }
    },
    onSuccess: () => {
      toast.success('Deposit approved! Wallet updated.');
      queryClient.invalidateQueries({ queryKey: ['admin-deposit-requests'] });
      setSelectedDeposit(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve deposit');
    },
  });

  // Reject deposit mutation
  const rejectMutation = useMutation({
    mutationFn: async (deposit: any) => {
      const { error } = await supabase
        .from('deposit_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', deposit.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deposit rejected.');
      queryClient.invalidateQueries({ queryKey: ['admin-deposit-requests'] });
      setSelectedDeposit(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject deposit');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  const pendingDeposits = deposits.filter((d: any) => d.status === 'pending');
  const processedDeposits = deposits.filter((d: any) => d.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingDeposits.length}</p>
            <p className="text-sm text-amber-700">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              ${deposits.filter((d: any) => d.status === 'approved').reduce((sum: number, d: any) => sum + d.amount, 0).toFixed(2)}
            </p>
            <p className="text-sm text-green-700">Total Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{deposits.length}</p>
            <p className="text-sm text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingDeposits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Deposit Requests ({pendingDeposits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingDeposits.map((deposit: any) => (
              <div 
                key={deposit.id} 
                className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={deposit.profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10">
                        {getInitials(deposit.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{deposit.profile?.full_name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">{deposit.profile?.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">${deposit.amount}</p>
                    <p className="text-sm text-muted-foreground">{deposit.payment_method}</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span>Reference: <strong>{deposit.payment_reference}</strong></span>
                  </div>
                  {deposit.proof_url && (
                    <a 
                      href={deposit.proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Image className="w-4 h-4" />
                      View Payment Proof
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Submitted: {format(new Date(deposit.created_at), 'PPpp')}
                  </p>
                </div>

                {selectedDeposit?.id === deposit.id ? (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Admin notes (optional)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveMutation.mutate(deposit)}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        Approve & Credit Wallet
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(deposit)}
                        disabled={rejectMutation.isPending}
                        className="flex-1"
                      >
                        {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedDeposit(null);
                          setAdminNotes('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setSelectedDeposit(deposit)}
                      className="bg-primary"
                    >
                      Review & Approve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            All Deposit Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deposits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No deposit requests yet</p>
          ) : (
            <div className="space-y-3">
              {deposits.map((deposit: any) => (
                <div 
                  key={deposit.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={deposit.profile?.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {getInitials(deposit.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{deposit.profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(deposit.created_at), 'PP')} • {deposit.payment_method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">${deposit.amount}</span>
                    {getStatusBadge(deposit.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DepositManagement;
