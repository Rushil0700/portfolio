// @ts-check
import { defineConfig } from 'astro/config';

// Fully static build. Canonical + OG URLs resolve against `site`.
export default defineConfig({
  site: 'https://rushiltech.in',
  build: { inlineStylesheets: 'always' },
});
