# CLAUDE.md

Project: personal website for GitHub user `bngybongybrd` (repo `bngybongybrd.github.io`).
The full build plan is in `PLAN.md`. Read it before starting any work.

## About the owner

CS student who is learning web development and wants to understand every line of this site. The owner is not a frontend specialist and plans to reuse what they learn on future projects.

## How to work

- Start every stage in Plan Mode. Explain the approach and the files involved, then wait for approval before writing code.
- Do one stage at a time. Do not begin the next stage until the owner says so.
- Write simple, readable code. Prefer plain and obvious over clever. Comment the why, not the what.
- Explain decisions briefly as you go. When the owner asks "why", answer fully.
- Look up current documentation (Astro, MapLibre, Globe.gl, Pagefind) instead of relying on memory.
- Ask before adding any dependency, and say what it does and what the alternative is.
- Commit after each working stage, with a clear message. Keep diffs small enough to review.
- After each stage, write `docs/stage-N.md` in plain English: what was built, how data flows, key concepts, and 3 to 5 exercises the owner can try.

## Hard rules

- Never edit, rephrase, or fix the owner's writing. Render it exactly as written and flag problems in your reply.
- Never invent content (posts, projects, captions, facts). Use `[PLACEHOLDER]` markers.
- Never publish image GPS data. Warn if any image has EXIF location data.
- Never commit secrets or API keys.
- Do not add trackers, analytics, or third-party scripts without asking.

## Stack

Astro (static) · plain CSS with custom properties · minimal vanilla JS · GitHub Pages.
Later stages: MapLibre GL JS (overview map), Globe.gl (places page), Pagefind (search).
No Tailwind, no UI frameworks, no CMS.

## Design in one line

Peaceful, spacious, personal. Warm off-white (light) and warm charcoal (dark), one sage accent, Lora headings, DM Sans body, no shadows, no gradients, minimal motion. Full tokens are in `PLAN.md` section 4.

## Conventions

- Content lives in `src/content/` as Markdown and YAML. Adding a trip is adding a folder.
- Use the custom tags `[photo-only]`, `[/photo-only]` and `[badge: type | title | detail]` described in `PLAN.md` section 7.
- Every page must remain usable with JavaScript disabled, apart from enhancements (map, globe, theme toggle, scrollspy highlight).
- Respect `prefers-reduced-motion`.
- Chinese text uses a system font stack and `lang="zh-Hans"` spans. Do not load a CJK web font.
