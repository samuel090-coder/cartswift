import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    
    timers.push(setTimeout(() => setAnimationPhase('transform'), 1500));
    timers.push(setTimeout(() => setAnimationPhase('truck'), 3500));
    timers.push(setTimeout(() => setAnimationPhase('delivery'), 6000));
    timers.push(setTimeout(() => setAnimationPhase('ready'), 8000));
    
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const firstItem = items[0];
  const productImage = firstItem?.images?.[0] || '/placeholder.svg';

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-visible">
      {/* Sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-200 to-amber-100" />
      
      {/* Animated clouds */}
      <motion.div 
        animate={{ x: [0, 100, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-10 left-10"
      >
        <div className="relative">
          <div className="w-24 h-10 bg-white rounded-full shadow-lg" />
          <div className="absolute -top-4 left-6 w-16 h-10 bg-white rounded-full" />
          <div className="absolute -top-2 left-14 w-12 h-8 bg-white rounded-full" />
        </div>
      </motion.div>
      
      <motion.div 
        animate={{ x: [0, -80, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 right-20"
      >
        <div className="relative">
          <div className="w-20 h-8 bg-white/90 rounded-full shadow-lg" />
          <div className="absolute -top-3 left-4 w-12 h-8 bg-white/90 rounded-full" />
        </div>
      </motion.div>

      {/* Sun */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], rotate: 360 }}
        transition={{ scale: { duration: 3, repeat: Infinity }, rotate: { duration: 60, repeat: Infinity, ease: "linear" } }}
        className="absolute top-8 right-16 w-20 h-20"
      >
        <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full shadow-[0_0_60px_rgba(251,191,36,0.6)]" />
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-3 h-12 bg-gradient-to-b from-yellow-300 to-transparent rounded-full origin-bottom"
            style={{ transform: `translate(-50%, -100%) rotate(${i * 45}deg)` }}
          />
        ))}
      </motion.div>

      {/* 3D Stage with perspective */}
      <div 
        className="relative w-full max-w-4xl h-[450px] flex items-end justify-center"
        style={{ perspective: '1200px', perspectiveOrigin: '50% 40%' }}
      >
        {/* Ground plane - 3D floor */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-green-400 to-green-600 rounded-t-[50%]"
          style={{ 
            transform: 'rotateX(60deg) translateZ(-20px)',
            transformOrigin: 'bottom center',
            boxShadow: 'inset 0 20px 40px rgba(0,0,0,0.2)'
          }}
        />
        
        {/* Grass texture overlay */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{ 
            background: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(34,197,94,0.3) 10px, rgba(34,197,94,0.3) 12px)',
            transform: 'rotateX(60deg)',
            transformOrigin: 'bottom center'
          }}
        />

        {/* Road */}
        <div 
          className="absolute bottom-4 left-1/4 right-1/4 h-24 bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"
          style={{ 
            transform: 'rotateX(70deg) translateZ(10px)',
            transformOrigin: 'bottom center'
          }}
        >
          {/* Road markings */}
          <div className="absolute top-1/2 left-0 right-0 h-2 flex justify-center gap-8 -translate-y-1/2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-8 h-2 bg-yellow-400 rounded-full" />
            ))}
          </div>
        </div>
        
        {/* Product Image - Phase 1 */}
        <AnimatePresence>
          {animationPhase === 'product' && (
            <motion.div
              initial={{ opacity: 0, scale: 0, rotateY: -180 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ 
                opacity: 0, 
                scale: 0.3, 
                rotateY: 180,
                rotateX: 45,
                z: -100
              }}
              transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                animate={{ 
                  rotateY: [-5, 5, -5],
                  y: [0, -15, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Product card with 3D effect */}
                <div 
                  className="relative w-48 h-48 rounded-2xl overflow-hidden"
                  style={{ 
                    transformStyle: 'preserve-3d',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 4px rgba(255,255,255,0.8)'
                  }}
                >
                  <img 
                    src={productImage} 
                    alt={firstItem?.title} 
                    className="w-full h-full object-cover"
                  />
                  {/* Shine effect */}
                  <motion.div
                    animate={{ x: [-200, 300] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-32 skew-x-12"
                  />
                </div>
                
                {/* Floating quantity badge */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotateZ: [-10, 10, -10]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-xl"
                  style={{ transform: 'translateZ(30px)' }}
                >
                  <span className="text-white font-bold text-lg">
                    {items.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                </motion.div>

                {/* Sparkle effects */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                    }}
                    transition={{ 
                      duration: 1.5, 
                      delay: i * 0.2, 
                      repeat: Infinity,
                      repeatDelay: 0.5
                    }}
                    className="absolute w-4 h-4"
                    style={{
                      top: `${20 + Math.sin(i) * 40}%`,
                      left: `${20 + Math.cos(i) * 40}%`,
                    }}
                  >
                    <div className="w-full h-full bg-yellow-300 rotate-45" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transform to Package - Phase 2 */}
        <AnimatePresence>
          {animationPhase === 'transform' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.2, rotateX: -90 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 100, scale: 0.5 }}
              transition={{ duration: 1, type: 'spring', stiffness: 80 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                animate={{ 
                  rotateY: [0, 360],
                  y: [0, -20, 0]
                }}
                transition={{ 
                  rotateY: { duration: 2, ease: "easeInOut" },
                  y: { duration: 1, repeat: Infinity }
                }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* 3D Package Box */}
                <div 
                  className="relative w-40 h-40"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front face */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg border-4 border-amber-800"
                    style={{ transform: 'translateZ(70px)' }}
                  >
                    <div className="absolute top-1/2 left-0 right-0 h-4 bg-amber-300 -translate-y-1/2" />
                    <div className="absolute top-0 bottom-0 left-1/2 w-4 bg-amber-300 -translate-x-1/2" />
                    {/* Shipping label */}
                    <div className="absolute bottom-4 right-4 w-12 h-8 bg-white rounded shadow-md flex items-center justify-center">
                      <div className="w-8 h-1 bg-gray-400 rounded" />
                    </div>
                  </div>
                  
                  {/* Back face */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg"
                    style={{ transform: 'translateZ(-70px) rotateY(180deg)' }}
                  />
                  
                  {/* Top face */}
                  <div 
                    className="absolute left-0 right-0 h-40 bg-gradient-to-b from-amber-400 to-amber-500 rounded-lg origin-bottom"
                    style={{ transform: 'rotateX(90deg) translateZ(70px)' }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-full bg-amber-300" />
                      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-4 bg-amber-300" />
                    </div>
                  </div>
                  
                  {/* Left face */}
                  <div 
                    className="absolute top-0 bottom-0 w-40 bg-gradient-to-r from-amber-600 to-amber-700 rounded-lg"
                    style={{ transform: 'rotateY(-90deg) translateZ(70px)' }}
                  />
                  
                  {/* Right face */}
                  <div 
                    className="absolute top-0 bottom-0 w-40 bg-gradient-to-l from-amber-500 to-amber-600 rounded-lg"
                    style={{ transform: 'rotateY(90deg) translateZ(70px)' }}
                  />
                </div>

                {/* Magic sparkles around box */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.5, 0.5],
                      y: [0, -30, -60],
                    }}
                    transition={{ 
                      duration: 1.5, 
                      delay: i * 0.1, 
                      repeat: Infinity 
                    }}
                    className="absolute w-3 h-3 bg-yellow-400 rounded-full shadow-lg"
                    style={{
                      left: `${Math.cos(i * 30 * Math.PI / 180) * 80 + 70}px`,
                      top: `${Math.sin(i * 30 * Math.PI / 180) * 80 + 70}px`,
                      boxShadow: '0 0 10px rgba(251,191,36,0.8)'
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Truck & Delivery Scene - Phase 3, 4, 5 */}
        <AnimatePresence>
          {(animationPhase === 'truck' || animationPhase === 'delivery' || animationPhase === 'ready') && (
            <>
              {/* Package on ground */}
              {animationPhase !== 'ready' && (
                <motion.div
                  initial={{ opacity: 0, y: -200, rotateX: 45 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    rotateX: 0,
                    x: animationPhase === 'delivery' ? -60 : 0
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.8, type: 'spring' }}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <div 
                      className="w-28 h-28 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg border-4 border-amber-800 relative"
                      style={{ 
                        boxShadow: '8px 8px 0 rgba(0,0,0,0.3), inset -4px -4px 0 rgba(0,0,0,0.1)',
                        transform: 'rotateX(-10deg) rotateY(-15deg)'
                      }}
                    >
                      <div className="absolute top-1/2 left-0 right-0 h-3 bg-amber-300 -translate-y-1/2" />
                      <div className="absolute top-0 bottom-0 left-1/2 w-3 bg-amber-300 -translate-x-1/2" />
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* 3D Cartoon Truck */}
              <motion.div
                initial={{ x: 500, rotateY: -20 }}
                animate={{ 
                  x: -80, 
                  rotateY: 0 
                }}
                transition={{ duration: 2.5, type: 'spring', stiffness: 25, damping: 12 }}
                className="absolute bottom-16 left-1/2 z-30"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div 
                  className="relative"
                  style={{ 
                    transformStyle: 'preserve-3d',
                    transform: 'rotateY(-15deg) rotateX(5deg)'
                  }}
                >
                  {/* Truck cargo */}
                  <div 
                    className="absolute left-0 w-44 h-32 bg-gradient-to-b from-blue-400 to-blue-600 rounded-xl"
                    style={{ 
                      boxShadow: '8px 8px 0 rgba(0,0,0,0.3), inset 0 -10px 20px rgba(0,0,0,0.2)',
                      border: '4px solid #1e40af'
                    }}
                  >
                    {/* Cargo details */}
                    <div className="absolute inset-3 border-4 border-dashed border-blue-300/50 rounded-lg" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl">📦</div>
                  </div>
                  
                  {/* Truck cabin */}
                  <div 
                    className="absolute right-0 w-24 h-28 bg-gradient-to-b from-blue-500 to-blue-700 rounded-r-2xl rounded-l-lg"
                    style={{ 
                      boxShadow: '6px 6px 0 rgba(0,0,0,0.3)',
                      border: '4px solid #1e40af',
                      left: '140px',
                      top: '4px'
                    }}
                  >
                    {/* Windshield */}
                    <div 
                      className="absolute top-2 right-2 w-16 h-14 bg-gradient-to-br from-sky-200 to-sky-400 rounded-lg border-4 border-blue-800"
                      style={{ boxShadow: 'inset 4px 4px 10px rgba(255,255,255,0.5)' }}
                    >
                      {/* Driver silhouette */}
                      <div className="absolute bottom-2 right-3 w-6 h-8 bg-gray-700 rounded-t-full" />
                    </div>
                    
                    {/* Headlight */}
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute bottom-4 right-2 w-4 h-4 bg-yellow-300 rounded-full shadow-[0_0_15px_rgba(253,224,71,0.8)]"
                    />
                    
                    {/* Side mirror */}
                    <div className="absolute top-8 -right-3 w-4 h-6 bg-blue-800 rounded" />
                  </div>
                  
                  {/* Wheels with 3D effect */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.3, ease: 'linear' }}
                    className="absolute -bottom-5 left-8"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div 
                      className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full border-4 border-gray-600"
                      style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.4)' }}
                    >
                      <div className="absolute inset-2 bg-gray-500 rounded-full border-2 border-gray-400">
                        <div className="absolute inset-1 flex items-center justify-center">
                          <div className="w-3 h-3 bg-gray-700 rounded-full" />
                        </div>
                      </div>
                      {/* Spokes */}
                      {[0, 60, 120].map((deg) => (
                        <div 
                          key={deg} 
                          className="absolute top-1/2 left-1/2 w-1 h-8 bg-gray-600 -translate-x-1/2 -translate-y-1/2"
                          style={{ transform: `translate(-50%, -50%) rotate(${deg}deg)` }}
                        />
                      ))}
                    </div>
                  </motion.div>
                  
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.3, ease: 'linear' }}
                    className="absolute -bottom-5 right-4"
                  >
                    <div 
                      className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full border-4 border-gray-600"
                      style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.4)' }}
                    >
                      <div className="absolute inset-2 bg-gray-500 rounded-full border-2 border-gray-400">
                        <div className="absolute inset-1 flex items-center justify-center">
                          <div className="w-3 h-3 bg-gray-700 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Exhaust smoke */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 0, x: 0 }}
                      animate={{ 
                        opacity: [0, 0.6, 0],
                        y: [-10, -40],
                        x: [-20, -40],
                        scale: [0.5, 1.5]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        delay: i * 0.3 
                      }}
                      className="absolute -bottom-2 -left-4 w-6 h-6 bg-gray-400/60 rounded-full blur-sm"
                    />
                  ))}
                </div>
              </motion.div>

              {/* 3D Cartoon Delivery Man */}
              {(animationPhase === 'delivery' || animationPhase === 'ready') && (
                <motion.div
                  initial={{ x: 200, opacity: 0 }}
                  animate={{ 
                    x: animationPhase === 'ready' ? -40 : 30, 
                    opacity: 1 
                  }}
                  transition={{ duration: 1, type: 'spring' }}
                  className="absolute bottom-12 left-1/2 z-20"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <motion.div
                    animate={animationPhase === 'ready' ? { y: [0, -8, 0] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="relative"
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transform: 'rotateY(10deg)'
                    }}
                  >
                    {/* Head */}
                    <motion.div
                      animate={{ rotateZ: animationPhase === 'ready' ? [0, 5, -5, 0] : [0, -3, 3, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="relative mx-auto"
                    >
                      <div 
                        className="w-20 h-20 bg-gradient-to-b from-amber-200 to-amber-300 rounded-full mx-auto relative border-4 border-amber-400"
                        style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.2)' }}
                      >
                        {/* Cap */}
                        <div 
                          className="absolute -top-2 left-1/2 -translate-x-1/2 w-24 h-10 bg-gradient-to-b from-blue-500 to-blue-700 rounded-t-full border-4 border-blue-800"
                          style={{ boxShadow: '4px 0 0 rgba(0,0,0,0.2)' }}
                        >
                          {/* Cap visor */}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-4 bg-blue-800 rounded-b-lg" />
                        </div>
                        
                        {/* Eyes */}
                        <motion.div
                          animate={{ scaleY: [1, 0.1, 1] }}
                          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                          className="absolute top-8 left-4 w-4 h-4 bg-gray-900 rounded-full"
                        >
                          <div className="absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full" />
                        </motion.div>
                        <motion.div
                          animate={{ scaleY: [1, 0.1, 1] }}
                          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                          className="absolute top-8 right-4 w-4 h-4 bg-gray-900 rounded-full"
                        >
                          <div className="absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full" />
                        </motion.div>
                        
                        {/* Eyebrows */}
                        <div className="absolute top-5 left-3 w-5 h-1.5 bg-amber-600 rounded-full rotate-[-10deg]" />
                        <div className="absolute top-5 right-3 w-5 h-1.5 bg-amber-600 rounded-full rotate-[10deg]" />
                        
                        {/* Nose */}
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3 h-4 bg-amber-300 rounded-full" />
                        
                        {/* Smile */}
                        <motion.div
                          animate={{ scaleX: [1, 1.1, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-4 border-b-4 border-gray-800 rounded-b-full"
                        />
                        
                        {/* Cheeks */}
                        <div className="absolute bottom-5 left-1 w-4 h-3 bg-pink-300/50 rounded-full" />
                        <div className="absolute bottom-5 right-1 w-4 h-3 bg-pink-300/50 rounded-full" />
                      </div>
                    </motion.div>
                    
                    {/* Body/Uniform */}
                    <div 
                      className="w-24 h-28 bg-gradient-to-b from-blue-500 to-blue-700 rounded-xl mx-auto mt-1 relative border-4 border-blue-800"
                      style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.2)' }}
                    >
                      {/* Collar */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-6 bg-blue-400 rounded-b-lg" />
                      
                      {/* Badge */}
                      <div className="absolute top-4 left-3 w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-md flex items-center justify-center border-2 border-yellow-700">
                        <span className="text-xs">⭐</span>
                      </div>
                      
                      {/* Buttons */}
                      <div className="absolute top-6 right-4 space-y-3">
                        <div className="w-3 h-3 bg-blue-300 rounded-full" />
                        <div className="w-3 h-3 bg-blue-300 rounded-full" />
                      </div>
                      
                      {/* Belt */}
                      <div className="absolute bottom-8 left-0 right-0 h-4 bg-gray-800 border-y-2 border-gray-600">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-full bg-yellow-500 rounded" />
                      </div>
                    </div>
                    
                    {/* Arms */}
                    {animationPhase === 'ready' ? (
                      /* Arms holding package */
                      <div className="absolute top-24 left-1/2 -translate-x-1/2">
                        <div className="flex justify-between w-36">
                          <motion.div 
                            animate={{ rotateZ: [-5, 0, -5] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-6 h-20 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full border-2 border-blue-800 -rotate-[30deg]"
                            style={{ transformOrigin: 'top center' }}
                          />
                          <motion.div 
                            animate={{ rotateZ: [5, 0, 5] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-6 h-20 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full border-2 border-blue-800 rotate-[30deg]"
                            style={{ transformOrigin: 'top center' }}
                          />
                        </div>
                        
                        {/* Package in hands */}
                        <motion.div
                          initial={{ scale: 0, rotateZ: 45 }}
                          animate={{ 
                            scale: 1, 
                            rotateZ: 0,
                            y: [0, -5, 0]
                          }}
                          transition={{ 
                            scale: { duration: 0.5 },
                            y: { duration: 1, repeat: Infinity }
                          }}
                          className="absolute top-4 left-1/2 -translate-x-1/2"
                        >
                          <div 
                            className="w-24 h-24 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg border-4 border-amber-800"
                            style={{ 
                              boxShadow: '6px 6px 0 rgba(0,0,0,0.3)',
                              transform: 'rotateX(-5deg)'
                            }}
                          >
                            <div className="absolute top-1/2 left-0 right-0 h-3 bg-amber-300 -translate-y-1/2" />
                            <div className="absolute top-0 bottom-0 left-1/2 w-3 bg-amber-300 -translate-x-1/2" />
                            <div className="absolute top-2 right-2 text-lg">📍</div>
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      /* Walking arms */
                      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex justify-between w-28">
                        <motion.div 
                          animate={{ rotateZ: [20, -20, 20] }}
                          transition={{ duration: 0.4, repeat: Infinity }}
                          className="w-5 h-16 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full border-2 border-blue-800"
                          style={{ transformOrigin: 'top center' }}
                        />
                        <motion.div 
                          animate={{ rotateZ: [-20, 20, -20] }}
                          transition={{ duration: 0.4, repeat: Infinity }}
                          className="w-5 h-16 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full border-2 border-blue-800"
                          style={{ transformOrigin: 'top center' }}
                        />
                      </div>
                    )}
                    
                    {/* Legs */}
                    <div className="flex gap-3 justify-center mt-1">
                      <motion.div
                        animate={animationPhase !== 'ready' ? { rotateZ: [-15, 15, -15] } : {}}
                        transition={{ repeat: Infinity, duration: 0.4 }}
                        className="w-8 h-24 bg-gradient-to-b from-gray-700 to-gray-900 rounded-b-xl border-2 border-gray-600"
                        style={{ 
                          transformOrigin: 'top center',
                          boxShadow: '4px 4px 0 rgba(0,0,0,0.3)'
                        }}
                      >
                        {/* Shoe */}
                        <div className="absolute -bottom-2 -left-2 w-12 h-6 bg-gray-800 rounded-lg border-2 border-gray-600" />
                      </motion.div>
                      <motion.div
                        animate={animationPhase !== 'ready' ? { rotateZ: [15, -15, 15] } : {}}
                        transition={{ repeat: Infinity, duration: 0.4 }}
                        className="w-8 h-24 bg-gradient-to-b from-gray-700 to-gray-900 rounded-b-xl border-2 border-gray-600"
                        style={{ 
                          transformOrigin: 'top center',
                          boxShadow: '4px 4px 0 rgba(0,0,0,0.3)'
                        }}
                      >
                        {/* Shoe */}
                        <div className="absolute -bottom-2 -right-2 w-12 h-6 bg-gray-800 rounded-lg border-2 border-gray-600" />
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Status Text */}
      <motion.div
        key={animationPhase}
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring' }}
        className="text-center mb-6 relative z-10"
      >
        <h2 className="text-3xl font-bold text-gray-800 mb-2 drop-shadow-lg">
          {animationPhase === 'product' && '✨ Preparing Your Order...'}
          {animationPhase === 'transform' && '📦 Packaging Your Items...'}
          {animationPhase === 'truck' && '🚚 Delivery On The Way!'}
          {animationPhase === 'delivery' && '🏃 Almost Ready...'}
          {animationPhase === 'ready' && '🎉 Ready For Delivery!'}
        </h2>
        <p className="text-gray-600 text-lg">
          {animationPhase === 'ready' 
            ? 'Complete your payment to dispatch your order!' 
            : 'Please wait while we prepare everything...'}
        </p>
      </motion.div>

      {/* Order Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: animationPhase === 'ready' ? 1 : 0.7, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-gray-200 max-w-md w-full mx-4 relative z-10"
        style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
      >
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">📋 Order Summary</h3>
        <div className="space-y-3 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 rounded-xl p-3">
              <span className="text-gray-600 font-medium">
                {item.title} × {item.quantity}
              </span>
              <span className="font-bold text-gray-800">
                {getCurrencySymbol(item.currency || 'USD')}{(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t-4 border-dashed border-gray-200 pt-4 flex justify-between items-center">
          <span className="font-bold text-gray-800 text-lg">Total</span>
          <span className="text-2xl font-black text-green-600">
            {getCurrencySymbol(items[0]?.currency || 'USD')}
            {items.reduce((acc, item) => acc + item.price * item.quantity, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </motion.div>

      {/* Proceed Button */}
      <AnimatePresence>
        {animationPhase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            className="mt-8 relative z-10"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Button
                onClick={onProceedToPayment}
                size="lg"
                className="px-16 py-8 text-xl font-black rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-4 border-green-700 shadow-2xl"
                style={{ boxShadow: '0 10px 30px rgba(34,197,94,0.4), 0 6px 0 #15803d' }}
              >
                <span className="flex items-center gap-3">
                  💳 Proceed to Payment
                </span>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderPreviewAnimation;
