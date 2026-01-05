import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';

interface OrderTrackingProps {
  orderId: string;
}

const statusIcons: Record<string, any> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
};

const OrderTracking = ({ orderId }: OrderTrackingProps) => {
  // Fetch order
  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch tracking updates
  const { data: trackingUpdates = [] } = useQuery({
    queryKey: ['order-tracking', orderId],
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

  if (!order) return null;

  const StatusIcon = statusIcons[order.status] || Clock;
  const steps = ['pending', 'processing', 'shipped', 'delivered'];
  const currentStepIndex = steps.indexOf(order.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Order Tracking</CardTitle>
          <Badge className={statusColors[order.status]}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Order #{orderId.slice(0, 8)}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between relative">
          {steps.map((step, index) => {
            const Icon = statusIcons[step];
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step} className="flex flex-col items-center z-10">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs mt-2 capitalize ${isCompleted ? 'font-medium' : 'text-muted-foreground'}`}>
                  {step}
                </span>
              </div>
            );
          })}
          
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Estimated Delivery */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Estimated Delivery</p>
            <p className="text-lg font-bold">
              {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        )}

        {/* Tracking Updates */}
        {trackingUpdates.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Tracking Updates</h4>
            <div className="space-y-3">
              {trackingUpdates.map((update: any, index: number) => (
                <div key={update.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted'}`} />
                    {index < trackingUpdates.length - 1 && (
                      <div className="w-0.5 h-full bg-muted my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="font-medium text-sm">{update.description}</p>
                    {update.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {update.location}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(update.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shipping Address */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-1">Shipping Address</p>
          <p className="text-sm text-muted-foreground">
            {order.full_name}<br />
            {order.address_line1}<br />
            {order.address_line2 && <>{order.address_line2}<br /></>}
            {order.city}, {order.state} {order.postal_code}<br />
            {order.country}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderTracking;
