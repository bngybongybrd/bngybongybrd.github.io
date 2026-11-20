// Warns if any photo or video under src/content would publish a location.
// Runs before every build (see "prebuild" in package.json) and on demand with
// `npm run check:exif`. It only warns; it never changes or deletes files.
//
// Where location hides:
// - Photos (JPEG/WebP): an EXIF block can contain a "GPS" section
//   (tag 0x8825) with latitude and longitude.
// - Videos (MP4/MOV): phones store location in metadata boxes named
//   "©xyz" or "com.apple.quicktime.location.ISO6709".
// No library is needed: we look for those markers in the file's bytes.

import fs from "node:fs";
import path from "node:path";

const ROOT = "src/content";
const problems = [];
let checked = 0;

for (const file of walk(ROOT)) {
  const ext = path.extname(file).toLowerCase();
  if ([".jpg", ".jpeg", ".webp"].includes(ext)) {
    checked++;
    if (photoHasGps(fs.readFileSync(file))) problems.push(`${file}: photo has GPS location data`);
  } else if ([".mp4", ".mov"].includes(ext)) {
    checked++;
    if (videoHasLocation(fs.readFileSync(file))) problems.push(`${file}: video has location metadata`);
  }
}

if (problems.length) {
  console.warn(`\n[check-exif] WARNING: ${problems.length} file(s) contain location data:`);
  for (const p of problems) console.warn(`  - ${p}`);
  console.warn("Strip it before publishing (e.g. re-export without location).\n");
} else {
  console.log(`[check-exif] ${checked} media file(s) checked, no location data found`);
}

// --- Photos -------------------------------------------------------------

function photoHasGps(bytes) {
  const tiff = findTiff(bytes);
  if (!tiff) return false;
  try {
    const little = tiff.toString("latin1", 0, 2) === "II"; // byte order
    const u16 = (o) => (little ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
    const u32 = (o) => (little ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));

    const ifd = u32(4); // where the first list of tags starts
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
      const entry = ifd + 2 + i * 12;
      if (u16(entry) === 0x8825) {
        const gps = u32(entry + 8); // pointer to the GPS tag list
        return u16(gps) > 0; // has at least one GPS tag
      }
    }
  } catch {
    // Unreadable EXIF: treat as no GPS rather than crash the build.
  }
  return false;
}

// EXIF data is a small TIFF file embedded in the photo. In JPEG it follows
// the text "Exif\0\0"; in WebP it sits in a chunk called "EXIF".
function findTiff(bytes) {
  const exifHeader = bytes.indexOf("Exif\0\0", 0, "latin1");
  if (exifHeader !== -1) return bytes.subarray(exifHeader + 6);
  if (bytes.toString("latin1", 0, 4) === "RIFF") {
    const chunk = bytes.indexOf("EXIF", 12, "latin1");
    if (chunk !== -1) return bytes.subarray(chunk + 8);
  }
  return null;
}

// --- Videos -------------------------------------------------------------

function videoHasLocation(bytes) {
  return (
    bytes.includes(Buffer.from([0xa9, 0x78, 0x79, 0x7a])) || // "©xyz"
    bytes.includes(Buffer.from("com.apple.quicktime.location"))
  );
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}
