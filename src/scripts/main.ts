import { finePointer, reducedMotion } from './env';
import { gsap, initAnchors, initNav, initReveals, initSmoothScroll, scrollToHash } from './motion';
import { initCursor, initMagnetic } from './cursor';
import { initPalette } from './palette';
import { initClock, initCopy, initSound, toast } from './ui';
import { initTheme } from './theme';
import { initSparklines } from './sparkline';
import { heroIntro, initArt, initBlockBlast, initIndexPreview, initWave, runPreloader } from './home';

initTheme();
initSmoothScroll();
initAnchors();
initClock();
initSound();
initCopy();
initPalette(scrollToHash);
if (finePointer) {
  initCursor();
  if (!reducedMotion) initMagnetic();
}

const wave = initWave();
initNav();

// Below-the-fold canvases can wait until the main thread is idle.
const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
idle(() => {
  initArt();
  initSparklines(!reducedMotion);
  initIndexPreview();
  initBlockBlast();
});

// Reveals wait for webfonts so SplitText measures final line breaks.
document.fonts.ready.then(() => {
  runPreloader(wave).then(() => {
    heroIntro();
    initReveals();
  });
});

// Easter egg: type "noise" anywhere.
let buffer = '';
window.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.key.length !== 1) return;
  buffer = (buffer + e.key.toLowerCase()).slice(-5);
  if (buffer !== 'noise') return;
  buffer = '';
  if (wave && !reducedMotion) {
    gsap.timeline().to(wave, { chaos: 1, duration: 0.15 }).to(wave, { chaos: 0, duration: 0.6, ease: 'power2.out' }, '+=1.85');
    toast('noise injected ∿');
  } else {
    toast(wave ? 'noise detected — motion is reduced' : 'noise detected — try it on the home page');
  }
});
