# Stage 1: The trip page

## What was built

- **`/places/yunnan-2026/`**, built from the files in `src/content/trips/yunnan-2026/`:
  - a hero (a placeholder band until you choose a photo);
  - a stats bar;
  - your intro;
  - a sticky day index;
  - the days;
  - your trip notes as collapsible cards.
- **Content collections** with schemas, so a typo in a day's front matter stops the build with a clear message instead of making a broken page.
- **Three Markdown plugins** that arrange photos into grids, handle `[photo-only]`, captions, videos and badges, turn notes into cards, and mark Chinese text.
- **Two scripts** that run before every build: `sync-videos.mjs` copies videos to where the site can serve them, and `check-exif.mjs` warns if any photo or video contains a location.
- **Test days:** day 1 (text) and day 2 (photos). Days 3–10 load after your review.

## How a day file becomes the page

```
day-02.md ──► content collection "days" (schema checks the front matter)
          ──► render(entry):
                Markdown text
                  │ remark-parse        text → Markdown tree (mdast)
                  │ smartypants         'quotes' → ‘quotes’
                  │ remark-trip-media   images → grids, videos, badges   ◄ ours
                  │ remark-notes-cards  (only notes.md) ## → <details>   ◄ ours
                  │ Astro: collect image paths
                  │ remark-rehype       Markdown tree → HTML tree (hast)
                  │ rehype-zh-hans      Chinese runs → <span lang>       ◄ ours
                  │ Astro: optimise images (WebP, srcset, width/height)
                  ▼
                <Content /> inside DaySection.astro
          ──► src/pages/places/[slug].astro puts the sections in order
```

**Where the files are:**
- `[slug].astro` uses `getStaticPaths()` to make one page for every `trip.yaml`. Adding a trip folder adds a page.
- It collects that trip's days with `getCollection("days")`, sorts them by `day`, and renders each one with `DaySection`.
- `intro.md` and `notes.md` come from the `tripText` collection.

## Key concepts

### Syntax trees (mdast and hast)

A plugin never edits text with find-and-replace. The Markdown is first parsed into a **tree** of objects. For example, this paragraph:

```md
![](a.webp)
![](b.webp)
```

becomes (simplified):

```js
{ type: "paragraph", children: [
    { type: "image", url: "a.webp", alt: "" },
    { type: "text", value: "\n" },
    { type: "image", url: "b.webp", alt: "" } ] }
```

A plugin is a function that receives the tree and changes it. **remark** plugins work on the Markdown tree (mdast); **rehype** plugins work on the HTML tree (hast).

### How `remark-trip-media.mjs` works

1. It walks the top-level nodes of the day (paragraphs, headings…).
2. For each paragraph it makes a list of **tokens**: `open` (`[photo-only]`), `close` (`[/photo-only]`), `media` (an image), or `content` (any real text).
3. If a paragraph has any `content`, it's your writing, so it's left exactly as it is.
4. Otherwise the images are collected into a **bucket**. Inside `[photo-only]`, they go into a separate collection that can span blank lines.
5. When a group ends, `groupSizes()` splits it into groups of 3 and 2 (8 → 3+3+2) and builds wrapper nodes.
6. A wrapper is a node with `data.hName`, e.g. `{ data: { hName: "figure" }, children: [image] }`. When the tree becomes HTML, it turns into `<figure>`. The image node inside is untouched, so **Astro still optimises it**. That's why we wrap rather than write HTML for photos.
7. Videos are the exception. Astro's image pipeline can't process `.mp4`, so the plugin writes a raw `<video>` tag that points at the copy `sync-videos.mjs` made in `public/trips/`.

### The page layout: a centred story column

A trip page is read top to bottom like a book, so it uses a **centred** column. The shorter index-style pages keep the shared left edge from Stage 0. There are three widths, all centred on the same axis:

| What | Max width | Why |
|---|---|---|
| Text | 680px | Comfortable line length (about 75 characters) |
| Runs of photos | 1240px | Photos much wider than the words, like a photo essay |
| `[photo-only]` | 1600px | The widest moments, photos alone |

Body text stays **left-aligned inside** its centred column. With centred paragraphs every line starts in a different place, which makes them hard to read. The day headings *are* centred, because they open each day like a chapter.

On phones (700px and narrower) both photo blocks break out of the text gutter and run edge to edge.

Each run of consecutive photos (e.g. 3+3+2) is wrapped in one `.media-run` with the same small gap as inside a group, so it reads as one spread.

### The hero: title over the photo

With a hero photo, the image runs edge to edge (`position: absolute; inset: 0; object-fit: cover`) and the title sits over its lower part. There is **no tint or gradient over the photo**, so it shows at full brightness. White text on an unknown photo still needs help to stay readable, so the three text lines get a soft `text-shadow`: a tight layer for crisp edges and a wide, faint one that lifts the letters off busy areas like the rice. The shadow only affects pixels right around the letters. Without a hero, the title block opens the page on its own.

(An earlier version used a dark fade over the lower part of the photo. It was removed because it dulled the image.)

### How the grids look the way they do (`src/styles/trip.css`)

- **Two-up:** `grid-template-columns: 1.4fr 1fr` gives uneven widths, and `.flip` swaps them for the next pair. The group has a fixed `aspect-ratio`, and each photo uses `object-fit: cover`, so cells line up by cropping a little at the edges.
- **Captions in a pair:** each `<figure>` spans two grid rows and shares them with its neighbour using `grid-template-rows: subgrid`. Both photos stay the same height, and the caption sits in its own row below.
- **Bento:** the first photo gets `grid-row: span 2`, making it the tall one on the left.
- **Single photos** aren't cropped. Most of your photos are portrait, so `max-height` keeps one photo from filling several screens.

### Scrollspy with `IntersectionObserver` (`DayIndex.astro`)

Instead of checking the scroll position on every scroll event, which is slow, we ask the browser to tell us when a day section crosses a line 35% of the way down the screen. `rootMargin: "-35% 0px -64% 0px"` shrinks the "viewport" the observer watches down to that thin line. The chip for that day gets `aria-current="location"`, which both styles it and tells screen readers it's the current spot.

Without JavaScript, the chips are still normal `#day-N` links that jump to each day.

### Native `<details>` for notes

`<details><summary>Budget</summary>…</details>` opens and closes in every browser with no JavaScript, and it's keyboard-accessible by default. We only restyle it, replacing the triangle with +/−.

### Videos, progressive enhancement again

The HTML has `controls`, so without JavaScript you can press play. The trip page script removes the controls and plays the muted clip only while it's on screen. If your system asks for reduced motion, the script leaves it alone, so you see the poster and can choose to play it.

## Changes from PLAN.md (decided during the Stage 1 design review)

- **Title over the hero photo**, instead of below it, with a soft text shadow for legibility and no tint over the image.
- **Centred story column** on trip pages, with photo runs much wider than the text (photos first, as on exposure.co).
- **Stats as one quiet line** ("10 days   7 stops   Yubeng hike") instead of a bordered bar.
- **No empty hero box** when there's no hero photo yet.
- **Sticky bars are solid or nearly solid**, so text scrolling underneath doesn't show through.

## Good to know

- **Alt-text warnings** appear when a day file is rendered. Astro caches unchanged files, so you'll see the warning after editing a day, not on every build. To see all warnings again, delete `node_modules/.astro`.
- **After adding or renaming a video while `npm run dev` is running**, restart it so `sync-videos.mjs` copies the file.
- **Poster naming:** a video's poster is the file in the same folder with the same number that ends in `-poster.webp`.
- **Smart punctuation** changes how quotes and dashes look on the page only. Your `.md` files are never modified.

## Try changing this

1. **Group sizes:** in `remark-trip-media.mjs`, change `groupSizes()` so 4 photos become one row of 4. You'll also need a `.media-4` rule in `trip.css`.
2. **The two-up shape:** change `.media-2 { aspect-ratio: 3 / 2 }` to `4 / 3` and see how much the photos crop.
3. **Scrollspy line:** change `rootMargin` in `DayIndex.astro` to `"-10% 0px -89% 0px"`. The highlight then switches when a day reaches the top of the screen instead of a third of the way down.
4. **Try a badge:** add `[badge: food | Wild mushroom hotpot | Dali Ancient Town]` on its own line in a day file and watch it render as a pill.
5. **Read the tree yourself:** add `console.log(JSON.stringify(tree.children[0], null, 2))` at the top of `transform()` in `remark-trip-media.mjs`, run `npm run build`, and look at the first node of each file. Then remove it.
