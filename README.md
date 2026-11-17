# 🍸 Drinking Roulette

A mobile-first party timer built with **Vue 3 + Quasar 2 (Vite)**.

Add your crew, choose an order (or let it shuffle), hit **Start**, and tap **NEXT** when
each person finishes drinking. Every turn's interval is recorded and the next player's
timer starts automatically — round after round until you end the game.

Everything is stored in the browser's `localStorage`. There is no backend and no account.

## Features

- Add / rename / remove / reorder players (up to 24)
- **In order** mode (same sequence every round) or **Shuffle** mode (fresh order every
  round, with a preview and re-roll)
- Live timer with tenths of a second, auto-starting the next player on **NEXT**
- Keeps looping rounds until you tap **End**
- **Pause / Resume** — time is frozen and the turn is flagged as paused
- **Undo last** — deletes the last interval and restarts that player's turn
- **Live leaderboard** during the game (leader chip + bottom sheet) and a champion
  board on the results screen, ranked by fastest average turn
- Results screen: per-turn table, per-player totals / averages / best, quickest & longest
  turn, bar chart, wall time
- Saved game history on the device, JSON export / import backup
- Resumes an in-progress game after a refresh or closing the browser
- Keyboard shortcuts: `Space`/`Enter` next, `P` pause, `Ctrl+Z` undo

## Run it

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev      # http://localhost:9000
```

> **Version pin:** `@quasar/app-vite` is pinned to `2.5.3`. Versions `2.5.4+`
> refuse to run on Node versions below `22.22.0`, so keep the pin (or upgrade
> Node) before bumping it.

## Build for the web

```bash
npm run build    # output in dist/spa
```

Deploy the contents of `dist/spa` to any static host (Netlify, Vercel, GitHub Pages,
Cloudflare Pages, a plain folder on a server…). Routing uses the hash (`/#/play`), so
no SPA rewrite configuration is needed.

## Going mobile later (Capacitor)

The project is prepared for it:

1. `npm run build`
2. `npx quasar mode add capacitor`
3. `npx quasar build -m capacitor -T android` (or `-T ios`)
4. Open the generated project in Android Studio / Xcode.

Hash routing, safe-area padding and touch-friendly controls are already in place.

## Where data lives

| Key | Contents |
| --- | --- |
| `drinking-roulette:state:v1` | players, mode, running game, recorded turns, saved games |

Clearing site data resets the app. Use **Export JSON** on the setup screen for a backup.

## Project structure

```
src/
  App.vue                    Quasar layout + dark mode
  router/                    hash router (setup / play / results)
  pages/
    SetupPage.vue            players, order mode, backup, saved games
    PlayPage.vue             live timer, next / pause / undo / end
    ResultsPage.vue          session summary and per-turn breakdown
  components/
    PlayerRow.vue            reorder / rename / delete a player
    TimerDisplay.vue         big mm:ss.d digits
    ResultChart.vue          horizontal per-player bar chart
  composables/
    useGame.js               single reactive store + localStorage persistence
  utils/                     time formatting, shuffle, colors, JSON download
  css/app.css                neon dark theme
```
