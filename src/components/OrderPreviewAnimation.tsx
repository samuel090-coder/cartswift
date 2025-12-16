import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  images?: string[];
  currency?: string;
}

interface OrderPreviewAnimationProps {
  items: CartItem[];
  onProceedToPayment: () => void;
  getCurrencySymbol: (currency: string) => string;
}

const OrderPreviewAnimation: React.FC<OrderPreviewAnimationProps> = ({
  items,
  onProceedToPayment,
  getCurrencySymbol
}) => {
  const [animationPhase, setAnimationPhase] = useState<'product' | 'transform' | 'truck' | 'delivery' | 'ready'>('product');

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    // Phase 1: Show product (1s)
    timers.push(setTimeout(() => setAnimationPhase('transform'), 1000));
    // Phase 2: Transform to package (1.5s)
    timers.push(setTimeout(() => setAnimationPhase('truck'), 2500));
    // Phase 3: Truck arrives (2s)
    timers.push(setTimeout(() => setAnimationPhase('delivery'), 4500));
    // Phase 4: Delivery man picks up (2s)
    timers.push(setTimeout(() => setAnimationPhase('ready'), 6500));
    
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const firstItem = items[0];
  const productImage = firstItem?.images?.[0] || '/placeholder.svg';

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Animated ground/floor */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-muted/50 to-transparent" />
      
      {/* Main animation stage */}
      <div className="relative w-full max-w-2xl h-96 flex items-end justify-center pb-8">
        
        {/* Product Image - Phase 1 */}
        <AnimatePresence>
          {animationPhase === 'product' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
              transition={{ duration: 0.5 }}
              className="absolute bottom-20"
            >
              <div className="relative">
                <img 
                  src={productImage} 
                  alt={firstItem?.title} 
                  className="w-40 h-40 object-cover rounded-xl shadow-2xl"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold"
                >
                  {items.reduce((acc, item) => acc + item.quantity, 0)}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transform to Package - Phase 2 */}
        <AnimatePresence>
          {animationPhase === 'transform' && (
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.8, type: 'spring' }}
              className="absolute bottom-20"
            >
              <motion.div
                animate={{ 
                  rotateZ: [0, -5, 5, -5, 0],
                  y: [0, -10, 0]
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="relative"
              >
                {/* Package Box */}
                <div className="w-36 h-36 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg shadow-2xl relative overflow-hidden">
                  {/* Box tape */}
                  <div className="absolute top-1/2 left-0 right-0 h-4 bg-amber-400 -translate-y-1/2" />
                  <div className="absolute top-0 bottom-0 left-1/2 w-4 bg-amber-400 -translate-x-1/2" />
                  {/* Shine effect */}
                  <motion.div
                    animate={{ x: [-100, 200] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-20 skew-x-12"
                  />
                </div>
                {/* Sparkles */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                      x: Math.cos(i * 72 * Math.PI / 180) * 60,
                      y: Math.sin(i * 72 * Math.PI / 180) * 60
                    }}
                    transition={{ duration: 1, delay: i * 0.1, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-400 rounded-full"
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delivery Truck - Phase 3 */}
        <AnimatePresence>
          {(animationPhase === 'truck' || animationPhase === 'delivery' || animationPhase === 'ready') && (
            <>
              {/* Package on ground */}
              <motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ 
                  opacity: animationPhase === 'ready' ? 0 : 1, 
                  y: 0,
                  x: animationPhase === 'delivery' || animationPhase === 'ready' ? -80 : 0
                }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg shadow-xl">
                  <div className="absolute top-1/2 left-0 right-0 h-3 bg-amber-400 -translate-y-1/2" />
                  <div className="absolute top-0 bottom-0 left-1/2 w-3 bg-amber-400 -translate-x-1/2" />
                </div>
              </motion.div>

              {/* Truck */}
              <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 80, opacity: 1 }}
                transition={{ duration: 1, type: 'spring', stiffness: 50 }}
                className="absolute bottom-16 right-0"
              >
                <div className="relative">
                  {/* Truck body */}
                  <div className="w-48 h-28 bg-gradient-to-b from-blue-500 to-blue-700 rounded-lg shadow-xl relative">
                    {/* Cargo area */}
                    <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-b from-blue-600 to-blue-800 rounded-l-lg border-r-4 border-blue-400">
                      <div className="absolute inset-2 border-2 border-dashed border-blue-400/50 rounded" />
                    </div>
                    {/* Cabin */}
                    <div className="absolute right-0 top-2 w-14 h-20 bg-gradient-to-b from-blue-400 to-blue-600 rounded-r-lg">
                      {/* Window */}
                      <div className="absolute top-2 right-2 w-8 h-8 bg-sky-300 rounded border-2 border-blue-300" />
                    </div>
                    {/* Logo */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Truck className="w-8 h-8 text-white/80" />
                    </div>
                  </div>
                  {/* Wheels */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.5, ease: 'linear' }}
                    className="absolute -bottom-3 left-6 w-10 h-10 bg-gray-800 rounded-full border-4 border-gray-600"
                  >
                    <div className="absolute inset-2 bg-gray-500 rounded-full" />
                  </motion.div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.5, ease: 'linear' }}
                    className="absolute -bottom-3 right-4 w-10 h-10 bg-gray-800 rounded-full border-4 border-gray-600"
                  >
                    <div className="absolute inset-2 bg-gray-500 rounded-full" />
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Delivery Man - Phase 4 & 5 */}
        <AnimatePresence>
          {(animationPhase === 'delivery' || animationPhase === 'ready') && (
            <motion.div
              initial={{ x: 120, opacity: 0 }}
              animate={{ 
                x: animationPhase === 'ready' ? -20 : 0, 
                opacity: 1 
              }}
              transition={{ duration: 0.8, type: 'spring' }}
              className="absolute bottom-16 left-1/2"
            >
              <div className="relative">
                {/* Delivery person body */}
                <motion.div
                  animate={animationPhase === 'ready' ? { y: [0, -5, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="relative"
                >
                  {/* Head */}
                  <div className="w-12 h-12 bg-gradient-to-b from-amber-200 to-amber-300 rounded-full mx-auto relative">
                    {/* Cap */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-14 h-6 bg-blue-600 rounded-t-full" />
                    {/* Face */}
                    <div className="absolute top-4 left-2 w-2 h-2 bg-gray-800 rounded-full" />
                    <div className="absolute top-4 right-2 w-2 h-2 bg-gray-800 rounded-full" />
                    {/* Smile */}
                    <motion.div
                      animate={{ scaleY: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 border-b-2 border-gray-800 rounded-b-full"
                    />
                  </div>
                  
                  {/* Body/Uniform */}
                  <div className="w-16 h-20 bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg mx-auto mt-1 relative">
                    {/* Badge */}
                    <div className="absolute top-2 left-2 w-4 h-4 bg-yellow-400 rounded" />
                    {/* Pocket */}
                    <div className="absolute bottom-4 right-2 w-5 h-6 bg-blue-700 rounded-sm" />
                  </div>
                  
                  {/* Arms with package (when ready) */}
                  {animationPhase === 'ready' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-14 left-1/2 -translate-x-1/2"
                    >
                      {/* Arms */}
                      <div className="flex gap-8">
                        <div className="w-4 h-12 bg-blue-700 rounded-full -rotate-12" />
                        <div className="w-4 h-12 bg-blue-700 rounded-full rotate-12" />
                      </div>
                      {/* Package in hands */}
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="absolute -top-2 left-1/2 -translate-x-1/2"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded shadow-lg">
                          <div className="absolute top-1/2 left-0 right-0 h-2 bg-amber-400 -translate-y-1/2" />
                          <div className="absolute top-0 bottom-0 left-1/2 w-2 bg-amber-400 -translate-x-1/2" />
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                  
                  {/* Legs */}
                  <div className="flex gap-2 justify-center mt-1">
                    <motion.div
                      animate={animationPhase !== 'ready' ? { rotateZ: [-5, 5, -5] } : {}}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="w-5 h-16 bg-gray-800 rounded-b-lg"
                    />
                    <motion.div
                      animate={animationPhase !== 'ready' ? { rotateZ: [5, -5, 5] } : {}}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="w-5 h-16 bg-gray-800 rounded-b-lg"
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Text */}
      <motion.div
        key={animationPhase}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {animationPhase === 'product' && 'Preparing Your Order...'}
          {animationPhase === 'transform' && 'Packaging Your Items...'}
          {animationPhase === 'truck' && 'Delivery On The Way!'}
          {animationPhase === 'delivery' && 'Almost Ready...'}
          {animationPhase === 'ready' && 'Ready For Delivery!'}
        </h2>
        <p className="text-muted-foreground">
          {animationPhase === 'ready' 
            ? 'Complete your payment to dispatch your order' 
            : 'Please wait...'}
        </p>
      </motion.div>

      {/* Order Summary */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: animationPhase === 'ready' ? 1 : 0.5, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-border/50 max-w-md w-full mx-4"
      >
        <h3 className="text-lg font-semibold mb-4 text-center">Order Summary</h3>
        <div className="space-y-3 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                {item.title} × {item.quantity}
              </span>
              <span className="font-medium">
                {getCurrencySymbol(item.currency || 'USD')}{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3 flex justify-between items-center font-bold">
          <span>Total</span>
          <span className="text-primary text-xl">
            {getCurrencySymbol(items[0]?.currency || 'USD')}
            {items.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}
          </span>
        </div>
      </motion.div>

      {/* Proceed Button */}
      <AnimatePresence>
        {animationPhase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="mt-8"
          >
            <Button
              onClick={onProceedToPayment}
              size="lg"
              className="px-12 py-6 text-lg font-bold shadow-2xl hover:shadow-primary/25 transition-all duration-300"
            >
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                Proceed to Payment
              </motion.span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderPreviewAnimation;
