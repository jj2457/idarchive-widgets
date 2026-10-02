/* 나만의 색 → 노션 기본 색 중 가장 가까운 테마. 서버(sync/custom.mjs nearestTheme · customOf)와 똑같은 계산이어야 한다 —
   Theme Studio 미리보기에 「Notion Native: 주황」이라고 보여 준 색이 실제 적용 색과 다르면 안 된다(tests/theme-preview.test.js 가 맞춰 본다). */
(function (g) {
  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function hex(v) { var m = /^#?([0-9a-f]{6})$/i.exec(String(v || '').trim()); return m ? '#' + m[1].toLowerCase() : null; }
  function even(v) { var f = Math.floor(v), d = v - f; return d > 0.5 + 1e-9 ? f + 1 : d < 0.5 - 1e-9 ? f : (f % 2 === 0 ? f : f + 1); }
  function mix(a, b, t) { var pa = rgb(a), pb = rgb(b); return '#' + pa.map(function (x, i) { return ('0' + even(x * t + pb[i] * (1 - t)).toString(16)).slice(-2); }).join(''); }
  // 색상(hue) 먼저 — sync/custom.mjs lch · nearestTheme 와 같은 식(2026-10-01, 연분홍이 주황 · 연회색이 하늘로 가던 것 고침)
  function lch(h) {
    var lin = function (c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    var v = rgb(h).map(lin), r = v[0], g = v[1], b = v[2];
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return { L: L, C: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
  }
  // 진한 색을 비워 두면 서버처럼 포인트 색을 어둡게 만든다
  function customOf(soft, deep) { soft = hex(soft); if (!soft) return null; return { soft: soft, deep: hex(deep) || mix(soft, '#5a5a5a', 0.62) }; }
  function nearest(themes, soft, deep) {
    var c = customOf(soft, deep); if (!c) return null;
    var k = lch(c.soft);
    if (k.C < 0.012) return 'grey';
    // 채도 낮은 따뜻한 색 — 아이보리(크림)와 베이지(라떼) 중 가까운 쪽(sync/custom.mjs warmPick 과 같다)
    if (k.C < 0.022 && k.h >= 20 && k.h <= 110) {
      if (!themes.ivory) return 'beige';
      var wd = function (n) { var t = lch(hex(themes[n].soft)); return Math.abs(k.h - t.h) + 100 * Math.abs(k.L - t.L); };
      return wd('ivory') < wd('beige') ? 'ivory' : 'beige';
    }
    var best = null, bd = Infinity;
    Object.keys(themes).forEach(function (name) {
      if (name === 'grey') return;
      var t = lch(hex(themes[name].soft)), dh = Math.abs(k.h - t.h) % 360;
      var d = Math.min(dh, 360 - dh) + 600 * Math.abs(k.C - t.C) + 100 * Math.abs(k.L - t.L);
      if (d < bd) { bd = d; best = name; }
    });
    return best;
  }
  // 노션 글자 · 바탕색 이름(sync/theme.mjs NOTION_COLOR 와 같은 짝)
  var NATIVE = { ivory: ['갈색', 'Brown'], green: ['초록', 'Green'], blue: ['파랑', 'Blue'], sky: ['파랑', 'Blue'], lavender: ['보라', 'Purple'], pink: ['분홍', 'Pink'],
    beige: ['갈색', 'Brown'], grey: ['회색', 'Gray'], peach: ['주황', 'Orange'], yellow: ['노랑', 'Yellow'] };
  g.IDP_NEAREST = { nearest: nearest, customOf: customOf, native: NATIVE };
})(typeof window !== 'undefined' ? window : globalThis);
