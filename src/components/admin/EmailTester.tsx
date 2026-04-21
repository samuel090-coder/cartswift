import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Mail, Eye, Send, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

const EMAIL_TYPES = [
  // Social
  { value: 'new_follower', label: '👤 New Follower', sample: { followerName: 'Sarah Johnson', followerId: 'demo', followerProfile: { full_name: 'Sarah Johnson', email: 'sarah@example.com', bio: 'Lover of fashion deals 💕', followers_count: 1240 } } },
  { value: 'post_liked', label: '❤️ Post Liked', sample: { likerName: 'Alex Chen', mediaUrl: 'https://picsum.photos/600/400', isVideo: false } },
  { value: 'post_commented', label: '💬 Post Commented', sample: { commenterName: 'Maria', commentText: 'Where did you get this?! Need it asap 😍', mediaUrl: 'https://picsum.photos/600/400' } },
  { value: 'profile_viewed', label: '👀 Profile Viewed', sample: { viewerProfile: { full_name: 'John Doe', bio: 'Just browsing', followers_count: 88 } } },
  { value: 'milestone_followers', label: '🎉 Followers Milestone', sample: { count: 1000 } },
  // Orders / payments
  { value: 'order_received', label: '✅ Order Received', sample: { orderId: 'demo-id', trackingCode: 'CS-DEMO1234', total: 124.99, items: [{ title: 'Wireless Earbuds', quantity: 1, price: 79.99 }, { title: 'Phone Case', quantity: 2, price: 22.5 }] } },
  { value: 'payment_approved', label: '✅ Payment Approved', sample: { trackingCode: 'CS-DEMO1234', orderId: 'demo' } },
  { value: 'payment_declined', label: '❌ Payment Declined', sample: { trackingCode: 'CS-DEMO1234', reason: 'Payment proof was unclear.' } },
  { value: 'order_live', label: '🚚 Order Live (Shipped)', sample: { trackingCode: 'CS-DEMO1234', status: 'in_transit', description: 'Departed Miami sorting facility', destination: 'Lagos, Nigeria', lat: 6.5244, lon: 3.3792, distanceKm: 9520, eta: '8-14 days' } },
  { value: 'order_shipped', label: '📦 Order Shipped', sample: { trackingCode: 'CS-DEMO1234', carrier: 'CartSwift Express' } },
  { value: 'out_for_delivery', label: '🚚 Out for Delivery', sample: { trackingCode: 'CS-DEMO1234' } },
  { value: 'order_delivered', label: '✅ Order Delivered', sample: { trackingCode: 'CS-DEMO1234' } },
  { value: 'order_cancelled', label: '⛔ Order Cancelled', sample: { trackingCode: 'CS-DEMO1234', reason: 'Out of stock.' } },
  { value: 'refund_processed', label: '💵 Refund Processed', sample: { amount: 124.99 } },
  { value: 'review_request', label: '⭐ Review Request', sample: { productTitle: 'Wireless Earbuds', imageUrl: 'https://picsum.photos/600/400' } },
  // Status sales
  { value: 'status_purchase', label: '💰 Status Sale (Seller)', sample: { buyerName: 'Jane', productTitle: 'Vintage Watch', amount: 89.99 } },
  { value: 'status_payout', label: '💰 Status Payout', sample: { amount: 45.20, views: 1500, reactions: 320 } },
  // Wallet
  { value: 'deposit_approved', label: '💵 Deposit Approved', sample: { amount: 50, note: 'Bank transfer verified.' } },
  { value: 'deposit_declined', label: '⚠️ Deposit Declined', sample: { amount: 50, reason: 'Receipt unreadable.' } },
  { value: 'wallet_credit', label: '💵 Wallet Credit', sample: { amount: 25, note: 'Bonus credit.' } },
  { value: 'withdrawal_requested', label: '🏦 Withdrawal Requested', sample: { amount: 100 } },
  { value: 'withdrawal_completed', label: '✅ Withdrawal Sent', sample: { amount: 100 } },
  { value: 'gift_card_received', label: '🎁 Gift Card Received', sample: { amount: 50, fromName: 'Mike', message: 'Happy birthday!' } },
  // Onboarding / auth
  { value: 'welcome', label: '👋 Welcome', sample: { userName: 'Alex' } },
  { value: 'email_verified', label: '✅ Email Verified', sample: {} },
  { value: 'password_reset', label: '🔐 Password Reset', sample: { resetUrl: 'https://cartswift.lovable.app/auth?reset=token' } },
  { value: 'login_alert', label: '🔔 Login Alert', sample: { device: 'Chrome on Windows', location: 'Lagos, Nigeria' } },
  { value: 'birthday', label: '🎂 Birthday', sample: { userName: 'Alex' } },
  { value: 'we_miss_you', label: '💔 We Miss You', sample: { userName: 'Alex' } },
  // Cart / wishlist
  { value: 'cart_abandoned', label: '🛒 Cart Abandoned', sample: { itemCount: 3 } },
  { value: 'wishlist_price_drop', label: '📉 Wishlist Price Drop', sample: { productTitle: 'Smart Watch', oldPrice: 199, newPrice: 149, imageUrl: 'https://picsum.photos/600/400', shortId: '24' } },
  { value: 'wishlist_back_in_stock', label: '📦 Back in Stock', sample: { productTitle: 'Smart Watch', imageUrl: 'https://picsum.photos/600/400', shortId: '24' } },
  // Marketing / discovery
  { value: 'flash_sale', label: '⚡ Flash Sale Started', sample: { discount: 40, endsIn: '12h', itemCount: 150 } },
  { value: 'trending_alert', label: '🔥 Trending Alert', sample: { productTitle: 'Hydration Bottle', viewCount: 5400, imageUrl: 'https://picsum.photos/600/400', shortId: '24' } },
  { value: 'personalized_recommendation', label: '✨ For You', sample: { productTitle: 'Linen Shirt', imageUrl: 'https://picsum.photos/600/400', shortId: '24', userName: 'Alex' } },
  { value: 'weekly_digest', label: '📰 Weekly Digest', sample: { newProducts: 124, trendingSellers: 18, deals: 47 } },
  // Sellers
  { value: 'seller_new_product', label: '🆕 Seller New Product', sample: { sellerName: 'TechHub', productTitle: 'Bluetooth Speaker', price: 39.99, imageUrl: 'https://picsum.photos/600/400', shortId: '24' } },
  { value: 'seller_live', label: '🔴 Seller Live', sample: { sellerName: 'TechHub', sellerId: 'demo' } },
  { value: 'seller_status_posted', label: '📸 Seller Status', sample: { sellerName: 'TechHub', sellerId: 'demo', mediaUrl: 'https://picsum.photos/600/400', isVideo: false } },
  { value: 'seller_review_received', label: '⭐ Seller Got Review', sample: { rating: 5, comment: 'Amazing product, fast shipping!' } },
  { value: 'seller_approved', label: '🎉 Seller Approved', sample: { userName: 'Alex' } },
  { value: 'seller_rejected', label: '❌ Seller Rejected', sample: { reason: 'Documents need to be clearer.' } },
  // Messaging
  { value: 'message_received', label: '💬 DM Received', sample: { senderName: 'Sarah', preview: 'Hey, is this still available?' } },
  { value: 'voice_message_received', label: '🎙️ Voice Message', sample: { senderName: 'Sarah', duration: 12 } },
  // Loyalty / referrals / affiliates
  { value: 'loyalty_tier_upgrade', label: '🏆 Tier Upgraded', sample: { tier: 'Gold', userName: 'Alex' } },
  { value: 'loyalty_points_earned', label: '🪙 Points Earned', sample: { points: 50, balance: 1250 } },
  { value: 'referral_signup', label: '🤝 Referral Signup', sample: { friendName: 'Mike' } },
  { value: 'referral_reward', label: '💰 Referral Reward', sample: { amount: 10 } },
  { value: 'affiliate_conversion', label: '💸 Affiliate Conversion', sample: { commission: 15.25 } },
  { value: 'ambassador_approved', label: '🌟 Ambassador Approved', sample: { commissionRate: 10 } },
  { value: 'ambassador_rejected', label: '❌ Ambassador Rejected', sample: { reason: 'Need more followers.' } },
  // Boosts
  { value: 'boost_approved', label: '🚀 Boost Approved', sample: { productTitle: 'Smart Watch', duration: 7 } },
  { value: 'boost_ended', label: '📊 Boost Ended', sample: { views: 12500, conversions: 87 } },
];

const EmailTester = () => {
  const [type, setType] = useState('order_received');
  const [recipient, setRecipient] = useState('');
  const [customData, setCustomData] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const selected = EMAIL_TYPES.find(t => t.value === type)!;

  const getData = () => {
    if (customData.trim()) {
      try { return JSON.parse(customData); }
      catch { toast({ title: 'Invalid JSON', variant: 'destructive' }); return null; }
    }
    return selected.sample;
  };

  const handlePreview = async () => {
    const data = getData();
    if (!data) return;
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('send-email', {
        body: { type, userEmail: recipient || 'preview@example.com', data, previewOnly: true },
      });
      if (error) throw error;
      setPreviewHtml(res?.html || '');
      toast({ title: 'Preview generated' });
    } catch (e: any) {
      toast({ title: 'Preview failed', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!recipient) { toast({ title: 'Recipient email required', variant: 'destructive' }); return; }
    const data = getData();
    if (!data) return;
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('send-email', {
        body: { type, userEmail: recipient, data },
      });
      if (error) throw error;
      if (res?.success) {
        toast({ title: '✉️ Email sent!', description: `Sent ${type} to ${recipient}` });
        recentLogs.refetch();
      } else {
        toast({ title: 'Send failed', description: res?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Send failed', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const recentLogs = useQuery({
    queryKey: ['email-send-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('email_send_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return (data as any[]) || [];
    },
  });

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-amber-300 flex items-center gap-2">
            <Mail className="h-5 w-5" /> Email Tester ({EMAIL_TYPES.length} templates)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300">Email type</Label>
              <Select value={type} onValueChange={(v) => { setType(v); setCustomData(''); setPreviewHtml(''); }}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {EMAIL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Recipient email</Label>
              <Input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="you@example.com" className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>

          <div>
            <Label className="text-slate-300 text-xs">Sample data (auto-filled — edit JSON to customize)</Label>
            <Textarea
              value={customData || JSON.stringify(selected.sample, null, 2)}
              onChange={e => setCustomData(e.target.value)}
              rows={8}
              className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePreview} disabled={loading} variant="outline" className="flex-1 border-amber-500/50 text-amber-300">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Preview
            </Button>
            <Button onClick={handleSend} disabled={loading || !recipient} className="flex-1 bg-amber-600 hover:bg-amber-700">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewHtml && (
        <Card className="bg-white border-amber-500/20 overflow-hidden">
          <CardHeader className="bg-slate-100"><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
          <CardContent className="p-0">
            <iframe srcDoc={previewHtml} className="w-full" style={{ height: 700, border: 0 }} title="Email preview" />
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-900/50 border-amber-500/20">
        <CardHeader><CardTitle className="text-amber-300 text-sm">Recent sends</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-y-auto">
          {recentLogs.data?.length ? recentLogs.data.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between text-xs bg-slate-800/50 rounded p-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={l.status === 'sent' ? 'default' : l.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">{l.status}</Badge>
                <span className="text-slate-300 truncate">{l.email_type}</span>
                <span className="text-slate-500 truncate">→ {l.recipient_email}</span>
              </div>
              <span className="text-slate-500 text-[10px] flex-shrink-0 ml-2">{new Date(l.created_at).toLocaleTimeString()}</span>
            </div>
          )) : <p className="text-slate-500 text-xs text-center py-4">No emails sent yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTester;
