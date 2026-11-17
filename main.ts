// Neon Harbor — entrypoint for make.fun gta6-01 ("Make GTA 6").
// Node 22, standard library only. Copies this repository's game/ and
// screenshots/ into the output directory and writes dossier.json with the
// kit's vendored buildDossier library, exactly as the bounty requires.
// Run locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

function countFiles(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    total += statSync(full).isDirectory() ? countFiles(full) : 1;
  }
  return total;
}

function totalBytes(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    total += st.isDirectory() ? totalBytes(full) : st.size;
  }
  return total;
}

// Fresh output: never mix a previous run's files into this one.
mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Short human summary so a local run shows what was handed in.
const shotNames = existsSync(shotsDir) ? readdirSync(shotsDir).sort() : [];
console.log(`Neon Harbor dossier written to ${outDir}`);
console.log(`game/: ${countFiles(gameDir)} files, ${totalBytes(gameDir)} bytes`);
console.log(`screenshots/: ${shotNames.join(', ')}`);
console.log(`dossier.json: ${Buffer.byteLength(dossier, 'utf8')} bytes`);
