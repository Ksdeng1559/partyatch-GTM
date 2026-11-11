# Ocean Wave VIP — Vancouver Multilingual Content & UGC Playbook

**Status:** Draft, client-approval-pending. Language selection and preview translations are implemented; production campaign localization is not connected to translation, voiceover, publishing or the CRM. **All non-English content requires native-speaker review before any public use.**

## Languages enabled

| Code | Language | Usage |
| --- | --- | --- |
| `en-CA` | English (Canada) | Source of truth and default |
| `zh-Hans` | Simplified Chinese (Mandarin-oriented written copy) | Mandarin-language campaigns, reviewer required |
| `zh-Hant` | Traditional Chinese (Hong Kong/Cantonese-oriented written copy) | Cantonese-language audiences; **written Traditional Chinese is not a substitute for Cantonese spoken scripts** |
| `pa` | Punjabi (Gurmukhi) | Vancouver-area Punjabi community campaigns; reviewer required |
| `tl` | Tagalog / Filipino | Tagalog/Filipino audience campaigns |
| `hi` | Hindi (Devanagari) | Hindi-language campaigns |
| `ko` | Korean | Korean-language campaigns |
| `es` | Spanish | Spanish-language campaigns |
| `fr-CA` | Canadian French | French-language campaigns |

These are **candidate outreach languages**, not a measured priority ranking or evidence of Ocean Wave demand in each language. Validate content demand, buyer intent, accessibility, linguistic preference and actual qualified bookings before allocating media budget. Never infer a person's ethnicity or language from surname, appearance or other sensitive personal information. Offer a user-selected language preference, avoid unsolicited language-targeted messages, and follow CASL and privacy requirements.

## Implemented preview

`apps/ocean-wave-vip-preview/i18n.js` provides a dictionary and client-side locale detection. The same non-submitting preview appears at `/index.html` and `/apps/ocean-wave-vip-preview/index.html`. It supports a visible language selector, `?lang=pa` (or any approved locale), browser-language initial choice, localized CTA/form copy, occasion labels and privacy/no-booking disclosures.

No translation API, visitor analytics, session storage, cookies, CRM submission, booking confirmation or network calls are used. The selected language is encoded in the URL for shareable preview links; it is not submitted to a backend.

The preview carries **noindex**, **no affiliation**, and **draft translation** notices in all languages. Official publication requires an approved client identity, translation QA, privacy/consent language and functionality verification. Do not change the claims just to sound locally appealing.

## Multi-language content factory workflow

1. LeadOS identifies a confirmed audience **by self-selected language**, occasion intent and available source evidence, not ethnic inference.
2. Viral Content Engine writes the English factual master script from the Content Bible and approved vessel facts. Record research date and source URLs.
3. Prepare original adaptations per language: idioms, cultural tone, CTA length and captions—not unreviewed machine translations or stereotypes.
4. For Mandarin: native Mandarin voice and Simplified Chinese captions. For a Cantonese campaign: use an approved **Cantonese spoken script** and Traditional Chinese captions, distinguishing spoken `yue-Hant` from written `zh-Hant`.
5. Higgsfield/Krea can receive a human-reviewed localized creative brief; keep authentic yacht footage and visual provenance locked.
6. Reviewers check price/currency, vessel capacity, inclusions, departure policies, legal disclosures, synthetic media labels, phone/email CTA and rights.
7. Mark localizations `DRAFT_NEEDS_NATIVE_REVIEW → HUMAN_REVIEWED → CLIENT_APPROVED → RELEASED` in a future persistent workflow. Never auto-promote a translation to approved content.
8. Publish only through authorized platforms after approval. Report view → inquiry → qualified lead → booking by `language`, `platform`, `campaign`, `hook`, `creative_variant`, and consent status without collecting unnecessary sensitive data.

**ICM integration:** `icm/src/handoff.mjs` accepts an optional `icm.language` with the above codes (defaults to `en-CA` for backwards compatibility); rejects unsupported languages and mismatched `creative.language`. Imported briefs record the selected language and `DRAFT_NEEDS_NATIVE_REVIEW` when non-English. This adds metadata only; actual translation review remains a human gate in the production design. The engine must not treat locale tags as proof of approval.

## Technical SEO before launch

- Do not expose translated indexed pages while the funnel remains an unofficial preview; retain `noindex`.
- Once approved and fully localized, use unique permanent language URLs and bidirectional `hreflang`/canonical annotations; avoid serving multiple crawlable languages from a single client-side URL.
- Translate visible navigation, metadata, forms, validation and safety notices together. Do not create thin doorway pages based only on language.
- Test Chinese font rendering, Punjabi Gurmukhi, Unicode punctuation, mobile CTA wrapping, screen-reader `lang`, and accessibility in every language.

## Acceptance checklist

- [ ] All supported languages selectable in both preview copies.
- [ ] Selected language updates HTML `lang`, URL, headings, occasions, labels, budget choices, CTA, disclosures and result message.
- [ ] Buttons still never submit a real inquiry or claim booked yacht availability.
- [ ] Unsupported query language falls back safely.
- [ ] Every non-English publication has a named native-speaking reviewer and proof of client approval.
- [ ] Content factory variants have correct language-specific script, caption, voice and CTA with verified yacht facts.
- [ ] No automatic publication or paid creative production is enabled.
