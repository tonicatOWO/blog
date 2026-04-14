import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import UnoCSS from '@unocss/astro';
import presetIcons from '@unocss/preset-icons';
import pagefind from 'astro-pagefind';
import lucideIcons from '@iconify-json/lucide/icons.json';
import catppuccinIcons from '@iconify-json/catppuccin/icons.json';

import svelte from '@astrojs/svelte';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://blog.tonicatowo.xyz',
  output: 'static',
  trailingSlash: 'ignore',

  integrations: [
      mdx(),
      sitemap(),
      svelte(),
      UnoCSS({
          injectReset: true,
          presets: [
              presetIcons({
                  scale: 1.2,
                  warn: true,
                  collections: {
                      lucide: lucideIcons,
                      catppuccin: catppuccinIcons
                  }
              })
          ]
      }),
      pagefind()
	],

  vite: {
      resolve: {
          alias: {
              '@components': '/src/components',
              '@layout': '/src/components/layout',
              '@ui': '/src/components/ui',
              '@utils': '/src/components/utils',
              '@layouts': '/src/layouts',
              '@pages': '/src/pages',
              '@consts': '/src/consts',
              '@assets': '/src/assets',
              '@styles': '/src/styles'
          }
      }
	},

  adapter: cloudflare()
});