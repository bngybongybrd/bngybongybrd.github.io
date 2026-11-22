# Stage 1: The trip page

## What was built

- **`/places/yunnan-2026/`**, built from the files in `src/content/trips/yunnan-2026/`:
  - a hero (a placeholder band until you choose a photo);
  - a stats bar;
  - your intro;
  - a sticky day index;
  - the days;
  - your trip notes, all shown, with each `##` section as a subheading.
- **Content collections** with schemas, so a typo in a day's front matter stops the build with a clear message instead of making a broken page.
- **Three Markdown plugins** that arrange photos into grids, handle `[photo-only]`, captions, videos and badges, turn the notes' `##` headings into subheadings, and mark Chinese text.
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
                  │ remark-notes        (only notes.md) ## → <h3>        ◄ ours
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
5. When a group ends, `groupSizes()` splits it into rows of 3 and 2 (8 → 3+3+2) and builds wrapper nodes. Each photo's shape (`--ar`, width ÷ height) is read from the file with Astro's own `imageMetadata`, so the CSS can lay a row out without cropping (see below).
6. A wrapper is a node with `data.hName`, e.g. `{ data: { hName: "figure" }, children: [image] }`. When the tree becomes HTML, it turns into `<figure>`. The image node inside is untouched, so **Astro still optimises it**. That's why we wrap rather than write HTML for photos.
7. Videos are the exception. Astro's image pipeline can't process `.mp4`, so the plugin writes a raw `<video>` tag that points at the copy `sync-videos.mjs` made in `public/trips/`.

### The page layout: a centred story column

A trip page is read top to bottom like a book, so it uses a **centred** column. The shorter index-style pages keep the shared left edge from Stage 0. Text is a narrow column, photos are much wider, and one special kind of photo spans the whole screen:

| What | Max width | Why |
|---|---|---|
| Text | 680px | Comfortable line length (about 75 characters) |
| Photos (every run, and `[photo-only]`) | 1600px | Photos are the point, as on exposure.co |
| `[full-width]` | the whole screen | Big scenery moments |

Body text stays **left-aligned inside** its centred column. With centred paragraphs every line starts in a different place, which makes them hard to read. The day headings *are* centred, because they open each day like a chapter.

On phones (700px and narrower) photo runs break out of the text gutter and run edge to edge.

Each run of consecutive photos (e.g. 3+3+2) is wrapped in one `.media-run` with the same small gap as inside a group, so it reads as one spread.

### The hero: title over the photo

With a hero photo, the image runs edge to edge (`position: absolute; inset: 0; object-fit: cover`) and the title sits over its lower part. There is **no tint or gradient over the photo**, so it shows at full brightness. White text on an unknown photo still needs help to stay readable, so the three text lines get a soft `text-shadow`: a tight layer for crisp edges and a wide, faint one that lifts the letters off busy areas like the rice. The shadow only affects pixels right around the letters. Without a hero, the title block opens the page on its own.

(An earlier version used a dark fade over the lower part of the photo. It was removed because it dulled the image.)

### How the photo rows work, with no cropping (`src/styles/trip.css`)

A row holds 1 to 3 photos. The plugin writes each photo's shape into the HTML as `--ar` (for example 0.75 for a 3:4 portrait, 1.5 for a 3:2 landscape) and the row's total as `--ar-sum`. The CSS then does two things:

- **Same height, no crop:** each photo is given `flex-grow` equal to its shape. A wide photo takes a bigger share of the row and a narrow one a smaller share. The result is that every photo in the row comes out the same height, and each shows in full. (The number is multiplied by 1000 because a `flex-grow` total below 1 would leave part of the row empty.)
- **Capped height:** the row's `max-width` is `--ar-sum × --row-max-height`, so a row is never taller than about one screen. This is why a lone portrait photo is narrower than the page: at full width it would be several screens tall.

When a day mixes portrait and landscape rows, the rows therefore have different widths. That's the trade-off for never cropping.

On phones, a row of three becomes one photo on top and two below, because three side by side would be tiny.

### Full-width photos: `[full-width]`

```md
[full-width]
![Erhai from the road](media/day-03/05-lake.webp "A caption, if you want one")
[/full-width]
```

The photo spans the whole screen. It's meant for landscapes. If a photo would be taller than the screen, it is cropped a little at the top and bottom (`object-fit: cover`), which suits scenery but not portraits. Use it for horizontal scenery. Several photos in one block stack, each full width.

**The window effect.** On screens wider than 700px, the photo is pinned to the screen with `position: fixed` and the page scrolls past it, so the band shows a different part of the photo as it moves, like a window onto the scene. The band itself has `clip-path: inset(0)`, which clips the pinned photo to the band's box, so the photo is only visible "through" the band. Phones show a normal photo, because a pinned landscape would be cropped to a thin slice of a tall screen. Readers who prefer reduced motion also get a normal photo.

`[photo-only]` still works, so your day 2 file is unchanged. It now looks exactly like a normal run.

### Photos fade in as you scroll

Each photo fades in when it enters the screen. The trip page's script uses an `IntersectionObserver`, the same tool as the scrollspy: when 15% of a photo is visible it adds the class `is-visible`, and a CSS `transition` fades the opacity from 0 to 1 over 0.8s. The photo is then no longer watched, so it fades in only once.

Photos are hidden only under `.js` (the class the head script adds when JavaScript runs), so without JavaScript nothing is hidden. With reduced motion, the CSS never hides them.

(A first version used a CSS-only scroll-driven animation. Firefox doesn't support that yet, so it was replaced.)

### Captions show in the photo viewer

A quoted title (`![](photo.webp "Erhai from the road")`) becomes a caption that appears under the photo when it's opened in the viewer, not on the page. That keeps the photo spreads uninterrupted. The caption is still in the HTML, hidden visually but read by screen readers. Video captions stay visible under the video, since videos don't open in the viewer.

### Scrollspy with `IntersectionObserver` (`DayIndex.astro`)

Instead of checking the scroll position on every scroll event, which is slow, we ask the browser to tell us when a day section crosses a line 35% of the way down the screen. `rootMargin: "-35% 0px -64% 0px"` shrinks the "viewport" the observer watches down to that thin line. The chip for that day gets `aria-current="location"`, which both styles it and tells screen readers it's the current spot.

Without JavaScript, the chips are still normal `#day-N` links that jump to each day.

### Trip notes

All four notes are shown in full, in the same text column as the days, under a "Trip notes" heading. The page's "Trip notes" is an `<h2>`, so `remark-notes.mjs` turns each `## Budget`-style heading in `notes.md` into an `<h3>`. That keeps the heading levels in order for screen readers, which use them to jump around a page. Your file isn't changed.

(They used to be collapsible `<details>` cards. The cards came out at different widths, because a grid item with `margin-inline: auto` shrinks to fit its content, and for four short notes, showing them open reads better anyway.)

### Videos, progressive enhancement again

The HTML has `controls`, so without JavaScript you can press play. The trip page script removes the controls and plays the muted clip only while it's on screen. If your system asks for reduced motion, the script leaves it alone, so you see the poster and can choose to play it.

### The photo viewer (`Lightbox.astro`)

Click any photo to see it large on a dark screen. The arrow buttons, the left and right arrow keys, or a swipe on a phone step through every photo in the story. Escape, the X, or a click on the dark area closes it.

It uses the native `<dialog>` element. `showModal()` gives us the dark backdrop, Escape to close, focus trapping, and focus returning to the photo you clicked, with no library. The script gathers every `.prose .media img` in page order and reuses each photo's own `srcset` with `sizes="100vw"`, so the browser picks a large file. It loads the next and previous photos early so stepping feels instant. Photos also become keyboard-focusable (Enter or Space opens them). Without JavaScript the photos are plain images and nothing changes.

## Changes from PLAN.md (decided during the Stage 1 design review)

- **Title over the hero photo**, instead of below it, with a soft text shadow for legibility and no tint over the image.
- **Centred story column** on trip pages, with photos much wider than the text (photos first, as on exposure.co), rows that never crop, and a `[full-width]` tag for scenery shown as a fixed "window".
- **Stats as one quiet line** ("10 days   7 stops   Yubeng hike") instead of a bordered bar.
- **No empty hero box** when there's no hero photo yet.
- **Sticky bars are solid or nearly solid**, so text scrolling underneath doesn't show through.

## Good to know

- **Plugin changes need a cache bump.** Astro remembers the rendered output of unchanged day files, here and in the deploy's cache, and does not notice when a plugin changes. When a plugin's HTML changes, raise `layout` in `astro.config.mjs` (e.g. `[remarkTripMedia, { layout: 3 }]`). Without it, the live site showed new CSS with old HTML and the photos vanished. The same goes for adding a file that a day already pointed to but was missing: the day's text didn't change, so Astro reuses the old page until `layout` is raised.
- **Alt-text warnings** appear when a day file is rendered. Astro caches unchanged files, so you'll see the warning after editing a day, not on every build. To see all warnings again, delete `node_modules/.astro`.
- **After adding or renaming a video while `npm run dev` is running**, restart it so `sync-videos.mjs` copies the file.
- **Poster naming:** a video's poster is `<video name>-poster.webp` next to it (`market-walk.mp4` → `market-walk-poster.webp`). The older numbered rule (`51-…mp4` → `51-…-poster.webp`) still works.
- **Smart punctuation** changes how quotes and dashes look on the page only. Your `.md` files are never modified.

## Try changing this

0. **Viewer wrap-around:** in `Lightbox.astro`, `show()` wraps from the last photo to the first. Change it to stop at the ends and hide the arrow there.

1. **Group sizes:** in `remark-trip-media.mjs`, change `groupSizes()` so 4 photos become one row of 4. The CSS needs no change, because rows already share height by shape.
2. **The height cap:** in `trip.css`, change `--row-max-height` to `min(70vh, 700px)` and see how much narrower the portrait rows get.
3. **Scrollspy line:** change `rootMargin` in `DayIndex.astro` to `"-10% 0px -89% 0px"`. The highlight then switches when a day reaches the top of the screen instead of a third of the way down.
4. **Try a badge:** add `[badge: food | Wild mushroom hotpot | Dali Ancient Town]` on its own line in a day file and watch it render as a pill.
5. **Read the tree yourself:** add `console.log(JSON.stringify(tree.children[0], null, 2))` at the top of `transform()` in `remark-trip-media.mjs`, run `npm run build`, and look at the first node of each file. Then remove it.

## Videos from an iPhone are HDR

iPhones record HDR video by default (HLG, Rec. 2020 colours). On an HDR screen the browser shows it far brighter than the page around it, and elsewhere it looks washed out. `51-singing.mp4` was HDR, so it was converted to normal SDR video (Rec. 709) with ffmpeg:

```bash
ffmpeg -i in.mp4 -vf "zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p" -c:v libx264 -crf 25 -preset slow -movflags +faststart -an -color_primaries bt709 -color_trc bt709 -colorspace bt709 out.mp4
```

To skip this for new clips, turn off HDR video on the iPhone (Settings → Camera → Record Video → HDR Video). To check a clip: `ffprobe in.mp4` shows `arib-std-b67` or `smpte2084` when it's HDR.
