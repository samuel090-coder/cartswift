import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Upload, Sparkles, Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import ProductExtractor, { ExtractedProduct } from './ProductExtractor';

type Item = Database['public']['Tables']['items']['Row'];

const ItemManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDialogOpen) return;
    requestAnimationFrame(() => {
      dialogContentRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });
  }, [isDialogOpen]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'USD',
    category: '',
    estimated_delivery_days: '',
    star_rating: '',
    discount_percentage: '',
    images: [] as string[],
    item_type: 'product',
    file_url: '',
    file_size: '',
    admin_download_link: '',
    allowed_payment_methods: ['stripe', 'crypto', 'bank_transfer', 'gift_card'] as string[],
  });
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const handleAnalyzeImage = async () => {
    const file = imageFiles?.[0];
    const existing = formData.images?.[0];
    if (!file && !existing) {
      toast({ title: 'Add an image first', description: 'Upload an image or have an existing one to analyze.', variant: 'destructive' });
      return;
    }
    setAnalyzing(true);
    try {
      const imageUrl = file ? await fileToDataUrl(file) : existing;
      const { data, error } = await supabase.functions.invoke('analyze-product-image', {
        body: { imageUrl },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Analysis failed');
      setFormData((prev) => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        category: data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1) : prev.category,
      }));
      toast({ title: '✨ AI analysis complete', description: 'Title and description filled in. Review and tweak as needed.' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'AI analysis failed', description: e?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Item[];
    },
  });

  const itemMutation = useMutation({
    mutationFn: async (data: any) => {
      let imageUrls = formData.images;
      let fileUrl = data.file_url;

      // Upload new images if any
      if (imageFiles && imageFiles.length > 0) {
        const uploadPromises = Array.from(imageFiles).map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('item-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('item-images')
            .getPublicUrl(fileName);

          return urlData.publicUrl;
        });

        const newImageUrls = await Promise.all(uploadPromises);
        imageUrls = [...imageUrls, ...newImageUrls];
      }

      // Upload APK/File if provided
      if (apkFile) {
        const fileExt = apkFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, apkFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('item-images')
          .getPublicUrl(fileName);

        fileUrl = urlData.publicUrl;
      }

      const itemData = {
        title: data.title,
        description: data.description || null,
        price: parseFloat(data.price),
        currency: data.currency || 'USD',
        category: data.category,
        estimated_delivery_days: data.item_type === 'product' ? parseInt(data.estimated_delivery_days) : null,
        star_rating: data.star_rating ? parseFloat(data.star_rating) : null,
        discount_percentage: data.discount_percentage ? parseInt(data.discount_percentage) : null,
        images: imageUrls,
        item_type: data.item_type || 'product',
        file_url: fileUrl || null,
        file_size: apkFile ? apkFile.size : (data.file_size ? parseInt(data.file_size) : null),
        admin_download_link: data.admin_download_link || null,
        allowed_payment_methods: data.allowed_payment_methods || ['stripe', 'crypto', 'bank_transfer', 'gift_card'],
      };

      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update(itemData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { data: newItem, error } = await supabase
          .from('items')
          .insert(itemData)
          .select()
          .single();
        if (error) throw error;

        // Trigger new product notification
        if (newItem) {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              autoTrigger: 'new_product',
              triggerData: { product_name: newItem.title }
            }
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-items'] });
      toast({
        title: "Success",
        description: editingItem ? "Item updated successfully" : "Item created successfully",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-items'] });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      currency: 'USD',
      category: '',
      estimated_delivery_days: '',
      star_rating: '',
      discount_percentage: '',
      images: [],
      item_type: 'product',
      file_url: '',
      file_size: '',
      admin_download_link: '',
      allowed_payment_methods: ['stripe', 'crypto', 'bank_transfer', 'gift_card'],
    });
    setEditingItem(null);
    setImageFiles(null);
    setApkFile(null);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      price: item.price.toString(),
      currency: item.currency || 'USD',
      category: item.category,
      estimated_delivery_days: item.estimated_delivery_days?.toString() || '',
      star_rating: item.star_rating?.toString() || '',
      discount_percentage: item.discount_percentage?.toString() || '',
      images: item.images || [],
      item_type: item.item_type || 'product',
      file_url: item.file_url || '',
      file_size: item.file_size?.toString() || '',
      admin_download_link: (item as any).admin_download_link || '',
      allowed_payment_methods: item.allowed_payment_methods || ['stripe', 'crypto', 'bank_transfer', 'gift_card'],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    itemMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Item Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent ref={dialogContentRef} className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingItem && (
                <ProductExtractor
                  onExtracted={(p: ExtractedProduct) => {
                    setFormData(prev => ({
                      ...prev,
                      title: p.title || prev.title,
                      description: p.description || prev.description,
                      price: p.price != null ? String(p.price) : prev.price,
                      currency: p.currency || prev.currency,
                      category: p.category || prev.category,
                      images: [...(prev.images || []), ...(p.images || [])],
                    }));
                  }}
                />
              )}

              <div>
                <Label htmlFor="item_type">Item Type *</Label>
                <Select value={formData.item_type} onValueChange={(value) => setFormData(prev => ({ ...prev, item_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Physical Product</SelectItem>
                    <SelectItem value="apk">APK File</SelectItem>
                    <SelectItem value="file">Digital File</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="NGN">NGN (₦)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                      <SelectItem value="CNY">CNY (¥)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="AUD">AUD ($)</SelectItem>
                      <SelectItem value="CAD">CAD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fashion">Fashion</SelectItem>
                      <SelectItem value="Animals">Animals</SelectItem>
                      <SelectItem value="Tools">Tools</SelectItem>
                      <SelectItem value="Vehicles">Vehicles</SelectItem>
                      <SelectItem value="Books">Books</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.item_type === 'product' && (
                  <div>
                    <Label htmlFor="delivery">Estimated Delivery (days)</Label>
                    <Input
                      id="delivery"
                      type="number"
                      value={formData.estimated_delivery_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimated_delivery_days: e.target.value }))}
                    />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="star_rating">Star Rating (1-5)</Label>
                  <Input
                    id="star_rating"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={formData.star_rating}
                    onChange={(e) => setFormData(prev => ({ ...prev, star_rating: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Discount Percentage</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="images">Upload Images</Label>
                <Input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setImageFiles(e.target.files)}
                />
                {formData.images.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Current images: {formData.images.length}</p>
                  </div>
                )}
              </div>

              {/* Digital delivery link (used in approval email) */}
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <Label htmlFor="admin_download_link" className="font-medium">
                  Download Link (sent in approval email)
                </Label>
                <Input
                  id="admin_download_link"
                  type="url"
                  placeholder="https://drive.google.com/... (or any direct download link)"
                  value={formData.admin_download_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_download_link: e.target.value }))}
                  className="mt-2"
                  disabled={!(formData.item_type === 'apk' || formData.item_type === 'file')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  To enable this field, set <span className="font-medium">Item Type</span> to APK File or Digital File.
                </p>
              </div>

              {/* APK/File specific fields */}
              {(formData.item_type === 'apk' || formData.item_type === 'file') && (
                <>
                  <div>
                    <Label htmlFor="apk_file">Upload {formData.item_type === 'apk' ? 'APK' : 'File'} *</Label>
                    <Input
                      id="apk_file"
                      type="file"
                      accept={formData.item_type === 'apk' ? '.apk' : '*'}
                      onChange={(e) => setApkFile(e.target.files?.[0] || null)}
                    />
                    {formData.file_url && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Current file: {formData.file_url.split('/').pop()}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Allowed Payment Methods</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['stripe', 'crypto', 'bank_transfer', 'gift_card'].map((method) => (
                        <label key={method} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.allowed_payment_methods.includes(method)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_payment_methods: [...prev.allowed_payment_methods, method]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_payment_methods: prev.allowed_payment_methods.filter(m => m !== method)
                                }));
                              }
                            }}
                          />
                          <span className="text-sm capitalize">{method.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={itemMutation.isPending}>
                  {itemMutation.isPending ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded"></div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      <Badge variant={item.item_type === 'product' ? 'default' : 'secondary'}>
                        {item.item_type || 'product'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>${Number(item.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ItemManagement;
