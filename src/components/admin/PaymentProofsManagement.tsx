
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Eye, ExternalLink } from 'lucide-react';
import { useState } from 'react';

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
  };
  gift_card_payments?: Array<{
    brand: string;
    estimated_value: number;
    card_code: string;
    additional_notes: string;
  }>;
  crypto_payments?: Array<{
    crypto_type: string;
    amount_usd: number;
    wallet_address: string;
    transaction_hash: string;
  }>;
  bank_transfer_payments?: Array<{
    amount_usd: number;
    additional_notes: string;
  }>;
};

const PaymentProofsManagement = () => {
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);

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
            gift_card_payments (*),
            crypto_payments (*),
            bank_transfer_payments (*)
          )
        `)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as PaymentProof[];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const PaymentDetailsDialog = ({ proof }: { proof: PaymentProof }) => (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Payment Proof Details</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <strong>Customer:</strong> {proof.orders.full_name}
            </div>
            <div>
              <strong>Email:</strong> {proof.orders.email}
            </div>
            <div>
              <strong>Order Total:</strong> ${Number(proof.orders.total_amount).toFixed(2)}
            </div>
            <div>
              <strong>Payment Method:</strong> {proof.payment_method.replace('_', ' ').toUpperCase()}
            </div>
            {proof.orders.payment_reference && (
              <div className="col-span-2">
                <strong>Payment Reference:</strong> {proof.orders.payment_reference}
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uploaded File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><strong>File Name:</strong> {proof.file_name}</div>
              <div><strong>File Size:</strong> {(proof.file_size / 1024).toFixed(1)} KB</div>
              <div><strong>Proof Type:</strong> {proof.proof_type.replace('_', ' ')}</div>
              <div><strong>Uploaded:</strong> {new Date(proof.uploaded_at).toLocaleString()}</div>
            </div>
            
            {proof.file_url && (
              <div className="space-y-2">
                <img 
                  src={proof.file_url} 
                  alt={proof.file_name}
                  className="max-w-full max-h-64 object-contain rounded border"
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
        {proof.orders.gift_card_payments?.map((giftCard, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg text-green-800">Gift Card Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><strong>Brand:</strong> {giftCard.brand}</div>
              <div><strong>Estimated Value:</strong> ${Number(giftCard.estimated_value).toFixed(2)}</div>
              {giftCard.card_code && <div><strong>Card Code:</strong> {giftCard.card_code}</div>}
              {giftCard.additional_notes && (
                <div><strong>Additional Notes:</strong> {giftCard.additional_notes}</div>
              )}
            </CardContent>
          </Card>
        ))}

        {proof.orders.crypto_payments?.map((crypto, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg text-purple-800">Cryptocurrency Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><strong>Crypto Type:</strong> {crypto.crypto_type}</div>
              <div><strong>Amount (USD):</strong> ${Number(crypto.amount_usd).toFixed(2)}</div>
              <div>
                <strong>Wallet Address:</strong>
                <p className="font-mono text-sm break-all">{crypto.wallet_address}</p>
              </div>
              {crypto.transaction_hash && (
                <div>
                  <strong>Transaction Hash:</strong>
                  <p className="font-mono text-sm break-all">{crypto.transaction_hash}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {proof.orders.bank_transfer_payments?.map((bank, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg text-blue-800">Bank Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><strong>Amount (USD):</strong> ${Number(bank.amount_usd).toFixed(2)}</div>
              {bank.additional_notes && (
                <div><strong>Additional Notes:</strong> {bank.additional_notes}</div>
              )}
            </CardContent>
          </Card>
        ))}

        {proof.admin_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Admin Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {proof.admin_notes}
            </CardContent>
          </Card>
        )}
      </div>
    </DialogContent>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Payment Proofs</h2>
        <div className="text-sm text-gray-600">
          Total Proofs: {paymentProofs.length}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payment Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading payment proofs...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Proof Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentProofs.map((proof) => (
                  <TableRow key={proof.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{proof.orders.full_name}</div>
                        <div className="text-sm text-gray-500">{proof.orders.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {proof.payment_method.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {proof.proof_type.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      ${Number(proof.orders.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(proof.status)}>
                        {proof.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(proof.uploaded_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <PaymentDetailsDialog proof={proof} />
                      </Dialog>
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

export default PaymentProofsManagement;
