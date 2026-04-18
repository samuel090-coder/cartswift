// Centralized price formatting utility.
// Supports two display modes controlled by an admin-managed global setting:
//   - "full"    => $7,000,000.00
//   - "compact" => $7M  /  $2.5K
//
// The global mode is fetched once and cached in localStorage; UI components
// read it synchronously via getPriceFormatMode().

import { supabase } from '@/integrations/supabase/client';

export type PriceFormatMode = 'full' | 'compact';

const STORAGE_KEY = 'cartswift-price-format';

export const getPriceFormatMode = (): PriceFormatMode => {
  if (typeof window === 'undefined') return 'full';
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'compact' ? 'compact' : 'full';
};

export const setPriceFormatMode = (mode: PriceFormatMode) => {
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent('price-format-changed', { detail: mode }));
};

// Fetch global mode from DB once on app boot and sync to localStorage.
export const syncPriceFormatFromServer = async () => {
  try {
    const { data } = await supabase
      .from('notification_settings')
      .select('setting_value')
      .eq('setting_key', 'price_display_format')
      .maybeSingle();
    const mode = (data?.setting_value as any)?.format;
    if (mode === 'full' || mode === 'compact') {
      localStorage.setItem(STORAGE_KEY, mode);
      window.dispatchEvent(new CustomEvent('price-format-changed', { detail: mode }));
    }
  } catch {
    /* ignore */
  }
};

const compact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return n.toFixed(2).replace(/\.00$/, '');
};

const full = (n: number, decimals = 2): string =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/**
 * Format a price with a currency symbol using the current global mode.
 * Pass `mode` to override (useful for previews).
 */
export const formatDisplayPrice = (
  amount: number,
  symbol = '$',
  mode: PriceFormatMode = getPriceFormatMode(),
): string => {
  if (!Number.isFinite(amount)) return `${symbol}0`;
  return mode === 'compact' ? `${symbol}${compact(amount)}` : `${symbol}${full(amount)}`;
};
