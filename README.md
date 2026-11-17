# Neon Harbor — Open-World Crime

[![make.fun gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/hellolucyheart/neon-harbor-lucy/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/hellolucyheart/neon-harbor-lucy/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the make.fun **gta6-01 "Make GTA 6"** bounty. Built with Three.js, playable offline in a desktop browser from static files — no network requests, no build step.

You are **Lena**, a courier with fast wheels and faster debts, new in **Neon Harbor** — a sun-soaked port city of neon avenues, a working pier, and Harbor PD cruisers that never sleep. Riko, a fixer on Pier 9, has four jobs for you. Take them, and the harbor is yours.

## Play

Serve the game and open it in a desktop browser:

```sh
node serve.ts
# then open http://localhost:8080
```

## What is in the game

- **A city to explore** — a seeded neon harbor city: street grid, towers with lit windows, rooftop neon signs, a park, a plaza fountain, the pier and the water.
- **On foot and by car** — walk, run, steal any parked or driven car (E), arcade driving with a chase camera.
- **Traffic and pedestrians** — NPC cars loop the avenues and slow for the car ahead; pedestrians stroll the sidewalks and flee from speeding cars.
- **Wanted level and police** — 1–5 stars. Cruisers chase, ram, and bust you on foot. Break line of sight and the heat fades.
- **Missions and a story** — four jobs for Riko: a meet at the pier, a car boost for the garage, a getaway from a 3-star chase, and a turf war with the Redline crew for a gold case. Cash rewards, dialog, and a mission beacon.
- **Combat** — punch (F / click) and shoot (right-click) with tracers, impact sparks, and rivals who fight back.
- **HUD and minimap** — health, cash, wanted stars, clock, speed, mission objective, story dialogs, and a live minimap with traffic, cruisers, rivals, and the mission marker.
- **Start screen and save** — New Game / Continue, pause menu, and localStorage saves (cash, mission, position, clock).
- **Sound** — synthesized WebAudio only: engine hum, two-tone sirens, gunshots, thuds, and mission jingles. No audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Shift | Run |
| E | Enter or steal a car / get out |
| F or left-click | Punch |
| Right-click | Shoot |
| Mouse drag | Look around |
| Esc | Pause |

## Structure

`game/` holds the playable game. `game/src/` splits it into one clear job per file: `entry` (boot + loop), `city` (world), `walker` / `driver` (movement), `traffic` / `pedestrian` (crowds), `patrol` / `wanted` (the law), `quests` (missions), `fight` (combat), `display` / `radar` (HUD + minimap), `tunes` (sound), `vault` (save), `spark` (particles), `chasecam` (camera), `staging` (screenshot poses), plus `seedling`, `state`, and `controls`. Three.js is vendored under `game/vendor/three/`.

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are real renders of the game, taken with `?shot=chase|drive|mission|start&seed=7` (see `shots.json`).

## License

MIT — see [LICENSE](LICENSE).
