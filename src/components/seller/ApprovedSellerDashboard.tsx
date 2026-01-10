import { useState } from 'react';
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
  Plus, Package, DollarSign, TrendingUp, Star, Edit, Trash2, 
  Image, BarChart3, ShoppingBag, CreditCard, CheckCircle, Clock,
  XCircle, Eye, Upload, Loader2, Sparkles, Award, Wallet, Rocket
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import ProductBoostModal from './ProductBoostModal';

const categories = ['Fashion', 'Animals', 'Tools', 'Vehicles', 'Books'] as const;

interface ApprovedSellerDashboardProps {
  application?: any;
}

const ApprovedSellerDashboard = ({ application }: ApprovedSellerDashboardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [boostProduct, setBoostProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Fashion' as typeof categories[number],
    stock_quantity: '',
    images: [] as string[],
  });

  // Fetch boost requests for this seller
  const { data: boostRequests = [] } = useQuery({
    queryKey: ['seller-boost-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boost_requests')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
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
        .select('*, seller_products(title, images)')
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
  const featuredProducts = products.filter((p: any) => p.is_featured).length;

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `seller-products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-files')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, publicUrl],
      }));
      toast.success('Image uploaded!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

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
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.price || !formData.stock_quantity) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.images.length === 0) {
      toast.error('Please add at least one product image');
      return;
    }
    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, ...formData });
    } else {
      addProduct.mutate(formData);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const getStatusBadge = (product: any) => {
    if (product.is_featured) {
      return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"><Sparkles className="w-3 h-3 mr-1" />Featured</Badge>;
    }
    if (product.is_approved) {
      return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    }
    return <Badge variant="secondary" className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground border-0 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <CardContent className="p-8 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{application.store_name || 'Your Store'}</h2>
                    <p className="opacity-90">Welcome back! Here's how your store is performing.</p>
                  </div>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-sm px-4 py-2">
                <CheckCircle className="w-4 h-4 mr-2" />
                Verified Seller
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Earnings', value: `$${totalEarnings.toFixed(2)}`, icon: DollarSign, color: 'green', bg: 'bg-green-50 dark:bg-green-950/30' },
          { label: 'Pending', value: `$${pendingEarnings.toFixed(2)}`, icon: Wallet, color: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Products', value: products.length, icon: Package, color: 'blue', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Total Sales', value: totalSales, icon: ShoppingBag, color: 'purple', bg: 'bg-purple-50 dark:bg-purple-950/30' },
          { label: 'Approved', value: approvedProducts, icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Featured', value: featuredProducts, icon: Sparkles, color: 'orange', bg: 'bg-orange-50 dark:bg-orange-950/30' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`${stat.bg} border-0`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/50`}>
                      <Icon className={`w-5 h-5 text-${stat.color}-600`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className={`text-xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Tabs defaultValue="products" className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShoppingBag className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
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
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct ? 'Update your product details below.' : 'Fill in the details to list a new product. All products require admin approval.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* Image Upload Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Product Images *
                  </Label>
                  <div className="border-2 border-dashed rounded-xl p-6 text-center bg-muted/30">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="product-image"
                      disabled={uploadingImage}
                    />
                    <label htmlFor="product-image" className="cursor-pointer">
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-primary/10 rounded-full">
                            <Upload className="w-6 h-6 text-primary" />
                          </div>
                          <span className="text-sm font-medium">Click to upload images</span>
                          <span className="text-xs text-muted-foreground">PNG, JPG up to 10MB</span>
                        </div>
                      )}
                    </label>
                  </div>
                  
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-3">
                      {formData.images.map((url, index) => (
                        <div key={index} className="relative aspect-square group rounded-lg overflow-hidden border-2">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-5 h-5 text-white" />
                          </button>
                          {index === 0 && (
                            <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                              Main
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Product Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter a catchy product name"
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your product in detail. Include features, materials, dimensions, etc."
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Price (USD) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        className="pl-9 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Quantity *</Label>
                    <Input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      placeholder="0"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val as typeof categories[number] })}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">Commission Structure</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    12% of each sale goes to CartSwift. <strong>You keep 88%</strong> of every sale.
                  </p>
                </div>
                
                <Button 
                  onClick={handleSubmit} 
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/80" 
                  disabled={addProduct.isPending || updateProduct.isPending}
                >
                  {addProduct.isPending || updateProduct.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {editingProduct ? 'Update Product' : 'Add Product'}
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="products">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-12 text-center">
                <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-4">
                  <Package className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start selling by adding your first product. Products will be visible to buyers after admin approval.
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Your First Product
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product: any, i: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
                    <div className="aspect-square bg-muted overflow-hidden relative">
                      {product.images?.[0] ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        {getStatusBadge(product)}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {product.is_approved && (
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-primary to-pink-vibrant"
                            onClick={() => setBoostProduct(product)}
                          >
                            <Rocket className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => deleteProduct.mutate(product.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate">{product.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-primary">${Number(product.price).toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground">{product.stock_quantity} in stock</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs">{product.category}</Badge>
                        {product.commission_rate && (
                          <span className="text-xs text-muted-foreground">{product.commission_rate}% commission</span>
                        )}
                      </div>
                      {/* Boost Status Badge */}
                      {boostRequests.some((br: any) => br.product_id === product.id && br.status === 'active') && (
                        <div className="absolute bottom-2 left-2">
                          <Badge className="bg-gradient-to-r from-primary to-pink-vibrant text-white text-[10px] gap-1">
                            <Rocket className="w-3 h-3" /> Boosted
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-12 text-center">
                <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-4">
                  <ShoppingBag className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  When customers purchase your products, orders will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order: any) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                        {order.seller_products?.images?.[0] ? (
                          <img 
                            src={order.seller_products.images[0]} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{order.seller_products?.title || 'Product'}</h4>
                        <p className="text-sm text-muted-foreground">
                          Qty: {order.quantity} • {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">{order.buyer_email || 'Anonymous'}</p>
                      </div>
                      <div className="text-right">
                        {getOrderStatusBadge(order.status)}
                        <p className="text-lg font-bold text-green-600 mt-1">
                          +${Number(order.seller_earnings).toFixed(2)}
                        </p>
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
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Store Analytics
              </CardTitle>
              <CardDescription>Track your store's performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{products.length}</p>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{approvedProducts}</p>
                  <p className="text-sm text-muted-foreground">Live Products</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold text-amber-600">{pendingProducts}</p>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{totalSales}</p>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl">
                <h4 className="font-semibold mb-4">Performance Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="font-bold">${(totalEarnings + pendingEarnings + ((totalEarnings + pendingEarnings) * 0.12 / 0.88)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Platform Commission (12%)</span>
                    <span className="font-bold text-amber-600">-${((totalEarnings + pendingEarnings) * 0.12 / 0.88).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-medium">Your Earnings (88%)</span>
                    <span className="font-bold text-green-600">${(totalEarnings + pendingEarnings).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Settings
              </CardTitle>
              <CardDescription>Your payout information from your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground">Payout Method</Label>
                  <p className="font-medium capitalize mt-1">{application.preferred_payout_method?.replace('_', ' ') || 'Not set'}</p>
                </div>
                {application.preferred_payout_method === 'bank_transfer' && (
                  <>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-muted-foreground">Bank Name</Label>
                      <p className="font-medium mt-1">{application.bank_name || 'Not provided'}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-muted-foreground">Account Number</Label>
                      <p className="font-medium mt-1">****{application.account_number?.slice(-4) || '****'}</p>
                    </div>
                  </>
                )}
                {application.preferred_payout_method === 'paypal' && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Label className="text-muted-foreground">PayPal Email</Label>
                    <p className="font-medium mt-1">{application.paypal_email || 'Not provided'}</p>
                  </div>
                )}
                {application.preferred_payout_method === 'crypto' && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Label className="text-muted-foreground">Crypto Wallet</Label>
                    <p className="font-medium mt-1 truncate">{application.crypto_wallet || 'Not provided'}</p>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-200">Earnings Summary</h4>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-300">Available for withdrawal</span>
                        <span className="font-bold text-green-700 dark:text-green-300">${totalEarnings.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-700 dark:text-amber-300">Pending clearance</span>
                        <span className="font-medium text-amber-700 dark:text-amber-300">${pendingEarnings.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Boost Modal */}
      <ProductBoostModal
        isOpen={!!boostProduct}
        onClose={() => setBoostProduct(null)}
        product={boostProduct}
      />
    </div>
  );
};

export default ApprovedSellerDashboard;