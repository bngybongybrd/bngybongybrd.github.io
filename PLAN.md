# Personal website: build plan

Owner: GitHub user `bngybongybrd`. Repo: `bngybongybrd.github.io`. Live URL: `https://bngybongybrd.github.io`.

This file is the single source of truth for the build. Read it fully, along with `CLAUDE.md`, before doing anything.

---

## 0. How to work (read first)

The owner is a CS student who wants to **understand every line** of this site and learn from it. This changes how you work:

1. **Start every stage in Plan Mode.** Present the approach, the files you'll create or change, and why. Wait for approval before writing code.
2. **One stage at a time.** Never start the next stage until the current one meets its acceptance criteria and the owner says to continue.
3. **Simple, readable code.** Prefer boring and obvious over clever. Comment the *why*, not the *what*. No abstractions that need a diagram to understand.
4. **Check current docs, not memory.** Astro's content APIs, MapLibre options and Globe.gl change. Look up the current documentation before using an API.
5. **Ask before adding any dependency.** State what it does, its size, and what the alternative is. Keep the dependency list short.
6. **Never edit the owner's prose.** Render writing exactly as written. No rephrasing, fixing, or "improving" text in day files, notes, or any file the owner supplies. Flag problems in your reply instead.
7. **Never invent content.** Use clearly marked placeholders (`[PLACEHOLDER]`) for anything the owner hasn't provided. No fake posts, fake projects, or plausible-sounding filler.
8. **Review before accepting.** Make changes in small commits the owner can read as diffs. One commit per working stage at minimum.
9. **Teach as you go.** After each stage, write `docs/stage-N.md` (see section 9).

---

## 1. Project summary

A personal site that serves as the owner's digital home base:

- **Work:** coding projects, hackathons, competitions (the owner is starting a CS degree).
- **Writing:** narrative posts (journal, thoughts, fragments).
- **Hobbies:** short progress logs (cs, piano, trading, editing, fitness).
- **Places:** travel stories told mostly through photos, with a globe landing page and one page per trip.
- **Now, About:** a current-life snapshot and a personal intro.

The feel is **peaceful, personal, spacious, readable, timeless**. Think a quiet literary magazine, not a tech startup. Photos carry much of the storytelling; some sections are deliberately photo-only.

The first complete trip is **Yunnan, 12 to 21 September 2026** (10 days, with a 3-day hike to Yubeng). It is the test case for everything.

---

## 2. Tech decisions (fixed)

| Area | Decision |
|---|---|
| Framework | **Astro**, static output |
| Styling | **Plain CSS** with custom properties. No Tailwind, no UI kit, no preprocessor |
| JavaScript | Minimal vanilla JS, only where needed (theme toggle, mobile menu, scrollspy, map, globe) |
| TypeScript | Allowed only where Astro uses it by default (config, content schemas). No TS in the owner's own components unless asked |
| Hosting | **GitHub Pages**, deployed by the official Astro GitHub Action |
| Content | Markdown + YAML files in the repo (see section 7). No CMS |
| Overview map (Stage 1b) | **MapLibre GL JS**, pale minimal style, free tiles. No Mapbox |
| Globe (Stage 2) | **Globe.gl** |
| Search (Stage 4) | **Pagefind** |
| Fonts | Lora (headings), DM Sans (body), JetBrains Mono (code and small pills). Prefer self-hosting via `@fontsource` packages |

Not in scope: React/Vue/Svelte, a database, a CMS, analytics, comments, user accounts.

---

## 3. Repo structure (proposal; adjust in Plan Mode if Astro's conventions suggest better)

```
/
├── CLAUDE.md
├── PLAN.md
├── astro.config.mjs
├── package.json
├── .github/workflows/deploy.yml
├── docs/                         # stage-N.md learning notes
├── scripts/                      # e.g. check-exif.mjs
├── public/                       # favicon, videos, static files
└── src/
    ├── config.ts                 # site name, social links, nav items
    ├── styles/                   # tokens.css, base.css, components...
    ├── layouts/                  # BaseLayout, TripLayout...
    ├── components/               # Nav, Footer, NowStrip, DayIndex, PhotoGrid, Badge...
    ├── pages/
    │   ├── index.astro
    │   ├── work.astro
    │   ├── writing/
    │   ├── hobbies/
    │   ├── places/
    │   │   ├── index.astro       # globe + trip cards
    │   │   └── [slug].astro      # trip page
    │   ├── now.astro
    │   └── about.astro
    └── content/
        └── trips/
            └── yunnan-2026/
                ├── trip.yaml
                ├── day-01.md ... day-10.md
                ├── notes.md
                └── media/day-01/ ... day-10/
```

Use Astro content collections for trips, days, writing and hobbies. Look up the current content collections API before designing the schemas, and show the schemas in Plan Mode.

---

## 4. Design system

### 4.1 Principles

- Generous whitespace. If something creates noise or demands attention, remove it.
- One accent colour (sage green), used sparingly: tags, the "now" dot, small hover states, active day.
- No pure white or pure black. No box shadows. No gradients. No parallax. No page-load animations.
- Hover and transitions: colour and border only, around 0.2s. Nothing moves or scales.
- Respect `prefers-reduced-motion` everywhere.
- Borders: 1px, soft. Radius: 6px small, 10px medium, 14px cards and photos.
- Body text line-height 1.75 to 1.8. Reading column max ~680px. Wide layout max ~1000px. Minimum font size 13px.

### 4.2 Colour tokens

Define as CSS custom properties. Light is the default; dark applies via `prefers-color-scheme` and an explicit `data-theme` attribute.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAF9F6` | `#1C1B19` |
| `--surface` | `#F2F0EB` | `#252421` |
| `--surface-2` | `#EAE7E0` | `#2E2C28` |
| `--border` | `#E2DFD8` | `#34322E` |
| `--border-2` | `#D0CCC3` | `#45423D` |
| `--text` | `#2C2B28` | `#E8E6E0` |
| `--text-muted` | `#7A7870` | `#A19F96` |
| `--text-faint` | `#ABA99F` | `#77756D` |
| `--accent` | `#7A9E7E` | `#8FB594` |
| `--accent-dark` | `#5A7A5E` | `#A8C9AC` |
| `--accent-light` | `#EBF2EC` | `#2A332B` |

Check contrast for both themes. `--text-faint` is only for non-essential metadata.

### 4.3 Theme toggle

- Default follows the system setting. A small toggle in the nav lets the owner override it.
- Save the choice in `localStorage`, wrapped in try/catch (storage can fail).
- Set the theme attribute with a tiny inline script in `<head>` **before first paint** so there is no flash of the wrong theme.
- The toggle is a real `<button>` with an accessible label and current state.

### 4.4 Typography

- Headings: Lora. Body: DM Sans, weight 300 to 400. Mono: JetBrains Mono for pills and code.
- **Chinese text:** the writing contains Chinese (e.g. 冰湖, 云南). Do **not** load a large CJK web font. Use a system fallback stack (for example `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`) and wrap runs of Chinese characters in `<span lang="zh-Hans">` automatically with a small rehype plugin, so browsers pick the right glyphs.
- Small labels: lowercase, slightly letter-spaced. Large headings: slightly tight.

### 4.5 Navigation and chrome

- Sticky nav, 62px tall, translucent background with a bottom border. Name on the left (Lora), links on the right (DM Sans, 13.5px, lowercase), theme toggle at the end.
- Links: `home  work  writing  hobbies  places  now  about`. Active link gets a thin sage underline. No icons or filled buttons.
- Mobile (under ~680px): hamburger that opens a full-width menu. Close on link tap and on outside click. Works with keyboard (Escape closes).
- "Right now" strip above the footer on every page: small sage dot, a short line, link to `/now`. Its text comes from `now` content, not hard-coded.
- Footer: name and year left, three links right (GitHub, email, LinkedIn). Minimal.

---

## 5. Site map

| Route | Purpose | Stage |
|---|---|---|
| `/places/[slug]` | Trip page (first: `/places/yunnan-2026`) | 1, 1b |
| `/places` | Globe + trip cards | 2 |
| `/` | Home: short intro, recent writing, latest trip, now strip | 3 |
| `/work` | Projects (cards with stack pills and links), hackathons and competitions (simple list) | 3 |
| `/writing` | Narrative posts, filter by `journal`, `thoughts`, `fragments` | 3 |
| `/hobbies` | Short logs, filter by `cs`, `piano`, `trading`, `editing`, `fitness` | 3 |
| `/now` | Plain text snapshot | 3 |
| `/about` | Personal intro, not a CV | 3 |

Notes:
- "Hobbies" is the working label and may change; keep it in `config.ts` so renaming is one edit.
- Fragments are short, unpolished posts (one paragraph). They need a lighter layout than full posts.
- Home, Work, Writing, Hobbies, Now and About ship with **placeholders** the owner will replace.
- A site-wide `siteName` lives in `config.ts`. The owner's display name is not decided: use `[PLACEHOLDER: name]`.

---

## 6. The trip page (the most important page)

Route: `/places/[slug]`. Built from `trip.yaml`, the day files and `notes.md`. **Single-column layout, no scroll-synced map.**

Top to bottom:

1. **Back link:** "← All places".
2. **Hero:** one wide photo (from `hero` in `trip.yaml`), then the title, subtitle (e.g. 云南) and dates **below** the image. Do not overlay text on the photo (no gradient scrims).
3. **Stats bar:** duration, number of stops, a short highlight, taken from `trip.yaml`.
4. **Overview map** (Stage 1b only; leave a clearly marked slot until then).
5. **Day index:** a sticky row of day chips ("Day 1" … "Day 10") that jump to `#day-N` and highlight the current day while scrolling (scrollspy, built with `IntersectionObserver`). On mobile it is a horizontally scrolling strip. Works without the map.
6. **Days:** each day is a `<section id="day-N">` with a small heading (day number, date, title), then the writing and media in the order written. Each day ends with a subtle "↑ back to top" link.
7. **Closing:** the reflective ending (a normal text section at the end of the last day or its own section, as written by the owner).
8. **Trip notes:** content from `notes.md` as collapsible cards using native `<details>` (no JS): food on planes, budget, hiking tips, navigating China.

### Media rendering rules

| Authored as | Renders as |
|---|---|
| one image | full-width figure in the reading column |
| 2 consecutive images | two-up grid (alternate 1.4fr / 1fr widths between groups) |
| 3 consecutive images | one large + two small (bento) |
| 4+ consecutive images | repeating groups of 2 or 3 |
| `.mp4` | muted, looping, `playsinline`, `preload="none"`, with a poster image, lazy-loaded. With reduced motion: show the poster only |
| `[photo-only]` block | photos with **no text and no placeholder**. This silence is intentional. The grid may be wider than the reading column |

- Images use Astro's image handling for responsive sizes and WebP. Always set width and height to avoid layout shift. Lazy-load everything below the fold.
- Corners 10 to 14px, thin border, hover = tiny opacity change only.
- Captions are small, faint, below the image, and only appear when authored.
- Never add captions, alt text invented from the filename, or filler text of your own.

### Inline components

- **Badges:** small pills for practical details (`food`, `trail`, `transit`, `tip`). Quiet styling (surface background, thin border, mono font). Use sparingly.
- **Trip notes cards:** collapsible, closed by default.

---

## 7. Content model

### 7.1 `trip.yaml`

```yaml
slug: yunnan-2026
title: Yunnan
subtitle: 云南
dates:
  start: 2026-09-12
  end: 2026-09-21
summary: Ten days across Yunnan, from Dali to the Yubeng trail.
cover: media/hero.webp          # used on cards and the globe page
hero: media/hero.webp
stats:
  days: 10
  highlight: Yubeng hike
route: Haikou • Kunming • Dali • Shangri-La • Yubeng • Lijiang • Xiamen
globe:
  coords: [25.0, 101.0]         # [lat, lng] for the pin on the globe
stops:                           # used by the overview map (Stage 1b)
  - id: haikou
    name: Haikou
    coords: [20.04, 110.35]
    days: [1]
    kind: city
  # ... see section 8
```

Stop `kind` is one of `city`, `hike`, `food`, `stay`. The overview map shows only `city` stops for now.

### 7.2 Day files: `day-NN.md`

```markdown
---
day: 6
date: 2026-09-17
title: Ice Lake
mode: reading        # only "reading" is implemented; "map" is reserved for later
isHike: true
places: [yubeng]     # stop ids this day belongs to
---

Today was the hike to Ice Lake (冰湖). ...

![Beef noodle and fried rice](media/day-06/01-breakfast.webp "Breakfast at the second place")

We finished up breakfast and headed off.

[photo-only]
![](media/day-06/02-trail-start.webp)
![](media/day-06/03-rest-point.webp)
![](media/day-06/04-ice-lake.webp)
![](media/day-06/05-ice-lake-loop.mp4)
[/photo-only]

[badge: trail | Ice Lake | [PLACEHOLDER: time up, notes]]

On the way back, there was a side route we wanted to try...
```

Tag and image syntax:

- `![alt text](path "optional visible caption")`. Square brackets = alt text (screen readers). Quoted title = visible caption. Empty alt is allowed for purely decorative images; the build should **warn** (not fail) when alt is empty so the owner can decide.
- `[photo-only]` ... `[/photo-only]` wraps a block of media with no text.
- `[badge: type | title | detail]` renders one pill.
- Anything between tags is normal Markdown.
- Implement these with a small remark plugin and **explain how it works** in `docs/stage-1.md`. Do not add a dependency for this unless the owner agrees.
- The owner's writing contains placeholders such as `Pics.` or `Show pics.`. Do not render these as text; the owner will replace them with `[photo-only]` blocks. If you find any, list them in your reply.

### 7.3 `notes.md`

Sections (each becomes a collapsible card): food on planes, budget, tips on hiking, navigating China. Plain Markdown with `##` headings.

### 7.4 Other collections (Stage 3)

- `writing`: `title`, `date`, `category` (`journal | thoughts | fragments`), optional `cover`, `draft`.
- `hobbies`: `title`, `date`, `tag` (`cs | piano | trading | editing | fitness`), optional media.
- `projects`: `name`, `description`, `stack[]`, `github`, `demo`, optional `image`.
- `competitions`: `name`, `date`, `what`, `result`.
- `now`: front matter `updated`, `strip` (the one-line text for the footer strip), body is the full page.

---

## 8. Yunnan trip data (use this; coordinates are approximate and must be verified)

| Day | Date | Title | Places |
|---|---|---|---|
| 1 | 2026-09-12 | Haikou, then Dali | haikou, kunming, dali |
| 2 | 2026-09-13 | Erhai Lake tour | dali |
| 3 | 2026-09-14 | To Shangri-La | shangrila |
| 4 | 2026-09-15 | Monastery, scooter, Heidou cafe | shangrila |
| 5 | 2026-09-16 | Ninong to Upper Yubeng | yubeng |
| 6 | 2026-09-17 | Ice Lake | yubeng |
| 7 | 2026-09-18 | Sacred Waterfall | yubeng |
| 8 | 2026-09-19 | Down from Yubeng, to Lijiang | shangrila, lijiang |
| 9 | 2026-09-20 | Jade Lake Village | lijiang |
| 10 | 2026-09-21 | Kunming, Xiamen, home | kunming, xiamen |

Stops (approximate `[lat, lng]`; the owner will verify in Google Maps):

| id | name | coords | days |
|---|---|---|---|
| haikou | Haikou | 20.04, 110.35 | 1 |
| kunming | Kunming | 25.04, 102.72 | 1, 10 |
| dali | Dali | 25.69, 100.16 | 1, 2 |
| shangrila | Shangri-La | 27.83, 99.70 | 3, 4, 8 |
| yubeng | Yubeng | 28.43, 98.80 | 5, 6, 7 |
| lijiang | Lijiang | 26.87, 100.23 | 8, 9 |
| xiamen | Xiamen | 24.48, 118.09 | 10 |

The writing is provided by the owner as day files. Do not generate or edit it. Until the owner supplies day files, use two clearly marked test days with placeholder text and placeholder photos so the template can be built.

---

## 9. Stages

Each stage has acceptance criteria. **Stop when they are met, summarise, and wait.**

### Stage 0: Foundation and deploy

- Astro project, Git repo, `.gitignore`, `README.md`.
- `src/config.ts` (name placeholder, nav items, social links as placeholders).
- Tokens, base styles, fonts, light and dark theme with no-flash toggle.
- `BaseLayout`, `Nav` (desktop and mobile), `Footer`, `NowStrip` (placeholder text).
- A temporary home page that proves the layout.
- GitHub Actions deploy to Pages.

**Done when:** `npm run build` passes; the site is live at `https://bngybongybrd.github.io`; theme toggle works and persists with no flash; nav works by keyboard and at 375px; both themes pass a contrast check on body text.

### Stage 1: Trip page

- Schemas for `trips` and `days`; the `[slug]` page; hero, stats bar, day index with scrollspy, day sections, media rendering rules, badges, notes cards.
- Remark plugin for the custom tags; rehype plugin for `lang="zh-Hans"`.
- Build with **two test days first** (a text-heavy day and a photo-heavy `[photo-only]` day). Only after the owner approves, load all ten days.
- `scripts/check-exif.mjs`: warn if any image under content has GPS EXIF data (ask before adding a library for this).

**Done when:** a day with `[photo-only]` shows photos with no text or placeholder; consecutive images form the right grids; the day index highlights the day in view and jumps correctly; notes cards open and close without JS; the page is usable at 375px and 1280px in both themes; the page works with JS disabled (except scrollspy highlight and theme toggle).

### Stage 1b: Overview map

- MapLibre map placed once under the stats bar. Not sticky. Fixed height (about 380px desktop, shorter on mobile).
- Pale minimal style, sage pins, thin dotted route line connecting `city` stops in trip order. Cities only.
- Click or keyboard-activate a pin: show the place name, its days, and a jump link beneath the map. Hovering a pin highlights its days in the day index, and the reverse.
- Map and day index share state through simple events or data attributes (explain the approach).
- On touch devices a one-finger drag should scroll the page, not move the map (look up MapLibre's current cooperative-gestures option).
- A plain list of places as a fallback if the map or tiles fail to load.
- **Before building:** propose two or three free tile and style options with their current usage limits and attribution requirements, and let the owner choose. Keep any API key out of Git, and restrict it by URL if one is needed.

**Done when:** pins, route and day links work; keyboard users can reach every pin; the page is fully usable if the map fails to load.

### Stage 2: Places landing page

- `/places`: header, Globe.gl globe with one pin per trip (from `globe.coords`), and trip cards (cover, title, dates, summary) below.
- Clicking a pin or a card goes to `/places/[slug]`. The pin and card lists are generated from the trips collection, so adding a trip folder adds both automatically.
- Slow auto-rotate that stops on interaction; disabled under reduced motion. Lazy-load the globe. If WebGL is unavailable, show the cards only.
- Decide with the owner whether the globe texture is hosted in the repo or loaded from a CDN.

**Done when:** adding a second trip folder (a test one) creates a pin, a card and a page with no code changes; the page works without WebGL.

### Stage 3: Remaining pages

Home, Work, Writing (category filter), Hobbies (tag filter), Now, About. Placeholders only, except for the nav, layout and filters. Filters should work with a small amount of vanilla JS and fall back to showing all posts without it.

**Done when:** every nav link goes somewhere sensible; adding a Markdown file to a collection adds an entry to its list page; the Now strip on every page reads from `now`.

### Stage 4: Polish

Pagefind search, RSS for Writing, `sitemap`, a 404 page, page titles and descriptions, Open Graph tags, a Lighthouse pass (aim for strong scores on performance, accessibility and best practices), a check that no image exceeds a sensible size, and a final read-through for placeholder text left in.

### Later (do not build now)

Digital garden (linked notes plus a graph), bookshelf, uses page, changelog, a `/hikes` index driven by `isHike`, an optional hero video, 3D terrain, map-synced scrolling for map-heavy trips.

### Learning notes (every stage)

After each stage write `docs/stage-N.md`, in plain English, covering: what was built; how data flows from content files to the page; the key concepts used (for example content collections, `IntersectionObserver`, CSS custom properties, remark plugins); and 3 to 5 small "try changing this" exercises for the owner. Then walk the owner through the code in execution order if asked.

---

## 10. Quality bars

**Accessibility:** real headings in order; keyboard access for nav, theme toggle, day index, map pins and notes cards; visible focus states; sufficient contrast in both themes; alt text where authored; `lang` set correctly (including Chinese runs); no information conveyed by colour alone.

**Performance:** lazy-load images and video; responsive image sizes; no layout shift (set dimensions); fonts self-hosted and preloaded sparingly; no unnecessary JS on pages that don't need it (the globe and map scripts load only on their pages). GitHub Pages limits are strict (published site under about 1 GB, single files under 100 MB), so keep media compressed and keep originals out of the repo.

**Privacy and safety:** image GPS data must not be published (the check script warns). Do not add third-party trackers. Do not commit secrets or API keys.

**Resilience:** every page must be usable with JS off, apart from enhancements (map, globe, theme toggle, scrollspy highlight).

---

## 11. Decisions to raise with the owner (ask in Plan Mode, don't assume)

- Tile provider and style for the overview map (Stage 1b).
- Globe texture source and look (Stage 2).
- Self-hosted fonts via `@fontsource` vs. Google Fonts.
- Image pipeline details: Astro's built-in image handling vs. pre-optimised files only.
- Whether the closing reflection is its own section or the end of Day 10.
- Display name and final label for "Hobbies".

---

## 12. Owner's checklist (not for Claude Code)

Before loading the real trip:

- [ ] Resize photos (about 1600px on the long edge, WebP or JPEG) and **strip GPS/EXIF data**.
- [ ] Name files in order: `NN-short-description.webp`, in `media/day-NN/`.
- [ ] Videos: 4 to 6 seconds, compressed, no audio, with a poster image.
- [ ] Replace `Pics.`, `Show pics.`, `Food pic` and similar notes with `[photo-only]` blocks or images.
- [ ] Resolve the writeup's fact-check items (festival date, Qilou Street claim, scooter rules, tour price currency, train booking window, backpack weight guidance).
- [ ] Pick one time format (24-hour or 12-hour) and use it throughout.
- [ ] Verify stop coordinates in Google Maps (right-click a place, click the numbers to copy).
- [ ] Ask Quentin to read the parts that mention him (especially Day 5) and agree to the photos that show him.
- [ ] Check photos for strangers' faces, licence plates and anything identifying (home, ID documents).
- [ ] Decide the display name, social links and email for the footer.

---

## 13. Kickoff message (paste into Claude Code)

```
Read CLAUDE.md and PLAN.md in full. I'm learning, so work in Plan Mode,
one stage at a time. Start with Stage 0 only.

First, give me your plan for Stage 0: the files you'll create, how the
theme toggle avoids a flash, how the GitHub Pages deploy will work, and
anything in PLAN.md you think is unclear or wrong. Don't write code
until I approve. Check the current Astro docs rather than relying on memory.
```
