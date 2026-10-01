/* 나만의 색 → 노션 기본 색 중 가장 가까운 테마. 서버(sync/custom.mjs nearestTheme · customOf)와 똑같은 계산이어야 한다 —
   Theme Studio 미리보기에 「Notion Native: 주황」이라고 보여 준 색이 실제 적용 색과 다르면 안 된다(tests/theme-preview.test.js 가 맞춰 본다). */
(function (g) {
  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function hex(v) { var m = /^#?([0-9a-f]{6})$/i.exec(String(v || '').trim()); return m ? '#' + m[1].toLowerCase() : null; }
  function even(v) { var f = Math.floor(v), d = v - f; return d > 0.5 + 1e-9 ? f + 1 : d < 0.5 - 1e-9 ? f : (f % 2 === 0 ? f : f + 1); }
  function mix(a, b, t) { var pa = rgb(a), pb = rgb(b); return '#' + pa.map(function (x, i) { return ('0' + even(x * t + pb[i] * (1 - t)).toString(16)).slice(-2); }).join(''); }
  function dist(a, b) {
    var p = rgb(a), q = rgb(b), rm = (p[0] + q[0]) / 2;
    return Math.sqrt((2 + rm / 256) * Math.pow(p[0] - q[0], 2) + 4 * Math.pow(p[1] - q[1], 2) + (2 + (255 - rm) / 256) * Math.pow(p[2] - q[2], 2));
  }
  // 진한 색을 비워 두면 서버처럼 포인트 색을 어둡게 만든다
  function customOf(soft, deep) { soft = hex(soft); if (!soft) return null; return { soft: soft, deep: hex(deep) || mix(soft, '#5a5a5a', 0.62) }; }
  function nearest(themes, soft, deep) {
    var c = customOf(soft, deep); if (!c) return null;
    var best = null, bd = Infinity;
    Object.keys(themes).forEach(function (name) {
      var d = dist(c.soft, hex(themes[name].soft)) + 0.6 * dist(c.deep, hex(themes[name].deep));
      if (d < bd) { bd = d; best = name; }
    });
    return best;
  }
  // 노션 글자 · 바탕색 이름(sync/theme.mjs NOTION_COLOR 와 같은 짝)
  var NATIVE = { green: ['초록', 'Green'], blue: ['파랑', 'Blue'], sky: ['파랑', 'Blue'], lavender: ['보라', 'Purple'], pink: ['분홍', 'Pink'],
    beige: ['갈색', 'Brown'], grey: ['회색', 'Gray'], peach: ['주황', 'Orange'], yellow: ['노랑', 'Yellow'] };
  g.IDP_NEAREST = { nearest: nearest, customOf: customOf, native: NATIVE };
})(typeof window !== 'undefined' ? window : globalThis);
