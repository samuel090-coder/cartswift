import React, { useState } from 'react';
import { Bell, X, Clock, User, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/contexts/NotificationContext';
import { format } from 'date-fns';

interface NotificationBellProps {
  onOrderClick?: (orderId: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onOrderClick }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = async (notificationId: string, orderId: string) => {
    await markAsRead(notificationId);
    if (onOrderClick) {
      onOrderClick(orderId);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const formatPaymentMethod = (method: string) => {
    const methodMap: Record<string, string> = {
      'cryptocurrency': 'Crypto',
      'bank_transfer': 'Bank Transfer',
      'credit_card': 'Credit Card',
      'paypal': 'PayPal',
      'gift_card': 'Gift Card',
      'cash_app': 'Cash App',
      'crypto_eth': 'Ethereum'
    };
    return methodMap[method] || method;
  };

  const getOrderItemsText = (order: any) => {
    if (!order?.order_items?.length) return 'No items';
    
    const itemCount = order.order_items.length;
    const firstItem = order.order_items[0]?.items?.title || 'Unknown item';
    
    if (itemCount === 1) return firstItem;
    return `${firstItem} +${itemCount - 1} more`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleMarkAllRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification.id, notification.order_id)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              !notification.is_read ? 'bg-blue-500' : 'bg-gray-300'
                            }`} />
                            <span className="font-medium text-sm">New Order</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(notification.created_at), 'MMM d, HH:mm')}
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {notification.orders?.full_name || 'Unknown Customer'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {formatPaymentMethod(notification.orders?.payment_method || '')}
                            </span>
                          </div>
                          
                          <div className="text-muted-foreground">
                            {getOrderItemsText(notification.orders)}
                          </div>
                          
                          <div className="font-medium text-green-600">
                            ${notification.orders?.total_amount || '0.00'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;