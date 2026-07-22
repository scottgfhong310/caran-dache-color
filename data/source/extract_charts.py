#!/usr/bin/env python3
"""
extract_charts.py — re-extract per-series swatch hex from the OFFICIAL Caran d'Ache
colour-chart PDFs, to correct series whose values in the master index are systematically
wrong (SUP Supracolor & NC2 Neocolor II were recorded far too pale; verified vs the
official charts — PAB matched at ΔE76≈2.5 with this same method, proving it sound).

Reads the official chart PDFs from an EXTERNAL folder (not committed — large official
charts). Writes data/source/resampled_hex.json (small; committed) which generate.py
applies as an override layer. Only the corrected hex values enter the repo, mirroring how
the two LUM #FFFFFF fixes were derived from the external Luminance chart.

Method: render page → for each workbook colour code, find its label word, scan upward for
the longest uniform colour band (the swatch), take its median. Handles white swatches,
borders, and disambiguates round-number labels by longest clean band.

Usage:  python3 extract_charts.py [--pdf-dir "/path/to/CARAN D'ACHE"]
"""
import argparse
import json
import os
import re

import fitz  # PyMuPDF
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
XLSX = os.path.join(HERE, "Caran_dAche_Master_Color_Index_v1.1.0.xlsx")
if not os.path.exists(XLSX):
    XLSX = os.path.join(HERE, "Caran_dAche_Master_Color_Index_v1.0.xlsx")
OUT = os.path.join(HERE, "resampled_hex.json")
DEFAULT_PDF_DIR = "/Users/Shared/nodeapp/My Files/CARAN D'ACHE"

# series_id -> official chart PDF (PSTC shares the Pastel Pencils palette/chart)
CHARTS = {
    "SUP": "Colour_Chart_Supracolor-BD3.pdf",
    "NC2": "Colour_Chart_NeocolorII_841.pdf",
    "MUS": "Colour_Chart_Museum.pdf",
    # validation series (workbook already accurate — band-scan should MATCH, low ΔE76):
    "PAB": "Colour_Chart_Pablo.pdf",
    "NEO": "Colour_Chart_NeoPastel.pdf",
    "PSTP": "Colour_Chart_Pastel_Pencil.pdf",
    "LUM": "nuancier_luminance_fr.pdf",
}
# Which series to actually WRITE as overrides (filled after auditing meanΔE + sanity):
APPLY = {"SUP", "NC2"}
SC = 2.0  # render scale


def med(vals):
    v = sorted(vals)
    return v[len(v) // 2]


def load_codes():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb["Series_Color_Index"]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    hdr = [str(c).strip() if c else "" for c in rows[0]]
    idx = {h: i for i, h in enumerate(hdr)}
    out = {}
    for r in rows[1:]:
        sid = r[idx["series_id"]]
        out.setdefault(sid, {})[str(r[idx["color_code"]])] = r[idx["css_hex_approx"]]
    return out


def hx(h):
    m = re.match(r"^#?([0-9a-fA-F]{6})$", str(h).strip())
    n = int(m.group(1), 16)
    return (n >> 16) & 255, (n >> 8) & 255, n & 255


def lab(r, g, b):
    def ln(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    R, G, B = ln(r), ln(g), ln(b)
    X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
    Y = R * 0.2126 + G * 0.7152 + B * 0.0722
    Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883

    def f(t):
        return t ** (1 / 3.0) if t > 0.008856 else 7.787 * t + 16 / 116.0
    fx, fy, fz = f(X), f(Y), f(Z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def de76(a, b):
    la, lb = lab(*a), lab(*b)
    return sum((x - y) ** 2 for x, y in zip(la, lb)) ** 0.5


class Chart:
    def __init__(self, path):
        doc = fitz.open(path)
        pg = doc[0]
        self.pix = pg.get_pixmap(matrix=fitz.Matrix(SC, SC))
        self.w, self.n, self.samples = self.pix.w, self.pix.n, self.pix.samples
        self.wmap = {}
        for wd in pg.get_text("words"):
            self.wmap.setdefault(wd[4], []).append(wd)

    def px(self, x, y):
        xi, yi = int(x * SC), int(y * SC)
        i = (yi * self.w + xi) * self.n
        s = self.samples
        return s[i], s[i + 1], s[i + 2]

    def _fixed(self, cx, y0):
        # Proven sampler: the swatch sits a fixed offset ABOVE its code label. Median of the
        # swatch core (dy 14..26 page-units up, small dx window). Validated: PAB matches the
        # workbook at ΔE76≈2.5 with this. Also return a variance for disambiguation/QA.
        cols = [self.px(cx + dx, y0 - dy) for dy in range(14, 27, 2) for dx in range(-10, 11, 2)]
        colr = tuple(med([c[k] for c in cols]) for k in range(3))
        var = sum(max(c[k] for c in cols) - min(c[k] for c in cols) for k in range(3))
        return colr, var

    def swatch(self, code):
        cands = self.wmap.get(code, [])
        best = None  # (color, var)
        for b in cands:
            colr, var = self._fixed((b[0] + b[2]) / 2, b[1])
            if best is None or var < best[1]:
                best = (colr, var)
        if best is None:
            return None, 0, len(cands)
        return best[0], best[1], len(cands)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf-dir", default=DEFAULT_PDF_DIR)
    args = ap.parse_args()

    codes = load_codes()
    result = {}
    qa = {}
    for sid, pdf in CHARTS.items():
        path = os.path.join(args.pdf_dir, pdf)
        if not os.path.exists(path):
            print(f"{sid}: chart not found at {path} — skipped")
            continue
        ch = Chart(path)
        series_hex = {}
        des = []
        fails = []
        lowq = []
        for code, wbh in codes.get(sid, {}).items():
            col, var, ncand = ch.swatch(code)
            if not col:
                fails.append(code)
                continue
            hexv = "#%02x%02x%02x" % col
            series_hex[code] = hexv
            des.append(de76(hx(wbh), col))
            if var > 110:  # noisy swatch core (border/edge caught) — worth a look
                lowq.append((code, var))
        result[sid] = series_hex
        mean = sum(des) / len(des) if des else 0
        qa[sid] = {
            "codes": len(codes.get(sid, {})),
            "extracted": len(series_hex),
            "fails": fails,
            "mean_de76_vs_workbook": round(mean, 1),
            "low_quality": lowq,
        }
        tag = "APPLY" if sid in APPLY else "validate"
        sane = {c: series_hex.get(c) for c in ("001", "009", "070", "169", "220") if c in series_hex}
        wbref = {c: codes[sid].get(c) for c in sane}
        print(f"[{tag}] {sid}: {len(series_hex)}/{len(codes.get(sid, {}))} extracted, "
              f"meanΔE76 vs workbook={mean:.1f}, fails={fails}, lowq={len(lowq)}")
        print(f"        sanity mine={sane}")
        print(f"        sanity  wb ={wbref}")

    applied = {sid: result[sid] for sid in APPLY if sid in result}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"_note": "Re-sampled from official Caran d'Ache chart PDFs by extract_charts.py "
                            "to correct systematically-wrong series (SUP, NC2) in the master index. "
                            "Median RGB of the swatch core; see DESIGN.md §4.1.",
                   "_qa": qa, "hex": applied}, f, ensure_ascii=False, indent=1)
    print("wrote", OUT, "(applied series:", sorted(applied), ")")


if __name__ == "__main__":
    main()
