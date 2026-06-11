---
title: 'Git tutorial：從零開始學 Git，推上 GitHub'
description:
        'git
        是版本控制工具，讓你追蹤專案的變更歷史，協作開發。這篇文章帶你從安裝到推上
        GitHub，一步步學會使用 Git。'
pubDate: '2026-06-11'
heroImage: '../../assets/GitPro-Miyamizu-Mitsuha.png'
---

# 如何使用 Git？

你有沒有改了 code，結果搞壞了，又不知道怎麼回去？Git 就是解法。

讀完這篇，你就能把自己的 code 推上 GitHub，讓它從任何地方都能存取。

---

## 第一步：告訴 Git 你是誰

安裝完 Git 後，先設定名字和信箱。打開終端機，執行：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的信箱"
```

就像寄包裹前要填寄件人——讓 Git 知道這些 commit 是誰做的。

---

## 第二步：建立 Git 倉庫

在你的專案資料夾裡執行：

```bash
git init
```

Git 開始追蹤這個資料夾的所有變更。

[v] 試試看：執行 `git status`，看看 Git 列出什麼。

---

## 第三步：把變更打包

先新增一個檔案：

```bash
echo "hello world" > note.txt
```

### 放上打包桌（staging area）

Staging
area 是你的**打包桌**——先把要寄的東西放上去，確認好了再封箱。只有放到打包桌的東西，才會進入包裹。

```bash
git add note.txt
```

### 封箱（commit）

```bash
git commit -m "add hello world into note.txt"
```

`-m` 後面填這次的概述，讓未來的自己一眼看懂改了什麼。

---

## 目前這個「包裹」長這樣

| 欄位       | 內容                          |
| ---------- | ----------------------------- |
| 寄件人信箱 | <your@email.com>                |
| 寄件人姓名 | yourname                      |
| 包裹內容   | add hello world into note.txt |

---

## 第四步：連結 GitHub

GitHub 是**雲端郵局**——你在本地封好包裹（commit），推上去後它幫你存著，從任何地方都能存取，也讓別人能夠協作。

建立 GitHub 帳號後，點右上角 **+** → **New repository**，填入專案名稱。

> [!] **不要勾選 Initialize this repository with a
> README**——勾了會讓第一次 push 直接報錯。

建好後把 `你的帳號` 和 `你的專案` 換成你自己的：

```bash
git remote add origin https://github.com/你的帳號/你的專案.git
```

`origin` 是這個遠端位置的暱稱，推送時用這個名字代稱。

---

## 第五步：推送上去

`git commit` 只是把包裹封好放在桌上——`git push` 才是把它送進郵局。

```bash
git push -u origin main
```

執行後會提示輸入帳號和 **Personal Access Token（PAT）** 作為密碼。

> [i] 貼上 token 時畫面不會顯示任何字，這是正常的，直接按 Enter。

> **什麼是 PAT？** GitHub 不接受直接用密碼推送，改用 Token 當密碼。取得方式：
>
> 1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens
>    (classic)**
> 2. Generate new token (classic)
> 3. Expiration 選你要的期限；Scopes 勾 **repo**
> 4. 產生後**馬上複製存好**——這個頁面關掉就看不到了

第一次加 `-u` 讓 Git 記住對應關係，之後只需打：

```bash
git push
```

[v] 打開 GitHub，重新整理你的 repo 頁面，應該能看到剛才推上去的 note.txt。

---

## 分支（Branch）

跟隊友一起做專案時，大家都直接改 `main`
會互相覆蓋——分支讓每個人有自己的工作區，改完再合回去。

把 `main`
想像成出版的書，分支就是你的**草稿本**——可以隨意塗改，滿意了再合併回去。

### 建立並切換

```bash
git switch -c feature/add-login
```

### 查看所有分支

```bash
git branch
```

前面有 `*` 的就是目前所在的分支。

### 合併回主線

功能完成後，切回 `main` 再合併：

```bash
git switch main
git merge feature/add-login
```

### 刪除已合併的分支

```bash
git branch -d feature/add-login
```

[v] 試試看：建立一個叫 `test` 的分支，改一個檔案，commit 後合併回 main。

---

## 常用指令速查

| 指令                | 作用                   |
| ------------------- | ---------------------- |
| `git status`        | 查看目前工作區狀態     |
| `git log --oneline` | 簡潔查看 commit 歷史   |
| `git diff`          | 查看未暫存的變更       |
| `git stash`         | 暫時收起未完成的變更   |
| `git stash pop`     | 取回 stash 的變更      |
| `git pull`          | 拉取遠端最新變更並合併 |

---

## 進階：SSH 免密碼推送

> 以下內容 hackathon 不需要。設定好後之後推送不用每次輸入 token。

SSH 的概念：本機產生一對鑰匙（私鑰留在自己電腦，公鑰給 GitHub），之後推送時 GitHub 自動驗證，不用輸入密碼。

**產生鑰匙對**

```bash
ssh-keygen -t ed25519 -C "你的信箱"
```

一路按 Enter，完成後：

```bash
cat ~/.ssh/id_ed25519.pub
```

複製輸出，到 GitHub → Settings → SSH and GPG keys → New SSH key 貼上儲存。

**測試連線**

```bash
ssh -T git@github.com
# Hi 你的帳號! You've successfully authenticated...
```

**改用 SSH URL**

```bash
git remote set-url origin git@github.com:你的帳號/你的專案.git
```
