# Corrected reference data

> 版本 v1.0.2｜最後更新 2026-07-22

`Caran_dAche_Master_Color_Index_v1.1.0-corrected.xlsx` — the **corrected, authoritative
reference** version of the Caran d’Ache master colour index, in the same 13-sheet shape as
the original. Built on top of upstream **v1.0.2**. (Unofficial — an app-author reference
build, not an official Caran d’Ache release.)

## What was corrected (vs upstream v1.0.2)

- **SUP (Supracolor, 120) & NC2 (Neocolor II, 84)** were recorded systematically **too
  pale** across the WHOLE palette. Upstream v1.0.2 only patched **3 individual black
  swatches** (NC2 008/009, SUP 009) — it missed that the entire two series are off. Both
  series were **re-sampled from the official Caran d’Ache colour-chart PDFs** (median RGB of
  the swatch core — the method the workbook claims). Validated: with the same sampler,
  PAB / NEO / PSTP matched at ΔE76 4–7 (accurate), while SUP / NC2 were off by 31–37 (wrong).
- **204 series-colours** re-sampled; **Cross_Series_Map**, **Swatch_Reference** and every
  **Color_Master** row that includes SUP or NC2 (133 codes) were recomputed for consistency
  — hex, rgb, hsl, lab, contrast, relative luminance, recommended foreground, WCAG, and the
  cross-series average / ΔE76 / consistency. hex↔rgb columns verified 0 mismatches.
- The two Luminance `#FFFFFF` swatches (009 Black, 639 Dark indigo) and the 3 black patches
  were already fixed upstream (v1.0.1 / v1.0.2) and are carried through.
- The other series' hex (PAB / NEO / PSTP / PSTC / MUS / LUM) were left as their upstream values.

**Lightfastness (all series except LUM):** the `lightfastness_rating` was systematically ~2
stars too low — MUS/NEO/PSTP offset −2, and PAB/SUP/NC2 collapsed *every* colour to the
minimum "H". Replaced (664 rows) with the official per-colour star ratings from the **Caran
d'Ache Beaux-Arts 2025 catalogue** (`Catcoul_Beauxarts_2025_EN_BD.pdf`), with
`lightfastness_normalized_5` recomputed. Verified: the catalogue's lowest-rated Pablo colours
are exactly the known-fugitive ones. Pigments were checked too but left as-is (the workbook is
more complete than the catalogue's abbreviated list). LUM (LFI/LFII) unchanged.

## How it was produced (reproducible)

```
data/source/extract_charts.py        # re-samples SUP/NC2 from the official PDFs → resampled_hex.json
data/source/build_corrected_xlsx.py  # applies it to a copy of v1.0.1 → this workbook
```

The official chart PDFs are **not** in the repo (large official charts); they live in the
owner's `My Files/CARAN D'ACHE/`. Only the small `resampled_hex.json` and the scripts are
version-controlled. Design rationale: [`../../DESIGN.md`](../../DESIGN.md) §4.1.

## Caveat

Re-saved via openpyxl from v1.0.1, so workbook-level extras (conditional formatting, the
Dashboard chart) may be simplified. **The tabular data is authoritative**; the visuals are
secondary. hex values remain **screen approximations** sampled from official charts, not
official Caran d’Ache RGB specifications.
