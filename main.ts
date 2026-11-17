// Neon Harbor — a three.js open-world crime game for make.fun gta6-01
// (Node 22, standard library only). The program copies this repository's
// game/ (the playable game: static ES modules, three.js vendored) and
// screenshots/ (3 or 4 real renders of the game's own code) into /output
// and writes /output/dossier.json with the vendored make.fun library,
// byte for byte as the scorer rebuilds it.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the dossier bytes; the rest refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; game/ over 993 files or
// 48 MiB in all; /output's own 1,000-entry cap counts game/ beside
// screenshots/ and dossier.json, so the checks below leave it room).
const TEXT_MAX_BYTES = 163_840;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 262_144 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) {
  process.stderr.write('neon harbor: screenshots/ is missing: hand in 3 or 4 real renders of the game\n');
  process.exit(1);
}
mkdirSync(join(out, 'screenshots'), { recursive: true });
const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.') && statSync(join(shotsDir, n)).isFile());
if (shots.length < 3 || shots.length > SCREENSHOT_CAPS.max) {
  process.stderr.write(`neon harbor: screenshots/ holds ${shots.length} image(s): hand in 3 or 4\n`);
  process.exit(1);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) {
    process.stderr.write(`neon harbor: screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters\n`);
    process.exit(1);
  }
  const size = statSync(join(shotsDir, name)).size;
  if (size > SCREENSHOT_CAPS.max_bytes) {
    process.stderr.write(`neon harbor: screenshots/${name} is ${size} bytes: the cap is ${SCREENSHOT_CAPS.max_bytes}\n`);
    process.exit(1);
  }
}
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The dossier is written last: the scorer rebuilds it from this /output
// and compares bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: SCREENSHOT_CAPS,
    game_max_files: 993,
    game_max_bytes: 50_331_648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`neon harbor: wrote ${out} with ${shots.length} screenshots`);
