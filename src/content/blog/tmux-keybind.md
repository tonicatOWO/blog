---
title: personal tmux keybind
description: 關於我個人的tmux keybind 筆記
pubDate: 2026-08-07T00:00:00.000Z
heroImage: ../../assets/tmux.png
---
prefix（前導鍵）是 **`C-a`**（Ctrl + A），非預設的 `C-b`。

相關的 binding 整理：

### Prefix

```
unbind C-b          # 移除預設 C-b
set -g prefix C-a   # 改為 C-a
bind C-a send-prefix  # 按兩次 C-a 傳送字面 C-a
```

### 常用操作

| 快捷鍵 | 作用 |
|--------|------|
| `C-a` `c` | 開新 window |
| `C-a` `n` / `p` | 下/上一個 window |
| `C-a` `1-9` | 跳到第 N 個 window |
| `C-a` `,` | 重新命名 window |
| `C-a` `\|` | 垂直分割（你綁在 `\|`） |
| `C-a` `-` | 水平分割（綁在 `-`） |
| `C-a` `h/j/k/l` | 切換 pane（左下右上） |
| `C-a` `H/J/K/L` | 調整 pane 大小 5 格 |
| `C-a` `z` | 全螢幕切換 pane |
| `C-a` `x` | 關閉 pane |
| `C-a` `Enter` | 進入 copy mode（vi 模式） |
| `C-a` `r` | 重載設定檔 |
| `C-a` `[` | 滾動模式（copy mode 傳統鍵） |

### Copy mode (vi)

| 按鍵 | 作用 |
|------|------|
| `v` | 開始選取 |
| `y` | 複製選取區 + 退出 |
| `/` | 向下搜尋 |
