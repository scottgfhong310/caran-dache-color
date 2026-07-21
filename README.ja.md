# caran-dache-color

> 版本 v1.0｜最終更新 2026-07-22

[繁體中文](README.zh-Hant.md) ｜ [English](README.md) ｜ **日本語**

**Caran d’Ache の色番号を CSS に対応させる**シングルページ参照 WebApp。**8 つの主要アーティストシリーズ**を
すべて収録。シリーズごとにスウォッチグリッドで閲覧するか、**正準色番号**ビューに切り替え可能。スウォッチを
クリックすると、コピー可能な値・耐光性・顔料・WCAG データに加え、ジャンプできる**同一色番号のシリーズ横断**帯が
表示されます。全体を変数とユーティリティクラスの `.css` としてエクスポートできます。

hex は**公式カラーチャート PDF スウォッチの中央値 RGB 抽出**による画面上の近似値で、Caran d’Ache 公式
RGB/HEX 仕様では**ありません**。同じ色番号でもシリーズ（媒体・バインダーの違い）により発色が異なります。

## 範囲

- **8 シリーズ** — LUMINANCE 6901、PABLO、SUPRACOLOR、MUSEUM Aquarelle、NEOCOLOR II、NEOPASTEL、
  PASTEL PENCILS、PASTEL CUBES（後者 2 つは同一の公式 84 色パレットを共有）。
- **764 シリーズ色**（色×シリーズごとに 1 行）· **227 正準色番号**（シリーズ横断で重複排除）。

## 特長

- **2 つの閲覧軸** — *シリーズ*（8 チップ → そのシリーズのグリッド）と *正準色番号*（227 番号、各々に
  シリーズ横断平均色のスウォッチ＋収録シリーズ数バッジ）。
- **同一色番号のシリーズ横断帯** — すべての詳細ビューに、その色番号の各シリーズでの実際の hex を列挙。
  シリーズをクリックすればそのシリーズ色へジャンプ。シリーズ横断の最大色差 ΔE76 と一貫性（High/Medium/Low）を表示。
- **検索** — 色番号または色名（英/中/日）で即時フィルタ。
- **並び替え** — サイドツールで循環：色番号 / 色相スペクトル / 明度 / 色系統グループ（9 系統＋sticky ヘッダ、
  無彩色は末尾）/ hex 生値；保持されます。
- **4 形式でコピー** — `var(--cda-lum-001)`、`#f4f4f5`、`rgb(244, 244, 245)`、`.cda-bg-lum-001`。
- **詳細ビュー** — 耐光性（評価＋正規化 /5＋規格）、顔料インデックス、WCAG AA コントラスト；
  ローカライズされた色名（中/日）を補足データとして表示。
- **CSS エクスポート** — `caran_dache_colors.css` の表示 / コピー / ダウンロード（764 個の
  `--cda-<series>-<code>` 変数 ＋ `.cda-color-…` / `.cda-bg-…` ユーティリティクラス）。
- **読み取り専用** — アップロードなし、バックエンド API なし。データはマスターインデックスから生成した静的レジストリ。
- **ライト / ダークテーマ**（デフォルト dark）と **3 言語 UI**（zh-Hant / en / ja）。スウォッチは両テーマで本来の色を保持。

## インストールと実行

```bash
npm install
npm start          # → http://localhost:3000/apps/caran-dache-color/
```

他の家族アプリと併走する場合は `PORT` を指定：`PORT=3008 npm start`。

Node サーバーが必要（フロントエンドは絶対パスを使用）——GitHub Pages 静的ホスティングとは**非互換**。

## 構成

```
app.js                                  # Express：static + / → 302 + JSON 404（API なし、アップロードなし）
data/source/                            # 単一の真実（ビルド時のみ）
├─ Caran_dAche_Master_Color_Index_v1.0.xlsx
└─ generate.py                          # xlsx → cda-*.js（openpyxl が必要）
public/apps/caran-dache-color/
├─ index.html · caran-dache-color.css · caran-dache-color.js · caran-dache-color-lib.js
├─ data/cda-series.js                   # window.CDA_SERIES — 8 シリーズ
├─ data/cda-colors.js                   # window.CDA_COLORS — 764 シリーズ色（＋ window.CDA_META）
├─ data/cda-canonical.js                # window.CDA_CANONICAL — 227 正準番号 ＋ シリーズ横断 hex
├─ materialize-dark.css · side-tool.css · filter-clear.css · filter-clear.js · i18n.js · locales/{zh-Hant,en,ja}.js
```

xlsx 編集後のデータ再生成：`cd data/source && python3 generate.py`。

## コアライブラリ（`CaranDacheColorLib`）

純粋なロジック、DOM に触れない — どこにでも埋め込み可能：

| メソッド | 用途 |
|---|---|
| `filter(colors, query)` | 色番号または色名（英/中/日）でフィルタ（大小文字問わず、入力を変更しない）|
| `sortColors(colors, mode)` | `'code'` / `'hue'` / `'lightness'` / `'family'` / `'hex'` で並び替え（入力を変更しない）|
| `colorFamily(color)` | 9 系統のどれか（グレー → `'neutral'`）|
| `hexToRgb` / `rgbToHsl` / `rgbToLab` | 色空間変換 |
| `deltaE(labA, labB)` | CIEDE2000（ΔE00）——将来の `nearestCDA` マッチャー用に予約 |
| `pickTextColor(color)` | `'#000000'` / `'#ffffff'` — スウォッチ上でコントラストの高い文字色（WCAG）|
| `copyValue(color, fmt)` | `fmt`：`'var'` / `'hex'` / `'rgb'` / `'class'` → コピー文字列 |
| `buildCss(colors)` | CSS 全文（`:root` 変数 + ユーティリティクラス）|

## データ構造

```jsonc
// window.CDA_COLORS — 各シリーズ色
{
  "id": "CDA-LUM-001", "seriesId": "LUM", "code": "001", "order": 1,
  "name": "White", "nameZh": "白色", "nameJa": "ホワイト",   // en が正準色名；zh/ja はソースデータ
  "hex": "#f4f4f5", "r": 244, "g": 244, "b": 245,
  "lf": "I", "lfNorm": 1.67, "lfMax": 3, "lfStd": "ASTM D-6901",  // 耐光性
  "pig": "PW6", "pigN": 1,                                        // 顔料インデックス / 数
  "wcag": "PASS", "contrast": 19.11,
  "canon": "CDA-CODE-001", "cssVar": "--cda-lum-001"
}

// window.CDA_CANONICAL — 各正準色番号（シリーズ横断で重複排除）
{
  "code": "001", "name": "White", "nameZh": "白色", "nameJa": "ホワイト",
  "seriesCount": 6, "seriesList": ["LUMINANCE 6901", "PABLO", "…"],
  "pigments": "PW6", "avgHex": "#f6f1ed", "maxDeltaE76": 7.5, "consistency": "High",
  "series": { "LUM": "#f4f4f5", "PAB": "#fef2e7", "…": "…" }   // この色番号の各シリーズでの hex
}
```

値のないフィールドは省略されます（ソースが空 / 非該当）。各シリーズの `hex` ≠ `avgHex`；そのばらつきを
`maxDeltaE76` / `consistency` が表します。

## ソースと精度

データは `Caran_dAche_Master_Color_Index_v1.0.xlsx` に由来し、これ自体は公式 Caran d’Ache カラーチャート
PDF から編纂されています。hex は**中央値 RGB の画面近似値**で公式仕様ではありません。実際の色は紙、筆圧、
重ね塗り、水、バインダー、照明、スキャナー、ディスプレイプロファイルにより変化します。2 軸データモデル、
シリーズ横断帯、生成パイプラインは [DESIGN.md](DESIGN.md) を参照。

## ライセンス

[MIT](LICENSE) © 2026 [Scott G.F. Hong](https://github.com/scottgfhong310)
