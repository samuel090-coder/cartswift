import { useQuery } from '@tanstack/react-query';
import { createSessionSupabaseClient, getSessionId } from '@/lib/sessionSupabase';

const supabase = createSessionSupabaseClient();
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Package, CreditCard, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import AnimatedBackground from '@/components/AnimatedBackground';

const Orders = () => {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const sessionId = getSessionId();
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            items (
              id,
              title,
              item_type,
              file_url,
              images
            )
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <AnimatedBackground>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white/10 rounded-lg" />
            ))}
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">My Orders</h1>
        
        {orders.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-white/50 mb-4" />
              <p className="text-white/70 text-lg">No APK/File orders yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const allItems = order.order_items || [];

              return (
                <Card key={order.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <div>
                        <CardTitle className="text-white mb-2">
                          Order #{order.id.slice(0, 8)}
                        </CardTitle>
                        <p className="text-white/60 text-sm">
                          {format(new Date(order.created_at), 'PPP p')}
                        </p>
                        {(order as any).tracking_code && (
                          <p className="text-white/80 text-xs font-mono mt-1">
                            Tracking: {(order as any).tracking_code}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={
                          order.status === 'completed' ? 'default' :
                          order.status === 'processing' ? 'secondary' :
                          'outline'
                        }>
                          {order.status}
                        </Badge>
                        {(order as any).tracking_code && (
                          <Link to={`/track?code=${(order as any).tracking_code}`}>
                            <Button size="sm" variant="outline" className="gap-1">
                              <Truck className="h-3 w-3" /> Track
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer Info */}
                    <div className="flex items-center gap-2 text-white">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">{order.email || 'No email provided'}</span>
                      {order.email && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `mailto:${order.email}`}
                          className="ml-auto"
                        >
                          Contact
                        </Button>
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      <p className="text-white/80 font-medium">Items:</p>
                      {allItems.map((orderItem: any) => (
                        <div key={orderItem.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-white font-medium">{orderItem.items?.title}</p>
                            <p className="text-white/60 text-sm">
                              Type: {orderItem.items?.item_type?.toUpperCase()}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            Qty: {orderItem.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* Payment Method */}
                    <div className="flex items-center gap-2 text-white/80">
                      <CreditCard className="h-4 w-4" />
                      <span>Payment: <span className="font-medium">{order.payment_method}</span></span>
                    </div>

                    {/* Total */}
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex justify-between items-center text-white">
                        <span className="font-medium">Total:</span>
                        <span className="text-xl font-bold">${order.total_amount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AnimatedBackground>
  );
};

export default Orders;
