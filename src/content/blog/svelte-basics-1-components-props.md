---
title: 'Svelte 基礎講義（一）：元件與 props'
description:
        '撰寫第一篇 Svelte 教學講義（元件概念與 props），並在 Astro
        中建立對應教學文章頁。'
pubDate: '2026-03-31'
heroImage: '../../assets/VITE_X_SVELTE_5.png'
---

## 1. 什麼是元件（Component）

在 Svelte 裡，一個檔案（例如 `Counter.svelte` 或
`Button.svelte`）就是一個元件，它封裝了 HTML、CSS、JS/TS，並透過 `props`
從外部接收資料。你可以把元件想像成「自定義 HTML 標籤」，然後用屬性（props）去設定它。

典型元件結構：

```svelte
<!-- Counter.svelte -->
<script lang="ts">
	name = 'Counter';
	count = 0;
</script>

<button on:click={() => (count += 1)}>
	{count}
</button>
```

你會在別的元件裡面這樣用：

```svelte
<script lang="ts">
	import Counter from './Counter.svelte';
</script>

<Counter />
```

---

## 2. Svelte 5 的 `props` 核心概念

在 Svelte 5，宣告 props 改用 **`$props()` rune**，取代 Svelte 3/4 的
`export let`。 `props` 的流向是
**單向：父 → 子**，跟 React、Vue 一樣，避免資料流錯亂。

兩種寫法（TypeScript + runes）：

### 2‑1 簡單解構式 props（推薦）

```svelte
<!-- Button.svelte -->
<script lang="ts">
	let {
		text = 'Click me',
		color = 'blue',
	}: {
		text?: string;
		color?: 'blue' | 'green' | 'red';
	} = $props();
</script>

<button
	class="px-4 py-2 rounded font-medium"
	class:bg-blue-500={color === 'blue'}
	class:bg-green-500={color === 'green'}
	class:bg-red-500={color === 'red'}
>
	{text}
</button>
```

在父元件裡使用：

```svelte
<script lang="ts">
	import Button from './Button.svelte';
</script>

<Button text="提交" color="green" />
<Button text="刪除" color="red" />
<Button />
```

- `text = "Click me"` 是預設值，父層沒傳就用預設。
- TypeScript 會檢查：`color` 只能是
  `"blue" | "green" | "red"`，傳錯字會在編譯期報錯。

### 2‑2 當作一個完整 `Props` 物件

```svelte
<!-- Card.svelte -->
<script lang="ts">
	interface Props {
		title: string;
		description?: string;
		imageSrc?: string;
	}

	const { title, description = '', imageSrc } = $props<Props>();
</script>

<article class="border rounded-lg p-4 max-w-md">
	{#if imageSrc}
		<img
			src={imageSrc}
			alt={title}
			class="w-full h-40 object-cover rounded"
		/>
	{/if}
	<h3 class="font-bold mt-2">{title}</h3>
	<p>{description}</p>
</article>
```

用法：

```svelte
<script lang="ts">
	import Card from './Card.svelte';
</script>

<Card
	title="專案一"
	description="一個簡單的部落格系統"
	imageSrc="/assets/blog.png"
/>
```

---

## 3. 關鍵設計觀念與實務建議

### 3‑1 props 的設計原則

- **少而精**：只暴露真正需要的 API，避免把所有內部狀態都變成 props。
- **明確型別**：用 TypeScript 給 props 加型別，團隊協作或半年後回頭看都容易維護。
- **預設值**：可選 props 設預設，讓父元件呼叫更簡潔。

### 3‑2 跟 `export let` 的差異（為什麼用 runes）

- Svelte 3/4 寫法：`export let text = "default"`；這種寫法在 Svelte
  5 仍然可用，但會被標記為「legacy」，官方推薦改用 `$props()`。
- `$props()` 的好處：
     - 語法更接近「函式接收參數」，跟 `props` 的概念一致。
     - 更容易搭配 TypeScript 的 interface/generic，型別提示更準。

### 3‑3 什麼時候不要用 props？

- 如果某個變數只在元件內部用，用 `$state` 或單純變數就好，不用變成 `props`：
     ```svelte
     <script lang="ts">
     	let { label }: { label: string } = $props();
     	count = $state(0); // 內部 state，不暴露給外部
     </script>
     ```

---

## 4. 實戰小練習（給你寫）

嘗試先寫一個「專案卡片」元件，再在首頁用 `props` 重複渲染：

```svelte
<!-- ProjectCard.svelte -->
<script lang="ts">
	interface Props {
		name: string;
		tags: string[];
		description: string;
	}

	const { name, description, tags } = $props<Props>();
</script>

<div class="border rounded-lg p-4 mb-3">
	<h3 class="font-bold">{name}</h3>
	<p class="text-gray-600">{description}</p>
	<div class="mt-2 space-x-2">
		{#each tags as tag}
			<span class="border rounded px-2 text-xs">{tag}</span>
		{/each}
	</div>
</div>
```

然後在 `src/routes/+page.svelte` 裡：

```svelte
<script lang="ts">
	import ProjectCard from '$lib/ProjectCard.svelte';
</script>

<h2 class="mb-4">我的專案</h2>

<ProjectCard
	name="部落格系統"
	description="Svelte 5 + Astro 個人部落格"
	tags={['Svelte', 'TypeScript', 'Astro', 'UnoCSS']}
/>

<ProjectCard
	name="待辦清單"
	description="簡易的 todo list，用本地 storage"
	tags={['Svelte', 'Bun', 'SQLite']}
/>
```

---
