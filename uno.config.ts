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
			// Theme colors placeholder
			primary: '#2337ff',
			secondary: '#000d8a',
			background: 'rgb(15, 18, 25)',
			text: 'rgb(96, 115, 159)'
		}
	},

	shortcuts: {
		container: 'max-w-3xl mx-auto px-4 sm:px-6',
		content: 'prose prose-slate max-w-none',
		title: 'text-3xl sm:text-4xl font-bold tracking-tight',
		meta: 'text-sm text-gray-500 flex items-center gap-2',
		link: 'font-medium text-gray-700 transition-colors hover:text-blue-600'
	},

	content: {
		pipeline: {
			include: [/\.(astro|svelte|md|mdx)($|\?)/]
		}
	}
});
