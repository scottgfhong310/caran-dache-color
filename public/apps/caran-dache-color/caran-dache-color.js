/**
 * caran-dache-color.js — 頁面控制器（碰 DOM）
 * 選元素、渲染色票網格（系列 / 正典雙軸）、搜尋、點擊明細與複製、同色碼跨系列對照、
 * CSS 匯出、i18n 重繪、主題/語言切換。純邏輯（過濾 / 對比色 / 產生 CSS）在 CaranDacheColorLib。
 */
(function (window, $) {
  'use strict';

  var Lib = window.CaranDacheColorLib;
  var SERIES = window.CDA_SERIES || [];
  var COLORS = window.CDA_COLORS || [];
  var CANON = window.CDA_CANONICAL || [];
  var META = window.CDA_META || {};

  var LS_THEME = 'caran-dache-color-theme';
  var LS_SORT = 'caran-dache-color-sort';
  var LS_MODE = 'caran-dache-color-mode';
  var LS_SERIES = 'caran-dache-color-series';

  // ---- 索引 ----------------------------------------------------------------
  var seriesById = {}; SERIES.forEach(function (s) { seriesById[s.id] = s; });
  var colorByKey = {};    // 'LUM|001' -> color
  var colorsBySeries = {}; SERIES.forEach(function (s) { colorsBySeries[s.id] = []; });
  COLORS.forEach(function (c) {
    colorByKey[c.seriesId + '|' + c.code] = c;
    (colorsBySeries[c.seriesId] || (colorsBySeries[c.seriesId] = [])).push(c);
  });
  var canonByCode = {}; CANON.forEach(function (c) { canonByCode[c.code] = c; });

  // 把 canonical 色正規化成「可渲染色票」（帶 r/g/b、kind='canon'）
  var CANON_RENDER = CANON.map(function (c) {
    var rgb = Lib.hexToRgb(c.avgHex || '');
    if (!rgb) return null;
    return { kind: 'canon', code: c.code, name: c.name, nameZh: c.nameZh, nameJa: c.nameJa,
             hex: c.avgHex, r: rgb.r, g: rgb.g, b: rgb.b, seriesCount: c.seriesCount, _c: c };
  }).filter(Boolean);

  var $grid, $noResult, $count, $search, $chips, detailModal, cssModal;
  var mode = 'series';
  var activeSeries = (META.seriesOrder && META.seriesOrder[0]) || (SERIES[0] && SERIES[0].id) || 'LUM';
  var sortMode = 'code';
  var current = null;   // { kind, seriesId?, code } 供 i18n 重繪時重開

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function T(key, params) { return window.I18n ? I18n.t(key, params) : key; }

  // 依目前語言取在地色名（en 為主色名、已另處顯示；此處回 zh/ja 輔助名）
  function locName(c) {
    var lang = window.I18n ? I18n.lang : 'zh-Hant';
    if (lang === 'ja') return c.nameJa || '';
    if (lang === 'en') return '';
    return c.nameZh || '';   // zh-Hant 及其他
  }

  // ---- 色票網格 ------------------------------------------------------------
  function cellHtml(c) {
    var fg = Lib.pickTextColor(c);
    var badge = c.kind === 'canon'
      ? '<span class="badge" style="color:' + fg + '">' + c.seriesCount + '</span>' : '';
    var key = c.kind === 'canon' ? c.code : (c.seriesId + '|' + c.code);
    return '<div class="cda-cell" data-kind="' + c.kind + '" data-key="' + esc(key) + '">' +
      '<div class="cda-swatch" style="background:' + esc(c.hex) + ';color:' + fg + '">' +
        '<span class="code">' + esc(c.code) + '</span>' + badge +
      '</div>' +
      '<div class="cda-meta">' +
        '<div class="name" title="' + esc(c.name) + '">' + esc(c.name || '') + '</div>' +
        '<div class="hex">' + esc(c.hex) + '</div>' +
      '</div>' +
    '</div>';
  }

  function groupedHtml(list) {
    var groups = [], cur = null;
    list.forEach(function (c) {
      var fam = Lib.colorFamily(c);
      if (!cur || cur.fam !== fam) { cur = { fam: fam, items: [] }; groups.push(cur); }
      cur.items.push(c);
    });
    return groups.map(function (g) {
      return '<section class="cda-group">' +
        '<h2 class="cda-group-head">' + esc(T('family.' + g.fam)) +
          ' <span class="cda-group-n">' + g.items.length + '</span></h2>' +
        '<div class="cda-grid">' + g.items.map(cellHtml).join('') + '</div></section>';
    }).join('');
  }

  function baseList() {
    return mode === 'canonical' ? CANON_RENDER.slice() : (colorsBySeries[activeSeries] || []).slice();
  }

  function render(list) {
    $grid.html(sortMode === 'family'
      ? groupedHtml(list)
      : '<div class="cda-grid">' + list.map(cellHtml).join('') + '</div>');
    $noResult.toggle(list.length === 0);
    var total = baseList().length;
    $count.text(T('count.showing', { n: list.length, total: total }));
  }

  function applyFilter() {
    render(Lib.filter(Lib.sortColors(baseList(), sortMode), $search.val()));
  }

  // ---- 模式 / 系列切換 -----------------------------------------------------
  function renderChips() {
    $chips.html(SERIES.map(function (s) {
      var active = s.id === activeSeries ? ' active' : '';
      return '<button class="chip series-chip' + active + '" data-series="' + esc(s.id) + '" ' +
        'title="' + esc(s.name) + '"><span class="sid">' + esc(s.id) + '</span>' +
        '<span class="scount">' + (s.count || (colorsBySeries[s.id] || []).length) + '</span></button>';
    }).join(''));
  }

  function applyMode() {
    $('#mode-series').toggleClass('active', mode === 'series');
    $('#mode-canon').toggleClass('active', mode === 'canonical');
    $chips.toggle(mode === 'series');
    renderChips();
    applyFilter();
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    try { localStorage.setItem(LS_MODE, mode); } catch (e) { }
    applyMode();
  }

  function setSeries(id) {
    if (!seriesById[id]) return;
    activeSeries = id;
    try { localStorage.setItem(LS_SERIES, id); } catch (e) { }
    renderChips();
    applyFilter();
  }

  function cycleSort() {
    var modes = Lib.SORT_MODES;
    sortMode = modes[(modes.indexOf(sortMode) + 1) % modes.length];
    try { localStorage.setItem(LS_SORT, sortMode); } catch (e) { }
    applyFilter();
    M.toast({ html: T('toast.sort', { m: T('sort.' + sortMode) }), classes: 'teal' });
  }

  // ---- 同色碼跨系列色帶 ----------------------------------------------------
  function crossStripHtml(code, currentSeriesId) {
    var canon = canonByCode[code];
    if (!canon || !canon.series) return '';
    var order = META.seriesOrder || Object.keys(canon.series);
    return order.filter(function (sid) { return canon.series[sid]; }).map(function (sid) {
      var hex = canon.series[sid];
      var rgb = Lib.hexToRgb(hex) || { r: 0, g: 0, b: 0 };
      var fg = Lib.pickTextColor(rgb);
      var here = sid === currentSeriesId ? ' here' : '';
      return '<button class="cross-item' + here + '" data-series="' + esc(sid) + '" data-code="' + esc(code) + '" ' +
        'title="' + esc((seriesById[sid] && seriesById[sid].name) || sid) + '" ' +
        'style="background:' + esc(hex) + ';color:' + fg + '">' +
        '<span class="cs-sid">' + esc(sid) + '</span><span class="cs-hex">' + esc(hex) + '</span></button>';
    }).join('');
  }

  // ---- 明細 Modal ----------------------------------------------------------
  var SERIES_COPY = ['var', 'hex', 'rgb', 'class'];
  var CANON_COPY = ['hex', 'rgb'];

  function factRow(label, val) {
    return '<tr><td class="fk">' + esc(label) + '</td><td class="fv">' + esc(val) + '</td></tr>';
  }

  function openSeriesDetail(seriesId, code) {
    var c = colorByKey[seriesId + '|' + code];
    if (!c) return;
    current = { kind: 'series', seriesId: seriesId, code: code };
    var fg = Lib.pickTextColor(c), sName = (seriesById[seriesId] && seriesById[seriesId].name) || seriesId;

    $('#detail-head').attr('style', 'background:' + c.hex + ';color:' + fg);
    $('#detail-code').text(seriesId + ' · ' + c.code);
    $('#detail-tag').text(sName);
    $('#detail-name').text(c.name || '');
    var loc = locName(c); $('#detail-name-loc').text(loc).toggle(!!loc);
    $('#detail-note').text(T('note.approx') + (c.note ? '  ·  ' + c.note : ''));

    $('#detail-copy').html(SERIES_COPY.map(function (fmt) {
      return '<button class="copy-btn" data-fmt="' + fmt + '">' +
        '<i class="material-icons">content_copy</i>' + esc(Lib.copyValue(c, fmt)) + '</button>';
    }).join('')).show();

    var facts = [];
    if (c.lf) {
      var lf = c.lf + (c.lfNorm ? ' · ' + T('facts.lfNorm', { v: c.lfNorm }) : '') +
               (c.lfStd ? ' · ' + c.lfStd : '');
      facts.push(factRow(T('facts.lightfastness'), lf));
    }
    if (c.pig) facts.push(factRow(T('facts.pigment'), c.pig + (c.pigN ? '  (' + c.pigN + ')' : '')));
    if (c.contrast != null) {
      facts.push(factRow(T('facts.wcag'),
        (c.wcag || '') + '  ·  ' + T('facts.contrast', { v: c.contrast })));
    }
    $('#detail-facts').html(facts.join('')); $('#detail-facts-sec').toggle(facts.length > 0);

    $('#detail-cross').html(crossStripHtml(code, seriesId));
    var canon = canonByCode[code];
    $('#detail-cross-note').text(canon && canon.maxDeltaE76 != null
      ? T('cross.delta', { v: canon.maxDeltaE76, c: canon.consistency || '' }) : '');
    $('#detail-cross-sec').toggle(!!(canon && canon.series));

    detailModal.open();
  }

  function openCanonDetail(code) {
    var c = canonByCode[code];
    if (!c) return;
    current = { kind: 'canon', code: code };
    var rgb = Lib.hexToRgb(c.avgHex) || { r: 0, g: 0, b: 0 };
    var fg = Lib.pickTextColor(rgb);

    $('#detail-head').attr('style', 'background:' + c.avgHex + ';color:' + fg);
    $('#detail-code').text(c.code);
    $('#detail-tag').text(T('detail.canonTag', { n: c.seriesCount || 0 }));
    $('#detail-name').text(c.name || '');
    var loc = locName(c); $('#detail-name-loc').text(loc).toggle(!!loc);
    $('#detail-note').text(T('note.avg') + (c.note ? '  ·  ' + c.note : ''));

    $('#detail-copy').html(CANON_COPY.map(function (fmt) {
      return '<button class="copy-btn" data-fmt="' + fmt + '">' +
        '<i class="material-icons">content_copy</i>' + esc(Lib.copyValue({ hex: c.avgHex, r: rgb.r, g: rgb.g, b: rgb.b }, fmt)) + '</button>';
    }).join('')).show();

    var facts = [];
    if (c.pigments) facts.push(factRow(T('facts.pigmentVariants'), c.pigments));
    if (c.consistency) facts.push(factRow(T('facts.consistency'), c.consistency));
    if (c.maxDeltaE76 != null) facts.push(factRow(T('facts.maxDelta'), c.maxDeltaE76));
    $('#detail-facts').html(facts.join('')); $('#detail-facts-sec').toggle(facts.length > 0);

    $('#detail-cross').html(crossStripHtml(code, null));
    $('#detail-cross-note').text('');
    $('#detail-cross-sec').toggle(!!c.series);

    detailModal.open();
  }

  function reopenCurrent() {
    if (!current) return;
    if (current.kind === 'series') openSeriesDetail(current.seriesId, current.code);
    else openCanonDetail(current.code);
  }

  // ---- 複製 ----------------------------------------------------------------
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
  function flashCopied($btn, text) {
    copyText(text).then(function () {
      $btn.addClass('copied');
      setTimeout(function () { $btn.removeClass('copied'); }, 1200);
      M.toast({ html: T('toast.copied', { v: esc(text) }), classes: 'teal' });
    }).catch(function () {
      M.toast({ html: T('toast.copyFail'), classes: 'red' });
    });
  }
  function currentCopyValue(fmt) {
    if (!current) return '';
    if (current.kind === 'series') {
      var c = colorByKey[current.seriesId + '|' + current.code];
      return c ? Lib.copyValue(c, fmt) : '';
    }
    var cc = canonByCode[current.code]; if (!cc) return '';
    var rgb = Lib.hexToRgb(cc.avgHex) || {};
    return Lib.copyValue({ hex: cc.avgHex, r: rgb.r, g: rgb.g, b: rgb.b }, fmt);
  }

  // ---- CSS 匯出（只涵蓋 series 色） ---------------------------------------
  function cssText() { return Lib.buildCss(COLORS); }
  function openCss() { $('#css-pre').text(cssText()); cssModal.open(); }
  function downloadCss() {
    var blob = new Blob([cssText()], { type: 'text/css' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = Lib.cssFilename();
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    M.toast({ html: T('toast.downloaded', { n: Lib.cssFilename() }), classes: 'green' });
  }

  // ---- 主題 / 語言 ---------------------------------------------------------
  function applyTheme(theme) {
    var r = document.documentElement;
    r.setAttribute('data-theme', theme);
    r.classList.toggle('dark-mode', theme === 'dark');
    r.classList.toggle('light-mode', theme === 'light');
    try { localStorage.setItem(LS_THEME, theme); } catch (e) { }
    $('#setting-mode i').text(theme === 'dark' ? 'dark_mode' : 'light_mode');
  }
  function toggleTheme() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  function onI18n() {
    renderChips();
    applyFilter();
    if (current && detailModal && detailModal.isOpen) reopenCurrent();
  }

  // ---- 啟動 ----------------------------------------------------------------
  $(function () {
    $grid = $('#grid'); $noResult = $('#no-result'); $count = $('#count');
    $search = $('#search'); $chips = $('#series-chips');

    detailModal = M.Modal.init(document.getElementById('detail-modal'), { dismissible: true });
    cssModal = M.Modal.init(document.getElementById('css-modal'), { dismissible: true });

    try {
      var sv = localStorage.getItem(LS_SORT); if (sv && Lib.SORT_MODES.indexOf(sv) !== -1) sortMode = sv;
      var mv = localStorage.getItem(LS_MODE); if (mv === 'series' || mv === 'canonical') mode = mv;
      var sr = localStorage.getItem(LS_SERIES); if (sr && seriesById[sr]) activeSeries = sr;
    } catch (e) { }

    if (window.I18n) { I18n.apply(document); }
    applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    applyMode();

    $search.on('input', applyFilter);
    $('#setting-sort').on('click', cycleSort);

    $('#mode-series').on('click', function () { setMode('series'); });
    $('#mode-canon').on('click', function () { setMode('canonical'); });
    $chips.on('click', '.series-chip', function () { setSeries($(this).data('series') + ''); });

    $grid.on('click', '.cda-cell', function () {
      var kind = $(this).data('kind'), key = $(this).data('key') + '';
      if (kind === 'canon') openCanonDetail(key);
      else { var p = key.split('|'); openSeriesDetail(p[0], p[1]); }
    });

    // 跨系列色帶：點某系列 → 跳到該系列色的明細
    $('#detail-cross').on('click', '.cross-item', function () {
      openSeriesDetail($(this).data('series') + '', $(this).data('code') + '');
    });

    $('#detail-copy').on('click', '.copy-btn', function () {
      flashCopied($(this), currentCopyValue($(this).data('fmt')));
    });

    $('#setting-css').on('click', openCss);
    $('#setting-download').on('click', downloadCss);
    $('#css-copy').on('click', function () {
      copyText(cssText()).then(function () { M.toast({ html: T('toast.cssCopied'), classes: 'teal' }); })
        .catch(function () { M.toast({ html: T('toast.copyFail'), classes: 'red' }); });
    });
    $('#css-download').on('click', downloadCss);

    $('#setting-mode').on('click', toggleTheme);
    $('#setting-lang').on('click', function () {
      var next = I18n.cycle();
      M.toast({ html: T('toast.lang', { name: I18n.name(next) }), classes: 'teal' });
    });

    document.addEventListener('i18n:changed', onI18n);
  });
})(window, jQuery);
