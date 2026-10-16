/**
 * Light ("paper": warm white, navy, indigo + coral) / dark ("ink": navy,
 * lime + coral) themes. CSS reads [data-theme] on <html>;
 * canvases read the live palette `C`, which is refreshed on every switch.
 * The initial theme is set by an inline script in Layout.astro (no flash).
 */

type Theme = 'light' | 'dark';
const KEY = 'rk-theme';

const PALETTES = {
  dark: {
    bg: '#0f1420', raise: '#161c2b', panel: '#1a2132', panel2: '#20283a',
    dim: '#2a3346', dim2: '#39435a', mid: '#4e5870', light: '#b9bfcc',
    text: '#eceae4', muted: '#8d95a8',
    accent: '#c6ff3d', accent2: '#ff8a5c', onAccent: '#0f1420',
  },
  light: {
    bg: '#f7f5f0', raise: '#ffffff', panel: '#fbfaf7', panel2: '#f1eee8',
    dim: '#e5e1d8', dim2: '#d2ccc0', mid: '#a8a6b5', light: '#3f4566',
    text: '#141834', muted: '#5b607a',
    accent: '#4338ca', accent2: '#c93d1c', onAccent: '#ffffff',
  },
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');

/** Live canvas palette. `ink(a)` / `acc(a)` / `acc2(a)` give alpha variants. */
export const C = {
  ...PALETTES.dark,
  ink: (a: number) => `rgba(${rgb(C.text)},${a.toFixed(3)})`,
  acc: (a: number) => `rgba(${rgb(C.accent)},${a.toFixed(3)})`,
  acc2: (a: number) => `rgba(${rgb(C.accent2)},${a.toFixed(3)})`,
};

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function apply(theme: Theme) {
  Object.assign(C, PALETTES[theme]);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PALETTES[theme].bg);
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    b.setAttribute('aria-pressed', String(theme === 'dark'));
    const l = b.querySelector('[data-theme-label]');
    if (l) l.textContent = theme === 'dark' ? 'Dark' : 'Light';
  });
}

export function setTheme(theme: Theme) {
  apply(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
  document.documentElement.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

export function toggleTheme() {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

/** Call `cb` whenever the theme changes. */
export function onThemeChange(cb: () => void) {
  document.documentElement.addEventListener('themechange', cb);
}

export function initTheme() {
  apply(currentTheme());
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.addEventListener('click', toggleTheme));
  // Follow the OS setting until the visitor picks one themselves.
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    if (!saved) {
      apply(e.matches ? 'light' : 'dark');
      document.documentElement.dispatchEvent(new CustomEvent('themechange'));
    }
  });
}
