import React from 'react';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-premium-gradient relative overflow-hidden">
      {/* Main animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-deep-blue via-midnight-purple to-indigo-dark animate-gradient-shift"></div>
      
      {/* Floating particles layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large floating orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-radial from-blue-glow/30 to-transparent rounded-full animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-gradient-radial from-purple-glow/25 to-transparent rounded-full animate-float-slow animation-delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-56 h-56 bg-gradient-radial from-indigo-glow/20 to-transparent rounded-full animate-float-slow animation-delay-2000"></div>
        <div className="absolute bottom-40 right-1/3 w-40 h-40 bg-gradient-radial from-cyan-glow/30 to-transparent rounded-full animate-float-slow animation-delay-3000"></div>
        
        {/* Medium floating particles */}
        <div className="absolute top-1/3 left-1/2 w-32 h-32 bg-gradient-radial from-blue-light/40 to-transparent rounded-full animate-float-medium"></div>
        <div className="absolute top-3/4 left-1/6 w-24 h-24 bg-gradient-radial from-purple-light/35 to-transparent rounded-full animate-float-medium animation-delay-1500"></div>
        <div className="absolute top-1/2 right-1/4 w-36 h-36 bg-gradient-radial from-indigo-light/30 to-transparent rounded-full animate-float-medium animation-delay-2500"></div>
        
        {/* Small sparkle particles */}
        <div className="absolute top-1/4 left-3/4 w-16 h-16 bg-gradient-radial from-white/50 to-transparent rounded-full animate-sparkle"></div>
        <div className="absolute top-2/3 left-2/3 w-12 h-12 bg-gradient-radial from-blue-bright/60 to-transparent rounded-full animate-sparkle animation-delay-800"></div>
        <div className="absolute top-1/6 left-1/3 w-14 h-14 bg-gradient-radial from-purple-bright/50 to-transparent rounded-full animate-sparkle animation-delay-1600"></div>
        <div className="absolute bottom-1/4 right-1/6 w-10 h-10 bg-gradient-radial from-cyan-bright/70 to-transparent rounded-full animate-sparkle animation-delay-2400"></div>
        
        {/* Subtle grid overlay for depth */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AnimatedBackground;