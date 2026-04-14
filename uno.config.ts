import { defineConfig, presetAttributify, presetIcons, presetTypography } from 'unocss';
import presetWind4 from '@unocss/preset-wind4';

export default defineConfig({
	presets: [
		presetWind4({
			preflights: {
				reset: true
			}
		}),
		presetAttributify(),
		presetIcons({
			scale: 1.2,
			extraProperties: {
				display: 'inline-block',
				'vertical-align': 'middle',
				width: '1em',
				height: '1em',
				'min-width': '1em',
				'line-height': '1'
			},
			collections: {
				lucide: () =>
					import('@iconify-json/lucide/icons.json').then(
						i => i.default
					),
				catppuccin: () =>
					import('@iconify-json/catppuccin/icons.json').then(
						i => i.default
					)
			}
		}),
		presetTypography({
			colorScheme: {
				body: [
					'var(--color-text-secondary)',
					'var(--color-text-secondary)'
				],
				headings: [
					'var(--color-text-primary)',
					'var(--color-text-primary)'
				],
				lead: ['var(--color-text-tertiary)', 'var(--color-text-tertiary)'],
				links: ['var(--color-primary)', 'var(--color-primary)'],
				bold: ['var(--color-text-primary)', 'var(--color-text-primary)'],
				counters: [
					'var(--color-text-tertiary)',
					'var(--color-text-tertiary)'
				],
				bullets: [
					'var(--color-text-tertiary)',
					'var(--color-text-tertiary)'
				],
				hr: ['var(--color-border)', 'var(--color-border)'],
				quotes: ['var(--color-text-primary)', 'var(--color-text-primary)'],
				'quote-borders': [
					'var(--color-border-strong)',
					'var(--color-border-strong)'
				],
				captions: [
					'var(--color-text-tertiary)',
					'var(--color-text-tertiary)'
				],
				code: ['var(--color-primary)', 'var(--color-primary)'],
				'pre-code': [
					'var(--color-text-on-dark)',
					'var(--color-text-on-light)'
				],
				'pre-bg': ['var(--neutral-800)', 'var(--neutral-200)'],
				'th-borders': ['var(--color-border)', 'var(--color-border)'],
				'td-borders': [
					'var(--color-border-subtle)',
					'var(--color-border-subtle)'
				]
			},
			cssExtend: {
				a: {
					color: 'var(--color-primary)',
					'text-decoration': 'none',
					transition: 'color 0.2s ease-in-out',
					'font-weight': '500'
				},
				'a:hover': {
					color: 'var(--color-primary-hover)',
					'text-decoration': 'underline'
				},
				code: {
					'background-color': 'var(--color-background-subtle)',
					padding: '0.2em 0.4em',
					'border-radius': '0.25rem',
					'font-size': '0.875em',
					'font-family':
						'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
				},
				pre: {
					'background-color': 'var(--color-surface-elevated)',
					border: '1px solid var(--color-border-subtle)',
					'border-radius': '0.5rem',
					padding: '1rem',
					'overflow-x': 'auto'
				},
				blockquote: {
					'border-left': '4px solid var(--color-primary)',
					'padding-left': '1rem',
					'font-style': 'italic',
					color: 'var(--color-text-tertiary)'
				},
				img: {
					'max-width': '100%',
					height: 'auto',
					'border-radius': '0.5rem'
				}
			}
		})
	],

	theme: {
		fontFamily: {
			sans: ['Atkinson', 'ui-sans-serif', 'system-ui'],
			mono: [
				'ui-monospace',
				'SFMono-Regular',
				'Menlo',
				'Monaco',
				'Consolas',
				'monospace'
			]
		},
		colors: {
			primary: '#2337ff',
			secondary: '#000d8a',
			background: 'rgb(15, 18, 25)',
			text: 'rgb(96, 115, 159)'
		}
	},

	shortcuts: {
		container: 'max-w-3xl mx-auto px-4 sm:px-6',
		content: 'prose !max-w-none w-full',
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
