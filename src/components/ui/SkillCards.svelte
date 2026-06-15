<script lang="ts">
	const skillGroups = [
		{
			colorClass: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/30',
			items: [
				'Astro',
				'Svelte',
				'TypeScript',
				'JavaScript',
				'Vue 3',
				'HTML',
				'CSS',
				'SCSS',
				'UnoCSS',
				'Vite',
                                'react',
			],
			name: 'Frontend'
		},
		{
			colorClass: 'bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/30',
			items: [
				'Go',
				'Python',
				'TypeScript',
				'REST API',
				'Discord bots',
				'Shell scripting'
			],
			name: 'Backend'
		},
		{
			colorClass: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/30',
			items: [
				'Docker',
				'Bun',
				'Nix',
				'Lua',
				'Neovim',
				'Yazi',
				'Forgejo',
				'GitHub'
			],
			name: 'Tooling / Infra'
		},
		{
			colorClass: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/30',
			items: ['C++', 'GDScript', 'Rust', 'C'],
			name: 'Other'
		}
	];
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto px-4">
	{#each skillGroups as group}
		<div
			class="flex flex-col items-start gap-3 p-5 rounded-xl ds-border ds-bg-surface-elevated shadow-sm"
		>
			<span
				class="text-xs uppercase tracking-widest ds-text-tertiary font-semibold"
			>
				{group.name}
			</span>
			<ul class="flex flex-wrap gap-2">
				{#each group.items as skill}
					<li
						class="px-3 py-1 rounded-md text-sm border {group.colorClass}"
					>
						{skill}
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</div>
