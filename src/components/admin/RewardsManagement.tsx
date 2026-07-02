import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Gift, DollarSign, TrendingUp, Package, RefreshCw } from 'lucide-react';

interface Claim {
  id: string;
  session_id: string;
  primary_reward: any;
  status: string;
  amount_paid: number | null;
  currency: string;
  delivery: any;
  created_at: string;
  payment_reference: string | null;
}
interface Bundle { id: string; claim_id: string; amount_paid: number | null; status: string; bonus_items: any; created_at: string; }

export default function RewardsManagement() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [c, b] = await Promise.all([
      supabase.from('reward_claims' as any).select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('reward_bonus_bundles' as any).select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setClaims(((c.data as any) ?? []) as Claim[]);
    setBundles(((b.data as any) ?? []) as Bundle[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalClaims = claims.length;
  const paidClaims = claims.filter(c => c.status === 'paid' || c.status === 'shipped' || c.status === 'delivered').length;
  const conversion = totalClaims ? Math.round((paidClaims / totalClaims) * 100) : 0;
  const shippingRevenue = claims.filter(c => c.amount_paid).reduce((s, c) => s + Number(c.amount_paid || 0), 0);
  const bonusRevenue = bundles.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.amount_paid || 0), 0);
  const totalRevenue = shippingRevenue + bonusRevenue;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-amber-100">Smart Rewards</h2>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-slate-900/50 border-amber-900/30">
          <div className="flex items-center gap-2 text-amber-400 text-xs uppercase"><Gift className="h-4 w-4" />Total Claims</div>
          <div className="text-2xl font-bold text-amber-100 mt-1">{totalClaims.toLocaleString()}</div>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-amber-900/30">
          <div className="flex items-center gap-2 text-amber-400 text-xs uppercase"><Package className="h-4 w-4" />Paid</div>
          <div className="text-2xl font-bold text-amber-100 mt-1">{paidClaims.toLocaleString()}</div>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-amber-900/30">
          <div className="flex items-center gap-2 text-amber-400 text-xs uppercase"><TrendingUp className="h-4 w-4" />Conversion</div>
          <div className="text-2xl font-bold text-amber-100 mt-1">{conversion}%</div>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-amber-900/30">
          <div className="flex items-center gap-2 text-amber-400 text-xs uppercase"><DollarSign className="h-4 w-4" />Revenue</div>
          <div className="text-2xl font-bold text-amber-100 mt-1">${totalRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-amber-400/60 mt-1">Shipping ${shippingRevenue.toFixed(2)} · Bonus ${bonusRevenue.toFixed(2)}</div>
        </Card>
      </div>

      <Card className="p-4 bg-slate-900/50 border-amber-900/30">
        <h3 className="font-semibold text-amber-100 mb-3">Recent Claims</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {claims.length === 0 && !loading && <p className="text-sm text-amber-400/60 text-center py-8">No claims yet.</p>}
          {claims.map((c) => {
            const p = c.primary_reward || {};
            const bundle = bundles.find(b => b.claim_id === c.id);
            return (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 border border-amber-900/20">
                {p.image_url && <img src={p.image_url} alt="" className="w-12 h-12 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-amber-100 truncate">{p.title}</span>
                    <Badge variant={c.status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">{c.status}</Badge>
                    {bundle && <Badge variant="outline" className="text-[10px]">+bundle {bundle.status}</Badge>}
                  </div>
                  <div className="text-[11px] text-amber-400/60 truncate">
                    {c.delivery?.full_name ? `${c.delivery.full_name} · ${c.delivery.email || ''}` : `Session ${c.session_id.slice(0, 8)}`}
                    {' · '}{new Date(c.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-xs text-amber-100">
                  {c.amount_paid ? `$${Number(c.amount_paid).toFixed(2)}` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
