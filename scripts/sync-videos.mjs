// Copies trip videos (and their poster images) from src/content/trips into
// public/trips, so the site can serve them. Runs automatically before
// `npm run dev` and `npm run build` (see "predev"/"prebuild" in package.json).
//
// Why: Astro optimises photos it finds in Markdown, but it doesn't handle
// video files. Anything in public/ is served as-is, so we copy videos there.
// The copies are generated, so public/trips/ is in .gitignore: the content
// folder stays the single place you add media.
//
//   src/content/trips/yunnan-2026/media/day-02/51-singing.mp4
//   → public/trips/yunnan-2026/media/day-02/51-singing.mp4

import fs from "node:fs";
import path from "node:path";

const SOURCE = "src/content/trips";
const TARGET = "public/trips";
const WANTED = /(\.mp4|-poster\.webp)$/i;

let copied = 0;
const kept = new Set();

for (const file of walk(SOURCE)) {
  if (!WANTED.test(file)) continue;
  const destination = path.join(TARGET, path.relative(SOURCE, file));
  kept.add(destination);

  // Skip files that are already up to date (same size, not newer).
  const from = fs.statSync(file);
  const to = fs.existsSync(destination) ? fs.statSync(destination) : null;
  if (to && to.size === from.size && to.mtimeMs >= from.mtimeMs) continue;

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(file, destination);
  copied++;
}

// Remove copies whose original was deleted or renamed.
let removed = 0;
for (const file of walk(TARGET)) {
  if (!kept.has(file)) {
    fs.rmSync(file);
    removed++;
  }
}

console.log(`[sync-videos] ${kept.size} file(s) in public/trips (${copied} copied, ${removed} removed)`);

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}
