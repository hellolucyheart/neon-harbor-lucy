// Neon Harbor — tiny static file server for local play-testing.
// Serves game/ on http://localhost:8080 (or --port <n>). Development
// convenience only: it refuses every path that escapes game/ and sends the
// MIME types a browser game needs. Node 22, standard library only.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const flagIndex = process.argv.indexOf('--port');
const wanted = flagIndex === -1 ? 8080 : Number(process.argv[flagIndex + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

function mimeFor(file) {
  const table = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.txt': 'text/plain; charset=utf-8',
  };
  return table[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

function resolveInside(requestPath) {
  let pathname = requestPath;
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(gameRoot, normalize(pathname)));
  if (file !== gameRoot && !file.startsWith(gameRoot + sep)) return null;
  return file;
}

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  const file = resolveInside(pathname);
  if (!file) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': mimeFor(file),
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Neon Harbor game/ is on http://localhost:${port}`);
});
