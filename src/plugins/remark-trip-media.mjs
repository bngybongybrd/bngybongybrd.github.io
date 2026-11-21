// remark plugin: turns the media in a trip's day files into the layouts from
// PLAN.md section 6. It runs on the Markdown syntax tree ("mdast") after the
// file is parsed and before it becomes HTML. The writing itself is never
// changed; only how photos, videos and badges are arranged.
//
// What it does, in order:
//   1. Reads image paths with "\" as "/" (Windows-style paths still work).
//   2. Finds paragraphs made only of images and replaces them with rows of
//      photos: up to 3 per row, 4+ split into rows of 3 and 2. Every photo
//      gets its shape (--ar = width / height, read from the file) so the CSS
//      can make a row's photos the same height without cropping any.
//   3. [photo-only] ... [/photo-only] → the same rows (kept for old files).
//      [full-width] ... [/full-width] → each photo spans the whole screen.
//   4. A quoted image title becomes a <figcaption>. Photo captions are
//      hidden on the page and shown in the photo viewer (Lightbox.astro).
//   5. .mp4 "images" become <video> elements with their poster image.
//   6. [badge: type | title | detail] → one small pill.
//   7. Warns (does not fail) when images have no alt text.
//
// How a custom wrapper becomes HTML: any node with `data.hName` is turned
// into that HTML element by the Markdown→HTML step, keeping its children.
// So we can wrap Astro's own image nodes in <figure>/<div> and Astro still
// optimises the images inside.

import fs from "node:fs";
import path from "node:path";
// Astro's own image reader (already installed with Astro): gives width/height.
import { imageMetadata } from "astro/assets/utils";

const MARKER = /(\[\/?(?:photo-only|full-width)\])/;
const TAG = /^\[(\/?)(photo-only|full-width)\]$/;
const BADGE = /^\[badge:\s*([^|\]]+?)\s*\|\s*([^|]+?)\s*\|\s*([\s\S]*?)\s*\]$/;

export default function remarkTripMedia() {
  return async function transform(tree, file) {
    const ctx = {
      file,
      fileDir: file.path ? path.dirname(file.path) : "",
      slug: tripSlug(file.path),
      missingAlt: [],
      ratios: new Map(), // image node → width / height
    };

    // Read every photo's shape first (reading files is asynchronous).
    const images = tree.children
      .filter((node) => node.type === "paragraph")
      .flatMap((paragraph) => paragraph.children.filter((child) => child.type === "image"));
    await Promise.all(images.map(async (image) => ctx.ratios.set(image, await readRatio(image, ctx))));

    const output = [];
    let block = null; // { name, media } while inside [photo-only] or [full-width]
    let bucket = []; // collects consecutive media outside a block

    // One run of consecutive photos (e.g. 8 → groups of 3+3+2) is wrapped in a
    // single .media-run so its groups sit tight together, like one spread.
    const flushBucket = () => {
      if (bucket.length) output.push(element("div", ["media-run"], buildGroups(bucket, ctx, false)));
      bucket = [];
    };

    for (const node of tree.children) {
      const tokens = node.type === "paragraph" ? tokenize(node) : null;

      // A paragraph that is a single [badge: ...] line.
      if (tokens && !block && isBadge(node)) {
        flushBucket();
        output.push(buildBadge(node));
        continue;
      }

      // Anything that isn't a "media-only" paragraph stays exactly as written.
      if (!tokens || tokens.some((t) => t.kind === "content")) {
        if (block && tokens) warn(ctx, `text inside a [${block.name}] block is shown as normal text`);
        flushBucket();
        output.push(node);
        continue;
      }

      for (const token of tokens) {
        if (token.kind === "open") {
          flushBucket();
          block = { name: token.name, media: [] };
        } else if (token.kind === "close") {
          if (block) output.push(buildBlock(block, ctx));
          else warn(ctx, `found [/${token.name}] without a matching [${token.name}]`);
          block = null;
        } else if (token.kind === "media") {
          (block ? block.media : bucket).push(token.node);
        }
      }
      // A blank line ends a normal run; a block can span blank lines.
      flushBucket();
    }

    if (block) {
      warn(ctx, `[${block.name}] was never closed; its photos are shown anyway`);
      output.push(buildBlock(block, ctx));
    }

    tree.children = output;

    if (ctx.missingAlt.length) {
      warn(ctx, `${ctx.missingAlt.length} image(s) have no alt text: ${ctx.missingAlt.join(", ")}`);
    }
  };
}

// --- Reading paragraphs ---------------------------------------------------

// Splits a paragraph into tokens: open/close tags, media, and "content"
// (any real text, links, emphasis...). Whitespace and line breaks are ignored.
function tokenize(paragraph) {
  const tokens = [];
  for (const child of paragraph.children) {
    if (child.type === "image") {
      child.url = child.url.replaceAll("\\", "/");
      tokens.push({ kind: "media", node: child });
    } else if (child.type === "text") {
      for (const piece of child.value.split(MARKER)) {
        const tag = piece.match(TAG);
        if (tag) tokens.push({ kind: tag[1] ? "close" : "open", name: tag[2] });
        else if (piece.trim() !== "") tokens.push({ kind: "content" });
      }
    } else if (child.type !== "break") {
      tokens.push({ kind: "content" });
    }
  }
  return tokens;
}

function isBadge(paragraph) {
  return BADGE.test(textOf(paragraph).trim());
}

function textOf(node) {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

// --- Building the layouts -------------------------------------------------

// Splits n photos into group sizes of 3 and 2, never leaving one alone.
// 4 → 2+2, 5 → 3+2, 6 → 3+3, 7 → 3+2+2, 8 → 3+3+2.
export function groupSizes(n) {
  if (n <= 3) return [n];
  if (n === 4) return [2, 2];
  return [3, ...groupSizes(n - 3)];
}

// Each group is one row. --ar-sum (the photos' shapes added up) lets the CSS
// cap the row's height; each photo's own --ar sets its share of the width.
function buildGroups(media, ctx) {
  const groups = [];
  let start = 0;
  for (const size of groupSizes(media.length)) {
    const row = media.slice(start, start + size);
    start += size;
    const items = row.map((m) => buildItem(m, ctx));
    const sum = row.reduce((total, m) => total + ctx.ratios.get(m), 0);
    groups.push(element("div", ["media-group", `media-${size}`], items, `--ar-sum: ${round(sum)}`));
  }
  return groups;
}

function buildBlock({ name, media }, ctx) {
  if (name === "full-width") {
    return element("div", ["full-width"], media.map((m) => buildItem(m, ctx)));
  }
  return element("div", ["photo-only"], buildGroups(media, ctx));
}

// One photo or video, wrapped in <figure>.
function buildItem(image, ctx) {
  const style = `--ar: ${round(ctx.ratios.get(image))}`;
  if (isVideo(image)) return buildVideo(image, ctx, style);

  if (!image.url.startsWith("./") && !image.url.startsWith("../")) image.url = "./" + image.url;
  if (!image.alt) ctx.missingAlt.push(path.basename(image.url));

  const caption = image.title;
  image.title = null; // the caption is shown below, so no hover tooltip as well

  const children = [image];
  if (caption) {
    children.push(element("figcaption", [], [{ type: "text", value: caption }]));
  }
  return element("figure", ["media"], children, style);
}

// A photo's shape: width / height. A video's shape comes from its poster.
async function readRatio(image, ctx) {
  image.url = image.url.replaceAll("\\", "/");
  const relative = image.url.replace(/^\.\//, "");
  let file = path.join(ctx.fileDir, relative);
  if (isVideo(image)) {
    const poster = findPoster(file);
    if (!poster) return 16 / 9;
    file = path.join(path.dirname(file), poster);
  }
  try {
    const { width, height } = await imageMetadata(new Uint8Array(fs.readFileSync(file)), file);
    return width / height;
  } catch {
    warn(ctx, `couldn't read the size of ${relative}; assuming 3:2`);
    return 1.5;
  }
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function isVideo(image) {
  return /\.mp4$/i.test(image.url);
}

// Videos aren't handled by Astro's image pipeline, so scripts/sync-videos.mjs
// copies them into public/trips/<slug>/... and we point at that copy.
// The poster is the file next to the video with the same number ending in
// "-poster.webp" (e.g. 51-singing.mp4 → 51-IMG_4819-poster.webp).
function buildVideo(image, ctx, style) {
  const relative = image.url.replace(/^\.\//, "");
  const publicUrl = `/trips/${ctx.slug}/${relative}`;
  const poster = findPoster(path.join(ctx.fileDir, relative));
  if (!poster) warn(ctx, `no poster found for ${path.basename(relative)} (expected NN-...-poster.webp)`);
  const posterUrl = poster ? `/trips/${ctx.slug}/${path.posix.join(path.posix.dirname(relative), poster)}` : null;

  // `controls` is the no-JavaScript fallback. The small script on the trip page
  // removes it and plays the video while it's on screen, unless the reader
  // prefers reduced motion (then they see the poster and can press play).
  const attrs = [
    'class="trip-video"',
    "controls",
    "muted",
    "loop",
    "playsinline",
    'preload="none"',
    posterUrl ? `poster="${posterUrl}"` : "",
    image.alt ? `aria-label="${escapeAttr(image.alt)}"` : "",
  ].filter(Boolean);

  const html = `<video ${attrs.join(" ")}><source src="${publicUrl}" type="video/mp4"></video>`;
  const children = [{ type: "html", value: html }];
  if (image.title) children.push(element("figcaption", [], [{ type: "text", value: image.title }]));
  return element("figure", ["media", "media-video"], children, style);
}

function findPoster(videoPath) {
  const dir = path.dirname(videoPath);
  const number = path.basename(videoPath).split("-")[0];
  try {
    return fs.readdirSync(dir).find((f) => f.startsWith(number + "-") && f.endsWith("-poster.webp")) ?? null;
  } catch {
    return null;
  }
}

function buildBadge(paragraph) {
  const [, type, title, detail] = textOf(paragraph).trim().match(BADGE);
  const parts = [
    element("span", ["badge-type"], [{ type: "text", value: type }]),
    element("span", ["badge-title"], [{ type: "text", value: title }]),
  ];
  if (detail) parts.push(element("span", ["badge-detail"], [{ type: "text", value: detail }]));
  return element("p", ["badge-row"], [element("span", ["badge", `badge-${slugify(type)}`], parts)]);
}

// --- Small helpers ----------------------------------------------------------

// A custom node that becomes <tag class="..."> in the HTML.
function element(tag, classes, children, style) {
  const properties = {};
  if (classes.length) properties.className = classes;
  if (style) properties.style = style;
  return { type: "tripMedia", data: { hName: tag, hProperties: properties }, children };
}

function tripSlug(filePath = "") {
  const match = filePath.replaceAll("\\", "/").match(/\/content\/trips\/([^/]+)\//);
  return match ? match[1] : "unknown-trip";
}

function warn(ctx, message) {
  const where = ctx.file.path ? path.relative(process.cwd(), ctx.file.path) : "markdown";
  console.warn(`[trip-media] ${where}: ${message}`);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function escapeAttr(text) {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
