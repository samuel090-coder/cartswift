import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { Eye, Download, Check, X, Clock, ExternalLink, ZoomIn } from 'lucide-react';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderStatus = Database['public']['Enums']['order_status'];
type PaymentProof = Database['public']['Tables']['payment_proofs']['Row'];
type GiftCardPayment = Database['public']['Tables']['gift_card_payments']['Row'];
type CryptoPayment = Database['public']['Tables']['crypto_payments']['Row'];
type BankTransferPayment = Database['public']['Tables']['bank_transfer_payments']['Row'];

interface OrderWithDetails extends Order {
  order_items: Array<{
    id: string;
    quantity: number;
    price_at_time: number;
    items: { title: string; price: number };
  }>;
  payment_proofs: PaymentProof[];
  gift_card_payments: GiftCardPayment[];
  crypto_payments: CryptoPayment[];
  bank_transfer_payments: BankTransferPayment[];
}

const OrderManagement = () => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            items (title, price)
          ),
          payment_proofs (*),
          gift_card_payments (*),
          crypto_payments (*),
          bank_transfer_payments (*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OrderWithDetails[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
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

  const updateProofStatusMutation = useMutation({
    mutationFn: async ({ proofId, status, notes }: { proofId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('payment_proofs')
        .update({ status, admin_notes: notes })
        .eq('id', proofId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: "Success",
        description: "Payment proof status updated",
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

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProofStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const ImagePreview = ({ fileUrl, fileName }: { fileUrl: string; fileName: string }) => {
    if (!isImageFile(fileName)) {
      return (
        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-xs text-gray-500">FILE</span>
        </div>
      );
    }

    return (
      <div className="relative group">
        <img 
          src={fileUrl} 
          alt={fileName}
          className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setSelectedImage(fileUrl)}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
          <ZoomIn className="h-4 w-4 text-white" />
        </div>
      </div>
    );
  };

  const ProofThumbnails = ({ proofs }: { proofs: PaymentProof[] }) => {
    if (proofs.length === 0) {
      return <span className="text-gray-400">None</span>;
    }

    return (
      <div className="flex flex-wrap gap-1 max-w-[120px]">
        {proofs.slice(0, 3).map((proof) => (
          <div key={proof.id} className="relative">
            {proof.file_url && isImageFile(proof.file_name || 'unknown') ? (
              <img 
                src={proof.file_url} 
                alt={proof.file_name || 'Payment proof'}
                className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity border"
                onClick={() => setSelectedImage(proof.file_url)}
                title={`${proof.proof_type.replace('_', ' ')} - ${proof.file_name}`}
              />
            ) : (
              <div 
                className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center border cursor-pointer hover:bg-gray-200"
                onClick={() => window.open(proof.file_url, '_blank')}
                title={`${proof.proof_type.replace('_', ' ')} - ${proof.file_name}`}
              >
                <span className="text-xs text-gray-500">FILE</span>
              </div>
            )}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border ${getProofStatusColor(proof.status || 'pending')}`}>
            </div>
          </div>
        ))}
        {proofs.length > 3 && (
          <div className="w-10 h-10 bg-gray-50 rounded flex items-center justify-center border text-xs text-gray-500">
            +{proofs.length - 3}
          </div>
        )}
      </div>
    );
  };

  const FullSizeImageDialog = () => (
    <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Payment Proof Image</DialogTitle>
        </DialogHeader>
        {selectedImage && (
          <div className="flex justify-center">
            <img 
              src={selectedImage} 
              alt="Payment proof full size"
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const OrderDetailsDialog = ({ order }: { order: OrderWithDetails }) => (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Order Details - {order.id.slice(0, 8)}...</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-medium">Full Name</Label>
              <p>{order.full_name}</p>
            </div>
            <div>
              <Label className="font-medium">Email</Label>
              <p>{order.email || 'Not provided'}</p>
            </div>
            <div>
              <Label className="font-medium">Phone</Label>
              <p>{order.phone_number || 'Not provided'}</p>
            </div>
            <div>
              <Label className="font-medium">Order Total</Label>
              <p className="font-semibold">${Number(order.total_amount).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{order.address_line1}</p>
            {order.address_line2 && <p>{order.address_line2}</p>}
            <p>{order.city}, {order.state} {order.postal_code}</p>
            <p>{order.country}</p>
            {order.delivery_instructions && (
              <div className="mt-2">
                <Label className="font-medium">Delivery Instructions:</Label>
                <p className="text-sm text-gray-600">{order.delivery_instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{item.items.title}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">${(Number(item.price_at_time) * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="font-medium">Method:</Label>
              <Badge variant="outline">{order.payment_method.replace('_', ' ').toUpperCase()}</Badge>
            </div>
            
            {order.payment_reference && (
              <div>
                <Label className="font-medium">Payment Reference:</Label>
                <p className="font-mono text-sm">{order.payment_reference}</p>
              </div>
            )}

            {/* Gift Card Details */}
            {order.gift_card_payments.map((giftCard) => (
              <div key={giftCard.id} className="bg-green-50 p-3 rounded border">
                <h4 className="font-medium text-green-800 mb-2">Gift Card Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Brand:</strong> {giftCard.brand}</div>
                  <div><strong>Value:</strong> ${Number(giftCard.estimated_value).toFixed(2)}</div>
                  {giftCard.card_code && <div><strong>Code:</strong> {giftCard.card_code}</div>}
                  {giftCard.additional_notes && (
                    <div className="col-span-2"><strong>Notes:</strong> {giftCard.additional_notes}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Crypto Details */}
            {order.crypto_payments.map((crypto) => (
              <div key={crypto.id} className="bg-purple-50 p-3 rounded border">
                <h4 className="font-medium text-purple-800 mb-2">Cryptocurrency Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Type:</strong> {crypto.crypto_type}</div>
                  <div><strong>Amount (USD):</strong> ${Number(crypto.amount_usd).toFixed(2)}</div>
                  <div className="col-span-2">
                    <strong>Wallet:</strong> 
                    <p className="font-mono text-xs break-all">{crypto.wallet_address}</p>
                  </div>
                  {crypto.transaction_hash && (
                    <div className="col-span-2">
                      <strong>Transaction Hash:</strong>
                      <p className="font-mono text-xs break-all">{crypto.transaction_hash}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Bank Transfer Details */}
            {order.bank_transfer_payments.map((bank) => (
              <div key={bank.id} className="bg-blue-50 p-3 rounded border">
                <h4 className="font-medium text-blue-800 mb-2">Bank Transfer Details</h4>
                <div className="text-sm">
                  <div><strong>Amount:</strong> ${Number(bank.amount_usd).toFixed(2)}</div>
                  {bank.additional_notes && (
                    <div><strong>Notes:</strong> {bank.additional_notes}</div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Payment Proofs */}
        {order.payment_proofs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Proofs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.payment_proofs.map((proof) => (
                  <div key={proof.id} className="border p-4 rounded space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getProofStatusColor(proof.status || 'pending')}>
                          {proof.status || 'pending'}
                        </Badge>
                        <span className="text-sm font-medium capitalize">{proof.proof_type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={proof.status || 'pending'}
                          onValueChange={(value) => updateProofStatusMutation.mutate({
                            proofId: proof.id,
                            status: value,
                            notes: adminNotes
                          })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Enhanced File Preview with Larger Images */}
                    <div className="flex items-start gap-4">
                      {isImageFile(proof.file_name || 'unknown') ? (
                        <div className="relative">
                          <img 
                            src={proof.file_url} 
                            alt={proof.file_name || 'Payment proof'}
                            className="w-32 h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                            onClick={() => setSelectedImage(proof.file_url)}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 rounded flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer">
                            <ZoomIn className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center border">
                          <span className="text-sm text-gray-500">FILE</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{proof.file_name || 'Unknown file'}</p>
                        <p className="text-sm text-gray-500">
                          Size: {proof.file_size ? `${(proof.file_size / 1024).toFixed(1)} KB` : 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Uploaded: {new Date(proof.uploaded_at || '').toLocaleString()}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(proof.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Full Size
                          </Button>
                          {isImageFile(proof.file_name || 'unknown') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedImage(proof.file_url)}
                            >
                              <ZoomIn className="h-4 w-4 mr-1" />
                              Zoom
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {proof.admin_notes && (
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-sm"><strong>Admin Notes:</strong> {proof.admin_notes}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor={`notes-${proof.id}`}>Admin Notes</Label>
                      <Textarea
                        id={`notes-${proof.id}`}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add admin notes..."
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DialogContent>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Order Management</h2>
        <div className="text-sm text-gray-600">
          Total Orders: {orders.length}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Proofs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.full_name}</div>
                        <div className="text-sm text-gray-500">{order.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.order_items.length} item(s)
                    </TableCell>
                    <TableCell>${Number(order.total_amount).toFixed(2)}</TableCell>
                    <TableCell className="capitalize">
                      <Badge variant="outline">
                        {order.payment_method.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ProofThumbnails proofs={order.payment_proofs} />
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <OrderDetailsDialog order={order} />
                        </Dialog>
                        
                        <Select
                          value={order.status}
                          onValueChange={(value: OrderStatus) =>
                            updateStatusMutation.mutate({ orderId: order.id, status: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FullSizeImageDialog />
    </div>
  );
};

export default OrderManagement;
