---
title: 'Svelte 講義（四）：元件拆分與資料流'
description:
        '元件拆分的時機與原則、props 單向資料流、callback props、Context
        API，以及實際專案常見結構。'
pubDate: '2026-04-07'
heroImage: '../../assets/VITE_X_SVELTE_5.png'
---

## 1. 為什麼要拆分元件？

當一個 `.svelte` 檔案愈來愈長，就是該拆分的訊號。拆分的目的有三個：

- **可讀性**：每個元件只做一件事，邏輯清晰
- **可重用性**：相同的 UI 不重複寫
- **可維護性**：改一個地方，所有使用到該元件的地方同步更新

### 何時該拆？

以下情況建議獨立為一個元件：

1. 同樣的 UI 結構出現超過一次
2. 一段 UI 有自己的內部狀態（如展開/收合）
3. 一個區塊的邏輯過於複雜，影響整體可讀性

---

## 2. 資料流的基本原則：Props 向下，事件向上

Svelte（以及大多數現代前端框架）的資料流是**單向**的：

```
父元件 ──── props ────▶ 子元件
父元件 ◀── callback ─── 子元件
```

- **父 → 子**：透過 `props` 傳遞資料
- **子 → 父**：透過 **callback props**（函數型態的 prop）回傳事件或資料

這個規則讓資料流向可預測，避免「不知道是誰改了什麼」的混亂。

---

## 3. 拆分實戰：TODO List 重構

承接講義三的 TODO List，我們將它拆成多個小元件。

### 專案結構

```
src/
└── lib/
    ├── TodoApp.svelte       ← 主容器，管理所有狀態
    ├── TodoInput.svelte     ← 輸入與新增
    ├── TodoFilter.svelte    ← 篩選按鈕
    ├── TodoItem.svelte      ← 單一 todo 項目
    └── TodoStats.svelte     ← 統計資訊
```

### 命名慣例

- 元件檔名用 **PascalCase**（`TodoItem.svelte`）
- 同一功能的元件放同一資料夾（如 `src/lib/todo/`）
- 共用元件放 `src/lib/components/`，頁面專用元件放在頁面旁

---

## 4. 各元件實作

### 4-1 `TodoInput.svelte` — 輸入列

子元件不自己管 `todos`，只負責接收輸入、通知父元件：

```svelte
<!-- TodoInput.svelte -->
<script lang="ts">
	let {
		onAdd
	}: {
		onAdd: (text: string) => void;
	} = $props();

	let inputText = $state('');

	function submit() {
		const text = inputText.trim();
		if (!text) return;
		onAdd(text); // 透過 callback 通知父元件
		inputText = ''; // 清空是子元件自己的責任
	}
</script>

<div class="flex gap-2 mb-4">
	<input
		class="border rounded px-3 py-1 flex-1"
		type="text"
		placeholder="新增待辦事項..."
		bind:value={inputText}
		onkeydown={e => e.key === 'Enter' && submit()}
	/>
	<button
		class="bg-orange-500 text-white px-4 py-1 rounded"
		onclick={submit}
	>
		新增
	</button>
</div>
```

重點：

- `inputText` 是子元件**自己的 state**，不需要傳給父元件
- `onAdd` 是 callback prop，父元件決定收到文字後要做什麼

---

### 4-2 `TodoFilter.svelte` — 篩選按鈕

```svelte
<!-- TodoFilter.svelte -->
<script lang="ts">
	type Filter = 'all' | 'active' | 'done';

	let {
		current,
		onChange
	}: {
		current: Filter;
		onChange: (filter: Filter) => void;
	} = $props();

	const options: { value: Filter; label: string }[] = [
		{ value: 'all', label: '全部' },
		{ value: 'active', label: '未完成' },
		{ value: 'done', label: '已完成' }
	];
</script>

<div class="flex gap-2 mb-3">
	{#each options as opt}
		<button
			class="px-3 py-1 rounded border"
			class:bg-orange-500={current === opt.value}
			class:text-white={current === opt.value}
			onclick={() => onChange(opt.value)}
		>
			{opt.label}
		</button>
	{/each}
</div>
```

---

### 4-3 `TodoItem.svelte` — 單一項目

```svelte
<!-- TodoItem.svelte -->
<script lang="ts">
	interface Todo {
		id: number;
		text: string;
		done: boolean;
	}

	let {
		todo,
		onToggle,
		onRemove
	}: {
		todo: Todo;
		onToggle: (id: number) => void;
		onRemove: (id: number) => void;
	} = $props();
</script>

<li class="flex items-center gap-2 py-2 border-b">
	<input
		type="checkbox"
		checked={todo.done}
		onchange={() => onToggle(todo.id)}
	/>
	<span class:line-through={todo.done} class="flex-1">
		{todo.text}
	</span>
	<button class="text-red-500 text-sm" onclick={() => onRemove(todo.id)}>
		刪除
	</button>
</li>
```

---

### 4-4 `TodoStats.svelte` — 統計列

這個元件只顯示資料，沒有任何互動，是最純粹的「展示型元件」：

```svelte
<!-- TodoStats.svelte -->
<script lang="ts">
	let {
		done,
		total
	}: {
		done: number;
		total: number;
	} = $props();
</script>

<p class="mt-3 text-sm text-gray-500">
	{done} / {total} 已完成
</p>
```

---

### 4-5 `TodoApp.svelte` — 主容器（組合所有子元件）

```svelte
<!-- TodoApp.svelte -->
<script lang="ts">
	import TodoInput from './TodoInput.svelte';
	import TodoFilter from './TodoFilter.svelte';
	import TodoItem from './TodoItem.svelte';
	import TodoStats from './TodoStats.svelte';

	interface Todo {
		id: number;
		text: string;
		done: boolean;
	}

	type Filter = 'all' | 'active' | 'done';

	// 所有「全域」狀態集中在這裡管理
	let todos = $state<Todo[]>([]);
	let filter = $state<Filter>('all');

	let filtered = $derived.by(() => {
		if (filter === 'active') return todos.filter(t => !t.done);
		if (filter === 'done') return todos.filter(t => t.done);
		return todos;
	});

	let doneCount = $derived(todos.filter(t => t.done).length);

	function addTodo(text: string) {
		todos.push({ id: Date.now(), text, done: false });
	}

	function toggleDone(id: number) {
		const todo = todos.find(t => t.id === id);
		if (todo) todo.done = !todo.done;
	}

	function removeTodo(id: number) {
		const index = todos.findIndex(t => t.id === id);
		if (index !== -1) todos.splice(index, 1);
	}
</script>

<div class="max-w-md mx-auto p-4">
	<h1 class="text-2xl font-bold mb-4">TODO List</h1>

	<TodoInput onAdd={addTodo} />

	<TodoFilter current={filter} onChange={f => (filter = f)} />

	<ul>
		{#each filtered as todo (todo.id)}
			<TodoItem
				{todo}
				onToggle={toggleDone}
				onRemove={removeTodo}
			/>
		{/each}
	</ul>

	<TodoStats done={doneCount} total={todos.length} />
</div>
```

---

## 5. 跨層傳遞資料：Context API

當資料需要跨越多層元件傳遞時，一層一層用 props 傳下去（稱為 **prop
drilling**）會讓程式碼很冗長。此時可以用 Svelte 的 **Context API**。

### 設定 Context（父層）

```svelte
<!-- ThemeProvider.svelte -->
<script lang="ts">
	import { setContext } from 'svelte';

	let {
		children
	}: {
		children: import('svelte').Snippet;
	} = $props();

	// 將主題 state 放入 context，讓任意深度的子元件都能讀取
	let theme = $state<'light' | 'dark'>('light');

	setContext('theme', {
		get current() {
			return theme;
		},
		toggle: () => {
			theme = theme === 'light' ? 'dark' : 'light';
		}
	});
</script>

{@render children()}
```

### 讀取 Context（任意子層）

```svelte
<!-- ThemeToggle.svelte -->
<script lang="ts">
	import { getContext } from 'svelte';

	const themeCtx = getContext<{
		current: 'light' | 'dark';
		toggle: () => void;
	}>('theme');
</script>

<button onclick={themeCtx.toggle}>
	現在是 {themeCtx.current} 模式，點擊切換
</button>
```

> **Context vs Props 的選擇：**
>
> - 只傳一兩層 → 用 **props**，直接清楚
> - 超過三層、或多個不同子元件都需要 → 用 **Context**

---

## 6. `children` Snippet：傳遞 UI 給子元件

Svelte 5 用 **Snippets** 取代了 Svelte 4 的
`<slot>`，讓你可以把 UI 片段當作 prop 傳入元件。

### 基本用法：`children`

最常見的情況是傳入預設內容，對應到 `children` 這個保留 prop 名稱：

```svelte
<!-- Card.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		children
	}: {
		title: string;
		children: Snippet;
	} = $props();
</script>

<div class="border rounded-lg p-4">
	<h3 class="font-bold mb-2">{title}</h3>
	{@render children()}
</div>
```

使用方式：

```svelte
<Card title="關於我">
	<p>我是一個 Svelte 開發者。</p>
	<p>喜歡寫簡潔的程式碼。</p>
</Card>
```

Card 標籤內的內容自動成為 `children` snippet。

### 具名 Snippet

當你需要多個 UI 插入點：

```svelte
<!-- PageLayout.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		header,
		main,
		footer
	}: {
		header: Snippet;
		main: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<div class="layout">
	<header>{@render header()}</header>
	<main>{@render main()}</main>
	{#if footer}
		<footer>{@render footer()}</footer>
	{/if}
</div>
```

使用方式：

```svelte
<PageLayout>
	{#snippet header()}
		<h1>我的部落格</h1>
	{/snippet}

	{#snippet main()}
		<p>文章內容...</p>
	{/snippet}

	{#snippet footer()}
		<p>© 2026</p>
	{/snippet}
</PageLayout>
```

---

## 7. 元件設計原則總結

| 原則                   | 說明                                       |
| ---------------------- | ------------------------------------------ |
| **單一職責**           | 每個元件只做一件事                         |
| **資料向下**           | 透過 props 從父傳子，子不修改父的 state    |
| **事件向上**           | 用 callback props（`onXxx`）通知父元件     |
| **狀態提升**           | 多個子元件共用的 state，提升到共同的父元件 |
| **避免 prop drilling** | 超過三層改用 Context API                   |
| **展示 vs 容器**       | 純展示的元件不持有 state，容器元件負責邏輯 |

## 8. 實戰練習

1. 將講義一的 `ProjectCard` 元件加上一個 `onSelect` callback
   prop，點選時通知父元件哪張卡片被選取
2. 建立一個 `Modal.svelte`，接受 `title` prop 和 `children`
   snippet，讓父元件可以傳入任意內容
3. 嘗試用 Context API 建立一個 `ThemeProvider`，讓整個頁面都能切換深/淺色模式
