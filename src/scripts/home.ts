import { gsap, ScrollTrigger, SplitText, scramble } from './motion';
import { Waveform } from './waveform';
import { onThemeChange } from './theme';
import { sound } from './ui';
import { drawArt } from './art';
import { finePointer, reducedMotion } from './env';
import type { ArtKind } from '../data/projects';

/* ── Hero waveform ───────────────────────────────────────── */
export function initWave(): Waveform | null {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-wave]');
  if (!canvas) return null;
  const noiseEl = document.querySelector<HTMLElement>('[data-noise]');
  const modeEl = document.querySelector<HTMLElement>('[data-mode]');
  const wave = new Waveform(canvas, {
    interactive: finePointer && !reducedMotion,
    animate: !reducedMotion,
    onNoise: (pct) => {
      if (noiseEl) noiseEl.textContent = `${String(pct).padStart(2, '0')}%`;
      sound.ambient(pct / 100);
    },
    onMode: (name, i) => {
      sound.play('mode', i);
      if (!modeEl) return;
      modeEl.dataset.text = `Mode ${String(i + 1).padStart(2, '0')} — ${name}`;
      reducedMotion ? (modeEl.textContent = modeEl.dataset.text) : scramble(modeEl, 0.7);
    },
  });
  if (reducedMotion) return wave;

  const hero = document.querySelector('[data-hero]');
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom top',
    onUpdate: (self) => {
      const p = Math.min(1, self.progress / 0.55);
      wave.clean = p * p * (3 - 2 * p);
    },
  });
  return wave;
}

/* ── Preloader: 000 → 100, then the counter collapses into the trace ── */
export function runPreloader(wave: Waveform | null): Promise<void> {
  const pre = document.querySelector<HTMLElement>('[data-preloader]');
  if (!pre || reducedMotion) {
    pre?.remove();
    if (wave) wave.amp = 1;
    return Promise.resolve();
  }
  const count = pre.querySelector<HTMLElement>('[data-count]')!;
  const line = pre.querySelector<HTMLElement>('[data-line]')!;
  const meta = pre.querySelector<HTMLElement>('.preloader__meta');

  let repeat = false;
  try {
    repeat = sessionStorage.getItem('rk-seen') === '1';
    sessionStorage.setItem('rk-seen', '1');
  } catch {}

  const loaded = new Promise<void>((res) => {
    if (document.readyState === 'complete') res();
    else window.addEventListener('load', () => res(), { once: true });
  });
  const ready = Promise.race([
    Promise.all([document.fonts.ready, loaded]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);

  return new Promise((resolve) => {
    const state = { v: 0 };
    gsap.to(state, {
      v: 100,
      duration: repeat ? 0.55 : 1.35,
      ease: 'power2.inOut',
      onUpdate: () => (count.textContent = String(Math.round(state.v)).padStart(3, '0')),
      onComplete: async () => {
        await ready;
        const r = count.getBoundingClientRect();
        const cy = wave ? wave.centerY() : innerHeight / 2;
        gsap
          .timeline({ onComplete: () => pre.remove() })
          .to(meta, { autoAlpha: 0, duration: 0.3 }, 0)
          .to(count, { scaleY: 0.015, duration: 0.32, ease: 'power3.in' }, 0)
          .set(count, { autoAlpha: 0 })
          .set(line, { width: r.width, top: r.top + r.height / 2 }, '<')
          .to(line, { width: '100vw', top: cy, duration: 0.75, ease: 'expo.inOut' })
          .add(() => {
            resolve();
            if (wave) gsap.to(wave, { amp: 1, duration: 1.8, ease: 'expo.out' });
          })
          .to(pre, { backgroundColor: 'rgba(10,10,11,0)', duration: 0.5, ease: 'power1.out' }, '<')
          .to(line, { autoAlpha: 0, duration: 0.7 }, '<0.15');
      },
    });
  });
}

/* ── Hero intro: headline chars rise out of a line mask ── */
export function heroIntro() {
  const title = document.querySelector<HTMLElement>('.hero-title');
  if (!title || reducedMotion) return;
  SplitText.create(title, {
    type: 'lines,chars',
    mask: 'lines',
    linesClass: 'split-line',
    onSplit(self) {
      gsap.set(title, { visibility: 'visible' });
      gsap.from(self.chars, { yPercent: 120, duration: 1.2, ease: 'expo.out', stagger: 0.022 });
    },
  });
  gsap
    .timeline()
    .to('.hero-name__text', { y: 0, yPercent: 0, duration: 1.1, ease: 'expo.out' })
    .to('.hero-name__bar', { scaleX: 1, duration: 1.2, ease: 'expo.inOut' }, 0.25);
  gsap.from('[data-hero-fade]', { y: 18, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.35 });
  document.querySelectorAll<HTMLElement>('[data-hero] [data-scramble-now]').forEach((el) => scramble(el, 1.2));
}

/* ── Generative plates (lazy) ─────────────────────────── */
export function initArt() {
  const canvases = [...document.querySelectorAll<HTMLCanvasElement>('canvas[data-art]')];
  if (!canvases.length) return;
  const drawn = new Set<HTMLCanvasElement>();
  const paint = (c: HTMLCanvasElement) => {
    if (!c.getClientRects().length) return; // display:none (desktop index rows)
    drawArt(c, c.dataset.art as ArtKind, c.dataset.seed || '', c.dataset.caption);
    drawn.add(c);
  };
  document.fonts.ready.then(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            paint(e.target as HTMLCanvasElement);
            io.unobserve(e.target);
          }
      },
      { rootMargin: '300px' },
    );
    canvases.forEach((c) => io.observe(c));
    onThemeChange(() => drawn.forEach(paint));
    let t = 0;
    let lastW = innerWidth;
    window.addEventListener('resize', () => {
      if (innerWidth === lastW) return; // ignore mobile URL-bar resizes
      lastW = innerWidth;
      clearTimeout(t);
      t = window.setTimeout(() => {
        drawn.forEach(paint);
        canvases.forEach((c) => !drawn.has(c) && io.observe(c));
      }, 200);
    });
  });
}

/* ── Floating preview that follows the cursor: Work cards + Index rows ── */
export function initIndexPreview() {
  const preview = document.querySelector<HTMLElement>('[data-preview]');
  if (!preview || !finePointer || matchMedia('(max-width: 860px)').matches) return;
  const canvas = preview.querySelector('canvas')!;
  const img = preview.querySelector('img')!;
  const label = preview.querySelector<HTMLElement>('[data-preview-label]')!;
  const cache = new Map<string, HTMLCanvasElement>();
  onThemeChange(() => cache.clear());
  const xTo = gsap.quickTo(preview, 'x', { duration: 0.55, ease: 'power3' });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.55, ease: 'power3' });
  const rTo = gsap.quickTo(preview, 'rotation', { duration: 0.8, ease: 'power3' });
  gsap.set(preview, { scale: 0.85, autoAlpha: 0 });
  let lastX = 0;

  const show = (row: HTMLElement) => {
    const { slug = '', art = 'graph', image, title = '' } = row.dataset;
    label.textContent = title;
    if (image) {
      img.src = image;
      img.hidden = false;
      canvas.hidden = true;
    } else {
      img.hidden = true;
      canvas.hidden = false;
      let src = cache.get(slug);
      if (!src) {
        src = document.createElement('canvas');
        canvas.after(src);
        src.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;visibility:hidden';
        drawArt(src, art as ArtKind, slug);
        src.remove();
        cache.set(slug, src);
      }
      canvas.width = src.width;
      canvas.height = src.height;
      canvas.getContext('2d')!.drawImage(src, 0, 0);
    }
    gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'expo.out', overwrite: 'auto' });
  };
  const hide = () => gsap.to(preview, { autoAlpha: 0, scale: 0.85, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });

  const rows = document.querySelectorAll<HTMLElement>('[data-index-row], [data-preview-row]');
  rows.forEach((row) => {
    row.addEventListener('pointerenter', () => show(row));
    if (row.hasAttribute('data-preview-row')) row.addEventListener('pointerleave', hide);
    row.addEventListener('focus', () => {
      const r = row.getBoundingClientRect();
      gsap.set(preview, { x: r.right - preview.offsetWidth - 80, y: r.top - preview.offsetHeight / 2 + r.height / 2 });
      show(row);
    });
    row.addEventListener('blur', hide);
  });
  document.querySelector('[data-index-list]')?.addEventListener('pointerleave', hide);
  window.addEventListener(
    'pointermove',
    (e) => {
      const w = preview.offsetWidth;
      const h = preview.offsetHeight;
      const x = e.clientX + 28 + w > innerWidth ? e.clientX - w - 28 : e.clientX + 28;
      xTo(x);
      yTo(Math.min(innerHeight - h - 12, Math.max(12, e.clientY - h / 2)));
      rTo(Math.max(-6, Math.min(6, (e.clientX - lastX) * 0.35)));
      lastX = e.clientX;
    },
    { passive: true },
  );
}

/* ── Lab: a tiny greedy Block Blast agent ─────────────── */
const PIECES = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
];

export function initBlockBlast() {
  const board = document.querySelector<HTMLElement>('[data-bb]');
  if (!board) return;
  const N = 8;
  const cells = [...board.children] as HTMLElement[];
  const grid: boolean[] = Array(N * N).fill(false);
  const at = (x: number, y: number) => y * N + x;

  // Seed a mid-game board.
  [3, 4, 9, 10, 11, 17, 24, 25, 33, 40, 41, 42, 48, 49, 50, 51, 56, 57, 58, 59, 60].forEach((i) => (grid[i] = true));
  const paint = (fresh: number[] = [], clearing: number[] = []) =>
    cells.forEach((c, i) => {
      c.className = clearing.includes(i) ? 'clr' : fresh.includes(i) ? 'new' : grid[i] ? 'on' : '';
    });
  paint();
  if (reducedMotion) return;

  const fits = (p: number[][], ox: number, oy: number) =>
    p.every(([dx, dy]) => ox + dx < N && oy + dy < N && !grid[at(ox + dx, oy + dy)]);

  const step = () => {
    const piece = PIECES[Math.floor(Math.random() * PIECES.length)];
    let best: { x: number; y: number; score: number } | null = null;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (!fits(piece, x, y)) continue;
        // Greedy: prefer cleared lines, then contact with filled cells.
        piece.forEach(([dx, dy]) => (grid[at(x + dx, y + dy)] = true));
        let score = 0;
        for (let k = 0; k < N; k++) {
          if ([...Array(N)].every((_, j) => grid[at(j, k)])) score += 10;
          if ([...Array(N)].every((_, j) => grid[at(k, j)])) score += 10;
        }
        piece.forEach(([dx, dy]) => {
          const px = x + dx, py = y + dy;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => {
            const nx = px + a, ny = py + b;
            if (nx < 0 || ny < 0 || nx >= N || ny >= N || grid[at(nx, ny)]) score += 1;
          });
        });
        piece.forEach(([dx, dy]) => (grid[at(x + dx, y + dy)] = false));
        score += Math.random() * 0.5;
        if (!best || score > best.score) best = { x, y, score };
      }
    if (!best) {
      grid.fill(false);
      paint();
      return;
    }
    const fresh = piece.map(([dx, dy]) => at(best!.x + dx, best!.y + dy));
    fresh.forEach((i) => (grid[i] = true));
    const clearing: number[] = [];
    for (let k = 0; k < N; k++) {
      const row = [...Array(N)].map((_, j) => at(j, k));
      const col = [...Array(N)].map((_, j) => at(k, j));
      if (row.every((i) => grid[i])) clearing.push(...row);
      if (col.every((i) => grid[i])) clearing.push(...col);
    }
    paint(fresh);
    if (clearing.length)
      setTimeout(() => {
        paint([], clearing);
        clearing.forEach((i) => (grid[i] = false));
        setTimeout(() => paint(), 260);
      }, 320);
  };

  let timer = 0;
  new IntersectionObserver(([e]) => {
    clearInterval(timer);
    if (e.isIntersecting) timer = window.setInterval(step, 750);
  }).observe(board);
}
