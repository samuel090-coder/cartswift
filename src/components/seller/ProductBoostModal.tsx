import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Rocket, Eye, MapPin, Users, Clock, Sparkles, 
  TrendingUp, Target, DollarSign, ChevronRight, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductBoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

const locations = [
  { id: 'usa', label: '🇺🇸 United States', popular: true },
  { id: 'uk', label: '🇬🇧 United Kingdom', popular: true },
  { id: 'canada', label: '🇨🇦 Canada', popular: true },
  { id: 'australia', label: '🇦🇺 Australia', popular: false },
  { id: 'germany', label: '🇩🇪 Germany', popular: false },
  { id: 'france', label: '🇫🇷 France', popular: false },
  { id: 'worldwide', label: '🌍 Worldwide', popular: true },
];

const viewPackages = [
  { views: 1000, price: 9.99, label: 'Starter', emoji: '🌟' },
  { views: 5000, price: 39.99, label: 'Growth', emoji: '🚀', popular: true },
  { views: 10000, price: 69.99, label: 'Pro', emoji: '💎' },
  { views: 25000, price: 149.99, label: 'Enterprise', emoji: '👑' },
];

const durationOptions = [
  { days: 3, label: '3 Days', multiplier: 0.8 },
  { days: 7, label: '1 Week', multiplier: 1 },
  { days: 14, label: '2 Weeks', multiplier: 1.7 },
  { days: 30, label: '1 Month', multiplier: 3 },
];

const ProductBoostModal = ({ isOpen, onClose, product }: ProductBoostModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(viewPackages[1]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['worldwide']);
  const [selectedDuration, setSelectedDuration] = useState(durationOptions[1]);
  const [expectedBuyers, setExpectedBuyers] = useState([50]);

  const totalPrice = (selectedPackage.price * selectedDuration.multiplier).toFixed(2);

  const createBoostRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('boost_requests')
        .insert({
          seller_id: user?.id,
          product_id: product.id,
          target_views: selectedPackage.views,
          target_locations: selectedLocations,
          expected_buyers: expectedBuyers[0],
          duration_days: selectedDuration.days,
          amount_paid: parseFloat(totalPrice),
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boost-requests'] });
      toast.success('🚀 Boost request submitted! We\'ll notify you once approved.');
      onClose();
      setStep(1);
    },
    onError: () => toast.error('Failed to submit boost request'),
  });

  const toggleLocation = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(l => l !== locationId)
        : [...prev, locationId]
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-pink-vibrant rounded-2xl mb-4">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold">Choose Your Views Package 👀</h3>
              <p className="text-sm text-muted-foreground mt-1">More views = More potential buyers!</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {viewPackages.map((pkg) => (
                <Card 
                  key={pkg.views}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`cursor-pointer transition-all hover:scale-[1.02] ${
                    selectedPackage.views === pkg.views 
                      ? 'border-2 border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border border-border hover:border-primary/50'
                  }`}
                >
                  <CardContent className="p-4 text-center relative">
                    {pkg.popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-[10px]">
                        Most Popular
                      </Badge>
                    )}
                    <span className="text-2xl">{pkg.emoji}</span>
                    <p className="font-bold mt-2">{pkg.label}</p>
                    <p className="text-2xl font-bold text-primary">{pkg.views.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">views</p>
                    <p className="text-lg font-semibold mt-2">${pkg.price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        );
      
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-pink-vibrant rounded-2xl mb-4">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold">Target Locations 🎯</h3>
              <p className="text-sm text-muted-foreground mt-1">Where do you want to show your product?</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {locations.map((location) => (
                <div
                  key={location.id}
                  onClick={() => toggleLocation(location.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                    selectedLocations.includes(location.id)
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted/50 border-2 border-transparent hover:border-primary/30'
                  }`}
                >
                  <Checkbox 
                    checked={selectedLocations.includes(location.id)} 
                    className="pointer-events-none"
                  />
                  <span className="text-sm font-medium">{location.label}</span>
                  {location.popular && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">Hot</Badge>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        );
      
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-pink-vibrant rounded-2xl mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold">Boost Duration ⏱️</h3>
              <p className="text-sm text-muted-foreground mt-1">How long should your boost run?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {durationOptions.map((duration) => (
                <Card 
                  key={duration.days}
                  onClick={() => setSelectedDuration(duration)}
                  className={`cursor-pointer transition-all ${
                    selectedDuration.days === duration.days 
                      ? 'border-2 border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <CardContent className="p-4 text-center">
                    <p className="font-bold text-lg">{duration.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {duration.multiplier === 1 ? 'Standard' : 
                       duration.multiplier < 1 ? '20% discount' : 
                       `${Math.round((duration.multiplier - 1) * 100)}% bonus reach`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Expected Buyers Goal
              </Label>
              <div className="px-2">
                <Slider
                  value={expectedBuyers}
                  onValueChange={setExpectedBuyers}
                  max={500}
                  min={10}
                  step={10}
                  className="py-4"
                />
              </div>
              <div className="text-center">
                <span className="text-3xl font-bold text-primary">{expectedBuyers[0]}</span>
                <span className="text-muted-foreground ml-2">expected buyers</span>
              </div>
            </div>
          </motion.div>
        );
      
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold">Confirm Your Boost ✨</h3>
              <p className="text-sm text-muted-foreground mt-1">Review your boost details</p>
            </div>

            <Card className="bg-gradient-to-br from-pink-soft to-peach/30 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {product.images?.[0] && (
                    <img src={product.images[0]} alt="" className="w-16 h-16 object-cover rounded-lg" />
                  )}
                  <div>
                    <p className="font-semibold">{product.title}</p>
                    <p className="text-sm text-muted-foreground">${product.price}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Views Package</span>
                <span className="font-medium">{selectedPackage.emoji} {selectedPackage.views.toLocaleString()} views</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{selectedDuration.label}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Locations</span>
                <span className="font-medium">{selectedLocations.length} selected</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Expected Buyers</span>
                <span className="font-medium">{expectedBuyers[0]}</span>
              </div>
              <div className="flex justify-between py-3 text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold text-primary">${totalPrice}</span>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg text-sm">
              <p className="text-amber-800 dark:text-amber-200">
                💡 After payment, your boost will be reviewed and activated within 24 hours.
              </p>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Rocket className="w-5 h-5" />
            Boost Your Product
          </DialogTitle>
          <DialogDescription>
            Get more visibility and reach more buyers
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s === step 
                    ? 'bg-primary text-white scale-110' 
                    : s < step 
                    ? 'bg-green-500 text-white' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-8 h-1 mx-1 rounded ${s < step ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <Button 
              variant="outline" 
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              className="flex-1 bg-primary gap-2"
              disabled={step === 2 && selectedLocations.length === 0}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={() => createBoostRequest.mutate()}
              disabled={createBoostRequest.isPending}
              className="flex-1 bg-gradient-to-r from-primary to-pink-vibrant text-white gap-2"
            >
              {createBoostRequest.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Submit Boost Request
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductBoostModal;
