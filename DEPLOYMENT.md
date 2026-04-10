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

## Forgejo Actions 啟用

**重要**：Forgejo Actions 預設是停用的，需要手動啟用。

### 啟用步驟：

1. **登入 Codeberg** 並前往儲存庫：`https://codeberg.org/tonicatOWO/blog`
2. **進入設定**：點擊右上角的 "Settings"
3. **找到 Units 設定**：在左側選單中找到 "Units" → "Overview"
4. **啟用 Actions**：找到 "Actions" 選項並勾選啟用
5. **儲存設定**：點擊頁面底部的儲存按鈕

### 驗證是否啟用：

- 啟用後，儲存庫頁面應顯示 "Actions" 標籤
- 網址：`https://codeberg.org/tonicatOWO/blog/actions` 應可正常訪問

## 重要區別：GitHub Pages vs Codeberg Pages

根據官方文檔，我們需要澄清一個重要區別：

### Codeberg Pages

- 使用新的 git-pages 伺服器
- 只能用在 `codeberg.page` 網域（如 `username.codeberg.page/repository`）
- **不能用於自訂網域**（如 GitHub Pages）
- 有現成的 Forgejo Action：`https://codeberg.org/git-pages/action@v2`

### GitHub Pages（我們選擇的方案）

- 使用 GitHub 的託管服務
- 支援自訂網域和 GitHub 子網域
- 我們使用專案頁面：`https://tonicatowo.github.io/hosting_blog`
- **需要自訂工作流程**（不是使用 git-pages Action）

**為什麼我們選擇 GitHub Pages？**

1. 更好的全球 CDN 和效能
2. 更穩定的服務
3. 與 GitHub 生態系統更好的整合
4. 支援自訂網域（未來可選）

我們的工作流程是**自訂的**，不是使用 Codeberg Pages 的 git-pages
Action，因為我們需要部署到 GitHub Pages。

## 密鑰設定

### Codeberg 密鑰

在 Codeberg 儲存庫的 **Settings → Secrets** 新增：

| 鍵             | 值           | 用途                              |
| -------------- | ------------ | --------------------------------- |
| `DEPLOY_TOKEN` | Codeberg PAT | 推送 `static_page` 分支的寫入權限 |

**建立 Codeberg Personal Access Token (PAT)：**

1. **登入 Codeberg**：`https://codeberg.org/user/settings/applications`
2. **建立新權杖**：
      - 點擊 "Generate new token"
      - 名稱：`blog-deploy-token`
      - 權限範圍：勾選 `repo`（讀寫儲存庫權限）
      - 可選：設定過期時間
3. **複製權杖**：**重要**：權杖只會顯示一次，請立即複製並妥善保存
4. **儲存到 Secrets**：
      - 前往儲存庫設定：`https://codeberg.org/tonicatOWO/blog/settings/secrets/actions`
      - 點擊 "New secret"
      - 名稱：`DEPLOY_TOKEN`
      - 值：貼上剛才複製的 PAT
      - 儲存

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

## 快速設定檢查清單

在開始之前，請確認以下項目已完成：

### Codeberg 設定

- [ ] Forgejo Actions 已啟用（Settings → Units → Overview）
- [ ] `DEPLOY_TOKEN` 已建立並儲存到 Secrets
- [ ] 工作流程檔案存在：`.forgejo/workflows/deploy-static-page.yml`

### GitHub 設定

- [ ] 儲存庫 `tonicatowo/hosting_blog` 已建立
- [ ] GitHub Pages 已設定（branch: `static_page`, folder: `/ (root)`）
- [ ] GitHub PAT 已建立（用於鏡像同步）

### 鏡像設定

- [ ] Codeberg → GitHub 鏡像已設定
- [ ] 同步 `static_page` 分支

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

## 測試與驗證

### 測試工作流程

1. **觸發工作流程**：
      - 推送一個小更改到 `trunk` 分支
      - 例如：修改 README.md 或添加一個空行
      - 指令：`git add . && git commit -m "test: trigger workflow" && git push origin trunk`

2. **監控執行狀態**：
      - 前往 `https://codeberg.org/tonicatOWO/blog/actions`
      - 點擊最新的工作流程執行
      - 檢查每個步驟是否成功

3. **驗證分支建立**：
      - 檢查是否建立了 `static_page` 分支
      - 指令：`git ls-remote --heads origin`
      - 或查看儲存庫分支頁面

### 故障排除

#### Forgejo Actions 未執行

1. 確認 Actions 已啟用（Settings → Units → Overview）
2. 檢查工作流程檔案路徑：`.forgejo/workflows/deploy-static-page.yml`
3. 確認觸發條件：`on.push.branches: - trunk`

#### 建置失敗

1. 檢查 `bun run build` 在本地是否正常運作
2. 確認 `dist/` 目錄有建立
3. 查看 Forgejo Actions 日誌中的錯誤
4. 檢查 runner 是否可用（應使用 codeberg-small/tiny/medium）

#### 部署失敗

1. 確認 `DEPLOY_TOKEN` 有儲存庫寫入權限
2. 檢查 token 是否正確儲存在 Secrets 中
3. 驗證 token 未過期
4. 檢查工作流程中的 git push 指令

#### GitHub Pages 未更新

1. 確認 `static_page` 分支已推送到 GitHub
2. 檢查 GitHub Pages 設定：branch: `static_page`, folder: `/ (root)`
3. 等待幾分鐘讓 GitHub Pages 重新建置
4. 檢查 GitHub Pages 建置日誌
5. 驗證工作流程中的推送 URL 符合您的儲存庫
6. 檢查 `static_page` 分支結構（應為根目錄產物，不是 `dist/` 資料夾）

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
