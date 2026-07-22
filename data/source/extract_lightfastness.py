#!/usr/bin/env python3
"""
extract_lightfastness.py — read authoritative per-colour lightfastness (star ratings) from
the official Caran d'Ache Beaux-Arts 2025 catalogue, to correct the master index.

The master index's lightfastness_rating is systematically wrong: MUS/NEO/PSTP are ~2 stars
too low, and PAB/SUP/NC2 collapsed EVERY colour to the minimum "H" (1). The 2025 catalogue
(Catcoul_Beauxarts_2025_EN_BD.pdf) prints the correct star rating per colour; its own legend
confirms the ranges (Museum ★★-★★★★★, Pablo ★-★★★). Extraction validated: the 6 lowest-rated
Pablo colours come out as exactly the known-fugitive ones (Salmon/Pink/Mauve/Sky blue…).

Each chart row is `code … <pigment?> #####`, where the run of '#' glyphs in the text layer is
the star field — its length is the rating. We anchor on that #-run and attach the nearest
colour code to its left.

Reads the catalogue PDF from an EXTERNAL folder (not committed). Writes
data/source/catalogue_lightfastness.json (small; committed) → generate.py applies it.
PSTC shares the Pastel Pencils palette, so it inherits PSTP's ratings.

Usage:  python3 extract_lightfastness.py [--pdf-dir "/path/to/CARAN D'ACHE"]
"""
import argparse
import json
import os
import re

import fitz
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
XLSX = os.path.join(HERE, "Caran_dAche_Master_Color_Index_v1.0.2.xlsx")
OUT = os.path.join(HERE, "catalogue_lightfastness.json")
DEFAULT_PDF_DIR = "/Users/Shared/nodeapp/My Files/CARAN D'ACHE"
CATALOGUE = "Catcoul_Beauxarts_2025_EN_BD.pdf"

# series_id -> catalogue chart page (0-based). LUM uses a different LFI/LFII system and is
# left untouched; PSTC inherits PSTP.
PAGE = {"MUS": 7, "PAB": 21, "SUP": 22, "NC2": 24, "NEO": 15, "PSTP": 13}
HASH = re.compile(r"^#+$")


def cy(w):
    return (w[1] + w[3]) / 2


def wb_codes():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb["Series_Color_Index"]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    hdr = [str(c).strip() if c else "" for c in rows[0]]
    i = {h: j for j, h in enumerate(hdr)}
    out = {}
    for r in rows[1:]:
        out.setdefault(r[i["series_id"]], set()).add(str(r[i["color_code"]]).zfill(3))
    return out


def stars_for_page(doc, pno, codeset):
    w = doc[pno].get_text("words")
    out = {}
    for sw in w:
        if not HASH.match(sw[4]):
            continue
        y = cy(sw)
        left = [x for x in w if abs(cy(x) - y) < 5 and x[2] <= sw[0] + 1
                and re.fullmatch(r"\d{3}", x[4]) and x[4].zfill(3) in codeset]
        if not left:
            continue
        code = max(left, key=lambda z: z[0])[4].zfill(3)
        if code not in out:                       # first (nearest) #-run after the code
            out[code] = sw[4].count("#")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf-dir", default=DEFAULT_PDF_DIR)
    args = ap.parse_args()
    doc = fitz.open(os.path.join(args.pdf_dir, CATALOGUE))
    codes = wb_codes()

    result = {}
    for sid, pno in PAGE.items():
        codeset = codes.get(sid, set())
        stars = stars_for_page(doc, pno, codeset)
        result[sid] = {c: stars[c] for c in sorted(stars)}
        missing = sorted(codeset - set(stars))
        print(f"{sid}: {len(stars)}/{len(codeset)} rated"
              + (f"  MISSING {missing}" if missing else ""))

    # PSTC shares the Pastel Pencils palette -> inherit PSTP ratings
    if "PSTP" in result and "PSTC" in codes:
        result["PSTC"] = {c: v for c, v in result["PSTP"].items() if c in codes["PSTC"]}
        print(f"PSTC: inherited {len(result['PSTC'])} from PSTP")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"_note": "Per-colour lightfastness (star count) read from the official "
                            "Caran d'Ache Beaux-Arts 2025 catalogue to correct the master index, "
                            "whose ratings were systematically ~2 stars too low. See DESIGN.md §4.2. "
                            "rating string = 'H' * stars; LUM excluded (different LFI/LFII system).",
                   "stars": result}, f, ensure_ascii=False, indent=1)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
