#!/bin/bash
# sync-copies.sh — 把本 repo 的權威版同步到所有登記的複製點，並以 md5 驗證。
#
# 權威版＝ GitHub/caran-dache-color。複製點見 CLAUDE.md 的「複製件登記」：
#   caran-dache-color-lib.js ＋ data/cda-colors.js → color-palette / thangka-trace / color-mixer
#   整包前端 → InProgress 鏡像
#
# 比照 faber-castell-color/scripts/sync-copies.sh（同一套形狀）。
# 那支的教訓是「同步腳本不該住在暫存區，否則暫存區被清掉就會漏同步」——
# 本檔在 2026-07-29 A5（資料改由 db_artcolor 匯出）時補上，因為那次改動
# 讓 cda-colors.js 的 6 份複製一次全部過時，卻沒有腳本可跑。
#
# 用法：bash scripts/sync-copies.sh
set -u
G=/Users/Shared/nodeapp/GitHub
I=/Users/Shared/nodeapp/InProgress
SRC=$G/caran-dache-color/public/apps/caran-dache-color
FAIL=0

echo "=== 1) 整包前端 → InProgress 鏡像 ==="
mkdir -p "$I/public/apps/caran-dache-color/"
cp -R "$SRC/." "$I/public/apps/caran-dache-color/"

echo "=== 2) 共用 lib + 資料 → color-palette / thangka-trace / color-mixer（含各自的 InProgress 鏡像）==="
# 這三支消費端只用 nearestCDA，故只需 lib ＋ cda-colors.js
# （cda-series.js／cda-canonical.js 是本 app 的雙軸瀏覽才用得到，不外送）
for app in color-palette thangka-trace color-mixer; do
  for dst in "$G/$app/public/apps/$app" "$I/public/apps/$app"; do
    [ -d "$dst" ] || { echo "  MISSING $dst"; FAIL=1; continue; }
    cp "$SRC/caran-dache-color-lib.js" "$dst/caran-dache-color-lib.js"
    cp "$SRC/data/cda-colors.js"       "$dst/data/cda-colors.js"
  done
done

verify() {   # $1=標籤, 其餘=所有複製點
  local label=$1; shift
  local n
  n=$(md5 -r "$@" | awk '{print $1}' | sort -u | wc -l | tr -d ' ')
  if [ "$n" = "1" ]; then echo "  OK        $label — $# 份單一 hash"
  else echo "  MISMATCH  $label — $n 種 hash"; md5 -r "$@"; FAIL=1; fi
}

echo
echo "=== md5 驗證 ==="
verify "caran-dache-color-lib.js" \
  "$SRC/caran-dache-color-lib.js" \
  "$G/color-palette/public/apps/color-palette/caran-dache-color-lib.js" \
  "$G/thangka-trace/public/apps/thangka-trace/caran-dache-color-lib.js" \
  "$I/public/apps/caran-dache-color/caran-dache-color-lib.js" \
  "$I/public/apps/color-palette/caran-dache-color-lib.js" \
  "$I/public/apps/thangka-trace/caran-dache-color-lib.js" \
  "$G/color-mixer/public/apps/color-mixer/caran-dache-color-lib.js" \
  "$I/public/apps/color-mixer/caran-dache-color-lib.js"

verify "data/cda-colors.js" \
  "$SRC/data/cda-colors.js" \
  "$G/color-palette/public/apps/color-palette/data/cda-colors.js" \
  "$G/thangka-trace/public/apps/thangka-trace/data/cda-colors.js" \
  "$I/public/apps/caran-dache-color/data/cda-colors.js" \
  "$I/public/apps/color-palette/data/cda-colors.js" \
  "$I/public/apps/thangka-trace/data/cda-colors.js" \
  "$G/color-mixer/public/apps/color-mixer/data/cda-colors.js" \
  "$I/public/apps/color-mixer/data/cda-colors.js"

echo "=== InProgress 前端整包逐檔比對 ==="
if diff -rq "$SRC" "$I/public/apps/caran-dache-color" > /dev/null; then
  echo "  OK  與獨立版逐檔相同（$(find "$SRC" -type f | wc -l | tr -d ' ') 個檔）"
else
  diff -rq "$SRC" "$I/public/apps/caran-dache-color"
  FAIL=1
fi

echo
if [ "$FAIL" -eq 0 ]; then echo "全部通過。"; else echo "有項目不一致（見上）。"; fi
exit "$FAIL"
