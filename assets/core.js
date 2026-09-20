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
    return { t: Date.now(), o: optsFor(w), k: keys };
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
    var html = '<div class="idp-panel-title">STYLE</div><div class="idp-styles">';
    STYLES.forEach(function (st) {
      html += '<button type="button" data-style="' + st[0] + '">' + st[1] + '</button>';
    });
    html += '<button type="button" data-style="">기본</button></div>' +
      '<div class="idp-panel-title" style="margin-top:14px">THEME</div><div class="idp-swatches">';
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
      applyTheme(p);
    }
    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-style')) { save({ style: t.dataset.style }); markStyle(panel); }
      else if (t.dataset.theme) save({ theme: t.dataset.theme, soft: '', deep: '' });
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
    markStyle(panel);
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
    panelEl.insertBefore(box, panelEl.querySelector('.idp-tail'));
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

  window.IDP = { q: q, CFG: CFG, THEMES: THEMES, applyTheme: applyTheme, weekStart: weekStart === 'sun' ? 'sun' : 'mon',
    DOW: DOW, MONTHS: MONTHS, pad: pad, iso: iso, plannerDate: plannerDate, parseDate: parseDate,
    options: options, opt: opt, seed: seed, seedDone: seedDone, now: now,
    STYLES: STYLES, share: share, shareLink: shareLink,
    chime: chime, banner: banner, notify: notify, askNotify: askNotify, canNotify: canNotify, alert: alertNow };
})();
