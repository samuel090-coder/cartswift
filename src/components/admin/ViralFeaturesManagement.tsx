import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Zap, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Gift,
  Star,
  Share2,
  Heart,
  ShoppingBag,
  Eye
} from 'lucide-react';

const ViralFeaturesManagement = () => {
  const [selectedTab, setSelectedTab] = useState('flash-sales');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Flash Sales Management
  const { data: flashSales = [] } = useQuery({
    queryKey: ['admin-flash-sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flash_sales')
        .select(`
          *,
          items:items(title, price, images)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Analytics Data
  const { data: analytics } = useQuery({
    queryKey: ['viral-analytics'],
    queryFn: async () => {
      const [
        { data: socialShares, error: sharesError },
        { data: reviews, error: reviewsError },
        { data: wishlists, error: wishlistsError },
        { data: referrals, error: referralsError },
        { data: loyaltyPoints, error: pointsError }
      ] = await Promise.all([
        supabase.from('social_shares').select('*'),
        supabase.from('reviews').select('*'),
        supabase.from('wishlists').select('*'),
        supabase.from('referrals').select('*'),
        supabase.from('loyalty_points').select('*')
      ]);

      if (sharesError || reviewsError || wishlistsError || referralsError || pointsError) {
        throw new Error('Failed to fetch analytics');
      }

      return {
        socialShares: socialShares || [],
        reviews: reviews || [],
        wishlists: wishlists || [],
        referrals: referrals || [],
        loyaltyPoints: loyaltyPoints || []
      };
    }
  });

  // Items for dropdowns
  const { data: items = [] } = useQuery({
    queryKey: ['admin-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, title, price')
        .order('title');
      if (error) throw error;
      return data;
    }
  });

  const [flashSaleForm, setFlashSaleForm] = useState({
    item_id: '',
    original_price: '',
    sale_price: '',
    starts_at: '',
    ends_at: '',
    max_quantity: ''
  });

  const createFlashSale = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('flash_sales')
        .insert({
          item_id: flashSaleForm.item_id,
          original_price: Number(flashSaleForm.original_price),
          sale_price: Number(flashSaleForm.sale_price),
          starts_at: flashSaleForm.starts_at,
          ends_at: flashSaleForm.ends_at,
          max_quantity: flashSaleForm.max_quantity ? Number(flashSaleForm.max_quantity) : null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] });
      setIsCreateDialogOpen(false);
      setFlashSaleForm({
        item_id: '',
        original_price: '',
        sale_price: '',
        starts_at: '',
        ends_at: '',
        max_quantity: ''
      });
      toast.success('Flash sale created successfully!');
    },
    onError: () => {
      toast.error('Failed to create flash sale');
    }
  });

  const getAnalyticsStats = () => {
    if (!analytics) return {};

    const totalShares = analytics.socialShares.length;
    const totalReviews = analytics.reviews.length;
    const totalWishlists = analytics.wishlists.length;
    const totalReferrals = analytics.referrals.length;
    const totalPoints = analytics.loyaltyPoints.reduce((sum, p) => sum + p.points_earned, 0);
    const completedReferrals = analytics.referrals.filter(r => r.status === 'completed').length;

    return {
      totalShares,
      totalReviews,
      totalWishlists,
      totalReferrals,
      completedReferrals,
      totalPoints
    };
  };

  const stats = getAnalyticsStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Viral Features Management</h2>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="flash-sales">Flash Sales</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="flash-sales" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Flash Sales</h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Zap size={16} />
                  Create Flash Sale
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Flash Sale</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Product</Label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={flashSaleForm.item_id}
                      onChange={(e) => setFlashSaleForm(prev => ({ ...prev, item_id: e.target.value }))}
                    >
                      <option value="">Select a product</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.title} - ${Number(item.price).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Original Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={flashSaleForm.original_price}
                        onChange={(e) => setFlashSaleForm(prev => ({ ...prev, original_price: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Sale Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={flashSaleForm.sale_price}
                        onChange={(e) => setFlashSaleForm(prev => ({ ...prev, sale_price: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Starts At</Label>
                      <Input
                        type="datetime-local"
                        value={flashSaleForm.starts_at}
                        onChange={(e) => setFlashSaleForm(prev => ({ ...prev, starts_at: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Ends At</Label>
                      <Input
                        type="datetime-local"
                        value={flashSaleForm.ends_at}
                        onChange={(e) => setFlashSaleForm(prev => ({ ...prev, ends_at: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Max Quantity (optional)</Label>
                    <Input
                      type="number"
                      value={flashSaleForm.max_quantity}
                      onChange={(e) => setFlashSaleForm(prev => ({ ...prev, max_quantity: e.target.value }))}
                    />
                  </div>
                  
                  <Button 
                    onClick={() => createFlashSale.mutate()}
                    disabled={createFlashSale.isPending}
                    className="w-full"
                  >
                    {createFlashSale.isPending ? 'Creating...' : 'Create Flash Sale'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {flashSales.map((sale) => (
              <Card key={sale.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={sale.items?.images?.[0] || '/placeholder.svg'}
                        alt={sale.items?.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div>
                        <h4 className="font-semibold">{sale.items?.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-red-600">
                            ${Number(sale.sale_price).toFixed(2)}
                          </span>
                          <span className="text-sm line-through text-gray-500">
                            ${Number(sale.original_price).toFixed(2)}
                          </span>
                          <Badge variant="destructive">
                            -{Math.round(((Number(sale.original_price) - Number(sale.sale_price)) / Number(sale.original_price)) * 100)}%
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(sale.starts_at).toLocaleDateString()} - {new Date(sale.ends_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={sale.is_active ? 'default' : 'secondary'}>
                        {sale.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {sale.max_quantity && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {sale.sold_quantity}/{sale.max_quantity} sold
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Share2 className="mx-auto mb-2 text-blue-600" size={24} />
                <div className="text-2xl font-bold">{stats.totalShares || 0}</div>
                <div className="text-xs text-muted-foreground">Social Shares</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Star className="mx-auto mb-2 text-yellow-600" size={24} />
                <div className="text-2xl font-bold">{stats.totalReviews || 0}</div>
                <div className="text-xs text-muted-foreground">Reviews</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Heart className="mx-auto mb-2 text-red-600" size={24} />
                <div className="text-2xl font-bold">{stats.totalWishlists || 0}</div>
                <div className="text-xs text-muted-foreground">Wishlisted</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="mx-auto mb-2 text-green-600" size={24} />
                <div className="text-2xl font-bold">{stats.completedReferrals || 0}</div>
                <div className="text-xs text-muted-foreground">Referrals</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Gift className="mx-auto mb-2 text-purple-600" size={24} />
                <div className="text-2xl font-bold">{stats.totalPoints || 0}</div>
                <div className="text-xs text-muted-foreground">Points Earned</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="mx-auto mb-2 text-indigo-600" size={24} />
                <div className="text-2xl font-bold">
                  {Math.round(((stats.totalShares || 0) + (stats.totalReviews || 0) + (stats.totalWishlists || 0)) / 3)}
                </div>
                <div className="text-xs text-muted-foreground">Engagement</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <div className="text-center p-6">
            <Star className="mx-auto mb-2 text-gray-400" size={48} />
            <p className="text-muted-foreground">Reviews management coming soon!</p>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <div className="text-center p-6">
            <Users className="mx-auto mb-2 text-gray-400" size={48} />
            <p className="text-muted-foreground">Referrals management coming soon!</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ViralFeaturesManagement;