# 部署指南：Forgejo → GitHub Pages

本指南說明如何將此 Astro + Svelte 5 +
Bun 部落格從 Codeberg/Forgejo 部署到 GitHub Pages。

## 架構概覽

- **原始碼**：存放在 Codeberg 儲存庫 `tonicatOWO/blog` 的 `trunk` 分支
- **建置流程**：Forgejo Actions 在 `trunk` 推送時建置，輸出到 `dist/`
- **部署**：建置產物強制推送到 `static_page` 分支
- **鏡像**：Codeberg 將 `static_page` 鏡像到 GitHub
- **託管**：GitHub Pages 從 GitHub 的 `static_page` 分支根目錄提供服務

## 設定檔案

### 1. astro.config.mjs

設定為專案頁面部署（GitHub 儲存庫：`hosting_blog`）：

```javascript
site: 'https://tonicatowo.github.io/hosting_blog',
base: '/hosting_blog',
```

**重要**：`base` 設定必須與 GitHub 儲存庫名稱匹配。

### 2. .forgejo/workflows/deploy-static-page.yml

工作流程：

- 在 `trunk` 推送時執行
- 使用 Bun 容器
- 使用 `bun run build` 建置網站
- 建立乾淨的 `static_page` 分支並包含建置產物
- 強制推送到 Codeberg

### 3. package.json

最小建置指令：

```json
"build": "astro build"
```

## 密鑰設定

### Codeberg 密鑰

在 Codeberg 儲存庫的 **Settings → Secrets** 新增：

| 鍵             | 值           | 用途                              |
| -------------- | ------------ | --------------------------------- |
| `DEPLOY_TOKEN` | Codeberg PAT | 推送 `static_page` 分支的寫入權限 |

**建立 Codeberg PAT：**

1. 前往 Codeberg → Settings → Applications
2. 產生新權杖，選擇 `repo` 範圍
3. 複製權杖值

### GitHub 鏡像設定

在 Codeberg 儲存庫的 **Settings → Mirror** 新增推送鏡像：

| 欄位       | 值                                               |
| ---------- | ------------------------------------------------ |
| Mirror URL | `https://github.com/tonicatowo/hosting_blog.git` |
| Username   | `tonicatowo`                                     |
| Password   | GitHub fine-grained PAT                          |

**GitHub PAT 要求：**

- Fine-grained PAT 具有 `Contents: Read and write` 權限
- 目標儲存庫：`tonicatowo/hosting_blog`

## GitHub Pages 設定

在 GitHub 儲存庫的 **Settings → Pages**：

| 欄位   | 值                   |
| ------ | -------------------- |
| Source | Deploy from a branch |
| Branch | `static_page`        |
| Folder | `/ (root)`           |

## 預期的分支結構

成功部署後，`static_page` 分支應包含：

```
static_page/          ← 分支根目錄，直接包含建置產物
├── index.html
├── _astro/
├── blog/
├── fonts/
├── pagefind/
├── rss.xml
├── sitemap-0.xml
├── sitemap-index.xml
├── favicon.ico
├── favicon.svg
├── VITE_X_SVELTE_5.png
└── .nojekyll
```

**重要**：沒有 `dist/` 資料夾包裝層 - 產物必須在根目錄。

## 驗證檢查清單

部署後請驗證：

- [ ] https://tonicatowo.github.io/hosting_blog 正常載入
- [ ] 所有 CSS/JS 檔案回傳 HTTP 200
- [ ] 圖片正常顯示
- [ ] Pagefind 搜尋功能正常
- [ ] RSS 訂閱 `/hosting_blog/rss.xml` 可存取
- [ ] 網站地圖 `/hosting_blog/sitemap-index.xml` 可存取
- [ ] 深層連結（如部落格文章）正常運作
- [ ] 資源路徑正確加上 `/hosting_blog` 前綴
- [ ] 沒有 404 錯誤在瀏覽器控制台

## 故障排除

### 建置問題

1. 檢查 `bun run build` 在本地是否正常運作
2. 確認 `dist/` 目錄有建立
3. 查看 Forgejo Actions 日誌中的錯誤

### 部署問題

1. 確認 `DEPLOY_TOKEN` 有儲存庫寫入權限
2. 驗證工作流程中的推送 URL 符合您的儲存庫
3. 檢查 `static_page` 分支結構（應為根目錄產物，不是 `dist/` 資料夾）

### GitHub Pages 問題

1. 確認 GitHub Pages 設定為 `static_page` 分支 + 根目錄資料夾
2. 檢查 Astro `base` 設定是否與 GitHub 儲存庫名稱匹配
3. 驗證建置輸出中包含 `.nojekyll` 檔案

## 工作流程觸發

工作流程在推送到 `trunk` 分支時自動執行。手動觸發：

1. 推送變更到 `trunk`
2. 監控 Forgejo Actions 標籤頁
3. 檢查 `static_page` 分支建立
4. 驗證 GitHub 鏡像同步
5. 檢查 GitHub Pages 部署狀態

## 專案頁面注意事項

由於這是專案頁面（非使用者頁面）：

- 網站網址：`https://tonicatowo.github.io/hosting_blog`
- 所有資源路徑自動加上 `/hosting_blog` 前綴
- 內部連結由 Astro 自動處理
- 確保 `base: '/hosting_blog'` 設定正確
