import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Smartphone, Monitor, Globe, Clock, Eye, MapPin } from 'lucide-react';

export const VisitorAnalytics = () => {
  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ['site-visitors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_visitors')
        .select('*')
        .order('last_visit', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate stats
  const stats = {
    totalVisitors: visitors.length,
    todayVisitors: visitors.filter(v => 
      new Date(v.last_visit).toDateString() === new Date().toDateString()
    ).length,
    mobileUsers: visitors.filter(v => v.device_type === 'Mobile').length,
    desktopUsers: visitors.filter(v => v.device_type === 'Desktop').length,
    avgVisits: visitors.length > 0 
      ? (visitors.reduce((sum, v) => sum + v.visit_count, 0) / visitors.length).toFixed(1)
      : 0,
    consentRate: visitors.length > 0
      ? ((visitors.filter(v => v.cookie_consent_given).length / visitors.length) * 100).toFixed(1)
      : 0,
  };

  // Device breakdown
  const deviceBreakdown = visitors.reduce((acc: Record<string, number>, v) => {
    const device = v.device_type || 'Unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {});

  // Browser breakdown
  const browserBreakdown = visitors.reduce((acc: Record<string, number>, v) => {
    const browser = v.browser || 'Unknown';
    acc[browser] = (acc[browser] || 0) + 1;
    return acc;
  }, {});

  // OS breakdown
  const osBreakdown = visitors.reduce((acc: Record<string, number>, v) => {
    const os = v.operating_system || 'Unknown';
    acc[os] = (acc[os] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisitors}</div>
            <p className="text-xs text-muted-foreground">All time unique visitors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visitors</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayVisitors}</div>
            <p className="text-xs text-muted-foreground">Active today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Visits</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgVisits}</div>
            <p className="text-xs text-muted-foreground">Per visitor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cookie Consent</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consentRate}%</div>
            <p className="text-xs text-muted-foreground">Acceptance rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Device & Browser Stats */}
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
              {Object.entries(deviceBreakdown).length > 0 ? (
                Object.entries(deviceBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .map(([device, count]) => (
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
              {Object.entries(browserBreakdown).length > 0 ? (
                Object.entries(browserBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([browser, count]) => (
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
              <MapPin className="h-4 w-4" />
              Operating Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(osBreakdown).length > 0 ? (
                Object.entries(osBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([os, count]) => (
                    <div key={os} className="flex justify-between items-center">
                      <span className="text-sm">{os}</span>
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

      {/* Recent Visitors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Visitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor ID</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>First Visit</TableHead>
                  <TableHead>Last Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitors.length > 0 ? (
                  visitors.slice(0, 20).map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="font-mono text-xs max-w-[100px] truncate">
                        {visitor.visitor_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {visitor.device_type === 'Mobile' ? (
                            <Smartphone className="h-3 w-3" />
                          ) : (
                            <Monitor className="h-3 w-3" />
                          )}
                          <span className="text-xs">{visitor.device_type || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{visitor.browser || 'Unknown'}</TableCell>
                      <TableCell className="text-xs">{visitor.operating_system || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{visitor.visit_count}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(visitor.first_visit).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(visitor.last_visit).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No visitors tracked yet. Visitors will appear here once they accept cookies.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};