import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { BookOpen, CarFront, ChevronRight, PawPrint, Shirt, Sparkles, Wrench } from 'lucide-react';

interface WelcomePopupProps {
  onCategorySelect: (category: string) => void;
}

const categories = [
  { id: 'Animals', name: 'Animals', detail: 'Pets & care', icon: PawPrint, accent: 'text-neon-cyan bg-neon-cyan/10' },
  { id: 'Fashion', name: 'Fashion', detail: 'Style & beauty', icon: Shirt, accent: 'text-neon-rose bg-neon-rose/10' },
  { id: 'Tools', name: 'Tools', detail: 'Build & repair', icon: Wrench, accent: 'text-neon-amber bg-neon-amber/10' },
  { id: 'Vehicles', name: 'Vehicles', detail: 'Cars & parts', icon: CarFront, accent: 'text-neon-emerald bg-neon-emerald/10' },
  { id: 'Books', name: 'Books', detail: 'Read & discover', icon: BookOpen, accent: 'text-neon-violet bg-neon-violet/10' }
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[calc(100%-1.25rem)] max-w-[390px] max-h-[calc(100dvh-1.25rem)] overflow-y-auto rounded-2xl border-border/70 bg-card/95 p-0 shadow-2xl backdrop-blur-2xl">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 18 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="p-5 sm:p-6"
        >
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="mb-1 text-xs font-semibold uppercase text-primary">Your marketplace, your way</p>
            <h2 className="pr-8 text-2xl font-bold text-foreground">Welcome to CartSwift</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Choose where to start. You can explore everything anytime.</p>
          </motion.div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
              >
                <Button
                  variant="outline"
                  className={`group h-[94px] w-full flex-col items-start justify-between overflow-hidden rounded-xl border-border/70 bg-secondary/45 p-3 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-secondary ${index === categories.length - 1 ? 'col-span-2 h-[76px] flex-row items-center' : ''}`}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${category.accent}`}>
                    <category.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className={index === categories.length - 1 ? 'flex-1' : 'w-full'}>
                    <span className="block text-sm font-semibold text-foreground">{category.name}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">{category.detail}</span>
                  </span>
                  {index === categories.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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
              onClick={handleClose}
              className="mt-4 h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/15"
            >
              Browse all products <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;