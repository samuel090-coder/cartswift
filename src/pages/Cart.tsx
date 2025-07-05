
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import Header from '@/components/Header';
import AnimatedBackground from '@/components/AnimatedBackground';

import SEOHead from '@/components/SEOHead';

const Cart = () => {
  const { items, updateQuantity, removeFromCart, total } = useCart();

  if (items.length === 0) {
    return (
      <AnimatedBackground>
        <SEOHead 
          title="Shopping Cart - CartSwift"
          description="Review your selected items and proceed to secure checkout. Fast delivery and amazing deals at CartSwift."
          canonical="https://cartswift.lovable.app/cart"
        />
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4 text-white">Your cart is empty</h2>
            <p className="text-white/80 mb-6">Add some items to get started!</p>
            <Link to="/">
              <Button className="bg-white/10 text-white border border-white/20 hover:bg-white/20">
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
        description="Review your selected items and proceed to secure checkout. Fast delivery and amazing deals at CartSwift."
        canonical="https://cartswift.lovable.app/cart"
      />
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Shopping Cart ({items.length} items)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border border-white/20 rounded-lg bg-white/5">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{item.title}</h3>
                        <p className="text-lg font-bold text-blue-light">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-white">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-white">
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Shipping</span>
                    <span className="text-green-400">Free</span>
                  </div>
                  <div className="border-t border-white/20 pt-4">
                    <div className="flex justify-between font-bold text-lg text-white">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Link to="/checkout" className="block">
                    <Button 
                      className="w-full bg-white/10 text-white border border-white/20 hover:bg-white/20" 
                      size="lg"
                      onClick={() => {
                        console.log('Checkout button clicked, cart items:', items);
                        console.log('Total amount:', total);
                      }}
                    >
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
