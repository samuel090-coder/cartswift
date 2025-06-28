
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';

const Header = () => {
  const { itemCount } = useCart();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            CARTSWIFT
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link to="/cart">
              <Button variant="outline" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
