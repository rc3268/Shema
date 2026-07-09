# Shema

Sermon notes that speak clearly. Shema is a sermon-preparation and delivery app for pastors and teachers: write and organize a sermon, build a personal illustration library, plan across a preaching calendar, and present from a distraction-free stage view with a countdown timer while actually speaking.

See `context.md` for the full project context — design decisions, business model, and roadmap. Read that file first in any new chat or Cowork session on this repo; it's written specifically to bring a new session up to speed without re-deriving decisions already made.

## What this is today

A single-file, offline-capable Progressive Web App. No backend, no accounts — everything lives in the browser's `localStorage` on one device. It installs to a home screen via the browser (`Add to Home Screen`) and works fully offline once loaded.

## Tech stack

- Plain HTML/CSS/JavaScript, no framework, no build step.
- `index.html` — the entire app (markup, styles, and logic in one file).
- `sw.js` — service worker; precaches everything listed in `ASSETS` for offline use. Bump `CACHE_NAME` whenever cached assets change, or returning users will keep the stale cache.
- `manifest.json` — PWA install manifest.
- `icons/` — standalone icon files (extracted out of `index.html`, which used to inline all of them as base64). Many icons have light/dark variants following the `<name>.png` / `<name>-dark.png` convention, wired up via `data-light`/`data-dark` attributes on the `<img>` tag.
- Fonts are self-hosted (embedded as base64 `@font-face` rules in `index.html`), not loaded from a CDN — the app has zero runtime network dependencies for its own UI.

## Running it locally

No build step. Serve the directory with any static file server and open it:

```
python3 -m http.server 8811
```

then visit `http://localhost:8811/index.html`. A real HTTP server (not `file://`) is required for the service worker to register.

## Data model

Everything is stored under a few `localStorage` keys, defined near the top of the `<script>` block in `index.html`:

- `pulpit_sermons_v1` — array of sermon documents (title, series, date, sections → items).
- `pulpit_illustrations_v1` — array of illustration/story-library entries.
- `shema_history_v1` — rolling per-sermon edit-history snapshots (last 5 per sermon), used for in-app undo.
- `shema_device_id`, `shema_dark_mode`, `shema_prep_width`, `shema_last_backup` — small device-local preferences/metadata.

Sermons and illustrations both carry `id` (UUIDv4), `updatedAt`, `schemaVersion`, and a `deleted` tombstone flag rather than being removed outright on delete — this is groundwork for a future multi-device sync engine (see `context.md`).

Backup/restore is manual today: `Backup` in the Library view exports a JSON file of everything; importing merges it back in, last-write-wins per record by `updatedAt`.

## Git workflow

Development happens on a feature branch (currently `claude/app-store-paid-launch-1jkhur`); the repo owner reviews and merges into `main` themselves. Don't push directly to `main`.
