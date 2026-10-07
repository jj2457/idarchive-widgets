// R6.2 WIDGET SELECTION (오너 2026-10-08) — 후보마다 고정 번호(HOME-H01 …) · 실제 위젯 미리보기 · KEEP / REMOVE / MOVE.
// 고른 것은 이 브라우저에만 저장(localStorage)되고, 아래 「내 선택」 글을 복사해 노션 인박스에 붙여 넣는다.
(function () {
  const BASE = 'https://jj2457.github.io/idarchive-widgets/';
  const KEY = 'idp_widget_select_r62b';
  const root = document.getElementById('ws-root');
  if (!root) return;
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} render(); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  fetch('widgets-r62b.json?v=1').then(r => r.json()).then(data => {
    const groups = {};
    data.items.forEach(it => { (groups[it.page] = groups[it.page] || []).push(it); });
    const nav = Object.keys(groups).map(p => `<a href="#ws-${p}">${esc(groups[p][0].pageName)} <small>${groups[p].length}</small></a>`).join('');
    let html = `<nav class="ws-nav">${nav}</nav>`;
    for (const [p, items] of Object.entries(groups)) {
      html += `<h3 class="ws-page" id="ws-${p}">${esc(items[0].pageName)} <small>후보 ${items.length}</small></h3><div class="ws-grid">`;
      for (const it of items) {
        const sid = it.page + '-' + it.id;
        html += `<article class="ws-card" data-id="${it.id}">
          <header><b>${esc(sid)}</b><span>${esc(it.name)}</span></header>
          <p>${esc(it.desc)}</p>
          <div class="ws-prev"><iframe loading="lazy" src="${esc(BASE + it.url)}" style="height:${it.h}px" title="${esc(it.name)}"></iframe></div>
          <div class="ws-btns" role="group" aria-label="${esc(sid)} 선택">
            <button type="button" data-v="KEEP">KEEP</button><button type="button" data-v="REMOVE">REMOVE</button><button type="button" data-v="MOVE">MOVE</button>
          </div>
          <input class="ws-move" type="text" placeholder="어디로? 예: RIGHT · TOP · GOALS" hidden>
        </article>`;
      }
      html += '</div>';
    }
    root.innerHTML = html;
    root.addEventListener('click', e => {
      const b = e.target.closest('.ws-btns button'); if (!b) return;
      const id = b.closest('.ws-card').dataset.id; const v = b.dataset.v;
      if (state[id] && state[id].v === v) delete state[id]; else state[id] = { v, to: (state[id] && state[id].to) || '' };
      save();
    });
    root.addEventListener('input', e => {
      if (!e.target.classList.contains('ws-move')) return;
      const id = e.target.closest('.ws-card').dataset.id; if (state[id]) { state[id].to = e.target.value; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (er) {} out(); }
    });
    render();
  }).catch(() => { root.textContent = '후보 목록을 불러오지 못했어요 — 새로 고침해 주세요.'; });

  function out() {
    const ta = document.getElementById('ws-out'); if (!ta) return;
    const lines = Object.keys(state).sort().map(id => id + ' ' + state[id].v + (state[id].v === 'MOVE' && state[id].to ? ' ' + state[id].to.toUpperCase() : ''));
    ta.value = lines.length ? '[위젯 선택 R6.2]\n' + lines.join('\n') : '';
    const c = document.getElementById('ws-count'); if (c) c.textContent = lines.length + '개 고름';
  }
  function render() {
    document.querySelectorAll('.ws-card').forEach(card => {
      const s = state[card.dataset.id];
      card.dataset.v = s ? s.v : '';
      card.querySelectorAll('.ws-btns button').forEach(b => b.setAttribute('aria-pressed', String(!!s && s.v === b.dataset.v)));
      const mv = card.querySelector('.ws-move'); mv.hidden = !(s && s.v === 'MOVE'); if (s && mv.value !== s.to) mv.value = s.to || '';
    });
    out();
  }
  const copy = document.getElementById('ws-copy');
  if (copy) copy.onclick = () => { const ta = document.getElementById('ws-out'); ta.select(); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => { copy.textContent = '복사했어요'; }, () => { copy.textContent = '위 글을 직접 복사해 주세요'; }); };
  const clear = document.getElementById('ws-clear');
  if (clear) clear.onclick = () => { if (confirm('고른 것을 모두 지울까요?')) { state = {}; save(); } };
})();
