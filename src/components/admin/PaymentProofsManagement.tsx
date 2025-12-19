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
import { Eye, ExternalLink, CheckCircle, XCircle, Bell, Clock, Loader2, DollarSign, FileCheck, Mail, AlertTriangle, RefreshCw } from 'lucide-react';

type PaymentProof = {
  id: string;
  order_id: string | null;
  payment_method: string;
  proof_type: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  status: string;
  admin_notes: string | null;
  uploaded_at: string;
  orders: {
    id: string;
    full_name: string;
    email: string;
    payment_reference: string | null;
    total_amount: number;
    session_id: string;
  } | null;
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

// Email Templates
const emailTemplates = {
  approved: {
    subject: "✅ Payment Approved - Your Order is Being Processed!",
    body: `Hi {customerName}! 🎉

Great news! Your payment for Order #{orderId} has been verified and approved.

💰 Amount: {amount}
📦 Status: Processing

Your order is now being prepared and will be shipped soon. You'll receive a tracking number once it's on its way!

Thank you for shopping with us! 🛒✨

If you have any questions, feel free to reply to this email.

Best regards,
CARTSWIFT Team 💫`
  },
  declined: {
    subject: "❌ Payment Issue - Action Required for Order #{orderId}",
    body: `Hi {customerName},

We've reviewed your payment for Order #{orderId}, but unfortunately, we couldn't verify it.

💰 Amount: {amount}
⚠️ Status: Payment Declined

Common reasons for payment issues:
• Payment proof image is unclear or incomplete
• Transaction amount doesn't match order total
• Payment was not completed successfully

📌 What you can do:
1. Double-check your payment was successful
2. Submit a clearer payment proof screenshot
3. Contact us if you need assistance

We're here to help! Reply to this email if you have any questions.

Best regards,
CARTSWIFT Support Team 🙏`
  },
  issue: {
    subject: "⚠️ We Need More Information About Your Payment",
    body: `Hi {customerName},

We're reviewing your payment for Order #{orderId} and need some additional information.

💰 Amount: {amount}
📋 Status: Under Review

Could you please provide:
• A clearer image of your payment confirmation
• The transaction reference number
• Date and time of the payment

This will help us verify your payment quickly and get your order processed.

Thank you for your patience! 🙏

Best regards,
CARTSWIFT Team`
  },
  thankYou: {
    subject: "🙏 Thank You for Your Order - #{orderId}",
    body: `Dear {customerName},

Thank you so much for your order! 🎉

📦 Order ID: #{orderId}
💰 Total: {amount}

We've received your payment proof and it's currently being reviewed. You'll receive a confirmation email once verified.

Estimated processing time: 24-48 hours

If you have any questions, don't hesitate to reach out!

Warm regards,
CARTSWIFT Team ❤️`
  }
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
  
  const { data: paymentProofs = [], isLoading, error, refetch } = useQuery({
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
      return (data || []) as PaymentProof[];
    },
  });

  const { data: giftCardPayments = [] } = useQuery({
    queryKey: ['gift-card-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_payments')
        .select('*');
      
      if (error) throw error;
      return (data || []) as GiftCardPayment[];
    },
  });

  const { data: cryptoPayments = [] } = useQuery({
    queryKey: ['crypto-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crypto_payments')
        .select('*');
      
      if (error) throw error;
      return (data || []) as CryptoPayment[];
    },
  });

  const { data: bankTransferPayments = [] } = useQuery({
    queryKey: ['bank-transfer-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_transfer_payments')
        .select('*');
      
      if (error) throw error;
      return (data || []) as BankTransferPayment[];
    },
  });

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

  const sendNotificationToUser = async (proof: PaymentProof, type: 'approved' | 'declined') => {
    const order = proof.orders;
    if (!order) {
      toast({
        title: 'Missing order details',
        description: 'This payment proof is not linked to an order record.',
        variant: 'destructive',
      });
      return;
    }

    setSendingNotification(proof.id);
    try {
      const title = type === 'approved' 
        ? '✅ Payment Approved!' 
        : '❌ Payment Declined';
      
      const body = type === 'approved'
        ? `Great news! Your payment for order #${proof.order_id.slice(0, 8)} has been verified. Your order is now being processed!`
        : `Your payment for order #${proof.order_id.slice(0, 8)} could not be verified. Please contact support or submit a new payment proof.`;

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

      await supabase.from('in_app_notifications').insert({
        session_id: order.session_id,
        notification_id: notification.id,
        title,
        body,
        icon_emoji: type === 'approved' ? '✅' : '❌',
        link_url: '/orders',
      });

      const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
        body: { notificationId: notification.id },
      });

      if (pushError) {
        console.error('Push notification error:', pushError);
      }

      toast({
        title: 'Notification Sent',
        description: `${type === 'approved' ? 'Approval' : 'Decline'} notification sent to ${order.full_name}`,
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

  // Open email client with template
  const openEmailTemplate = (proof: PaymentProof, templateKey: keyof typeof emailTemplates) => {
    const order = proof.orders;
    if (!order) {
      toast({
        title: 'Missing customer email',
        description: 'This payment proof is not linked to an order email.',
        variant: 'destructive',
      });
      return;
    }

    const template = emailTemplates[templateKey];
    const email = order.email;
    const customerName = order.full_name;
    const orderId = proof.order_id.slice(0, 8).toUpperCase();
    const amount = `$${Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    const subject = template.subject.replace('{orderId}', orderId);
    const body = template.body
      .replace(/{customerName}/g, customerName)
      .replace(/{orderId}/g, orderId)
      .replace(/{amount}/g, amount);

    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  };

  const handleApprove = async (proof: PaymentProof) => {
    const notes = adminNotes[proof.id] || '';
    await updateProofStatus.mutateAsync({ proofId: proof.id, status: 'verified', notes });
    await updateOrderStatus.mutateAsync({ orderId: proof.order_id, status: 'processing' });
    await sendNotificationToUser(proof, 'approved');
    toast({
      title: 'Payment Approved',
      description: `Payment verified and customer notified`,
    });
  };

  const handleDecline = async (proof: PaymentProof) => {
    const notes = adminNotes[proof.id] || '';
    await updateProofStatus.mutateAsync({ proofId: proof.id, status: 'rejected', notes });
    await sendNotificationToUser(proof, 'declined');
    toast({
      title: 'Payment Declined',
      description: `Payment rejected and customer notified`,
      variant: 'destructive',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-emerald-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      case 'under_review': return 'bg-blue-500 text-white';
      default: return 'bg-amber-500 text-white';
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

  const missingOrderCount = paymentProofs.filter((p) => !p.orders).length;

  const pendingCount = paymentProofs.filter((p) => p.status === 'pending').length;
  const verifiedCount = paymentProofs.filter((p) => p.status === 'verified').length;
  const rejectedCount = paymentProofs.filter((p) => p.status === 'rejected').length;

  const PaymentDetailsDialog = ({ proof }: { proof: PaymentProof }) => {
    const order = proof.orders;
    if (!order) {
      return (
        <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Missing Order Details
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">
            This payment proof is not linked to an order record (or the order is not accessible). Please refresh and try again.
          </p>
        </DialogContent>
      );
    }

    const giftCardPayment = getGiftCardPaymentForOrder(proof.order_id);
    const cryptoPayment = getCryptoPaymentForOrder(proof.order_id);
    const bankTransferPayment = getBankTransferPaymentForOrder(proof.order_id);

    return (
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <FileCheck className="h-5 w-5" />
            Payment Verification
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg border ${
            proof.status === 'verified' ? 'bg-emerald-950/50 border-emerald-500/50' :
            proof.status === 'rejected' ? 'bg-red-950/50 border-red-500/50' :
            'bg-amber-950/50 border-amber-500/50'
          }`}>
            <div className="flex items-center gap-3">
              {proof.status === 'verified' ? <CheckCircle className="h-5 w-5 text-emerald-400" /> :
               proof.status === 'rejected' ? <XCircle className="h-5 w-5 text-red-400" /> :
               <Clock className="h-5 w-5 text-amber-400" />}
              <div>
                <p className="font-semibold capitalize text-white">{proof.status.replace('_', ' ')}</p>
                <p className="text-sm text-slate-400">
                  {proof.status === 'pending' && 'Awaiting verification'}
                  {proof.status === 'verified' && 'Payment has been verified'}
                  {proof.status === 'rejected' && 'Payment was rejected'}
                </p>
              </div>
            </div>
          </div>

          {/* Order Information */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
                  <DollarSign className="h-5 w-5" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-white">
                <div>
                  <Label className="text-slate-400">Customer</Label>
                  <p className="font-medium">{order.full_name}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Email</Label>
                  <p className="font-medium text-amber-300">{order.email}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Order Total</Label>
                  <p className="font-medium text-lg text-emerald-400">${Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Payment Method</Label>
                  <Badge variant="outline" className="mt-1 border-amber-500/50 text-amber-300">
                    {proof.payment_method.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                {order.payment_reference && (
                  <div className="col-span-2">
                    <Label className="text-slate-400">Payment Reference</Label>
                    <p className="font-mono text-sm bg-slate-900/50 p-2 rounded border border-slate-700">{order.payment_reference}</p>
                  </div>
                )}
              </CardContent>
            </Card>

          {/* Email Templates */}
          <Card className="bg-slate-800/50 border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
                <Mail className="h-5 w-5" />
                Send Email to Customer
              </CardTitle>
              <CardDescription className="text-slate-400">Choose a template to open your email client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => openEmailTemplate(proof, 'approved')}
                  className="bg-emerald-950/50 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-200"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  ✅ Approval Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openEmailTemplate(proof, 'declined')}
                  className="bg-red-950/50 border-red-500/50 text-red-300 hover:bg-red-900/50 hover:text-red-200"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  ❌ Decline Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openEmailTemplate(proof, 'issue')}
                  className="bg-amber-950/50 border-amber-500/50 text-amber-300 hover:bg-amber-900/50 hover:text-amber-200"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  ⚠️ More Info Needed
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openEmailTemplate(proof, 'thankYou')}
                  className="bg-blue-950/50 border-blue-500/50 text-blue-300 hover:bg-blue-900/50 hover:text-blue-200"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  🙏 Thank You Email
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File Information */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-amber-400">Uploaded Proof</CardTitle>
            </CardHeader>
            <CardContent className="text-white">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-slate-400">File Name</Label>
                  <p className="font-medium">{proof.file_name}</p>
                </div>
                <div>
                  <Label className="text-slate-400">File Size</Label>
                  <p className="font-medium">{(proof.file_size / 1024).toFixed(1)} KB</p>
                </div>
                <div>
                  <Label className="text-slate-400">Proof Type</Label>
                  <p className="font-medium capitalize">{proof.proof_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Uploaded</Label>
                  <p className="font-medium">{new Date(proof.uploaded_at).toLocaleString()}</p>
                </div>
              </div>
              
              {proof.file_url && (
                <div className="space-y-3">
                  <img 
                    src={proof.file_url} 
                    alt={proof.file_name}
                    className="max-w-full max-h-72 object-contain rounded-lg border border-slate-700 bg-slate-900/50"
                  />
                  <Button
                    variant="outline"
                    onClick={() => window.open(proof.file_url, '_blank')}
                    className="border-amber-500/50 text-amber-300 hover:bg-amber-950/50"
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
            <Card className="border-emerald-500/30 bg-emerald-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-emerald-400">Gift Card Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">Brand</Label>
                    <p className="font-medium">{giftCardPayment.brand}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Estimated Value</Label>
                    <p className="font-medium">${Number(giftCardPayment.estimated_value).toFixed(2)}</p>
                  </div>
                </div>
                {giftCardPayment.card_code && (
                  <div>
                    <Label className="text-slate-400">Card Code</Label>
                    <p className="font-mono bg-slate-900/50 p-2 rounded border border-slate-700">{giftCardPayment.card_code}</p>
                  </div>
                )}
                {giftCardPayment.additional_notes && (
                  <div>
                    <Label className="text-slate-400">Additional Notes</Label>
                    <p className="text-sm">{giftCardPayment.additional_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {cryptoPayment && (
            <Card className="border-purple-500/30 bg-purple-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-purple-400">Cryptocurrency Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">Crypto Type</Label>
                    <p className="font-medium">{cryptoPayment.crypto_type}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Amount</Label>
                    <p className="font-medium">{getCurrencySymbol(cryptoPayment.currency || 'USD')}{Number(cryptoPayment.amount_usd).toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-400">Wallet Address</Label>
                  <p className="font-mono text-sm break-all bg-slate-900/50 p-2 rounded border border-slate-700">{cryptoPayment.wallet_address}</p>
                </div>
                {cryptoPayment.transaction_hash && (
                  <div>
                    <Label className="text-slate-400">Transaction Hash</Label>
                    <p className="font-mono text-sm break-all bg-slate-900/50 p-2 rounded border border-slate-700">{cryptoPayment.transaction_hash}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {bankTransferPayment && (
            <Card className="border-blue-500/30 bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-400">Bank Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-white">
                <div>
                  <Label className="text-slate-400">Amount</Label>
                  <p className="font-medium">${Number(bankTransferPayment.amount_usd).toFixed(2)}</p>
                </div>
                {bankTransferPayment.additional_notes && (
                  <div>
                    <Label className="text-slate-400">Additional Notes</Label>
                    <p className="text-sm">{bankTransferPayment.additional_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Admin Notes & Actions */}
          {proof.status === 'pending' && (
            <Card className="border-amber-500/50 bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-amber-400">Verification Actions</CardTitle>
                <CardDescription className="text-slate-400">Review the payment proof and approve or decline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-400">Admin Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any notes about this payment..."
                    value={adminNotes[proof.id] || ''}
                    onChange={(e) => setAdminNotes({ ...adminNotes, [proof.id]: e.target.value })}
                    className="mt-1 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleApprove(proof)}
                    disabled={sendingNotification === proof.id || updateProofStatus.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {sendingNotification === proof.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    ✅ Approve & Notify
                  </Button>
                  <Button 
                    onClick={() => handleDecline(proof)}
                    disabled={sendingNotification === proof.id || updateProofStatus.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {sendingNotification === proof.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    ❌ Decline & Notify
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show admin notes if already reviewed */}
          {proof.admin_notes && proof.status !== 'pending' && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-amber-400">Admin Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-white">
                <p>{proof.admin_notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Resend notification for already reviewed */}
          {proof.status !== 'pending' && (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => sendNotificationToUser(proof, proof.status === 'verified' ? 'approved' : 'declined')}
                disabled={sendingNotification === proof.id}
                className="border-amber-500/50 text-amber-300 hover:bg-amber-950/50"
              >
                {sendingNotification === proof.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Resend Push Notification
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    );
  };

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-red-500/50">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <p className="text-red-300 mb-4">Failed to load payment proofs</p>
              <p className="text-slate-400 text-sm mb-4">{(error as Error).message}</p>
              <Button onClick={() => refetch()} variant="outline" className="border-amber-500/50 text-amber-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-amber-400" />
              <div>
                <p className="text-2xl font-bold text-white">{paymentProofs.length}</p>
                <p className="text-sm text-amber-300/70">Total Proofs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-900 border-amber-500/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-400" />
              <div>
                <p className="text-2xl font-bold text-amber-300">{pendingCount}</p>
                <p className="text-sm text-amber-400/70">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border-emerald-500/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-emerald-300">{verifiedCount}</p>
                <p className="text-sm text-emerald-400/70">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-900 via-red-950/30 to-slate-900 border-red-500/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-300">{rejectedCount}</p>
                <p className="text-sm text-red-400/70">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-400">
            <FileCheck className="h-5 w-5" />
            Payment Submissions
          </CardTitle>
          <CardDescription className="text-slate-400">
            Review and verify customer payment proofs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          ) : paymentProofs.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">No payment proofs submitted yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {missingOrderCount > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-400" />
                  <div>
                    <p className="font-medium">{missingOrderCount} proof(s) have no linked order yet.</p>
                    <p className="text-amber-200/80">You can still open them and view the image; email templates require an order email.</p>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-800/50">
                      <TableHead className="text-amber-300">Customer</TableHead>
                      <TableHead className="text-amber-300">Payment Method</TableHead>
                      <TableHead className="text-amber-300">Amount</TableHead>
                      <TableHead className="text-amber-300">Status</TableHead>
                      <TableHead className="text-amber-300">Submitted</TableHead>
                      <TableHead className="text-right text-amber-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentProofs.map((proof) => {
                      const order = proof.orders;
                      return (
                        <TableRow
                          key={proof.id}
                          className={`border-slate-700 hover:bg-slate-800/50 ${proof.status === 'pending' ? 'bg-amber-950/20' : ''}`}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-white">{order?.full_name ?? 'Unlinked payment proof'}</p>
                              <p className="text-sm text-amber-300/70">{order?.email ?? `Proof ID: ${proof.id.slice(0, 8)}`}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize border-amber-500/50 text-amber-300">
                              {proof.payment_method.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-400">
                            {order ? `$${Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(proof.status)}>
                              {proof.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {proof.status === 'verified' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {proof.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                              {proof.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {new Date(proof.uploaded_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant={proof.status === 'pending' ? 'default' : 'outline'}
                                  size="sm"
                                  className={
                                    proof.status === 'pending'
                                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                      : 'border-amber-500/50 text-amber-300 hover:bg-amber-950/50'
                                  }
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {proof.status === 'pending' ? 'Review' : 'View'}
                                </Button>
                              </DialogTrigger>
                              <PaymentDetailsDialog proof={proof} />
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4" />
              Failed to load payment proofs: {(error as any).message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentProofsManagement;