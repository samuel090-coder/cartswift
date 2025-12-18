import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Package, Bell, BellRing } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PaymentConfirmationProps {
  orderData: {
    id: string;
    paymentMethod: string;
    total: number;
    estimatedDelivery: string;
    paymentReference?: string;
    currency?: string;
  };
  onContinueShopping: () => void;
}

const PaymentConfirmation = ({ orderData, onContinueShopping }: PaymentConfirmationProps) => {
  const { isSubscribed, isSupported, subscribe, loading: subscribing } = usePushNotifications();
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);

  // Show subscription prompt after a delay
  useEffect(() => {
    if (isSupported && !isSubscribed) {
      const timer = setTimeout(() => setShowSubscribePrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed]);

  const handleSubscribe = async () => {
    await subscribe();
    setShowSubscribePrompt(false);
  };

  const getCurrencySymbol = (currency?: string) => {
    const symbols: Record<string, string> = {
      'USD': '$', 'NGN': '₦', 'EUR': '€', 'GBP': '£',
      'JPY': '¥', 'CNY': '¥', 'INR': '₹', 'AUD': 'A$', 'CAD': 'C$',
    };
    return symbols[currency || 'USD'] || '$';
  };

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
      <div className="w-full max-w-md space-y-4">
        <Card>
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
                <span className="text-sm font-semibold">
                  {getCurrencySymbol(orderData.currency)}{orderData.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
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

        {/* Push Notification Subscription Prompt */}
        {showSubscribePrompt && !isSubscribed && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 animate-fade-in">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-full shrink-0">
                  <BellRing className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground">Get Order Updates</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable notifications to receive instant updates when your payment is approved or your order ships.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSubscribe}
                      disabled={subscribing}
                      className="gap-2"
                    >
                      <Bell className="h-4 w-4" />
                      {subscribing ? 'Enabling...' : 'Enable Notifications'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setShowSubscribePrompt(false)}
                    >
                      Maybe Later
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success message after subscribing */}
        {isSubscribed && (
          <Card className="border-green-500/30 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800">
                  Notifications enabled! You'll be notified when your order status changes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PaymentConfirmation;
