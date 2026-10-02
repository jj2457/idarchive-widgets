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

  var STYLES = [
    ['editorial', 'SOFT EDITORIAL'],
    ['minimal', 'MINIMAL PASTEL'],
    ['cream', 'COZY CREAM'],
    ['sage', 'SAGE PLANNER'],
    ['note', 'LAVENDER NOTE'],
    ['business', 'CLEAN BUSINESS']
  ];
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
    // a style preset changes density, corner, edge, shadow, badge and heading face together;
    // colour still comes from the theme, so any preset works with any of the nine pastels
    var style = pick(p, 'style', STYLES.map(function (s) { return s[0]; }), '');
    if (style) root.dataset.style = style; else root.removeAttribute('data-style');
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
    touch(w);
  }

  // ---- Carrying content to another device -------------------------------------------------
  // Widgets keep what a person writes in this browser's storage, and browser storage never leaves
  // the device. Rather than promise a sync we cannot honestly provide without a server, the ⚙ panel
  // can bake the widget's current content into its own link: paste that link back into the Notion
  // block and every device that opens the planner shows the same content.
  // The stamp decides conflicts — a link only overwrites a device whose own last edit is older.
  var SHARE = {}, applying = false;
  function prefixOf(w) { return 'idarchive.' + w + '.'; }
  function stampOf(w) { return 'idarchive.stamp.' + w; }
  function touch(w) {
    if (!w || applying) return;
    try { localStorage.setItem(stampOf(w), String(Date.now())); } catch (e) {}
  }
  try {
    var _set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      _set.call(this, k, v);
      if (this === localStorage && typeof k === 'string' && k.indexOf('idarchive.') === 0) {
        var w = k.slice(10).split('.')[0];
        if (SHARE[w] && k !== stampOf(w)) touch(w);
      }
    };
  } catch (e) { /* storage locked down: sharing simply stays off */ }

  function b64(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64(str) {
    var t = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    return decodeURIComponent(escape(atob(t)));
  }
  // How long a link may get. A browser would swallow far more, but a link is something a person
  // copies, pastes into a Notion block and sometimes sends to themselves — past a few thousand
  // characters that stops being a link and becomes a problem. A year of diary entries or a year of
  // focus sessions genuinely does not fit, and saying so is better than handing over a broken address.
  var LIMIT = 6000;
  var DATEKEY = /^\d{4}-\d{2}(-\d{2})?$/, WEEKKEY = /^\d{4}-W\d{2}$/;

  function bake(w) {
    var keys = {}, pre = prefixOf(w);
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(pre) === 0) keys[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    // secret 표시가 있는 설정(예: 노션 연결 번호)은 공유 링크에 절대 담지 않는다 — 링크를 본 사람이 내 노션을 고칠 수 있게 되므로
    var o = Object.assign({}, optsFor(w));
    optDefs.forEach(function (d) { if (d.secret) delete o[d.k]; });
    return { t: Date.now(), o: o, k: keys };
  }
  function lenOf(pay) {
    return (location.origin + location.pathname).length + 4 +
      new URLSearchParams(q.toString()).toString().length + b64(JSON.stringify(pay)).length;
  }
  // Keeping the newest is the only trim a person would have chosen themselves: this week's plan
  // matters, the week in February does not. It works in two places — one storage key per period
  // (weekplan, worklog), and one blob keyed by day inside a single key (journal, mood).
  function datedKeys(obj) {
    var ks = Object.keys(obj);
    if (ks.length < 4) return null;
    var dated = ks.filter(function (k) { return DATEKEY.test(k) || WEEKKEY.test(k); });
    return dated.length >= ks.length * 0.8 ? ks.slice().sort() : null;
  }
  function trim(w, pay) {
    var note = '';
    // 1. whole keys, oldest first — "idarchive.weekplan.main.2027-W07"
    var names = Object.keys(pay.k).sort();
    while (names.length > 1 && lenOf(pay) > LIMIT) {
      delete pay.k[names.shift()];
      note = '최근 ' + names.length + '개 기간만 담았어요';
    }
    // 2. inside one key, days or weeks written as object keys
    if (lenOf(pay) > LIMIT && names.length === 1) {
      var only = names[0], val = null;
      try { val = JSON.parse(pay.k[only]); } catch (e) { val = null; }
      var sorted = (val && typeof val === 'object' && !Array.isArray(val)) ? datedKeys(val) : null;
      if (sorted) {
        var keep = sorted.length;
        while (keep > 1 && lenOf(pay) > LIMIT) {
          keep = Math.max(1, keep - Math.max(1, Math.round(keep * 0.2)));
          var cut = {};
          sorted.slice(sorted.length - keep).forEach(function (k) { cut[k] = val[k]; });
          pay.k[only] = JSON.stringify(cut);
        }
        note = '최근 ' + keep + '개 날짜만 담았어요';
      }
    }
    return lenOf(pay) > LIMIT ? { over: lenOf(pay) } : { note: note };
  }
  function applyPayload(w, pay) {
    var mine = 0;
    try { mine = +(localStorage.getItem(stampOf(w)) || 0); } catch (e) {}
    if (!pay || !pay.t || pay.t <= mine) return false;   // this device edited more recently — keep it
    applying = true;
    try {
      var all = optsAll();
      all[w] = pay.o || {};
      try { localStorage.setItem(OPTS, JSON.stringify(all)); } catch (e) {}
      Object.keys(pay.k || {}).forEach(function (k) {
        if (k.indexOf(prefixOf(w)) !== 0) return;         // a link may only fill its own widget
        try { localStorage.setItem(k, pay.k[k]); } catch (e) {}
      });
      try { localStorage.setItem(stampOf(w), String(pay.t)); } catch (e) {}
    } finally { applying = false; }
    return true;
  }
  // A widget declares itself shareable. IDP.options() does this for you; widgets with no settings
  // of their own call IDP.share('name') directly.
  function share(w) {
    if (!w || SHARE[w]) return;
    SHARE[w] = true;
    renderShare();
    var raw = q.get('s');
    if (!raw) return;
    var pay = null;
    try { pay = JSON.parse(unb64(raw)); } catch (e) { return; }
    if (!pay || pay.w !== w) return;
    if (!applyPayload(w, pay)) return;
    if (optHandler) optHandler();
    else setTimeout(function () { location.reload(); }, 0);  // no redraw hook: the stamp stops this repeating
  }
  // returns {url, note} when it fits, or {over: <length>} when the content is simply too much
  function shareLink(w) {
    var pay = bake(w); pay.w = w;
    var fit = trim(w, pay);
    if (fit.over) return fit;
    var p = new URLSearchParams(q.toString());
    p.set('s', b64(JSON.stringify(pay)));
    return { url: location.origin + location.pathname + '?' + p.toString(), note: fit.note };
  }

  var optWidget = null, optDefs = [], optHandler = null, panelEl = null;
  // ── 테마 설정 3단계(오너 2026-10-01): 전체(위 STORE) → 페이지(링크의 page=GOALS …) → 위젯(이 위젯 이름), 아래가 위를 이긴다.
  // 정본은 노션 연결 서버(/v1/theme 의 config) — 여기 LAYERS 는 그 사본(연결하지 않았으면 이 기기의 설정). 색만 나눈다(스타일 · 모서리는 전체).
  // spec = { theme } | { custom: { soft: '#..', deep: '#..' } } — 서버와 같은 모양. dirty = ⚙ 로 바꿨지만 아직 서버에 올리지 않은 위젯
  var LAYERS = 'idarchive.theme.layers.v1';
  var WKEY = (location.pathname.split('/').pop() || '').replace(/\.html$/, '').toLowerCase();
  function layers() {
    var L = null; try { L = JSON.parse(localStorage.getItem(LAYERS) || 'null'); } catch (e) {}
    L = L && typeof L === 'object' ? L : {};
    return { pages: L.pages || {}, widgets: L.widgets || {}, dirty: L.dirty || {} };
  }
  function setLayers(L) { try { localStorage.setItem(LAYERS, JSON.stringify(L)); } catch (e) { return false; } applyTheme(effective()); return true; }
  function specInto(s, p) {
    if (!s) return;
    if (s.theme && THEMES[s.theme]) { p.set('theme', s.theme); p.delete('soft'); p.delete('deep'); }
    else if (s.custom && hex(String(s.custom.soft || '').slice(1))) { p.set('soft', s.custom.soft.slice(1)); p.set('deep', String(s.custom.deep || s.custom.soft).slice(1)); }
  }
  // 노션이 색을 링크에 적어 둔 위젯(ts=1, sync/theme.mjs embedUrl): 링크의 색이 정본 — 그 페이지 색(theme · soft · deep) 위에 위젯별 색(wt · ws · wd).
  // 이 기기의 「모든 위젯」 색은 이런 위젯을 덮지 않는다(다른 기기 · 휴대폰과 같은 색). 이 기기의 「이 위젯만」은 덮는다.
  var SYNCED = q.get('ts') === '1';
  var COLOUR = ['theme', 'soft', 'deep'];
  function linkBase(p) { COLOUR.forEach(function (k) { if (q.get(k)) p.set(k, q.get(k)); else p.delete(k); }); }
  function layered(p) {
    var L = layers(), own = L.widgets[WKEY];
    if (!SYNCED) specInto(L.pages[q.get('page')], p);
    if (own && own.inherit) { if (SYNCED) linkBase(p); }     // 「전체 테마 따르기」 — 링크에 적힌 위젯별 색도 무시
    else specInto(own, p);
    return p;
  }
  // 이 위젯만 따로(⚙ 「이 위젯만」) — null 이면 「전체 테마 따르기」(따로 정한 것을 지운다)
  function setWidget(spec) {
    var L = layers();
    // 링크에 위젯별 색(wt)이 적혀 있으면 지우는 것만으로는 그 색이 남는다 → 「따르기」 표시를 둔다(서버에 올리면 위젯별 설정이 지워진다)
    if (spec) L.widgets[WKEY] = spec; else if (SYNCED && q.get('wt')) L.widgets[WKEY] = { inherit: true }; else delete L.widgets[WKEY];
    L.dirty[WKEY] = 1;
    var ok = setLayers(L);
    pushWidget();
    return ok;
  }
  // ⚙ 「이 위젯만」은 서버(정본 — 플래너마다 하나)에 바로 올린다(오너 2026-10-01 Final 요구: localStorage 만 정본으로 두지 않는다).
  // 노션과 연결된 플래너의 위젯(ts=1)이고 이 기기에 연결이 있을 때. 없으면 이 기기에서만 바뀐 것을 그대로 알린다.
  // 다른 기기의 위젯 색(노션 링크)은 Theme Studio 「노션에 적용」 때 바뀐다 — 설정 저장과 적용 결과는 따로.
  var pushTimer = null, pushState = '';
  function pushWidget() {
    if (!SYNCED) return;
    clearTimeout(pushTimer);
    pushState = 'saving'; syncNote();
    pushTimer = setTimeout(function () {                       // 색상 상자를 끄는 동안 여러 번 바뀌므로 잠깐 모았다가 한 번
      function go() {
        if (!IDP.sync || !IDP.sync.on || !IDP.sync.wid()) { pushState = 'local'; return syncNote(); }
        IDP.sync.syncLayers().then(function (c) { pushState = c ? 'saved' : 'local'; syncNote(); }, function () { pushState = 'error'; syncNote(); });
      }
      if (IDP.sync) return go();
      var sc = document.createElement('script'); sc.src = 'assets/sync.js'; sc.onload = go; sc.onerror = function () { pushState = 'error'; syncNote(); };
      document.head.appendChild(sc);
    }, 700);
  }
  function syncNote() {
    var el = panelEl && panelEl.querySelector('.idp-sync-note');
    if (!el) return;
    el.textContent = { saving: '저장하는 중…', saved: '✓ 내 플래너 설정에 저장했어요 — 다른 기기 위젯은 Theme Studio 에서 「노션에 적용」하면 같은 색이 돼요',
      local: '이 기기에서만 바뀌었어요 — 다른 기기와 맞추려면 Theme Studio 에서 노션과 연결해 주세요', error: '서버에 저장하지 못했어요 — 잠시 뒤 다시 골라 주세요' }[pushState] || '';
  }
  function effective() {
    var p = new URLSearchParams(q.toString()), s = saved();
    if (q.get('lock') === '1') return p;
    if (s) Object.keys(s).forEach(function (k) { if (SYNCED && COLOUR.indexOf(k) >= 0) return; if (s[k] === '') p.delete(k); else p.set(k, s[k]); });
    if (SYNCED && q.get('wt')) { p.set('theme', q.get('wt')); if (q.get('ws')) { p.set('soft', q.get('ws')); p.set('deep', q.get('wd') || q.get('ws')); } else { p.delete('soft'); p.delete('deep'); } }
    return layered(p);
  }
  applyTheme(effective());
  window.addEventListener('storage', function (e) { if (e.key === STORE || e.key === LAYERS) applyTheme(effective()); });
  // Theme Studio 「저장」 · 노션 연결의 테마 — ⚙ 와 같은 저장소라 이 기기의 모든 위젯이 따른다
  function saveTheme(patch) {
    var cur = saved() || {};
    Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    try { localStorage.setItem(STORE, JSON.stringify(cur)); } catch (e) { return false; }
    applyTheme(effective());
    return true;
  }

  function settingsPanel() {
    if (q.get('settings') === '0' || !document.querySelector('.card')) return; // Studio page and opted-out widgets have no panel
    var btn = document.createElement('button');
    btn.className = 'idp-gear'; btn.type = 'button'; btn.setAttribute('aria-label', '위젯 색상 설정'); btn.textContent = '⚙';
    var panel = document.createElement('div');
    panel.className = 'idp-panel'; panel.hidden = true;
    var s = saved() || {};
    // 색을 「모든 위젯」에 줄지 「이 위젯만」 줄지 — 처음엔 모든 위젯(이 위젯을 따로 정해 두었으면 이 위젯만)
    var ownNow = layers().widgets[WKEY];
    var scope = SYNCED || (ownNow && !ownNow.inherit) ? 'one' : 'all';
    var html = '<div class="idp-panel-title">STYLE</div><div class="idp-styles">';
    STYLES.forEach(function (st) {
      html += '<button type="button" data-style="' + st[0] + '">' + st[1] + '</button>';
    });
    html += '<button type="button" data-style="">기본</button></div>' +
      '<div class="idp-panel-title" style="margin-top:14px">THEME</div>' +
      '<div class="idp-row idp-scope"><button type="button" data-scope="all">모든 위젯</button><button type="button" data-scope="one">이 위젯만</button></div>' +
      '<div class="idp-note idp-scope-note"></div><div class="idp-note idp-sync-note"></div><div class="idp-swatches">';
    Object.keys(THEMES).forEach(function (name) {
      html += '<button type="button" data-theme="' + name + '" title="' + name + '" aria-label="' + name + '" style="background:linear-gradient(135deg,' +
        THEMES[name].soft + ' 50%,' + THEMES[name].deep + ' 50%)"></button>';
    });
    html += '</div><label class="idp-row">나만의 색 <input type="color" data-k="soft"></label>' +
      '<div class="idp-row"><button type="button" data-mode="light">라이트</button><button type="button" data-mode="dark">다크</button></div>' +
      '<div class="idp-row"><button type="button" data-border="card">카드</button><button type="button" data-border="line">윗선</button><button type="button" data-border="none">없음</button></div>' +
      '<label class="idp-row">둥글기 <input type="range" min="0" max="32" step="2" data-k="radius"></label>' +
      '<div class="idp-row"><button type="button" data-reset>기본값</button><button type="button" data-close>닫기</button></div>' +
      '<div class="idp-note idp-tail">이 기기의 모든 ID Archive 위젯에 적용돼요</div>';
    panel.innerHTML = html;
    function save(patch) {
      var cur = saved() || {};
      Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
      try { localStorage.setItem(STORE, JSON.stringify(cur)); } catch (e) { /* storage blocked: apply for this view only */ }
      var p = new URLSearchParams(q.toString());
      Object.keys(cur).forEach(function (k) { if (cur[k] === '') p.delete(k); else p.set(k, cur[k]); });
      applyTheme(layered(p));
    }
    function markScope() {
      Array.prototype.forEach.call(panel.querySelectorAll('[data-scope]'), function (b) { b.className = b.dataset.scope === scope ? 'on' : ''; });
      var own = layers().widgets[WKEY], note = panel.querySelector('.idp-scope-note');
      var followed = own && own.inherit;
      if (followed) own = null;
      // 노션이 링크에 적어 둔 위젯별 색(Theme Studio 에서 정한 것) — 이 기기에서 「따르기」를 누르지 않았으면 그것이 이 위젯의 색
      var linkOwn = SYNCED && !followed && q.get('wt') ? (q.get('ws') ? '#' + q.get('ws').toUpperCase() : q.get('wt').toUpperCase()) : '';
      if (SYNCED) panel.querySelector('[data-scope="all"]').hidden = true;   // 노션과 연결된 플래너의 전체 색은 Theme Studio 에서
      note.innerHTML = '';
      note.appendChild(document.createTextNode(scope === 'all' ? '고른 색이 이 기기의 모든 위젯에 적용돼요'
        : own ? '이 위젯만 ' + (own.theme ? own.theme.toUpperCase() : own.custom.soft.toUpperCase()) + ' · '
        : linkOwn ? '이 위젯만 ' + linkOwn + ' · '
        : SYNCED ? '이 위젯은 페이지 · 전체 테마를 따라요. 색을 누르면 이 위젯만 바뀌어요'
        : '이 위젯만 다른 색으로 — 지금은 전체 테마를 따라요'));
      if (scope === 'one' && (own || linkOwn)) {
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-inherit', ''); b.className = 'idp-link-btn'; b.textContent = SYNCED ? '페이지 · 전체 테마 따르기' : '전체 테마 따르기';
        note.appendChild(b);
      }
    }
    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (t.dataset.scope) { scope = t.dataset.scope; markScope(); }
      else if (t.hasAttribute('data-inherit')) { setWidget(null); markScope(); }
      else if (t.dataset.theme && scope === 'one') { setWidget({ theme: t.dataset.theme }); markScope(); }
      else if (t.hasAttribute('data-style')) { save({ style: t.dataset.style }); markStyle(panel); }
      else if (t.dataset.theme) save({ theme: t.dataset.theme, soft: '', deep: '' });
      else if (t.dataset.mode) save({ mode: t.dataset.mode });
      else if (t.dataset.border) save({ border: t.dataset.border, frame: '' });
      else if (t.hasAttribute('data-reset')) { try { localStorage.removeItem(STORE); } catch (err) {} applyTheme(effective()); }
      else if (t.hasAttribute('data-close')) panel.hidden = true;
    });
    panel.querySelector('[data-k="soft"]').addEventListener('input', function (e) {
      var v = e.target.value.slice(1);
      if (scope === 'one') { setWidget({ custom: { soft: '#' + v, deep: '#' + v } }); markScope(); }
      else save({ soft: v, deep: v });
    });
    var range = panel.querySelector('[data-k="radius"]');
    range.value = s.radius || D.radius;
    range.addEventListener('input', function (e) { save({ radius: e.target.value }); });
    markStyle(panel); markScope();
    btn.addEventListener('click', function () { panel.hidden = !panel.hidden; });
    document.body.appendChild(btn); document.body.appendChild(panel);
    panelEl = panel;
    if (optDefs.length) renderOptions();
    renderShare();
  }

  // "이 내용을 다른 기기에서도" — one button, an honest sentence, and the link itself in a box the
  // reader can copy by hand when the clipboard is blocked inside the Notion frame.
  function renderShare() {
    var w = Object.keys(SHARE)[0];
    if (!panelEl || !w || panelEl.querySelector('.idp-share')) return;
    var box = document.createElement('div');
    box.className = 'idp-share';
    box.innerHTML = '<div class="idp-panel-title" style="margin-top:14px">다른 기기에서도</div>' +
      '<div class="idp-note idp-warn">공유 링크에는 지금 적은 내용이 그대로 들어갑니다. 공개된 곳에는 올리지 마세요.</div>' +
      '<div class="idp-row"><button type="button" data-bake>지금 내용을 링크에 담기</button></div>' +
      '<textarea class="idp-link" readonly hidden rows="2"></textarea>' +
      '<div class="idp-note" data-share-note>노트북 · 태블릿 · 휴대폰에서 같은 내용을 보려면, 만들어진 주소를 노션 블록의 링크로 바꿔 주세요.</div>';
    var ta = box.querySelector('.idp-link');
    box.querySelector('[data-bake]').addEventListener('click', function () {
      var made = shareLink(w), note = box.querySelector('[data-share-note]');
      if (made.over) {
        ta.hidden = true;
        note.textContent = '적은 내용이 링크에 담기에는 많아요(약 ' + Math.round(made.over / 1000) +
          ',000자 · 한도 ' + (LIMIT / 1000) + ',000자). 이 위젯의 기록은 이 기기에 그대로 있습니다. ' +
          '다른 기기에서는 ⚙ 로 새로 시작하거나, 이 위젯을 여러 개로 나눠 쓰세요.';
        return;
      }
      ta.hidden = false; ta.value = made.url; ta.focus(); ta.select();
      var tail = made.note ? ' ' + made.note + '.' : '';
      function manual() { note.textContent = '위 주소를 직접 복사해서, 노션에서 이 블록의 링크를 바꿔 주세요.' + tail; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(made.url).then(function () {
          note.textContent = '주소를 복사했어요. 노션에서 이 블록의 링크를 바꾸면 모든 기기에서 같은 내용이 보입니다.' + tail;
        }, manual);
      } else manual();
    });
    panelEl.insertBefore(box, panelEl.querySelector('.idp-tail'));
  }

  function markStyle(panel) {
    var now = root.dataset.style || '';
    Array.prototype.forEach.call(panel.querySelectorAll('[data-style]'), function (b) {
      b.className = b.getAttribute('data-style') === now ? 'on' : '';
    });
  }
  // ---- A list setting (playlist items, links …) edited one card per item ----------------------
  // Stored exactly like the old one-line field — items joined by ",", fields by "|" — so every link
  // already pasted into a Notion block keeps working. Typing "," or "|" inside a name is swapped for its
  // full-width twin, and inside an address for its %-code, so it can never split an item.
  function listParse(v, n) {
    return String(v || '').split(',').map(function (p) { var f = p.split('|'); while (f.length < n) f.push(''); return f.slice(0, n).map(function (x) { return x.trim(); }); })
      .filter(function (f) { return f.some(Boolean); });
  }
  function listJoin(rows, fields) {
    return rows.map(function (r) {
      return fields.map(function (fd, i) {
        var s = String(r[i] || '').trim();
        return fd.url ? s.replace(/,/g, '%2C').replace(/\|/g, '%7C') : s.replace(/,/g, '，').replace(/\|/g, '｜');
      }).join('|').replace(/\|+$/, '');
    }).filter(Boolean).join(',');
  }
  // A photo picked on this device is shrunk and kept in this browser only ("local:<id>"); a web address
  // travels with the link. IDP.photo() turns either into something an <img> can show.
  var PHOTO = 'idarchive.photo.';
  function photo(v) {
    v = String(v || '');
    if (v.indexOf('local:') === 0) { try { return localStorage.getItem(PHOTO + v.slice(6)) || ''; } catch (e) { return ''; } }
    return /^https:\/\//.test(v) || /^assets\/mp3\/[a-z0-9-]+\.jpg$/.test(v) ? v : '';   // 웹 사진 주소 · 위젯에 들어 있는 견본 그림
  }
  function pickPhoto(done) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var img = new Image(), url = URL.createObjectURL(f);
      img.onload = function () {
        var side = 480, s = Math.min(1, side / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        try { localStorage.setItem(PHOTO + id, c.toDataURL('image/jpeg', 0.82)); done('local:' + id); }
        catch (e) { alert('사진을 저장할 공간이 부족해요. 다른 사진을 지우거나 사진 주소를 넣어 주세요.'); }
      };
      img.src = url;
    };
    inp.click();
  }
  function listEditor(d, value) {
    var fields = d.fields, max = d.max || 12, rows = listParse(value, fields.length);
    var wrap = document.createElement('div'); wrap.className = 'idp-list';
    wrap.innerHTML = '<div class="idp-list-head">' + d.label + '</div>';
    var holder = document.createElement('div'); wrap.appendChild(holder);
    var add = document.createElement('button'); add.type = 'button'; add.className = 'idp-list-add'; add.textContent = '+ 하나 더';
    wrap.appendChild(add);
    if (d.note) { var nt = document.createElement('div'); nt.className = 'idp-note'; nt.textContent = d.note; wrap.appendChild(nt); }
    function commit() { optSave(optWidget, d.k, listJoin(rows, fields)); if (optHandler) optHandler(); }
    function draw() {
      holder.innerHTML = '';
      if (!rows.length) rows.push(fields.map(function () { return ''; }));
      rows.forEach(function (r, ri) {
        var card = document.createElement('div'); card.className = 'idp-list-item';
        var top = document.createElement('div'); top.className = 'idp-list-top';
        // (2026-10-03) 한 칸짜리(프로필 사진처럼 max 1)는 번호 · 순서 단추 없이 「지우기」만
        top.innerHTML = max > 1 ? '<span>' + String(ri + 1).padStart(2, '0') + '</span>' : '<span></span>';
        if (max > 1) [['↑', -1], ['↓', 1]].forEach(function (mv) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = mv[0]; b.setAttribute('aria-label', mv[1] < 0 ? '위로' : '아래로');
          b.disabled = ri + mv[1] < 0 || ri + mv[1] >= rows.length;
          b.onclick = function () { var t = rows[ri]; rows[ri] = rows[ri + mv[1]]; rows[ri + mv[1]] = t; draw(); commit(); };
          top.appendChild(b);
        });
        var del = document.createElement('button'); del.type = 'button'; del.textContent = '지우기';
        del.onclick = function () { rows.splice(ri, 1); draw(); commit(); };
        top.appendChild(del); card.appendChild(top);
        fields.forEach(function (fd, fi) {
          if (fd.photo) { card.appendChild(photoField(fd, r, fi)); return; }
          var lab = document.createElement('label'); lab.className = 'idp-list-field';
          lab.innerHTML = '<span>' + fd.label + '</span>';
          var inp = document.createElement('input'); inp.type = 'text'; inp.value = /^local:/.test(r[fi]) ? '' : (r[fi] || '');
          if (/^local:/.test(r[fi])) inp.placeholder = '이 기기에서 고른 사진'; else if (fd.ph) inp.placeholder = fd.ph;
          if (fd.url) { inp.inputMode = 'url'; inp.autocapitalize = 'off'; inp.spellcheck = false; }
          inp.addEventListener('input', function (e) { e.stopPropagation(); r[fi] = inp.value; commit(); });
          lab.appendChild(inp);
          card.appendChild(lab);
        });
        holder.appendChild(card);
      });
      add.disabled = rows.length >= max;
      if (max === 1) add.style.display = 'none';   // 한 칸짜리는 「하나 더」 없음
    }
    add.onclick = function () { rows.push(fields.map(function () { return ''; })); draw(); var ins = holder.querySelectorAll('.idp-list-item:last-child input'); if (ins[0]) ins[0].focus(); };
    // (2026-10-03 오너: 「왜 다른 기기에서 사진이 없어졌지?」를 없애기) 사진 칸 = 「사진 고르기」 하나가 기본,
    // 어디에 저장되는지 한 줄로 말하고, 모든 기기에서 같은 사진(사진 주소)은 접힌 「고급」 안에
    function photoField(fd, r, fi) {
      var box = document.createElement('div'); box.className = 'idp-list-field idp-photo';
      if (!(max === 1 && fields.length === 1)) { var head = document.createElement('span'); head.textContent = String(fd.label || '사진').split(' — ')[0]; box.appendChild(head); }
      var pb = document.createElement('button'); pb.type = 'button'; pb.className = 'idp-photo-pick';
      pb.textContent = r[fi] ? '다른 사진 고르기' : '사진 고르기';
      pb.onclick = function () { pickPhoto(function (v) { r[fi] = v; draw(); commit(); }); };
      box.appendChild(pb);
      var st = document.createElement('div'); st.className = 'idp-note';
      st.textContent = /^local:/.test(r[fi]) ? '이 기기에서 고른 사진이에요 — 다른 기기(폰 · 노트북)에서는 그 기기에서 한 번 더 골라 주세요.'
        : (r[fi] ? '사진 주소 — 모든 기기에서 같은 사진이 보여요.' : '고른 사진은 이 기기에 저장돼요.');
      box.appendChild(st);
      var adv = document.createElement('details'); adv.className = 'idp-photo-adv';
      adv.innerHTML = '<summary>사진 주소로 넣기 · 모든 기기에서 같은 사진</summary>';
      var inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'url'; inp.autocapitalize = 'off'; inp.spellcheck = false;
      inp.value = /^local:/.test(r[fi]) ? '' : (r[fi] || ''); inp.placeholder = fd.ph || 'https://…jpg';
      inp.addEventListener('input', function (e) { e.stopPropagation(); r[fi] = inp.value; commit(); });
      if (r[fi] && !/^local:/.test(r[fi])) adv.open = true;
      adv.appendChild(inp); box.appendChild(adv);
      return box;
    }
    draw();
    return wrap;
  }

  function renderOptions() {
    if (!panelEl || !optDefs.length || panelEl.querySelector('.idp-opts')) return;
    var box = document.createElement('div');
    box.className = 'idp-opts';
    box.innerHTML = '<div class="idp-panel-title" style="margin-top:14px">이 위젯</div>';
    var cur = optsFor(optWidget);
    optDefs.forEach(function (d) {
      if (d.t === 'list') { box.appendChild(listEditor(d, cur[d.k] != null ? cur[d.k] : (q.get(d.k) || ''))); panelEl.classList.add('wide'); return; }
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
    // 목록을 적는 위젯은 내용이 먼저 — 색 · 모양 설정은 그 아래
    if (panelEl.classList.contains('wide')) { box.firstChild.style.marginTop = '0'; panelEl.insertBefore(box, panelEl.firstChild); }
    else panelEl.insertBefore(box, panelEl.querySelector('.idp-tail'));
  }
  if (document.body) settingsPanel(); else document.addEventListener('DOMContentLoaded', settingsPanel);


  // ---- Sound, banner, and a best-effort browser notification ---------------------------------
  // What a widget in a Notion embed may actually do is narrow, and pretending otherwise would put
  // a promise in the product we cannot keep (docs/CLOCK_AND_ALERTS.md):
  //   · a tone plays only after the reader has clicked something inside this widget — autoplay policy
  //   · a desktop notification needs a permission this iframe may not be allowed to ask for
  //   · nothing at all runs once the page is closed
  // So every alert falls back to a banner drawn inside the card, which always works.
  var AC = null, soundReady = false;
  function unlock() {
    if (soundReady) return;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      AC = AC || new Ctor();
      if (AC.state === 'suspended') AC.resume();
      soundReady = true;
    } catch (e) { /* no audio here */ }
  }
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);

  // two soft tones, a fifth apart — a chime, not an alarm clock
  function chime(times) {
    if (!soundReady || !AC) return false;
    var n = Math.max(1, Math.min(3, times || 2));
    for (var i = 0; i < n; i++) {
      [0, 0.18].forEach(function (off, k) {
        var t = AC.currentTime + i * 0.75 + off;
        var o = AC.createOscillator(), g = AC.createGain();
        o.type = 'sine';
        o.frequency.value = k ? 784 : 523.25;     // C5 → G5
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.14, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        o.connect(g); g.connect(AC.destination);
        o.start(t); o.stop(t + 0.6);
      });
    }
    return true;
  }

  function banner(text, sub) {
    var card = document.querySelector('.card');
    if (!card) return;
    var old = card.querySelector('.idp-banner');
    if (old) old.remove();
    var b = document.createElement('div');
    b.className = 'idp-banner';
    b.innerHTML = '<span class="t"></span>' + (sub ? '<span class="s"></span>' : '') +
                  '<button type="button" aria-label="닫기">×</button>';
    b.querySelector('.t').textContent = text;
    if (sub) b.querySelector('.s').textContent = sub;
    b.querySelector('button').onclick = function () { b.remove(); };
    card.appendChild(b);
    return b;
  }

  var notifyAsked = false;
  function canNotify() {
    try { return typeof Notification !== 'undefined' && Notification.permission === 'granted'; }
    catch (e) { return false; }
  }
  // only ever called from a click, because that is the only place the request may be allowed
  function askNotify(then) {
    try {
      if (typeof Notification === 'undefined') { then && then(false); return; }
      if (Notification.permission === 'granted') { then && then(true); return; }
      if (Notification.permission === 'denied' || notifyAsked) { then && then(false); return; }
      notifyAsked = true;
      var r = Notification.requestPermission(function (p) { then && then(p === 'granted'); });
      if (r && r.then) r.then(function (p) { then && then(p === 'granted'); }, function () { then && then(false); });
    } catch (e) { then && then(false); }
  }
  function notify(title, body) {
    var shown = false;
    try { if (canNotify()) { new Notification(title, { body: body || '', silent: true }); shown = true; } }
    catch (e) { /* blocked in this frame */ }
    return shown;
  }
  // one call for "tell the reader now": tone + banner + a desktop notification when we are allowed one
  function alertNow(title, body, opts) {
    var o = opts || {};
    var played = o.sound === false ? false : chime(o.times);
    var sent = notify(title, body);
    var el = banner(title, body);
    if (el && !played && o.sound !== false) {
      var s = document.createElement('span');
      s.className = 'q';
      s.textContent = '소리는 위젯을 한 번 누른 뒤부터 납니다';
      el.insertBefore(s, el.querySelector('button'));
    }
    return { sound: played, notification: sent };
  }

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
    share(widget);
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


  // "Now" for every widget that shows today. A `now` parameter freezes it, which is what the
  // shop photos need — a 2027 planner should not be advertised with today's date on it.
  // Without the parameter this is just the live clock, so nothing changes for a reader.
  function now() {
    var v = q.get('now');
    if (v) { var d = new Date(String(v).replace(' ', 'T')); if (!isNaN(d.getTime())) return d; }
    return new Date();
  }

  // 캐릭터 아키(REQ-045 · widgets/_character.html 의 ARCHIE) — 빈 칸 · 다 끝낸 순간에만 작게. kind: 'empty' | 'done'
  function archie(kind, cls) {
    var face = kind === 'done'
      ? '<path d="M45 76 q5 -7 10 0 M65 76 q5 -7 10 0 M52 85 q8 8 16 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'
      : '<path d="M46 74 h8 M66 74 h8" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="86" r="3" fill="none" stroke="currentColor" stroke-width="4"/>';
    return '<svg class="' + (cls || 'archie') + '" viewBox="0 0 120 120" aria-hidden="true"><path d="M28 46 h64 v46 a10 10 0 0 1 -10 10 h-44 a10 10 0 0 1 -10 -10 z" style="fill:var(--tint)" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M22 36 h76 a4 4 0 0 1 4 4 v6 h-84 v-6 a4 4 0 0 1 4 -4 z" style="fill:var(--paper)" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>' + face + '</svg>';
  }

  window.IDP = { archie: archie, layers: { get: layers, set: setLayers, setWidget: setWidget, key: WKEY }, q: q, CFG: CFG, THEMES: THEMES, applyTheme: applyTheme, savedTheme: saved, saveTheme: saveTheme, weekStart: weekStart === 'sun' ? 'sun' : 'mon',
    DOW: DOW, MONTHS: MONTHS, pad: pad, iso: iso, plannerDate: plannerDate, parseDate: parseDate,
    options: options, opt: opt, photo: photo, listParse: listParse, seed: seed, seedDone: seedDone, now: now,
    STYLES: STYLES, share: share, shareLink: shareLink,
    chime: chime, banner: banner, notify: notify, askNotify: askNotify, canNotify: canNotify, alert: alertNow };
})();
