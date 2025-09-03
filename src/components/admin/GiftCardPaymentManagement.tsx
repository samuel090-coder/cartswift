import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type GiftCardPayment = Database['public']['Tables']['gift_card_payments']['Row'];
type PaymentProof = Database['public']['Tables']['payment_proofs']['Row'];

const GiftCardPaymentManagement = () => {
  const { data: giftCardPayments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-gift-card-payments'],
    queryFn: async () => {
      console.log('Fetching gift card payments for admin dashboard...');
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
      
      if (error) {
        console.error('Error fetching gift card payments:', error);
        throw error;
      }
      
      console.log('Successfully fetched gift card payments:', data?.length || 0, 'records');
      return data as (GiftCardPayment & { orders: any })[];
    },
  });

  const { data: paymentProofs = [], error: proofsError } = useQuery({
    queryKey: ['admin-payment-proofs-gift-card'],
    queryFn: async () => {
      console.log('Fetching gift card payment proofs...');
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('payment_method', 'gift_card')
        .order('uploaded_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching gift card payment proofs:', error);
        throw error;
      }
      
      console.log('Successfully fetched gift card payment proofs:', data?.length || 0, 'records');
      return data as PaymentProof[];
    },
  });

  const getProofForPayment = (orderId: string) => {
    return paymentProofs.find(proof => proof.order_id === orderId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading gift card payments...</p>
        </div>
      </div>
    );
  }

  if (error || proofsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error Loading Data</h3>
        <p className="text-red-600 text-sm mt-1">
          {error?.message || proofsError?.message || 'Failed to load gift card payments'}
        </p>
        <button 
          onClick={() => {
            refetch();
            window.location.reload();
          }}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gift Card Payments ({giftCardPayments.length})</CardTitle>
          <button 
            onClick={() => refetch()}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Refresh
          </button>
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
                        {payment.card_code || 'Not provided'}
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