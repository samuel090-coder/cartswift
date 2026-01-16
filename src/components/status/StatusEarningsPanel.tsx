import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, Eye, Heart, TrendingUp, Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const StatusEarningsPanel = () => {
  const { user } = useAuth();

  // Fetch earnings summary
  const { data: earnings = [], isLoading } = useQuery({
    queryKey: ['status-earnings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_earnings')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch profile for total earnings
  const { data: profile } = useQuery({
    queryKey: ['profile-earnings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('total_status_earnings')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const totalEarnings = profile?.total_status_earnings || 0;
  const viewEarnings = earnings.filter(e => e.earning_type === 'view').reduce((acc, e) => acc + Number(e.amount), 0);
  const reactionEarnings = earnings.filter(e => e.earning_type === 'reaction').reduce((acc, e) => acc + Number(e.amount), 0);
  const totalViews = earnings.filter(e => e.earning_type === 'view').length;
  const totalReactions = earnings.filter(e => e.earning_type === 'reaction').length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-500">${totalEarnings.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">Total Earnings</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-primary/20 to-pink-vibrant/20 border-primary/30">
          <CardContent className="p-4 text-center">
            <Wallet className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold text-primary">${(viewEarnings + reactionEarnings).toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">This Period</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Earnings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Views</p>
                  <p className="text-xs text-muted-foreground">{totalViews} total × $0.023 each</p>
                </div>
              </div>
              <p className="text-lg font-bold text-blue-500">${viewEarnings.toFixed(4)}</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                <div>
                  <p className="text-sm font-medium">Reactions</p>
                  <p className="text-xs text-muted-foreground">{totalReactions} total × $0.002 each</p>
                </div>
              </div>
              <p className="text-lg font-bold text-pink-500">${reactionEarnings.toFixed(4)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Earnings */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {earnings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No earnings yet. Start posting statuses to earn!
              </p>
            ) : (
              <div className="space-y-2">
                {earnings.slice(0, 20).map((earning: any) => (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      {earning.earning_type === 'view' ? (
                        <Eye className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Heart className="w-4 h-4 text-pink-500" />
                      )}
                      <div>
                        <p className="text-sm capitalize">{earning.earning_type}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(earning.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={earning.earning_type === 'view' ? 'bg-blue-500/20 text-blue-500' : 'bg-pink-500/20 text-pink-500'}
                    >
                      +${Number(earning.amount).toFixed(4)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatusEarningsPanel;
