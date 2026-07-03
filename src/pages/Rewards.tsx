import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, ChevronLeft, Truck, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { setActiveClaim } from '@/lib/rewardSession';

const fmtNGN = (n: number) => `₦${Math.round(Number(n || 0)).toLocaleString('en-NG')}`;

export default function Rewards() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    (async () => {
      const { data } = await supabase
        .from('reward_claims')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setClaims(data || []);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const statusBadge = (s: string) => {
    if (s === 'paid') return <Badge className="bg-emerald-500 text-white"><CheckCircle2 className="mr-1 h-3 w-3" />Paid</Badge>;
    if (s === 'pending') return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending payment</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 pb-32">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="mb-1 text-2xl font-bold">My Rewards</h1>
        <p className="mb-6 text-sm text-muted-foreground">Manage the exclusive rewards unlocked on your account.</p>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">Loading…</div>
        ) : claims.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <Gift className="mx-auto mb-3 h-10 w-10 text-primary/60" />
            <p className="mb-3">No rewards yet. Keep exploring — you may unlock one soon.</p>
            <Button onClick={() => navigate('/')}>Back to shop</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((c) => {
              const p = c.primary_reward || {};
              return (
                <div key={c.id} className="rounded-2xl border bg-card p-4 flex gap-3">
                  <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold truncate">{p.title}</h3>
                      {statusBadge(c.status)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Value <span className="line-through">{fmtNGN(p.original_price_ngn || p.original_price)}</span> · You paid {c.status === 'paid' ? fmtNGN(c.amount_paid) : fmtNGN(c.shipping_fee)}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Truck className="h-3 w-3" />
                      {c.delivery?.address ? `${c.delivery.city}, ${c.delivery.state}` : 'No delivery address yet'}
                    </div>
                    <div className="mt-2">
                      {c.status === 'pending' ? (
                        <Button size="sm" onClick={() => { setActiveClaim(c); navigate('/reward/claim'); }}>
                          Continue claim
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setActiveClaim(c); navigate('/reward/bonus'); }}>
                          View bonus rewards
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
