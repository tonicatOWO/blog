---
title: 'Svelte 基礎講義（二）：事件與綁定'
description:
        '撰寫第二篇講義（事件處理與雙向綁定），整理範例程式碼並上傳到 GitHub。'
pubDate: '2026-03-31'
heroImage: '../../assets/VITE_X_SVELTE_5.png'
---

## 一、Svelte 5 事件處理基礎

### 1. DOM 元素事件：`on:click`、`on:input` 等

在 Svelte 5 中，DOM 元素仍用 `on:xxx` 來綁定，並可搭配 Event
Modifiers：`preventDefault`、`stopPropagation`、`once`、`self`。

```svelte
<!-- examples/events/DomEvents.svelte -->
<script lang="ts">
	import { $state } from 'svelte';

	let count = $state(0);
	let text = $state('');

	function handleClick() {
		count += 1;
	}

	function handleInput(event: InputEvent) {
		text = (event.target as HTMLInputElement).value;
	}
</script>

<div>
	<button on:click|preventDefault={handleClick}>
		Click me (count: {count})
	</button>

	<input
		type="text"
		placeholder="Type something"
		on:input={handleInput}
	/>
	<p>Text: {text}</p>
</div>
```

重點：

- `on:click={handleClick}` 是標準 DOM 事件。
- `|preventDefault`：阻止預設行為（例如 `<a>` href）。
- `|stopPropagation`：阻止事件往上冒泡。

---

## 二、事件修飾符（Event Modifiers）

把上面例子再延伸，加入 `stopPropagation`、`once` 等：

```svelte
<!-- examples/events/Modifiers.svelte -->
<script lang="ts">
	import { $state } from 'svelte';

	let clicks = $state(0);
	let inside = $state(0);
	let outside = $state(0);
</script>

<div
	on:click={() => {
		outside++;
	}}
>
	<button
		on:click|stopPropagation={() => {
			inside++;
		}}
	>
		inner button (clicks: {inside})
	</button>
	<p>outside clicks: {outside}</p>
</div>

<button on:click|once={() => (clicks += 1)}>
	Click once (clicks: {clicks})
</button>
```

關鍵：

- `|stopPropagation`：內層按鈕不會觸發外層 `div` 的事件。
- `|once`：只觸發一次，適合表單第一個提交或 loading 狀態管理。

---

## 三、Svelte 5 元件事件與 callback props

Svelte 5 移除 `createEventDispatcher()`，改用「callback
props」來模擬元件事件，更貼近普通函數。

### 子元件：接收 callback 函數

```svelte
<!-- components/CounterButton.svelte -->
<script lang="ts">
  // callback props：約定事件名稱
  export let onClick?: (count: number) => void;
  export let disabled = false;
</script>

<button {disabled} on:click={() => onClick?.(1)}> +1 </button>
```

### 父元件：傳遞 callback

```svelte
<!-- examples/events/CounterApp.svelte -->
<script lang="ts">
	import { $state } from 'svelte';
	import CounterButton from '$lib/components/CounterButton.svelte';

	let count = $state(0);

	function handleIncrement(delta: number) {
		count += delta;
	}
</script>

<h1>Counter: {count}</h1>
<CounterButton onClick={handleIncrement} />
```

重點：

- 不再用 `on:customEvent`，改用 `onClick` 這種 callback prop。
- 約定：`onXxx` prefix 表示「事件型態」 prop，和 `disabled`
  這種狀態性 prop 分開。

---

## 四、雙向綁定基礎：`bind:value`、`bind:checked`

Svelte 的 `bind:` 指令是雙向資料綁定的關鍵，常見在表單元素上。

### 文字輸入：`bind:value`

```svelte
<!-- examples/bind/BoundInput.svelte -->
<script lang="ts">
	import { $state } from 'svelte';

	let name = $state('');
</script>

<input type="text" bind:value={name} /><p>Hello, {name ? name : '陌生人'}</p>
```

- `bind:value={name}`：
     - 輸入框值改變 → `name` 更新
     - `name` 在程式碼中改變 → 輸入框同步更新
- 這就是「雙向資料綁定」。

### 核取方塊：`bind:checked`

```svelte
<!-- examples/bind/BoundCheckbox.svelte -->
<script lang="ts">
	import { $state } from 'svelte';

	let darkMode = $state(false);
</script>

<input type="checkbox" bind:checked={darkMode} />
<label>Dark mode: {darkMode ? 'on' : 'off'}</label>
```

`bind:checked` 幫你把 `true`/`false` 和核取方塊的勾選狀態同步。

---

## 五、自訂元件上的雙向綁定（`bind:value` + 子元件）

在 Svelte 5，你可以用 `bind:value` 在自訂元件上做雙向綁定，但需要在子元件裡用
`$bindable` 或等價邏輯。

### 子元件：公開可綁定的屬性

由於你偏好 MVP，這裡先用「callback + 外部 state」模擬，不捲入 `$bindable`
這種偏高階概念：

```svelte
<!-- components/TextInput.svelte -->
<script lang="ts">
  export let value = "";
  export let onInput?: (value: string) => void;

  function handleChange(event: InputEvent) {
    const el = event.target as HTMLInputElement;
    value = el.value;
    onInput?.(value);
  }
</script>

<input type="text" {value} on:input={handleChange} />
```

### 父元件：用 `bind:value` 模擬雙向綁定

```svelte
<!-- examples/bind/TextInputApp.svelte -->
<script lang="ts">
	import { $state } from 'svelte';
	import TextInput from '$lib/components/TextInput.svelte';

	let text = $state('');
</script>

<TextInput value={text} onInput={v => (text = v)} /><p>Current text: {text}</p>
```

語意上接近 `bind:value={text}`，只是你手動寫了 `onInput` 同步。

---
