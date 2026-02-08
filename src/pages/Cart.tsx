import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowLeft, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import Header from '@/components/Header';
import AnimatedBackground from '@/components/AnimatedBackground';
import SEOHead from '@/components/SEOHead';

const Cart = () => {
  const { items, updateQuantity, removeFromCart, total, getCurrencySymbol } = useCart();

  const savings = items.reduce((sum, item) => sum + (item.price * item.quantity * 0.1), 0);

  if (items.length === 0) {
    return (
      <AnimatedBackground>
        <SEOHead 
          title="Shopping Cart - CartSwift"
          description="Review your selected items and proceed to secure checkout."
          canonical="https://cartswift.lovable.app/cart"
        />
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some items to get started!</p>
            <Link to="/">
              <Button variant="outline" className="border-border text-foreground hover:bg-secondary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <SEOHead 
        title="Shopping Cart - CartSwift"
        description="Review your selected items and proceed to secure checkout."
        canonical="https://cartswift.lovable.app/cart"
      />
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-secondary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Shopping Cart ({items.length} items)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border border-border/50 rounded-lg bg-secondary/30">
                      <img src={item.image} alt={item.title} className="w-16 h-16 object-cover rounded-lg" />
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{item.title}</h3>
                        <p className="text-lg font-bold text-neon-emerald">{getCurrencySymbol(item.currency)}{item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-secondary" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-foreground">{item.quantity}</span>
                        <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-secondary" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {savings > 0 && (
                    <div className="flex items-center justify-between p-3 bg-neon-emerald/10 rounded-lg border border-neon-emerald/20">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-neon-emerald" />
                        <span className="text-sm font-medium text-neon-emerald">You're saving</span>
                      </div>
                      <span className="font-bold text-neon-emerald">
                        {getCurrencySymbol(items[0].currency)}{savings.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-foreground">
                    <span>Subtotal</span>
                    <span>{getCurrencySymbol(items[0].currency)}{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-foreground">
                    <span>Shipping</span>
                    <span className="text-neon-emerald font-medium">Free</span>
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between font-bold text-lg text-foreground">
                      <span>Total</span>
                      <span>{getCurrencySymbol(items[0].currency)}{total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Link to="/checkout" className="block">
                    <Button className="w-full btn-premium" size="lg">
                      Proceed to Checkout
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default Cart;
