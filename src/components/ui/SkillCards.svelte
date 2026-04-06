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
			colorClass: 'ds-bg-primary-subtle ds-text-brand border-rose-300/30',
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
			colorClass: 'ds-bg-info/20 ds-text-info border-blue-400/30',
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
			colorClass: 'ds-bg-success/20 ds-text-success border-emerald-400/30',
		},
		{
			name: 'Other',
			items: ['C++', 'GDScript', 'Rust', 'C'],
			colorClass: 'ds-bg-warning/20 ds-text-warning border-amber-400/30',
		},
	];
</script>

<div class="flex flex-col items-center justify-center gap-8">
	{#each skillGroups as group}
		<div class="flex flex-col items-center gap-3">
			<span
				class="text-xs uppercase tracking-widest ds-text-tertiary font-semibold"
				>{group.name}</span
			>
			<ul class="flex flex-wrap justify-center px-4 gap-3">
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
