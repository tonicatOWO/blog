---
title: Vless+XTLS-Reality 與 3x-ui 配置代理教學
description: 介紹整個部署過程以及踩坑記錄
pubDate: 2026-08-08T00:00:00.000Z
heroImage: ../../assets/xray+3xuivlessWithReality-proxySetup.png
---

自己架了一陣子 REALITY，全程用 3x-ui 一鍵部署，配置也都在面板上處理。

中間踩的坑比想像中多。而且我後來發現，**面板使用者踩的坑跟手寫 config 的人根本不是同一批**
— 網路上大部分教學是給後者寫的，看了幫助有限。

這篇是我自己的筆記。

## 版本基準

欄位名稱以 **Xray-core v26.7.28**
的官方文件為準。REALITY 的 schema 在 2025–2026 改過名，2023 年那批 `v1.8.x`
世代的文章欄位已經對不上了。

| 項目             | 撰寫時                                                    | 來源                                                                 |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| Xray-core        | `v26.7.28`（2026-07-28，掛 Pre-release）                  | [releases](https://github.com/XTLS/Xray-core/releases)               |
| 3x-ui            | releases 列表看得到 `v3.6.0`（GitHub 頁面快取有落差）     | [releases](https://github.com/MHSanaei/3x-ui/releases)               |
| REALITY schema   | `target` / `password` / `mldsa65Seed`                     | [官方文件](https://xtls.github.io/en/config/transports/reality.html) |
| transport schema | `method` 取代 `network`，`rawSettings` 取代 `tcpSettings` | [官方文件](https://xtls.github.io/en/config/transport.html)          |

面板上不會直接看到這些欄位名，但**你在 JSON 分頁裡看到的、或是排錯時 log 吐出來的，全部是這套新的**。所以還是要知道。

---

## 1. REALITY 在幹嘛

簡單概要：server 在 TLS 握手時**冒充一個真實網站**，握手特徵跟直連那個網站沒差別。驗證過的 client 升級成 proxy，驗證失敗的流量原封不動轉發給那個真實網站。

[官方文件](https://xtls.github.io/en/config/transport.html)寫明 REALITY 只能配
`RAW`、`XHTTP`、`gRPC` 三種 transport。所以面板 Transmission 下拉選單裡的 ws /
httpupgrade / mkcp，選了之後 Security 就沒有 reality 可選，不是 bug。

| 方案                         | 要域名 | 要憑證           | 抗主動探測              |
| ---------------------------- | ------ | ---------------- | ----------------------- |
| VLESS + TLS + 自有域名       | 要     | 要               | 中（憑證 SAN 會被關聯） |
| VLESS + REALITY              | 不要   | 不要（借別人的） | 高                      |
| VLESS + Encryption（無 TLS） | 不要   | 不要             | 低                      |

第三個是 protocol 層加密，官方自己說它「沒有一般 HTTPS 的外觀，不適合直接用於審查規避」。面板上 VLESS 的 Encryption 欄位跟 Security 的 reality
**是兩件事**，我一開始搞混過。用了 REALITY 就不用再開 Encryption。

---

## 2. 部署

### 2.1 前置

```bash
apt update && apt install -y curl ca-certificates chrony
systemctl enable --now chrony
timedatectl set-ntp true
```

時間同步不是可選的。REALITY 有 `maxTimeDiff`
檢查，VPS 時鐘飄掉會**沒有任何錯誤訊息**地握手失敗。我為了這個查了兩小時。

### 2.2 一鍵

```bash
# 最新 stable
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)

# 釘版本，我現在都這樣裝，理由在 §6.7
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh) v3.6.0

# rolling dev build，不是 stable
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh) dev-latest
```

裝的過程會隨機產生 username、password 跟 web base
path，**印出來那次不記下來後面要用 `x-ui` 選單重設**。之後隨時打 `x-ui`
開管理選單。

要 cloud-init 就設 `XUI_NONINTERACTIVE=1`，全程零提示裝完，憑證寫到
`/etc/x-ui/install-result.env`。

### 2.3 面板本身先鎖起來（建議）

Web
panel 是整台機器最大的攻擊面。一鍵裝完它預設就掛在公網上，這件事優先於所有 inbound 設定。

我用最省事的那個：面板 `Listen IP` 設
`127.0.0.1`，外面完全掃不到，要用的時候開 tunnel。

```bash
ssh -N -L 2053:127.0.0.1:2053 root@<server-ip>
```

不想每次開 tunnel 的話，至少要 TLS + 隨機 base path + 2FA + fail2ban。

3x-ui 的 wiki 自己寫「本專案僅供個人使用，請勿用於非法用途或 production 環境」。它是方便工具，不是強化過的邊界設備。

---

## 3. 面板欄位怎麼填

新增一個 VLESS + REALITY 的 inbound，關鍵欄位：

| 面板欄位                 | 填什麼                      | 對應 JSON                           |
| ------------------------ | --------------------------- | ----------------------------------- |
| Protocol                 | `vless`                     | `protocol`                          |
| Port                     | `443`                       | `port`                              |
| Transmission             | `raw`（舊版面板顯示 `tcp`） | `streamSettings.method`             |
| Security                 | `reality`                   | `streamSettings.security`           |
| Dest / Target            | 見 §4                       | `realitySettings.target`            |
| SNI                      | 通常跟 Dest 同一個域名      | `realitySettings.serverNames[]`     |
| Private Key / Public Key | 按面板的產生鈕              | `privateKey` / client 的 `password` |
| shortIds                 | 按產生鈕，不要手打          | `realitySettings.shortIds[]`        |
| Flow                     | `xtls-rprx-vision`          | `settings.clients[].flow`           |
| uTLS（client 端）        | `chrome`                    | `fingerprint`                       |

**Flow 那欄有個地雷，見 §6.3，不要選 `xtls-rprx-vision-udp443`。**

### 面板產出來的東西長這樣

存檔後去 `Inbounds → 該筆 → Edit → JSON`
對一次。應該長這樣（省略面板自動加的 API / stats 區塊）：

```jsonc
{
	"protocol": "vless",
	"port": 443,
	"settings": {
		"clients": [
			{
				"id": "<uuid>",
				"email": "me",
				// Vision 只在 raw + tls/reality 下能做底層直接複製，效能差很多
				"flow": "xtls-rprx-vision"
			}
		],
		// 不能留空，要關掉必須顯式寫 "none"
		"decryption": "none"
	},
	"streamSettings": {
		// 舊名 network，舊值 "tcp"
		"method": "raw",
		"security": "reality",
		"realitySettings": {
			"show": false,
			// 舊名 dest，兩者是 alias
			"target": "www.bing.com:443",
			"xver": 0,
			"serverNames": ["www.bing.com"],
			"privateKey": "<x25519-private-key>",
			// 預設 26.3.27，低於這個版本的 client 直接被拒，見 §6.1
			"minClientVer": "",
			"maxClientVer": "",
			"maxTimeDiff": 0,
			"shortIds": ["0123456789abcdef"]
		}
	},
	"sniffing": {
		"enabled": true,
		"destOverride": ["http", "tls", "quic"],
		// 只拿來做路由判斷，不改寫實際連線目標
		"routeOnly": true
	}
}
```

**這個 JSON 分頁是可以直接編輯的，而且是唯一該編輯的地方。** 理由在 §6.2。

### 全域的東西在別的地方

routing、DNS、outbound、log 不在 inbound 裡，在側邊欄的
`Xray Configs`。我加了兩條 routing rule 擋內網掃描跟 BT：

```jsonc
{
	"rules": [
		{ "ip": ["geoip:private"], "outboundTag": "blocked" },
		{ "protocol": ["bittorrent"], "outboundTag": "blocked" }
	]
}
```

outbound tag 名稱要對到你面板 Outbounds 裡實際存在的那個（預設通常是
`blocked`，自己確認一下）。

---

## 4. target / SNI 怎麼選

這步比什麼都重要，我第一次就是這裡選爛了。面板下拉選單裡的預設值**不能直接信**（§6.8）。

**條件**

1. 支援 TLS 1.3、有開 H2
2. **跟你的 VPS 同 ASN 或同地區**
   — 官方明講「REALITY 的最佳實踐仍然是借用同 ASN 的憑證」。日本的 VPS 冒充美國小網站，RTT 對不上就是特徵
3. 不在 CDN 後面（§6.6）
4. 不是牆內能直連的站
5. 冷門，但不要冷到只有你在連

### 我目前用 <www.bing.com，但它不完美>

先講清楚：**照上面五條打分，bing 是及格邊緣，不是滿分解**。我選它是因為它穩、好驗、出問題時容易排除變因，屬於「先跑起來」的選擇。

它符合的：

- TLS 1.3 + H2 沒問題
- 全世界哪裡連 bing 都不奇怪，不會因為地理位置產生突兀感
- 它雖然掛在微軟自己的邊緣網路後面，但**跟 Cloudflare 那種共享 CDN 不是同一種風險**。§6.6 講的「你的 VPS 變成別人的免費節點」之所以嚴重，是因為任何人都能把自己的站塞進 Cloudflare 再拿你當入口；bing 是單一目的地，濫用價值低很多
- 流量大，你那點量藏得住

它不符合的：

- **完全不冷門**。它是各家一鍵腳本跟面板預設清單裡的常客，「拿 bing 當 target」這件事本身就是一個弱特徵
- 幾乎不可能跟你的 VPS 同 ASN（條件 2 直接放棄）
- 條件 4 也有疑慮，牆內是連得到 bing 的

所以我的定位是：**先用它把整條鏈路跑通、確認設定沒問題，之後再換成同 ASN 的冷門站**。如果你是照著這篇第一次架，建議也這樣做 — 一開始就選冷門站，出問題時你會分不清是設定錯還是 target 爛。

另外我**沒有驗證過 bing 目前的憑證大小跟是否支援 X25519MLKEM768**，換 target 前自己 ping 一次。

**驗證**（要 SSH 進去，面板上做不到）

```bash
# 面板裝的 xray binary 在這
cd /usr/local/x-ui/bin

# 看憑證大小、是否支援 X25519MLKEM768
./xray-linux-amd64 tls ping www.bing.com

# 看 TLS 版本跟 ALPN
openssl s_client -connect www.bing.com:443 -tls1_3 -alpn h2 </dev/null 2>/dev/null \
  | grep -E "Protocol|ALPN|Verify"
```

binary 檔名會隨架構不同，`ls` 一下。

`serverNames`
可以填什麼，實務上是「依 target 行為所接受的任何 SNI，通常對應回傳憑證上的 SAN」。**所以要看憑證，不是看域名。**

---

## 5. Client 端

面板
`Inbounds → 該筆 → 展開 client → 複製連結 / QR`，貼進 v2rayN、sing-box、Nekobox 之類的就好。

連結展開後其實就是這些：

| 參數   | 意思               | 對應                            |
| ------ | ------------------ | ------------------------------- |
| `sni`  | 你填的 SNI         | `serverName`                    |
| `pbk`  | 面板的 Public Key  | `password`（舊名 `publicKey`）  |
| `sid`  | shortId            | `shortId`                       |
| `fp`   | uTLS 指紋          | `fingerprint`                   |
| `flow` | `xtls-rprx-vision` | `flow`                          |
| `spx`  | 爬蟲路徑           | `spiderX`，建議每個 client 不同 |

**這五個參數我每次都手動比對一次**，理由在 §6.9。三分鐘的事，省下三小時。

---

## 6. 踩坑

### 6.1 `minClientVer` 預設值會直接拒掉舊 client

這是我卡最久的一個，而且面板上完全看不出來。

官方文件：`minClientVer` **預設值是
`26.3.27`**。調低可以讓舊 client 連上，但它們的 TLS 指紋跟真實瀏覽器差很多，可能被 DPI 歸類為非瀏覽器流量。

症狀：面板顯示 inbound 正常運行、Xray 狀態綠燈、你反覆確認每個欄位都對，client 就是連不上。

做法：在 inbound 的 JSON 分頁把 `minClientVer` 顯式設低（例如
`"1.8.0"`）測一次，確認是不是這個。是的話把 client 升到 ≥ 26.3.27 再改回預設。

sing-box、Clash.Meta 這類第三方 core 在這個版本協商欄位上怎麼處理，**官方文件沒寫，我也還沒確認**。如果你的 client 不是 Xray-core 又握手失敗，先測這項。

### 6.2 不要手改 `/usr/local/x-ui/bin/config.json`

這是面板使用者最容易浪費時間的地方，也是我當初的錯誤認知。

3x-ui 的架構是：**一份 JSON template + DB 裡的資料，在每次啟動時動態合成**成
`/usr/local/x-ui/bin/config.json`（[架構說明](https://deepwiki.com/MHSanaei/3x-ui/6.2-xray-configuration)）。

所以：

- 你手改那個檔，下次 restart 就被還原或整段移除（[#3973](https://github.com/MHSanaei/3x-ui/issues/3973)
  就是在抱怨這個）
- `/usr/local/etc/xray/config.json` 那條路徑跟你無關，那是原生安裝的位置
- 真正的來源是 `x-ui.db`

要改就在面板的 JSON 分頁改。那個檔只能拿來**讀**，排錯時看合成結果用。

### 6.3 `xtls-rprx-vision-udp443` 會被吃掉

面板 Flow 下拉選單裡有這個選項，但
[#3943](https://github.com/MHSanaei/3x-ui/issues/3943) 回報：選了之後
**DB 存的值是對的，合成出來的 config 裡 `flow` 變成空字串**，client 靜默失效。

最惡劣的地方是面板 UI 顯示一切正常。

選 `xtls-rprx-vision` 就好，沒問題。

> 這是 v2.8.10 / v2.8.11 的回報，我沒在 v3.x 上驗證過是否已修。反正沒必要冒險。

### 6.4 欄位改名

在 JSON 分頁編輯時會遇到。抄舊教學必炸：

| 舊名          | 新名          | 狀態                                                                                                  |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| `dest`        | `target`      | 官方說目前版本互為 alias                                                                              |
| `publicKey`   | `password`    | 改名理由是「它確實是 x25519 public key，但在 REALITY 設計裡由 client 持有，不該當成可公開發布的東西」 |
| `network`     | `method`      | 官方文件**沒說**舊名還是不是 alias，直接用 `method`                                                   |
| `"tcp"`       | `"raw"`       | 官方說原名有歧義所以改                                                                                |
| `tcpSettings` | `rawSettings` | 同上                                                                                                  |

### 6.5 面板用自己內嵌的 core 版本做驗證

這個很陰。[#5916](https://github.com/MHSanaei/3x-ui/issues/5916)
的情況：使用者把外部 Xray core 降級到 26.4.25，但面板還是拒絕存檔，錯誤訊息
`vless without TLS or other encryption is prohibited`。

追下去發現這句話**只存在於 panel binary 裡，外部的 xray
binary 沒有**。面板是用它自己編進去的那份 Xray core
library 先驗證一次，才把設定交給外部 binary。

所以「我降級 core 就能用舊寫法」這個假設不成立 — 你還要面板那份也肯放行。

### 6.6 target 在 CDN 後面 → 你的 VPS 變成別人的免費節點

官方警告寫得很直白：Xray 會把驗證失敗的流量直接轉發給
`target`。如果 target 站在 Cloudflare 後面，**你的 server 就變成 Cloudflare 的 port
forwarder**，被掃到就會被拿去用。

優先選非 CDN 的 target（bing 的定位見 §4）。真的被迫用共享 CDN 的話，在 inbound 的 JSON 分頁加：

```jsonc
"limitFallbackDownload": {
  "afterBytes": 10485760,
  "bytesPerSec": 1048576,
  "burstBytesPerSec": 5242880
}
```

但要知道代價 — 官方說「fallback 限速本身就是一種指紋，並不推薦；如果你在開發面板或一鍵腳本，務必把這些參數隨機化」。

這件事在 §7.6 還會再提，因為它會**吃掉你的流量配額**。

### 6.7 不要手癢按「更新 Xray core」

面板首頁那顆按鈕。3x-ui 自己的 commit 紀錄就是警告：

- `revert: Xray Core v26.5.3 (buggy — vless reverse broken)`，後面還加了
  `skip Xray 26.5.3 and bump version cutoff`
- `v26.7.28` 帶了 XMC finalmask 的 breaking
  change，3x-ui 要端到端處理，不完整的 mask 存檔時會被拒

升級前先讀 3x-ui 那版的 release
notes。而且參考 §6.5，core 跟 panel 的版本是綁在一起看的，只換其中一個會出現詭異狀況。

### 6.8 面板預設 target 清單不可信

3x-ui 有一個 commit 是 `Reality: remove tesla.com because of blocking` — 把
`tesla.com` 從預設清單移掉，因為它被封了。

下拉選單跟那顆隨機按鈕給的是**某個過去時間點**的建議值，不是現在有效的保證。自己照 §4 驗。

（`www.bing.com`
也在那份清單裡。我用它是有意識的取捨，不是因為它排在選單上面 — 理由寫在 §4。）

（順帶，那顆隨機按鈕本身也壞過：`fix: reality random target/sni buttons not working`。）

### 6.9 面板產的分享連結不一定完整

歷史紀錄：

- `Fix REALITY share links missing SNI`（#4621）→ 連結漏 SNI
- `fix(outbounds): preserve TLS/Reality security on save`
  → 存檔時 security 被吃掉

所以 §5 那五個參數我每次都手動對。

### 6.10 開了 mldsa65 之後 QR code 會消失

`fix: hide QR code for mldsa65 links (too long for QR generation)`，ML-KEM-768 的連結也一樣。

不是 bug，是連結長度超過 QR 容量。用複製連結或 subscription URL。

順帶，`mldsa65Seed` 開之前的硬條件是 **target 回傳的憑證必須大於 3500
bytes**，不然你自己就變指紋了。我沒開，官方也說「多數情況下不需要這個功能」，而且它每次握手多一次簽章，1
vCPU 上省下來比較實在。

### 6.11 `fingerprint` 不能填 `unsafe`

REALITY 靠 uTLS 操作底層 TLS 參數，所以那個用來停用 uTLS 的 `unsafe`
值不支援。填了會啟動失敗。面板的 uTLS 下拉選單裡有 `none` 選項，那個跟 `unsafe`
是不同的東西，但 REALITY 下建議還是填具體的瀏覽器指紋。

### 6.12 access log 跟磁碟的取捨

面板的 fail2ban / IP 限制功能**需要 access
log 才能運作**。[wiki](https://github.com/MHSanaei/3x-ui/wiki/Configuration)
寫明要去 `Xray Configs → log → Access log path` 設成
`./access.log`，存檔後重啟 Xray。

但 access log 在 25 GB 的機器上長得很快。取捨：

| 你要什麼           | access log | 代價                 |
| ------------------ | ---------- | -------------------- |
| fail2ban / IP 限制 | 開         | 要自己顧 log 大小    |
| 省磁碟、單純自己用 | 關         | 沒有 per-IP 封鎖能力 |

我自己是關的，因為只有我跟幾個朋友在用，寧可省磁碟。

---

## 7. 1 vCPU / 1 GB 上的調校

我跑的是 Vultr 最小那檔：**1 vCPU / 1 GB RAM / 25 GB NVMe / 2 TB 頻寬**。

結論先講：**這規格綽綽有餘**，瓶頸不會是 CPU。

### 7.1 大概吃多少

| 元件                                             | RSS           |
| ------------------------------------------------ | ------------- |
| Xray-core（raw + REALITY + Vision，數個 client） | 約 40–100 MB  |
| 3x-ui panel（Go binary + SQLite）                | 約 60–120 MB  |
| 系統 + sshd + chrony                             | 約 150–250 MB |

還很夠。**但 1 GB 沒 swap 的話，隨便一次 `apt upgrade`
或按面板的自我更新就可能 OOM。**

### 7.2 Swap（Vultr 預設不給）

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10
```

NVMe 上開 swap 沒有轉盤時代那些顧慮。

### 7.3 BBR + fq

單 vCPU、臺灣連日本這種長肥管道，這是免費的數倍吞吐：

```bash
cat > /etc/sysctl.d/99-proxy.conf <<'EOF'
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_mtu_probing = 1
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_slow_start_after_idle = 0
fs.file-max = 1000000
vm.swappiness = 10
EOF
sysctl --system

sysctl net.ipv4.tcp_congestion_control
lsmod | grep bbr
```

### 7.4 `nofile` 要加在 `x-ui.service`

**不是 `xray.service`。** 面板是用 3x-ui 當父行程去 spawn xray 的，xray 繼承
`x-ui.service` 的 limit。一鍵安裝的機器上根本沒有 `xray.service` 這個 unit。

```ini
# /etc/systemd/system/x-ui.service.d/override.conf
[Service]
LimitNOFILE=1000000
```

```bash
systemctl daemon-reload && systemctl restart x-ui
# 驗證，PID 換成實際的
cat /proc/$(pgrep -f xray-linux | head -1)/limits | grep "open files"
```

Xray 是每連線一個 fd，預設 1024 在多裝置時會撞牆。

### 7.5 Policy 走面板，不要動檔案

`Xray Configs → Basics`。3x-ui v3.2.7 起面板直接有 `connIdle` / `bufferSize`
的控制項（`feat(xray): add connIdle and bufferSize policy controls`），不用碰 JSON。

| 參數         | 我設的值  | 為什麼                                                   |
| ------------ | --------- | -------------------------------------------------------- |
| `connIdle`   | `120`     | 閒置連線回收（秒）。手機切換網路會留一堆殭屍連線吃記憶體 |
| `bufferSize` | `32`      | 每連線 buffer，單位 KB                                   |
| loglevel     | `warning` | 預設就是這個，別調 `debug` 後忘記關                      |

`bufferSize` 的**預設值我沒確認**，要精確數字去查
[policy 文件](https://xtls.github.io/en/config/policy.html)。

CPU 上該避開的：

| 做法                                               | 影響                                        |
| -------------------------------------------------- | ------------------------------------------- |
| Flow 選 `xtls-rprx-vision` + Transmission 選 `raw` | **必開**，底層直接複製，省掉雙層 TLS 加解密 |
| Transmission 選 `xhttp` / `grpc`                   | 多一層 HTTP/2 framing，非必要別用           |
| `mldsa65Seed`                                      | 每次握手多一次後量子簽章，省下來            |

### 7.6 2 TB 頻寬的帳

Vultr 的規則：[只算 outbound，inbound 免費](https://www.vultr.com/resources/faq/?query=bandwidth)，超額 $0.01/GB。2
TB 是[帳戶層級的免費 egress，跨 instance pooling](https://blogs.vultr.com/vultr-announces-reduced-bandwidth-pricing-2-tb-of-free-monthly-egress-free-ingress-and-global-pooling)。

而且配額是[按小時累積的（每月以 672 小時計）](https://docs.vultr.com/support/platform/billing/how-are-bandwidth-caps-calculated)，任何時間點超過「當下已累積的量」就開始算超額 —
**月初不能當成 2 TB 已經到手**。

| 情境                                                       | 計不計                    |
| ---------------------------------------------------------- | ------------------------- |
| 透過 proxy 下載 / 看影片（server → 你）                    | Y，算 egress              |
| 透過 proxy 上傳（你 → server → 目標）                      | Y，server 對目標是 egress |
| 目標站回應進到 server                                      | N，ingress 免費           |
| **REALITY fallback：探測流量轉發給 target 後回吐給探測者** | Y，**吃你的配額**         |

最後一條就是 §6.6 的 `limitFallbackDownload`
在這規格上的真正價值。不只是「不要當別人的 CDN 節點」的道德問題，**是它直接扣你的 2
TB**。

2 TB ÷ 30 天 ≈ **66
GB/day**。面板首頁有流量統計，但那是 Xray 自己算的 proxy 流量，**不等於 Vultr 的計費數字**（fallback、面板本身、系統更新都不會出現在面板上）。裝一個看網卡的：

```bash
apt install -y vnstat
systemctl enable --now vnstat
vnstat -m
```

最終還是以 Vultr 面板/API 為準。

### 7.7 25 GB 磁碟

```bash
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/size.conf <<'EOF'
[Journal]
SystemMaxUse=200M
SystemMaxFileSize=50M
EOF
systemctl restart systemd-journald
```

3x-ui 從 v3.0.2 起自帶 `3xui.log`
的 rotate（`add: log rotate to 3xui.log file to avoid disk space consumption`），這塊不用管。真正的地雷是 Xray 的 access
log，見 §6.12。

---

## 8. 除錯順序

面板使用者的順序跟手寫 config 的人不一樣，因為你不能直接 `xray run -test`。

```bash
# 1. 面板跟 xray 的 log 都在這，關鍵字看 "XRAY:" 開頭那幾行
journalctl -u x-ui -n 200 --no-pager

# 2. 看合成出來的 config（只讀，不要改）
cat /usr/local/x-ui/bin/config.json | jq .

# 3. port 真的在聽
ss -tlnp | grep 443

# 4. 直接 ping target，確認 target 本身沒被封
/usr/local/x-ui/bin/xray-linux-amd64 tls ping www.bing.com

# 5. client 端驗出口 IP
curl -x socks5h://127.0.0.1:10808 https://api.ipify.org
```

第 2 步是面板使用者最重要的除錯動作 —
**面板 UI 顯示的東西跟實際跑的 config 可能不一樣**（§6.3 就是活例子）。有懷疑就去看合成結果。

要開 REALITY 的 debug 就在 inbound 的 JSON 分頁把 `realitySettings.show` 設
`true`。**解決後記得關掉**，它會刷爆 log。

| 症狀                         | 先查                                                                     |
| ---------------------------- | ------------------------------------------------------------------------ |
| 面板一切正常但 client 連不上 | `minClientVer`（§6.1）、Flow 被吃掉（§6.3）、合成的 config（§8 第 2 步） |
| 連上但完全不通               | Flow 兩端不一致、Transmission 兩端不一致                                 |
| 時通時不通                   | VPS 時鐘飄移、target 站不穩                                              |
| 用一陣子後被封               | target 選爛了（§4）                                                      |
| 存檔被拒 / 錯誤訊息很怪      | panel 內嵌 core 版本的驗證（§6.5）                                       |
| 手改的東西不見了             | 你改到 `bin/config.json` 了（§6.2）                                      |

---

## 參考

- [Xray-core Releases](https://github.com/XTLS/Xray-core/releases)
- [REALITY 官方文件](https://xtls.github.io/en/config/transports/reality.html)
- [Transport Configuration](https://xtls.github.io/en/config/transport.html)
- [VLESS 官方文件](https://xtls.github.io/en/config/inbounds/vless.html)
- [3x-ui Wiki](https://github.com/MHSanaei/3x-ui/wiki) /
  [Installation](https://github.com/MHSanaei/3x-ui/wiki/Installation) /
  [Configuration](https://github.com/MHSanaei/3x-ui/wiki/Configuration)
- [3x-ui Releases](https://github.com/MHSanaei/3x-ui/releases)
- [3x-ui Xray 設定合成架構](https://deepwiki.com/MHSanaei/3x-ui/6.2-xray-configuration)
- [Vultr 頻寬計算方式](https://docs.vultr.com/support/platform/billing/how-is-bandwidth-usage-calculated)

---

自架代理在不同司法管轄區的合法性不一樣，弄之前先確認你所在地跟 VPS 所在地的規範。3x-ui 官方也聲明它僅供個人使用。
