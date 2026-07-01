
# Smart Rewards Ecosystem — Recommended Build Plan

The full spec is large. I recommend building it in **3 phases**, shipping each so you can test before the next. This keeps things stable and lets us fix issues before piling on more surface area.

---

## Phase 1 — Foundation + Customer Flow (this turn)

**What you'll get after this turn:**
- Elegant reward popup on new-visitor entry (fires after ~15s, once per device)
- AI-generated reward: personalized product image + name + price + FREE badge + 48h countdown
- Full-screen "Claim My Reward" experience with description, FAQ, rules, agreement checkbox
- Delivery info checkout (name, email, phone, address, city, state, postal, instructions)
- Paystack payment (test mode) + server-side verification
- Confetti celebration page with order number + tracking
- Auto-unlock **3 AI-generated bonus rewards** page with "Purchase All Together"
- Recipient selector (Same address / Send to someone else + relationship + recipient details)
- Second Paystack checkout for bundled bonus rewards

**Technical bits (for reference):**
- New tables: `reward_campaigns`, `reward_claims`, `reward_bonus_bundles`, `reward_recipients`
- Edge functions: `generate-reward-campaign` (Lovable AI + gpt-image-2), `generate-bonus-rewards`, `paystack-initialize`, `paystack-verify`
- Secrets needed from you: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` (I'll prompt you)
- AI: Lovable AI Gateway for copy (`google/gemini-2.5-flash`) + image gen (`openai/gpt-image-2`)
- Images cached to `item-images` bucket to avoid regenerating on every view

---

## Phase 2 — Admin Dashboard (next turn)

- Campaigns CRUD (create, edit, duplicate, pause, schedule, disable)
- Reward pools, rarity tiers, shipping/processing fees, max claims, geo restrictions
- Complementary product mapping rules
- Inventory sync toggle
- Seasonal campaign scheduling

## Phase 3 — Intelligence + Analytics (turn after)

- Personalization from `browsing_history` + past orders + category views + gender inference
- Analytics dashboard: conversions, revenue, AI performance, abandoned funnels, AOV, repeat rate
- Admin business rules engine for AI recommendations

---

## What I need from you before starting Phase 1

1. **Paystack keys** — I'll trigger a secret prompt for `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`. Get them from your Paystack dashboard → Settings → API Keys (start with **test keys**).
2. **Shipping fee default** — a single default in NGN/USD I should use until Phase 2 admin config exists? (e.g., ₦2,500 or $5)
3. **Currency** — Paystack default is NGN. Use NGN, or NGN + USD?

Reply "go" with those 3 answers and I'll build Phase 1 end-to-end.
