import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import AnimatedBackground from '@/components/AnimatedBackground';

import SEOHead from '@/components/SEOHead';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <AnimatedBackground>
      <SEOHead 
        title="Page Not Found - CartSwift"
        description="The page you're looking for doesn't exist. Return to CartSwift homepage for great deals and fast delivery."
        canonical="https://cartswift.lovable.app/404"
      />
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-light via-purple-light to-cyan-bright bg-clip-text text-transparent">404</h1>
          <p className="text-xl text-white/80 mb-4">Oops! Page not found</p>
          <a href="/" className="text-blue-light hover:text-blue-bright underline transition-colors">
            Return to Home
          </a>
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default NotFound;
