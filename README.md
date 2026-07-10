<p align="center">
  <img src="./public/favicon.svg" width="72" height="72" alt="tonicatOWO blog icon" />
</p>

# tonicatOWO Blog

臺灣高中生全端開發者的個人部落格，使用 Astro 6、Svelte
5、UnoCSS 和 Bun 建置。網站內容以繁體中文為主，記錄 Svelte、Astro、TypeScript、Bun、Linux、自架站與專案實作筆記。

## Features

- Astro Content Collections 管理 Markdown / MDX 文章
- Svelte 5 元件用於互動區塊，例如技能卡與主題切換
- UnoCSS Wind 4、Attributify、Icons、Typography 作為樣式系統
- Pagefind 產生靜態站內搜尋
- RSS、Sitemap、Open Graph、Twitter Card 與 JSON-LD 結構化資料
- 自託管字體與建置後字體子集化
- Obsidian to Astro 發布腳本，支援圖片搬移、wiki link 轉換與自動 git commit /
  push
- Cloudflare Workers / Pages 靜態資產部署設定

## Tech Stack

- Runtime / package manager: Bun
- Framework: Astro 6
- UI islands: Svelte 5
- Styling: UnoCSS
- Content: Astro Content Collections
- Search: astro-pagefind / Pagefind
- Deploy: Wrangler with static assets from `dist/`

## Project Structure

```text
.
├── public/                 # favicon, robots, redirects, headers, fonts
├── script/                 # publish and build helper scripts
├── src/
│   ├── assets/             # blog images and fallback Open Graph image
│   ├── components/         # layout, UI, and utility components
│   ├── content/blog/       # Markdown / MDX blog posts
│   ├── layouts/            # blog post layout
│   ├── pages/              # Astro routes, RSS, 404
│   └── styles/             # global theme, font, and base CSS
├── astro.config.mjs
├── uno.config.ts
├── wrangler.jsonc
└── package.json
```

## Getting Started

Prerequisites:

- Node.js `>=22.12.0`
- Bun

Install dependencies:

```bash
bun install
```

Start the local development server:

```bash
bun run dev
```

Build the static site:

```bash
bun run build
```

Preview the production build:

```bash
bun run preview
```

## Scripts

| Command                | Description                                |
| ---------------------- | ------------------------------------------ |
| `bun run dev`          | Start Astro dev server                     |
| `bun run build`        | Build Astro site, then run font subsetting |
| `bun run preview`      | Preview `dist/` locally                    |
| `bun run check`        | Run TypeScript, lint, and format checks    |
| `bun run lint`         | Run oxlint and ESLint                      |
| `bun run lint:fix`     | Auto-fix oxlint and ESLint issues          |
| `bun run format`       | Format the repository with Prettier        |
| `bun run format:check` | Check formatting                           |
| `bun run publish`      | Publish posts from an Obsidian vault       |
| `bun run publish:dry`  | Dry-run the Obsidian publish flow          |
| `bun run deploy`       | Deploy `dist/` with Wrangler               |

## Writing Posts

Blog posts live in `src/content/blog/` and are loaded by the `blog` content
collection. Supported extensions are `.md` and `.mdx`.

Required frontmatter:

```yaml
---
title: '文章標題'
description: '文章摘要，會用於列表、SEO 與 RSS。'
pubDate: '2026-05-12'
---
```

Optional frontmatter:

```yaml
updatedDate: '2026-05-20'
heroImage: '../../assets/example.png'
```

Images should be placed in `src/assets/` and referenced with a relative path
from the post file. The route for a post is derived from its file name, for
example `src/content/blog/git-tutorial.md` becomes `/blog/git-tutorial/`.

## Obsidian Publish Flow

The publish script imports Markdown files from an Obsidian vault into
`src/content/blog/`.

```bash
bun run publish <vault/blog>
```

Publish specific files:

```bash
bun run publish <vault/blog> post-a.md post-b.md
```

Preview without writing files or running git operations:

```bash
bun run publish:dry <vault/blog>
```

You can also set `OBSIDIAN_BLOG_DIR` instead of passing the vault path.

The script:

- skips `draft: true` posts unless `--include-drafts` is passed
- converts `![[image.png]]` to Astro-compatible asset references
- converts Obsidian wiki links to plain text
- copies images from `<vault/blog>/assets/` into `src/assets/`
- writes schema-compatible frontmatter
- stages changed posts and assets, then commits and pushes when not in dry-run
  mode

## Deployment

The site builds to `dist/` as a static Astro output. `wrangler.jsonc` deploys
that directory as Cloudflare static assets.

```bash
bun run build
bun run deploy
```

Caching rules are defined in `public/_headers`, and redirects are defined in
`public/_redirects`.
