# caran-dache-color — Session context

Caran d’Ache 9 大系列色號 → CSS（hex / `var(--cda-<series>-<code>)` / `rgb()` / `.cda-bg-…`）對照的**唯讀參考**單頁 WebApp：
系列色票網格（「全部」＋ 9 系列 chips）、**系列 / 正典色碼雙軸瀏覽**、點色票看明細（耐光度 / 色料 / WCAG）、
**同色碼跨系列色帶**（點某系列即跳去看該系列色）、搜尋、一鍵複製四種格式、整份 `.css` 匯出／下載。
812 系列色 / 227 正典色碼 / 9 系列。
**第二頁 `sets.html`＝系列收錄對照**（227 × 9 矩陣）：選一條系列 → 只留下它有出的色 →
橫向看其他系列涵蓋到哪。**格子裡是該系列自己的顏色、不是勾號**——治理 §3.1「同一個正典色碼
跨系列不是同一個顏色」因此在畫面上直接看得見。

本 app 屬於 **nodeapp WebApp 家族**；共同規範與流程在
<https://github.com/scottgfhong310/nodeapp-webapp-family>（`DESIGN_GUIDELINES.md` 規範、`WORKFLOW.md` 流程）。**改動前請先讀那兩份，照其中 canon 做。**

## 結構

```
app.js                                  # Express 入口：port 3000；/ → 302 /apps/caran-dache-color/
                                        # 唯讀，無 API、無上傳（薄後端只做 static + 轉址 + JSON 404）
data/source/                            # 單一真相（建置期用，不進前端）
├─ Caran_dAche_Master_Color_Index_v1.1.0.xlsx # 原始總表（13 工作表；上游最新）
├─ generate.py                          # xlsx(+resampled_hex) → 前端三支 cda-*.js（需 openpyxl）
├─ extract_charts.py                    # 由官方色卡 PDF 重取 SUP/NC2 真值（需 PyMuPDF；PDF 不進 repo）
├─ resampled_hex.json                   # extract_charts 產出的 SUP/NC2 修正 hex（generate.py 當 override）
├─ extract_lightfastness.py             # 由 2025 官方目錄 PDF 讀正確耐光度星等（需 PyMuPDF；PDF 不進 repo）
├─ catalogue_lightfastness.json         # 耐光度修正（code→星數；generate.py 覆蓋 lf/lfNorm）
└─ build_corrected_xlsx.py              # 把 hex＋耐光度修正套回整份 xlsx → data/reference/…v1.1.0-corrected.xlsx
data/reference/                         # 可攜「修正版總表」參考檔（＋README）；DESIGN.md §4.1
scripts/sync-copies.sh                  # 把 lib＋cda-colors.js 同步到 6 個複製點並 md5 驗證
public/apps/caran-dache-color/          # 前端（服務於 /apps/caran-dache-color/）
├─ index.html · caran-dache-color.css · caran-dache-color.js · caran-dache-color-lib.js
├─ sets.html · sets.css · sets.js       # 第二頁：系列收錄對照（227 正典色碼 × 9 系列）
├─ data/cda-series.js                   # window.CDA_SERIES（9 系列 registry）
├─ data/cda-colors.js                   # window.CDA_COLORS（812 系列色）+ window.CDA_META
├─ data/cda-canonical.js                # window.CDA_CANONICAL（227 正典碼 + 同碼跨系列 hex）
├─ materialize-dark.css · side-tool.css · side-tool.js · filter-clear.css · filter-clear.js   # （樣式＋行為：check 微回饋、矮視窗溢出收納；權威版＝家族 repo，§5.5）
├─ i18n.js · locales/{zh-Hant,en,ja}.js
├─ icons/                                # app icon（中性「色卡扇」標記、非 CD 品牌 logo）
│  ├─ caran-dache-color-icon(-light).svg # 母版 tile（深/淺）；標題列（乙式）品牌標記＋PNG 來源
│  ├─ favicon(.ico/.svg/-light.svg) · icon-{16..512}.png · manifest.json
```

無 `routes/`、無 `public/upload/`——這是唯讀參考 app，資料是烘進前端的靜態 registry。

## 執行 / 驗證

```bash
npm install && node app.js              # → http://localhost:3000/apps/caran-dache-color/
```

**資料重新產生：2026-07-29 起改由 `db_artcolor` 匯出**（見 DESIGN.md §3.1）：

```bash
# 在家族工作區（未納版控）：My Projects/Art Colour/export/
node a3-export.js --check    # 逐位元組比對本 repo 的 data/cda-*.js 與 DB 重建結果
node a3-export.js --write    # 由 DB 重新產生
```

> **⚠️ 不要再跑 `data/source/generate.py`**——它會用凍結的 xlsx 覆蓋掉 DB 側的任何修正。
> `data/source/` 的抽取器與 override 檔保留為**沿革**，不再是輸入端。

驗證（preview 實跑）：`/` 302、資產 200、`cda-*.js` 200、API 404 回 JSON、系列網格渲染、
系列 chips 切換、**「全部」chip（812 色、色塊右上標系列 id）**、搜尋過濾、排序側鍵、
點色票開明細（4 種複製格式 + 耐光度 + 色料 + WCAG）、
**同色碼跨系列色帶 + 點系列跳轉**、正典色碼模式（227）、**最接近色側欄**（12 筆、ΔE 分級標示、**貼上鈕**、
點結果開明細而側欄不關）、CSS 匯出/下載、i18n 三語、主題切換
（**色票保留真實顏色、只有外殼跟主題**）。

`sets.html`（另開分頁，入口在色票頁側鍵第 3 顆 `#setting-sets`）另驗：
227 列 × 9 欄／**812 個色片**（＝每欄色片數逐條等於 registry 的 `count`）、
每格 hex 逐格等於 `CDA_CANONICAL[i].series[<系列>]`（**812/812 相符，其中 747 格與正典平均色不同**
——那正是 §3.1 要看見的事）、選一條系列後可見列數 ＝ 該系列色數且再點一次可取消、
**缺色數雙向對稱**（base A 時 B 缺 g ⇒ |A|−g ＝ |A∩B|，81 組全過）、
四列表頭各自 sticky 且不互相疊住、點色片複製 hex（真實滑鼠點擊 → toast）、三語、主題切換。

> ⚠️ **`.matrix-sec` 不可包 `overflow-x: auto`**（形制同 FC／finecolour：整頁橫捲）。
> 包了就多一個捲動容器，表頭 sticky 的參考點從視窗變成它——結果是**表頭完全不黏，
> 而 `top: var(--head-h)` 反過來把列標籤整齊往下推 `--head-h` 那麼多**。
> 畫面上只看得出「有點歪」，不會報錯。已寫進 `sets.css` 的註解。

## 本 app 的 canon 重點

- **系列 chips 有一顆「全部」**（`activeSeries = '*'`，非真實系列 id）：分組 chips 單選互斥、
  恆有一個 active，沒有「不選」這個狀態，故「看全部系列」必須自己是一顆 chip
  （家族 `DESIGN_GUIDELINES` §5.13 之①）。該視圖下每格色塊右上標**系列 id**——
  **同一個色碼在不同系列是不同的顏色**，攤平成一格網格後不標系列就分不出誰是誰
  （沿用正典模式那顆 `.badge`）。數字排序讓同色碼自然相鄰，正好把這件事攤開來看。
- **正典模式收起系列 chips**（§5.13 之②）：那是跨系列的另一條軸，系列 chips 在那裡不成立；
  回去的路是恆在畫面上的模式鈕，故不需要在 chips 裡另設出口。

- **唯讀參考、無後端 API**：資料是靜態 `data/cda-*.js`，**由 `db_artcolor` 匯出**
  （見 DESIGN.md §3.1）；不需上傳/編輯，故 `app.js` 極簡。
  **app 本身不連任何資料庫**——資料檔進版控，clone 下來 `npm start` 就能跑。
- **系列 / 正典雙軸**（比 faber-castell-color 的平面 141 色多的關鍵）：`Series_Color_Index`（812）為事實表、
  `Color_Master`（227）為去重的正典色碼層、`Cross_Series_Map` 為同碼跨系列 hex。UI 預設**系列優先**、
  另附**正典色碼**統一瀏覽；明細一律帶**同色碼跨系列色帶**。見 DESIGN.md。
- **可嵌入 lib** `caran-dache-color-lib.js`（`window.CaranDacheColorLib`）：`filter` / `sortColors`
  （`code`/`hue`/`lightness`/`family`/`hex`，無彩度殿後）/ `colorFamily`＋`FAMILY_ORDER`（9 色系分群）/
  `hexToRgb` / `rgbToHsl` / `rgbToLab` / `deltaE`（ΔE00）/ `deltaEBand` /
  **`nearestCDA`（v2 已實作）**——以 ΔE00 找最接近的系列色（預設排除與 PSTP 同盤的 PSTC、`opts.series` 可過濾；
  比照 FC 的 `nearestFC`，消費端要用時複製 lib＋`data/cda-colors.js`）/ `pickTextColor`（WCAG 對比選黑白字）/
  `contrastRatio` / `slug` / `copyValue` / **`buildCss`** /
  **`codesInSeries`／`seriesGaps`／`seriesMatrix`**（`sets.html` 用的三支：某系列有哪些正典碼、
  相對基準系列各欄缺幾色、227×9 矩陣——**`cells[系列]` 放的是該系列的實際 hex 而不是布林**），
  **純邏輯不碰 DOM**；`caran-dache-color.js`
  才是碰 DOM 的控制器（渲染、模式/系列/排序側鍵、色系分群 sticky 標頭、Modal、跨系列跳轉、
  **最接近色側欄**〔`#setting-nearest`；2026-07-30 由 Modal 改為右緣 sidenav，形制同 markdown-reader
  的檔案清單側欄——查詢條件常駐、點結果開明細而側欄不關。「兩 modal 交接需延遲 ~300ms」那條坑
  在這條路徑上隨之消失，但對 modal ↔ modal 仍成立〕、clipboard、toast）。
- **色票不隨主題重著色**（§4.7「內容本身即設計」）：色塊恆為 Caran d’Ache 真實色，
  只有外殼（bg/文字/工具列）跟 light/dark；色塊上文字黑白由 `pickTextColor` 依對比自動選。
- **色名是資料**：英文正典色名保留於 `CDA_COLORS` / `CDA_CANONICAL`，為主要顯示；明細內另把
  zh-Hant / ja 在地色名（隨 UI 語言）當**額外資料欄**呈現——這是**呈現本就存在的多語資料、非翻譯 UI**。
  UI 字串（按鈕/標籤）才三語。
- **hex 是螢幕近似值**：官方色卡 PDF 色塊中位數 RGB 取樣、非官方 RGB 規格；同一色碼在不同系列的實際色不同
  （明細以跨系列色帶＋`maxDeltaE76`／一致性標示）。
- **主題**：CSS 變數 light/dark，預設 dark；切換時同步 toggle `dark-mode`/`light-mode` class（§5.1 坑）。
- **i18n**：`i18n.js` 引擎 + `locales/*.js`，`data-i18n` 屬性，預設 `zh-Hant`。

## 複製件登記（共用件改版時回來同步）

| 檔案 | 來源（以此為準） |
|---|---|
| `materialize-dark.css` | 家族 repo `nodeapp-webapp-family/materialize-dark.css` |
| `side-tool.css`（正統 flex 版）| 家族 §5.5 正統版（複製自 `faber-castell-color`） |
| `filter-clear.css`、`filter-clear.js` | 家族 §5.12 篩選框「清除」× 鈕 utility（自 `faber-castell-color` 複製、byte-identical） |
| `i18n.js` | 家族 repo `nodeapp-webapp-family/i18n.js`（權威版，byte-identical；`locales/*.js` 各 app 自維護） |
| `color-family.js` | 家族 repo `nodeapp-webapp-family/color-family.js`（§4 A 類權威版，byte-identical）。**色系分群的單一權威規則**；本 app 的 lib 只包一層薄的 `colorFamily()` 把無彩度門檻寫在那裡。⚠️ `<script>` 必須早於用到它的 lib |
| `data/cda-*.js` | **由 `db_artcolor` 匯出**（2026-07-29 起；家族美術色材領域庫＝ System of Record）。xlsx ＋ `resampled_hex.json` 等已凍結為來源沿革，見 DESIGN.md §3.1／§4.1 |

> **本 app 是 `caran-dache-color-lib.js` ＋ `data/cda-colors.js` 的權威版**，各有 6 份複製：
> 本尊、`color-palette`、`thangka-trace`，各含 InProgress 鏡像。
> 同步與驗證用 `bash scripts/sync-copies.sh`（會 md5 確認每份都是單一 hash）。
> 該腳本於 2026-07-29 補上——A5 把資料改由 `db_artcolor` 匯出時，6 份複製一次全部過時，
> 才發現本 repo 缺這支（FC 早有）。

> 為什麼長這樣（唯讀決策、資料來源與雙軸模型、跨系列色帶、色名顯示、CSS 單一真相、色票不著色）
> 見 [DESIGN.md](DESIGN.md)。
