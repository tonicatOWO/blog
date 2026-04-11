import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import UnoCSS from '@unocss/astro';
import pagefind from 'astro-pagefind';

import svelte from '@astrojs/svelte';

export default defineConfig({
	site: 'https://example.com',
	output: 'static',
	integrations: [mdx(), sitemap(), svelte(), UnoCSS({ injectReset: true }), pagefind()],
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
	}
});
