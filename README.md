# neon-harbor-lucy
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/hellolucyheart/neon-harbor-lucy/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/hellolucyheart/neon-harbor-lucy/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Harbor** is an original open-world crime game that runs entirely in the browser — no build step, no network, no downloaded assets. Explore a sun-soaked harbor city on foot and by car, steal cars, dodge the Harbor Patrol, run jobs for the fixer Vex, and rebuild Rook's name one loud night at a time.

Everything is original: the city, the characters, the vehicles, the story, the art and the synthesized sound. Nothing is taken from any commercial game.

## What is in the game

- **A city to explore** — a grid of streets, tower blocks with lit windows, neon signs, lamps, palms and the sea along the south edge.
- **On foot and by car** — walk, run, steal any parked or cruising car (E), drive with arcade physics and a chase camera.
- **Traffic and pedestrians** — cars cruise the street grid and turn at intersections; pedestrians stroll the sidewalks and scatter from a speeding car.
- **Wanted level and police** — stealing cars, hitting pedestrians and shooting raise your heat. Harbor Patrol cars spawn, pursue, ram and bust you when they corner you slow.
- **Missions and a story** — three jobs for Rook: *First Wheels* (steal a car and reach the marina), *The Harbor Drop* (pick up a crate, dodge the dock thugs, deliver it across town), and *Shake the Heat* (lose a three-star wanted level and meet Vex at the pier). Each pays cash.
- **Combat** — a hitscan pistol with tracer and muzzle flash; dock thugs shoot back and drop cash.
- **HUD with minimap** — health, money, wanted stars, speed, mission objective with timer, message feed, and a live 2D minimap with player, traffic, police, thug and beacon markers.
- **Start, pause, busted, game-over and mission-complete screens**, plus street-cash pickups and a synthesized WebAudio soundscape: engine hum, two-tone sirens, gunshots, pickups and a neon-noir bassline — no audio files.
- **Save** — progress (money, story, health, position) saves to localStorage automatically and can be continued from the title screen.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| Shift | Run |
| Mouse / ← → | Look around |
| E | Steal car / exit car |
| Click / F | Shoot |
| Space | Brake |
| Esc | Pause |
| M | Mute |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Node 22.18 or later is all you need; the game is static files under `game/` and Three.js is vendored under `game/vendor/three/`.
