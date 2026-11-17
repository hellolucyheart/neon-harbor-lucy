# neon-harbor-lucy
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/hellolucyheart/neon-harbor-lucy/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/hellolucyheart/neon-harbor-lucy/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Harbor** is an original open-world crime game for make.fun's gta6-01 bounty,
built with Three.js and plain static files — no build step, no network requests.

You play **Rico Vane**, a wheelman in the sun-soaked port city of Marisol Bay.
Steal a car, outrun Harbor PD, settle a debt at the old cannery warehouse, and
vanish before the heat closes in. The city is procedural and deterministic: a
10×10 street grid of lit towers, neon signs, palm trees and a marina, with
traffic cruising the avenues and pedestrians scattering when trouble arrives.

## Features

- Open world on foot and by car — steal any car, drive arcade-style, handbrake turns
- Wanted system (0–5 stars) with Harbor PD pursuit cars that ram and bust you
- 3 story missions with a HUD tracker, beacon marker and cash rewards
- On-foot combat: hitscan shooting, tracers, muzzle flash, thugs who shoot back
- HUD with health, cash, wanted stars, speed, objective and a live circular minimap
- Title, pause, busted, game-over and story-complete screens
- Autosave to localStorage (cash, mission, position, wanted level) with Continue
- Synthesized WebAudio sound only — engine hum, sirens, gunshots, bassline loop

## Controls

| Input | Action |
| --- | --- |
| W A S D | Move / drive |
| Mouse drag | Look around |
| E | Steal / enter car, exit car |
| Click | Shoot (on foot) |
| Shift | Run |
| Space | Handbrake |
| Esc | Pause |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

All characters, places, vehicles, names, story, art and music are original —
nothing from any commercial game.
