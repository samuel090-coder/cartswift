import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Users, Package, DollarSign, CheckCircle, XCircle, Eye, Store, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Seller {
  id: string;
  full_name: string | null;
  email: string | null;
  store_name: string | null;
  store_description: string | null;
  is_seller: boolean | null;
  seller_verified: boolean | null;
  total_sales: number | null;
  seller_rating: number | null;
  created_at: string | null;
}

interface SellerProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  is_approved: boolean | null;
  is_featured: boolean | null;
  stock_quantity: number;
  commission_rate: number | null;
  images: string[] | null;
  seller_id: string;
  created_at: string;
}

interface SellerOrder {
  id: string;
  seller_id: string;
  seller_product_id: string;
  buyer_email: string | null;
  quantity: number;
  price_at_purchase: number;
  seller_earnings: number;
  commission_amount: number;
  status: string;
  created_at: string;
}

const SellerManagement = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [stats, setStats] = useState({
    totalSellers: 0,
    verifiedSellers: 0,
    pendingProducts: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sellers (profiles with is_seller = true)
      const { data: sellersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_seller', true)
        .order('created_at', { ascending: false });

      // Fetch seller products
      const { data: productsData } = await supabase
        .from('seller_products')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch seller orders
      const { data: ordersData } = await supabase
        .from('seller_orders')
        .select('*')
        .order('created_at', { ascending: false });

      setSellers(sellersData || []);
      setProducts(productsData || []);
      setOrders(ordersData || []);

      // Calculate stats
      const verifiedCount = (sellersData || []).filter(s => s.seller_verified).length;
      const pendingCount = (productsData || []).filter(p => !p.is_approved).length;
      const totalComm = (ordersData || []).reduce((sum, o) => sum + o.commission_amount, 0);

      setStats({
        totalSellers: sellersData?.length || 0,
        verifiedSellers: verifiedCount,
        pendingProducts: pendingCount,
        totalCommission: totalComm,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch seller data');
    } finally {
      setLoading(false);
    }
  };

  const verifySeller = async (sellerId: string, verify: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ seller_verified: verify })
      .eq('id', sellerId);

    if (error) {
      toast.error('Failed to update seller status');
    } else {
      toast.success(verify ? 'Seller verified!' : 'Seller verification removed');
      fetchData();
    }
  };

  const approveProduct = async (productId: string, approve: boolean) => {
    const { error } = await supabase
      .from('seller_products')
      .update({ is_approved: approve })
      .eq('id', productId);

    if (error) {
      toast.error('Failed to update product status');
    } else {
      toast.success(approve ? 'Product approved!' : 'Product rejected');
      fetchData();
    }
  };

  const toggleFeatured = async (productId: string, featured: boolean) => {
    const { error } = await supabase
      .from('seller_products')
      .update({ is_featured: featured })
      .eq('id', productId);

    if (error) {
      toast.error('Failed to update featured status');
    } else {
      toast.success(featured ? 'Product featured!' : 'Product unfeatured');
      fetchData();
    }
  };

  const getSellerProducts = (sellerId: string) => products.filter(p => p.seller_id === sellerId);
  const getSellerOrders = (sellerId: string) => orders.filter(o => o.seller_id === sellerId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-400/70 text-sm">Total Sellers</p>
                <p className="text-2xl font-bold text-amber-300">{stats.totalSellers}</p>
              </div>
              <Users className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400/70 text-sm">Verified Sellers</p>
                <p className="text-2xl font-bold text-green-300">{stats.verifiedSellers}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-400/70 text-sm">Pending Approval</p>
                <p className="text-2xl font-bold text-orange-300">{stats.pendingProducts}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400/70 text-sm">Total Commission</p>
                <p className="text-2xl font-bold text-emerald-300">${stats.totalCommission.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sellers" className="space-y-4">
        <TabsList className="bg-slate-800/50 border-amber-500/20">
          <TabsTrigger value="sellers" className="data-[state=active]:bg-amber-600">
            <Store className="w-4 h-4 mr-2" />
            Sellers
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-amber-600">
            <Package className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="commissions" className="data-[state=active]:bg-amber-600">
            <TrendingUp className="w-4 h-4 mr-2" />
            Commissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sellers">
          <Card className="bg-slate-800/50 border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-amber-300">Registered Sellers</CardTitle>
              <CardDescription className="text-slate-400">
                Manage seller accounts and verifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-500/20">
                    <TableHead className="text-amber-400">Seller</TableHead>
                    <TableHead className="text-amber-400">Store</TableHead>
                    <TableHead className="text-amber-400">Products</TableHead>
                    <TableHead className="text-amber-400">Sales</TableHead>
                    <TableHead className="text-amber-400">Status</TableHead>
                    <TableHead className="text-amber-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.map((seller) => (
                    <TableRow key={seller.id} className="border-amber-500/10">
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-200">{seller.full_name || 'N/A'}</p>
                          <p className="text-sm text-slate-400">{seller.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{seller.store_name || 'Not set'}</TableCell>
                      <TableCell className="text-slate-300">{getSellerProducts(seller.id).length}</TableCell>
                      <TableCell className="text-slate-300">${seller.total_sales || 0}</TableCell>
                      <TableCell>
                        {seller.seller_verified ? (
                          <Badge className="bg-green-500/20 text-green-400">Verified</Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-amber-500/30"
                                onClick={() => setSelectedSeller(seller)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-900 border-amber-500/30 max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-amber-300">Seller Details</DialogTitle>
                              </DialogHeader>
                              {selectedSeller && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-slate-400">Name</p>
                                      <p className="text-slate-200">{selectedSeller.full_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-slate-400">Email</p>
                                      <p className="text-slate-200">{selectedSeller.email}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-slate-400">Store Name</p>
                                      <p className="text-slate-200">{selectedSeller.store_name || 'Not set'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-slate-400">Rating</p>
                                      <p className="text-slate-200">{selectedSeller.seller_rating || 0}/5</p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-slate-400">Store Description</p>
                                    <p className="text-slate-200">{selectedSeller.store_description || 'No description'}</p>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {seller.seller_verified ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                              onClick={() => verifySeller(seller.id, false)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => verifySeller(seller.id, true)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sellers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                        No sellers registered yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card className="bg-slate-800/50 border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-amber-300">Seller Products</CardTitle>
              <CardDescription className="text-slate-400">
                Approve or reject seller product listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-500/20">
                    <TableHead className="text-amber-400">Product</TableHead>
                    <TableHead className="text-amber-400">Category</TableHead>
                    <TableHead className="text-amber-400">Price</TableHead>
                    <TableHead className="text-amber-400">Stock</TableHead>
                    <TableHead className="text-amber-400">Commission</TableHead>
                    <TableHead className="text-amber-400">Status</TableHead>
                    <TableHead className="text-amber-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="border-amber-500/10">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.images?.[0] && (
                            <img 
                              src={product.images[0]} 
                              alt={product.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <span className="text-slate-200">{product.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{product.category}</TableCell>
                      <TableCell className="text-slate-300">${product.price}</TableCell>
                      <TableCell className="text-slate-300">{product.stock_quantity}</TableCell>
                      <TableCell className="text-slate-300">{product.commission_rate || 12}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {product.is_approved ? (
                            <Badge className="bg-green-500/20 text-green-400">Approved</Badge>
                          ) : (
                            <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
                          )}
                          {product.is_featured && (
                            <Badge className="bg-purple-500/20 text-purple-400">Featured</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!product.is_approved ? (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => approveProduct(product.id, true)}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-red-500/30 text-red-400"
                                onClick={() => approveProduct(product.id, false)}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className={product.is_featured ? 'border-purple-500/30 text-purple-400' : 'border-amber-500/30 text-amber-400'}
                              onClick={() => toggleFeatured(product.id, !product.is_featured)}
                            >
                              {product.is_featured ? 'Unfeature' : 'Feature'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                        No products listed yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card className="bg-slate-800/50 border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-amber-300">Commission Report</CardTitle>
              <CardDescription className="text-slate-400">
                Track earnings from seller commissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-500/20">
                    <TableHead className="text-amber-400">Order ID</TableHead>
                    <TableHead className="text-amber-400">Date</TableHead>
                    <TableHead className="text-amber-400">Buyer</TableHead>
                    <TableHead className="text-amber-400">Order Amount</TableHead>
                    <TableHead className="text-amber-400">Seller Earnings</TableHead>
                    <TableHead className="text-amber-400">Commission</TableHead>
                    <TableHead className="text-amber-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="border-amber-500/10">
                      <TableCell className="text-slate-300 font-mono text-sm">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-slate-300">{order.buyer_email || 'Anonymous'}</TableCell>
                      <TableCell className="text-slate-300">${order.price_at_purchase * order.quantity}</TableCell>
                      <TableCell className="text-green-400">${order.seller_earnings.toFixed(2)}</TableCell>
                      <TableCell className="text-amber-400">${order.commission_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={
                          order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-slate-500/20 text-slate-400'
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                        No commission data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SellerManagement;