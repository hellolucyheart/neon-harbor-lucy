// Neon Harbor entrypoint: copies game/ + screenshots/ into the output dir and
// writes the dossier buildDossier produces from them, byte for byte.
import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const repoRoot = resolve(import.meta.dirname);

function fail(message) {
  throw new Error(`main.ts: ${message}`);
}

function copyTree(srcDir, destDir) {
  if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) fail(`${srcDir} is missing`);
  mkdirSync(destDir, { recursive: true });
  cpSync(srcDir, destDir, { recursive: true, dereference: false });
}

function checkShots() {
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing: the entry needs 3 or 4 real renders');
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    fail(`screenshots/ holds ${shots.length} images: the entry needs 3 or 4`);
  }
  for (const name of shots) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > 262144) fail(`screenshots/${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
}

checkShots();
mkdirSync(outDir, { recursive: true });
copyTree(join(repoRoot, 'game'), join(outDir, 'game'));
copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`main.ts: wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
