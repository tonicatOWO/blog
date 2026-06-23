---
title: 'ESP32-C3 SuperMini 開發流程筆記'
description:
        '從零開始的 ESP32-C3 SuperMini 開發環境設定：ESP-IDF 安裝、Neovim LSP
        整合、日常編譯燒錄流程。'
pubDate: '2026-06-23'
heroImage: '../../assets/esp32-c3-superMini.jpg'
---

ESP32-C3
SuperMini 使用 RISC-V 核心，官方 SDK 是 ESP-IDF。這份筆記記錄從零安裝到日常開發的完整流程，以 Neovim +
clangd LSP 為編輯器環境。

**前置條件**

- Arch Linux（或其他 Linux）
- `git`, `cmake`, `ninja`, `python`, `pip` 已安裝
- Neovim + clangd LSP 設定完成

---

## 零、USB 權限

板子接上後，`/dev/ttyACM0` 預設只有 `uucp` 群組可存取。

```bash
sudo usermod -aG uucp $USER
# 重新登入後生效，或用 newgrp uucp 即時套用
```

確認板子被偵測到：

```bash
ls /dev/ttyACM*   # 應該看到 /dev/ttyACM0
```

---

## 一、安裝 ESP-IDF

```bash
# 1. Clone ESP-IDF v5.5.3 到 ~/esp/esp-idf
mkdir -p ~/esp && cd ~/esp
git clone -b v5.5.3 --recursive https://github.com/espressif/esp-idf.git
cd esp-idf

# 2. 只裝 C3 的 RISC-V 工具鏈（省空間，不裝 Xtensa）
./install.sh esp32c3

# 3. 啟用環境（每個新 shell 都要 source 一次）
. ./export.sh
```

---

## 二、設定 `.zshrc` 快捷

```bash
# 加到 ~/.zshrc
alias idf='source ~/esp/esp-idf/export.sh && idf.py'
alias esp='source ~/esp/esp-idf/export.sh'
```

---

## 三、設定 `.clangd`（LSP 用）

ESP-IDF 用 esp-clangd。clangd 預設找不到 RISC-V GCC header，要手動加 `-isystem`
路徑。

先查工具鏈版本：

```bash
ls ~/.espressif/tools/riscv32-esp-elf/
# 例如：esp-16.1.0_20260609
```

建立 `~/.clangd`，把版本號換成實際的：

```yaml
# ~/.clangd
CompileFlags:
        CompilationDatabase: build.clang
        Add:
                - -isystem/home/你的帳號/.espressif/tools/riscv32-esp-elf/esp-16.1.0_20260609/riscv32-esp-elf/lib/gcc/riscv32-esp-elf/16.1.0/include
                - -isystem/home/你的帳號/.espressif/tools/riscv32-esp-elf/esp-16.1.0_20260609/riscv32-esp-elf/lib/gcc/riscv32-esp-elf/16.1.0/include-fixed
                - -isystem/home/你的帳號/.espressif/tools/riscv32-esp-elf/esp-16.1.0_20260609/riscv32-esp-elf/riscv32-esp-elf/include
Diagnostics:
        Suppress:
                - unused-includes
```

> 不加 `-isystem` 的話，`<stdint.h>` 等基本 header 會噴紅線。

新專案直接複製：

```bash
cp ~/.clangd ~/code/專案名/.clangd
```

---

## 四、首次建立新專案

```bash
esp                          # 載入 ESP-IDF 環境
cd ~/code
idf.py create-project 專案名
cd 專案名
idf.py set-target esp32c3    # 設定晶片，只需一次
cp ~/.clangd .               # 讓 clangd 知道 compile_commands 位置
```

---

## 五、產生 LSP 用的 compile_commands

```bash
idf.py -B build.clang -D IDF_TOOLCHAIN=clang reconfigure
```

> 只在**新增/刪除原始檔、改 CMakeLists、加 component**
> 後才需要重跑。日常改 code 不用。

---

## 六、日常開發循環

```bash
esp                                          # 每個新 terminal session 先載入
cd ~/code/專案名

nvim main/專案名.c                            # LSP 自動起來（esp-clangd）

idf.py build flash monitor -p /dev/ttyACM0   # 編譯→燒錄→看 log
# Ctrl+] 退出 monitor
```

---

## 七、指令速查

| 動作             | 指令                                                       |
| ---------------- | ---------------------------------------------------------- |
| 只編譯           | `idf.py build`                                             |
| 只燒錄           | `idf.py flash -p /dev/ttyACM0`                             |
| 只看 log         | `idf.py monitor -p /dev/ttyACM0`                           |
| 編譯+燒錄+log    | `idf.py build flash monitor -p /dev/ttyACM0`               |
| 改設定           | `idf.py menuconfig`                                        |
| 清除 build       | `idf.py fullclean`                                         |
| 改了原始檔結構後 | `idf.py -B build.clang -D IDF_TOOLCHAIN=clang reconfigure` |

---

## 八、關鍵注意事項

**兩個 build 目錄並存**

| 目錄           | 用途           | 誰產生         |
| -------------- | -------------- | -------------- |
| `build/`       | 實際編譯燒錄   | `idf.py build` |
| `build.clang/` | 只給 clangd 讀 | `reconfigure`  |

互不干擾。`build/` 是燒進板子的，`build.clang/` 純粹給 LSP。

---

**PORT 環境變數**

```bash
export ESPPORT=/dev/ttyACM0   # 放 .zshrc，省略每次打 -p
idf.py build flash monitor
```

---

**Neovim 要在 `esp` 之後開**

每個新 terminal 先跑 `esp`，再開 Neovim，LSP 才找得到 esp-clangd。

---

## 最精簡日常流程

```bash
esp && cd ~/code/專案名
idf.py build flash monitor -p /dev/ttyACM0
```

改 code → 存檔 → 重跑第二行。
