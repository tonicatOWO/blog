<script lang="ts">
	const skillGroups = [
		{
			name: 'Frontend',
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
			],
			colorClass: 'ds-bg-primary-subtle ds-text-brand ds-border border-opacity-30',
		},
		{
			name: 'Backend',
			items: [
				'Go',
				'Python',
				'TypeScript',
				'REST API',
				'Discord bots',
				'Shell scripting',
			],
			colorClass: 'bg-blue-100/50 dark:bg-blue-900/30 ds-text-info border-blue-400/30',
		},
		{
			name: 'Tooling / Infra',
			items: [
				'Docker',
				'Bun',
				'Nix',
				'Lua',
				'Neovim',
				'Yazi',
				'Forgejo',
				'GitHub',
			],
			colorClass: 'bg-emerald-100/50 dark:bg-emerald-900/30 ds-text-success border-emerald-400/30',
		},
		{
			name: 'Other',
			items: ['C++', 'GDScript', 'Rust', 'C'],
			colorClass: 'bg-amber-100/50 dark:bg-amber-900/30 ds-text-warning border-amber-400/30',
		},
	];
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto px-4">
	{#each skillGroups as group}
		<div class="flex flex-col items-start gap-3 p-5 rounded-xl ds-border ds-bg-surface-elevated shadow-sm">
			<span class="text-xs uppercase tracking-widest ds-text-tertiary font-semibold">
				{group.name}
			</span>
			<ul class="flex flex-wrap gap-2">
				{#each group.items as skill}
					<li class="px-3 py-1 rounded-md text-sm border {group.colorClass}">
						{skill}
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</div>
