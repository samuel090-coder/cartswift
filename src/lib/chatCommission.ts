export const CHAT_REFERRAL_RATE = 0.10;

export const calculateChatReferralCommission = (
  orderAmount: number,
  platformFeeRate: number,
  referralRate = CHAT_REFERRAL_RATE,
) => {
  const safeAmount = Math.max(0, Number.isFinite(orderAmount) ? orderAmount : 0);
  const safePlatformRate = Math.max(0, Number.isFinite(platformFeeRate) ? platformFeeRate : 0);
  const safeReferralRate = Math.max(0, Number.isFinite(referralRate) ? referralRate : 0);
  return Math.round(Math.min(safeAmount * safeReferralRate, safeAmount * safePlatformRate) * 100) / 100;
};