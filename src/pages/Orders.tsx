import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Package, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import Header from '@/components/Header';
import AnimatedBackground from '@/components/AnimatedBackground';

const Orders = () => {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['apk-file-orders'],
    queryFn: async () => {
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
              file_url
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter to only show orders with APK/File items
      return data.filter(order => 
        order.order_items?.some((oi: any) => 
          oi.items?.item_type === 'apk' || oi.items?.item_type === 'file'
        )
      );
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
        <h1 className="text-4xl font-bold text-white mb-8">APK/File Orders</h1>
        
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
              const apkFileItems = order.order_items?.filter((oi: any) => 
                oi.items?.item_type === 'apk' || oi.items?.item_type === 'file'
              ) || [];

              return (
                <Card key={order.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white mb-2">
                          Order #{order.id.slice(0, 8)}
                        </CardTitle>
                        <p className="text-white/60 text-sm">
                          {format(new Date(order.created_at), 'PPP p')}
                        </p>
                      </div>
                      <Badge variant={
                        order.status === 'completed' ? 'default' :
                        order.status === 'processing' ? 'secondary' :
                        'outline'
                      }>
                        {order.status}
                      </Badge>
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
                      {apkFileItems.map((orderItem: any) => (
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
