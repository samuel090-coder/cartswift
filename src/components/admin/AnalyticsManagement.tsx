import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, Eye, DollarSign, Smartphone, Monitor, Globe, Link2 } from 'lucide-react';

// Helper function to parse user agent
const parseUserAgent = (ua: string) => {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  
  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';
  
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('iPhone')) os = 'iOS';
  else if (ua.includes('iPad')) os = 'iPadOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';
  
  return {
    device: isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop',
    browser,
    os
  };
};

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

  // Fetch share page visits with device info
  const { data: shareVisits } = useQuery({
    queryKey: ['share-visits-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('share_analytics')
        .select('*, items:item_id(title)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Process device stats
  const deviceStats = shareVisits?.reduce((acc: any, visit: any) => {
    if (visit.user_agent) {
      const parsed = parseUserAgent(visit.user_agent);
      acc.devices[parsed.device] = (acc.devices[parsed.device] || 0) + 1;
      acc.browsers[parsed.browser] = (acc.browsers[parsed.browser] || 0) + 1;
      acc.os[parsed.os] = (acc.os[parsed.os] || 0) + 1;
    }
    if (visit.referrer) {
      try {
        const hostname = new URL(visit.referrer).hostname;
        acc.referrers[hostname] = (acc.referrers[hostname] || 0) + 1;
      } catch {
        acc.referrers['Direct'] = (acc.referrers['Direct'] || 0) + 1;
      }
    } else {
      acc.referrers['Direct'] = (acc.referrers['Direct'] || 0) + 1;
    }
    return acc;
  }, { devices: {}, browsers: {}, os: {}, referrers: {} }) || { devices: {}, browsers: {}, os: {}, referrers: {} };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              Total: ${orderStats?.totalRevenue?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Share Page Visits</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shareVisits?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Last 100 visits</p>
          </CardContent>
        </Card>
      </div>

      {/* Device Analytics */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4" />
              Device Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(deviceStats.devices).length > 0 ? (
                Object.entries(deviceStats.devices)
                  .sort(([,a]: any, [,b]: any) => b - a)
                  .map(([device, count]: any) => (
                    <div key={device} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {device === 'Mobile' && <Smartphone className="h-4 w-4 text-blue-500" />}
                        {device === 'Desktop' && <Monitor className="h-4 w-4 text-green-500" />}
                        {device === 'Tablet' && <Monitor className="h-4 w-4 text-purple-500" />}
                        <span className="text-sm">{device}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Browsers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(deviceStats.browsers).length > 0 ? (
                Object.entries(deviceStats.browsers)
                  .sort(([,a]: any, [,b]: any) => b - a)
                  .slice(0, 5)
                  .map(([browser, count]: any) => (
                    <div key={browser} className="flex justify-between items-center">
                      <span className="text-sm">{browser}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              Traffic Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(deviceStats.referrers).length > 0 ? (
                Object.entries(deviceStats.referrers)
                  .sort(([,a]: any, [,b]: any) => b - a)
                  .slice(0, 5)
                  .map(([source, count]: any) => (
                    <div key={source} className="flex justify-between items-center">
                      <span className="text-sm truncate max-w-[120px]">{source}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Share Page Visits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Recent Share Page Visits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shareVisits && shareVisits.length > 0 ? (
                  shareVisits.slice(0, 20).map((visit: any) => {
                    const parsed = visit.user_agent ? parseUserAgent(visit.user_agent) : { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
                    let source = 'Direct';
                    if (visit.referrer) {
                      try { source = new URL(visit.referrer).hostname; } catch { source = 'Direct'; }
                    }
                    return (
                      <TableRow key={visit.id}>
                        <TableCell className="font-medium max-w-[150px] truncate">
                          {visit.items?.title || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={visit.event_type === 'view' ? 'outline' : 'default'} className="text-xs">
                            {visit.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {parsed.device === 'Mobile' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                            <span className="text-xs">{parsed.device}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{parsed.browser}</TableCell>
                        <TableCell className="text-xs truncate max-w-[100px]">{source}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(visit.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No share page visits recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No view data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsManagement;