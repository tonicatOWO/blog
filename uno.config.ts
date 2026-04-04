import { defineConfig, presetWind, presetAttributify, presetIcons, presetTypography } from 'unocss';

export default defineConfig({
	presets: [
		presetWind(),
		presetAttributify(),
		presetIcons({
			scale: 1.2,
			collections: {
				lucide: () =>
					import('@iconify-json/lucide/icons.json').then(
						i => i.default
					)
			}
		}),
		presetTypography()
	],

	theme: {
		fontFamily: {
			sans: ['Atkinson', 'ui-sans-serif', 'system-ui']
		},
		colors: {
			accent: '#2337ff',
			'accent-dark': '#000d8a',
			black: 'rgb(15, 18, 25)',
			gray: 'rgb(96, 115, 159)',
			'gray-light': 'rgb(229, 233, 240)',
			'gray-dark': 'rgb(34, 41, 57)'
		}
	},

	shortcuts: {
		'layout-container': 'max-w-3xl mx-auto px-4 sm:px-6',
		'prose-content': 'prose prose-slate max-w-none',
		'post-title': 'text-3xl sm:text-4xl font-bold tracking-tight',
		'post-meta': 'text-sm text-gray-500 flex items-center gap-2',
		'nav-link': 'font-medium text-gray-700 transition-colors hover:text-blue-600'
	},

	content: {
		pipeline: {
			include: [/\.(astro|svelte|md|mdx)($|\?)/]
		}
	}
});
