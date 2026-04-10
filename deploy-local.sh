#!/bin/bash
# 本地部署腳本 - 模擬 Forgejo Actions 流程

set -euo pipefail

echo "🚀 開始本地部署測試..."

# 1. 安裝依賴
echo "📦 安裝依賴套件..."
bun install

# 2. 建置網站
echo "🔨 建置網站..."
bun run build

# 3. 建立 .nojekyll
echo "📄 建立 .nojekyll 檔案..."
touch dist/.nojekyll

# 4. 準備 static_page 分支
echo "🌿 準備 static_page 分支..."
TEMP_DIR="/tmp/static_page_$(date +%s)"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
cp -a dist/. "$TEMP_DIR"/

# 5. 初始化 Git 倉庫
cd "$TEMP_DIR"
git init
git checkout -b static_page
git add .
git config user.name "Local Deploy"
git config user.email "deploy@localhost"
git commit -m "deploy: $(date)"

# 6. 顯示建置結果
echo "✅ 建置完成！"
echo "📁 建置產物目錄: $TEMP_DIR"
echo "📊 檔案數量: $(find . -type f | wc -l)"
echo "🌐 主要檔案:"
ls -la | grep -E '\.html$|\.xml$'

# 7. 部署指令（需要手動執行）
echo ""
echo "📤 部署指令（需要手動執行）:"
echo "========================================"
echo "# 1. 添加遠端（如果尚未添加）"
echo "git remote add github https://github.com/tonicatowo/hosting_blog.git"
echo ""
echo "# 2. 推送到 GitHub（需要 PAT）"
echo "git push github static_page --force"
echo ""
echo "# 3. 或推送到 Codeberg（需要 DEPLOY_TOKEN）"
echo "git remote add codeberg https://oauth2:\$DEPLOY_TOKEN@codeberg.org/tonicatOWO/blog.git"
echo "git push codeberg static_page --force"
echo "========================================"

echo "🎉 本地測試完成！"
