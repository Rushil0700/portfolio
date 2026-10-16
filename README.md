# Rushil Kubavat — Portfolio

Personal portfolio. Astro + TypeScript, GSAP (ScrollTrigger, SplitText, ScrambleText), Lenis, plain canvas. Live at https://rushiltech.in.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve the build
```

## Deploy (Cloudflare)

`npm run deploy` builds and uploads `dist/` to the static-assets Worker `rushiltech` (see `wrangler.jsonc`), served at rushiltech.in.

## Editing content

Everything lives in `src/data/projects.ts`:

- `tier: 'featured'` → large card in **01 / Work**; `'index'` → row in **02 / Index**; `'lab'` → tile in **03 / Lab**.
  Every project also gets a detail page at `/work/<slug>/`.
- `year` values are **placeholders**; confirm them.
- `links` per project defaults to the GitHub profile. Add repo/demo links there.
- `stack` drives the marquee and `timeline` the experience log.

## Where real assets go

| What | Where | Notes |
| --- | --- | --- |
| Project screenshots | `public/work/<slug>.webp` + set `image: '/work/<slug>.webp'` | ~1600×1000, dark UI. Without one, a generative canvas plate (`src/scripts/art.ts`) is drawn. |
| Resume | `public/resume.pdf` | Currently a one-page **placeholder**; replace it. |
| OG image | `public/og.png` | 1200×630, already generated. |

## Features

- Light ("paper") and dark ("ink") themes with a nav toggle (`src/scripts/theme.ts`); defaults to the OS setting and remembers the visitor's choice. Canvas colours come from the same palette.
- Preloader counter 000→100 that collapses into the hero trace.
- Hero waveform (`src/scripts/waveform.ts`): a clean data shape (forecasting, audio, finance, retrieval) under layered noise; scroll and cursor clean it up; live noise % and mode readouts.
- Custom cursor with labels (`data-cursor="View"`), magnetic hover (`data-magnetic`), scramble labels (`data-scramble`), line-mask reveals (`data-reveal="lines"`).
- ⌘K / Ctrl+K command palette; optional UI sound (off by default); type **noise** for the easter egg.
- `prefers-reduced-motion`: no smooth scroll, preloader, scrambles or animated canvases; a static clean trace.
