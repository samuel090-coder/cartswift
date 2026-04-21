import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, MapPin } from 'lucide-react';

interface Props {
  orderId: string;
  trackingCode?: string | null;
}

const STATUSES = ['pending', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'];

const OrderTrackingManager = ({ orderId, trackingCode }: Props) => {
  const qc = useQueryClient();
  const [status, setStatus] = useState('processing');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const { data: updates = [] } = useQuery({
    queryKey: ['order-tracking-admin', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('order_tracking').insert({
        order_id: orderId,
        status,
        location: location || null,
        description: description || null,
      });
      if (error) throw error;

      // If this update marks the order as live/shipped, email the buyer with map + ETA
      const liveStatuses = ['shipped', 'in_transit', 'out_for_delivery'];
      if (liveStatuses.includes(status)) {
        try {
          const { data: order } = await supabase
            .from('orders')
            .select('email, full_name, address_line1, city, state, country, tracking_code')
            .eq('id', orderId)
            .maybeSingle();
          if (order?.email) {
            // Geocode destination via Nominatim (free OSM)
            const dest = `${order.address_line1 || ''}, ${order.city || ''}, ${order.state || ''}, ${order.country || ''}`;
            let lat: number | null = null, lon: number | null = null, distanceKm: number | null = null, eta = '5-10 days';
            try {
              const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(dest)}`,
                { headers: { 'User-Agent': 'CartSwift/1.0' } }
              );
              const geo = await geoRes.json();
              if (geo?.[0]) {
                lat = parseFloat(geo[0].lat);
                lon = parseFloat(geo[0].lon);
                // Haversine from Miami HQ
                const toRad = (d: number) => (d * Math.PI) / 180;
                const R = 6371;
                const dLat = toRad(lat - 25.7617);
                const dLon = toRad(lon - -80.1918);
                const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(25.7617)) * Math.cos(toRad(lat)) *
                  Math.sin(dLon / 2) ** 2;
                distanceKm = Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
                eta = distanceKm < 1500 ? '2-4 days' : distanceKm < 5000 ? '5-8 days' : distanceKm < 10000 ? '8-14 days' : '12-20 days';
              }
            } catch (e) { console.warn('Geocode failed', e); }

            await supabase.functions.invoke('send-email', {
              body: {
                type: 'order_live',
                userEmail: order.email,
                data: {
                  trackingCode: order.tracking_code,
                  destination: [order.city, order.state, order.country].filter(Boolean).join(', '),
                  status,
                  description: description || null,
                  lat, lon, distanceKm, eta,
                },
              },
            });
          }
        } catch (e) { console.warn('order_live email failed', e); }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-tracking-admin', orderId] });
      setLocation('');
      setDescription('');
      toast({ title: 'Tracking update added' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('order_tracking').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-tracking-admin', orderId] });
      toast({ title: 'Update deleted' });
    },
  });

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Live Tracking Updates</h3>
        {trackingCode && (
          <Badge variant="outline" className="font-mono">
            {trackingCode}
          </Badge>
        )}
      </div>

      {/* Add new update */}
      <div className="space-y-2 p-3 bg-background rounded border">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lagos hub" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Package arrived at sorting facility"
            rows={2}
          />
        </div>
        <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending} size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Update
        </Button>
      </div>

      {/* Existing updates */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {updates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">No updates yet</p>
        ) : (
          updates.map((u: any) => (
            <div key={u.id} className="flex items-start justify-between gap-2 p-2 bg-background rounded border text-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize text-xs">{u.status.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</span>
                </div>
                {u.description && <p className="mt-1">{u.description}</p>}
                {u.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {u.location}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => deleteMutation.mutate(u.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderTrackingManager;
