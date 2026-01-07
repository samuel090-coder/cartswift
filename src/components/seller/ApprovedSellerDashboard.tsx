import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ArrowLeft, Plus, Package, DollarSign, TrendingUp, Star, Edit, Trash2, 
  Upload, Image, Eye, BarChart3, Settings, ShoppingBag, CreditCard
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const categories = ['Fashion', 'Animals', 'Tools', 'Vehicles', 'Books'] as const;

interface ApprovedSellerDashboardProps {
  application: any;
}

const ApprovedSellerDashboard = ({ application }: ApprovedSellerDashboardProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Fashion' as typeof categories[number],
    stock_quantity: '',
    images: [] as string[],
    newImageUrl: '',
  });

  // Fetch seller's products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['seller-products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_products')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch seller's orders
  const { data: orders = [] } = useQuery({
    queryKey: ['seller-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_orders')
        .select('*, seller_products(title)')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate stats
  const totalEarnings = orders.reduce((sum: number, order: any) => 
    order.status === 'completed' ? sum + Number(order.seller_earnings) : sum, 0);
  const pendingEarnings = orders.reduce((sum: number, order: any) => 
    order.status === 'pending' ? sum + Number(order.seller_earnings) : sum, 0);
  const totalSales = orders.filter((o: any) => o.status === 'completed').length;
  const approvedProducts = products.filter((p: any) => p.is_approved).length;
  const pendingProducts = products.filter((p: any) => !p.is_approved).length;

  // Add product mutation
  const addProduct = useMutation({
    mutationFn: async (productData: typeof formData) => {
      const { error } = await supabase
        .from('seller_products')
        .insert({
          seller_id: user?.id,
          title: productData.title,
          description: productData.description,
          price: parseFloat(productData.price),
          category: productData.category,
          stock_quantity: parseInt(productData.stock_quantity),
          images: productData.images,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Product added! It will be visible after admin approval.');
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to add product'),
  });

  // Update product mutation
  const updateProduct = useMutation({
    mutationFn: async ({ id, ...productData }: any) => {
      const { error } = await supabase
        .from('seller_products')
        .update({
          title: productData.title,
          description: productData.description,
          price: parseFloat(productData.price),
          category: productData.category,
          stock_quantity: parseInt(productData.stock_quantity),
          images: productData.images,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Product updated!');
      setEditingProduct(null);
      resetForm();
    },
    onError: () => toast.error('Failed to update product'),
  });

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('seller_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Product deleted');
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      category: 'Fashion',
      stock_quantity: '',
      images: [],
      newImageUrl: '',
    });
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category,
      stock_quantity: product.stock_quantity.toString(),
      images: product.images || [],
      newImageUrl: '',
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.price || !formData.stock_quantity) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, ...formData });
    } else {
      addProduct.mutate(formData);
    }
  };

  const addImageUrl = () => {
    if (formData.newImageUrl) {
      setFormData({
        ...formData,
        images: [...formData.images, formData.newImageUrl],
        newImageUrl: '',
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{application.store_name || 'Your Store'}</h2>
              <p className="text-muted-foreground">Welcome back! Here's how your store is performing.</p>
            </div>
            <Badge className="bg-green-600">Verified Seller</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
                <p className="text-xl font-bold text-green-600">${totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-amber-600">${pendingEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Products</p>
                <p className="text-xl font-bold text-blue-600">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold text-purple-600">{totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                <Star className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-xl font-bold text-rose-600">{approvedProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Payments
            </TabsTrigger>
          </TabsList>
          
          <Dialog open={isAddDialogOpen || !!editingProduct} onOpenChange={(open) => {
            if (!open) {
              setIsAddDialogOpen(false);
              setEditingProduct(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Product Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your product in detail..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (USD) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Quantity *</Label>
                    <Input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val as typeof categories[number] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label>Product Images</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.newImageUrl}
                      onChange={(e) => setFormData({ ...formData, newImageUrl: e.target.value })}
                      placeholder="Paste image URL"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={addImageUrl}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {formData.images.map((url, index) => (
                        <div key={index} className="relative aspect-square group">
                          <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Commission:</strong> 12% of each sale goes to CartSwift. You keep 88% of every sale.
                  </p>
                </div>
                
                <Button onClick={handleSubmit} className="w-full" disabled={addProduct.isPending || updateProduct.isPending}>
                  {addProduct.isPending || updateProduct.isPending ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="products">
          {isLoading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-4">Start selling by adding your first product</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product: any) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-1 line-clamp-1">{product.title}</h3>
                    <p className="text-xl font-bold text-primary mb-2">${product.price}</p>
                    <div className="flex items-center gap-1 flex-wrap mb-3">
                      <Badge variant={product.is_approved ? 'default' : 'secondary'} className="text-xs">
                        {product.is_approved ? 'Live' : 'Pending'}
                      </Badge>
                      {product.is_featured && <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">Featured</Badge>}
                      <Badge variant="outline" className="text-xs">{product.stock_quantity} in stock</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(product)}>
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteProduct.mutate(product.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                <p className="text-muted-foreground">Orders will appear here when customers buy your products</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order: any) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{order.seller_products?.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Qty: {order.quantity} • Buyer: {order.buyer_email || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+${order.seller_earnings}</p>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Store Analytics</CardTitle>
              <CardDescription>Track your store's performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-muted rounded-lg">
                  <p className="text-4xl font-bold text-primary">{products.length}</p>
                  <p className="text-muted-foreground">Total Products</p>
                </div>
                <div className="text-center p-6 bg-muted rounded-lg">
                  <p className="text-4xl font-bold text-green-600">${totalEarnings.toFixed(2)}</p>
                  <p className="text-muted-foreground">Total Revenue</p>
                </div>
                <div className="text-center p-6 bg-muted rounded-lg">
                  <p className="text-4xl font-bold text-blue-600">{totalSales}</p>
                  <p className="text-muted-foreground">Completed Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Your payout information from your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Preferred Payout Method</p>
                <p className="font-medium capitalize">{application.preferred_payout_method?.replace('_', ' ')}</p>
              </div>
              {application.bank_name && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Bank Details</p>
                  <p className="font-medium">{application.bank_name}</p>
                  <p className="text-sm">Account: ****{application.account_number?.slice(-4)}</p>
                </div>
              )}
              {application.paypal_email && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">PayPal</p>
                  <p className="font-medium">{application.paypal_email}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                To update your payment information, please contact support.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApprovedSellerDashboard;
