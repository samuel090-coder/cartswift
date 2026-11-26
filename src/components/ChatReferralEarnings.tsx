import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CHAT_REFERRAL_RATE } from '@/lib/chatCommission';
import { formatChatPrice } from '@/components/chat/chatFormat';
import { BadgeCheck, Gift, HandCoins } from 'lucide-react';

type ReferralCommission = {
  id: string;
  commission_earned: number;
  order_amount: number;
  status: string;
  created_at: string;
  seller_orders?: { seller_products?: { title?: string; currency?: string } | null } | null;
};

const ChatReferralEarnings = () => {
  const { user } = useAuth();
  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['chat-product-commissions', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_product_commissions')
        .select('id, commission_earned, order_amount, status, created_at, seller_orders(seller_products(title, currency))')
        .eq('referrer_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReferralCommission[];
    },
  });

  const earnedCount = commissions.filter((commission) => commission.status === 'earned').length;
  const pendingCount = commissions.filter((commission) => commission.status === 'pending').length;

  return (
    <Card className="mb-8 border-primary/25 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <HandCoins className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg">Chat product earnings</CardTitle>
            <CardDescription>Earn up to {CHAT_REFERRAL_RATE * 100}% from CartSwift’s fee when a customer buys a seller product you shared in chat. Seller payout stays unchanged.</CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary">{earnedCount} completed</Badge>
          <Badge variant="outline">{pendingCount} awaiting delivery</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" aria-label="Loading chat earnings">
            <div className="h-14 animate-pulse rounded-md bg-muted/60" />
            <div className="h-14 animate-pulse rounded-md bg-muted/60" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="flex items-start gap-3 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>Share a seller’s product in a chat. Any commission from a completed order will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {commissions.map((commission) => {
              const product = commission.seller_orders?.seller_products;
              const currency = product?.currency || 'USD';
              const status = commission.status;
              return (
                <div key={commission.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product?.title || 'Shared seller product'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(commission.created_at).toLocaleDateString()} · {formatChatPrice(commission.order_amount, currency)} sale
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-primary">+{formatChatPrice(commission.commission_earned, currency)}</p>
                    <Badge variant={status === 'earned' ? 'default' : status === 'cancelled' ? 'destructive' : 'outline'} className="mt-1 gap-1">
                      {status === 'earned' && <BadgeCheck className="h-3 w-3" />}
                      {status === 'earned' ? 'Earned' : status === 'cancelled' ? 'Cancelled' : 'Pending delivery'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatReferralEarnings;