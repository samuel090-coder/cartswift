const SYMBOLS: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };

export const formatChatPrice = (price: number, currency = 'USD') =>
  `${SYMBOLS[currency] || `${currency} `}${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
