import assert from 'node:assert/strict';
import { calculateChatReferralCommission, CHAT_REFERRAL_RATE } from './chatCommission';

assert.equal(CHAT_REFERRAL_RATE, 0.10);
assert.equal(calculateChatReferralCommission(1000, 0.12), 100);
assert.equal(calculateChatReferralCommission(1000, 0.03), 30);
assert.equal(calculateChatReferralCommission(1000, 0.12, 0.05), 50);

console.log('Chat referral commission rules passed.');