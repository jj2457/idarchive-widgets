// scripts/build-month-art.mjs 가 sync/month-art.mjs 에서 만든다 — 손으로 고치지 않는다
(function () {
// 달 그림(REQ-118) — 「이달의 계절 배너」 위젯과 서버(나만의 색 달 커버)가 같이 쓰는 SVG 한 장.
// 오너 2026-10-02: 웹 위젯 · SVG · 만든 그림은 구매자 HEX 를 그대로(가까운 기본색으로 바꾸지 않음). 달 색은 그 위의 별도 층.
//   테마 층 = 바탕 왼쪽(soft) · 선(deep 을 먹으로 당긴 색) · 큰 그림(deep 옅게)
//   달 층   = 바탕 오른쪽(달 파스텔) · 그림 안쪽 면(달 파스텔 — 글리프에 이미 박혀 있음)
// 그림 원본: scripts/build-seasonal-months.py GLYPHS → scripts/export-icon-glyphs.py → icon-glyphs.mjs(month-01 … · monthColors)
// widgets/assets/month-art.js 는 scripts/build-month-art.mjs 가 이 파일에서 만든다(손으로 고치지 않음).
var G = {"glyphs":{"month-01":"<path d=\"M32 15 V49 M17.3 23.5 L46.7 40.5 M17.3 40.5 L46.7 23.5\"/> <path d=\"M27.5 18.5 L32 22.5 L36.5 18.5 M27.5 45.5 L32 41.5 L36.5 45.5\"/> <path d=\"M18.6 29.4 L24.3 29 L22 23.6 M45.4 34.6 L39.7 35 L42 40.4 M18.6 34.6 L24.3 35 L22 40.4 M45.4 29.4 L39.7 29 L42 23.6\"/> <circle cx=\"32\" cy=\"32\" r=\"3.2\" fill=\"#d4e3f2\"/>","month-02":"<path d=\"M16.5 47.5 C24 41 31 33.5 46.5 17.5\"/> <path d=\"M30.5 35 C28 31.5 27.5 27.5 29 24.5\"/> <circle cx=\"29\" cy=\"21.5\" r=\"4.4\" fill=\"#ddd9ef\"/> <circle cx=\"41\" cy=\"24.5\" r=\"4.4\" fill=\"#ddd9ef\"/> <circle cx=\"22.5\" cy=\"41\" r=\"2.6\" fill=\"#ddd9ef\"/>","month-03":"<path d=\"M18 47 H46\"/> <path d=\"M32 47 V30\"/> <path d=\"M32 33 C24 33 19.5 27.5 19.5 20.5 C27 20.5 32 25 32 33 Z\" fill=\"#d6ecca\"/> <path d=\"M32 29 C32 22 36.5 16.5 44.5 16.5 C44.5 24 39.5 29 32 29 Z\" fill=\"#d6ecca\"/>","month-04":"<circle cx=\"32\" cy=\"21\" r=\"6.6\" fill=\"#f6d6e1\"/> <circle cx=\"42.5\" cy=\"28.6\" r=\"6.6\" fill=\"#f6d6e1\"/> <circle cx=\"38.5\" cy=\"41\" r=\"6.6\" fill=\"#f6d6e1\"/> <circle cx=\"25.5\" cy=\"41\" r=\"6.6\" fill=\"#f6d6e1\"/> <circle cx=\"21.5\" cy=\"28.6\" r=\"6.6\" fill=\"#f6d6e1\"/> <circle cx=\"32\" cy=\"31.6\" r=\"4.2\" fill=\"#f6d6e1\"/>","month-05":"<path d=\"M32 49 V35 M32 40 L26.5 35.5 M32 38 L37 34\"/> <path d=\"M32 15.5 C40 15.5 45.5 21 45.5 27.5 C45.5 33.5 40.5 36.5 35.5 36 C34.5 37.5 29.5 37.5 28.5 36 C23.5 36.5 18.5 33.5 18.5 27.5 C18.5 21 24 15.5 32 15.5 Z\" fill=\"#cbe7c3\"/> <path d=\"M25 49 H39\"/>","month-06":"<path d=\"M20.5 34 C17.5 34 15.5 31.5 15.5 29 C15.5 26 18 23.5 21 23.5 C22 19 26 16 30.5 16 C35.5 16 39.5 19.5 40 24 C44 24 47.5 26.5 47.5 30 C47.5 32.5 45.5 34 43 34 Z\" fill=\"#cfe0ea\"/> <path d=\"M23 40 L21 46 M32 40 L30 46 M41 40 L39 46\"/>","month-07":"<path d=\"M23 31.5 C23 26.5 27 22.5 32 22.5 C37 22.5 41 26.5 41 31.5\" fill=\"{WHITE}\"/> <path d=\"M15.5 34.5 C19 31.5 22.5 31.5 26 34.5 C29.5 37.5 33 37.5 36.5 34.5 C40 31.5 43.5 31.5 48.5 34.5\"/> <path d=\"M15.5 41.5 C19 38.5 22.5 38.5 26 41.5 C29.5 44.5 33 44.5 36.5 41.5 C40 38.5 43.5 38.5 48.5 41.5\"/> <path d=\"M19 48 H45\" />","month-08":"<circle cx=\"32\" cy=\"32\" r=\"8.5\" fill=\"#f7e5b5\"/> <path d=\"M32 14.5 V18.5 M32 45.5 V49.5 M14.5 32 H18.5 M45.5 32 H49.5 M19.6 19.6 L22.5 22.5 M41.5 41.5 L44.4 44.4 M19.6 44.4 L22.5 41.5 M41.5 22.5 L44.4 19.6\"/>","month-09":"<circle cx=\"32\" cy=\"30\" r=\"13.5\" fill=\"#efdfbf\"/> <path d=\"M17 41.5 H33.5 C36 41.5 36 38 33.5 38 H31.5 M27 46.5 H47 C49.5 46.5 49.5 43 47 43 H44.5\" fill=\"{WHITE}\"/>","month-10":"<path d=\"M32 14.5 L35.6 23 L42.5 19.8 L40.6 27.4 L48 28.6 L42.6 34 L45.5 39.5 L37.4 38.8 L34.5 45 L32 40.2 L29.5 45 L26.6 38.8 L18.5 39.5 L21.4 34 L16 28.6 L23.4 27.4 L21.5 19.8 L28.4 23 Z\" fill=\"#f4cdbc\"/> <path d=\"M32 31 V50\"/>","month-11":"<path d=\"M32 36.5 C24 36.5 17.5 30.5 16.5 20.5 C22 17.5 27.5 18 32 22.5 C36.5 18 42 17.5 47.5 20.5 C46.5 30.5 40 36.5 32 36.5 Z\" fill=\"#ead7b9\"/> <path d=\"M32 22.5 V28.5 M32 36.5 V47.5\"/>","month-12":"<path d=\"M32 15 L42 29 H37.5 L45 40 H19 L26.5 29 H22 Z\" fill=\"#d8e2ee\"/> <path d=\"M32 40 V48 M27 48 H37\"/>"},"monthColors":{"10":"#f4cdbc","11":"#ead7b9","12":"#d8e2ee","01":"#d4e3f2","02":"#ddd9ef","03":"#d6ecca","04":"#f6d6e1","05":"#cbe7c3","06":"#cfe0ea","07":"#c6e5ee","08":"#f7e5b5","09":"#efdfbf"}};

const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const HEX = /^#?[0-9a-f]{6}$/i;
const norm = h => '#' + String(h).replace('#', '').toLowerCase();
const rgb = h => [1, 3, 5].map(i => parseInt(norm(h).slice(i, i + 2), 16));
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };   // t = b 쪽 비율

function monthColor(m) { return G.monthColors[String(m).padStart(2, '0')]; }

// 그 달 글리프 — 선 · 면 색만 바꾼다(달 색은 글리프에 고정)
function glyph(m, ink, soft) {
  const g = G.glyphs['month-' + String(m).padStart(2, '0')];
  if (!g) return '';
  return g.replace(/\{INK\}/g, ink).replace(/\{SOFT\}/g, soft).replace(/\{TINT\}/g, mix(soft, '#ffffff', 0.35)).replace(/\{WHITE\}/g, '#ffffff');
}

const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif", SANS = "'Segoe UI', 'Noto Sans KR', sans-serif";
// 1500 × 600 판(노션 커버 비율) — 가운데 띠 안에 그림 · 이름 · 캡션(데스크톱 · 폰 모두 보이는 자리). 달 커버 · 모듈 커버가 같은 틀
function frame({ soft, deep, far, art, ghost, word, caption, font = SERIF, sans = SANS }) {
  const ink = mix(deep, '#2a2a2a', 0.5), title = mix(deep, '#3a3a3a', 0.45), cap = mix(title, '#ffffff', 0.35);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 600" preserveAspectRatio="xMidYMid slice">'
    + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0.35">'
    + `<stop offset="0" stop-color="${soft}"/><stop offset="0.3" stop-color="${mix(soft, '#fcfcfd', 0.55)}"/><stop offset="0.58" stop-color="#fcfcfd"/>`
    + `<stop offset="0.82" stop-color="${mix('#fcfcfd', far, 0.55)}"/><stop offset="1" stop-color="${far}"/></linearGradient></defs>`
    + '<rect width="1500" height="600" fill="url(#g)"/>'
    + (ghost ? `<g transform="translate(1130 150) scale(4.6875)" opacity="0.2" fill="none" stroke="${deep}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${ghost}</g>` : '')
    + `<g transform="translate(704 186) scale(1.4375)" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${art}</g>`
    + `<text x="750" y="342" text-anchor="middle" font-family="${font}" font-size="56" letter-spacing="9" fill="${title}">${word}</text>`
    + `<line x1="726" y1="366" x2="774" y2="366" stroke="${mix(deep, '#ffffff', 0.25)}" stroke-width="1"/>`
    + `<text x="750" y="394" text-anchor="middle" font-family="${sans}" font-size="13" letter-spacing="6.5" fill="${cap}">${caption}</text>`
    + '</svg>';
}
const solid = (g, deep) => g.replace(/fill="#[0-9a-f]{6}"/gi, `fill="${deep}"`);   // 오른쪽 큰 그림 = 진한 색 한 덩어리(옅게)

function monthSvg({ soft, deep, month, year = 2027, faint = true, font, sans }) {
  if (!HEX.test(soft || '') || !HEX.test(deep || '')) return null;
  const m = Math.max(1, Math.min(12, month | 0));
  soft = norm(soft); deep = norm(deep);
  const far = mix(mix(monthColor(m), mix(deep, '#ffffff', 0.3), 0.18), '#ffffff', 0.3);   // 커버 그림과 같은 세기(오른쪽 끝 30% 밝게)
  return frame({ soft, deep, far, font, sans, art: glyph(m, mix(deep, '#2a2a2a', 0.5), soft), ghost: faint && solid(glyph(m, deep, deep), deep),
    word: MONTH_NAMES[m - 1], caption: `${String(m).padStart(2, '0')}  ·  ${year}` });
}

// 모듈 커버(WORK · CAREER · … · PLACE LIST) — scripts/build-module-covers.py 와 같은 판. 나만의 색이면 서버가 이것으로 HEX 그대로
function moduleSvg({ soft, deep, name, year = 2027, font, sans }) {
  if (!HEX.test(soft || '') || !HEX.test(deep || '')) return null;
  const word = (G.modules || {})[name], g = G.glyphs['module-' + name] || G.glyphs[name];
  if (!word || !g) return null;
  soft = norm(soft); deep = norm(deep);
  const paint = (ink, s) => g.replace(/\{INK\}/g, ink).replace(/\{SOFT\}/g, s).replace(/\{TINT\}/g, mix(s, '#ffffff', 0.35)).replace(/\{WHITE\}/g, '#ffffff');
  return frame({ soft, deep, far: mix(mix(deep, '#ffffff', 0.3), '#ffffff', 0.3), font, sans, art: paint(mix(deep, '#2a2a2a', 0.5), soft),
    ghost: solid(paint(deep, deep), deep), word, caption: 'ID ARCHIVE PLANNER ' + year });
}

window.IDP_MONTH_ART = { MONTH_NAMES: MONTH_NAMES, monthColor: monthColor, glyph: glyph, monthSvg: monthSvg, mix: mix };
})();
