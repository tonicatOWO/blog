---
title: 我的個人部落格是怎麼運作的
description: >-
  我不想做 CMS，所以乾脆自己串了一條 publishing pipeline：Obsidian 寫文章、script 搬內容、Astro + Svelte
  build、font subset 瘦身，再丟到 Codeberg、GitHub mirror 和 Cloudflare 上線。
pubDate: 2026-09-20T00:00:00.000Z
heroImage: ../../assets/blog.png
---
我的 blog 大概是這樣運作的。

我先用 `trunk` 初始化整個專案，之後再開 `dev` branch 當主要開發分支。這裡的 `trunk` 就是主要／production branch，不是在講典型的 Trunk-Based Development。

技術棧用 **Astro + Svelte 5**。

Astro 負責網站本身，像 dark mode 開關這種需要互動的元件，我都直接丟給 Svelte 寫。SkillCards 也是 Svelte，不過資料全部從 JSON 動態 render。

我不想把 SkillCards 的內容全部寫死在 component 裡。之後只是想改個 Skill、description 或 icon，結果還要跑去翻 component，真的很麻煩。直接改 JSON 比較省事。

## 我不想為了 blog 再做一套 CMS

文章這塊我沒有另外做 CMS。

平常直接在 Obsidian 寫，然後自己寫了一支 publish script，把 Obsidian 裡的 Markdown 轉成 Astro 可以直接吃的 content。

老實說我不想為了自己的 blog 再維護一套 CMS。

我想要的其實很單純：Obsidian 負責讓我寫東西，script 負責把東西搬進網站，剩下全部交給 Astro。

publish script 會處理 Obsidian 自己的 syntax。

像：

`Some Note`

或：

`顯示名稱`

都會在 publish 的時候轉掉。

圖片也是。

文章裡如果寫：

`![](../../assets/image.png)`

script 會把它轉成 Astro 可以使用的 asset path，同時把對應圖片一起 copy 到 repo。

所以寫文章的時候我不用一直管：

「這張圖現在是不是還要自己搬去網站專案？」

不用。

我就在 Obsidian 寫，publish 的時候一起處理掉。

目前圖片來源主要抓 vault 裡的 `assets/`，沒有的話再 fallback 到 vault root。換句話說，它不是什麼通用 Markdown asset resolver，就只是照我自己的 Obsidian 結構做一個夠用的 publisher。

我反而比較喜歡這樣。

功能不要多，行為夠可預期就好。

## Preview 跟 publish 是分開的

這支 script 我有留 preview mode。

通常不會文章一寫完就直接推上去，而是先：

```bash
bun run publish <vault/blog> --dry-run
```

先看它準備處理哪些 Markdown、準備搬哪些圖片。

`--dry-run` 不會真的寫進 repo，也不會碰 Git。

確認沒問題之後才正式 publish。

正式跑下去之後，文章會寫進 Astro 的 `src/content/blog/`，圖片一起進 `src/assets/`。

script 也會檢查文章的 frontmatter，像 `title`、`description`、`pubDate` 這些必要欄位沒有的話就直接跳掉。

有標：

```yaml
draft: true
```

的文章預設也不會 publish，除非我自己明確加 `--include-drafts`。

所以它其實有一點 CMS publishing pipeline 的感覺，只是沒有 CMS。

我還是繼續用 Obsidian 寫 Markdown。

這樣就好。

## Publish 完直接收成一個 Git commit

正式 publish 之後，這批文章跟圖片會一起 stage。

commit message 也是 script 自己生，例如：

```text
feat(blog): publish some-post [2026-09-19]
```

一次發好幾篇也會一起收進同一個 commit。

我不太想每發一篇文章就在那邊手動：

```bash
git add
git commit
git push
```

這種事情既然規則固定，那就讓 script 自己做。

不過這裡還有一段 release flow 是我現在正在收乾淨的。

因為網站 build 完之後，我還有另一支 **font subset script** 要跑。

所以我真正想固定下來的順序是：

```text
Obsidian
   ↓
publish preview
   ↓
publish
   ↓
Astro build
   ↓
font subset
   ↓
Git commit
   ↓
Codeberg
   ↓
GitHub mirror
   ↓
Cloudflare
   ↓
Domain
```

也就是 **subset 沒跑完，我不想讓這個版本 push 出去**。

現在 `publish.ts` 本身已經會 commit + push，所以這部分還要再往後移，最後讓整條 release pipeline 自己保證順序。

不是靠我記得。

## 中文 font 真的太肥了

我另外還做了一支可以重複使用的 font subset script。

原因很單純。

中文 font 一整包塞進網站真的太肥。

網站明明可能只出現幾千個字，結果使用者卻要下載一整套我根本用不到的 glyph，我覺得沒必要。

所以 Astro build 完之後，我會去掃網站實際使用的文字，把需要的 characters 收集起來，再針對 build 出來的 font 產生 subset WOFF2。

這支 script 也不是每次都無腦重新切。

它會把使用到的 characters 跟原始 font bytes 一起算 SHA-256 cache key。

輸入沒變，就直接 skip。

輸入有變，才重新 subset。

subset 完也還沒結束。

因為 Astro build 出來的 HTML、CSS、JS 原本還是指向完整 font，所以 script 還會把那些 reference patch 成新的 subset font。

patch 完之後再掃一次。

如果還找到東西指向原始完整 font，我寧願直接讓整個 script fail，也不要假裝 optimize 成功然後把完整 font 一起 deploy 出去。

確認全部 reference 都乾淨之後，才把原始 font 從 `dist/` 刪掉。

我目前那幾顆完整 font 加起來大概就是十幾 MB。

能不送給使用者就不要送。

## GitHub 不是我的 source of truth

Git 的部分，我把 **Codeberg 當 source of truth**。

本地 commit 完之後先 push 到 Codeberg，再把同一份 repository mirror 到 GitHub。

大概就是：

```text
Local
  ↓
Codeberg
  ↓
GitHub mirror
  ↓
Cloudflare Workers Builds
  ↓
Custom Domain
```

為什麼不是直接把 GitHub 當主要 repo？

單純就是我不太想信任 GitHub。

GitHub 過去真的發生過很扯的 Git repository 事故。

2016 年 GitHub 因為一個 programming error，部分 `git pull` / `git clone` request 被 route 到錯誤的 repository，最後有 **156 個 private repositories** 受到影響。

GitHub 自己的 incident report 甚至提到，有使用者原本要抓自己的 repository，結果拿到了另一個 repository 的 commits、objects 跟 history。

這不是什麼網路都市傳說，是 GitHub 自己公開的 incident report。

來源：GitHub Engineering，_Incident report: Inadvertent private repository disclosure_。

而且這也不是在說「只要出過一次包，GitHub 就完全不能用」。

GitHub 當然還是目前非常成熟的 code hosting platform，我自己也還在用。

只是對我來說，**Git hosting 本身就是這個平台最核心的工作**。

這種地方都曾經出過問題，我就不太想把它當唯一的 source of truth。

到 2026 年 GitHub 自己的 availability report 也還是持續記錄基礎設施事故。像 2026 年 7 月 8 日的一次事故，就連 Git operations 在內的多項服務都受到影響。

再加上 GitHub 現在本來就是高度商業化的平台，我個人又比較偏好 FOSS，所以主要 repository 最後還是選 Codeberg。

Codeberg 的定位也比較合我胃口。

它背後是非營利組織，本身就是為 Free/Libre software development 在做的 code hosting，而不是另一個 general-purpose commercial code forge。

GitHub 對我來說比較像 deployment mirror。

原因也很簡單：

**Cloudflare 接 GitHub 很方便。**

GitHub mirror 收到新的 push 之後，Cloudflare 的 Git integration / Workers Builds 就會觸發新的 build 和 deploy。

不是我自己開一隻 Worker 在那邊一直 poll GitHub commit history。

build 完之後就直接掛到我放在 Cloudflare 上的 custom domain。

所以最後整套大概是：

```text
Obsidian
   ↓
publish script
   ↓
Astro
   ↓
font subset
   ↓
Codeberg
   ↓
GitHub mirror
   ↓
Cloudflare
   ↓
my domain
```

Codeberg 負責讓我安心放 code。

GitHub 我還是用，只是拿來當 deployment mirror。

Cloudflare 就負責把最後的東西送出去。

我沒有 CMS，也沒有什麼很複雜的後台。

Obsidian、幾支 script、Git，再加 Astro。

對我來說這樣反而比較好維護。
