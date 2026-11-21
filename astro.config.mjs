// Astro configuration. Docs: https://docs.astro.build/en/reference/configuration-reference/
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import remarkTripMedia from "./src/plugins/remark-trip-media.mjs";
import remarkNotes from "./src/plugins/remark-notes.mjs";
import rehypeZhHans from "./src/plugins/rehype-zh-hans.mjs";

// --- Fonts ---------------------------------------------------------------
// The font files come from the @fontsource-variable packages (installed by
// npm, versions locked in package-lock.json). Astro's Fonts API copies the
// files we list into the build (self-hosting, no requests to Google), writes
// the @font-face rules, and generates size-matched fallback fonts so text
// doesn't jump when a web font arrives.
//
// Why `fontProviders.local()` with paths, not `fontProviders.npm()`:
// the npm provider in Astro 7.4 hands back file:// URLs that Astro then
// can't read, so the build fails. Pointing the local provider at the same
// files is equivalent and fully explicit.

// Each variable font is split by character set. We ship two:
// "latin" (English and Western European) and "latin-ext" (accents such as
// ā or ő). The browser only downloads a file when the page uses a character
// in its range. Ranges copied from the packages' own CSS.
const subsets = {
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  "latin-ext":
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
};

// Builds the list of @font-face entries for one package:
// one per style ("normal", "italic") per subset.
function variantsFor(pkg, weight, styles) {
  const variants = [];
  for (const style of styles) {
    for (const [subset, unicodeRange] of Object.entries(subsets)) {
      variants.push({
        weight,
        style,
        unicodeRange: unicodeRange.split(","), // Astro wants an array of ranges
        src: [`./node_modules/@fontsource-variable/${pkg}/files/${pkg}-${subset}-wght-${style}.woff2`],
      });
    }
  }
  return variants;
}

export default defineConfig({
  // The live URL. No `base` is needed: this repo uses the special
  // <username>.github.io name, so the site lives at the domain root.
  site: "https://bngybongybrd.github.io",

  // --- Markdown ----------------------------------------------------------
  // The Unified (remark → rehype) processor, so we can add our own plugins.
  // remark plugins change the Markdown tree; rehype plugins change the HTML
  // tree. See docs/stage-1.md for how each plugin works.
  markdown: {
    processor: unified({
      // Astro remembers rendered Markdown between builds (locally and in the
      // deploy's cache) and doesn't notice when a plugin's code changes. Raise
      // `layout` whenever the plugin's HTML changes, so old output is dropped.
      remarkPlugins: [[remarkTripMedia, { layout: 7 }], remarkNotes],
      rehypePlugins: [rehypeZhHans],
      // Smart punctuation at render time: "quotes" → “quotes”, -- → –,
      // ... → …. The Markdown files themselves are never changed.
      smartypants: true,
    }),
  },

  // --- Images ------------------------------------------------------------
  // Every local image (including ones written in Markdown) is converted to
  // WebP in several sizes with a srcset, gets width/height (no layout jump)
  // and is lazy-loaded.
  image: {
    layout: "constrained",
    responsiveStyles: true,
  },

  fonts: [
    {
      provider: fontProviders.local(),
      name: "Lora",
      cssVariable: "--font-lora",
      fallbacks: ["Georgia", "serif"],
      // Variable font: one file covers every weight from 400 to 700.
      options: { variants: variantsFor("lora", "400 700", ["normal", "italic"]) },
    },
    {
      provider: fontProviders.local(),
      name: "DM Sans",
      cssVariable: "--font-dm-sans",
      fallbacks: ["sans-serif"],
      options: { variants: variantsFor("dm-sans", "100 1000", ["normal", "italic"]) },
    },
    {
      provider: fontProviders.local(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains-mono",
      fallbacks: ["monospace"],
      options: { variants: variantsFor("jetbrains-mono", "100 800", ["normal"]) },
    },
  ],
});
