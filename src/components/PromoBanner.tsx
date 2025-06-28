
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const PromoBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white shadow-lg animate-pulse">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <span className="text-2xl">🎉</span>
            <div className="text-center flex-1">
              <p className="font-bold text-lg">
                Limited Time Offer! Enjoy up to 70% OFF on all categories.
              </p>
              <p className="text-sm opacity-90">
                No account needed — just add to cart and checkout instantly!
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-white hover:bg-white/20 ml-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PromoBanner;
