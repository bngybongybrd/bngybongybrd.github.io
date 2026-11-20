# Stage 0: Foundation and deploy

## What was built

- An **Astro project** that replaces the old hand-written HTML site.
- A **design system** in CSS: colour tokens for light and dark, type sizes, layout widths and radii (`src/styles/tokens.css`), plus default styles for plain HTML (`src/styles/base.css`).
- **Self-hosted fonts**: Lora, DM Sans and JetBrains Mono, served from the site itself.
- A **theme toggle** that remembers your choice and never flashes the wrong theme.
- The **site chrome** shared by every page: sticky nav (with a mobile menu), the "right now" strip and the footer.
- A **temporary home page**, one-line **placeholder pages** for every nav link, and a hidden **`/dev/` layout check** page that shows the fonts, colours and widths (marked `noindex` so search engines skip it).
- A **GitHub Actions workflow** that builds and publishes the site whenever `main` changes.

## How a page gets made

Astro runs at **build time** on your computer (or on GitHub's servers), not in the visitor's browser. It turns `.astro` files into plain `.html` files in `dist/`, and that folder is what GitHub Pages serves.

Following `/work/` from file to HTML:

1. **`src/pages/work.astro`** exists, so Astro creates the URL `/work/` (file-based routing: the file path *is* the URL).
2. That page renders `<PlaceholderPage title="work" stage="3" />`.
3. **`src/components/PlaceholderPage.astro`** wraps its content in `<BaseLayout title="work">`.
4. **`src/layouts/BaseLayout.astro`** writes the `<head>` (title, fonts, theme script), then `<Nav />`, then the page content where `<slot />` is, then `<NowStrip />` and `<Footer />`.
5. **`Nav`**, **`NowStrip`** and **`Footer`** read their text and links from **`src/config.ts`**. Nav also checks `Astro.url.pathname` to mark the current link with `aria-current="page"`.
6. Astro gathers every component's `<style>` and `<script>`, bundles them into files under `dist/_astro/`, and writes `dist/work/index.html`.

Each `.astro` file has two parts. The part between the `---` fences is JavaScript that runs **at build time** (imports, reading config, working out values). Everything below it is the HTML template.

## Key concepts

### CSS custom properties (tokens)

`--bg: #faf9f6;` defines a variable, and `background: var(--bg);` uses it. Every colour on the site goes through a token, so **dark mode just redefines the tokens**. No component has to know which theme is on.

### Scoped styles

A `<style>` block inside an `.astro` component only affects that component. Astro adds a unique attribute to its elements (like `data-astro-cid-…`) and to its selectors. So `.links a` in `Nav.astro` can't accidentally style links elsewhere. To reach outside (for example, the `.js` class on `<html>`), you write `:global(.js)`.

### How the theme works without a flash

There are three layers:

1. **CSS alone** (`tokens.css`): light is the default. `@media (prefers-color-scheme: dark)` switches to dark tokens when the device is in dark mode, *unless* `data-theme="light"` is set. `:root[data-theme="dark"]` forces dark. This layer works with JavaScript turned off.
2. **The inline script** at the top of `<head>` in `BaseLayout.astro` reads your saved choice from `localStorage` and puts it on `<html>` as `data-theme`. Scripts in `<head>` run *before* the browser draws anything, so the first frame already has the right colours. Without this, a page would flash light, then switch.
   - `is:inline` matters. Normally Astro turns `<script>` into a deferred module, which runs *after* the page is drawn and is too late for this job. `is:inline` leaves it exactly where it is.
   - `try/catch` matters too. Some browsers block storage (private mode). Then the script quietly does nothing and the CSS layer takes over.
3. **The toggle button** (`ThemeToggle.astro`) flips the theme, saves it, and updates `aria-pressed` so screen readers know whether "Dark theme" is on. It is hidden until JavaScript runs, because a button that does nothing is worse than no button.

### One shared left edge

The nav name, page headings, body text, now strip and footer all start at the same left edge. In `base.css`, `.reading` is as wide as `.wide` (1000px), but every direct child is capped at the reading width (`.reading > * { max-width: 680px }`). Text keeps a comfortable line length, and the extra space sits on the right instead of being split on both sides.

### Progressive enhancement (the mobile menu)

The inline script also adds a `js` class to `<html>`. On narrow screens:
- **Without JS**, the nav links wrap onto a second row. That's plain and still usable.
- **With JS** (`.js` present), CSS hides the links behind the menu button. The script in `Nav.astro` opens and closes it, and keeps `aria-expanded` up to date. It also closes on Escape (returning focus to the button), on a link tap, and on a click outside.

The menu button sits *before* the links in the HTML. That way, after opening the menu, the next Tab goes into the links. Keyboard order follows HTML order, not visual position.

### Astro's Fonts API

`astro.config.mjs` lists each font family. At build time Astro copies the font files into `dist/_astro/fonts/`, writes the `@font-face` rules, and creates a CSS variable such as `--font-lora`. It also generates a **fallback font tuned to the same size** (for example "Lora fallback: Times New Roman"). While the real font downloads, text already takes up the right space, so nothing jumps.

- **Subsets:** each font is split into "latin" and "latin-ext" files with a `unicode-range`. The browser only downloads a file if the page uses a character in that range.
- **Preload:** only the upright DM Sans files are preloaded, because body text is on every page. Preloading everything would compete with more important downloads.
- **Why `fontProviders.local()`:** Astro also has an `npm()` provider made for font packages. In Astro 7.4 it produces `file://` URLs that Astro itself can't read, so the build failed. Pointing `local()` at the same files in `node_modules/@fontsource-variable/…` does the same job.

### The deploy workflow

`.github/workflows/deploy.yml` runs on GitHub's servers every time `main` changes:
1. **build job:** checks out the repo, then `withastro/action` installs packages from `package-lock.json`, runs `npm run build`, and uploads `dist/`.
2. **deploy job:** `actions/deploy-pages` publishes that upload to GitHub Pages.

`site` in `astro.config.mjs` is the live URL. A `base` path isn't needed, because a repo named `<username>.github.io` is served from the domain root.

## Changes from PLAN.md

- Two light-theme colours were darkened to pass contrast: `--text-muted` `#7A7870` → `#6E6C64` (now 5.0:1), and `--accent` `#7A9E7E` → `#6B8F6F` (now 3.45:1 for the dot and the underline).
- The theme toggle's accessible name stays "Dark theme" and `aria-pressed` says whether it's on. That's the standard pattern for a toggle button, and better than changing the label.
- The toggle uses a small half-circle symbol, since a toggle needs *something* to click. The nav links themselves have no icons.

## Try changing this

1. **Change a colour everywhere:** in `src/styles/tokens.css`, set `--accent` in the light block to another colour and run `npm run dev`. The nav underline, the "now" dot and the focus ring all change together.
2. **Rename "hobbies":** in `src/config.ts`, change `label: "hobbies"` to something else. Then also rename `src/pages/hobbies/` and the `href` if you want the URL to match.
3. **See the flash the inline script prevents:** in `BaseLayout.astro`, remove `is:inline` from the theme script, rebuild, pick dark, and reload with your system in light mode. Watch the first frame. Put it back afterwards.
4. **Watch scoped styles work:** add `<style> a { color: red; } </style>` to `Footer.astro`. Only the footer links turn red. Then try `:global(a)` and see the difference.
5. **Test without JavaScript:** in your browser's dev tools, disable JavaScript and reload at a narrow width. The links wrap, the theme follows your system, and the toggle and menu button disappear.
