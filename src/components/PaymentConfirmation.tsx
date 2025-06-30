
import { CheckCircle, Clock, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PaymentConfirmationProps {
  orderData: {
    id: string;
    paymentMethod: string;
    total: number;
    estimatedDelivery: string;
    paymentReference?: string;
  };
  onContinueShopping: () => void;
}

const PaymentConfirmation = ({ orderData, onContinueShopping }: PaymentConfirmationProps) => {
  const getStatusMessage = () => {
    switch (orderData.paymentMethod) {
      case 'credit_card':
        return {
          title: "Payment Successful!",
          message: "Your payment has been processed successfully.",
          status: "confirmed",
          icon: CheckCircle,
          color: "text-green-600"
        };
      case 'bank_transfer':
      case 'gift_card':
      case 'crypto_eth':
        return {
          title: "Order Submitted!",
          message: "Your order is under review. We'll confirm it within 30 minutes to 2 hours.",
          status: "pending",
          icon: Clock,
          color: "text-yellow-600"
        };
      default:
        return {
          title: "Order Received!",
          message: "Your order has been received and is being processed.",
          status: "processing",
          icon: Package,
          color: "text-blue-600"
        };
    }
  };

  const statusInfo = getStatusMessage();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <StatusIcon className={`h-16 w-16 ${statusInfo.color}`} />
          </div>
          <CardTitle className="text-2xl">{statusInfo.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-gray-600">{statusInfo.message}</p>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Order ID:</span>
              <span className="text-sm font-mono">{orderData.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-sm font-semibold">${orderData.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Payment Method:</span>
              <Badge variant="outline" className="text-xs">
                {orderData.paymentMethod.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            {orderData.paymentReference && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Reference:</span>
                <span className="text-sm font-mono">{orderData.paymentReference}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimated Delivery:</span>
              <span className="text-sm">{orderData.estimatedDelivery}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button onClick={onContinueShopping} className="w-full">
              Continue Shopping
            </Button>
            <p className="text-xs text-gray-500">
              You will receive email updates about your order status
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentConfirmation;
