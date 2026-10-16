import { gsap } from 'gsap';

/** Dot + lagging ring; ring grows and shows a mono label over [data-cursor]. */
export function initCursor() {
  const root = document.querySelector<HTMLElement>('[data-cursor-root]');
  if (!root) return;
  document.documentElement.classList.add('has-cursor');
  const dot = root.querySelector<HTMLElement>('.cursor__dot')!;
  const ring = root.querySelector<HTMLElement>('.cursor__ring')!;
  const labelEl = root.querySelector<HTMLElement>('.cursor__label')!;

  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.4, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.4, ease: 'power3' });

  root.classList.add('is-hidden');
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      root.classList.remove('is-hidden');
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => root.classList.add('is-hidden'));
  window.addEventListener('pointerdown', () => root.classList.add('is-down'));
  window.addEventListener('pointerup', () => root.classList.remove('is-down'));

  const update = (target: Element | null) => {
    const labelled = target?.closest<HTMLElement>('[data-cursor]');
    const link = target?.closest('a, button, [role="option"]');
    root.classList.toggle('is-label', !!labelled);
    root.classList.toggle('is-link', !labelled && !!link);
    if (labelled) labelEl.textContent = labelled.dataset.cursor || '';
  };
  document.addEventListener('pointerover', (e) => update(e.target as Element));
  // After a copy, flash a confirmation label.
  document.addEventListener('click', (e) => {
    const c = (e.target as Element).closest<HTMLElement>('[data-copy]');
    if (!c) return;
    labelEl.textContent = 'COPIED';
    setTimeout(() => update(document.elementFromPoint(gsap.getProperty(ring, 'x') as number, gsap.getProperty(ring, 'y') as number)), 1200);
  });
}

/** Elements with [data-magnetic] lean toward the pointer. */
export function initMagnetic() {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic || '') || 0.3;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}
