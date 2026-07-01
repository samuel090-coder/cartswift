---
name: Smart Rewards Ecosystem
description: AI-generated free-reward funnel — popup, claim, Paystack checkout, celebration, 3 bonus rewards, gift recipient flow
type: feature
---
Phase 1 built. Flow: visitor lands → 15s → `RewardPopup` calls `smart-rewards-generate` (Gemini copy + gpt-image-2 marketing image, chosen from REWARD_POOL). User claims → `/reward/claim` full-screen (agreement checkbox required) → `/reward/checkout` (delivery form + Paystack via `paystack-initialize`/`paystack-verify`, USD→NGN×1600) → `/reward/celebration` (confetti, 4s auto-redirect) → `/reward/bonus` calls `smart-rewards-bonus` (3 AI complementary items with generated images) → `/reward/bonus/checkout` (self address or gift recipient with relationship) → second Paystack payment.

Tables: `reward_claims` (session_id, primary_reward jsonb, delivery, status, payment_reference, shipping_fee=$5, 48h expires_at), `reward_bonus_bundles` (claim_id FK, bonus_items jsonb, recipient_type, recipient, status). RLS permissive (anon visitors); writes gated by edge functions.

Session tracked via localStorage `sr_session_id`; popup shown once (`sr_popup_seen`); active claim cached `sr_active_claim`. Hidden on /admin, /reset-password, /reward routes.

Secrets: PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY. Paystack in NGN (test mode). If account supports USD, change `useCurrency` in `paystack-initialize`.

Phase 2 (admin campaigns CRUD, rarity, geo, complementary rules) and Phase 3 (analytics, personalization from browsing_history) not yet built.
