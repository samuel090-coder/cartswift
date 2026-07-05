import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyPaystackPayment } from '@/lib/paystack';

export default function PaymentReturn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your Paystack payment…');

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref') || params.get('ref');
    const target = params.get('target') || 'order';
    const id = params.get('id');
    const kind = params.get('kind') || target;

    (async () => {
      if (!reference) {
        setStatus('failed');
        setMessage('Missing payment reference.');
        return;
      }

      try {
        console.info('[PaymentReturn] verifying Paystack payment', { reference, target, id, kind });
        const data = await verifyPaystackPayment({ reference, target, id });
        if (data?.error) throw new Error(data.error);
        setStatus('success');
        setMessage(kind === 'download' ? 'Payment confirmed. Your download access is being prepared.' : 'Payment confirmed successfully.');
      } catch (error: any) {
        console.error('[PaymentReturn] verification failed', error);
        setStatus('failed');
        setMessage(error?.message || 'Payment could not be verified. If you were charged, webhook confirmation may still complete shortly.');
      }
    })();
  }, [params]);

  const Icon = status === 'verifying' ? Loader2 : status === 'success' ? CheckCircle2 : XCircle;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-primary/5 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-xl">
        <Icon className={`mx-auto mb-4 h-14 w-14 ${status === 'verifying' ? 'animate-spin text-primary' : status === 'success' ? 'text-emerald-500' : 'text-destructive'}`} />
        <h1 className="mb-2 text-2xl font-bold">{status === 'verifying' ? 'Verifying payment' : status === 'success' ? 'Payment successful' : 'Verification failed'}</h1>
        <p className="mb-5 text-sm text-muted-foreground">{message}</p>
        {status !== 'verifying' && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/orders')}>Orders</Button>
            <Button className="flex-1" onClick={() => navigate('/')}>Home</Button>
          </div>
        )}
      </div>
    </div>
  );
}