import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, CheckCircle, Clock, MapPin, Search, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import AnimatedBackground from '@/components/AnimatedBackground';
import SEOHead from '@/components/SEOHead';
import TrackingMap from '@/components/TrackingMap';

const statusIcons: Record<string, any> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: AlertCircle,
};

const steps = ['pending', 'processing', 'shipped', 'delivered'];

const Track = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [searched, setSearched] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = async (rawCode: string) => {
    const trimmed = rawCode.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setUpdates([]);
    setSearched(trimmed);
    setSearchParams({ code: trimmed });

    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('id, tracking_code, status, full_name, city, state, country, created_at, updated_at, total_amount, currency')
      .eq('tracking_code', trimmed)
      .maybeSingle();

    if (orderErr || !orderData) {
      setError('No order found with that tracking code. Please double-check and try again.');
      setLoading(false);
      return;
    }

    const { data: trackData } = await supabase
      .from('order_tracking')
      .select('*')
      .eq('order_id', orderData.id)
      .order('created_at', { ascending: false });

    setOrder(orderData);
    setUpdates(trackData || []);
    setLoading(false);
  };

  // Realtime: refresh tracking when admin posts new updates.
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`order-tracking-${order.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_tracking', filter: `order_id=eq.${order.id}` },
        async () => {
          const { data } = await supabase
            .from('order_tracking')
            .select('*')
            .eq('order_id', order.id)
            .order('created_at', { ascending: false });
          setUpdates(data || []);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => setOrder((prev: any) => ({ ...prev, ...payload.new })),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  useEffect(() => {
    const initialCode = searchParams.get('code');
    if (initialCode) lookup(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStepIndex = order ? steps.indexOf(order.status) : -1;
  const destination = order
    ? [order.city, order.state, order.country].filter(Boolean).join(', ')
    : null;

  return (
    <AnimatedBackground>
      <SEOHead
        title="Track Your Order | CartSwift"
        description="Enter your tracking code to see real-time updates and a live map of your CartSwift order."
      />
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Track Your Order</h1>
          <p className="text-white/70">Enter your tracking code to see live progress on the map</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-6">
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookup(code);
              }}
              className="flex gap-2"
            >
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CS-A3F9K2QH"
                className="bg-white/90 text-foreground uppercase"
              />
              <Button type="submit" disabled={loading}>
                <Search className="h-4 w-4 mr-1" />
                {loading ? 'Searching...' : 'Track'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Card className="bg-destructive/20 border-destructive/40">
            <CardContent className="py-6 text-center text-white">
              <AlertCircle className="mx-auto h-8 w-8 mb-2" />
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {order && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <CardTitle className="text-white">Order {order.tracking_code}</CardTitle>
                  <p className="text-white/60 text-sm mt-1">Placed {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <Badge className="capitalize">{order.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Live map */}
              <TrackingMap
                updates={updates}
                destination={destination}
                orderCreatedAt={order.created_at}
                orderStatus={order.status}
              />

              {/* Progress steps */}
              <div className="relative">
                <div className="flex justify-between items-center relative z-10">
                  {steps.map((step, idx) => {
                    const Icon = statusIcons[step];
                    const done = idx <= currentStepIndex;
                    const current = idx === currentStepIndex;
                    return (
                      <div key={step} className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            done ? 'bg-primary text-primary-foreground' : 'bg-white/20 text-white/60'
                          } ${current ? 'ring-4 ring-primary/40' : ''}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-xs mt-2 capitalize ${done ? 'text-white font-medium' : 'text-white/50'}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-white/20 -z-0">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.max(0, (currentStepIndex / (steps.length - 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Updates timeline */}
              <div>
                <h3 className="text-white font-medium mb-3">Tracking Updates</h3>
                {updates.length === 0 ? (
                  <p className="text-white/60 text-sm py-4 text-center bg-white/5 rounded-lg">
                    No updates yet. We'll post here as your order moves.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {updates.map((u, idx) => (
                      <div key={u.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-white/40'}`} />
                          {idx < updates.length - 1 && <div className="w-0.5 flex-1 bg-white/20 my-1" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-white font-medium text-sm capitalize">{u.status.replace('_', ' ')}</p>
                          {u.description && <p className="text-white/70 text-sm">{u.description}</p>}
                          {u.location && (
                            <p className="text-white/60 text-xs flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {u.location}
                            </p>
                          )}
                          <p className="text-white/50 text-xs mt-1">{new Date(u.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivery target */}
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-white/70 text-sm">Delivering to</p>
                <p className="text-white font-medium">
                  {order.full_name} — {destination}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!order && !error && !loading && !searched && (
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="py-8 text-center text-white/70">
              <Package className="mx-auto h-12 w-12 mb-3 text-white/40" />
              <p>Your tracking code looks like <span className="font-mono text-white">CS-XXXXXXXX</span></p>
              <p className="text-sm mt-1">It was sent in your order confirmation.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AnimatedBackground>
  );
};

export default Track;
