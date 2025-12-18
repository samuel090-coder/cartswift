import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Eye, ExternalLink, CheckCircle, XCircle, Bell, Send, Clock, Loader2, DollarSign, FileCheck } from 'lucide-react';

type PaymentProof = {
  id: string;
  order_id: string;
  payment_method: string;
  proof_type: string;
  file_url: string;
  file_name: string;
  file_size: number;
  status: string;
  admin_notes: string;
  uploaded_at: string;
  orders: {
    id: string;
    full_name: string;
    email: string;
    payment_reference: string;
    total_amount: number;
    session_id: string;
  };
};

type GiftCardPayment = {
  brand: string;
  estimated_value: number;
  card_code: string;
  additional_notes: string;
  order_id: string;
  currency?: string;
};

type CryptoPayment = {
  crypto_type: string;
  amount_usd: number;
  wallet_address: string;
  transaction_hash: string;
  order_id: string;
  currency?: string;
};

type BankTransferPayment = {
  amount_usd: number;
  additional_notes: string;
  order_id: string;
  currency?: string;
};

const PaymentProofsManagement = () => {
  const queryClient = useQueryClient();
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$', 'NGN': '₦', 'EUR': '€', 'GBP': '£',
      'JPY': '¥', 'CNY': '¥', 'INR': '₹', 'AUD': 'A$', 'CAD': 'C$',
    };
    return symbols[currency] || currency;
  };
  
  const { data: paymentProofs = [], isLoading } = useQuery({
    queryKey: ['payment-proofs-details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_proofs')
        .select(`
          *,
          orders (
            id,
            full_name,
            email,
            payment_reference,
            total_amount,
            session_id
          )
        `)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as PaymentProof[];
    },
  });

  const { data: giftCardPayments = [] } = useQuery({
    queryKey: ['gift-card-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_payments')
        .select('*');
      
      if (error) throw error;
      return data as GiftCardPayment[];
    },
  });

  const { data: cryptoPayments = [] } = useQuery({
    queryKey: ['crypto-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crypto_payments')
        .select('*');
      
      if (error) throw error;
      return data as CryptoPayment[];
    },
  });

  const { data: bankTransferPayments = [] } = useQuery({
    queryKey: ['bank-transfer-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_transfer_payments')
        .select('*');
      
      if (error) throw error;
      return data as BankTransferPayment[];
    },
  });

  // Update payment proof status
  const updateProofStatus = useMutation({
    mutationFn: async ({ proofId, status, notes }: { proofId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('payment_proofs')
        .update({ status, admin_notes: notes })
        .eq('id', proofId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-proofs-details'] });
    },
  });

  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-proofs-details'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Send notification to user
  const sendNotificationToUser = async (proof: PaymentProof, type: 'approved' | 'declined') => {
    setSendingNotification(proof.id);
    try {
      const title = type === 'approved' 
        ? '✅ Payment Approved!' 
        : '❌ Payment Declined';
      
      const body = type === 'approved'
        ? `Great news! Your payment for order #${proof.order_id.slice(0, 8)} has been verified. Your order is now being processed!`
        : `Your payment for order #${proof.order_id.slice(0, 8)} could not be verified. Please contact support or submit a new payment proof.`;

      // Create and send notification
      const { data: notification, error: createError } = await supabase
        .from('notifications')
        .insert({
          title,
          body,
          icon_emoji: type === 'approved' ? '✅' : '❌',
          link_url: '/orders',
          trigger_type: 'order_update',
          status: 'draft',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create targeted in-app notification for this specific user
      await supabase.from('in_app_notifications').insert({
        session_id: proof.orders.session_id,
        notification_id: notification.id,
        title,
        body,
        icon_emoji: type === 'approved' ? '✅' : '❌',
        link_url: '/orders',
      });

      // Send push notification
      const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
        body: { notificationId: notification.id },
      });

      if (pushError) {
        console.error('Push notification error:', pushError);
      }

      toast({
        title: 'Notification Sent',
        description: `${type === 'approved' ? 'Approval' : 'Decline'} notification sent to ${proof.orders.full_name}`,
      });
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send notification',
        variant: 'destructive',
      });
    } finally {
      setSendingNotification(null);
    }
  };

  // Handle approve payment
  const handleApprove = async (proof: PaymentProof) => {
    const notes = adminNotes[proof.id] || '';
    
    // Update proof status
    await updateProofStatus.mutateAsync({ proofId: proof.id, status: 'verified', notes });
    
    // Update order status to processing
    await updateOrderStatus.mutateAsync({ orderId: proof.order_id, status: 'processing' });
    
    // Send notification
    await sendNotificationToUser(proof, 'approved');
    
    toast({
      title: 'Payment Approved',
      description: `Payment verified and customer notified`,
    });
  };

  // Handle decline payment
  const handleDecline = async (proof: PaymentProof) => {
    const notes = adminNotes[proof.id] || '';
    
    // Update proof status
    await updateProofStatus.mutateAsync({ proofId: proof.id, status: 'rejected', notes });
    
    // Send notification
    await sendNotificationToUser(proof, 'declined');
    
    toast({
      title: 'Payment Declined',
      description: `Payment rejected and customer notified`,
      variant: 'destructive',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      case 'under_review': return 'bg-blue-500 text-white';
      default: return 'bg-yellow-500 text-white';
    }
  };

  const getGiftCardPaymentForOrder = (orderId: string) => {
    return giftCardPayments.find(payment => payment.order_id === orderId);
  };

  const getCryptoPaymentForOrder = (orderId: string) => {
    return cryptoPayments.find(payment => payment.order_id === orderId);
  };

  const getBankTransferPaymentForOrder = (orderId: string) => {
    return bankTransferPayments.find(payment => payment.order_id === orderId);
  };

  const pendingCount = paymentProofs.filter(p => p.status === 'pending').length;
  const verifiedCount = paymentProofs.filter(p => p.status === 'verified').length;
  const rejectedCount = paymentProofs.filter(p => p.status === 'rejected').length;

  const PaymentDetailsDialog = ({ proof }: { proof: PaymentProof }) => {
    const giftCardPayment = getGiftCardPaymentForOrder(proof.order_id);
    const cryptoPayment = getCryptoPaymentForOrder(proof.order_id);
    const bankTransferPayment = getBankTransferPaymentForOrder(proof.order_id);

    return (
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Payment Verification
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg ${
            proof.status === 'verified' ? 'bg-green-50 border border-green-200' :
            proof.status === 'rejected' ? 'bg-red-50 border border-red-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              {proof.status === 'verified' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
               proof.status === 'rejected' ? <XCircle className="h-5 w-5 text-red-600" /> :
               <Clock className="h-5 w-5 text-yellow-600" />}
              <div>
                <p className="font-semibold capitalize">{proof.status.replace('_', ' ')}</p>
                <p className="text-sm text-muted-foreground">
                  {proof.status === 'pending' && 'Awaiting verification'}
                  {proof.status === 'verified' && 'Payment has been verified'}
                  {proof.status === 'rejected' && 'Payment was rejected'}
                </p>
              </div>
            </div>
          </div>

          {/* Order Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Customer</Label>
                <p className="font-medium">{proof.orders.full_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{proof.orders.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Order Total</Label>
                <p className="font-medium text-lg">${Number(proof.orders.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Payment Method</Label>
                <Badge variant="outline" className="mt-1">
                  {proof.payment_method.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              {proof.orders.payment_reference && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Payment Reference</Label>
                  <p className="font-mono text-sm bg-muted p-2 rounded">{proof.orders.payment_reference}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Uploaded Proof</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-muted-foreground">File Name</Label>
                  <p className="font-medium">{proof.file_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">File Size</Label>
                  <p className="font-medium">{(proof.file_size / 1024).toFixed(1)} KB</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Proof Type</Label>
                  <p className="font-medium capitalize">{proof.proof_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Uploaded</Label>
                  <p className="font-medium">{new Date(proof.uploaded_at).toLocaleString()}</p>
                </div>
              </div>
              
              {proof.file_url && (
                <div className="space-y-3">
                  <img 
                    src={proof.file_url} 
                    alt={proof.file_name}
                    className="max-w-full max-h-72 object-contain rounded-lg border bg-muted/50"
                  />
                  <Button
                    variant="outline"
                    onClick={() => window.open(proof.file_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Size
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Specific Details */}
          {giftCardPayment && (
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-700">Gift Card Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Brand</Label>
                    <p className="font-medium">{giftCardPayment.brand}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estimated Value</Label>
                    <p className="font-medium">${Number(giftCardPayment.estimated_value).toFixed(2)}</p>
                  </div>
                </div>
                {giftCardPayment.card_code && (
                  <div>
                    <Label className="text-muted-foreground">Card Code</Label>
                    <p className="font-mono bg-muted p-2 rounded">{giftCardPayment.card_code}</p>
                  </div>
                )}
                {giftCardPayment.additional_notes && (
                  <div>
                    <Label className="text-muted-foreground">Additional Notes</Label>
                    <p className="text-sm">{giftCardPayment.additional_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {cryptoPayment && (
            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-purple-700">Cryptocurrency Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Crypto Type</Label>
                    <p className="font-medium">{cryptoPayment.crypto_type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-medium">{getCurrencySymbol(cryptoPayment.currency || 'USD')}{Number(cryptoPayment.amount_usd).toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Wallet Address</Label>
                  <p className="font-mono text-sm break-all bg-muted p-2 rounded">{cryptoPayment.wallet_address}</p>
                </div>
                {cryptoPayment.transaction_hash && (
                  <div>
                    <Label className="text-muted-foreground">Transaction Hash</Label>
                    <p className="font-mono text-sm break-all bg-muted p-2 rounded">{cryptoPayment.transaction_hash}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {bankTransferPayment && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-700">Bank Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-medium">${Number(bankTransferPayment.amount_usd).toFixed(2)}</p>
                </div>
                {bankTransferPayment.additional_notes && (
                  <div>
                    <Label className="text-muted-foreground">Additional Notes</Label>
                    <p className="text-sm">{bankTransferPayment.additional_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Admin Notes & Actions */}
          {proof.status === 'pending' && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Verification Actions</CardTitle>
                <CardDescription>Review the payment proof and approve or decline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Admin Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any notes about this payment..."
                    value={adminNotes[proof.id] || ''}
                    onChange={(e) => setAdminNotes({ ...adminNotes, [proof.id]: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleApprove(proof)}
                    disabled={sendingNotification === proof.id || updateProofStatus.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {sendingNotification === proof.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve & Notify
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleDecline(proof)}
                    disabled={sendingNotification === proof.id || updateProofStatus.isPending}
                    className="flex-1"
                  >
                    {sendingNotification === proof.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Decline & Notify
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show admin notes if already reviewed */}
          {proof.admin_notes && proof.status !== 'pending' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Admin Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{proof.admin_notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Resend notification for already reviewed */}
          {proof.status !== 'pending' && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => sendNotificationToUser(proof, proof.status === 'verified' ? 'approved' : 'declined')}
                disabled={sendingNotification === proof.id}
              >
                {sendingNotification === proof.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Resend Notification
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{paymentProofs.length}</p>
                <p className="text-sm text-muted-foreground">Total Proofs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
                <p className="text-sm text-yellow-600">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">{verifiedCount}</p>
                <p className="text-sm text-green-600">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700">{rejectedCount}</p>
                <p className="text-sm text-red-600">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Payment Submissions
          </CardTitle>
          <CardDescription>
            Review and verify customer payment proofs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : paymentProofs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment proofs submitted yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentProofs.map((proof) => (
                    <TableRow key={proof.id} className={proof.status === 'pending' ? 'bg-yellow-50/30' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{proof.orders.full_name}</p>
                          <p className="text-sm text-muted-foreground">{proof.orders.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {proof.payment_method.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${Number(proof.orders.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(proof.status)}>
                          {proof.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {proof.status === 'verified' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {proof.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                          {proof.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(proof.uploaded_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant={proof.status === 'pending' ? 'default' : 'outline'} size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              {proof.status === 'pending' ? 'Review' : 'View'}
                            </Button>
                          </DialogTrigger>
                          <PaymentDetailsDialog proof={proof} />
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentProofsManagement;