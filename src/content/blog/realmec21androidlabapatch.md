---
title: 把第一支智慧型手機變成 Android 實驗板：Realme C21 刷機、Root 與 APatch 實錄
description: >-
  從 MTKClient 解鎖 Realme C21、備份 GPT 與關鍵分區、找回 Fastboot，到
  Magisk、NeoZygisk、Vector，最後改用 APatch 與 Magic Mount RS。這篇記錄我把一支退役 C21 變成 Android
  實驗機的完整過程，以及一路踩過的坑。
pubDate: 2026-09-03T00:00:00.000Z
heroImage: ../../assets/AndroidToDevBoard.png
---


Realme C21 是我的第一支智慧型手機。現在它已經退下主力位置，不拿來亂搞反而有點浪費。

我不是第一次玩 Android 刷機。Pixel 6a 之前也 Root 過，因為 Google 有提供完整的 Factory Image，就算真的玩壞了，大不了重新刷回去，心理壓力不大。

它後來也刷過 GrapheneOS、LineageOS 23 和幾套衍生 ROM，但分別遇到穩定性、PIN Bug 和 UI 跑版問題。玩了一圈，Pixel 6a 最後還是刷回比較單純的環境，現在專門拿來跑銀行 App。

日常主力則換成 Pixel 7a，目前跑的是 GrapheneOS。同樣是 GrapheneOS，在 7a 上穩定很多。

C21 就算刷壞也不會影響日常使用，正好拿來當 Android 實驗機。我先在它上面完成 Bootloader Unlock 和 Magisk Root，後面再一路測 NeoZygisk、Vector、LSPosed、Firewall、VPN Hotspot 與 GSI。Magisk 跑過一輪之後，我又把 Root 方案整套換成 APatch，繼續拿同一台機器測另一套架構。

## 我的 Realme C21

這次玩的機器是：

```text
Model: RMX3201
Build: RMX3201_11_C.19
Android: 11
SoC: MediaTek MT6765 / Helio G35
HW Code: 0x766
Storage: eMMC

```

用 ADB 確認：

```bash
adb shell getprop ro.product.model
adb shell getprop ro.build.display.id

```

結果：

```text
RMX3201
RMX3201_11_C.19

```

C21 麻煩的地方就在這裡：它沒有 Pixel 那套官方 Bootloader Unlock、Factory Image 和完整 Fastboot 流程，連 Fastboot 都被藏了起來。

這次主要靠 MTKClient 和 MediaTek BROM 處理。

## 為什麼 C21 適合拿來學 MTK

C21 這類舊 MTK 手機很適合拿來理解 Android 開機鏈，因為操作時會直接碰到：

```text
Preloader
BROM
Download Agent
GPT
seccfg
LK
AVB
Fastboot
Dynamic Partitions
Magisk
Zygisk
LSPosed
iptables

```

Pixel 的官方解鎖與映像檔流程省掉了不少底層步驟；C21 則迫使我直接處理 BROM、GPT、LK 和 AVB。

## 安裝 MTKClient

我的電腦跑 Arch Linux。

先安裝需要的套件：

```bash
sudo pacman -S python python-pip git libusb

```

抓 MTKClient：

```bash
git clone https://github.com/bkerler/mtkclient --recursive
cd mtkclient

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

```

如果 Linux 一直搶走 Preloader，可以先停用 ModemManager，再卸載 `cdc_acm`：

```bash
sudo systemctl stop ModemManager
sudo modprobe -r cdc_acm

```

後面可以再恢復，不需要永久停用。

## 為什麼我最後全程都用 `mtk.py`

我平常習慣用 `uv` 管 Python 環境，原本也打算照辦，但這次透過 `uv` 啟動 MTKClient 時一直拿不到 MediaTek USB 裝置。問題到底卡在哪一層我沒有繼續追，只確認改成 `venv + sudo` 後就能正常使用。

我的想法很簡單：

> 我現在是要 Root 一台舊手機，不是要研究 Python packaging。

所以我先不追 `uv` 的權限問題，直接改用傳統 `venv`：

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

```

需要存取 MTK USB 裝置時就執行：

```bash
sudo .venv/bin/python mtk.py ...

```

後面的 MTKClient 操作因此都使用同一種呼叫方式：

```bash
sudo .venv/bin/python mtk.py printgpt
sudo .venv/bin/python mtk.py r ...
sudo .venv/bin/python mtk.py w ...
sudo .venv/bin/python mtk.py e ...
sudo .venv/bin/python mtk.py da ...

```

而不是：

```bash
uv run ...

```

### 那為什麼不用 `mtk_gui.py`？

MTKClient 也有 GUI：

```bash
python mtk_gui.py

```

GUI 可以直接選擇分區和映像檔，操作步驟比 CLI 少。但我的 USB 存取最後是靠 `sudo` 解決，所以我試著執行：

```bash
sudo .venv/bin/python mtk_gui.py

```

Qt 馬上噴出一整串錯誤：

```text
Authorization required, but no authorization protocol specified

qt.qpa.xcb: could not connect to display :1
qt.qpa.plugin: From 6.5.0, xcb-cursor0 or libxcb-cursor0 is needed
to load the Qt xcb platform plugin.

qt.qpa.plugin: Could not load the Qt platform plugin "xcb" in ""
even though it was found.

This application failed to start because no Qt platform plugin
could be initialized.

Available platform plugins are:
eglfs, linuxfb, minimal, minimalegl, offscreen,
vkkhrdisplay, vnc, wayland-brcm, wayland-egl,
wayland, xcb.

abort sudo .venv/bin/python mtk_gui.py

```

問題不在 MTKClient 本身，而是 `sudo` 之後沒有完整繼承我的 Wayland／X11 圖形環境。要繼續修還得處理 `DISPLAY`、`XAUTHORITY` 和 Qt plugin，我懶得為了 GUI 再追這條線。

這類工具會直接改寫 GPT、Preloader、LK、NVRAM、`boot`、`vbmeta` 和 `seccfg`。我比較想在執行前看清楚完整指令，因此後來都用 CLI。

CLI 的好處是分區和動作都直接寫在指令裡。例如：

```bash
mtk.py r boot boot.bin
mtk.py w lk lk.bin
mtk.py e metadata,userdata,md_udc

```

第一條讀 `boot`，第二條寫 `lk`，第三條則清除指定分區。至少分區和檔名都會完整留在終端機裡，執行前還能再看一眼。

這不是最優雅的解法，只是它能動，而我不想再修 GUI。

## 第一個大坑：Handshake Failed

一開始最常看到的是：

```text
Preloader - [LIB]: Status: Handshake failed, retrying...
Port - Handshake failed after retries

```

我原本以為是 MTKClient 相容性或進入模式的方法有問題，後來 `dmesg` 顯示真正的異常在 USB 連線。

我開著：

```bash
sudo dmesg -w

```

手機其實有正常枚舉：

```text
idVendor=22d9
idProduct=0006
Product: OPPO Preloader

```

另外也出現過：

```text
idVendor=0e8d
idProduct=20ff
Product: RMX3201

```

但 kernel 同時在噴：

```text
device descriptor read/64, error -32
error -71
invalid wMaxPacketSize
Cannot enable. Maybe the USB cable is bad?

```

問題有一大部分根本只是 USB。

換線、換 USB 連接埠，並避開奇怪的 hub 後，終於看到：

```text
Port - Device detected :)
Preloader - Detected regular mode !

CPU: MT6765/MT8768t(Helio P35/G35)
HW code: 0x766

```

這次之後，我遇到 Handshake Failed 會先看線、USB 連接埠和 `dmesg`，MTKClient 參數反而放到後面。

## 從 Preloader 進到 BROM

成功抓到手機後，一開始顯示：

```text
Detected regular mode

```

Target config 是：

```text
Target config: 0x5

SBC enabled: True
SLA enabled: False
DAA enabled: True

```

接著 MTKClient 會嘗試讓 Preloader crash：

```text
Mtk - We're not in bootrom, trying to crash da...
Exploitation - Crashing da...

```

中間還出現：

```text
DAA_SIG_VERIFY_FAILED (0x7024)

```

我原本以為到這裡就失敗了，結果手機重新枚舉後，Target config 變成：

```text
Target config: 0xe5
Mem read auth: True
Mem write auth: True
Cmd 0xC8 blocked: True

Preloader - BROM mode detected.

```

接著 MTKClient 載入：

```text
mt6765_payload.bin

```

執行 Kamakiri：

```text
Exploitation - Kamakiri Run
Exploitation - Done sending payload...
PLTools - Successfully sent payload

```

後面則是：

```text
Successfully bypassed security
Successfully uploaded stage 1
DRAM setup passed
Successfully uploaded stage 2
DA Extensions successfully added

```

整個流程是從 Preloader 進入 BROM，透過 Kamakiri 載入 Download Agent。到這一步後，MTKClient 才能直接讀寫 eMMC。

## 先 `printgpt`，不要一上來就 unlock

我第一件事不是修改 Bootloader，而是查看 GPT：

```bash
sudo .venv/bin/python mtk.py --debugmode printgpt

```

這台 RMX3201 的 GPT 裡有：

```text
recovery

vbmeta
vbmeta_system
vbmeta_vendor

nvcfg
nvdata
nvram

md_udc
metadata

protect1
protect2

seccfg
persist
sec1
proinfo

lk
lk2

boot
dtbo

super
cache
userdata

```

一些重要分區的大小：

```text
lk       = 4 MiB
lk2      = 4 MiB
boot     = 32 MiB
seccfg   = 8 MiB
nvram    = 64 MiB
nvdata   = 64 MiB

```

這台使用 Dynamic Partitions，因此 GPT 裡不會直接看到 `system`、`vendor` 和 `product`。它們都在 `super` 裡，後面處理 GSI 時還會碰到這個差異。

## 備份比 Root 更重要

開始修改前，先建立備份目錄：

```bash
mkdir -p backup/RMX3201_C19/{gpt,parts}

```

備份 GPT：

```bash
sudo .venv/bin/python mtk.py gpt backup/RMX3201_C19/gpt

```

備份 Preloader：

```bash
sudo .venv/bin/python mtk.py r \
  preloader \
  backup/RMX3201_C19/preloader.bin \
  --parttype boot1

```

另外我至少會保留：

```text
seccfg

nvram
nvdata
nvcfg

proinfo
protect1
protect2
persist

boot

vbmeta
vbmeta_system
vbmeta_vendor

lk
lk2
recovery

```

一次讀出這些分區：

```bash
sudo .venv/bin/python mtk.py r \
'seccfg,nvram,nvdata,nvcfg,proinfo,protect1,protect2,persist,boot,vbmeta,vbmeta_system,vbmeta_vendor,lk,lk2,recovery' \
'backup/RMX3201_C19/parts/seccfg.bin,backup/RMX3201_C19/parts/nvram.bin,backup/RMX3201_C19/parts/nvdata.bin,backup/RMX3201_C19/parts/nvcfg.bin,backup/RMX3201_C19/parts/proinfo.bin,backup/RMX3201_C19/parts/protect1.bin,backup/RMX3201_C19/parts/protect2.bin,backup/RMX3201_C19/parts/persist.bin,backup/RMX3201_C19/parts/boot.bin,backup/RMX3201_C19/parts/vbmeta.bin,backup/RMX3201_C19/parts/vbmeta_system.bin,backup/RMX3201_C19/parts/vbmeta_vendor.bin,backup/RMX3201_C19/parts/lk.bin,backup/RMX3201_C19/parts/lk2.bin,backup/RMX3201_C19/parts/recovery.bin'

```

最後建立 checksum：

```bash
find backup/RMX3201_C19 -type f \
  -exec sha256sum {} \; \
  > backup/RMX3201_C19/SHA256SUMS

```

尤其是這幾個檔案：

```text
preloader
nvram
nvdata
nvcfg
proinfo

```

`preloader`、`nvram`、`nvdata`、`nvcfg`、`proinfo` 這些我只留自己這台機器讀出來的版本，不會拿別台手機的檔案硬刷。Pixel 還有官方 Factory Image 可以救，MTK 的校正資料和裝置專屬資料一旦丟掉，下載一包 ROM 不一定補得回來。

這些備份我至少留兩份，一份放電腦，一份放 NAS，不和實驗環境放在同一顆硬碟。

## 解鎖 Bootloader

我的 GPT 裡有：

```text
metadata
userdata
md_udc

```

先清除這三個分區：

```bash
sudo .venv/bin/python mtk.py e metadata,userdata,md_udc

```

這一步會清掉手機上的資料。成功後會看到：

```text
All partitions formatted.

```

接著處理 `seccfg`：

```bash
sudo .venv/bin/python mtk.py da seccfg unlock

```

結果是：

```text
XFlashExt - Detected V4 Lockstate
SecCfgV4 - hwtype found: V4

DaHandler - [LIB]: Device is already unlocked

```

MTKClient 讀到的 `seccfg` 已經處於 unlocked state。

## AVB 與 dm-verity

這部分是我後來真的遇到開機問題才處理，不建議不分機型直接照抄。

我先清除 `cache`：

```bash
sudo .venv/bin/python mtk.py e cache

```

再執行：

```bash
sudo .venv/bin/python mtk.py da vbmeta 3

```

成功輸出：

```text
Dumping partition "vbmeta"
Patching vbmeta
Patching verification + verity
Writing partition "vbmeta"

Successfully patched vbmeta :)

```

這會關閉 AVB verification 和 verity。

## 確認解鎖狀態

Android 開機後執行：

```bash
adb shell getprop ro.boot.flash.locked
adb shell getprop ro.boot.vbmeta.device_state
adb shell getprop ro.boot.verifiedbootstate

```

我的結果是：

```text
0

orange

```

這裡我主要看兩個值：

```text
ro.boot.flash.locked = 0
ro.boot.verifiedbootstate = orange

```

這台的 Bootloader 解鎖狀態已經成立。

## Bootloader 解鎖了，Fastboot 卻還是沒有

我執行：

```bash
adb reboot bootloader

```

手機卻直接重新進入 Android，沒有進 Fastboot。Bootloader 雖然解鎖了，C21 原廠 LK 仍沒有把 Fastboot 開給我，因此我改用這篇 XDA 討論串提供的 modified LK：[How to install ROMs for Realme C21](https://xdaforums.com/t/how-to-install-roms-for-realme-c21.4573873/)。LK 是 MediaTek 的 Little Kernel bootloader。

刷之前先再次備份原始版本：

```bash
sudo .venv/bin/python mtk.py r \
  lk,lk2 \
  backup/RMX3201_C19/lk-stock.bin,backup/RMX3201_C19/lk2-stock.bin

```

我只修改 `lk`，`lk2` 保留原廠版本：

```bash
sudo .venv/bin/python mtk.py w lk lk.bin

```

重新開機後，畫面出現：

```text
welcom to fastboot

```

拼字很有山寨味，不過 Fastboot 確實能用了。

在電腦上確認：

```bash
fastboot getvar unlocked
fastboot getvar product

```

結果：

```text
unlocked: yes
product: oppo6765

```

不過這個 modified LK 提供的 Fastboot 沒有 Pixel 原生 Fastboot 那麼順，有時會卡住。遇到這種情況，我得拔掉 USB、重新接上，再執行一次指令才會恢復正常。

## OrangeFox Recovery

我使用的 OrangeFox Recovery 來自這支影片：[YouTube](https://www.youtube.com/watch?v=GP2VhvBAwQY)，特別感謝影片作者提供檔案。

這次沒有直接在電腦上手動 `fastboot flash recovery`。我的實際做法是在 Android 裡使用 TWRP App，授予 Root 權限後，讓 App 自動把 OrangeFox 刷入 Recovery 分區。後面改用 APatch 時，我也繼續沿用 OrangeFox，直接從 Recovery 刷入 APatch patched image。

## Magisk Root

前面已經從手機讀出原廠 `boot.bin`，先推到手機：

```bash
adb push \
  backup/RMX3201_C19/parts/boot.bin \
  /sdcard/Download/boot.img

```

接著在 Magisk 裡選擇：

```text
Install
→ Select and Patch a File
→ boot.img

```

完成後會得到：

```text
magisk_patched-xxxxx.img

```

現在 Fastboot 已經能用，可以直接刷入：

```bash
fastboot flash boot magisk_patched-xxxxx.img
fastboot reboot

```

也可以透過 MTKClient 寫入：

```bash
sudo .venv/bin/python mtk.py w boot magisk_patched-xxxxx.img

```

如果無法開機，就把原廠 `boot` 刷回去：

```bash
sudo .venv/bin/python mtk.py w \
  boot \
  backup/RMX3201_C19/parts/boot.bin

```

驗證 Root：

```bash
adb shell su -c id

```

看到以下結果就完成了：

```text
uid=0(root)

```

## NeoZygisk 與 Vector

既然 C21 本來就是實驗機，我也沒打算停在 Magisk built-in Zygisk，而是另外測 NeoZygisk 和 Vector：

```text
Magisk
├── Built-in Zygisk OFF
├── NeoZygisk
└── Vector

```

我選 NeoZygisk，主要是想測它和 Vector／LSPosed 的相容性，以及它在 injection、mount namespace 和 trace hiding 上的做法。

設定上要注意：

```text
Magisk Built-in Zygisk OFF
NeoZygisk ON

```

我也沒有同時再裝 Zygisk Next，一台機器只留一套 Zygisk runtime。

Xposed 這邊使用 Vector，整體架構是：

```text
Magisk
   ↓
NeoZygisk
   ↓
Vector
   ↓
LSPosed Modules

```

目前安裝或準備測試的模組包括：

```text
Hide My Applist
NoStorageRestrict
App Settings Reborn
Core Patch
LuckyTool

```

## Hide My Applist

Hide My Applist 可以限制指定 App 查詢已安裝套件，例如隱藏 Magisk、Vector、Root App 或 Module Manager。

它當然擋不住所有 Root Detection；我主要拿它來看不同 App 會從哪些地方找 Root 痕跡。這台本來就不是銀行機，也不需要拿它冒險測銀行 App。

## NoStorageRestrict

Android 11 對以下目錄加了不少限制：

```text
/Android/data
/Android/obb

```

NoStorageRestrict 可以放寬 SAF 對這些目錄的限制，省掉我在 Android 11 上反覆跟 `/Android/data`、`/Android/obb` 權限打架。

## App Settings Reborn

App Settings Reborn 可以針對個別 App 調整：

```text
DPI
字體
解析度
語言
橫直向
全螢幕
保持螢幕常亮
通知

```

C21 的原生解析度不高，針對個別 App 調整 DPI 特別實用。

## Core Patch

Core Patch 主要用來測試：

```text
APK downgrade
Package Installer 限制
部分 Signature restriction

```

我只會關掉實驗需要的限制，不會一次停用所有安全檢查。

## LuckyTool

Realme 和 OPPO 都屬於 OPlus 系統，因此 LuckyTool 也適合拿來測：

```text
SystemUI
Launcher
狀態列
控制中心
電池
安裝器
截圖
OPlus Framework

```

新版 LuckyTool 主要照顧較新的 ColorOS。我的 C21 還停在 Android 11，所以只開確定能用的功能，不強行啟用不相容的項目。

## 補上類似 GrapheneOS 的網路控制

主力 Pixel 7a 跑 GrapheneOS 後，我已經很習慣它提供的 per-app Network permission。

Realme C21 的原廠 Android 11 沒有相同功能。`android.permission.INTERNET` 屬於 normal permission，不能像 Location 一樣直接 revoke，因此我改用：

```text
App Manager
+
AFWall+

```

### App Manager

App Manager 主要用來管理：

```text
Runtime Permission
AppOps
Activity
Service
Receiver
Provider
Background
Battery
Tracker

```

### AFWall+

網路存取交給 AFWall+。手機已經 Root，所以它可以透過 `iptables`／netfilter，按照 UID 阻擋封包。

例如在黑名單模式勾選某個 App 的 Wi-Fi、Mobile 和 VPN，就能直接禁止該 App 連外。

它和 GrapheneOS 的 Network permission 不是同一套機制，但對我這個需求來說結果夠直接：指定的 App 不准連外。

AFWall+ 也不會佔用 Android 的 VPN slot，對後面的軟路由用途很重要。

## 把 C21 當軟路由

目前我最常用到的功能，是把 C21 當成軟路由。

目標架構是：

```text
4G / Wi-Fi
   ↓
NekoBox / sing-box
   ↓
Android VPN
   ↓
VPN Hotspot
   ↓
Wi-Fi Hotspot
   ↓
其他裝置

```

Laptop、Tablet、TV 或另一支手機只要連上 C21 的 Hotspot，不需要個別設定 HTTP Proxy、SOCKS5 或 PAC，流量就能直接經過手機上的代理。

搭配 AFWall+，還能繼續控制：

```text
哪些 App 可以走 WAN
哪些 App 完全不能上網
哪些流量要經 VPN
哪些流量可以 bypass

```

C21 本身就有螢幕、電池、4G 和 Wi-Fi，還能直接跑 Android App，拿來當臨時閘道器很方便。

## 不登入 Google 帳號也能裝 App

這台是實驗機，我不太想登入自己的 Google 帳號。目前使用：

```text
Aurora Store
├── 匿名存取 Google Play

Droid-ify
├── F-Droid

Obtainium
└── GitHub / GitLab Release

```

Aurora Store 匿名登入後，大部分免費的 Play Store App 仍然可以直接下載，我也就不用把自己的 Google 帳號登入這台 C21。

## Magisk 階段的 C21 配置

在換成 APatch 以前，C21 大致維持這套配置：

```text
Magisk
├── NeoZygisk
└── Vector

Vector
├── Hide My Applist
├── NoStorageRestrict
├── App Settings Reborn
├── Core Patch
└── LuckyTool

Root Apps
├── App Manager
├── AFWall+
├── AdAway
├── Neo Backup
├── MMRL
└── Termux

Network
├── NekoBox / sing-box
└── VPN Hotspot

Stores
├── Aurora Store
├── Droid-ify
└── Obtainium

```

## 後來我把 Magisk 完全換成 APatch

Magisk 這套跑過一輪後，我沒有保留兩套 Root 方案交替使用，而是直接把 C21 換成 APatch。

目前使用的是：

```text
APatch: 0.13.3
VersionCode: 11224
```

這次是**完全換掉 Magisk**，不是兩邊並存。前面留下的原廠 `boot.bin`、MTKClient 寫回流程和救援方式則繼續保留，之後真的出問題時還有退路。

這次 APatch 的 patched image 也不是透過 Fastboot 或 MTKClient 寫入。我直接進 OrangeFox Recovery，選擇 APatch 產生的 image，將它刷到 `boot` 分區。

所以目前這台 C21 的 Root 切換流程，實際上是：

```text
原廠 boot image
   ↓
APatch patch
   ↓
APatch patched image
   ↓
OrangeFox Recovery
   ↓
刷入 boot 分區
   ↓
重新開機
```

### 第一個坑不是 Root，而是模組沒掛上去

APatch 本身取得 Root 沒有問題，但我進到模組頁後直接看到：

> APATCH 模組未掛載，因為未安裝元模組

這也是我第一次很明顯感覺到，APatch 的模組管理方式和原本熟悉的 Magisk 不太一樣。

最後我選的是 **Magic Mount-rs**，沒有再混用其他掛載後端。這也是目前 APatch 配置裡實際使用的 Metamodule。

目前的版本是：

```text
Name: Magic Mount-rs
ID: magic_mount_rs
Version: v4.0.8-900
VersionCode: 400008
Stat: September 3, 2026
Size: 2.92 MB
```

一台機器只留一套 Metamodule，之後真的遇到掛載問題時也比較好排查，不用先處理多套 mount backend 互相影響的可能。

### NeoZygisk 和 Vector 繼續留著

換到 APatch 後，我沒有把原本的 Zygisk／Xposed 測試環境整套砍掉。現在仍然是 NeoZygisk 搭配 Vector，只是最底層的 Root Manager 已經從 Magisk 換成 APatch。

目前這一層大致是：

```text
APatch
├── Magic Mount-rs
├── NeoZygisk
└── Vector
    └── LSPosed Modules
```

NeoZygisk 目前使用：

```text
Name: NeoZygisk
ID: zygisksu
Version: v2.4 (289-08080ef-release)
VersionCode: 289
Stat: August 31, 2026
Size: 1.53 MB
```

Vector 則是：

```text
Name: Vector
ID: zygisk_vector
Version: v2.2 (3080-88f8e1fa-JingMatrix-Vector)
VersionCode: 3080
Stat: August 31, 2026
Size: 15.41 MB
```

到目前為止，這套在 C21 上開機還算穩定。先不急著下「比 Magisk 穩」或「比 Magisk 好」這種結論，畢竟現在測的時間還不長，後面還要繼續觀察。

### 現在實際裝的 APatch Modules

目前 APatch 裡的模組清單如下。版本資訊直接照手機現在顯示的狀態記錄，之後如果更新，也比較容易回頭看是哪一版開始出問題。

#### Magic Mount-rs

```text
Name: Magic Mount-rs
ID: magic_mount_rs
Version: v4.0.8-900
VersionCode: 400008
Stat: September 3, 2026
Size: 2.92 MB
```

它現在是整套 systemless mount 的基底。

#### bindhosts

```text
Name: bindhosts
ID: bindhosts
Version: v2.1.5
VersionCode: 215
Stat: August 31, 2026
Size: 3.25 MB
```

這邊用來處理 hosts 類的系統層修改。

#### Daily Job Scheduler（DJS）

```text
Name: Daily Job Scheduler (DJS)
ID: djs
Version: v2021.12.14
VersionCode: 202112140
Stat: August 31, 2026
Size: 8.41 KB
```

#### Music Morphe

```text
Name: Music Morphe
ID: music-morphe-jhc-arm64
Version: v9.15.51 (patches 1.41.0.mpp)
VersionCode: 20221078
Stat: September 3, 2026
Size: 3.29 KB
```

#### Advanced Charging Controller（ACC）

```text
Name: Advanced Charging Controller (ACC)
ID: acc
Version: v2023.10.16
VersionCode: 202310160
Stat: September 1, 2026
Size: 294.61 KB
```

#### NeoZygisk

```text
Name: NeoZygisk
ID: zygisksu
Version: v2.4 (289-08080ef-release)
VersionCode: 289
Stat: August 31, 2026
Size: 1.53 MB
```

#### Vector

```text
Name: Vector
ID: zygisk_vector
Version: v2.2 (3080-88f8e1fa-JingMatrix-Vector)
VersionCode: 3080
Stat: August 31, 2026
Size: 15.41 MB
```

#### Universal GMS Doze

```text
Name: Universal GMS Doze
ID: universal-gms-doze
Version: 1.9.2
VersionCode: 192
Stat: September 1, 2026
Size: 7.03 KB
```

這份清單現在比較像「我真的在用什麼」，而不是看到什麼 Root 模組就全部塞進去。效能 tweak、thermal disable、scheduler 魔改這類東西我還是沒打算碰。

### APM 和 KPM 是兩條不同的路

APatch 另一個讓我想繼續玩的地方是 KPM。

APM 比較接近我原本熟悉的 Magisk Module：重點還是在 Android userspace（使用者空間）和 systemless modification。KPM 則是 KernelPatch Module，可以把程式碼放到 kernel space（核心空間）執行。

這也是我目前不急著亂裝 KPM 的原因。一般 hosts、Zygisk、LSPosed 或 systemless 修改，用現在這套 APM 就能處理，我沒有必要只因為 KPM 看起來比較底層，就把所有東西往 kernel 裡搬。

尤其 C21 是老 MTK。真要開始測 KPM，我會一次只碰一個，先確定能正常開機、正常卸掉，再往下一個走。

### APatch 跑下來和 Magisk 差在哪

目前最直接的差別不是「誰比較快」，而是整套東西拆分的方式。Magisk 的 Root、模組和 Zygisk 流程我已經很熟；APatch 這邊則多了一層 Metamodule，另外又把 APM 和 KPM 分開。

實際換過去之後，目前開機看起來還算穩定。至於長時間待機、重開次數增加、模組更新後會不會出現問題，這些還要再跑一陣子才知道。

所以現在的狀態比較像：**APatch 已經正式接手這台 C21，但結論先欠著。**

## 我不打算塞一堆效能模組

以前的 Root 文章很常安裝：

```text
RAM Booster
GPU Turbo
Thermal Disable
Swap Booster
Performance Engine

```

我現在對這類模組沒什麼興趣。

C21 使用的是 MT6765／Helio G35，再怎麼調，也改變不了它的硬體上限。

亂改 LMKD、thermal、scheduler、Power HAL 或 VM parameters，可能只讓短時間跑分變高，代價卻是發熱、降頻和耗電，實際操作未必更快。

我想從 Root 得到的是控制權，不是名稱很厲害但效果不明的 tweak。

## 從手機變成實驗板

Android 11、Helio G35 和舊版 Realme UI 已經不適合當我的日常手機，反而讓我可以放心把那些不想放上 Pixel 7a 的東西丟到它上面測。

第一次拿到 C21 時，我只把它當成一支 Android 手機。現在看到它，我想到的已經是 BootROM、Preloader、LK、AVB、Kernel、Framework、Zygote 到 App 這整條鏈。

這支人生第一台手機沒有真的退休，只是從日常手機變成了我的 Android 實驗板。
