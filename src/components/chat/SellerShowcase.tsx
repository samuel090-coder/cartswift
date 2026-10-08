import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Flame, Sparkles, Star, Gift, ShieldCheck, Truck, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatChatPrice } from './chatFormat';

interface Props {
  sellerId: string;
}

const badgeFor = (p: { is_featured: boolean | null; created_at: string; stock_quantity: number }, idx: number) => {
  if (p.is_featured) return { label: 'Best Seller', Icon: Flame };
  if (Date.now() - new Date(p.created_at).getTime() < 7 * 86400000) return { label: 'New', Icon: Sparkles };
  if (p.stock_quantity > 0 && p.stock_quantity <= 5) return { label: 'Limited', Icon: Gift };
  if (idx < 2) return { label: 'Trending', Icon: Star };
  return null;
};

/** Horizontal carousel of the other user's real, approved store products. Renders nothing if they have none. */
const SellerShowcase = ({ sellerId }: Props) => {
  const navigate = useNavigate();
  const { data: products = [] } = useQuery({
    queryKey: ['chat-seller-showcase', sellerId],
    enabled: !!sellerId,
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await supabase
        .from('seller_products')
        .select('id, title, images, price, currency, is_featured, created_at, stock_quantity')
        .eq('seller_id', sellerId)
        .eq('is_approved', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12);
      return data || [];
    },
  });

  if (products.length === 0) return null;

  return (
    <div className="chat-showcase border-b border-border/60 py-2.5">
      <div className="flex gap-2.5 overflow-x-auto px-3 snap-x snap-mandatory scrollbar-none">
        <div className="snap-start shrink-0 w-[104px] flex flex-col justify-between rounded-2xl p-2.5 chat-showcase-intro">
          <div>
            <p className="text-sm font-black italic leading-tight text-foreground">HOT <span className="text-primary">DEALS</span></p>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">From this store</p>
          </div>
          <ul className="space-y-1 text-[9px] text-foreground/80">
            <li className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-primary" />Quality</li>
            <li className="flex items-center gap-1"><Truck className="h-3 w-3 text-primary" />Fast delivery</li>
          </ul>
          <ChevronRight className="h-4 w-4 text-primary" />
        </div>
        {products.map((p, idx) => {
          const badge = badgeFor(p, idx);
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/share/${p.id}?type=seller`)}
              className="snap-start shrink-0 w-[118px] relative rounded-2xl overflow-hidden chat-showcase-card text-left"
            >
              {p.images?.[0] ? (
                <img src={p.images[0]} alt={p.title} loading="lazy" className="h-[124px] w-full object-cover" />
              ) : (
                <div className="h-[124px] w-full bg-secondary" />
              )}
              {badge && (
                <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary-foreground">
                  <badge.Icon className="h-2.5 w-2.5" />{badge.label}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent p-2 pt-6">
                <p className="truncate text-[10px] font-medium text-foreground">{p.title}</p>
                <p className="text-xs font-bold text-foreground">{formatChatPrice(p.price, p.currency)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SellerShowcase;
