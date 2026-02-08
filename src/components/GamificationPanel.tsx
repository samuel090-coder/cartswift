import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Star, Gift, Crown, Target, Zap, Medal } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

const achievements = [
  { id: 'first_buy', icon: '🛒', title: 'First Purchase', desc: 'Made your first order', unlocked: true },
  { id: 'reviewer', icon: '⭐', title: 'Reviewer', desc: 'Left 5 reviews', unlocked: true },
  { id: 'sharer', icon: '📤', title: 'Social Butterfly', desc: 'Shared 10 products', unlocked: false, progress: 60 },
  { id: 'loyal', icon: '💎', title: 'Loyal Customer', desc: 'Ordered 10+ times', unlocked: false, progress: 30 },
  { id: 'referrer', icon: '👥', title: 'Top Referrer', desc: 'Referred 5 friends', unlocked: false, progress: 40 },
  { id: 'streak', icon: '🔥', title: '7-Day Streak', desc: 'Logged in 7 days straight', unlocked: false, progress: 85 },
];

const loyaltyTiers = [
  { name: 'Bronze', icon: Medal, color: 'text-orange-400', bg: 'bg-orange-400/10', min: 0, max: 500 },
  { name: 'Silver', icon: Star, color: 'text-gray-300', bg: 'bg-gray-300/10', min: 500, max: 2000 },
  { name: 'Gold', icon: Crown, color: 'text-neon-amber', bg: 'bg-neon-amber/10', min: 2000, max: 5000 },
  { name: 'Platinum', icon: Trophy, color: 'text-neon-cyan', bg: 'bg-neon-cyan/10', min: 5000, max: 99999 },
];

interface GamificationPanelProps {
  currentPoints?: number;
  loginStreak?: number;
}

const GamificationPanel = ({ currentPoints = 350, loginStreak = 3 }: GamificationPanelProps) => {
  const currentTier = loyaltyTiers.find(t => currentPoints >= t.min && currentPoints < t.max) || loyaltyTiers[0];
  const nextTier = loyaltyTiers[loyaltyTiers.indexOf(currentTier) + 1];
  const tierProgress = nextTier ? ((currentPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100 : 100;

  return (
    <div className="space-y-4">
      {/* Daily Login Reward */}
      <Card className="bg-card border-border/50 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-neon-amber" />
              <span className="font-bold text-foreground">Daily Rewards</span>
            </div>
            <Badge className="bg-neon-amber/20 text-neon-amber border-none text-xs gap-1">
              <Flame className="h-3 w-3" /> {loginStreak} day streak
            </Badge>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[1,2,3,4,5,6,7].map(day => (
              <div key={day} className={`flex-shrink-0 w-10 h-12 rounded-lg flex flex-col items-center justify-center text-xs border transition-all ${
                day <= loginStreak 
                  ? 'bg-primary/20 border-primary/40 text-primary' 
                  : day === loginStreak + 1 
                    ? 'bg-neon-amber/10 border-neon-amber/30 text-neon-amber animate-pulse'
                    : 'bg-secondary/30 border-border/30 text-muted-foreground'
              }`}>
                <Gift className="h-3 w-3 mb-0.5" />
                <span className="font-bold">{day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tier Progress */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <currentTier.icon className={`h-5 w-5 ${currentTier.color}`} />
              <span className="font-bold text-foreground">{currentTier.name} Member</span>
            </div>
            <span className="text-sm font-bold text-primary">{currentPoints} pts</span>
          </div>
          {nextTier && (
            <>
              <Progress value={tierProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {nextTier.min - currentPoints} more points to reach <span className={nextTier.color}>{nextTier.name}</span>
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Achievements */}
      <div>
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-neon-amber" /> Achievements
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`border-border/40 ${a.unlocked ? 'bg-card' : 'bg-secondary/30 opacity-70'}`}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{a.icon}</span>
                    <span className="text-xs font-semibold text-foreground">{a.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                  {!a.unlocked && a.progress && (
                    <Progress value={a.progress} className="h-1" />
                  )}
                  {a.unlocked && (
                    <Badge className="text-[9px] bg-neon-emerald/20 text-neon-emerald border-none">✓ Unlocked</Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GamificationPanel;
