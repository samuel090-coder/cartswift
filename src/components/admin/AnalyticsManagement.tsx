
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, Eye, DollarSign, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';

const AnalyticsManagement = () => {
  const [visitorStats, setVisitorStats] = useState({
    todayVisitors: 0,
    yesterdayVisitors: 0,
    totalVisitors: 0,
    recentIPs: [] as Array<{ ip: string; country: string; visits: number; lastVisit: string }>
  });

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

  // Simulate visitor data (in a real app, you'd track this server-side)
  useEffect(() => {
    const generateMockVisitorData = () => {
      const countries = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR'];
      const mockIPs = Array.from({ length: 15 }, (_, i) => ({
        ip: `192.168.1.${100 + i}`,
        country: countries[Math.floor(Math.random() * countries.length)],
        visits: Math.floor(Math.random() * 10) + 1,
        lastVisit: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
      }));
      
      setVisitorStats({
        todayVisitors: Math.floor(Math.random() * 500) + 100,
        yesterdayVisitors: Math.floor(Math.random() * 400) + 80,
        totalVisitors: Math.floor(Math.random() * 5000) + 1000,
        recentIPs: mockIPs
      });
    };
    
    generateMockVisitorData();
  }, []);

  const getFlagEmoji = (countryCode: string) => {
    const flags: { [key: string]: string } = {
      'US': '🇺🇸', 'UK': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺',
      'DE': '🇩🇪', 'FR': '🇫🇷', 'JP': '🇯🇵', 'BR': '🇧🇷'
    };
    return flags[countryCode] || '🌍';
  };

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
            <CardTitle className="text-sm font-medium">Today's Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorStats.todayVisitors}</div>
            <p className="text-xs text-muted-foreground">
              vs {visitorStats.yesterdayVisitors} yesterday
            </p>
          </CardContent>
        </Card>

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
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorStats.totalVisitors}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Visitors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Visitors by IP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Last Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitorStats.recentIPs.slice(0, 10).map((visitor, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{visitor.ip}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getFlagEmoji(visitor.country)}</span>
                        <span>{visitor.country}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{visitor.visits}</Badge>
                    </TableCell>
                    <TableCell>{new Date(visitor.lastVisit).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
                {itemViews?.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.views}</Badge>
                    </TableCell>
                  </TableRow>
                )) || (
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
    </div>
  );
};

export default AnalyticsManagement;
