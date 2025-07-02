import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check } from 'lucide-react';

interface PaymentProcessingPopupProps {
  show: boolean;
  onComplete: () => void;
}

const PaymentProcessingPopup = ({ show, onComplete }: PaymentProcessingPopupProps) => {
  const [currentIcon, setCurrentIcon] = useState<'shield' | 'check'>('shield');

  useEffect(() => {
    if (show) {
      // Switch to check icon after 1 second
      const timer1 = setTimeout(() => {
        setCurrentIcon('check');
      }, 1000);

      // Hide popup after 2 seconds
      const timer2 = setTimeout(() => {
        onComplete();
      }, 2000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-white rounded-lg p-8 shadow-2xl max-w-sm mx-4 text-center"
          >
            <motion.div
              key={currentIcon}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mb-4 flex justify-center"
            >
              {currentIcon === 'shield' ? (
                <Shield className="w-12 h-12 text-blue-500" />
              ) : (
                <Check className="w-12 h-12 text-green-500" />
              )}
            </motion.div>
            
            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-bold text-gray-800 mb-2"
            >
              ✅ CARTSWIFT PAYMENT PROCESSING
            </motion.h3>
            
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 text-sm"
            >
              Cartswift is committed to protecting your payment information.
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentProcessingPopup;