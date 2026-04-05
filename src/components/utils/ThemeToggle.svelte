<script lang="ts">
	import { onMount } from 'svelte';

	let themeDark = $state(false);

	onMount(() => {
		themeDark =
			localStorage.getItem('themeDark') === 'true' ||
			(localStorage.getItem('themeDark') === null &&
				window.matchMedia('(prefers-color-scheme: dark)').matches);

		document.documentElement.dataset.theme = themeDark ? 'dark' : 'light';
	});

	function toggleTheme() {
		themeDark = !themeDark;
		localStorage.setItem('themeDark', String(themeDark));
		document.documentElement.dataset.theme = themeDark ? 'dark' : 'light';
	}
</script>

<button onclick={toggleTheme} aria-label="toggle theme">
	<i class={`text-xl ${themeDark ? 'i-lucide-moon' : 'i-lucide-sun'}`}>hello</i></button
>

<style>
	button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}
</style>
