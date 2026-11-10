# Search-intent & transactional keyword map

## Provenance
**Actual input:** User-supplied `saved-keywords.csv`, fetched 2026-11-10 02:53–02:59 UTC. Columns: Keyword, Volume, CPC, Competition, Score, Intent, Tags, Fetched At. Provider identity, currency, geographic targeting, match types, time window, and deduplication are unknown. **Do not add related keyword volumes together.** Numbers below are imported from that file; other keywords are qualitative hypotheses.

## Measured candidates from supplied CSV
| Keyword | Tool volume | CPC (unknown currency) | Tool competition (0–1) | Intent label |
|---|---:|---:|---:|---|
| yacht rental vancouver | 1,900 | 1.85 | 0.78 | commercial |
| rent a yacht in vancouver | 1,900 | 1.58 | 0.79 | transactional |
| boat rental vancouver | 1,900 | 1.26 | 0.71 | commercial |
| yacht hire vancouver | 880 | 2.58 | 0.35 | transactional |
| charter a boat in vancouver | 880 | 2.58 | 0.35 | transactional |
| boat charter vancouver | 170 | 1.76 | 0.65 | commercial |
| boat rental for party | 260 | 2.08 | 0.45 | transactional |
| boat party rental vancouver | 140 | 1.59 | 0.91 | commercial |
| vancouver yacht rental party | 90 | 1.32 | 0.51 | commercial |
| boat tour vancouver | 720 | 3.28 | 1.00 | commercial / possible mismatch |

**Caution:** “boat rental”/“boats for rental” each show 9,900 in the export but lack a Vancouver qualifier, so they are not evidence of Vancouver charter demand. “boat tour Vancouver” may mean shared sightseeing and should not receive a private-party page unless the audience matches.

## Page-to-intent clusters (new keywords below unmeasured hypotheses)
| Page/section | Primary keyword idea | Supporting intent phrases | Priority |
|---|---|---|---|
| /yacht-rental-vancouver/ | yacht rental Vancouver | rent a yacht in Vancouver; private yacht charter Vancouver; charter a boat Vancouver | P1 |
| /celebrations/ | private yacht party Vancouver | private celebration yacht Vancouver; private party boat Vancouver; boat rental for party | P1 |
| /birthday-yacht-party-vancouver/ | birthday yacht rental Vancouver | birthday boat party Vancouver; 30th/40th/50th birthday boat | P1 |
| /bachelorette-yacht-party-vancouver/ | bachelorette yacht rental Vancouver | stagette boat party; bachelorette party boat | P1 |
| /bachelor-yacht-party-vancouver/ | bachelor yacht rental Vancouver | stag boat party; bachelor boat charter | P1 |
| /graduation-yacht-party-vancouver/ | graduation boat party Vancouver | graduation yacht rental; graduation party venue | P1 seasonal |
| /retirement-party-yacht-vancouver/ | retirement party yacht Vancouver | retirement party venues; corporate retirement cruise | P1 test |
| /bridal-shower-yacht-vancouver/ | bridal shower yacht Vancouver | bridal party yacht; bridal shower boat venue | P2 |
| /private-party-yacht-vancouver/ | private party yacht Vancouver | girls night yacht; guys night boat | P2 consolidate |
| /new-beginnings-yacht-party-vancouver/ | divorce party yacht Vancouver | divorce celebration; new beginnings party | P2 experiment |
| /yacht-rental-prices-vancouver/ | yacht rental Vancouver prices | four-hour charter cost; rental for 12/15 people | P1 FAQ/section first |

**Canonical strategy:** prefer existing official Ocean Wave page URLs when they cover an intent; do not create duplicate pages solely for spelling changes. The suggested paths require SEO/owner approval. Consolidate girls/guys into group-party page until differentiating evidence exists. Divorce/new-beginnings may remain an internal ad angle rather than its own indexed page until proven.

## Paid-search starter
Exact/phrase candidates: [yacht rental vancouver], “private yacht charter vancouver”, “birthday yacht rental vancouver”, “bachelorette yacht rental vancouver”, “boat party rental vancouver”, “retirement party yacht vancouver”. Use report-only negatives initially (e.g. for sale, jobs, kayak, jet ski, fishing, storage) and refine by real search terms. No spend authorized.

## Keyword validation
- [ ] Confirm country, local geography, currency, data provider and month.
- [ ] Use OpenSEO/Google Keyword Planner and actual SERPs for occasion terms.
- [ ] Check GSC clicks/impressions and existing indexable URLs with owner access.
- [ ] Validate rank/seasonality and commercial fit.
- [ ] Map one core intent to one canonical page; assign content owner.
