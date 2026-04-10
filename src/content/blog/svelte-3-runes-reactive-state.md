---
title: 'Svelte 講義（三）：Runes / 反應式狀態'
description:
        'Svelte 5 Runes 基本用法，包含 $state、$derived、$effect，搭配計數器與
        TODO 範例。'
pubDate: '2026-04-07'
heroImage: '../../assets/VITE_X_SVELTE_5.png'
---

## 1. 什麼是 Runes？

Runes 是 Svelte 5 引入的「反應式符號」，以 `$`
開頭，用來明確告訴編譯器「這個變數需要反應式追蹤」。

在 Svelte 4，反應式是隱式的：元件頂層的 `let` 自動有反應性、`$:`
label 代表衍生或副作用，規則不一致且難以在元件外重用。

Svelte 5 用 Runes 取代，讓反應式變得**明確、可移植（可在 `.svelte.ts`
檔案中使用）、好理解**。

| Svelte 4                    | Svelte 5 Rune          | 用途       |
| --------------------------- | ---------------------- | ---------- |
| `let count = 0`（頂層）     | `$state(0)`            | 可變狀態   |
| `$: double = count * 2`     | `$derived(count * 2)`  | 衍生值     |
| `$: { console.log(count) }` | `$effect(() => {...})` | 副作用     |
| `export let name`           | `$props()`             | 接收 props |

> **注意：** Runes 不需要 import，它們是 Svelte 語言的一部分，直接使用即可。

---

## 2. `$state` — 可變的反應式狀態

`$state` 用來宣告會隨時間改變、且改變時需要更新畫面的變數。

### 2-1 基本用法：計數器

```svelte
<!-- Counter.svelte -->
<script lang="ts">
	let count = $state(0);

	function increment() {
		count += 1;
	}

	function decrement() {
		count -= 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div>
	<button onclick={decrement}>－</button>
	<span>{count}</span>
	<button onclick={increment}>＋</button>
	<button onclick={reset}>重置</button>
</div>
```

重點：

- `count` 就是一個普通數字，不是物件或 `.value` 包裝器，直接讀取、直接賦值。
- 在 Svelte 5，DOM 事件屬性改用 `onclick`（小寫），不再用 `on:click`。

### 2-2 物件與陣列的深層反應性

當 `$state`
包裹**純物件**或**陣列**，Svelte 會建立一個深層反應式 Proxy，讓你直接 mutate 屬性也能觸發更新：

```svelte
<script lang="ts">
	let todos = $state([
		{ id: 1, text: '學 Svelte 5', done: false },
		{ id: 2, text: '完成講義', done: false }
	]);

	function toggleDone(id: number) {
		const todo = todos.find(t => t.id === id);
		if (todo) todo.done = !todo.done; // 直接 mutate，Svelte 自動追蹤
	}

	function addTodo(text: string) {
		todos.push({ id: Date.now(), text, done: false }); // push 也會觸發更新
	}
</script>
```

> **與 Svelte 4 的差異：** Svelte 4 需要 `todos = [...todos]`
> 重新賦值才能觸發更新；Svelte 5 的 `$state` proxy 讓你直接 `mutate` 即可。

---

## 3. `$derived` — 衍生（計算）狀態

`$derived`
用來宣告**從其他狀態計算出來**的值，當依賴變動時自動重算。內部表達式不可有副作用（不能寫入 state）。

### 3-1 基本用法

```svelte
<script lang="ts">
	let count = $state(0);
	let doubled = $derived(count * 2);
	let isEven = $derived(count % 2 === 0);
</script>

<p>count: {count}</p>
<p>doubled: {doubled}</p>
<p>{isEven ? '偶數' : '奇數'}</p>
<button onclick={() => count++}>＋1</button>
```

### 3-2 複雜衍生：`$derived.by`

當計算邏輯超過一行表達式，改用 `$derived.by`，傳入一個函數：

```svelte
<script lang="ts">
	let numbers = $state([1, 2, 3, 4, 5]);

	let stats = $derived.by(() => {
		const total = numbers.reduce((a, b) => a + b, 0);
		const avg = total / numbers.length;
		const max = Math.max(...numbers);
		return { total, avg, max };
	});
</script>

<p>總和：{stats.total}</p>
<p>平均：{stats.avg}</p>
<p>最大值：{stats.max}</p>
<button onclick={() => numbers.push(numbers.length + 1)}>新增數字</button>
```

> **何時用 `$derived` vs `$effect`？**
>
> - 需要**計算一個值** → 用 `$derived`（純函數，有回傳值）
> - 需要**執行一個動作**（如 DOM 操作、呼叫 API）→ 用 `$effect`

---

## 4. `$effect` — 副作用

`$effect`
在元件掛載到 DOM 後執行，並在**依賴的 state 改變時重新執行**。適合用來同步非反應式的外部系統（如 localStorage、DOM
API、第三方函式庫）。

### 4-1 基本用法：同步 document.title

```svelte
<script lang="ts">
	let count = $state(0);

	$effect(() => {
		document.title = `點擊次數：${count}`;
	});
</script>

<button onclick={() => count++}>點擊（{count}）</button>
```

`$effect` 會自動追蹤內部讀取的 `$state` / `$derived`，依賴改變就重跑。

### 4-2 cleanup 函數

從 `$effect`
回傳一個函數，Svelte 會在**下次執行前**或**元件卸載前**呼叫它，用來清除訂閱、計時器等：

```svelte
<script lang="ts">
	let seconds = $state(0);

	$effect(() => {
		const timer = setInterval(() => {
			seconds += 1;
		}, 1000);

		return () => {
			clearInterval(timer); // 元件卸載時清除計時器
		};
	});
</script>

<p>已過 {seconds} 秒</p>
```

### 4-3 常見錯誤：不要用 `$effect` 計算衍生值

```svelte
<script lang="ts">
	let count = $state(0);

	// ❌ 錯誤：不要這樣做
	let doubled = $state(0);
	$effect(() => {
		doubled = count * 2;
	});

	// ✅ 正確：用 $derived
	let doubled2 = $derived(count * 2);
</script>
```

---

## 5. 完整範例：TODO List

結合 `$state`、`$derived`，實作一個帶有篩選功能的 TODO List：

```svelte
<!-- TodoApp.svelte -->
<script lang="ts">
	interface Todo {
		id: number;
		text: string;
		done: boolean;
	}

	type Filter = 'all' | 'active' | 'done';

	let todos = $state<Todo[]>([]);
	let newText = $state('');
	let filter = $state<Filter>('all');

	let filtered = $derived.by(() => {
		if (filter === 'active') return todos.filter(t => !t.done);
		if (filter === 'done') return todos.filter(t => t.done);
		return todos;
	});

	let doneCount = $derived(todos.filter(t => t.done).length);
	let totalCount = $derived(todos.length);

	function addTodo() {
		const text = newText.trim();
		if (!text) return;
		todos.push({ id: Date.now(), text, done: false });
		newText = '';
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

	<!-- 新增輸入 -->
	<div class="flex gap-2 mb-4">
		<input
			class="border rounded px-3 py-1 flex-1"
			type="text"
			placeholder="新增待辦事項..."
			bind:value={newText}
			onkeydown={e => e.key === 'Enter' && addTodo()}
		/>
		<button
			class="bg-orange-500 text-white px-4 py-1 rounded"
			onclick={addTodo}
		>
			新增
		</button>
	</div>

	<!-- 篩選按鈕 -->
	<div class="flex gap-2 mb-3">
		{#each ['all', 'active', 'done'] as Filter[] as f}
			<button
				class="px-3 py-1 rounded border"
				class:bg-orange-500={filter === f}
				class:text-white={filter === f}
				onclick={() => (filter = f)}
			>
				{f === 'all'
					? '全部'
					: f === 'active'
						? '未完成'
						: '已完成'}
			</button>
		{/each}
	</div>

	<!-- 列表 -->
	<ul>
		{#each filtered as todo (todo.id)}
			<li class="flex items-center gap-2 py-2 border-b">
				<input
					type="checkbox"
					checked={todo.done}
					onchange={() => toggleDone(todo.id)}
				/>
				<span
					class:line-through={todo.done}
					class="flex-1">{todo.text}</span
				>
				<button
					class="text-red-500 text-sm"
					onclick={() => removeTodo(todo.id)}
				>
					刪除
				</button>
			</li>
		{/each}
	</ul>

	<!-- 統計 -->
	<p class="mt-3 text-sm text-gray-500">
		{doneCount} / {totalCount} 已完成
	</p>
</div>
```

---

## 6. 關鍵觀念整理

| Rune       | 何時使用                        | 不該用的情況   |
| ---------- | ------------------------------- | -------------- |
| `$state`   | 元件內部需要改變的資料          | 靜態常數       |
| `$derived` | 從其他 state 計算出的值         | 有副作用的邏輯 |
| `$effect`  | 同步外部系統（DOM、API、timer） | 計算衍生值     |

## 7. 實戰練習

試著擴充上面的 TODO List，加入以下功能：

1. 「全部完成」按鈕，一次將所有項目標為 done
2. 「清除已完成」按鈕，刪除所有 `done === true` 的項目
3. 用 `$effect` 將 todos 同步到 `localStorage`，重新整理後資料不消失
