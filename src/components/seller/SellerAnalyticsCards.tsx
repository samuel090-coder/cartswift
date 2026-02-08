import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Eye, ShoppingBag, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface SellerAnalyticsProps {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  currency?: string;
}

const SellerAnalyticsCards = ({ totalProducts, totalOrders, totalRevenue, currency = 'USD' }: SellerAnalyticsProps) => {
  const getCurrencySymbol = (c: string) => {
    const s: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
    return s[c] || c;
  };

  const stats = [
    {
      title: 'Total Revenue',
      value: `${getCurrencySymbol(currency)}${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      change: '+12.5%',
      positive: true,
      color: 'text-neon-emerald',
      bg: 'bg-neon-emerald/10',
    },
    {
      title: 'Total Orders',
      value: totalOrders.toString(),
      icon: ShoppingBag,
      change: '+8.2%',
      positive: true,
      color: 'text-neon-cyan',
      bg: 'bg-neon-cyan/10',
    },
    {
      title: 'Products',
      value: totalProducts.toString(),
      icon: TrendingUp,
      change: '+3',
      positive: true,
      color: 'text-neon-violet',
      bg: 'bg-neon-violet/10',
    },
    {
      title: 'Store Views',
      value: Math.floor(Math.random() * 5000 + 1000).toLocaleString(),
      icon: Eye,
      change: '+15.3%',
      positive: true,
      color: 'text-neon-amber',
      bg: 'bg-neon-amber/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="bg-card border-border/50 hover:border-primary/30 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <Badge variant="outline" className={`text-[10px] border-none ${stat.positive ? 'text-neon-emerald bg-neon-emerald/10' : 'text-destructive bg-destructive/10'}`}>
                  {stat.positive ? <ArrowUp className="h-3 w-3 mr-0.5" /> : <ArrowDown className="h-3 w-3 mr-0.5" />}
                  {stat.change}
                </Badge>
              </div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default SellerAnalyticsCards;
