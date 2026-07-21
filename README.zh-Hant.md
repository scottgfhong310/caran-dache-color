# caran-dache-color

> 版本 v1.0｜最後更新 2026-07-22

**繁體中文** ｜ [English](README.md) ｜ [日本語](README.ja.md)

把 **Caran d’Ache 色號對應到 CSS** 的單頁參考 WebApp，涵蓋**全部 8 大藝術家系列**。
可依系列瀏覽色票網格，或切到**正典色碼**視圖；點任一色票看可直接複製的值、耐光度、色料與 WCAG 資料，
以及一條可互跳的**同色碼跨系列**色帶。整份可匯出成含變數與 utility class 的 `.css`。

hex 為**官方色卡 PDF 色塊的中位數 RGB 取樣**、螢幕近似值，**非**官方 Caran d’Ache RGB/HEX 規格。
同一色碼在不同系列（媒材/黏合劑不同）會呈現不同顏色。

## 範圍

- **8 系列** — LUMINANCE 6901、PABLO、SUPRACOLOR、MUSEUM Aquarelle、NEOCOLOR II、NEOPASTEL、
  PASTEL PENCILS、PASTEL CUBES（後兩者共用同一份 84 色官方調色盤）。
- **764 系列色**（每個顏色「在某系列裡」一列）· **227 正典色碼**（跨系列去重）。

## 特色

- **雙軸瀏覽** — *系列*（8 個 chips → 該系列網格）與 *正典色碼*（227 碼，每格顯示跨系列平均色＋涵蓋系列數徽章）。
- **同色碼跨系列色帶** — 每個明細都列出該色碼在各系列的實際 hex；點某系列即跳去看該系列色。並標示
  最大跨系列色差 ΔE76 與一致性（High/Medium/Low）。
- **搜尋** — 依色號或色名（英/中/日）即時過濾。
- **排序** — 側鍵循環：色號 / 色相光譜 / 明度 / 色系分群（9 色系＋sticky 標頭、無彩度殿後）/ hex 原始值；會記憶。
- **四種複製格式** — `var(--cda-lum-001)`、`#f4f4f5`、`rgb(244, 244, 245)`、`.cda-bg-lum-001`。
- **明細** — 耐光度（等級＋正規化 /5＋標準）、色料索引、WCAG AA 對比；在地色名（中/日）當輔助資料呈現。
- **CSS 匯出** — 檢視 / 複製 / 下載 `caran_dache_colors.css`（764 個 `--cda-<系列>-<色號>` 變數 ＋
  `.cda-color-…` / `.cda-bg-…` utility class）。
- **唯讀** — 無上傳、無後端 API；資料是由總表產生的靜態 registry。
- **light / dark 主題**（預設 dark）與 **三語 UI**（zh-Hant / en / ja）。色票在兩種主題下都保留真實顏色。

## 安裝與執行

```bash
npm install
npm start          # → http://localhost:3000/apps/caran-dache-color/
```

用 `PORT` 與其他家族 app 錯開：`PORT=3008 npm start`。

需要 Node 伺服器（前端走絕對路徑）——**不相容** GitHub Pages 純靜態託管。

## 結構

```
app.js                                  # Express：static + / → 302 + JSON 404（無 API、無上傳）
data/source/                            # 單一真相（僅建置期用）
├─ Caran_dAche_Master_Color_Index_v1.0.xlsx
└─ generate.py                          # xlsx → cda-*.js（需 openpyxl）
public/apps/caran-dache-color/
├─ index.html · caran-dache-color.css · caran-dache-color.js · caran-dache-color-lib.js
├─ data/cda-series.js                   # window.CDA_SERIES — 8 系列
├─ data/cda-colors.js                   # window.CDA_COLORS — 764 系列色（＋ window.CDA_META）
├─ data/cda-canonical.js                # window.CDA_CANONICAL — 227 正典碼 ＋ 跨系列 hex
├─ materialize-dark.css · side-tool.css · filter-clear.css · filter-clear.js · i18n.js · locales/{zh-Hant,en,ja}.js
```

改 xlsx 後重新產生資料：`cd data/source && python3 generate.py`。

## 核心 library（`CaranDacheColorLib`）

純邏輯、不碰 DOM，可嵌入任何地方：

| 方法 | 用途 |
|---|---|
| `filter(colors, query)` | 依色號或色名（英/中/日）過濾（不分大小寫、不改輸入）|
| `sortColors(colors, mode)` | 依 `'code'` / `'hue'` / `'lightness'` / `'family'` / `'hex'` 排序（不改輸入）|
| `colorFamily(color)` | 屬九色系中哪一個（灰階 → `'neutral'`）|
| `hexToRgb` / `rgbToHsl` / `rgbToLab` | 色彩空間轉換 |
| `deltaE(labA, labB)` | CIEDE2000（ΔE00）——為未來 `nearestCDA` 比對器預留 |
| `pickTextColor(color)` | `'#000000'` / `'#ffffff'`——色塊上對比較高的文字色（WCAG）|
| `copyValue(color, fmt)` | `fmt`：`'var'` / `'hex'` / `'rgb'` / `'class'` → 複製字串 |
| `buildCss(colors)` | 整份 CSS（`:root` 變數 + utility class）|

## 資料結構

```jsonc
// window.CDA_COLORS — 每個系列色
{
  "id": "CDA-LUM-001", "seriesId": "LUM", "code": "001", "order": 1,
  "name": "White", "nameZh": "白色", "nameJa": "ホワイト",   // en 為正典色名；zh/ja 是來源資料
  "hex": "#f4f4f5", "r": 244, "g": 244, "b": 245,
  "lf": "I", "lfNorm": 1.67, "lfMax": 3, "lfStd": "ASTM D-6901",  // 耐光度
  "pig": "PW6", "pigN": 1,                                        // 色料索引 / 數量
  "wcag": "PASS", "contrast": 19.11,
  "canon": "CDA-CODE-001", "cssVar": "--cda-lum-001"
}

// window.CDA_CANONICAL — 每個正典色碼（跨系列去重）
{
  "code": "001", "name": "White", "nameZh": "白色", "nameJa": "ホワイト",
  "seriesCount": 6, "seriesList": ["LUMINANCE 6901", "PABLO", "…"],
  "pigments": "PW6", "avgHex": "#f6f1ed", "maxDeltaE76": 7.5, "consistency": "High",
  "series": { "LUM": "#f4f4f5", "PAB": "#fef2e7", "…": "…" }   // 此色碼在各系列的 hex
}
```

無值的欄位一律省略（來源為空 / 不適用）。各系列 `hex` ≠ `avgHex`；其離散程度即 `maxDeltaE76` / `consistency` 描述的。

## 來源與準確度

資料源自 `Caran_dAche_Master_Color_Index_v1.0.xlsx`，其本身彙整自官方 Caran d’Ache 色卡 PDF。
hex 為**中位數 RGB 螢幕近似值**、非官方規格；實體顏色隨紙張、下筆力道、疊色、加水、黏合劑、光照、
掃描器與螢幕描述檔而變。雙軸資料模型、跨系列色帶與產生管線見 [DESIGN.md](DESIGN.md)。

## 授權

[MIT](LICENSE) © 2026 [Scott G.F. Hong](https://github.com/scottgfhong310)
