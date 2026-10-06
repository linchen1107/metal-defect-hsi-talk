/* Extra topics for talk.html, drawn from the paper cluster (papers/*.md):
 *   C5  two kinds of reflection (Shafer 1985)          B5  polarization separates them (Nayar et al. 1997)
 *   P1  the traditional pipeline on real photos (Neogi et al. 2014; ref. [1] Zhang et al. 2011)
 *   D9  SAM vs. ordinary distance (Kruse et al. 1993)   D10 dot product and cosine (geometry of Eq. 4)
 *   E4  score direction: normalize, then flip (Section IV, appendix U3)
 * Each demo: one row of controls, one picture, one result line. P1 and E4 use the paper's real photos.
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) k === 'text' ? (e.textContent = v) : e.setAttribute(k, v); kids.forEach(k => e.append(k)); return e; };
  const S = (tag, attrs = {}, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; };
  const f = (v, d = 1) => Number(v).toFixed(d);
  const C = { ink: '#f1e8dc', mute: '#bba98f', grid: '#4a3d33', blue: '#60a5fa', gold: '#fbbf24', pink: '#fb7185', cyan: '#67e8f9', green: '#86efac', violet: '#c4b5fd' };

  function slider(label, min, max, step, value, fmt = v => v) {
    const input = $('input', { type: 'range', min, max, step, value, 'aria-label': label });
    const out = $('output', { text: fmt(value) });
    const w = $('label', { class: 'live-ctl' }, $('span', { text: label }), input, out);
    input.addEventListener('input', () => { out.textContent = fmt(+input.value); });
    w.get = () => +input.value;
    return w;
  }
  function seg(options, value) {
    const w = $('div', { class: 'live-seg' }); let cur = value;
    options.forEach(([v, label]) => {
      const b = $('button', { type: 'button', text: label, 'aria-pressed': String(v === cur) });
      b.addEventListener('click', () => { cur = v; w.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); w.dispatchEvent(new Event('input', { bubbles: true })); });
      w.append(b);
    });
    w.get = () => cur;
    return w;
  }
  function shell(root, controls, w = 620, h = 260) {
    const svg = S('svg', { viewBox: `0 0 ${w} ${h}`, class: 'nx-svg', role: 'img' });
    const res = $('p', { class: 'nx-result', 'aria-live': 'polite' });
    root.append($('div', { class: 'live-row nx-ctl' }, ...controls), svg, res);
    return { svg, res, clear: () => { while (svg.firstChild) svg.firstChild.remove(); } };
  }
  const arrow = (svg, x0, y0, x1, y1, col, w = 3) => {
    const a = Math.atan2(y1 - y0, x1 - x0), L = 10;
    svg.append(S('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: col, 'stroke-width': w }));
    svg.append(S('path', { d: `M${x1},${y1} L${x1 - L * Math.cos(a - .4)},${y1 - L * Math.sin(a - .4)} L${x1 - L * Math.cos(a + .4)},${y1 - L * Math.sin(a + .4)} Z`, fill: col }));
  };
  const text = (svg, x, y, s, col = C.mute, size = 13, anchor = 'start') => svg.append(S('text', { x, y, fill: col, 'font-size': size, 'text-anchor': anchor }, s));

  const LIVE = {};

  // ---------- C5: specular + diffuse (Shafer 1985), illustrative numbers ----------
  LIVE.C5 = root => {
    const lam = seg([[470, '470 nm'], [505, '505 nm'], [590, '590 nm'], [630, '630 nm'], [850, '850 nm']], 470);
    const ui = shell(root, [$('span', { class: 'live-note', text: 'LED' }), lam], 620, 300);
    // smooth surface: strong mirror-like part, flat material reflectance; defect: rougher (less mirror), reflectance rises with wavelength
    const r = { surf: () => 0.25, dent: l => 0.1 + 0.55 * (l - 470) / 380 };
    const parts = l => ({ surf: [55, 160 * r.surf(l)], dent: [18, 160 * r.dent(l)] });
    function draw() {
      ui.clear(); const l = lam.get(), p = parts(l), base = 270, k = 1.4;
      [['Normal surface', p.surf, 150], ['Defect area', p.dent, 380]].forEach(([name, [spec, diff], x]) => {
        const hd = diff * k, hs = spec * k;
        ui.svg.append(S('rect', { x, y: base - hd, width: 90, height: hd, fill: C.violet }));
        ui.svg.append(S('rect', { x, y: base - hd - hs, width: 90, height: hs, fill: '#f8fafc' }));
        text(ui.svg, x + 45, base + 20, name, C.ink, 14, 'middle');
        text(ui.svg, x + 45, base - hd - hs - 8, f(spec + diff, 0), C.gold, 15, 'middle');
      });
      text(ui.svg, 20, 30, '■ mirror-like (interface) reflection: color of the lamp', '#f8fafc');
      text(ui.svg, 20, 50, '■ body (diffuse) reflection: depends on the material and the wavelength', C.violet);
      const d = (p.dent[0] + p.dent[1]) - (p.surf[0] + p.surf[1]);
      ui.res.textContent = `At ${l} nm the defect is ${Math.abs(d) < 6 ? 'almost as bright as the surface, so it nearly disappears' : d < 0 ? 'darker than the surface by ' + f(-d, 0) : 'brighter than the surface by ' + f(d, 0)}. The same defect changes contrast with the wavelength.`;
    }
    root.addEventListener('input', draw); draw();
  };

  // ---------- B5: analyzer angle separates the two (Nayar et al. 1997) ----------
  LIVE.B5 = root => {
    const ang = slider('analyzer vs. lamp polarizer', 0, 180, 1, 0, v => v + '°');
    const ui = shell(root, [ang]);
    const SPEC = 80, DIFF = 40;
    function draw() {
      ui.clear(); const a = ang.get(), sp = SPEC * Math.cos(a * Math.PI / 180) ** 2, di = DIFF / 2;
      const X = t => 60 + t / 180 * 330, Y = v => 220 - v * 1.7;
      ui.svg.append(S('line', { x1: 60, y1: 220, x2: 390, y2: 220, stroke: C.grid })); ui.svg.append(S('line', { x1: 60, y1: 40, x2: 60, y2: 220, stroke: C.grid }));
      let dS = '', dT = '';
      for (let t = 0; t <= 180; t += 2) { const s = SPEC * Math.cos(t * Math.PI / 180) ** 2; dS += (t ? 'L' : 'M') + X(t) + ',' + Y(s + di); dT += (t ? 'L' : 'M') + X(t) + ',' + Y(di); }
      ui.svg.append(S('path', { d: dS, fill: 'none', stroke: '#f8fafc', 'stroke-width': 2 }));
      ui.svg.append(S('path', { d: dT, fill: 'none', stroke: C.violet, 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
      ui.svg.append(S('circle', { cx: X(a), cy: Y(sp + di), r: 6, fill: C.gold }));
      [0, 90, 180].forEach(t => text(ui.svg, X(t), 238, t + '°', C.mute, 12, 'middle'));
      text(ui.svg, 60, 30, 'camera brightness', C.mute, 12);
      // stacked bar
      const bx = 470, base = 220;
      ui.svg.append(S('rect', { x: bx, y: base - di * 1.7, width: 70, height: di * 1.7, fill: C.violet }));
      ui.svg.append(S('rect', { x: bx, y: base - (di + sp) * 1.7, width: 70, height: sp * 1.7, fill: '#f8fafc' }));
      text(ui.svg, bx + 35, base + 18, 'now', C.ink, 13, 'middle');
      text(ui.svg, bx + 35, base - (di + sp) * 1.7 - 8, f(di + sp, 0), C.gold, 15, 'middle');
      ui.res.textContent = `Mirror-like reflection keeps the lamp's polarization, so it follows cos² and is ${f(100 * sp / SPEC, 0)}% through; the diffuse part is depolarized and stays at ${di}. At 90° the glare is gone and only the diffuse part is left.`;
    }
    root.addEventListener('input', draw); draw();
  };

  // ---------- P1: traditional pipeline on real photos: one light + one gray threshold ----------
  LIVE.P1 = root => {
    const A = PR.algorithmData, D = A.defect(3);
    const band = { 'WL-G': 1, '505-G': 5, '470-B': 4, '850-R': 12 };
    const lightSeg = seg(Object.keys(band).map(k => [k, k.replace('WL', 'White light')]), 'WL-G');
    const thr = slider('gray threshold (mark darker pixels)', 0, 255, 1, 90);
    const canvas = $('canvas', { width: D.W, height: D.H, class: 'nx-img' });
    const res = $('p', { class: 'nx-result', 'aria-live': 'polite' });
    const table = $('p', { class: 'nx-note' });
    root.append($('div', { class: 'live-row nx-ctl' }, lightSeg, thr), canvas, res, table);
    const P = D.gt.reduce((a, b) => a + b, 0), N = D.N - P;
    const best = k => { // lowest false alarm among thresholds that find at least 90% of the scratch
      const v = D.raw.subarray(band[k] * D.N, (band[k] + 1) * D.N);
      for (let t = 0; t < 255; t++) { let tp = 0, fp = 0; for (let i = 0; i < D.N; i++) if (v[i] <= t) D.gt[i] ? tp++ : fp++; if (tp >= 0.9 * P) return 100 * fp / N; }
      return null;
    };
    table.textContent = 'Lowest false alarm a single gray threshold gets while finding 90% of the scratch: ' +
      Object.keys(band).map(k => { const b = best(k); return `${k.replace('WL', 'white')} ${b == null ? 'cannot reach 90%' : f(b, 1) + '%'}`; }).join(' · ') +
      '. In the 470-B, 505-G and 850-R photos the background is overexposed (pure white, 255) and much of the scratch is white too, so no threshold separates them.';
    function draw() {
      const k = lightSeg.get(), t = thr.get(), off = band[k] * D.N, ctx = canvas.getContext('2d'), img = ctx.createImageData(D.W, D.H);
      let tp = 0, fp = 0;
      for (let i = 0; i < D.N; i++) {
        const g = D.raw[off + i], hit = g <= t; let c = [g, g, g];
        if (hit) { D.gt[i] ? (tp++, c = [251, 191, 36]) : (fp++, c = [103, 232, 249]); }
        img.data.set([...c, 255], i * 4);
      }
      ctx.putImageData(img, 0, 0);
      res.textContent = `Marked as defect: ${f(100 * tp / P, 1)}% of the scratch (gold) and ${f(100 * fp / N, 2)}% of the background (cyan).` + (k === 'WL-G' ? '' : ' This photo is overexposed: the background is pure white.');
    }
    root.addEventListener('input', draw); draw();
  };

  // ---------- D9: SAM vs. ordinary (Euclidean) distance ----------
  LIVE.D9 = root => {
    const k = slider('normal spot, lamp farther away: brightness ×', 0.3, 0.9, 0.05, 0.5, v => f(v, 2));
    const ui = shell(root, [k], 620, 280);
    const A = [100, 50], Cdent = [60, 90], R = 25, MAXDEG = 10;
    const ang = v => Math.acos((A[0] * v[0] + A[1] * v[1]) / (Math.hypot(...A) * Math.hypot(...v))) * 180 / Math.PI;
    function draw() {
      ui.clear(); const B = [A[0] * k.get(), A[1] * k.get()];
      const X = v => 50 + v * 2.6, Y = v => 250 - v * 2.0;
      ui.svg.append(S('line', { x1: 50, y1: 250, x2: 380, y2: 250, stroke: C.grid })); ui.svg.append(S('line', { x1: 50, y1: 250, x2: 50, y2: 30, stroke: C.grid }));
      text(ui.svg, 380, 268, 'white-light brightness →', C.mute, 12, 'end'); text(ui.svg, 56, 26, 'monochromatic brightness', C.mute, 12);
      // SAM cone around the background direction, distance circle around the background point
      const a0 = Math.atan2(A[1], A[0]), r = 150;
      [a0 - MAXDEG * Math.PI / 180, a0 + MAXDEG * Math.PI / 180].forEach(a => ui.svg.append(S('line', { x1: X(0), y1: Y(0), x2: X(r * Math.cos(a)), y2: Y(r * Math.sin(a)), stroke: C.cyan, 'stroke-dasharray': '4 4' })));
      ui.svg.append(S('ellipse', { cx: X(A[0]), cy: Y(A[1]), rx: R * 2.6, ry: R * 2.0, fill: 'none', stroke: C.gold, 'stroke-dasharray': '4 4' }));
      [[A, 'background', C.blue, -6], [B, 'B normal, darker', C.green, 20], [Cdent, 'C dent', C.pink, -6]].forEach(([v, name, col, dy]) => {
        arrow(ui.svg, X(0), Y(0), X(v[0]), Y(v[1]), col, 2.5); text(ui.svg, X(v[0]) + 8, Y(v[1]) + dy, name, col, 13);
      });
      const dB = Math.hypot(B[0] - A[0], B[1] - A[1]), dC = Math.hypot(Cdent[0] - A[0], Cdent[1] - A[1]);
      const rows = [['B normal', dB, ang(B), C.green], ['C dent', dC, ang(Cdent), C.pink]];
      text(ui.svg, 410, 60, 'distance', C.gold, 13); text(ui.svg, 500, 60, 'SAM angle', C.cyan, 13);
      rows.forEach(([n, d, g, col], i) => {
        const y = 95 + i * 50; text(ui.svg, 400, y - 18, n, col, 13);
        text(ui.svg, 410, y, `${f(d, 0)} ${d > R ? '→ defect' : '→ normal'}`, d > R ? C.pink : C.ink, 13);
        text(ui.svg, 500, y, `${f(g, 1)}° ${g > MAXDEG ? '→ defect' : '→ normal'}`, g > MAXDEG ? C.pink : C.ink, 13);
      });
      text(ui.svg, 400, 210, `gold circle: distance limit ${R}`, C.gold, 12); text(ui.svg, 400, 228, `cyan cone: angle limit ${MAXDEG}°`, C.cyan, 12);
      ui.res.textContent = dB > R
        ? `Distance calls the darker normal spot B a defect (${f(dB, 0)} > ${R}). SAM does not: B points the same way as the background (0°). Both catch the dent C.`
        : `B is still close to the background, so both measures call it normal. Move the slider left to make B darker.`;
    }
    root.addEventListener('input', draw); draw();
  };

  // ---------- D10: what the SAM formula computes: dot product and projection ----------
  LIVE.D10 = root => {
    const a = slider('pixel direction', 0, 90, 1, 60, v => v + '°'), len = slider('pixel length', 40, 140, 1, 110);
    const ui = shell(root, [a, len], 620, 260);
    const s = [100, 50], sl = Math.hypot(...s), su = [s[0] / sl, s[1] / sl];
    function draw() {
      ui.clear(); const t = a.get() * Math.PI / 180, x = [len.get() * Math.cos(t), len.get() * Math.sin(t)];
      const X = v => 60 + v * 2.2, Y = v => 230 - v * 1.6;
      const dot = s[0] * x[0] + s[1] * x[1], cos = dot / (sl * len.get()), pr = dot / sl, p = [su[0] * pr, su[1] * pr];
      ui.svg.append(S('line', { x1: X(x[0]), y1: Y(x[1]), x2: X(p[0]), y2: Y(p[1]), stroke: C.mute, 'stroke-dasharray': '4 4' }));
      arrow(ui.svg, X(0), Y(0), X(s[0] * 1.2), Y(s[1] * 1.2), C.blue); text(ui.svg, X(s[0] * 1.2) - 10, Y(s[1] * 1.2) + 24, 's background', C.blue);
      arrow(ui.svg, X(0), Y(0), X(x[0]), Y(x[1]), C.gold); text(ui.svg, X(x[0]) + 6, Math.max(16, Y(x[1]) - 4), 'x pixel', C.gold);
      ui.svg.append(S('line', { x1: X(0), y1: Y(0), x2: X(p[0]), y2: Y(p[1]), stroke: C.green, 'stroke-width': 5, 'stroke-opacity': .7 }));
      text(ui.svg, 400, 40, 'green = shadow of x on s', C.green, 13);
      text(ui.svg, 400, 68, `shadow = |x| cosθ = ${f(pr, 1)}`, C.ink, 13);
      text(ui.svg, 400, 92, `|x| = ${f(len.get(), 1)}`, C.ink, 13);
      text(ui.svg, 400, 118, `cosθ = shadow / |x| = ${f(cos, 3)}`, C.cyan, 14);
      ui.res.textContent = `sᵀx = |s|·|x|·cosθ, so dividing by both lengths leaves only cosθ. Change the length: cosθ stays ${f(cos, 3)}. Change the direction: it moves.`;
    }
    root.addEventListener('input', draw); draw();
  };

  // ---------- E4: score direction: raw cosine -> normalize -> flip (real data, Defect I) ----------
  LIVE.E4 = root => {
    const A = PR.algorithmData, D = A.defect(1), idx = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const mean = idx.map(b => { let s = 0; for (let i = 0; i < D.N; i++) s += D.raw[b * D.N + i]; return s / D.N; });
    const cosAt = i => { let d = 0, a = 0, b = 0; idx.forEach((band, j) => { const v = D.raw[band * D.N + i]; d += v * mean[j]; a += v * v; b += mean[j] * mean[j]; }); return d / Math.sqrt(a * b); };
    let mn = 1, mx = -1; for (let i = 0; i < D.N; i++) { const c = cosAt(i); if (c < mn) mn = c; if (c > mx) mx = c; }
    const pts = [['background (200, 140)', 140 * D.W + 200, C.blue], ['dent edge (88, 60)', 60 * D.W + 88, C.green], ['dent center (88, 82)', 82 * D.W + 88, C.pink]];
    const step = seg([[1, '1 raw cosine'], [2, '2 scale to 0–1'], [3, '3 flip: 1 − y']], 1);
    const ui = shell(root, [step], 620, 200);
    function draw() {
      ui.clear(); const st = step.get();
      const val = c => st === 1 ? c : st === 2 ? (c - mn) / (mx - mn) : 1 - (c - mn) / (mx - mn);
      text(ui.svg, 20, 30, st === 1 ? 'cosθ to the image mean: close to 1 = like the background' : st === 2 ? 'y′ = (y − min) / (max − min): still high = like the background' : 'y″ = 1 − y′: now high = unlike the background = suspected defect', C.ink, 14);
      pts.forEach(([name, i, col], j) => {
        const v = val(cosAt(i)), y = 70 + j * 40;
        text(ui.svg, 20, y + 14, name, col, 13);
        ui.svg.append(S('rect', { x: 210, y, width: 300, height: 18, fill: C.grid }));
        ui.svg.append(S('rect', { x: 210, y, width: Math.max(1, 300 * Math.max(0, Math.min(1, v))), height: 18, fill: col }));
        text(ui.svg, 520, y + 14, f(v, 4), C.ink, 13);
      });
      ui.res.textContent = st === 1 ? 'Raw cosines are all close to 1, so the bars look almost the same, and the highest one is the background: the opposite of what we want to mark.'
        : st === 2 ? `Scaling with the image minimum (${f(mn, 3)}) and maximum (${f(mx, 3)}) spreads the scores over 0–1, but high still means like the background.`
        : 'After the flip, a threshold works the same way for every method: mark the pixels whose score is at or above η.';
    }
    root.addEventListener('input', draw); draw();
  };

  document.querySelectorAll('.nx[data-nx]').forEach(root => {
    try { LIVE[root.dataset.nx](root); } catch (e) { (PR.errors || []).push('extra topic ' + root.dataset.nx + ': ' + e.message); console.error(e); }
  });
})();
