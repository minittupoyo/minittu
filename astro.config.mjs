// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import icon from 'astro-icon';
import { createSatteriLinkCardPlus } from './src/lib/satteri-link-card-plus.js';
import { satteriRemarkBreaks } from './src/lib/satteri-remark-breaks.js';

const isBuild = process.env.NODE_ENV === "production" || process.env.ASTRO_COMMAND === "build";

// https://astro.build/config
export default defineConfig({
  site: "https://blog.minittu.net",
  markdown: {
    processor: satteri({
        mdastPlugins: [satteriRemarkBreaks, createSatteriLinkCardPlus({ cache: true})],
    }),
  },

  integrations: [
    react(),
    icon(),
    ...(isBuild ? [] : [keystatic()]),
  ],

  vite: {
    plugins: [tailwindcss()]
  },
});
