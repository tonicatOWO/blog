---
title: Android Root 到底改了什麼：Magisk、KernelSU 與 APatch 的架構差異
description: >-
        重新拆解 Magisk、KernelSU 與 APatch 的 Root 架構，從 userspace、LKM 到
        kernel binary patch，理解三者到底是在什麼時間點把 Root 能力放進系統。
pubDate: 2026-09-19T00:00:00.000Z
heroImage: ../../assets/Magisk_KernelSU_APatch_root_framworkVS.png
---

前陣子在 Realme C21 上從 Magisk 換到 APatch 時，我其實只知道一件事：

Magisk 比較偏 userspace，APatch 是 kernel-based root。

這句不能說錯，但也沒解釋多少東西。

後來重新去看 Magisk、KernelSU 和 KernelPatch 的實作，我才發現比較好理解這三套 Root 的方式，不是看 Manager 長什麼樣，也不是看它能不能裝 Magisk
Module。

而是看：

```text
Root framework 到底在哪一層插進 Android boot chain？
```

目前我會把它們分成：

```text
Magisk
→ early userspace injection

KernelSU built-in
→ source-level kernel integration

KernelSU LKM
→ runtime kernel module loading

APatch
→ kernel binary patching
```

這樣一拆，三套東西就清楚很多。

## Root 不只是 `uid=0`

以前看到：

```bash
su -c id
```

輸出：

```text
uid=0(root)
```

很容易直接把 Root 理解成「把 App 的 UID 變成 0」。

但 Android 上真正能不能做事，還同時受到：

```text
UID / GID
Linux capabilities
SELinux domain
mount namespace
```

這些東西影響。

所以 Magisk、KernelSU、APatch 真正不同的地方，不只是「誰幫你變 UID
0」，而是誰掌握 privilege
control，以及這個控制點到底放在 userspace 還是 kernel。

## Magisk：先接管 Android early userspace

Magisk 並不是把一個 root daemon 塞到 Linux kernel 裡。

它主要動的是 boot image 裡的 ramdisk / init boot flow。

大概可以看成：

```text
Bootloader
    ↓
Linux Kernel
    ↓
ramdisk
    ↓
magiskinit
    ↓
early mount
SELinux policy patch
inject Magisk service
    ↓
stock Android init
    ↓
post-fs-data
    ↓
magiskd
    ↓
Android userspace
```

`magiskinit` 會取代原本 ramdisk 裡最先執行的
`init`，先處理 Magisk 自己需要的 mount、SELinux policy 和 service
injection，最後才繼續執行原本 Android `init`。

真正的 `magiskd` 則是在後面的 `post-fs-data` 階段才啟動。

所以我原本如果把它想成：

```text
kernel
 ↓
直接 inject uid 0 daemon
```

其實不太準。

比較像：

```text
Kernel 正常啟動

      ↓

Magisk 在 userspace 最前面
插進 init boot flow

      ↓

後面再由 magiskd
管理 su / module / root request
```

一般 App 要 Root 時，流程又比較接近：

```text
App
 ↓
su
 ↓
magisk_client
 ↓
magiskd
 ↓
root process
```

也就是 Root 的主要控制面仍然在 userspace。

這也是我目前最容易記 Magisk 的方式：

```text
Magisk
= early userspace interception
+ userspace root framework
```

## KernelSU：Root authority 直接往 kernel 裡移

KernelSU 就完全不同了。

它真正有意思的地方，是把 Root authorization / enforcement 放進 Linux kernel。

不過 KernelSU 現在至少要分兩種模式看。

## KernelSU built-in / GKI

如果是自己整合 KernelSU source，大概就是：

```text
Linux kernel source
       ↓
加入 KernelSU
       ↓
compile
       ↓
Kernel with KernelSU
```

這是很典型的：

```text
source-level integration
```

不是拿已經編譯好的 kernel binary 再往裡面硬塞東西。

官方 GKI mode 則是直接使用已經整合 KernelSU 的 Generic Kernel
Image 去取代原本 kernel。

所以從概念上來看：

```text
KernelSU built-in
= compile-time integration
```

## KernelSU LKM

但現在 KernelSU 還有 LKM mode。

這個就不需要直接把原 kernel 換掉。

大概是：

```text
stock kernel
    ↓
early boot
    ↓
ksuinit
    ↓
insmod kernelsu.ko
    ↓
KernelSU active
    ↓
stock init
```

KernelSU 自己的 boot 流程文件也直接寫：

```text
exec ksuinit
→ insmod kernelsu.ko
→ exec stock init
```

所以這種模式本質比較像：

```text
KernelSU LKM
= runtime kernel module integration
```

Kernel 本體本來沒有 KernelSU。

開機後把：

```text
kernelsu.ko
```

載進去，KernelSU 才開始工作。

因此 KernelSU 不能單純全部理解成：

> patch kernel source。

built-in 是。

LKM 不是。

## 那 APatch 到底算哪一種？

APatch 最有趣的地方就在這。

它也把 Root 放在 kernel space，但它既不是 KernelSU built-in 那種 source
integration，也不是 KernelSU LKM 那種 `insmod .ko`。

它走的是：

```text
binary patching
```

APatch 底下真正做這件事的是 KernelPatch。

官方自己的描述也很直接：只靠 stripped Linux kernel image，就能做 static kernel
image patch、runtime code loading、inline hook 和 syscall table hook。

所以：

```text
KernelSU built-in
kernel source
    ↓
compile
    ↓
new kernel
```

APatch 則是：

```text
already compiled
stock kernel binary
    ↓
KernelPatch
    ↓
patched kernel binary
```

這個差異才是 APatch 最有意思的地方。

## APatch 怎麼把 code 塞進已經編譯好的 kernel？

我一開始卡最久的是這裡。

因為「binary patch kernel」聽起來很抽象。

但直接去看 KernelPatch 的 `patch.c` 後，其實比想像中直白。

原本：

```text
kernel image

+--------------------------+
| Linux Kernel             |
|                          |
| ARM64 machine code       |
|                          |
+--------------------------+
```

KernelPatch 會先準備自己的：

```text
kpimg
```

接著建立新的 kernel image，把原始 kernel copy 過去，再把 `kpimg` 接在後面。

目前 source 裡可以直接看到類似：

```c
memcpy(out_kernel_file.kimg,
       pimg.kimg,
       ori_kimg_len);

memcpy(out_kernel_file.kimg + align_kimg_len,
       kpimg,
       kpimg_len);
```

所以 binary injection 這件事並沒有什麼魔法。

某種程度真的就是：

```text
Original

+----------------------+
| Stock Kernel         |
+----------------------+


Patched

+----------------------+
| Stock Kernel         |
+----------------------+
| alignment            |
+----------------------+
| KernelPatch kpimg    |
+----------------------+
```

但只有把 executable code 塞進去沒有用。

CPU 根本不會自己突然跑去執行後面那塊東西。

因此還有第二件事。

## 改 kernel entry 的 control flow

KernelPatch 會修改 kernel early boot 的 branch。

目前 patcher 裡可以看到：

```c
// modify kernel entry

int text_offset = align_kimg_len + SZ_4K;

b(
    (uint32_t *)(
        out_kernel_file.kimg +
        kinfo->b_stext_insn_offset
    ),
    kinfo->b_stext_insn_offset,
    text_offset
);
```

概念大概就是：

```text
原本：

kernel entry
    ↓
normal kernel boot
```

改成：

```text
kernel entry
    ↓
patched branch
    ↓
KernelPatch
    ↓
KernelPatch init
    ↓
normal kernel boot
```

這才完成真正的：

```text
binary code injection
+
control-flow redirection
```

我覺得看到這裡，APatch 就突然很好理解了。

它不是開機後拿什麼 daemon 去修改正在執行的 kernel。

而是 kernel 在被寫回 `boot.img` 前，就已經改好了。

## 那它怎麼知道 kernel function 在哪？

另外一個問題是：

沒有 kernel source，要怎麼知道：

```text
paging_init
kallsyms_lookup_name
sprintf
...
```

這些 function 在哪？

這就是 KernelPatch 為什麼很依賴：

```text
CONFIG_KALLSYMS
```

Kernel 裡的 kallsyms 還保留大量 kernel symbol 資訊。

KernelPatch 可以先分析 kernel image，把：

```text
symbol
→ binary offset
```

找出來。

目前 patcher 本身就會取得 `paging_init`、symbol lookup
anchor、`kallsyms_lookup_name` 等位置，再把需要的資訊寫入 KernelPatch 的 setup
data。

所以 APatch 不需要：

```text
完整 kernel source
```

也不代表它完全不需要知道 kernel 裡有什麼。

它只是把：

```text
source-level knowledge
```

換成：

```text
binary analysis
+
kallsyms
+
runtime lookup
```

## APatch 每次 reboot 都會重新 inject 嗎？

這也是我一開始搞混的地方。

答案是：

```text
不會重新 patch binary。
```

第一次安裝 APatch 時：

```text
stock boot.img
    ↓
extract kernel
    ↓
KernelPatch static patch
    ↓
patched kernel
    ↓
repack boot.img
    ↓
flash
```

KernelPatch 已經存在 boot partition 裡的 kernel image。

所以重新開機不是：

```text
boot
 ↓
APatch Manager
 ↓
重新 inject KernelPatch
```

而是：

```text
bootloader
    ↓
讀 boot partition
    ↓
載入「已經 patch 好」的 kernel
    ↓
patched kernel entry
    ↓
KernelPatch init
```

也就是：

```text
Install time
→ static patch

Every reboot
→ dynamic initialization
```

這兩件事情要分開。

reboot 之後 RAM 當然全部重新開始，所以：

```text
runtime hooks
allocated memory
task state
loaded runtime modules
```

都需要重新建立。

但放在 boot partition 裡的：

```text
patched kernel binary
```

沒有消失。

所以我現在比較喜歡講：

> APatch 的 KernelPatch 是「靜態植入、開機時動態初始化」。

## 那 APatch 跟 KernelSU LKM 到底像不像？

很像。

但只像在：

```text
兩邊最後都能讓 Root framework
直接存在 kernel space
```

實作方法其實完全不同。

KernelSU LKM：

```text
stock kernel
    ↓
boot
    ↓
load kernelsu.ko
    ↓
KernelSU
```

APatch：

```text
stock kernel binary
    ↓
offline binary patch
    ↓
KernelPatch becomes part of image
    ↓
boot
    ↓
KernelPatch executes
```

所以我現在會這樣分：

```text
KernelSU built-in
= compile-time injection

KernelSU LKM
= load-time injection

APatch KernelPatch
= binary-patch-time injection
```

## APatch 裡真正比較像 LKM 的其實是 KPM

這裡還有一個容易混的東西：

```text
KPM
= Kernel Patch Module
```

APatch 官方直接把 KPM 描述成類似 Loadable Kernel Module，可以讓 code 在 kernel
space 執行，並提供 inline hook、syscall table hook 等能力。

所以 APatch 可以再拆成：

```text
APatch
│
├── KernelPatch Core
│
│   binary patch 進 kernel
│
└── KPM
    │
    runtime loading
    │
    kernel-space module
```

KPM 並不是標準 Linux：

```text
module.ko
```

它有自己的 KernelPatch loader 和 API。

但如果只看概念：

```text
Linux LKM
→ runtime load kernel code

KPM
→ runtime load KernelPatch kernel code
```

反而是 KPM 跟 LKM 比較接近。

## SuperCall

APatch / KernelPatch 還有一個跟 Magisk 很不一樣的東西：

```text
SuperCall
```

KernelPatch 在 kernel 和 userspace 中間建立自己的 privileged interface。

userspace 要呼叫時，需要經過 SuperKey authentication。

概念上：

```text
userspace
   ↓
SuperCall
   ↓
SuperKey auth
   ↓
KernelPatch
   ↓
root / KPM / privileged operation
```

目前 KernelPatch 的 SuperCall implementation 裡就能看到 KPM
load、unload、control，以及其他 kernel-side operation。

這也是為什麼 APatch 不能只理解成：

```text
另一個 su manager
```

真正重要的是下面那套 KernelPatch framework。

## 三套放在一起

最後我現在腦中的圖大概長這樣：

```text
                    Android Root
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
    Magisk           KernelSU           APatch
       │                 │                 │
       ▼                 ▼                 ▼
 early userspace       kernel            kernel
       │                 │                 │
 magiskinit       ┌──────┴──────┐     KernelPatch
       │           │             │          │
 stock init     built-in        LKM      binary patch
       │           │             │          │
 magiskd       source/GKI   kernelsu.ko     │
       │                                     │
      su                              ┌──────┴──────┐
                                      │             │
                                  SuperCall        KPM
```

再縮成最短版本：

```text
Magisk
→ userspace

KernelSU built-in
→ patch / integrate source

KernelSU LKM
→ load .ko

APatch
→ patch compiled kernel binary

KPM
→ runtime KernelPatch module
```

我原本會把 KernelSU 和 APatch 都丟進「kernel root」這一類。

現在覺得這個分類還是不夠。

真正有意思的是：

```text
它是在什麼時間點，
用什麼方式，
把自己的 code 放進 kernel。
```

KernelSU built-in 是編譯時。

KernelSU LKM 是 kernel 啟動後載入 module。

APatch 則是在 kernel 啟動以前，直接把已經編譯好的 binary 改掉。

搞懂這件事後，再回去看 `boot.img`、KernelPatch、KPM，甚至之後想碰 kernel
hook，都不會再只剩下「反正它就是 kernel root」這種模糊印象。
