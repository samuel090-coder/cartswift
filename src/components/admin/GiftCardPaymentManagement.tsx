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
      
      // Fetch all payment proofs (not just gift_card) to see what's available
      const { data, error } = await supabase
        .from('payment_proofs')
        .select(`
          *,
          orders (
            id,
            full_name,
            email,
            payment_method
          )
        `)
        .order('uploaded_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching payment proofs:', error);
        throw error;
      }
      
      console.log('Successfully fetched payment proofs:', data?.length || 0, 'records');
      console.log('Payment proofs data:', data);
      
      // Filter for gift card related proofs (including orphaned ones)
      const giftCardProofs = data?.filter(proof => 
        proof.payment_method === 'gift_card' || 
        proof.proof_type === 'gift_card_image' ||
        proof.proof_type === 'gift_card_receipt' ||
        (proof.orders && proof.orders.payment_method === 'gift_card')
      ) || [];
      
      console.log('Filtered gift card payment proofs:', giftCardProofs.length, 'records');
      return giftCardProofs as (PaymentProof & { orders: any })[];
    },
  });

  const getProofForPayment = (orderId: string) => {
    console.log(`Looking for proof for order: ${orderId}`);
    console.log('Available proofs:', paymentProofs.map(p => ({ 
      id: p.id, 
      order_id: p.order_id, 
      payment_method: p.payment_method,
      file_url: p.file_url 
    })));
    
    const proof = paymentProofs.find(proof => proof.order_id === orderId);
    console.log(`Found proof for order ${orderId}:`, proof);
    return proof;
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
      {/* All Payment Proof Images Section */}
      <Card>
        <CardHeader>
          <CardTitle>All Gift Card Payment Proof Images</CardTitle>
          <p className="text-sm text-gray-600">Click any image to view full size</p>
        </CardHeader>
        <CardContent>
          {paymentProofs.length === 0 ? (
            <p className="text-gray-500">No payment proofs found</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {paymentProofs.map((proof) => (
                <div key={proof.id} className="space-y-2">
                  <div 
                    className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    onClick={() => window.open(proof.file_url, '_blank')}
                  >
                    <img 
                      src={proof.file_url} 
                      alt={proof.file_name || 'Payment proof'}
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', proof.file_url);
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-medium truncate">{proof.file_name || 'Unknown'}</div>
                    <div className="text-gray-500">{new Date(proof.uploaded_at).toLocaleDateString()}</div>
                    <Badge variant="outline" className="text-xs">
                      {proof.status || 'pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                        <div className="space-y-2">
                          <div className="relative">
                            <img 
                              src={proof.file_url} 
                              alt="Payment proof"
                              className="w-20 h-20 object-cover rounded border shadow-sm"
                              onError={(e) => {
                                console.error('Image failed to load:', proof.file_url);
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                              onLoad={() => {
                                console.log('Image loaded successfully:', proof.file_url);
                              }}
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <Badge variant={proof.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                              {proof.status || 'pending'}
                            </Badge>
                            <button
                              onClick={() => {
                                console.log('Opening image:', proof.file_url);
                                window.open(proof.file_url, '_blank');
                              }}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors w-full"
                            >
                              View Full Image
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">
                            {proof.file_name || 'Unknown file'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-gray-400 text-sm">No proof uploaded</div>
                          <div className="text-xs text-gray-300 mt-1">Order ID: {payment.order_id}</div>
                        </div>
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