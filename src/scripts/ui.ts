/* Small UI services: toast, clipboard, IST clock, UI sound. */

let toastTimer = 0;
export function toast(message: string) {
  const el = document.querySelector<HTMLElement>('[data-toast]');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-on'), 1900);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('copied ✓');
  sound.play('copy');
}

export function initCopy() {
  document.querySelectorAll<HTMLElement>('[data-copy]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      copyText(el.dataset.copy!);
    });
  });
}

const istFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
export function initClock() {
  const els = document.querySelectorAll<HTMLElement>('[data-clock]');
  if (!els.length) return;
  const tick = () => {
    const t = istFmt.format(new Date());
    els.forEach((el) => (el.textContent = t));
  };
  tick();
  setInterval(tick, 1000);
}

/* ── Sound ────────────────────────────────────────────────────
   Off by default. A small designed set — soft ticks, plucks, chimes, a
   whoosh for the theme — plus an ambient layer that sonifies the hero:
   hiss while the trace is noisy, settling into a soft chord as it cleans. */
const KEY = 'rk-sound';
let audio: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let lastHover = 0;
let noiseBuf: AudioBuffer | null = null;

type Cue = 'hover' | 'click' | 'on' | 'off' | 'copy' | 'light' | 'dark' | 'mode';
const PENTA = [392, 440, 523.25, 587.33, 659.25]; // G A C D E

function store(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {}
}

function ctx() {
  if (!audio) {
    audio = new AudioContext();
    master = audio.createGain();
    master.gain.value = 0.9;
    const comp = audio.createDynamicsCompressor();
    master.connect(comp).connect(audio.destination);
    noiseBuf = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return audio;
}

function tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType = 'sine', glideTo?: number) {
  const a = ctx();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function noise(at: number, dur: number, gain: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1) {
  const a = ctx();
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, at);
  f.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(at, Math.random());
  src.stop(at + dur + 0.05);
}

function play(cue: Cue, arg = 0) {
  if (!enabled || !audio) return;
  const t = audio.currentTime + 0.005;
  switch (cue) {
    case 'hover':
      if (t - lastHover < 0.05) return;
      lastHover = t;
      noise(t, 0.025, 0.05, 'highpass', 4200);
      break;
    case 'click':
      tone(880, t, 0.09, 0.06, 'triangle', 620);
      noise(t, 0.02, 0.05, 'bandpass', 2500, 2500, 2);
      break;
    case 'on':
      [523.25, 659.25, 783.99].forEach((f, i) => tone(f, t + i * 0.07, 0.35, 0.05));
      break;
    case 'off':
      [659.25, 523.25].forEach((f, i) => tone(f, t + i * 0.07, 0.25, 0.04));
      break;
    case 'copy':
      tone(1046.5, t, 0.22, 0.05);
      tone(1567.98, t + 0.08, 0.35, 0.045);
      break;
    case 'light':
      noise(t, 0.4, 0.07, 'bandpass', 500, 3200, 1.5);
      tone(783.99, t + 0.18, 0.4, 0.03);
      break;
    case 'dark':
      noise(t, 0.4, 0.07, 'bandpass', 3200, 450, 1.5);
      tone(392, t + 0.18, 0.4, 0.03);
      break;
    case 'mode':
      tone(PENTA[arg % PENTA.length], t, 0.9, 0.025);
      tone(PENTA[arg % PENTA.length] * 1.5, t + 0.04, 0.9, 0.012);
      break;
  }
}

/* Ambient: noise bed + soft chord, mixed by how noisy the hero trace is. */
let amb: { noiseG: GainNode; toneG: GainNode; filt: BiquadFilterNode; bus: GainNode } | null = null;
let ambTimer = 0;
function ambientNodes() {
  if (amb || !audio) return amb;
  const a = audio;
  const bus = a.createGain();
  bus.gain.value = 0;
  bus.connect(master!);
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const filt = a.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 1200;
  const noiseG = a.createGain();
  src.connect(filt).connect(noiseG).connect(bus);
  src.start();
  const toneG = a.createGain();
  toneG.gain.value = 0;
  toneG.connect(bus);
  [196, 293.66, 392].forEach((f, i) => {
    const o = a.createOscillator();
    o.frequency.value = f;
    const lfo = a.createOscillator();
    const depth = a.createGain();
    lfo.frequency.value = 0.15 + i * 0.07;
    depth.gain.value = 1.5;
    lfo.connect(depth).connect(o.detune);
    const g = a.createGain();
    g.gain.value = i === 2 ? 0.3 : 0.5;
    o.connect(g).connect(toneG);
    o.start();
    lfo.start();
  });
  amb = { noiseG, toneG, filt, bus };
  return amb;
}

const sfx = {
  get on() {
    return enabled;
  },
  set(v: boolean) {
    enabled = v;
    store(v);
    if (v) ctx().resume();
    if (!v && amb) amb.bus.gain.setTargetAtTime(0, audio!.currentTime, 0.1);
    document.querySelectorAll('[data-sound-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(v));
      const l = b.querySelector('[data-sound-label]');
      if (l) l.textContent = v ? 'SND ON' : 'SND OFF';
    });
  },
  toggle() {
    this.set(!enabled);
    if (enabled) play('on');
    else if (audio) {
      enabled = true;
      play('off');
      enabled = false;
    }
    toast(enabled ? 'sound on' : 'sound off');
  },
  play,
  /** Called while the hero trace animates: `noisy` 0 (clean) .. 1 (noisy). */
  ambient(noisy: number) {
    if (!enabled || !audio) return;
    const n = ambientNodes()!;
    const now = audio.currentTime;
    n.bus.gain.setTargetAtTime(0.5, now, 0.4);
    n.noiseG.gain.setTargetAtTime(0.03 * noisy, now, 0.25);
    n.filt.frequency.setTargetAtTime(500 + 2600 * noisy, now, 0.25);
    n.toneG.gain.setTargetAtTime(0.022 * (1 - noisy), now, 0.4);
    // Fade out once the hero stops reporting (scrolled away / tab hidden).
    clearTimeout(ambTimer);
    ambTimer = window.setTimeout(() => n.bus.gain.setTargetAtTime(0, audio!.currentTime, 0.5), 400);
  },
  /** Back-compat for simple blips. */
  blip() {
    play('click');
  },
};
export const sound = sfx;

export function initSound() {
  document.querySelectorAll('[data-sound-toggle]').forEach((b) => b.addEventListener('click', () => sound.toggle()));
  // Browsers block audio until a gesture; restore the preference on the first one.
  let saved = false;
  try {
    saved = localStorage.getItem(KEY) === '1';
  } catch {}
  if (saved) {
    document.querySelectorAll('[data-sound-toggle]').forEach((b) => b.setAttribute('aria-pressed', 'true'));
    const arm = () => {
      sound.set(true);
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
    };
    window.addEventListener('pointerdown', arm, { once: true });
    window.addEventListener('keydown', arm, { once: true });
  }
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as Element).closest?.('a, button, [data-cursor]');
    if (t && !t.contains(e.relatedTarget as Node)) play('hover');
  });
  document.addEventListener('click', (e) => {
    const el = (e.target as Element).closest?.('a, button');
    if (el && !el.matches('[data-sound-toggle], [data-copy], [data-theme-toggle]')) play('click');
  });
  document.documentElement.addEventListener('themechange', (e) => {
    const d = (e as CustomEvent).detail;
    if (d === 'light' || d === 'dark') play(d);
  });
}
