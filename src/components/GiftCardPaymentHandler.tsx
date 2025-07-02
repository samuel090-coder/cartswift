import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface GiftCardData {
  brand: string;
  customBrand: string;
  estimatedValue: string;
  cardCode: string;
  notes: string;
  currency: string;
}

export const handleGiftCardPayment = async (
  orderId: string,
  giftCardData: GiftCardData,
  uploadedFiles: string[]
) => {
  try {
    console.log('Processing gift card payment for order:', orderId, 'with data:', giftCardData);
    
    // Update the existing gift card payment record with actual data
    const { error: updateError } = await supabase
      .from('gift_card_payments')
      .update({
        brand: giftCardData.brand === 'other' ? giftCardData.customBrand : giftCardData.brand,
        estimated_value: parseFloat(giftCardData.estimatedValue),
        card_code: giftCardData.cardCode || null,
        additional_notes: giftCardData.notes || null,
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('Gift card payment update error:', updateError);
      throw updateError;
    }

    console.log('Gift card payment successfully updated for order:', orderId);
    return true;
  } catch (error) {
    console.error('Gift card payment processing error:', error);
    throw error;
  }
};