import { useQuery } from '@tanstack/react-query';
import { Crown, Gift, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

const LoyaltyPointsDisplay = () => {
  const sessionId = sessionStorage.getItem('sessionId') || '';
  const userEmail = localStorage.getItem('userEmail') || '';

  const { data: pointsData } = useQuery({
    queryKey: ['loyalty-points', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .or(`session_id.eq.${sessionId},email.eq.${userEmail}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalEarned = data.reduce((sum, record) => sum + record.points_earned, 0);
      const totalSpent = data.reduce((sum, record) => sum + record.points_spent, 0);
      const currentBalance = totalEarned - totalSpent;

      return {
        records: data,
        totalEarned,
        totalSpent,
        currentBalance
      };
    }
  });

  const getTier = (points: number) => {
    if (points >= 1000) return { name: 'VIP', icon: Crown, color: 'text-yellow-600' };
    if (points >= 500) return { name: 'Gold', icon: Star, color: 'text-yellow-500' };
    if (points >= 100) return { name: 'Silver', icon: Gift, color: 'text-gray-500' };
    return { name: 'Bronze', icon: Gift, color: 'text-orange-600' };
  };

  const pointsEarningMethods = [
    { action: 'Purchase', points: '1 point per $1' },
    { action: 'Write Review', points: '10 points' },
    { action: 'Social Share', points: '5 points' },
    { action: 'Referral Success', points: '50 points' }
  ];

  if (!pointsData) {
    return (
      <Card className="w-full animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </CardContent>
      </Card>
    );
  }

  const tier = getTier(pointsData.totalEarned);
  const TierIcon = tier.icon;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Loyalty Points</CardTitle>
          <Badge variant="outline" className={`gap-1 ${tier.color}`}>
            <TierIcon size={14} />
            {tier.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{pointsData.currentBalance}</div>
            <div className="text-xs text-muted-foreground">Available</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{pointsData.totalEarned}</div>
            <div className="text-xs text-muted-foreground">Total Earned</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{pointsData.totalSpent}</div>
            <div className="text-xs text-muted-foreground">Total Spent</div>
          </div>
        </div>

        <div className="border-t pt-3">
          <h4 className="text-sm font-medium mb-2">Earn Points By:</h4>
          <div className="space-y-1">
            {pointsEarningMethods.map((method) => (
              <div key={method.action} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{method.action}</span>
                <span className="font-medium">{method.points}</span>
              </div>
            ))}
          </div>
        </div>

        {pointsData.currentBalance >= 100 && (
          <div className="bg-green-50 p-3 rounded-lg text-center border border-green-200">
            <p className="text-sm text-green-800 font-medium">
              🎉 You have {pointsData.currentBalance} points!
            </p>
            <p className="text-xs text-green-600 mt-1">
              Use them as discount on your next order
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltyPointsDisplay;