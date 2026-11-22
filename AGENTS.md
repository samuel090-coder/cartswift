# Architecture rules

- Keep the account profile redesign in the existing profile page, using existing account queries and destinations; presentation changes must not alter backend behavior.
- Scope profile-specific surface and icon styles to semantic tokens in the global stylesheet so other pages retain their existing theme.
- Store chat referral attribution on seller orders and create commission records server-side, releasing them only on fulfilled orders; this ties rewards to validated purchases.