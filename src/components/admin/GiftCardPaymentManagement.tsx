import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type GiftCardPayment = Database['public']['Tables']['gift_card_payments']['Row'];
type PaymentProof = Database['public']['Tables']['payment_proofs']['Row'];

const GiftCardPaymentManagement = () => {
  const { data: giftCardPayments = [], isLoading } = useQuery({
    queryKey: ['admin-gift-card-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_payments')
        .select(`
          *,
          orders (
            id,
            full_name,
            email,
            total_amount,
            status,
            created_at
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (GiftCardPayment & { orders: any })[];
    },
  });

  const { data: paymentProofs = [] } = useQuery({
    queryKey: ['admin-payment-proofs-gift-card'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('payment_method', 'gift_card')
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as PaymentProof[];
    },
  });

  const getProofForPayment = (orderId: string) => {
    return paymentProofs.find(proof => proof.order_id === orderId);
  };

  if (isLoading) {
    return <div>Loading gift card payments...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gift Card Payments ({giftCardPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Estimated Value</TableHead>
                <TableHead>Card Code</TableHead>
                <TableHead>Order Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giftCardPayments.map((payment) => {
                const proof = getProofForPayment(payment.order_id || '');
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.orders?.full_name}</div>
                        <div className="text-sm text-gray-500">{payment.orders?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.brand}</Badge>
                    </TableCell>
                    <TableCell>${payment.estimated_value}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {payment.card_code ? 
                          `${payment.card_code.substring(0, 4)}***` : 
                          'Not provided'
                        }
                      </span>
                    </TableCell>
                    <TableCell>${payment.orders?.total_amount}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={payment.orders?.status === 'delivered' ? 'default' : 'secondary'}
                      >
                        {payment.orders?.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {proof ? (
                        <div className="space-y-1">
                          <img 
                            src={proof.file_url} 
                            alt="Payment proof"
                            className="w-16 h-16 object-cover rounded border"
                          />
                          <Badge variant={proof.status === 'approved' ? 'default' : 'secondary'}>
                            {proof.status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-gray-400">No proof uploaded</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm">{payment.additional_notes || 'No notes'}</p>
                        {proof?.admin_notes && (
                          <p className="text-xs text-blue-600 mt-1">Admin: {proof.admin_notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(payment.created_at || '').toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default GiftCardPaymentManagement;