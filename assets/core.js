// ID PLANNER widgets — shared theme + option handling.
// Every widget reads its settings from the URL so a buyer can restyle it by pasting a new link into Notion.
// Colours come from config/themes.js (generated from assets/themes/themes.json — the same source as the covers).
// Common params: theme · soft · deep · mode(light|dark|auto) · border(card|line|none) · radius(0–32) · bg · weekStart(mon|sun)
// Legacy aliases kept for links made before 2026-09-17: frame=none → border=none, start → weekStart.
(function () {
  var CFG = window.IDP_CONFIG || { themes: {}, defaults: { theme: 'lavender', mode: 'light', border: 'card', radius: 18, weekStart: 'mon' } };
  var THEMES = CFG.themes;
  var D = CFG.defaults;
  var q = new URLSearchParams(window.IDP_PRESET != null && !location.search ? window.IDP_PRESET : location.search);
  var root = document.documentElement;

  function hex(v) { return /^[0-9a-f]{3,8}$/i.test(v || '') ? '#' + v : null; }
  function pick(p, name, allowed, fallback) {
    var v = p.get(name);
    return allowed.indexOf(v) >= 0 ? v : fallback;
  }

  function applyTheme(p) {
    var t = THEMES[p.get('theme')] || THEMES[D.theme] || THEMES[Object.keys(THEMES)[0]];
    var soft = hex(p.get('soft')) || t.soft, deep = hex(p.get('deep')) || t.deep;
    root.style.setProperty('--soft', soft);
    root.style.setProperty('--deep', deep);
    var mode = pick(p, 'mode', ['light', 'dark', 'auto'], D.mode);
    if (mode === 'auto') mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    // the sampled wash is a light-paper colour; dark mode and custom colours derive theirs
    var tint = mode === 'dark' ? 'color-mix(in srgb, ' + deep + ' 22%, #202020)'
      : hex(p.get('soft')) ? 'color-mix(in srgb, ' + soft + ' 35%, #fff)' : (t.tint || 'color-mix(in srgb, ' + soft + ' 35%, #fff)');
    root.style.setProperty('--tint', tint);
    root.dataset.mode = mode;
    var border = p.get('frame') === 'none' ? 'none' : pick(p, 'border', ['card', 'line', 'none'], D.border);
    root.dataset.frame = border;
    var r = parseInt(p.get('radius'), 10);
    root.style.setProperty('--radius', (isNaN(r) ? D.radius : Math.max(0, Math.min(32, r))) + 'px');
    root.style.setProperty('--bg', hex(p.get('bg')) || 'transparent');
  }
  // A buyer's saved theme (set from the ⚙ panel in any widget) overrides the preset for every ID Archive widget
  // on this device: all Notion HTML embeds share one origin, so one choice recolours the whole planner.
  var STORE = 'idarchive.theme.v1';
  function saved() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }

  // per-widget options (D-DAY date, routine items, water goal …) live next to the theme, so nobody has to edit a link
  var OPTS = 'idp-widget-opts';
  function optsAll() { try { return JSON.parse(localStorage.getItem(OPTS) || '{}'); } catch (e) { return {}; } }
  function optsFor(w) { return optsAll()[w] || {}; }
  function optSave(w, k, v) {
    var all = optsAll(); all[w] = all[w] || {};
    if (v === '' || v == null) delete all[w][k]; else all[w][k] = String(v);
    try { localStorage.setItem(OPTS, JSON.stringify(all)); } catch (e) { /* storage blocked: this view only */ }
  }
  var optWidget = null, optDefs = [], optHandler = null, panelEl = null;
  function effective() {
    var p = new URLSearchParams(q.toString()), s = saved();
    if (s && q.get('lock') !== '1') Object.keys(s).forEach(function (k) { if (s[k] === '') p.delete(k); else p.set(k, s[k]); });
    return p;
  }
  applyTheme(effective());
  window.addEventListener('storage', function (e) { if (e.key === STORE) applyTheme(effective()); });

  function settingsPanel() {
    if (q.get('settings') === '0' || !document.querySelector('.card')) return; // Studio page and opted-out widgets have no panel
    var btn = document.createElement('button');
    btn.className = 'idp-gear'; btn.type = 'button'; btn.setAttribute('aria-label', '위젯 색상 설정'); btn.textContent = '⚙';
    var panel = document.createElement('div');
    panel.className = 'idp-panel'; panel.hidden = true;
    var s = saved() || {};
    var html = '<div class="idp-panel-title">THEME</div><div class="idp-swatches">';
    Object.keys(THEMES).forEach(function (name) {
      html += '<button type="button" data-theme="' + name + '" title="' + name + '" aria-label="' + name + '" style="background:linear-gradient(135deg,' +
        THEMES[name].soft + ' 50%,' + THEMES[name].deep + ' 50%)"></button>';
    });
    html += '</div><label class="idp-row">나만의 색 <input type="color" data-k="soft"></label>' +
      '<div class="idp-row"><button type="button" data-mode="light">라이트</button><button type="button" data-mode="dark">다크</button></div>' +
      '<div class="idp-row"><button type="button" data-border="card">카드</button><button type="button" data-border="line">윗선</button><button type="button" data-border="none">없음</button></div>' +
      '<label class="idp-row">둥글기 <input type="range" min="0" max="32" step="2" data-k="radius"></label>' +
      '<div class="idp-row"><button type="button" data-reset>기본값</button><button type="button" data-close>닫기</button></div>' +
      '<div class="idp-note">이 기기의 모든 ID Archive 위젯에 적용돼요</div>';
    panel.innerHTML = html;
    function save(patch) {
      var cur = saved() || {};
      Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
      try { localStorage.setItem(STORE, JSON.stringify(cur)); } catch (e) { /* storage blocked: apply for this view only */ }
      var p = new URLSearchParams(q.toString());
      Object.keys(cur).forEach(function (k) { if (cur[k] === '') p.delete(k); else p.set(k, cur[k]); });
      applyTheme(p);
    }
    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (t.dataset.theme) save({ theme: t.dataset.theme, soft: '', deep: '' });
      else if (t.dataset.mode) save({ mode: t.dataset.mode });
      else if (t.dataset.border) save({ border: t.dataset.border, frame: '' });
      else if (t.hasAttribute('data-reset')) { try { localStorage.removeItem(STORE); } catch (err) {} applyTheme(q); }
      else if (t.hasAttribute('data-close')) panel.hidden = true;
    });
    panel.querySelector('[data-k="soft"]').addEventListener('input', function (e) {
      var v = e.target.value.slice(1);
      save({ soft: v, deep: v });
    });
    var range = panel.querySelector('[data-k="radius"]');
    range.value = s.radius || D.radius;
    range.addEventListener('input', function (e) { save({ radius: e.target.value }); });
    btn.addEventListener('click', function () { panel.hidden = !panel.hidden; });
    document.body.appendChild(btn); document.body.appendChild(panel);
    panelEl = panel;
    if (optDefs.length) renderOptions();
  }

  function renderOptions() {
    if (!panelEl || !optDefs.length || panelEl.querySelector('.idp-opts')) return;
    var box = document.createElement('div');
    box.className = 'idp-opts';
    box.innerHTML = '<div class="idp-panel-title" style="margin-top:14px">이 위젯</div>';
    var cur = optsFor(optWidget);
    optDefs.forEach(function (d) {
      var row = document.createElement('label');
      row.className = 'idp-row';
      var val = cur[d.k] != null ? cur[d.k] : (q.get(d.k) || '');
      row.innerHTML = '<span style="flex:0 0 auto">' + d.label + '</span>' +
        '<input type="' + (d.t || 'text') + '" data-opt="' + d.k + '" style="flex:1;min-width:0" ' +
        (d.ph ? 'placeholder="' + d.ph + '" ' : '') + 'value="' + String(val).replace(/"/g, '&quot;') + '">';
      box.appendChild(row);
    });
    box.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-opt');
      if (!k) return;
      optSave(optWidget, k, e.target.value);
      if (optHandler) optHandler();
    });
    var last = panelEl.querySelector('.idp-note');
    panelEl.insertBefore(box, last || null);
  }
  if (document.body) settingsPanel(); else document.addEventListener('DOMContentLoaded', settingsPanel);

  var weekStart = q.get('weekStart') || q.get('start') || D.weekStart;

  var DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  // the planner's printed date: "2027. 08. 19 THU"
  function plannerDate(d) { return d.getFullYear() + '. ' + pad(d.getMonth() + 1) + '. ' + pad(d.getDate()); }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  // a widget declares its own settings once: IDP.options('dday', [{k:'title',label:'제목'}, …], redraw)
  function options(widget, defs, onChange) {
    optWidget = widget; optDefs = defs || []; optHandler = onChange || null;
    renderOptions();
  }
  // value for a widget option: what the buyer chose in ⚙ first, then the link's parameter, then the default
  function opt(widget, k, fallback) {
    var v = optsFor(widget)[k];
    if (v != null && v !== '') return v;
    v = q.get(k);
    return v != null && v !== '' ? v : fallback;
  }


  // Starter content. A widget shows `d` (pipe separated) and `done` (comma separated indexes) from the URL
  // only while nothing has been written on this device yet — the moment the reader types, their own text wins.
  // It lets a shared dashboard link arrive with example rows instead of blank ones.
  function seed() {
    var d = q.get('d');
    return (d == null || d === '') ? [] : String(d).split('|');
  }
  function seedDone() {
    var v = q.get('done');
    return !v ? [] : String(v).split(',').map(Number).filter(function (n) { return n === n; });
  }

  window.IDP = { q: q, CFG: CFG, THEMES: THEMES, applyTheme: applyTheme, weekStart: weekStart === 'sun' ? 'sun' : 'mon',
    DOW: DOW, MONTHS: MONTHS, pad: pad, iso: iso, plannerDate: plannerDate, parseDate: parseDate,
    options: options, opt: opt, seed: seed, seedDone: seedDone };
})();
