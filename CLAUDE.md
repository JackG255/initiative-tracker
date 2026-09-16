# Initiative Tracker

A D&D 5e combat initiative tracker. Single-page, dependency-free PWA: `index.html`
holds all markup, CSS and JS inline; `service-worker.js` and `manifest.json` make it
installable and offline-capable.

## Layout

- `index.html` — the whole app. `<style>` from line ~16, `<script>` from line ~318.
- `service-worker.js` — app-shell cache.
- `manifest.json`, `icon-192.png`, `icon-512.png` — install metadata.

There is no `package.json`, no build step, no tests, no dependencies. Edit the files
directly; do not introduce a bundler or npm setup without asking.

## Running it

```
py -m http.server 8000    # then http://localhost:8000
```

Serve over HTTP — a service worker will not register from `file://`.

## Deployment

GitHub Pages, from the repo root:
<https://jackg255.github.io/initiative-tracker/>

It is a **project site**, so the app is served from the `/initiative-tracker/`
subpath, not from the domain root. That drives several rules:

- **Every path stays relative.** `index.html` links `manifest.json`, the icons and
  `navigator.serviceWorker.register('service-worker.js')` with no leading slash, and
  the manifest uses `./index.html` and `"scope": "./"`. A single leading `/` anywhere
  resolves against the domain root and 404s in production while still working fine on
  a root-served localhost — it will not show up in local testing. Don't add a `<base>`
  tag either.
- The service worker's scope is that subpath, which is what you want: `'./'` in
  `APP_SHELL` resolves against the scope.
- **Bump `CACHE_NAME` in `service-worker.js` whenever `index.html`, the manifest or
  the icons change.** The `activate` handler deletes caches whose name doesn't match,
  so the bump is what evicts stale shells from installed clients. Skip it and users
  keep running the old app after you deploy.
- **Navigations are network-first**, unlike every other request. `freshShell()` races
  the network (`cache: 'no-cache'`, so the browser's own HTTP cache can't serve stale
  HTML either) against a `NAV_TIMEOUT_MS` fallback to the cached shell, so a launch
  with any working connection gets the current deploy. That is a safety net, not a
  licence to skip the `CACHE_NAME` bump: it does nothing for a client that is already
  open, and offline launches still come from whatever the cache holds.
- Pages serves over HTTPS, which the service worker requires. A deploy takes a minute
  or two to go live, and clients with the app already installed pick it up only after
  the worker updates.
- Pages runs Jekyll by default, which ignores files and folders whose names start with
  `_`. Add a `.nojekyll` file at the repo root before introducing any such asset.

## Target runtime

The standalone PWA is the target. `index.html` also contains a `window.storage`
branch in `saveStateNow`/`loadState` for running as a Claude.ai artifact; that path
is legacy. Don't build on it, and don't let it constrain new work — but leave it in
place unless asked to remove it.

## State and persistence

- One global `state = { combatants, currentIndex, round, party, rules }`, persisted
  to `localStorage` under `encounter-state-v1`.
- `state.rules` holds the opt-out automatic-rule switches (`RULE_KEYS`). Only an
  explicit `false` disables one, so state saved before a rule existed opts into it.
  Reset preserves `rules` and `party` — neither belongs to a single encounter.
- A combatant's `type` is its disposition, not its stat-block source:
  `COMBATANT_TYPES` is pc / friendly / enemy / neutral. `sanitizeType` maps the
  retired `monster` and `npc` values to enemy and neutral on load, and pins
  anything unrecognised, since `type` is interpolated into the card.
- A condition is `{ text, rounds }`, where `rounds: null` means "until removed by
  hand". `sanitizeCondition` upgrades the legacy plain-string form on load.
- Bloodied and Unconscious are *derived in `render()`* from HP, never stored in
  `conditions`. Keep it that way: stored copies drift out of step with the bar and
  can be removed by mistake.
- Writes go through `scheduleSave()` (300 ms debounce), never
  `localStorage.setItem` directly.
- `sanitizeState()`/`sanitizeCombatant()` run on every save and load, because
  stored state may predate the current shape. If you add a combatant field, give it
  a default in `sanitizeCombatant` rather than assuming it exists.
- Changing the stored shape incompatibly means bumping `STORAGE_KEY`, otherwise
  existing users load garbage.
- Persistence failure (private mode, quota) is not fatal: it flips `persistenceOk`
  and shows a banner via `setPersistenceBanner(false)`. Keep that path working.

## Monster search

`searchLiveBestiary()` hits the Open5e v2 API live. Notes:

- The service worker deliberately ignores cross-origin requests, so search results
  are always fresh and the app's offline fallback still triggers. Don't "fix" this
  by caching the API.
- Results are de-duped by `name|sourceKey`, sorted core-rulebook-first via
  `CORE_DOCUMENT_KEYS`, and capped at 16.
- The Open5e attribution line in the footer is a licensing requirement (SRD content,
  CC-BY-4.0). Leave it.

## Conventions

- Rendering is full-redraw: mutate `state`, then call `render()`. `render()` rebuilds
  the list HTML and `attachCardListeners()` re-binds events — there is no diffing, so
  don't hold references to DOM nodes across a render.
- Any user-supplied or API-supplied string interpolated into HTML goes through
  `escapeHtml()`.
- Vanilla JS in the existing style — no framework, no ES modules, no imports.
