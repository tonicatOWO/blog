---
title: 'Svelte 5 入門講義（零）：從零開始的環境設定'
description:
        '寫給高中生與初學者的 Svelte 5 + SvelteKit 環境設定講義，使用 Bun
        建立第一個專案，並附上踩坑筆記。'
pubDate: '2026-05-12'
heroImage: '../../assets/VITE_X_SVELTE_5.png'
---

> 這是「Svelte
> 5 入門講義」系列的第 0 篇，目標是把環境準備好，讓你能夠順利跑完後面四篇（元件、事件、Runes、元件拆分）。
>
> 系列：**(0) 環境設定** →
> [(1) 元件與 props](../svelte-basics-1-components-props) →
> [(2) 事件與綁定](../svelte-basics-2-events-binding) →
> [(3) Runes 反應式狀態](../svelte-3-runes-reactive-state) →
> [(4) 元件拆分與資料流](../svelte-4-component-splitting-data-flow)

---

## 0. 前序

如果你還沒寫過 JavaScript，**先不要從本篇教學開始**。建議熟悉以下三者：

- HTML 基本標籤（`<div>`、`<a>`、`<input>`...）
- CSS 選擇器與基本排版（flex、grid 不用太深）
- JavaScript 的變數、函式、陣列、`if` / `for`

---

## 1. 為什麼選 Svelte 5？

| 框架   | 學習成本 | 寫法             | 編譯產物大小 |
| ------ | -------- | ---------------- | ------------ |
| React  | 高       | JSX + Hooks      | 大           |
| Vue    | 中       | SFC + 響應式 ref | 中           |
| Svelte | 低       | 接近原生 HTML/JS | **小**       |

Svelte 是「**編譯器**」而不是傳統的「runtime 框架」，意思是它在 build 時就把你的元件編譯成原生 JavaScript，瀏覽器跑的時候沒有額外的虛擬 DOM 開銷。

Svelte 5 引入了
**Runes**（`$state`、`$derived`、`$effect`...），讓反應式變數變得更明確、更可控。後面講義三會詳細介紹。

---

## 2. 工具準備

### 2-1 安裝 Bun

我們用 [Bun](https://bun.sh) 取代 Node.js + npm。Bun 是更快的 JS
runtime，啟動速度比 `npm install` 快 5–20 倍。

**Linux / macOS：**

```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows：** 用 PowerShell

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

裝完重開終端機，確認版本：

```bash
bun --version
# 應該會看到類似 1.x.x
```

### 2-2 編輯器

推薦 **VS Code** 或 **VSCodium**（開源版 VS Code，沒有 Microsoft 追蹤）。

必裝套件：

- **Svelte for VS Code**（官方）：語法高亮、自動補全、type 檢查
- **Prettier** 或 **Biome**：自動格式化（我自己用 Biome，更快）

---

## 3. 建立第一個 SvelteKit 專案

SvelteKit 是 Svelte 官方的全端框架，內建路由、SSR、API 端點等。即使你只想學 Svelte 元件，也建議直接從 SvelteKit 開始，避免之後重學。

### 3-1 用官方 CLI 建立專案

在你想放專案的資料夾打開終端機：

```bash
bunx sv create my-svelte-app
```

CLI 會問你幾個問題，**初學者建議這樣選**：

| 問題                      | 建議選項                  | 理由                      |
| ------------------------- | ------------------------- | ------------------------- |
| Which template?           | **SvelteKit minimal**     | 範本最乾淨，沒多餘的東西  |
| Add type checking?        | **Yes, using TypeScript** | 早點習慣 TS，後面省很多錯 |
| Add ESLint / Prettier...? | **Prettier**              | 統一程式碼風格            |
| Package manager?          | **bun**                   | 跟上面安裝的 Bun 一致     |

### 3-2 進入專案並安裝依賴

```bash
cd my-svelte-app
bun install
```

### 3-3 啟動 dev server

```bash
bun run dev
```

打開瀏覽器看
`http://localhost:5173`，應該會看到 SvelteKit 歡迎頁面。**改檔案存檔，瀏覽器會自動 HR**，不用手動重新整理。

---

## 4. 專案結構導覽

剛建立的專案大致長這樣：

```
my-svelte-app/
├── src/
│   ├── lib/              ← 共用元件、工具函式放這裡
│   │   └── index.ts
│   ├── routes/           ← 路由：每個資料夾 = 一個 URL
│   │   ├── +page.svelte  ← 對應 / 首頁
│   │   └── +layout.svelte ← 包住所有頁面的版面
│   ├── app.html          ← HTML 樣板（很少改）
│   └── app.d.ts          ← TypeScript 全域型別
├── static/               ← 靜態檔（圖片、favicon...）
├── svelte.config.js      ← SvelteKit 設定
├── vite.config.ts        ← Vite 設定
├── tsconfig.json         ← TypeScript 設定
└── package.json
```

### 4-1 重要慣例

| 路徑              | 用途                                                |
| ----------------- | --------------------------------------------------- |
| `src/lib/`        | 可以用 `$lib` 別名 import，例：`$lib/Button.svelte` |
| `src/routes/`     | 檔案即路由，`about/+page.svelte` → `/about`         |
| `+page.svelte`    | 頁面元件                                            |
| `+layout.svelte`  | 共用版面，所有子頁面都會被它包住                    |
| `+page.server.ts` | 後端載入資料（這篇不深入，後面進階再講）            |

> `$lib` 別名在 SvelteKit 預設啟用，這就是為什麼後面講義會看到
> `import Button from '$lib/Button.svelte'` 這種寫法。

---

## 5. 寫你的第一個元件

打開 `src/routes/+page.svelte`，把內容換成：

```svelte
<script lang="ts">
	let name = $state('Stranger');
	let count = $state(0);
</script>

<h1>Hello, {name}!</h1>

<input bind:value={name} placeholder="輸入你的名字" />

<button onclick={() => count++}>
	u click {count} times
</button>

<style>
	h1 {
		color: #ff5722;
	}
	button {
		padding: 8px 16px;
		font-size: 16px;
		cursor: pointer;
	}
</style>
```

存檔，瀏覽器自動更新。試試看：

- 在輸入框打字 → 標題即時改變（這就是 `bind:value` 雙向綁定）
- 點按鈕 → 數字加一（這就是 `$state` 反應式）

**恭喜！** 你已經寫了一個 Svelte 元件。後面四篇講義會把這些概念一個個展開。

---

## 6. 常見踩坑筆記

### 6-1 跑不起來：`Cannot find module 'svelte'`

通常是 `bun install` 沒跑完。砍掉 `node_modules` 跟 lock file 再裝一次：

```bash
rm -rf node_modules bun.lockb
bun install
```

### 6-2 Hot reload 不更新

- 確認檔案有存檔（VS Code 標題列有 ● 代表未存）
- 重啟 dev server：`Ctrl + C` 停掉再 `bun run dev`
- 還是不行 → 重啟瀏覽器分頁（有時 service worker 卡住）

### 6-3 `$state is not defined`

Runes 只能在 **`.svelte` 檔案**或 **`.svelte.ts` 檔案**裡用。一般 `.ts`
檔不能直接寫 `$state(...)`。

### 6-4 Svelte 4 vs 5 教學混淆

網路上很多舊教學用 `export let prop`、`on:click`、`$:` 這種語法。Svelte
5 仍然相容（叫 legacy
mode），但**官方推薦用 runes**。看教學時注意日期，**2024 年中以前的多半是 Svelte
4 寫法**。

---

## 7. 接下來

環境準備好了，按順序看：

1. [講義（一）：元件與 props](../svelte-basics-1-components-props)
   — 怎麼把 UI 拆成可重用的小積木
2. [講義（二）：事件與綁定](../svelte-basics-2-events-binding) — 互動的基礎
3. [講義（三）：Runes / 反應式狀態](./svelte-3-runes-reactive-state) —
   `$state`、`$derived`、`$effect` 三大主角
4. [講義（四）：元件拆分與資料流](../svelte-4-component-splitting-data-flow)
   —讓專案規模長大也不會亂
