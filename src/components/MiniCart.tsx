import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MiniCart = () => {
  const { items, updateQuantity, removeFromCart, total, itemCount, getCurrencySymbol } = useCart();

  const savings = items.reduce((sum, item) => {
    // Mock savings calculation (10% average discount)
    return sum + (item.price * item.quantity * 0.1);
  }, 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-secondary">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-primary text-primary-foreground animate-pulse">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-card border-border w-[350px] sm:w-[400px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Cart ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg mb-2">Your cart is empty</p>
            <p className="text-muted-foreground text-sm">Add items to get started!</p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-3 p-3 bg-secondary/50 rounded-lg border border-border/30"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-14 h-14 object-cover rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate">{item.title}</h4>
                      <p className="text-sm font-bold text-neon-emerald">
                        {getCurrencySymbol(item.currency)}{item.price.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-6 w-6 flex items-center justify-center rounded bg-secondary hover:bg-muted text-foreground transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-medium text-foreground w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-6 w-6 flex items-center justify-center rounded bg-secondary hover:bg-muted text-foreground transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="ml-auto h-6 w-6 flex items-center justify-center rounded text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Savings & Summary */}
            <div className="border-t border-border pt-4 space-y-3">
              {savings > 0 && (
                <div className="flex items-center justify-between p-2 bg-neon-emerald/10 rounded-lg border border-neon-emerald/20">
                  <span className="text-xs font-medium text-neon-emerald">💰 You're saving</span>
                  <span className="text-sm font-bold text-neon-emerald">
                    {items.length > 0 ? getCurrencySymbol(items[0].currency) : '$'}{savings.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold text-foreground">
                  {items.length > 0 ? getCurrencySymbol(items[0].currency) : '$'}{total.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Shipping</span>
                <span className="text-neon-emerald font-medium">FREE</span>
              </div>

              <Link to="/checkout" className="block">
                <Button className="w-full btn-premium" size="lg">
                  Checkout — {items.length > 0 ? getCurrencySymbol(items[0].currency) : '$'}{total.toFixed(2)}
                </Button>
              </Link>

              <Link to="/cart" className="block">
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground text-sm">
                  View Full Cart
                </Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MiniCart;
