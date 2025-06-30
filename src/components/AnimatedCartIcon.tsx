
import { ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

const AnimatedCartIcon = () => {
  return (
    <motion.div
      animate={{
        y: [0, -5, 0],
        rotate: [0, 5, -5, 0]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="inline-block"
    >
      <ShoppingCart className="h-6 w-6 text-blue-600" />
    </motion.div>
  );
};

export default AnimatedCartIcon;
