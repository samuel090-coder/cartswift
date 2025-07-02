import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface WelcomePopupProps {
  onCategorySelect: (category: string) => void;
}

const categories = [
  { id: 'Animals', name: 'Animals', icon: '🐾', image: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=300' },
  { id: 'Fashion', name: 'Fashion', icon: '👗', image: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=300' },
  { id: 'Tools', name: 'Tools', icon: '🔧', image: 'https://images.unsplash.com/photo-1473091534298-04dcbce3278c?w=300' },
  { id: 'Vehicles', name: 'Vehicles', icon: '🚗', image: 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=300' },
  { id: 'Gadgets', name: 'Gadgets', icon: '📱', image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=300' }
];

const WelcomePopup = ({ onCategorySelect }: WelcomePopupProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('cartswift-welcome-seen');
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    localStorage.setItem('cartswift-welcome-seen', 'true');
    setIsOpen(false);
    onCategorySelect(categoryId);
  };

  const handleClose = () => {
    localStorage.setItem('cartswift-welcome-seen', 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg mx-auto bg-white border-0 shadow-2xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-center p-6"
        >
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              🎉 Thank you for visiting our store!
            </h2>
            <p className="text-gray-600 mb-6">
              What would you like to explore today?
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center gap-2 border-2 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {category.icon}
                  </span>
                  <span className="text-sm font-medium">{category.name}</span>
                </Button>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          >
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              Browse All Products
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;