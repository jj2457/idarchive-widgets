/* ID PLANNER widgets — 노션 연결 층(브라우저 쪽). sync/worker.mjs 와 짝.
   위젯 번호(wid) 하나로 모든 연결 기능(할 일 · 테마 …)을 쓴다. 토큰은 서버에만 있고 이 브라우저에는 번호만 남는다.
   IDP_CONFIG.syncBase 가 비어 있으면 아무것도 하지 않는다(서버 없는 연결 약속 금지). localhost 에서만 ?sync= 시험 서버. */
(function () {
  var IDP = window.IDP;
  var BASE = (location.hostname === 'localhost' && IDP.q.get('sync')) || (window.IDP_CONFIG && IDP_CONFIG.syncBase) || '';
  var KEY = 'idarchive.sync.wid';

  // 연결 창(팝업): 노션에서 돌아오면 위젯 번호를 연 창에게 건네고 닫힌다. 팝업이면 true(위젯 화면은 그리지 않는다)
  // back: 같은 탭에서 연결했으면 원래 화면으로 돌아간다(Theme Studio 처럼 따로 여는 페이지)
  function popup(opts) {
    var m = /#sync=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return false;
    var v = m[1];
    var msg = { cancelled: '연결을 취소했어요.', failed: '연결하지 못했어요. 잠시 뒤 다시 눌러 주세요.', 'no-planner': '플래너 페이지를 찾지 못했어요. 노션 연결 화면에서 「ID ARCHIVE PLANNER」 페이지를 골라 주세요.' }[v];
    // 같은 탭에서 돌아온 경우(back): 안내는 원래 화면에서 보여 주도록 넘기고 돌아간다
    if (opts && opts.back && !window.opener) {
      if (msg) { try { sessionStorage.setItem('idarchive.sync.notice', msg); } catch (e) {} }
      else { try { localStorage.setItem(KEY, v); sessionStorage.setItem('idarchive.sync.notice', '노션과 연결됐어요.'); } catch (e) {} }
      location.replace(location.pathname + location.search);
      return true;
    }
    document.body.innerHTML = '<div class="popup" id="idp-pp"></div>';
    var pp = document.getElementById('idp-pp');
    if (msg) pp.textContent = msg;
    else if (window.opener) {
      try { window.opener.postMessage({ idpSync: v }, location.origin); } catch (e) {}
      pp.textContent = '노션과 연결됐어요. 이 창은 닫아도 돼요.';
      setTimeout(function () { window.close(); }, 1500);
    } else {
      // 같은 브라우저 저장소면 바로 쓰이고, 노션 휴대폰 앱처럼 저장소가 다르면 번호를 붙여 넣는다
      try { localStorage.setItem(KEY, v); } catch (e) {}
      pp.innerHTML = '노션과 연결됐어요.<br>위젯에 내용이 보이지 않으면 위젯의 ⚙ → 「연결 번호」에 아래 번호를 붙여 넣어 주세요.<code></code><a href="' + location.pathname + location.search + '">위젯으로 돌아가기</a>';
      pp.querySelector('code').textContent = v;
    }
    return true;
  }

  // 같은 탭 연결에서 넘겨받은 안내(한 번만)
  function notice() { try { var m = sessionStorage.getItem('idarchive.sync.notice'); sessionStorage.removeItem('idarchive.sync.notice'); return m || ''; } catch (e) { return ''; } }

  function wid(override) { if (override) return override; try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function forget() { try { localStorage.removeItem(KEY); } catch (e) {} }

  // 연결되면 cb() — 다른 창 · 같은 기기 다른 위젯에서 연결해도 알 수 있게 storage 도 듣는다
  function onConnect(cb) {
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || !e.data.idpSync) return;
      try { localStorage.setItem(KEY, e.data.idpSync); } catch (err) {}
      cb();
    });
    window.addEventListener('storage', function (e) { if (e.key === KEY) cb(); });
  }
  function connect(ret) {
    ret = ret || location.origin + location.pathname + '?theme=' + encodeURIComponent(IDP.q.get('theme') || '');
    window.open(BASE + (/localhost/.test(BASE) ? '/dev-connect' : '/connect') + '?return=' + encodeURIComponent(ret), 'idp-sync', 'width=520,height=720');
  }
  // 서버 오류는 e.code(not_connected · notion_revoked · not_shared · no_planner …)로 — 끊긴 연결이면 번호를 잊는다
  function api(method, path, body, code) {
    return fetch(BASE + path, { method: method, headers: { Authorization: 'Widget ' + wid(code), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) {
            var e = new Error(d.message || '오류'); e.code = d.error || 'http_' + r.status;
            if (e.code === 'not_connected' || e.code === 'notion_revoked') forget();
            throw e;
          }
          return d;
        });
      }, function () { var e = new Error('인터넷 연결을 확인해 주세요'); e.code = 'offline'; throw e; });
  }
  function disconnect() { var p = api('POST', '/disconnect').catch(function () {}); forget(); return p; }

  // 다른 기기에서 노션에 적용한 테마를 따른다 — 서버 테마가 「바뀌었을 때만」(이 기기에서 ⚙ 로 고른 색은 다음 적용 전까지 존중), 10분에 한 번
  function follow() {
    if (!BASE || !wid() || IDP.q.get('lock') === '1') return;
    var at = 0; try { at = +localStorage.getItem('idarchive.sync.themeAt') || 0; } catch (e) {}
    if (Date.now() - at < 10 * 60 * 1000) return;
    try { localStorage.setItem('idarchive.sync.themeAt', String(Date.now())); } catch (e) {}
    api('GET', '/v1/theme').then(function (d) {
      var seen = ''; try { seen = localStorage.getItem('idarchive.sync.themeSeen') || ''; } catch (e) {}
      if (!d.theme || !IDP.THEMES[d.theme]) return;
      // 나만의 색이면 「custom:#색」 으로 기억한다 — 다른 기기에서 같은 색을 다시 고르지 않아도 위젯이 따른다
      var c = d.custom && /^#[0-9a-f]{6}$/i.test(d.custom.soft || '') ? d.custom : null;
      var key = c ? 'custom:' + c.soft : d.theme;
      if (key === seen) return;
      try { localStorage.setItem('idarchive.sync.themeSeen', key); } catch (e) {}
      IDP.saveTheme({ theme: d.theme, soft: c ? c.soft.slice(1) : '', deep: c && /^#[0-9a-f]{6}$/i.test(c.deep || '') ? c.deep.slice(1) : '' });
    }, function () {});
  }
  function seen(theme) { try { localStorage.setItem('idarchive.sync.themeSeen', theme); } catch (e) {} }

  IDP.sync = { base: BASE, on: !!BASE, popup: popup, wid: wid, forget: forget, onConnect: onConnect, connect: connect, api: api, disconnect: disconnect, follow: follow, seen: seen, notice: notice };
})();
