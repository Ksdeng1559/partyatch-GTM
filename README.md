# Partyatch GTM — Ocean Wave VIP

A version-controlled, **client-approval-pending** go-to-market and celebration appointment funnel for Ocean Wave VIP, Vancouver.

> **Status:** Draft strategy and UI concept. This repository is public. It is **not** Ocean Wave's official booking site and does **not** submit customer information, schedule appointments, or reserve yachts. Client approval is required before branding, ad spend, integration, or publishing.

## Client wiki
- [Client brief & verification ledger](docs/clients/ocean-wave-vip/CLIENT_BRIEF.md)
- [Transactional keyword strategy](docs/clients/ocean-wave-vip/KEYWORDS.md)
- [Appointment booking & charter quote funnel](docs/clients/ocean-wave-vip/GTM_FUNNEL.md)
- [Social campaign playbook](docs/clients/ocean-wave-vip/SOCIAL_CAMPAIGNS.md)
- [LinkedIn B2B & Partnership GTM](docs/clients/ocean-wave-vip/LINKEDIN_B2B_PARTNERSHIP_GTM.md)
- [Content bible](docs/clients/ocean-wave-vip/CONTENT_BIBLE.md)
- [Competitor/social listening and 30-day roadmap](docs/clients/ocean-wave-vip/INTELLIGENCE_AND_ROADMAP.md)
- [Wiki home and source register](docs/clients/ocean-wave-vip/README.md)

## Demo
Open [index.html](index.html) locally, or use the same source at [apps/ocean-wave-vip-preview/index.html](apps/ocean-wave-vip-preview/index.html). The prototype lets users select an occasion, choose a quote request vs consultation route, and enter *demo-only* details. **The fields do not transmit data.** The page has noindex directives; GitHub Pages would require separate setup and is not configured by this branch.

## Operating model
Meta / Search / SEO / referrals → occasion page → **quote request OR consultation** → qualified CRM lead → operator-verified vessel availability → human-approved quote → deposit → confirmed charter.

### Before production
1. Verify vessel inventory (owner brief cites three, earlier public research observed two named), capacities, inclusions, pricing, cancellation/weather rules.
2. Approve photography, written offers and paid creative.
3. Integrate secure privacy/consent-aware server-side lead capture and deduplicated tracking.
4. Connect consultation scheduling through Cal.com (distinct from yacht inventory).
5. Validate Supabase RLS, Twilio/Resend consent and message delivery, and actual booking/deposit authority.
6. Test the end-to-end funnel and obtain sign-off.

## Origins
Ported from [KlickSmartAI Website Factory PR #6](https://github.com/Ksdeng1559/klicksmartwebsiteFactory/pull/6) on `docs/ocean-wave-vip-gtm-wiki`, incorporating user-supplied Ocean Wave briefing/keywords and existing relevant Notion SOPs. No client confidential PDF bytes are copied into this public repository.
