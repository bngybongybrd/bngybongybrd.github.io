# bngybongybrd.github.io

Personal website, built with [Astro](https://astro.build) and published on GitHub Pages at <https://bngybongybrd.github.io>.

The build plan is in [`PLAN.md`](PLAN.md), working rules are in [`CLAUDE.md`](CLAUDE.md), and plain-English notes for each stage are in [`docs/`](docs/).

## Run it locally

You need Node.js 22.23.4 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:4321>. The page reloads as you edit files.

## Build

```bash
npm run build
```

Before building, `scripts/sync-videos.mjs` copies trip videos into `public/trips/`, and `scripts/check-exif.mjs` warns if any photo or video contains location data (run it alone with `npm run check:exif`). The finished site goes into `dist/`. To look at that exact build:

```bash
npm run preview
```

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages. You can also start it by hand from the repo's **Actions** tab.

One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

## Where things live

| Path | What it is |
|---|---|
| `src/config.ts` | Site name, nav links, footer links, now-strip text |
| `src/styles/tokens.css` | Colours (light and dark), sizes, radii |
| `src/styles/base.css` | Default look of plain HTML elements |
| `src/layouts/BaseLayout.astro` | The page shell: `<head>`, nav, content, now strip, footer |
| `src/components/` | Nav, theme toggle, now strip, footer, placeholder page |
| `src/pages/` | One file per URL |
| `src/content/trips/<trip>/` | A trip: `trip.yaml`, `intro.md`, `day-NN.md`, `notes.md`, `media/` |
| `src/content.config.ts` | What fields each content file must have |
| `src/plugins/` | Markdown plugins: photo grids, `[photo-only]`, videos, badges, notes cards, Chinese text |
| `scripts/` | `sync-videos.mjs` and `check-exif.mjs`, run automatically before dev/build |
| `public/` | Files copied as-is (favicon; generated video copies in `public/trips/`) |
| `astro.config.mjs` | Site URL and fonts |
