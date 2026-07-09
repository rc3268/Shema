# Context for Shema

This file exists to bring a new Claude chat or Cowork session up to speed on this project without re-deriving decisions that have already been made. Read this before making product, design, or architecture calls here — it captures the *why*, not just the *what* (the *what* is in `README.md` and the code itself).

## End goal

Ship Shema as a **paid app on the Apple App Store and Google Play Store**. Target user: pastors and teachers who prepare a sermon on one device (PC/Mac, or a tablet) and then present it on whatever device is in hand at the venue (phone, tablet, or the same laptop) — so cross-device continuity of the sermon itself is a core requirement, not a nice-to-have.

## Business model

- **Standalone one-time purchase**: local-only use, no account, no cross-device sync. This is the base product and must stay fully functional forever — sync is additive, never a requirement to use the app.
- **Monthly subscription add-on**: unlocks cross-device sync (the same sermon library available signed-in on any device). Gated per-account, not per-device.
- No Apple Developer account exists yet (as of this writing). Packaging/store submission work is intentionally deferred until the app itself is in a good place — see "Roadmap" below.

Recommended pricing (from competitive research, see "Competitive positioning" below): **one-time unlock ~$29.99–39.99**, **sync subscription ~$4.99/mo or ~$39.99/yr**. Not yet finalized — revisit once closer to launch.

## Design principles

- **Offline-first, always.** A pastor walking into a venue with no signal must have a fully working app. Sync (once built) reconciles in the background and never blocks Prepare or Present.
- **"Simple, graceful" visual theme.** Recent UI work has consistently traded density for calm — e.g. the Prepare-screen redesign moved the sermon title out of the main view into a popup (reopenable by tapping the title in the top bar) and collapsed the formatting toolbar into a toggleable sidebar, specifically because the prior layout felt "crowded" and off-theme. Default to this instinct: when adding a feature, ask whether it can live behind a toggle/popup rather than adding permanent on-screen chrome.
- **Present mode is for actually preaching from, not just displaying text.** Large type, a stage countdown timer, minimal chrome. This view's needs (can the presenter tell there's more content below the fold without looking away from the audience?) are treated as a distinct design problem from the editor's needs — decisions that are fine in Prepare (e.g. hiding a scrollbar for cleanliness) are evaluated separately for Present, where the same choice has a live-presentation-risk dimension.
- **Complementary to ProPresenter, not competing with it.** Shema exports to ProPresenter rather than trying to replace a church's existing projection/worship-presentation software. This is a deliberate go-to-market wedge ("the sermon-writing companion to the presentation software you already run"), not an accident of scope.
- **Single-file app, kept diffable.** `index.html` holds all markup/CSS/JS by design (no build step, trivial to serve/test). To keep it reviewable as it grows: icons live in `icons/` as standalone files (not inlined base64) with a `data-light`/`data-dark` attribute convention for theme variants, and fonts are self-hosted as base64 `@font-face` rules rather than pulled from a CDN, so the app has zero runtime network dependency for its own UI.

## Current architecture snapshot

- Plain PWA: `index.html` + `sw.js` (service worker, versioned `CACHE_NAME`) + `manifest.json`. No backend, no accounts.
- Data lives in `localStorage` only (see `README.md` for the exact keys). No server round-trip exists yet.
- As of the "Phase 1" work (see History), the data model is deliberately **sync-ready but not yet synced**: sermons and illustrations use UUIDv4 ids, carry `updatedAt`/`schemaVersion`, and deletes are tombstones (`deleted:true`) rather than array removal, specifically so a future sync engine can propagate a delete instead of resurrecting it. Backup export/import already does real last-write-wins merge by id+`updatedAt` as a preview of that logic on a single device.
- Responsive design has explicit breakpoints (480/768/1000/1600px) and, as of the most recent change, wide-screen content columns use **fixed pixel margins from the screen edge** rather than a centered `max-width` cap — content keeps growing on ultra-wide monitors instead of floating as a narrow centered island.

## Competitive positioning (researched mid-2026, re-verify before acting on pricing)

The direct "sermon-outlining app" niche is thin. The closest real competitor is **Sermonary** (web-only, $49–99/mo, AI-writing-first, no confirmed ProPresenter integration) — priced as a premium outlier. **Preach: Sermon Builder** is the closest small native-app peer (free w/IAP, modest but real traction). Everything else is adjacent, not competing head-on: **Proclaim** and **ProPresenter** are whole-team worship-production software priced per seat ($18–72/mo, $29–59/mo); **Logos** bundles a sermon builder into its $9.99–19.99/mo study-suite subscription rather than selling it alone; **Planning Center** is team scheduling/ops, priced by headcount.

This is real whitespace, but cuts both ways: nobody has made a big hit out of "just sermon writing + present mode," which could mean it's unexecuted opportunity, or could mean pastors don't want to pay separately for a point solution when a bundled tool (Logos, Proclaim) already covers something similar. Treat this as an open risk, not a solved question — validate with real users before over-investing in features nobody asked to pay for separately.

Biggest go-to-market barriers identified (see full analysis from the market-evaluation session): near-zero organic App Store discoverability against incumbents with existing installed bases; pastors as a slow, trust-driven, often committee-gated buyer; no track record yet (cold start); growth partly tethered to ProPresenter's own visibility given the export-hook strategy; feature-race risk against a funded competitor (Sermonary) if differentiation drifts away from simplicity/offline-reliability/price.

## Roadmap

Phased plan to get from the current local-only PWA to synced, store-ready apps. Each phase is described in more depth in the conversation history that produced this file; summarized here for continuity.

1. **Data model sync-readiness — ✅ done.** UUIDv4 ids, tombstone deletes, per-record `schemaVersion`, persisted `deviceId`, last-write-wins backup merge. See History below for the commit.
2. **Accounts & entitlement — not started.** Needs a backend decision (leaning Supabase or Firebase for managed auth+db, to avoid hand-rolling a server). Must support Sign in with Apple (mandatory the moment any other third-party login is offered) + Google + email. Entitlement should be two independent account-level flags: `ownsApp` (one-time unlock) and `syncSubscriptionActive` (recurring) — sync is gated on the account, not the device.
3. **Sync engine — not started.** Local-first writes, background push/pull reconciliation, last-write-wins per record on `updatedAt` (open question: is silent last-write-wins acceptable for the rare same-sermon-edited-offline-on-two-devices case, or should a conflict copy be kept instead? Leaning silent LWW with recovery via the existing history log, not yet locked in).
4. **Store packaging — not started.** Capacitor recommended for wrapping the PWA for both iOS and Android from one codebase (a Trusted Web Activity would only cover Android). RevenueCat recommended to unify StoreKit + Play Billing behind one API and offload receipt/subscription validation, rather than building that verification backend by hand.
5. **Store compliance — not started.** Privacy policy + ToS (required once accounts/data leave the device), Apple privacy nutrition label, Play Data safety form, App Store Review Guideline 3.1.1 (StoreKit-only for this app's subscription — no external payment links are allowed for this category).
6. **Migration & rollout — not started.** Existing local-only users need a one-time "sign in to turn on sync" flow that uploads their existing local sermons rather than starting them empty. The no-account local-only path must stay fully functional as the permanent default, not a crippled trial.

**Testing costs**: most of phases 2–4 can be built and fully tested for $0 before committing any money — Supabase/Firebase free tiers are indefinite (not trials), RevenueCat is free under $2,500/mo tracked revenue, Capacitor is free/open-source, Xcode's local StoreKit Configuration file simulates the entire purchase/subscription lifecycle with no paid Apple account, and Android has free sideload testing plus reserved test product IDs for billing flows. The two genuinely unavoidable costs are the Apple Developer Program ($99/year, needed for TestFlight/App Store listing) and Google Play Console ($25 one-time, needed for any Play Store distribution) — both can and should be deferred to the very end of the roadmap, once everything else already works.

## Working conventions

- Development happens on a feature branch (`claude/app-store-paid-launch-1jkhur` as of this writing); the repo owner reviews/merges to `main` themselves. Don't push to `main` directly.
- No build step, no test framework in the repo. Verification during development has relied on headless Playwright scripts (spun up ad hoc against a local `python3 -m http.server`) to check layout, drag-and-drop, and console errors across viewport sizes — there's no persisted test suite, so re-verify UI changes manually/via a quick script rather than assuming coverage exists.
- Before making a UI/UX call that trades off discoverability, affordance, or live-presentation risk (anything touching Present mode especially), reason explicitly about who's affected and how — this project's design decisions have consistently favored a short written risk/tradeoff evaluation over silently picking a default.

## History

Dated as far back as the available commit history allows.

- **2026-07-06 to 2026-07-08** — Initial build of the app (manual file uploads: `index.html`, `sw.js`, icons, manifest), iterated to the point of being a working single-device PWA before this file existed.
- **2026-07-09** — Confirmed the paid-download + subscription-for-sync business model; decided to focus on app improvement before packaging/delivery work. Fixed Present-view toolbar overflow on phone widths. Self-hosted fonts (removed the Google Fonts CDN runtime dependency). Fixed two more responsive overflow bugs from a full breakpoint sweep. Extracted inlined base64 icons out of `index.html` into standalone files under `icons/`, with a light/dark variant naming convention. Redesigned the Prepare screen: sermon title moved into a create-time popup (reopenable from the top bar), formatting toolbar collapsed into a toggleable sidebar, per-section "+" buttons replaced by one toolbar "+" with drag-to-place. Switched wide-screen content columns from a centered `max-width` cap to fixed edge margins so content keeps growing on ultra-wide monitors. Evaluated and removed the visible scrollbar on Present-view content (accepted the live-presentation affordance risk as a deliberate tradeoff). Landed Phase 1 of the sync roadmap (UUIDs, tombstone deletes, schema version, device id, real backup merge logic). Laid out the full six-phase roadmap to backend/accounts/store packaging. Researched free-tier testing paths and the competitive/pricing landscape ahead of committing to the roadmap. Created this file and `README.md`.
