import type { SparkKind } from '../data/projects';
import { hashString, noise1, rng, whenVisible } from './env';
import { C, onThemeChange } from './theme';

const N = 48;

function generator(kind: SparkKind, seed: string) {
  const r = rng(hashString(seed));
  let i = r() * 100;
  let walk = 0.5;
  let level = 0.5;
  return (): number => {
    i += 1;
    switch (kind) {
      case 'speech': {
        const env = Math.max(0, noise1(i * 0.18) + 0.25);
        return 0.5 + (r() * 2 - 1) * env * 0.45;
      }
      case 'rag': {
        if (r() > 0.88) level = 0.2 + r() * 0.6;
        return level + (r() - 0.5) * 0.04;
      }
      case 'aqi':
        return 0.5 + Math.sin(i * 0.14) * 0.25 + noise1(i * 0.3) * 0.12;
      case 'funds':
      default:
        walk += (r() - 0.48) * 0.09;
        walk = Math.min(0.92, Math.max(0.08, walk));
        return walk;
    }
  };
}

export function initSparklines(animate: boolean) {
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-spark]').forEach((canvas) => {
    const kind = canvas.dataset.spark as SparkKind;
    const next = generator(kind, kind + canvas.dataset.seed);
    const data = Array.from({ length: N }, next);
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 120;
    const h = canvas.clientHeight || 28;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      data.forEach((v, k) => {
        const x = (k / (N - 1)) * (w - 4);
        const y = 3 + (1 - v) * (h - 6);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.strokeStyle = C.ink(0.55);
      ctx.lineWidth = 1;
      ctx.stroke();
      const lx = w - 4;
      const ly = 3 + (1 - data[N - 1]) * (h - 6);
      ctx.fillStyle = C.accent;
      ctx.fillRect(lx - 1.5, ly - 1.5, 3, 3);
    };
    draw();
    onThemeChange(draw);
    if (!animate) return;

    let timer = 0;
    whenVisible(canvas, (vis) => {
      clearInterval(timer);
      if (vis)
        timer = window.setInterval(() => {
          data.shift();
          data.push(next());
          draw();
        }, 90);
    });
  });
}
