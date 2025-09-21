import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fallbackSrc?: string;
  priority?: boolean;
  sizes?: string;
}

const LazyImage = memo(({ 
  src, 
  alt, 
  className = '', 
  width, 
  height, 
  fallbackSrc = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&q=80',
  priority = false,
  sizes
}: LazyImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Optimize image URL with quality and format params
  const optimizeImageUrl = useCallback((url: string) => {
    if (url.includes('unsplash.com')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}q=80&fm=webp&auto=format`;
    }
    return url;
  }, []);

  useEffect(() => {
    if (priority) {
      setImgSrc(optimizeImageUrl(src));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setImgSrc(optimizeImageUrl(src));
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: '100px' // Increased for faster loading
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [src, priority, optimizeImageUrl]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(optimizeImageUrl(fallbackSrc));
      setIsLoading(false);
    }
  }, [hasError, fallbackSrc, optimizeImageUrl]);

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden bg-muted/20 ${className}`} 
      style={{ width, height }}
    >
      {isLoading && (
        <Skeleton className="absolute inset-0 w-full h-full animate-pulse" />
      )}
      {(isInView || priority) && imgSrc && (
        <img
          ref={imgRef}
          src={imgSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-all duration-500 ease-out transform ${
            isLoading 
              ? 'opacity-0 scale-105' 
              : 'opacity-100 scale-100'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
          style={{
            aspectRatio: width && height ? `${width}/${height}` : undefined,
          }}
        />
      )}
    </div>
  );
});

export default LazyImage;