
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, Eye, DollarSign } from 'lucide-react';

const AnalyticsManagement = () => {
  const { data: orderStats } = useQuery({
    queryKey: ['order-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      const todayOrders = data.filter(order => 
        new Date(order.created_at).toDateString() === today
      ).length;
      
      const yesterdayOrders = data.filter(order => 
        new Date(order.created_at).toDateString() === yesterday
      ).length;
      
      const successfulPayments = data.filter(order => 
        order.status === 'delivered' || order.status === 'shipped'
      );
      
      return {
        todayOrders,
        yesterdayOrders,
        totalOrders: data.length,
        successfulPayments: successfulPayments.length,
        totalRevenue: data.reduce((sum, order) => sum + Number(order.total_amount), 0)
      };
    },
  });

  const { data: itemViews } = useQuery({
    queryKey: ['item-analytics'],
    queryFn: async () => {
      const { data: reactions, error } = await supabase
        .from('item_reactions')
        .select(`
          item_id,
          items (title)
        `);
      
      if (error) throw error;
      
      const viewCounts = reactions.reduce((acc: any, reaction: any) => {
        const itemId = reaction.item_id;
        const itemTitle = reaction.items?.title || 'Unknown Item';
        acc[itemId] = {
          title: itemTitle,
          views: (acc[itemId]?.views || 0) + 1
        };
        return acc;
      }, {});
      
      return Object.entries(viewCounts)
        .map(([id, data]: [string, any]) => ({ id, ...data }))
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 10);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
        <div className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats?.todayOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              vs {orderStats?.yesterdayOrders || 0} yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats?.successfulPayments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total revenue: ${orderStats?.totalRevenue?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemViews?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Tracked products</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-1 gap-6">
        {/* Most Viewed Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Most Viewed Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemViews && itemViews.length > 0 ? (
                  itemViews.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.views}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-gray-500">
                      No view data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Note about Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Real visitor tracking (IP addresses, country flags, etc.) requires server-side implementation 
            with proper analytics tools like Google Analytics, server logs, or custom tracking systems. 
            The current setup only tracks product interactions and order data from the database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsManagement;
