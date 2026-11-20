// remark plugin: turns the media in a trip's day files into the layouts from
// PLAN.md section 6. It runs on the Markdown syntax tree ("mdast") after the
// file is parsed and before it becomes HTML. The writing itself is never
// changed; only how photos, videos and badges are arranged.
//
// What it does, in order:
//   1. Reads image paths with "\" as "/" (Windows-style paths still work).
//   2. Finds paragraphs made only of images (and [photo-only] tags) and
//      replaces them with grids: 1 photo → full figure, 2 → two-up,
//      3 → bento, 4+ → groups of 3 and 2.
//   3. [photo-only] ... [/photo-only] → a wider block with no captions.
//   4. A quoted image title becomes a visible caption (<figcaption>).
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

const OPEN = "[photo-only]";
const CLOSE = "[/photo-only]";
const MARKER = /(\[\/?photo-only\])/;
const BADGE = /^\[badge:\s*([^|\]]+?)\s*\|\s*([^|]+?)\s*\|\s*([\s\S]*?)\s*\]$/;

export default function remarkTripMedia() {
  return function transform(tree, file) {
    const ctx = {
      file,
      fileDir: file.path ? path.dirname(file.path) : "",
      slug: tripSlug(file.path),
      missingAlt: [],
      twoUpCount: 0, // alternates the 1.4fr / 1fr widths between two-up groups
    };

    const output = [];
    let photoOnly = null; // collects media while inside [photo-only]
    let bucket = []; // collects consecutive media outside [photo-only]

    const flushBucket = () => {
      if (bucket.length) output.push(...buildGroups(bucket, ctx, false));
      bucket = [];
    };

    for (const node of tree.children) {
      const tokens = node.type === "paragraph" ? tokenize(node) : null;

      // A paragraph that is a single [badge: ...] line.
      if (tokens && !photoOnly && isBadge(node)) {
        flushBucket();
        output.push(buildBadge(node));
        continue;
      }

      // Anything that isn't a "media-only" paragraph stays exactly as written.
      if (!tokens || tokens.some((t) => t.kind === "content")) {
        if (photoOnly && tokens) warn(ctx, "text inside a [photo-only] block is shown as normal text");
        flushBucket();
        output.push(node);
        continue;
      }

      for (const token of tokens) {
        if (token.kind === "open") {
          flushBucket();
          photoOnly = [];
        } else if (token.kind === "close") {
          if (photoOnly) output.push(buildPhotoOnly(photoOnly, ctx));
          else warn(ctx, `found ${CLOSE} without a matching ${OPEN}`);
          photoOnly = null;
        } else if (token.kind === "media") {
          (photoOnly ?? bucket).push(token.node);
        }
      }
      // A blank line ends a normal group; a [photo-only] block can span blank lines.
      flushBucket();
    }

    if (photoOnly) {
      warn(ctx, `${OPEN} was never closed; its photos are shown anyway`);
      output.push(buildPhotoOnly(photoOnly, ctx));
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
        if (piece === OPEN) tokens.push({ kind: "open" });
        else if (piece === CLOSE) tokens.push({ kind: "close" });
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

function buildGroups(media, ctx, insidePhotoOnly) {
  const groups = [];
  let start = 0;
  for (const size of groupSizes(media.length)) {
    const items = media.slice(start, start + size).map((m) => buildItem(m, ctx, insidePhotoOnly));
    start += size;

    const classes = ["media-group", `media-${size}`];
    if (size === 2 && ctx.twoUpCount++ % 2 === 1) classes.push("flip");
    if (size === 1 && isVideo(media[start - 1])) classes.push("media-video-group");
    groups.push(element("div", classes, items));
  }
  return groups;
}

function buildPhotoOnly(media, ctx) {
  return element("div", ["photo-only"], buildGroups(media, ctx, true));
}

// One photo or video, wrapped in <figure>. Captions only outside [photo-only].
function buildItem(image, ctx, insidePhotoOnly) {
  if (isVideo(image)) return buildVideo(image, ctx);

  if (!image.url.startsWith("./") && !image.url.startsWith("../")) image.url = "./" + image.url;
  if (!image.alt) ctx.missingAlt.push(path.basename(image.url));

  const caption = image.title;
  image.title = null; // the caption is shown below, so no hover tooltip as well

  const children = [image];
  if (caption && !insidePhotoOnly) {
    children.push(element("figcaption", [], [{ type: "text", value: caption }]));
  }
  return element("figure", ["media"], children);
}

function isVideo(image) {
  return /\.mp4$/i.test(image.url);
}

// Videos aren't handled by Astro's image pipeline, so scripts/sync-videos.mjs
// copies them into public/trips/<slug>/... and we point at that copy.
// The poster is the file next to the video with the same number ending in
// "-poster.webp" (e.g. 51-singing.mp4 → 51-IMG_4819-poster.webp).
function buildVideo(image, ctx) {
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
  return element("figure", ["media", "media-video"], children);
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
function element(tag, classes, children) {
  return {
    type: "tripMedia",
    data: { hName: tag, hProperties: classes.length ? { className: classes } : {} },
    children,
  };
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
