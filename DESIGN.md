# caran-dache-color — 設計決議（DESIGN）

> 版本 v1.0｜最後更新 2026-07-22

「怎麼用」歸 [README](README.md)、家族共同規範歸
[nodeapp-webapp-family](https://github.com/scottgfhong310/nodeapp-webapp-family)；本檔只記**為什麼長這樣**。

本 app 是 `faber-castell-color` 的近親（同為「色號 → CSS 對照」唯讀參考），起手式與許多決議相同；
本檔只寫**與 FC 不同、Caran d’Ache 特有**的取捨，共同者（唯讀無 API、色票不著色、lib↔控制器邊界、
CSS 單一真相、排序模式）指回 FC 的 DESIGN.md 精神即可。

## 1. 為什麼是「唯讀、無後端 API」

同 FC：資料是**固定的**（由官方色卡一次性抽取），不會被使用者新增/編輯，故烘成靜態 registry，
前端 `<script>` 直接載入、免 fetch 免 API。`app.js` 只剩 static + `/`→302 + JSON 404（連 `routes/`、
`public/upload/` 都省）。這是家族「薄後端」原則的極限案例。要更新資料改的是**產生器**（§3），不是 app。

## 2. 為什麼是「系列 / 正典」雙軸（與 FC 平面 141 色的關鍵差異）

FC 是單一廠牌線的**平面 141 色**。Caran d’Ache 的來源總表天生是**關聯式三層**，這是本 app 的價值點：

| 層 | 來源表 | 筆數 | 意義 |
|---|---|---|---|
| 系列色（事實表）| `Series_Color_Index` | 764 | 每個顏色「在某系列裡」一列（8 系列各 76–120 色）|
| 正典色碼（去重）| `Color_Master` | 227 | 同一色碼跨多系列合併成一筆（平均色、名稱變體、跨系列一致性）|
| 跨系列對照 | `Cross_Series_Map` | 227 | 色碼 → 8 系列各自的取樣 hex |

**8 系列**：LUMINANCE 6901（LUM）、PABLO（PAB）、SUPRACOLOR（SUP）、MUSEUM Aquarelle（MUS）、
NEOCOLOR II（NC2）、NEOPASTEL（NEO）、PASTEL PENCILS（PSTP）、PASTEL CUBES（PSTC）。
PSTP/PSTC 共用同一份 84 色官方調色盤。

**產品決策（與 owner 敲定）＝系列優先為預設**：藝術家握在手上的是「一盒 Luminance / Pablo」，
故預設用系列 chips 選一個系列 → 看該系列的色票網格（比照 FC 的單一網格）。**另附「正典色碼」統一瀏覽**
（227 碼，每格顯示平均色＋涵蓋幾系列的徽章）給「這個色碼哪些系列有、差多少」的需求。

**同色碼跨系列色帶＝本 app 的招牌**：任一色票明細都帶一條「同色碼跨系列」色帶，列出該色碼在各系列的
實際 hex（點某系列即跳去看該系列色的完整明細）。把「同一支色碼在不同媒材/系列會長不一樣」這件
Caran d’Ache 特有的事，變成可一眼比較、可互跳的動線。跨系列色差以正典層的 `max_delta_e76` ＋
`cross_series_consistency`（High/Medium/Low）標示——如 code 260「Blue」ΔE76≈80、一致性 Low（NC2 近白、
NEO 深藍），code 371「Bluish pale」ΔE76≈3.8、一致性 High。

## 3. 資料產生管線（單一真相在 xlsx）

`public/apps/caran-dache-color/data/cda-*.js` 由 `data/source/Caran_dAche_Master_Color_Index_v1.0.xlsx`
以 `data/source/generate.py`（Python + openpyxl）產生：

| 輸出 | 全域 | 來源工作表 |
|---|---|---|
| `cda-series.js` | `CDA_SERIES` | `Series_Registry`（8 系列）|
| `cda-colors.js` | `CDA_COLORS`（764）＋`CDA_META` | `Series_Color_Index` |
| `cda-canonical.js` | `CDA_CANONICAL`（227）| `Color_Master` ＋ `Cross_Series_Map`（合併）|

- **為什麼 Python 而非 Node**：FC 的來源是 CSV、用 `generate.js`（Node）即可；本 app 來源是多工作表 xlsx，
  用 openpyxl 讀最省事。產生器僅建置期用、不進前端、不列 `package.json` 依賴（比照「產生器不是 app」精神）。
- **只烘前端要用的欄位、語言取 en/zh-Hant/ja 三語**（對齊家族三語）。xlsx 另有 fr/de/it/es/pt/ko 官方色名，
  需要時擴充 `generate.py` 即可。hex 一律正規化小寫 `#rrggbb`；空字串／`—` 佔位一律省略該鍵。
- **治理表不烘進前端**（`Source_Registry`／`Data_Dictionary`／`Integrity_Check`／`Dashboard`／`Validation_Lists`）——
  它們是溯源與品保 metadata，屬本檔記錄範圍、非 app 內容。

## 4. hex 準確度與限制（沿用官方總表的聲明）

hex ＝官方色卡 PDF 色塊的**中位數 RGB 取樣**、**螢幕近似值**，非官方 RGB/HEX 規格。實體顏色隨紙張、
下筆力道、疊色、加水、黏合劑、光照、掃描器與螢幕描述檔而變。要精準對色以 Caran d’Ache 官方色票為準。
UI 明細與匯出 CSS 檔頭都聲明此限制。

## 5. 色名：英文正典為主、在地色名為輔（家族「資料不翻譯」的正確詮釋）

家族 canon 是「**資料內容永不翻譯、只翻 UI 字串**」。色名是資料。本 app 的取捨：

- **英文正典色名**（`name`）是主要顯示（色票 meta、明細主標）——這是 canonical data。
- 明細內另顯示**在地色名**（`nameZh`/`nameJa`，隨 UI 語言）當一條輔助資料——**這不是翻譯 UI，而是
  呈現總表本就收錄的多語官方色名**（`color_name_zh_tw`/`color_name_ja`）。en 模式下不顯示輔助名（避免與主標重複）。
- 只有按鈕/區塊標籤/toast 等 **UI 字串**走三語 `locales/*.js`。

## 6. lib ↔ 控制器邊界（§4.1）＋ 為 nearestCDA 預留

- **lib（`CaranDacheColorLib`）純邏輯**：`filter`／`sortColors`／`colorFamily`／`hexToRgb`／`rgbToHsl`／
  `rgbToLab`／`deltaE`（ΔE00）／`relLuminance`／`contrastRatio`／`pickTextColor`／`slug`／`copyValue`／
  `buildCss`——不碰 DOM、零依賴。
- **控制器（`caran-dache-color.js`）碰 DOM**：系列/正典雙軸渲染、系列 chips、排序側鍵、色系分群 sticky
  標頭、明細 Modal、同色碼跨系列色帶與跳轉、`navigator.clipboard`（含 `execCommand` 回退）、Blob 下載、
  toast、i18n 重繪、主題/語言切換。把系列色與正典色**正規化成同一個「可渲染色票」介面**（帶 `r/g/b`），
  故 `filter`/`sortColors`/`colorFamily`/`cellHtml` 兩軸共用。
- **`rgbToLab`/`deltaE` 是為 v2 的比對器 `nearestCDA` 預留**（比照 FC lib 兼作 `nearestFC`、被 `color-palette`／
  `thangka-trace` 複製共用）：給任一螢幕色，以 ΔE00 找最接近的 Caran d’Ache 系列色/正典碼。v1 未實作、
  未接消費端，但純函式已就位，屆時加 `nearestCDA` 並依 FC 慣例複製共用即可。

## 7. buildCss 的變數命名（跨系列同碼的必然）

FC 的 `--fc-NNN` 因色碼在單一線內唯一即可。Caran d’Ache **同色碼跨系列重複**（001 在 6–7 個系列都有、
各有不同 hex），故變數必須帶系列：`--cda-<seriesId 小寫>-<code>`（如 `--cda-lum-001`，值即取自總表的
`css_variable` 欄）。`buildCss` 為 764 個系列色各出一個變數 ＋ `.cda-color-<slug>` / `.cda-bg-<slug>`
utility（`slug` = `lum-001`）。正典層無自己的變數（是平均色、非可買到的實體色），故明細只提供 hex/rgb 複製。

## 8. 未做的（已知範圍，非缺陷）

- **無自訂 app icon / favicon set**：比照近親 `faber-castell-color`（亦未附）先不做；日後補則照 §5.5 checklist，
  用**中性的色卡索引標記、不用 Caran d’Ache 品牌 logo**（避免冒用商標）。
- **v1 無 `nearestCDA` 比對器**（見 §6）。
- **只三語色名**（en/zh/ja）進前端；其餘六語在總表、未烘。
