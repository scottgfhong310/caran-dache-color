# caran-dache-color

> 版本 v1.1｜最後更新 2026-07-22

[繁體中文](README.zh-Hant.md) ｜ **English** ｜ [日本語](README.ja.md)

A single-page reference WebApp mapping **Caran d’Ache colour codes → CSS**, across all **9 core artist series**.
Browse a series as a swatch grid, or switch to the **canonical-code** view; click any swatch for its copy-ready
values, lightfastness, pigment and WCAG data, plus a **same-code-across-series** strip you can jump through.
Export the whole thing as a `.css` file of variables and utility classes.

Hex values are **median RGB sampled from the official colour-chart PDFs** — screen approximations, **not**
official Caran d’Ache RGB/HEX specs. The same colour code renders differently across series (different media/binders).

## Scope

- **9 series** — LUMINANCE 6901, PABLO, SUPRACOLOR Soft Aquarelle, MUSEUM Aquarelle, NEOCOLOR II, NEOPASTEL,
  PASTEL PENCILS, PASTEL CUBES, **NEOART 6901** (Pastel Pencils/Cubes share one 84-colour palette; Pastel Cubes is
  a legacy palette; NEOART 6901 — 48 colours — was added in master-index v1.1.0).
- **812 series-colours** (one row per colour-in-a-series) · **227 canonical codes** (de-duplicated across series).

## Features

- **Two browse axes** — *Series* (9 chips → that series' grid) and *Canonical codes* (227 codes, each with a
  swatch of its cross-series average and a badge for how many series carry it).
- **Same-code-across-series strip** — every detail view lists the code's actual hex in each series; click a
  series to jump straight to that series' colour. Max cross-series ΔE76 + consistency (High/Medium/Low) are shown.
- **Search** — filter instantly by colour code or name (English / 中文 / 日本語).
- **Sort** — a side-tool cycles code / hue spectrum / lightness / colour-family groups (nine wheel families with
  sticky headers; greys tail) / raw hex value; persisted.
- **Copy in four formats** — `var(--cda-lum-001)`, `#f4f4f5`, `rgb(244, 244, 245)`, `.cda-bg-lum-001`.
- **Detail view** — lightfastness (rating + normalised /5 + standard), pigment index, WCAG AA contrast;
  localized colour name (zh/ja) shown as supplementary data.
- **CSS export** — view / copy / download `caran_dache_colors.css` (812 `--cda-<series>-<code>` vars +
  `.cda-color-…` / `.cda-bg-…` utility classes).
- **Read-only** — no upload, no backend API; data is a static registry generated from the master index.
- **light / dark theme** (default dark) and **three UI languages** (zh-Hant / en / ja). Swatches keep their
  true colour in both themes.

## Install & run

```bash
npm install
npm start          # → http://localhost:3000/apps/caran-dache-color/
```

Set `PORT` to run alongside other family apps: `PORT=3008 npm start`.

Needs the Node server (front-end uses absolute paths) — **not** GitHub Pages compatible.

## Structure

```
app.js                                  # Express: static + / → 302 + JSON 404 (no API, no upload)
data/source/                            # single source of truth (build-time only)
├─ Caran_dAche_Master_Color_Index_v1.1.0.xlsx
└─ generate.py                          # xlsx → cda-*.js (needs openpyxl)
public/apps/caran-dache-color/
├─ index.html · caran-dache-color.css · caran-dache-color.js · caran-dache-color-lib.js
├─ data/cda-series.js                   # window.CDA_SERIES — 9 series
├─ data/cda-colors.js                   # window.CDA_COLORS — 812 series-colours (+ window.CDA_META)
├─ data/cda-canonical.js                # window.CDA_CANONICAL — 227 codes + cross-series hex
├─ materialize-dark.css · side-tool.css · filter-clear.css · filter-clear.js · i18n.js · locales/{zh-Hant,en,ja}.js
```

Regenerate data after editing the xlsx: `cd data/source && python3 generate.py`.

## Core library (`CaranDacheColorLib`)

Pure logic, no DOM — embeddable anywhere:

| Method | Purpose |
|---|---|
| `filter(colors, query)` | filter by code or name (en/zh/ja, case-insensitive, does not mutate) |
| `sortColors(colors, mode)` | sort by `'code'` / `'hue'` / `'lightness'` / `'family'` / `'hex'` (does not mutate) |
| `colorFamily(color)` | which of nine wheel families (greys → `'neutral'`) |
| `hexToRgb` / `rgbToHsl` / `rgbToLab` | colour-space conversions |
| `deltaE(labA, labB)` | CIEDE2000 (ΔE00) — reserved for a future `nearestCDA` matcher |
| `pickTextColor(color)` | `'#000000'` / `'#ffffff'` — higher-contrast text for a swatch (WCAG) |
| `copyValue(color, fmt)` | `fmt`: `'var'` / `'hex'` / `'rgb'` / `'class'` → copy string |
| `buildCss(colors)` | full CSS text (`:root` vars + utility classes) |

## Data shape

```jsonc
// window.CDA_COLORS — each series-colour
{
  "id": "CDA-LUM-001", "seriesId": "LUM", "code": "001", "order": 1,
  "name": "White", "nameZh": "白色", "nameJa": "ホワイト",   // en is canonical; zh/ja are source data
  "hex": "#f4f4f5", "r": 244, "g": 244, "b": 245,
  "lf": "I", "lfNorm": 1.67, "lfMax": 3, "lfStd": "ASTM D-6901",  // lightfastness
  "pig": "PW6", "pigN": 1,                                        // pigment index / count
  "wcag": "PASS", "contrast": 19.11,
  "canon": "CDA-CODE-001", "cssVar": "--cda-lum-001"
}

// window.CDA_CANONICAL — each canonical code (de-duplicated across series)
{
  "code": "001", "name": "White", "nameZh": "白色", "nameJa": "ホワイト",
  "seriesCount": 6, "seriesList": ["LUMINANCE 6901", "PABLO", "…"],
  "pigments": "PW6", "avgHex": "#f6f1ed", "maxDeltaE76": 7.5, "consistency": "High",
  "series": { "LUM": "#f4f4f5", "PAB": "#fef2e7", "…": "…" }   // per-series hex for this code
}
```

Absent fields are omitted (empty / not-applicable in the source). `hex` per series ≠ `avgHex`; the spread is
what `maxDeltaE76` / `consistency` describe.

## Source & accuracy

Data derived from `Caran_dAche_Master_Color_Index_v1.1.0.xlsx`, itself compiled from official Caran d’Ache
colour-chart PDFs. Hex is a **median-RGB screen approximation**, not an official spec; physical colour varies
with paper, pressure, layering, water, binder, lighting, scanner and display profile. See [DESIGN.md](DESIGN.md)
for the two-axis data model, the cross-series strip, and the generation pipeline.

## License

[MIT](LICENSE) © 2026 [Scott G.F. Hong](https://github.com/scottgfhong310)
