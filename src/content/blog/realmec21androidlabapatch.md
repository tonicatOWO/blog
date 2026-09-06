---
title: 把第一支智慧型手機變成 Android 實驗板：Realme C21 刷機、Root 與 APatch 實錄
description: >-
  從 MTKClient 解鎖 Realme C21、備份 GPT 與關鍵分區、找回 Fastboot，到
  Magisk、NeoZygisk、Vector，最後改用 APatch 與 Magic Mount RS。這篇記錄我把一支退役 C21 變成 Android
  實驗機的完整過程，以及一路踩過的坑。
pubDate: 2026-09-06T00:00:00.000Z
heroImage: ../../assets/AndroidToDevBoard.png
---

Realme C21 是我的第一支智慧型手機。

現在它早就退下主力位置了。日常使用的手機換成 Pixel 7a，C21 就算哪天真的被我刷到完全開不了機，也不會影響生活。

既然如此，不拿來亂搞反而有點浪費。

我不是第一次玩 Android 刷機。以前 Pixel 6a 也 Root 過，還刷過 GrapheneOS、LineageOS 和幾套衍生 ROM。Pixel 好處是 Google 有完整 Factory Image，真的玩壞了，大不了重新刷回去。

Realme C21 就完全不是這回事。

它沒有 Pixel 那套官方 Bootloader Unlock、Factory Image 和完整 Fastboot 流程。MediaTek 的 BROM、Preloader、GPT、LK、AVB 都得自己碰。

也就是因為這樣，我最後乾脆把它當成一塊有螢幕、電池、4G、Wi-Fi 和完整 Android 硬體的實驗板。

這一路先從 Bootloader Unlock、Magisk Root 開始，後來又換成 APatch，繼續測 NeoZygisk、Vector、網路控制和 systemless mount。

玩到最後，我連原廠 Realme UI 都不想留了。

於是下一步就是 GSI。

## 我的 Realme C21

這次使用的機器是：

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

這類舊 MTK 手機很適合拿來理解 Android 開機鏈。

Pixel 官方流程幫你藏掉不少東西，C21 則會逼你直接碰到 BROM、Preloader、Download Agent、GPT、`seccfg`、LK、AVB、Dynamic Partitions，以及後面的 Root、Zygisk、Treble 和 IMS。

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

如果 Linux 一直搶走 Preloader，可以先停掉 ModemManager，再卸載 `cdc_acm`：

```bash
sudo systemctl stop ModemManager
sudo modprobe -r cdc_acm
```

用完再恢復即可，不需要永久停用。

## 為什麼我最後全程都用 `mtk.py`

我平常習慣用 `uv` 管 Python 環境，原本也打算照辦。

但這次透過 `uv` 跑 MTKClient 時，一直拿不到 MediaTek USB 裝置。到底是哪一層權限沒處理好，我沒有繼續追。

改成：

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

再透過：

```bash
sudo .venv/bin/python mtk.py ...
```

就能正常使用。

我的想法很簡單：

> 我現在是要 Root 一台舊手機，不是要研究 Python packaging。

所以後面的 MTKClient 操作都統一用：

```bash
sudo .venv/bin/python mtk.py printgpt
sudo .venv/bin/python mtk.py r ...
sudo .venv/bin/python mtk.py w ...
sudo .venv/bin/python mtk.py e ...
sudo .venv/bin/python mtk.py da ...
```

MTKClient 也有 GUI：

```bash
python mtk_gui.py
```

但我的 USB 存取最後是靠 `sudo` 解決，因此執行：

```bash
sudo .venv/bin/python mtk_gui.py
```

Qt 很快就炸掉：

```text
Authorization required, but no authorization protocol specified

qt.qpa.xcb: could not connect to display :1
qt.qpa.plugin: From 6.5.0, xcb-cursor0 or libxcb-cursor0 is needed
to load the Qt xcb platform plugin.

qt.qpa.plugin: Could not load the Qt platform plugin "xcb" in ""
even though it was found.

This application failed to start because no Qt platform plugin
could be initialized.
```

問題不是 MTKClient 本身，而是 `sudo` 後沒有完整繼承我的 Wayland／X11 圖形環境。

要修還得繼續處理 `DISPLAY`、`XAUTHORITY` 和 Qt plugin。

我懶得修。

反正這種工具會直接改 GPT、Preloader、LK、NVRAM、`boot`、`vbmeta` 和 `seccfg`，我反而比較想把完整指令攤在終端機上看清楚。

例如：

```bash
mtk.py r boot boot.bin
mtk.py w lk lk.bin
mtk.py e metadata,userdata,md_udc
```

至少執行前還能再確認一次自己到底要動哪個分區。

## 第一個大坑：Handshake Failed

一開始最常看到的是：

```text
Preloader - [LIB]: Status: Handshake failed, retrying...
Port - Handshake failed after retries
```

原本我以為是 MTKClient 相容性或進入模式有問題。

後來開著：

```bash
sudo dmesg -w
```

才發現手機其實有正常枚舉：

```text
idVendor=22d9
idProduct=0006
Product: OPPO Preloader
```

也出現過：

```text
idVendor=0e8d
idProduct=20ff
Product: RMX3201
```

但 kernel 同時一直噴：

```text
device descriptor read/64, error -32
error -71
invalid wMaxPacketSize
Cannot enable. Maybe the USB cable is bad?
```

至少我這次的 Handshake Failed，有很大一部分只是 USB 連線問題。

換線、換 USB Port，避開奇怪的 Hub 後，終於看到：

```text
Port - Device detected :)
Preloader - Detected regular mode !

CPU: MT6765/MT8768t(Helio P35/G35)
HW code: 0x766
```

從這次之後，再看到 Handshake Failed，我會先檢查線、USB Port 和 `dmesg`，MTKClient 參數反而排後面。

## 從 Preloader 進 BROM

成功抓到手機後，一開始顯示：

```text
Detected regular mode
```

Target config：

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

原本看到這裡我以為失敗了。

但手機重新枚舉後，Target config 變成：

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

到這裡，才算真正進入可以直接讀寫 eMMC 的狀態。

## 先 `printgpt`，不要急著解鎖

第一件事不是 unlock，而是先看 GPT：

```bash
sudo .venv/bin/python mtk.py --debugmode printgpt
```

RMX3201 的 GPT 裡可以看到：

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

一些重要分區大小：

```text
lk       = 4 MiB
lk2      = 4 MiB
boot     = 32 MiB
seccfg   = 8 MiB
nvram    = 64 MiB
nvdata   = 64 MiB
```

這台使用 Dynamic Partitions，所以 GPT 不會直接看到 `system`、`vendor`、`product`。

它們都在 `super` 裡。

後面刷 GSI 時還會再碰到這件事。

## 備份比 Root 更重要

開始動任何東西前，先建備份目錄：

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

另外至少保留：

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

一次讀出：

```bash
sudo .venv/bin/python mtk.py r \
'seccfg,nvram,nvdata,nvcfg,proinfo,protect1,protect2,persist,boot,vbmeta,vbmeta_system,vbmeta_vendor,lk,lk2,recovery' \
'backup/RMX3201_C19/parts/seccfg.bin,backup/RMX3201_C19/parts/nvram.bin,backup/RMX3201_C19/parts/nvdata.bin,backup/RMX3201_C19/parts/nvcfg.bin,backup/RMX3201_C19/parts/proinfo.bin,backup/RMX3201_C19/parts/protect1.bin,backup/RMX3201_C19/parts/protect2.bin,backup/RMX3201_C19/parts/persist.bin,backup/RMX3201_C19/parts/boot.bin,backup/RMX3201_C19/parts/vbmeta.bin,backup/RMX3201_C19/parts/vbmeta_system.bin,backup/RMX3201_C19/parts/vbmeta_vendor.bin,backup/RMX3201_C19/parts/lk.bin,backup/RMX3201_C19/parts/lk2.bin,backup/RMX3201_C19/parts/recovery.bin'
```

最後做 checksum：

```bash
find backup/RMX3201_C19 -type f \
  -exec sha256sum {} \; \
  > backup/RMX3201_C19/SHA256SUMS
```

尤其是：

```text
preloader
nvram
nvdata
nvcfg
proinfo
```

這些我只留自己手機讀出來的版本。

不會拿另一台手機的檔案硬刷。

Pixel 有官方 Factory Image 可以救，MTK 的校正資料和裝置專屬資料一旦弄丟，下載一包 ROM 不一定補得回來。

這些備份我至少留兩份，一份在電腦，一份在 NAS。

## 解鎖 Bootloader

GPT 裡有：

```text
metadata
userdata
md_udc
```

先清除：

```bash
sudo .venv/bin/python mtk.py e metadata,userdata,md_udc
```

這一步會清掉手機資料。

成功後：

```text
All partitions formatted.
```

接著處理 `seccfg`：

```bash
sudo .venv/bin/python mtk.py da seccfg unlock
```

結果：

```text
XFlashExt - Detected V4 Lockstate
SecCfgV4 - hwtype found: V4

DaHandler - [LIB]: Device is already unlocked
```

MTKClient 讀到的 `seccfg` 已經是 unlocked state。

## AVB 與 dm-verity

這部分是我後來真的碰到開機問題才處理，不是看到別人做就照抄。

先清除 `cache`：

```bash
sudo .venv/bin/python mtk.py e cache
```

再執行：

```bash
sudo .venv/bin/python mtk.py da vbmeta 3
```

輸出：

```text
Dumping partition "vbmeta"
Patching vbmeta
Patching verification + verity
Writing partition "vbmeta"

Successfully patched vbmeta :)
```

這一步關閉 AVB verification 和 verity。

Android 開機後確認：

```bash
adb shell getprop ro.boot.flash.locked
adb shell getprop ro.boot.vbmeta.device_state
adb shell getprop ro.boot.verifiedbootstate
```

我的結果可以看到：

```text
ro.boot.flash.locked = 0
ro.boot.verifiedbootstate = orange
```

Bootloader 已經解鎖。

## Bootloader 解了，Fastboot 還是沒有

執行：

```bash
adb reboot bootloader
```

手機卻直接重新進 Android。

C21 的 Bootloader 雖然已經 unlock，原廠 LK 還是沒有把 Fastboot 開出來。

因此我改用 XDA 討論串提供的 modified LK：

[How to install ROMs for Realme C21](https://xdaforums.com/t/how-to-install-roms-for-realme-c21.4573873/)

刷之前再次備份：

```bash
sudo .venv/bin/python mtk.py r \
  lk,lk2 \
  backup/RMX3201_C19/lk-stock.bin,backup/RMX3201_C19/lk2-stock.bin
```

我只修改 `lk`，`lk2` 保留原廠：

```bash
sudo .venv/bin/python mtk.py w lk lk.bin
```

重新開機後，畫面出現：

```text
welcom to fastboot
```

拼字很有山寨味，不過 Fastboot 確實能用了。

確認：

```bash
fastboot getvar unlocked
fastboot getvar product
```

結果：

```text
unlocked: yes
product: oppo6765
```

這套 modified LK 的 Fastboot 沒有 Pixel 那麼穩。

有時會卡住，拔掉 USB 再接一次才恢復。

但至少有 Fastboot 了。

## OrangeFox Recovery

OrangeFox Recovery 來自這支影片：

[YouTube](https://www.youtube.com/watch?v=GP2VhvBAwQY)

這次我沒有在電腦上直接 `fastboot flash recovery`。

實際做法是在 Android 裡用 TWRP App，給 Root 權限後讓它自動把 OrangeFox 寫進 Recovery。

後來換 APatch 時，我也繼續使用 OrangeFox。

## Magisk Root

前面已經把原廠 `boot.bin` 備份出來，先推進手機：

```bash
adb push \
  backup/RMX3201_C19/parts/boot.bin \
  /sdcard/Download/boot.img
```

在 Magisk 裡：

```text
Install
→ Select and Patch a File
→ boot.img
```

完成後得到：

```text
magisk_patched-xxxxx.img
```

有 Fastboot 後可以直接：

```bash
fastboot flash boot magisk_patched-xxxxx.img
fastboot reboot
```

也可以繼續用 MTKClient：

```bash
sudo .venv/bin/python mtk.py w boot magisk_patched-xxxxx.img
```

真的開不了機，就把 stock boot 寫回去：

```bash
sudo .venv/bin/python mtk.py w \
  boot \
  backup/RMX3201_C19/parts/boot.bin
```

驗證 Root：

```bash
adb shell su -c id
```

看到：

```text
uid=0(root)
```

Magisk Root 就完成了。

## Magisk 階段的 Zygisk 與 Xposed

C21 本來就是實驗機，所以我沒有停在 Magisk 內建 Zygisk。

當時使用：

```text
Magisk
├── Built-in Zygisk OFF
├── NeoZygisk
└── Vector
```

NeoZygisk 負責 Zygisk runtime，Vector 則接 LSPosed Modules。

整體是：

```text
Magisk
   ↓
NeoZygisk
   ↓
Vector
   ↓
LSPosed Modules
```

測過或使用的模組包括：

```text
Hide My Applist
NoStorageRestrict
App Settings Reborn
Core Patch
LuckyTool
```

Hide My Applist 主要拿來觀察不同 App 怎麼找 Root 痕跡。

NoStorageRestrict 則是處理 Android 對 `/Android/data` 和 `/Android/obb` 的限制。

App Settings Reborn 可以針對個別 App 改 DPI、語言、方向、全螢幕和通知等設定。

Core Patch 用來測 APK downgrade、Package Installer 和部分 Signature restriction。

LuckyTool 則因為 Realme／OPPO 都屬於 OPlus 系統，可以拿來碰 SystemUI、Launcher 和 OPlus Framework 相關修改。

我沒有把這台當銀行機，所以這些東西就是單純拿來測。

## Root 之後，我拿 C21 做什麼

主力 Pixel 7a 跑 GrapheneOS 後，我很習慣它的 per-app Network permission。

Realme C21 原廠 Android 11 沒有同一套東西。

所以我改用：

```text
App Manager
+
AFWall+
```

App Manager 負責 Runtime Permission、AppOps、Activity、Service、Receiver、Provider、Background、Battery 和 Tracker。

AFWall+ 則透過 `iptables`／netfilter 按 UID 控制網路。

因為它不佔 Android VPN slot，後面還能跟 VPN Hotspot 一起用。

### 把 C21 當軟路由

目前我很喜歡的一種玩法是：

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

Laptop、Tablet、TV 或另一支手機只要連 C21 Hotspot，就可以直接走手機上的代理。

搭配 AFWall+，還能控制哪些 App 能直接上 WAN、哪些走 VPN、哪些完全不能連外。

這台手機本身就有螢幕、電池、4G 和 Wi-Fi，拿來當臨時 Gateway 很方便。

### 不登入 Google 帳號也能裝 App

這台既然是實驗機，我不太想登入自己的 Google 帳號。

所以當時使用：

```text
Aurora Store
Droid-ify
Obtainium
```

Aurora Store 匿名存取 Google Play，Droid-ify 處理 F-Droid，Obtainium 則直接跟 GitHub／GitLab Release。

## 後來我把 Magisk 換成 APatch

Magisk 這套跑過一輪後，我沒有讓兩套 Root 並存。

我直接把 C21 換成 APatch。

當時使用：

```text
APatch: 0.13.3
VersionCode: 11224
```

APatch patched image 也不是透過 Fastboot 或 MTKClient 寫入。

我直接進 OrangeFox，把 APatch 產生的 image 刷進 `boot`。

流程是：

```text
原廠 boot image
   ↓
APatch patch
   ↓
APatch patched image
   ↓
OrangeFox Recovery
   ↓
boot
```

## APatch 的第一個坑：Metamodule

APatch 本身取得 Root 沒有什麼問題。

但進模組頁後，很快就看到：

> APATCH 模組未掛載，因為未安裝元模組

這也是我從 Magisk 換到 APatch 後，第一個明顯感受到架構差異的地方。

APatch 能拿到 Root，不代表 APM 就會自動完成 systemless mount。

這一層還要處理 Metamodule，而且 Metamodule 自己也會有裝置和 ROM 的相容性問題。

我一開始使用：

[Mountify](https://github.com/backslashxx/mountify)

但實際裝到這台 Realme C21 後，至少在我目前這套環境下，Mountify 沒有辦法正常工作。

我沒有繼續硬修。

直接換成：

[Hybrid Mount](https://github.com/YuzakiKokuban/meta-hybrid_mount)

Hybrid Mount 裝好後，我把掛載策略設成：

```text
Overlay 優先
```

重新開機，再檢查原本的 APatch Modules，這次就能正常掛載與運作了。

所以這台 C21 實際走過的是：

```text
APatch
   ↓
Mountify
   ↓
目前環境不相容
   ↓
Hybrid Mount
   ↓
Overlay 優先
   ↓
APatch Modules 正常掛載
```

最後保留下來的 Root 架構是：

```text
APatch
├── Hybrid Mount
│   └── Overlay 優先
├── NeoZygisk
└── Vector
    └── LSPosed Modules
```

這裡我不會直接下「Hybrid Mount 比 Mountify 好」這種結論。

我沒有在其他裝置和 ROM 上做足夠測試。

目前能確定的只有：

Mountify 在我這組 RMX3201 環境下沒有正常工作；換成 Hybrid Mount，並以 Overlay 為優先後，APatch Modules 才正常掛上。

這種失敗路線我反而覺得值得記。

只記最後裝了什麼，過幾個月回頭看，很容易忘記當初為什麼換掉前一套。

## APM 和 KPM

APatch 另一個讓我想繼續玩的地方是 KPM。

APM 比較接近原本熟悉的 Magisk Module，重點還是在 Android userspace 和 systemless modification。

KPM 則是 KernelPatch Module，可以直接讓程式碼進 kernel space 執行。

我目前沒有因為 KPM 看起來比較底層，就把什麼都往 kernel 裡塞。

一般 hosts、Zygisk、LSPosed 和 systemless 修改，用 APM 就能做。

C21 又是老 MTK。

真要開始玩 KPM，我會一次只測一個，先確認能開機、能正常卸掉，再繼續。

## 我不打算塞一堆效能模組

以前 Root 文章很常看到：

```text
RAM Booster
GPU Turbo
Thermal Disable
Swap Booster
Performance Engine
```

我現在對這類模組沒什麼興趣。

C21 就是 MT6765／Helio G35。

再怎麼調，也改不了硬體上限。

亂改 LMKD、thermal、scheduler、Power HAL 或 VM parameters，有可能只是短時間 benchmark 比較漂亮，實際代價卻是溫度、降頻、耗電或奇怪的不穩定。

我想從 Root 拿到的是控制權，不是名字很厲害但效果不明的 tweak。

## 下一步：乾脆連 Realme UI 都換掉

Root、APatch、Zygisk 和 systemless mount 都跑過一輪後，我開始覺得只改底層還不夠。

Realme UI 2.0 本身才是我每天看到、也最想換掉的東西。

原廠系統對我來說實在太臃腫。

一些很基本的 native app，也會帶著我根本不需要的網路功能、推薦、廣告或額外服務。

尤其 File Manager。

我只想要瀏覽、複製、移動、刪除和重新命名本機檔案。

不是打開一個檔案管理器，還得先想它為什麼要連網。

Bootloader 都已經解了，那乾脆連 Android system 一起換掉。

我想要的很單純：更接近 AOSP、沒有系統廣告，也不要替我預裝一堆背景服務。

最後選的是 LineageOS Android 16 GSI。

這個階段的環境：

```text
Kernel: Linux 4.19.127
GSI: LineageOS 23.2
Android: Android 16
Architecture: arm64-ab
```

實際 image：

```text
LineageOS-23.2_GSI_treble_arm64-ab-VANILLA-20260603.img
```

## LineageOS Treble

這次能在 Android 11 時代的 MTK 裝置上把 Android 16 GSI 跑到這個程度，很大一部分要感謝 Doze-off 的 LineageOS Treble 專案和 Treble 社群。

專案：

[Doze-off / lineage_treble](https://github.com/Doze-off/lineage_treble)

這個專案除了 LineageOS GSI 本身，也整合了不少 TrebleDroid／PHH 的相容性處理，包括 device overlay、舊 vendor compatibility、BPF、hotspot、fingerprint、storage、IMS 和各種 vendor-specific fixes。

對這種：

```text
Android 16 system
+
Android 11 vendor
+
MediaTek proprietary stack
```

的組合來說很重要。

少了這些 compatibility layer，system 和舊 vendor 之間更容易出現各種奇怪的相容性問題。

後面碰到的亮度和 IMS，其實就是很典型的例子。

## Helio G35 跑 Android 16 的實際體感

原本看到：

```text
Helio G35
+
Android 16
```

我沒有抱太大期待。

但實際裝完意外地不差。

比較明顯的卡頓主要發生在剛登入系統、輸入 PIN 附近。

進到桌面後，App 啟動、切換、通知欄、設定、瀏覽器和一般動畫都比我預期順很多。

有些時候甚至覺得比 Realme UI 更俐落。

這裡沒有做 benchmark，所以我不會直接說是因為少了哪些 OEM service 才變快。

至少實際操作的體感就是如此。

不過剛刷完，馬上就碰到兩個很明顯的問題：

1. 螢幕亮度拉到 100% 還是非常暗。
2. LTE、Mobile Data、SMS 都正常，但電話不能打。

## 第一個問題：亮度 100%，sysfs 卻只有 255

剛刷好 LineageOS 時，亮度拉到：

```text
100%
```

螢幕還是明顯偏暗。

先從 Android framework 看：

```text
Display Brightness = 1.0
mScreenBrightness = 1.0
mActualBacklight = 1.0
mLatestIntBrightness = 255
```

也就是 framework 自己認為現在已經是最大亮度。

因此先排除 Battery Saver、Extra Dim、Auto Brightness 和 framework brightness limit。

接著看 kernel backlight：

```bash
cat /sys/class/leds/lcd-backlight/max_brightness
```

結果：

```text
4095
```

Realme C21 的背光硬體 range 實際是：

```text
0 ~ 4095
```

也就是 12-bit。

但把 Android 亮度設成最大：

```bash
adb shell cmd display set-brightness 1.0
adb shell "cat /sys/class/leds/lcd-backlight/brightness"
```

得到：

```text
255
```

問題已經很明顯。

Android 這邊送的是：

```text
0 ~ 255
```

Kernel backlight 要的是：

```text
0 ~ 4095
```

中間少了正確的 scaling。

所以 Android 所謂的最大亮度：

```text
255 / 4095
≈ 6.23%
```

對硬體來說其實只用了很小一部分 range。

## 確認不是 panel 或 kernel 壞掉

直接繞過 Android framework，把最大值寫進 sysfs：

```bash
adb shell "su -c 'echo 4095 > /sys/class/leds/lcd-backlight/brightness'"
```

螢幕立刻恢復正常亮度。

所以 panel、背光硬體和 kernel driver 都能正常工作。

問題落在：

```text
Android
→ Lights HAL
→ Backlight
```

這段 mapping。

這台使用的 Lights service 是：

```text
android.hardware.lights-service.mediatek
```

把 vendor binary 抽出來後，也能直接找到：

```text
/sys/class/leds/lcd-backlight/brightness
```

也就是 Android 16 GSI 與原廠 MTK 12-bit backlight range 沒有正確對上。

## 最後根本不用 patch

原本我已經開始往 Lights HAL binary patch 的方向查。

結果最後發現根本不用。

進：

```text
Treble Settings
→ Misc features / Backlight
```

打開：

```text
Force alternative backlight scale
Set linear brightness curve
```

依設定提示關閉再重新打開螢幕後，亮度就正常了。

真正處理 range mismatch 的是：

```text
Force alternative backlight scale
```

它把原本 Android 的 0～255 重新映射到硬體的 0～4095。

`Set linear brightness curve` 則是另一回事。

它主要影響亮度 slider 的曲線，不是解決 255／4095 這個 range mismatch。

所以兩者要分開看：

```text
Force alternative backlight scale
→ 修正硬體 brightness scale

Set linear brightness curve
→ 調整亮度曲線
```

這個問題最後完全不需要改 kernel。

## 第二個問題：LTE 和 SMS 正常，但不能打電話

亮度修好後，大部分功能都正常：

```text
SIM Detection
4G / LTE
Mobile Data
SMS
Wi-Fi
Bluetooth
```

但 Voice Call 不行。

SIM 能讀、LTE 能連、Data 能跑、SMS 能收發，代表 modem 和基本 RIL 並沒有整體失效。

所以我開始往 IMS／VoLTE 查。

## MTK VoLTE daemon 都還活著

先看 process：

```bash
adb shell ps -A | grep -Ei 'volte|ims'
```

可以看到：

```text
volte_md_status
volte_imsm_93
volte_stack
volte_ua
volte_imcb
```

再看 property：

```bash
adb shell getprop | grep -Ei 'ims|volte|mims'
```

也有：

```text
persist.vendor.ims_support=1
persist.vendor.mims_support=2
persist.vendor.mtk.volte.enable=1
persist.vendor.mtk_dynamic_ims_switch=1
persist.vendor.volte_support=1
ro.vendor.md_auto_setup_ims=1
ro.vendor.mims_support=2
```

至少 vendor 端的 VoLTE daemon 和 IMS support property 都在。

所以我接著查 Android framework 這一側有沒有 IMS implementation。

## 真正缺的是 `com.mediatek.ims`

執行：

```bash
adb shell pm list packages -f | grep -Ei \
'com\.mediatek\.ims|me\.phh\.ims|ims'
```

LineageOS 裡已經有：

```text
ImsServiceEntitlement
treble-overlay-telephony-mtk-ims.apk
treble-overlay-telephony-hw-ims.apk
```

但沒有：

```text
com.mediatek.ims
```

也就是 overlay 在，真正負責跟 MTK proprietary IMS stack 溝通的 implementation 不在。

大概是：

```text
Android Telephony
        ↓
MTK IMS Overlay
        ↓
com.mediatek.ims
        ↓
MTK vendor IMS stack
```

中間少了一層。

## 補上 MTK IMS 後，電話恢復

這台的：

```text
/system/framework/services.jar
```

裡存在：

```text
PackageManagerServiceUtils.PHH_SIGNATURE
```

因此使用：

```text
ims-mtk-u-resigned.apk
```

直接安裝：

```bash
adb install -r ims-mtk-u-resigned.apk
```

結果：

```text
Performing Streamed Install
Success
```

確認 package：

```bash
adb shell pm path com.mediatek.ims
```

可以看到：

```text
package:/data/app/.../com.mediatek.ims.../base.apk
```

接著確認 Telephony 是否真的 bind：

```bash
adb shell dumpsys activity services com.mediatek.ims
```

可以看到：

```text
com.mediatek.ims/.MtkDynamicImsService
```

以及：

```text
requested=true
received=true
hasBound=true
```

再查 Binder service：

```bash
adb shell service check mtkIms
```

得到：

```text
Service mtkIms: found
```

這時直接打一通電話。

可以正常打了。

真正讓通話恢復的改動只有補上：

```text
com.mediatek.ims
```

沒有修改 modem，也沒有給 IMS Root。

## 中途刷過 AxionOS

排查 IMS 時，我一度懷疑 LineageOS 23.2 這個 build 是不是少了一些比較新的 MTK compatibility patch。

因此中途也刷過：

```text
AxionOS 2.8 GSI
```

拿來做對照。

Axion 的 Treble base 有一些較新的 legacy vendor compatibility、MTK RadioEx 和 SELinux compatibility 處理，所以當時想看看它能不能直接改善 IMS。

結果裝到 C21 上後，反而碰到另一個更直接的問題。

網路有異常。

系統本身能開，也還能繼續做 Telephony／IMS 測試，但實際使用時連：

```text
google.com
```

都無法正常打開。

對我來說這就不適合留著當日常系統。

所以 AxionOS 這次只是短暫的 compatibility 對照測試。

測完後我就刷回 LineageOS。

## IMS 還有一個 SELinux compatibility bug

雖然電話已經正常，但 debugging 過程還發現一個真正存在的 SELinux／property mismatch。

`com.mediatek.ims` 第一次啟動時會出現：

```text
FATAL EXCEPTION: main
Process: com.mediatek.ims
```

原因是：

```text
java.lang.RuntimeException:
failed to set system property
"vendor.ril.imsconfig.force.notify"
to "1"
```

所以：

```bash
adb shell dumpsys activity services com.mediatek.ims
```

可能會看到：

```text
restartCount=1
crashCount=1
```

但 framework 後面會重新啟動 IMS。

第二次之後又能看到：

```text
requested=true
received=true
hasBound=true
```

同時：

```bash
adb shell service check mtkIms
```

仍然是：

```text
Service mtkIms: found
```

實際 Voice Call 也正常。

所以這個 SELinux／property mismatch 確實存在，但它不是這次不能打電話的主因。

真正缺的是：

```text
com.mediatek.ims
```

## Stock `precompiled_sepolicy` 反而變成答案本

這台現在的組合其實很奇怪：

```text
Android 16 LineageOS system
+
Android 11 Realme / MTK vendor
```

C.19 vendor 裡還留著：

```text
/vendor/etc/selinux/precompiled_sepolicy
```

那是原廠 stock system 和 vendor 時代產生的 merged SELinux policy。

刷 GSI 後，現在實際使用的 policy 已經不是直接拿它來跑。

而是：

```text
LineageOS Android 16 policy
+
C.19 vendor CIL
+
Treble compatibility mapping
→ compile
```

不過原廠的 `precompiled_sepolicy` 反而因此變成很好用的答案本。

可以拿來反查原廠對 MTK IMS property、radio domain 和 vendor service 原本怎麼授權。

這也是 GSI debugging 很有趣的一部分。

## 換掉預設 Launcher

系統問題處理得差不多後，我也沒有繼續使用預設 Launcher。

最後換成：

[µLauncher](https://github.com/jrpie/launcher)

F-Droid：

[µLauncher on F-Droid](https://f-droid.org/packages/de.jrpie.android.launcher/)

它的首頁非常簡單，基本只留下時間、日期和桌布。

其他 App 靠 App List 或手勢開啟，手勢也能綁 Favorite Apps、音量、上一首／下一首、鎖定螢幕、手電筒、通知欄和 Quick Settings。

對現在這台 C21 很適合。

我就是想要一個沒有新聞、沒有推薦、沒有廣告，也不需要一直整理 icon 的桌面。

## 現在這台 C21 的狀態

最後保留下來的是：

```text
LineageOS 23.2
Android 16
```

目前實測：

```text
Boot                 正常
Display Brightness   正常
Wi-Fi                正常
Bluetooth            正常
Dual SIM             正常
Mobile Data          正常
SMS                  正常
MTK IMS              正常
Outgoing Call        正常
Voice Call           正常
```

桌面則是 µLauncher。

登入、輸入 PIN 附近偶爾還是會有一小段卡頓，但進到桌面後，大多數使用場景都很順。

對一台 2021 年、Helio G35、原廠 Android 11 的入門手機來說，我已經很滿意。

## RMX3201 GSI 排錯速查

如果其他 MTK GSI 也碰到類似問題，我現在會先看這幾件事。

### 亮度異常低

先看：

```bash
cat /sys/class/leds/lcd-backlight/max_brightness
```

再把 Android 亮度設最大：

```bash
adb shell cmd display set-brightness 1.0
adb shell "cat /sys/class/leds/lcd-backlight/brightness"
```

如果看到：

```text
max_brightness = 4095
actual         = 255
```

先進：

```text
Treble Settings
→ Backlight
→ Force alternative backlight scale
```

不要第一時間 patch kernel。

### LTE／SMS 正常，但不能打電話

先看有沒有：

```bash
adb shell pm list packages | grep com.mediatek.ims
```

如果沒有 `com.mediatek.ims`，先處理 IMS implementation。

安裝後確認：

```bash
adb shell pm path com.mediatek.ims
adb shell service check mtkIms
```

正常應該看到：

```text
Service mtkIms: found
```

再：

```bash
adb shell dumpsys activity services com.mediatek.ims
```

找：

```text
requested=true
received=true
hasBound=true
```

然後不要只盯 log。

直接實際打一通電話。

至少在 RMX3201／C.19 vendor 上，`crashCount=1` 不代表後面的 IMS 一定不能工作。

## 從第一支智慧型手機變成 Android 實驗板

第一次拿到 C21 時，我只把它當成一支 Android 手機。

現在看到它，我想到的已經是：

```text
BootROM
Preloader
Download Agent
GPT
LK
AVB
Kernel
Framework
Zygote
Treble
Lights HAL
IMS
SELinux
```

這整條鏈。

一路從 MTKClient 解鎖、找回 Fastboot、Magisk、APatch、Metamodule，再到 Android 16 GSI、12-bit backlight 和 MediaTek IMS，很多原本看起來像「手機壞了」的問題，最後其實只是某一層沒有接上。

亮度問題最後不需要 patch kernel。

只是：

```text
Android 0 ~ 255
→
Hardware 0 ~ 4095
```

中間少了正確 scaling。

電話問題表面上可以一路懷疑 modem、RIL、RadioEx、CarrierConfig 和 SELinux。

真正讓它恢復的關鍵卻只是：

```text
com.mediatek.ims
```

APatch 也一樣。

Root 能用，不代表 systemless mount 就一定能用；Mountify 在這組環境下不行，換成 Hybrid Mount 並以 Overlay 優先後才正常掛上。

這支人生第一台智慧型手機沒有真的退休。

只是從日常手機，變成了我的 Android 實驗板。
