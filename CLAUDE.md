# caran-dache-color — Session context

Caran d’Ache 8 大系列色號 → CSS（hex / `var(--cda-<series>-<code>)` / `rgb()` / `.cda-bg-…`）對照的**唯讀參考**單頁 WebApp：
系列色票網格（8 系列 chips）、**系列 / 正典色碼雙軸瀏覽**、點色票看明細（耐光度 / 色料 / WCAG）、
**同色碼跨系列色帶**（點某系列即跳去看該系列色）、搜尋、一鍵複製四種格式、整份 `.css` 匯出／下載。
764 系列色 / 227 正典色碼 / 8 系列。

本 app 屬於 **nodeapp WebApp 家族**；共同規範與流程在
<https://github.com/scottgfhong310/nodeapp-webapp-family>（`DESIGN_GUIDELINES.md` 規範、`WORKFLOW.md` 流程）。**改動前請先讀那兩份，照其中 canon 做。**

## 結構

```
app.js                                  # Express 入口：port 3000；/ → 302 /apps/caran-dache-color/
                                        # 唯讀，無 API、無上傳（薄後端只做 static + 轉址 + JSON 404）
data/source/                            # 單一真相（建置期用，不進前端）
├─ Caran_dAche_Master_Color_Index_v1.0.xlsx   # 原始總表（13 工作表）
└─ generate.py                          # xlsx → 前端三支 cda-*.js 產生器（需 openpyxl）
public/apps/caran-dache-color/          # 前端（服務於 /apps/caran-dache-color/）
├─ index.html · caran-dache-color.css · caran-dache-color.js · caran-dache-color-lib.js
├─ data/cda-series.js                   # window.CDA_SERIES（8 系列 registry）
├─ data/cda-colors.js                   # window.CDA_COLORS（764 系列色）+ window.CDA_META
├─ data/cda-canonical.js                # window.CDA_CANONICAL（227 正典碼 + 同碼跨系列 hex）
├─ materialize-dark.css · side-tool.css · filter-clear.css · filter-clear.js
├─ i18n.js · locales/{zh-Hant,en,ja}.js
├─ icons/                                # app icon（中性「色卡扇」標記、非 CD 品牌 logo）
│  ├─ caran-dache-color-icon(-light).svg # 母版 tile（深/淺）；標題列（乙式）品牌標記＋PNG 來源
│  ├─ favicon(.ico/.svg/-light.svg) · icon-{16..512}.png · manifest.json
```

無 `routes/`、無 `public/upload/`——這是唯讀參考 app，資料是烘進前端的靜態 registry。

## 執行 / 驗證

```bash
npm install && node app.js              # → http://localhost:3000/apps/caran-dache-color/
# 重新產生資料（改 xlsx 後）：
cd data/source && pip3 install openpyxl && python3 generate.py
```

驗證（preview 實跑）：`/` 302、資產 200、`cda-*.js` 200、API 404 回 JSON、系列網格渲染、
系列 chips 切換、搜尋過濾、排序側鍵、點色票開明細（4 種複製格式 + 耐光度 + 色料 + WCAG）、
**同色碼跨系列色帶 + 點系列跳轉**、正典色碼模式（227）、CSS 匯出/下載、i18n 三語、主題切換
（**色票保留真實顏色、只有外殼跟主題**）。

## 本 app 的 canon 重點

- **唯讀參考、無後端 API**：資料是靜態 `data/cda-*.js`，由 `data/source/Caran_dAche_Master_Color_Index_v1.0.xlsx`
  以 `generate.py` 產生（見 DESIGN.md §資料）；不需上傳/編輯，故 `app.js` 極簡。
- **系列 / 正典雙軸**（比 faber-castell-color 的平面 141 色多的關鍵）：`Series_Color_Index`（764）為事實表、
  `Color_Master`（227）為去重的正典色碼層、`Cross_Series_Map` 為同碼跨系列 hex。UI 預設**系列優先**、
  另附**正典色碼**統一瀏覽；明細一律帶**同色碼跨系列色帶**。見 DESIGN.md。
- **可嵌入 lib** `caran-dache-color-lib.js`（`window.CaranDacheColorLib`）：`filter` / `sortColors`
  （`code`/`hue`/`lightness`/`family`/`hex`，無彩度殿後）/ `colorFamily`＋`FAMILY_ORDER`（9 色系分群）/
  `hexToRgb` / `rgbToHsl` / `rgbToLab` / `deltaE`（ΔE00）/ `pickTextColor`（WCAG 對比選黑白字）/
  `contrastRatio` / `slug` / `copyValue` / **`buildCss`**，**純邏輯不碰 DOM**；`caran-dache-color.js`
  才是碰 DOM 的控制器（渲染、模式/系列/排序側鍵、色系分群 sticky 標頭、Modal、跨系列跳轉、clipboard、toast）。
  `rgbToLab`/`deltaE` 為未來「最接近 Caran d’Ache 色」比對器 `nearestCDA`（v2）預留、v1 未接消費端。
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
| `i18n.js` | 家族共用（`markdown-reader` 等同款引擎） |
| `data/cda-*.js` | 由 `data/source/generate.py` 讀 `Caran_dAche_Master_Color_Index_v1.0.xlsx` 產生 |

> 為什麼長這樣（唯讀決策、資料來源與雙軸模型、跨系列色帶、色名顯示、CSS 單一真相、色票不著色）
> 見 [DESIGN.md](DESIGN.md)。
