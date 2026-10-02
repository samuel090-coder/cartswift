import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

export const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("relative overflow-hidden rounded-md bg-muted brand-shimmer", className)} />
);

export const ProductCardSkeleton = () => (
  <div className="rounded-xl border border-border/40 bg-card p-3">
    <div className="relative">
      <Shimmer className="aspect-square rounded-lg" />
      <ShoppingCart className="absolute inset-0 m-auto h-8 w-8 text-primary/20" />
    </div>
    <Shimmer className="h-4 mt-3 w-4/5" />
    <Shimmer className="h-3 mt-2 w-3/5" />
    <div className="flex items-center justify-between mt-3">
      <Shimmer className="h-5 w-20 bg-primary/15" />
      <Shimmer className="h-8 w-8 rounded-full" />
    </div>
  </div>
);

export const ProductGridSkeleton = ({ count = 10 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
    {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
  </div>
);

export default ProductGridSkeleton;
