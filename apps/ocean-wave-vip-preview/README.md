# Ocean Wave VIP — GTM inquiry funnel prototype

Open [index.html](index.html) in a browser to review a **noindex, unaffiliated, non-submitting** interactive concept. It is a frontend-only mobile-responsive flow: select celebration occasion → choose quote request vs 15-minute consultation → input event date/guest count/budget → see a clearly labeled local demo outcome. It does not submit data, check boats, book appointments or use customer identity. No deployment has been performed.

## Why this lives in the Factory
The repository contains established source-controlled website/landing assets; this example shows the proposed client-specific event conversion path without modifying a real client website or connecting private CRM systems.

## Next engineering tasks
1. Client approval of identity, actual fleet, brand media, inclusions and legal terms.
2. Build a dedicated Astro 7 app or integrate approved design with the official site.
3. Replace demo fields with validated accessible, consent-aware form; secure server-side Supabase endpoint, anti-bot controls, RLS, audit.
4. Connect Cal.com only to *consultation* availability; verify actual yacht/vessel inventory separately.
5. Add Resend/Twilio authorized transactional messaging, analytics, attribution and tested idempotent webhooks.
6. Deploy isolated noindex staging; obtain written production approval; only then promote/allow indexing and paid ads.
See [GTM funnel specification](../../docs/clients/ocean-wave-vip/GTM_FUNNEL.md).
