import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import UnoCSS from '@unocss/astro';

import svelte from '@astrojs/svelte';

export default defineConfig({
	site: 'https://example.com',
	output: 'static',
	integrations: [mdx(), sitemap(), svelte(), UnoCSS({ injectReset: true })]
});
