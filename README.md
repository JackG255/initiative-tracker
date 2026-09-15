# Initiative Tracker

A combat initiative tracker for D&D 5e, built for running encounters at the table
from a phone. One page, no accounts, no install required — and it keeps working when
the wifi doesn't.

![Add the party, search a monster, hit Next Turn.](icon-192.png)

## What it does

- **Turn order** — combatants sort by initiative automatically; *Next Turn ▸* advances
  the marker and rolls the round counter over (displayed in Roman numerals, because
  of course it is).
- **Add the Party** — one tap drops your regular roster in, ready for initiative
  rolls. The names live in `PARTY_ROSTER` near the bottom of `index.html`; edit that
  list to match your table.
- **Monster search** — type a name and pick from the live [Open5e](https://open5e.com)
  bestiary. HP is rolled from the creature's hit dice and initiative from its DEX
  modifier, so adding four wolves gives you four wolves with four different rolls,
  numbered I–IV.
- **Damage, healing and conditions** — per-combatant HP tracking against a max, plus
  free-text condition chips you can add and clear.
- **Reorder and remove** — nudge combatants up and down when a roll is corrected;
  the active-turn marker follows the right creature.
- **Reset** — clears the encounter, behind a confirmation step.

Everything saves as you go, so a dropped phone or an accidental reload doesn't cost
you the fight. If saving ever fails (private browsing, full storage), a banner says
so plainly instead of silently losing your encounter.

## Running it locally

There's no build step and nothing to install. Serve the folder over HTTP:

```
py -m http.server 8000     # or: npx serve .
```

Then open <http://localhost:8000>.

Opening `index.html` directly from disk mostly works, but the service worker won't
register, so you lose offline support. Use a server.

## Installing it on a phone

The app is live on GitHub Pages:

**<https://jackg255.github.io/initiative-tracker/>**

Open that on your phone and use the browser's *Add to Home Screen*. It launches
full-screen in portrait and runs offline from then on — handy in a basement with no
signal, though monster search does need a connection.

Deploying is just pushing to `main`; Pages picks it up within a minute or two. If an
installed copy still shows the old version after a deploy, the app-shell cache needs
its version bumped — see [CLAUDE.md](CLAUDE.md).

## Your data

Encounters are stored in your browser's `localStorage` on that one device. Nothing is
uploaded, there is no server and no account, and clearing your browser data clears
your encounter. Monster searches go directly to the Open5e API; nothing else leaves
the page.

## Tech

Plain HTML, CSS and JavaScript in a single file, with a service worker for offline
use. No framework, no dependencies, no build.

| File | |
|---|---|
| `index.html` | the entire app — markup, styles and logic |
| `service-worker.js` | caches the app shell for offline use |
| `manifest.json`, `icon-*.png` | home-screen install metadata |

Contributors: see [CLAUDE.md](CLAUDE.md) for the conventions and the one real footgun
(bump `CACHE_NAME` when you change the app, or installed copies keep the old version).

## Credits

Monster data via [Open5e](https://open5e.com). Includes material from the D&D SRD,
© Wizards of the Coast, licensed under
[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).
