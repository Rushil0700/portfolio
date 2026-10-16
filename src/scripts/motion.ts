import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import Lenis from 'lenis';
import { reducedMotion } from './env';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

export let lenis: Lenis | null = null;

export function initSmoothScroll() {
  if (reducedMotion) return;
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.documentElement.addEventListener('palette', (e) => ((e as CustomEvent).detail ? lenis!.stop() : lenis!.start()));
}

export function scrollToHash(hash: string) {
  const target = hash === '#top' ? null : document.querySelector<HTMLElement>(hash);
  if (hash !== '#top' && !target) return;
  if (lenis) lenis.scrollTo(target ?? 0, { duration: 1.4 });
  else if (target) target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  else window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  history.replaceState(null, '', hash === '#top' ? location.pathname : hash);
  // Move keyboard focus with the scroll.
  const focusEl = target ?? document.getElementById('main');
  if (focusEl) {
    if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
    focusEl.focus({ preventScroll: true });
  }
}

export function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!a || e.metaKey || e.ctrlKey) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    if (url.hash === '#top' || document.querySelector(url.hash)) {
      e.preventDefault();
      scrollToHash(url.hash);
    }
  });
  document.querySelectorAll('[data-top]').forEach((b) => b.addEventListener('click', () => scrollToHash('#top')));
}

/** Line-by-line masked slides, hairline rules, clip reveals, scrambles. */
export function initReveals() {
  if (reducedMotion) return;

  // One shared observer: nothing is split or measured until it nears the viewport.
  const handlers = new WeakMap<Element, () => void>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        handlers.get(e.target)?.();
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  const onEnter = (el: Element, fn: () => void) => {
    handlers.set(el, fn);
    io.observe(el);
  };

  document.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((el) =>
    onEnter(el, () => {
      let done = false;
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        aria: 'none', // lines keep whole words, so the text reads normally
        autoSplit: true,
        onSplit(self) {
          gsap.set(el, { visibility: 'visible' });
          if (done) return;
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.15,
            ease: 'expo.out',
            stagger: 0.085,
            onComplete: () => (done = true),
          });
        },
      });
    }),
  );

  document.querySelectorAll<HTMLElement>('[data-rule]').forEach((el) =>
    onEnter(el, () => gsap.to(el, { '--rule': 1, duration: 1.4, ease: 'expo.inOut' })),
  );

  document.querySelectorAll<HTMLElement>('[data-reveal="clip"]').forEach((el) =>
    onEnter(el, () => gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out' })),
  );

  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => onEnter(el, () => scramble(el)));
}

export function scramble(el: HTMLElement, duration = 0.9) {
  if (reducedMotion) return;
  const text = el.dataset.text || el.textContent || '';
  el.dataset.text = text;
  gsap.to(el, {
    duration,
    scrambleText: { text, chars: '01∿<>/[]—+=', speed: 0.6, revealDelay: 0.15 },
  });
}

/** Hide on scroll down, show on scroll up; highlight the current section. */
export function initNav() {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (!nav) return;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 40);
      if (y < 160 || nav.contains(document.activeElement)) nav.classList.remove('is-hidden');
      else nav.classList.toggle('is-hidden', self.direction === 1);
    },
  });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  nav.querySelectorAll<HTMLAnchorElement>('[data-nav-link]').forEach((link) => {
    const id = new URL(link.href).hash;
    const section = id && document.querySelector(id);
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => {
        link.classList.toggle('is-active', self.isActive);
        self.isActive ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current');
      },
    });
  });
}

export { gsap, ScrollTrigger, SplitText };
