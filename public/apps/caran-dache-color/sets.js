/**
 * sets — 系列收錄對照（第二頁的控制器）
 *
 * 這一頁只回答一個問題：**選一條系列，其他系列涵蓋了它幾成？**
 * 版面沿用 faber-castell-color／finecolour-color 的第二頁：固定 Header（標題＋目前基準系列）
 * → 一張表 → 頁尾說明；不包捲動外框，表頭各列自己 sticky 在 Header 底下。
 *
 * ⚠️ **為什麼欄位是「系列」而不是「套組」**
 * CDA 在 `db_artcolor` 裡**沒有套組**（`tb_assortment` 對本品牌是 0 列）——它沒有
 * 盒裝套組那種資料。FC／COPIC／finecolour 的第二頁比的是「套組收錄了哪些色」；
 * CDA 能比、而且更該比的是**系列**：同一個正典色碼，哪幾條系列有出。
 *
 * ⚠️ **格子裡放的是顏色，不是勾號**
 * CDA 的**同色碼跨系列是不同顏色**（治理 §3.1，也是本庫用 per-line hex 的唯一品牌）。
 * `CDA_CANONICAL[i].series` 就是每條系列對該碼的實際 hex，所以格子直接畫那個顏色
 * ——**那條規則因此在畫面上看得見，不必用文字說**。同一列橫著看就是「同一個色號，
 * 九條系列各自長什麼樣」。
 *
 * ⚠️ **本頁刻意不做的兩件事**
 *   · **沒有明細卡**：CDA 的明細 Modal 寫在 `caran-dache-color.js` 裡、不是跨頁模組
 *     （不像 finecolour 有 `colour-detail.js`）。與其把它複製一份，這一頁做成自足的：
 *     點格子＝複製該系列的 hex。要看明細回色票頁。
 *   · **沒有最接近色側欄**：同上，它的 markup 寫在 index.html 裡。
 *   兩者都是「與其複製，不如不做」——複製件是本家族反覆記載的麻煩來源。
 */
(function () {
  'use strict';

  var L = window.CaranDacheColorLib;
  var SERIES = window.CDA_SERIES || [];
  var CANON = window.CDA_CANONICAL || [];
  var LS_PICK = 'caran-dache-color-sets-pick';

  var $picked = document.getElementById('picked');
  var $matrix = document.getElementById('matrix');
  var $foot = document.getElementById('matrix-foot');

  var SERIES_IDS = SERIES.map(function (s) { return s.id; });
  var pick = null;          // 基準系列 id，null ＝ 未選

  function t(key, fb, params) {
    if (!window.I18n || !I18n.t) return fb;
    var v = I18n.t(key, params);
    return (v && v !== key) ? v : fb;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function seriesById(id) {
    return SERIES.filter(function (s) { return s.id === id; })[0] || null;
  }
  /** 認不得的值一律當「未選」——舊的 localStorage 值若原樣沿用會匹配不到任何系列。 */
  function pickOrNull(v) { return (v && SERIES_IDS.indexOf(v) >= 0) ? v : null; }

  function localName(c) {
    var lang = (window.I18n && I18n.lang) || 'zh-Hant';
    if (lang.indexOf('zh') === 0) return c.nameZh || c.name || '';
    if (lang === 'ja') return c.nameJa || c.name || '';
    return c.name || '';
  }

  // ---- 固定 Header --------------------------------------------------------

  function renderPicked() {
    var s = pick && seriesById(pick);
    if (!s) {
      $picked.innerHTML = '<span class="picked-hint">' +
        esc(t('sets.pickHint', '點欄位下方的色數，就只留下該系列有出的色')) + '</span>';
      return;
    }
    var n = L.codesInSeries(CANON, pick).length;
    $picked.innerHTML =
      '<span class="picked-chip">' +
        '<span class="picked-name">' + esc(s.name) + '</span>' +
        '<span class="picked-n">' + esc(t('sets.showingN', '{n} 色', { n: n }).replace('{n}', n)) + '</span>' +
        '<button class="picked-clear" id="picked-clear" type="button" ' +
          'data-i18n-title="sets.clear" title="' + esc(t('sets.clear', '清除選擇')) + '">' +
          '<i class="material-icons">close</i></button>' +
      '</span>';
  }

  // ---- 表頭 ---------------------------------------------------------------

  function headHtml(gaps) {
    var rowspanLabel = function (key, fb) {
      return '<th class="c-color r-label">' + esc(t(key, fb)) + '</th>';
    };
    // 第 1 列：系列名（直排——名字比欄寬長得多）
    var h1 = SERIES.map(function (s) {
      return '<th class="c-series" title="' + esc(s.name + '｜' + s.medium) + '">' +
        '<span class="vtext">' + esc(s.name) + '</span></th>';
    }).join('');
    // 第 2 列：等級（Professional / Artist…）
    var h2 = SERIES.map(function (s) {
      return '<th class="c-grade"><span title="' + esc(s.grade || '') + '">' +
        esc(s.grade || '－') + '</span></th>';
    }).join('');
    // 第 3 列：色數（點它＝選為基準系列）
    var h3 = SERIES.map(function (s) {
      return '<th class="c-size' + (s.id === pick ? ' is-picked' : '') + '" data-series="' + esc(s.id) + '"' +
        ' title="' + esc(s.name) + '">' + s.count + '</th>';
    }).join('');
    // 第 4 列：相對基準系列還缺幾色（只有選了基準才出現）
    var h4 = '';
    if (gaps) {
      h4 = '<tr class="r-gap">' + rowspanLabel('sets.gapRow', '相對基準系列還缺幾色') +
        SERIES.map(function (s) {
          var g = gaps[s.id];
          var cls = s.id === pick ? ' is-picked' : (g === 0 ? ' is-full' : '');
          return '<td class="c-gap' + cls + '" title="' + esc(s.id === pick
            ? t('sets.gapSelf', '基準系列本身')
            : t('sets.gapTip', '相對基準系列，這一欄還缺 {n} 色', { n: g }).replace('{n}', g)) + '">' +
            (s.id === pick ? '—' : (g === 0 ? '0' : '−' + g)) + '</td>';
        }).join('') + '</tr>';
    }
    return '<thead>' +
      '<tr class="r-series">' + rowspanLabel('sets.rowSeries', '系列') + h1 + '</tr>' +
      '<tr class="r-grade">' + rowspanLabel('sets.rowGrade', '等級') + h2 + '</tr>' +
      '<tr class="r-size">' + rowspanLabel('sets.colColour', '色') + h3 + '</tr>' +
      h4 + '</thead>';
  }

  // ---- 內容 ---------------------------------------------------------------
  // 列＝正典色碼。未選基準時列出全部 227 個碼；選了基準就把它沒出的列**藏起來**
  // （不重建、不重排，所以選/取消時版面與捲動位置都不跳）。
  function bodyHtml(rows) {
    return '<tbody>' + rows.map(function (r) {
      var c = r.canon || {};
      var hidden = pick && !r.cells[pick];
      var rgb = c.avgHex ? L.hexToRgb(c.avgHex) : null;
      var fg = rgb ? L.pickTextColor(rgb) : 'inherit';
      var cells = SERIES.map(function (s) {
        var hex = r.cells[s.id];
        if (!hex) return '<td class="cell' + (s.id === pick ? ' is-pickedcell' : '') + '"></td>';
        return '<td class="cell is-in' + (s.id === pick ? ' is-pickedcell' : '') + '">' +
          '<button type="button" class="swatch" data-hex="' + esc(hex) + '" ' +
            'style="background:' + esc(hex) + '" ' +
            'title="' + esc(s.name + ' ' + r.code + ' ' + hex) + '"></button></td>';
      }).join('');
      return '<tr data-code="' + esc(r.code) + '"' + (hidden ? ' class="is-hidden"' : '') + '>' +
        '<th class="c-color"><span class="ccell">' +
          '<span class="mini" style="background:' + esc(c.avgHex || 'transparent') + ';color:' + fg + '">' +
            esc(r.code) + '</span>' +
          '<span class="cname" title="' + esc(localName(c)) + '">' + esc(localName(c)) + '</span>' +
        '</span></th>' + cells + '</tr>';
    }).join('') + '</tbody>';
  }

  function allCodes() {
    return CANON.map(function (c) { return c.code; });
  }

  function render() {
    var rows = L.seriesMatrix(CANON, SERIES_IDS, pick, { codes: allCodes() });
    var gaps = pick ? L.seriesGaps(CANON, SERIES_IDS, pick) : null;

    $matrix.innerHTML = '<table class="assort' + (gaps ? ' has-gap' : '') + '">' +
      headHtml(gaps) + bodyHtml(rows) + '</table>';
    renderPicked();

    var shown = pick ? L.codesInSeries(CANON, pick).length : CANON.length;
    $foot.textContent = t('sets.foot', '{rows} 個正典色碼 × {cols} 條系列；目前顯示 {shown} 列', {
      rows: CANON.length, cols: SERIES.length, shown: shown
    }).replace('{rows}', CANON.length).replace('{cols}', SERIES.length).replace('{shown}', shown);

    if (window.I18n && I18n.apply) I18n.apply(document);
    measureHead();
  }

  /** 表頭各列 sticky 的 top 是從 Header 高度累加的；高度隨語言與換行變動，故量出來寫進 CSS 變數。 */
  function measureHead() {
    var h = document.getElementById('page-head');
    document.documentElement.style.setProperty('--head-h', (h ? h.offsetHeight : 0) + 'px');
  }

  function setPick(id) {
    pick = id || null;
    try { localStorage.setItem(LS_PICK, pick || ''); } catch (e) { }
    render();
  }

  // ---- 複製 ---------------------------------------------------------------
  // 形制同 caran-dache-color.js 的 copyText：`navigator.clipboard` 在權限被拒或非安全脈絡下
  // 會**拒絕而不是不存在**，所以 fallback 與 reject 分支兩者都要有——只寫
  // `if (navigator.clipboard)` 的話，失敗時畫面完全沒有反應，看起來像沒點到。
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy'); document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('execCommand'));
      } catch (e) { reject(e); }
    });
  }
  function toast(html) { if (window.M && M.toast) M.toast({ html: html }); }

  // ---- 事件 ---------------------------------------------------------------

  function bind() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('#picked-clear')) { setPick(''); return; }

      var th = e.target.closest('th.c-size');
      if (th) {                                   // 點色數＝選為基準系列（再點一次取消）
        var id = th.dataset.series;
        setPick(id === pick ? '' : id);
        return;
      }
      var sw = e.target.closest('.swatch');
      if (sw) {                                   // 點色片＝複製該系列的 hex
        var hex = sw.dataset.hex;
        copyText(hex).then(function () {
          toast(t('toast.copied', '已複製：{v}', { v: hex }).replace('{v}', hex));
        }, function () {
          // 沿用既有的共用 key（§6：它不吃參數，別為了塞 hex 另造一句）
          toast(t('toast.copyFail', '複製失敗（需 localhost 或 HTTPS）'));
        });
      }
    });

    // 語言切換後整張表要重繪（色名依語言、表頭與說明都吃 i18n）
    document.addEventListener('i18n:changed', render);
    window.addEventListener('resize', measureHead);
  }

  function initTools() {
    document.getElementById('setting-mode').addEventListener('click', function () {
      var mode = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      var r = document.documentElement;
      r.dataset.theme = mode;
      r.classList.toggle('dark-mode', mode === 'dark');
      r.classList.toggle('light-mode', mode === 'light');
      try { localStorage.setItem('caran-dache-color-theme', mode); } catch (e) { }
    });
    document.getElementById('setting-lang').addEventListener('click', function () {
      var next = I18n.cycle();
      if (window.M && M.toast) M.toast({ html: I18n.t('toast.lang', { name: I18n.name(next) }), displayLength: 1400 });
    });
    // 「回色票頁」是真的 <a href>，不攔——無 JS 時也是同一個行為。
  }

  function init() {
    if (!L || !CANON.length) return;
    try { pick = pickOrNull(localStorage.getItem(LS_PICK)); } catch (e) { pick = null; }
    bind();
    initTools();
    if (window.I18n && I18n.apply) I18n.apply(document);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
