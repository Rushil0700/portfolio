import { copyText, sound } from './ui';
import { toggleTheme } from './theme';

interface Item {
  group: string;
  label: string;
  hint?: string;
  action: string; // 'goto:#id' | 'href:/path' | 'ext:url' | 'copy:text' | 'sound' | 'theme'
}

/** ⌘K / Ctrl+K command palette built on <dialog>. */
export function initPalette(scrollToHash: (hash: string) => void) {
  const dialog = document.querySelector<HTMLDialogElement>('[data-palette]');
  const dataEl = document.getElementById('palette-data');
  if (!dialog || !dataEl) return;
  const items: Item[] = JSON.parse(dataEl.textContent || '[]');
  const input = dialog.querySelector<HTMLInputElement>('input')!;
  const list = dialog.querySelector<HTMLElement>('[role="listbox"]')!;
  let filtered: Item[] = items;
  let active = 0;

  const render = () => {
    const q = input.value.trim().toLowerCase();
    filtered = q
      ? items.filter((i) => (i.label + ' ' + i.group + ' ' + (i.hint || '')).toLowerCase().includes(q))
      : items;
    active = Math.min(active, Math.max(0, filtered.length - 1));
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<li class="palette__empty mono">No signal. Try “work”, “email” or “github”.</li>';
      input.removeAttribute('aria-activedescendant');
      return;
    }
    let group = '';
    filtered.forEach((item, i) => {
      if (item.group !== group) {
        group = item.group;
        const g = document.createElement('li');
        g.className = 'palette__group mono';
        g.setAttribute('role', 'presentation');
        g.textContent = group;
        list.appendChild(g);
      }
      const li = document.createElement('li');
      li.className = 'palette__item';
      li.id = `pal-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      li.innerHTML = `<span></span><span class="mono"></span>`;
      li.children[0].textContent = item.label;
      li.children[1].textContent = item.hint || '';
      li.addEventListener('pointermove', () => {
        if (active !== i) {
          active = i;
          highlight();
        }
      });
      li.addEventListener('click', () => run(item));
      list.appendChild(li);
    });
    input.setAttribute('aria-activedescendant', `pal-${active}`);
  };

  const highlight = () => {
    list.querySelectorAll('[role="option"]').forEach((el) => el.setAttribute('aria-selected', String(el.id === `pal-${active}`)));
    input.setAttribute('aria-activedescendant', `pal-${active}`);
    list.querySelector(`#pal-${active}`)?.scrollIntoView({ block: 'nearest' });
  };

  const open = () => {
    if (dialog.open) return;
    input.value = '';
    active = 0;
    render();
    dialog.showModal();
    document.documentElement.dispatchEvent(new CustomEvent('palette', { detail: true }));
    input.focus();
  };
  const close = () => dialog.open && dialog.close();
  dialog.addEventListener('close', () => document.documentElement.dispatchEvent(new CustomEvent('palette', { detail: false })));
  dialog.addEventListener('click', (e) => e.target === dialog && close());

  const run = (item: Item) => {
    close();
    const [kind, ...rest] = item.action.split(':');
    const arg = rest.join(':');
    switch (kind) {
      case 'goto':
        if (document.querySelector(arg)) scrollToHash(arg);
        else location.href = '/' + arg;
        break;
      case 'href':
        location.href = arg;
        break;
      case 'ext':
        window.open(arg, '_blank', 'noopener');
        break;
      case 'copy':
        copyText(arg);
        break;
      case 'sound':
        sound.toggle();
        break;
      case 'theme':
        toggleTheme();
        break;
    }
  };

  input.addEventListener('input', () => {
    active = 0;
    render();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!filtered.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length;
      highlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[active]) run(filtered[active]);
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      dialog.open ? close() : open();
    }
  });
  document.querySelectorAll('[data-palette-open]').forEach((b) => b.addEventListener('click', open));
}
