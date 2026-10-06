/* Animated knowledge points for Benmoussat, Spinnler, Guillaume 2012.
 * Each lesson draws into <div class="demo lesson" id="demo-XX">. Animations run only while visible.
 * Real data: the 15 unpolarized Table II images (figs/*.png and data.js). Everything else is a simplified model. */
(function () {
  'use strict';

  // ---------------- small helpers ----------------
  const $ = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    }
    kids.forEach(c => c != null && e.append(c));
    return e;
  };
  const REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rad = d => (d * Math.PI) / 180;
  const LEDS = [470, 505, 590, 630, 780, 810, 850, 880, 940];          // Section IV
  const NIRC = [148, 163, 184];                                          // colour used to draw invisible light

  // wavelength (nm) -> [r,g,b] 0..255 for visible light, null outside 380–750
  function wlRGB(l) {
    if (l < 380 || l > 750) return null;
    let r = 0, g = 0, b = 0;
    if (l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; }
    else if (l < 510) { g = 1; b = -(l - 510) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; }
    else if (l < 645) { r = 1; g = -(l - 645) / 65; } else r = 1;
    const f = l < 420 ? 0.3 + (0.7 * (l - 380)) / 40 : l > 700 ? 0.3 + (0.7 * (750 - l)) / 50 : 1;
    return [r, g, b].map(v => Math.round(255 * Math.pow(v * f, 0.8)));
  }
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const lightRGB = l => wlRGB(l) || NIRC;
  const lightName = l => (l === 'WL' ? 'white light' : l < 450 ? 'violet-blue light' : l < 495 ? 'blue light' : l < 570 ? 'green light' : l < 590 ? 'yellow light' : l < 750 ? 'red light' : 'near-infrared light');

  const LESSON_HINTS = {"demo-A1": "First pick 300, 470 and 850 nm and compare the wave spacing with the range the human eye can see; Play only moves the wave forward.", "demo-A2": "Switch between multispectral and hyperspectral to see how the same curve is split into a few wide bands or many narrow ones.", "demo-A3": "Pick White light first, then 470 nm, and compare whether the spectrum covers a wide range or is concentrated near one wavelength.", "demo-A4": "Keep the same defect and switch between White light and 505 nm to see how the brightness difference between the dent and the background changes.", "demo-B1": "First compare the scattered short lines before the polarizer with the uniform direction after it, then rotate the analyzer to see how the camera brightness changes.", "demo-B2": "Pick 30°, 60° and 90° and match the white component, the brightness square and the position on the curve; then try the automatic rotation.", "demo-B4": "First switch between White light and monochromatic light, then add the polarizer; compare how the images are grouped and how many components each pixel has.", "demo-C1": "Click the automatic orbit or drag the lamp azimuth and watch how the bright area moves near the yellow-circled dent; then compare with and without polarization.", "demo-C2": "First pick 470 nm and look at the blue cells and the response of the B curve; then change the wavelength and compare which channel is more sensitive.", "demo-D1": "First press play and follow the current image and the marker on the curve; then click the image on the right and compare the brightness at the same position across the 15 images.", "demo-D2": "First click 'Just 2x brighter' to see the brightness values double while the score stays the same; then click 'Brightness ratio changed' to see why it differs from the normal background."};

  // canvas that keeps its CSS width, redraws on resize and on every control change, and animates while
  // on screen and playing. Lessons start paused so readers can inspect the initial state.
  function stage(root, height, draw) {
    const cv = $('canvas', { class: 'lz-cv' });
    const play = $('button', { type: 'button', class: 'lz-play' });
    const restart = $('button', { type: 'button', class: 'lz-tog', text: 'Replay' });
    if (LESSON_HINTS[root.id] && root.id !== 'demo-D2') root.append($('p', { class: 'lz-observe', text: 'What to look for: ' + LESSON_HINTS[root.id] }));
    root.append($('div', { class: 'lz-wrap' }, cv), $('div', { class: 'lz-playbar' }, play, restart));
    const ctx = cv.getContext('2d');
    const S = { W: 0, H: 0, t: 0, vis: false, raf: 0, last: 0, playing: false };
    const label = () => { play.textContent = S.playing ? '⏸ Pause' : '▶ Play animation'; play.setAttribute('aria-pressed', String(S.playing)); };
    play.addEventListener('click', ev => { ev.stopPropagation(); S.playing = !S.playing; label(); S.redraw(); });
    label();
    S.syncLabel = label;
    restart.addEventListener('click', () => { S.t = 0; S.last = 0; S.playing = true; label(); S.redraw(); });
    const host = root.closest('.lesson') || root; (host._stages = host._stages || []).push(S);
    function size() {
      const w = cv.clientWidth || 640, d = window.devicePixelRatio || 1;
      const h = typeof height === 'function' ? height(w) : height;
      if (w === S.W && h === S.H) return;
      S.W = w; S.H = h; cv.style.height = h + 'px';
      cv.width = Math.round(w * d); cv.height = Math.round(h * d); ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    function frame(now) {
      S.raf = 0;
      const dt = S.playing && S.last ? Math.min(0.05, (now - S.last) / 1000) : 0; S.last = now; S.t += dt;
      ctx.clearRect(0, 0, S.W, S.H);
      draw(ctx, S.W, S.H, S.t, dt, !S.playing);
      if (S.vis && S.playing) S.raf = requestAnimationFrame(frame); else S.last = 0;
    }
    S.redraw = () => { if (!S.raf) S.raf = requestAnimationFrame(frame); };
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { S.vis = es[0].isIntersecting; if (S.vis) S.redraw(); }).observe(cv);
    else S.vis = true;
    if ('ResizeObserver' in window) new ResizeObserver(() => { size(); S.redraw(); }).observe(cv);
    size(); S.redraw();
    S.cv = cv;
    return S;
  }

  // button group; returns {el, set}
  function seg(label, options, value, on) {
    const box = $('div', { class: 'lz-seg', role: 'group', 'aria-label': label });
    if (label) box.append($('span', { class: 'lz-lab', text: label }));
    const btns = options.map(o => {
      const [v, t] = Array.isArray(o) ? o : [o, String(o)];
      const b = $('button', { type: 'button', text: t, 'aria-pressed': String(v === value) });
      b.addEventListener('click', () => { set(v); on(v); });
      b._v = v; box.append(b); return b;
    });
    function set(v) { btns.forEach(b => b.setAttribute('aria-pressed', String(b._v === v))); }
    return { el: box, set };
  }
  function slider(label, min, max, step, value, on, fmt = v => v) {
    const val = $('span', { class: 'val', text: fmt(value) });
    const inp = $('input', { type: 'range', min, max, step, value, 'aria-label': label });
    inp.addEventListener('input', () => { val.textContent = fmt(+inp.value); on(+inp.value); });
    const lab = $('label', {}, label + ' ', inp, val);
    lab.set = v => { inp.value = v; val.textContent = fmt(v); };
    return lab;
  }
  function toggle(label, value, on) {
    const b = $('button', { type: 'button', class: 'lz-tog', text: label, 'aria-pressed': String(value) });
    b.addEventListener('click', () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); on(v); });
    b.set = v => b.setAttribute('aria-pressed', String(v));
    return b;
  }
  const row = (...k) => $('div', { class: 'controls' }, ...k);
  function text(ctx, s, x, y, o = {}) {
    ctx.font = `${o.bold ? 600 : 400} ${o.size || 13}px "Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif`;
    ctx.fillStyle = o.color || '#cbd5e1'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(s, x, y);
  }
  function arrow(ctx, x0, y0, x1, y1, color, w = 2, head = 8) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4));
    ctx.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
  }
  // a fence of parallel slits centred at (x,y); angle 0 = slits vertical
  function fence(ctx, x, y, r, angDeg, color, squash = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(squash, 1);
    ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.rotate(rad(angDeg)); ctx.strokeStyle = color; ctx.lineWidth = 2;
    for (let k = -3; k <= 3; k++) {
      const dx = (k * r) / 4, h = Math.sqrt(Math.max(0, r * r - dx * dx));
      ctx.beginPath(); ctx.moveTo(dx, -h); ctx.lineTo(dx, h); ctx.stroke();
    }
    ctx.restore();
  }
  const mount = (id, fn) => {
    const go = () => { const r = document.getElementById('demo-' + id); if (!r) { (window.PR ? PR.errors : []).push(`demo-${id}: no element`); return; } r.classList.add('lesson');
      const again = () => (r._stages || []).forEach(S => S.redraw());
      r.addEventListener('input', again); r.addEventListener('click', again);
      try { fn(r); } catch (e) { r.append($('p', { class: 'error', text: 'Animation error: ' + e.message })); if (window.PR) PR.errors.push(`demo-${id}: ${e.message}`); } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  };
  const check = (id, name, fn) => window.PR && PR.check(id, name, fn);

  // camera colour-filter response: Gaussians calibrated to the paper's values at 470 nm (R 3 %, G 30 %, B 82 %),
  // plus a near-infrared tail where the dyes become transparent
  const RESP = { R: [0.70, 610, 56], G: [0.85, 535, 45], B: [0.93, 455, 30] };
  const NIRTAIL = { R: 1, G: 0.55, B: 0.5 };
  function resp(c, l) {
    const [a, m, s] = RESP[c], g = a * Math.exp(-((l - m) ** 2) / (2 * s * s));
    const qe = l <= 700 ? 0 : 0.6 * Math.exp(-(((l - 700) / 260) ** 2));   // sensor sensitivity falls off towards 1000 nm
    return Math.max(g, NIRTAIL[c] * qe * clamp((l - 680) / 60, 0, 1));
  }
  // white LED (warm white, 400–750 nm): blue pump + phosphor hump
  const whiteLED = l => (l < 400 || l > 750 ? 0 : 0.55 * Math.exp(-((l - 450) ** 2) / (2 * 11 ** 2)) + Math.exp(-((l - 600) ** 2) / (2 * 75 ** 2)));
  const monoLED = (c, l) => Math.exp(-((l - c) ** 2) / (2 * (c > 700 ? 18 : 12) ** 2));
  const emission = (src, l) => (src === 'WL' ? whiteLED(l) : monoLED(src, l));

  PR.terms({
    'wavelength': 'The distance between two adjacent peaks of a light wave, usually measured in nm (nanometres). For visible monochromatic light, wavelength is related to the color the eye sees.',
    'multispectral': 'Usually measures a small number of fairly wide wavelength bands, with one image per band. There is no universal band-count cutoff between multispectral and hyperspectral.',
    'analyzer': 'A polarizer placed in front of the camera lens (the analyzer). Rotating it shows how the brightness of the reflected light changes with its polarization direction.',
    'Malus\'s law': 'After ideal linearly polarized light passes through an analyzer, the fraction of brightness left is cos² of the angle between the two directions.',
    'UWL': 'Unpolarized white light.',
    'PWL': 'Polarized white light.',
    'UML': 'Unpolarized monochromatic light.',
    'PML': 'Polarized monochromatic light.'
  });

  // ======================= A1 wavelength and colour =======================
  mount('A1', root => {
    let lam = 550;
    const note = $('p', { class: 'note' });
    const sl = slider('Wavelength (nm)', 200, 1100, 5, lam, v => { lam = v; quick.set(v); upd(); });
    const quick = seg('', [[300, '300 nm UV'], [470, '470 nm blue'], [505, '505 nm green'], [590, '590 nm yellow'], [630, '630 nm red'], [850, '850 nm NIR']], 0, v => { lam = v; sl.set(v); upd(); });
    root.append(row(sl, quick.el));
    const S = stage(root, w => (w < 560 ? 290 : 280), (ctx, W, H, t) => {
      const c = wlRGB(lam), y0 = 92, amp = 34, px = (lam / 550) * 70, x0 = 20, x1 = W - 20;
      text(ctx, W < 560 ? 'Blue: shorter wavelength; red: longer' : 'In visible light, blue has a shorter wavelength and red a longer one', x0, 18, { color: '#94a3b8' });
      ctx.lineWidth = 3; ctx.setLineDash(c ? [] : [6, 5]); ctx.strokeStyle = rgba(c || NIRC);
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const y = y0 + amp * Math.sin((2 * Math.PI * (x - x0)) / px - t * 5); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.setLineDash([]);
      // one wavelength bracket: fixed in place (the wave moves under it; only the length matters)
      const xa = x0 + 10;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(xa, y0 - amp - 4); ctx.lineTo(xa, y0 - amp - 8); ctx.lineTo(xa + px, y0 - amp - 8); ctx.lineTo(xa + px, y0 - amp - 4); ctx.stroke();
      text(ctx, `One wavelength = ${lam} nm`, xa, y0 - amp - 13, { size: 12, color: '#e2e8f0' });
      if (!c) text(ctx, 'Invisible to the eye; a camera may still see it', W / 2, y0 + amp + 22, { align: 'center', color: '#cbd5e1' });
      // spectrum bar
      const by = H - 78, bh = 22, X = l => x0 + ((l - 200) / (1100 - 200)) * (x1 - x0);
      for (let l = 200; l < 1100; l += 2) { const k = wlRGB(l); ctx.fillStyle = k ? rgba(k) : l < 380 ? '#36284d' : '#1e293b'; ctx.fillRect(X(l), by, X(l + 2) - X(l) + 0.6, bh); }
      ctx.strokeStyle = '#475569'; ctx.strokeRect(X(200), by, X(1100) - X(200), bh);
      [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100].forEach(l => text(ctx, String(l), X(l), by + bh + 14, { align: 'center', size: 11, color: '#94a3b8' }));
      const brace = (a, b, y, s, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(a), y + 5); ctx.lineTo(X(a), y); ctx.lineTo(X(b), y); ctx.lineTo(X(b), y + 5); ctx.stroke(); text(ctx, s, (X(a) + X(b)) / 2, y - 5, { align: 'center', size: 12, color: col }); };
      brace(200, 380, by - 26, W < 560 ? 'UV' : 'UV: invisible', '#c4b5fd');
      brace(380, 750, by - 26, W < 560 ? 'Visible' : 'Visible (about 380–750 nm)', '#fbbf24');
      brace(750, 1100, by - 26, W < 560 ? 'NIR' : 'NIR: invisible', '#94a3b8');
      brace(380, 1100, by + bh + 42, 'Machine-vision range (380–1100 nm, II-C)', '#67e8f9');
      // marker
      const mx = X(lam); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(mx, by - 2); ctx.lineTo(mx - 7, by - 13); ctx.lineTo(mx + 7, by - 13); ctx.fill();
      ctx.fillRect(mx - 1, by, 2, bh);
    });
    function upd() { note.textContent = `${lam} nm is ${lam < 380 ? 'ultraviolet light' : lightName(lam)}. ` + (lam < 380 ? 'There is still light below 380 nm; this chart shows the ultraviolet region from 200 to 380 nm. The eye cannot see ultraviolet light; the purple in the chart only marks the position, and an ordinary camera may not detect it.' : lam > 750 ? 'The paper used 5 near-infrared LEDs (780–940 nm); the eye cannot see them, but a camera can capture them.' : 'The LED wavelengths used in the paper are 470, 505, 590 and 630 nm (visible) and 780–940 nm (near-infrared).'); S.redraw(); }
    root.append(note); upd();
  });

  // ======================= A2 spectrum, multispectral, hyperspectral =======================
  // a smooth "reflectance" curve of one pixel, 380–1100 nm
  const REFL = l => 0.35 + 0.22 * Math.exp(-((l - 480) ** 2) / (2 * 40 ** 2)) + 0.3 * Math.exp(-((l - 640) ** 2) / (2 * 60 ** 2)) - 0.15 * Math.exp(-((l - 560) ** 2) / (2 * 25 ** 2)) + 0.18 * Math.exp(-((l - 900) ** 2) / (2 * 90 ** 2));
  const bandMean = (a, b) => { let s = 0, n = 0; for (let l = a; l <= b; l += 1) { s += REFL(l); n++; } return s / n; };
  function bandsOf(mode) {
    if (mode === 'hyper') { const o = []; for (let l = 380; l < 1100; l += 5) o.push([l, l + 5]); return o; }
    if (mode === 'multi') return [[400, 450], [450, 510], [510, 580], [580, 640], [640, 700], [700, 780], [780, 900], [900, 1050]];
    if (mode === 'rgb') return [[400, 500, 'B'], [480, 600, 'G'], [570, 700, 'R']];
    if (mode === 'paper') return [[400, 750, 'WL'], ...LEDS.map(c => [c - 12, c + 12])];
    return [];
  }
  const A2TXT = {
    cont: 'Spectrum curve: the horizontal axis is wavelength and the vertical axis is reflectance. This curve shows how one object responds; a real instrument has limited resolution, and a real spectrum is not necessarily smooth.',
    hyper: 'Hyperspectral: measures many narrow, adjacent bands. Here there is one band every 5 nm, 144 bands in all, which keeps finer changes in the curve; the narrower the bands, the more detail is kept.',
    multi: 'Multispectral: usually measures a small number of wider bands. Here 8 bands are used, each shown as the mean reflectance over its range; finer variations may be averaged out.',
    rgb: 'An RGB color image uses 3 wide, overlapping bands: red, green and blue. This chart shows them as simplified bands; a Bayer pattern sensor measures only one color at each photosite, then estimates the full RGB value from neighboring pixels.',
    paper: 'This paper: 1 white LED and 9 monochromatic LED arrays illuminate in turn, and a color camera takes one picture each time. White light gives 3 numbers (R, G, B); monochromatic light gives the usable channels, 12 in total, for 15 numbers altogether (unpolarized). These values come from different combinations of illumination and channel, not from measuring continuous bands, so they are called a "pseudo-spectrum". The bars in the chart only suggest the source ranges; they do not show the 15 values the camera actually measures.'
  };
  mount('A2', root => {
    let mode = 'cont', since = 0;
    const note = $('p', { class: 'note' });
    const s = seg('View', [['cont', 'Spectrum curve'], ['hyper', 'Hyperspectral'], ['multi', 'Multispectral'], ['rgb', 'RGB color camera'], ['paper', 'Pseudo-spectrum of this paper']], mode, v => { mode = v; since = S.t; note.textContent = A2TXT[v]; S.redraw(); });
    root.append(row(s.el));
    const S = stage(root, w => (w < 560 ? 280 : 320), (ctx, W, H, t, dt, still) => {
      const L = 40, R = W - 16, T = 34, B = H - 40, X = l => L + ((l - 380) / 720) * (R - L), Y = v => B - v * (B - T);
      const age = Math.max(0, t - since), grow = still ? 1 : clamp(age / 0.9, 0, 1);
      // axis
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, T - 6); ctx.lineTo(L, B); ctx.lineTo(R, B); ctx.stroke();
      [400, 500, 600, 700, 800, 900, 1000, 1100].forEach(l => text(ctx, String(l), X(l), B + 15, { align: 'center', size: 11, color: '#94a3b8' }));
      text(ctx, 'Wavelength (nm)', R, B + 32, { align: 'right', size: 12, color: '#94a3b8' });
      text(ctx, 'Reflectance (illustrative)', L - 4, T - 12, { size: 12, color: '#94a3b8' });
      [0,0.5,1].forEach(v=>text(ctx,String(v),L-8,Y(v)+4,{align:'right',size:11,color:'#94a3b8'}));
      for (let l = 380; l < 1100; l += 2) { const k = wlRGB(l); ctx.fillStyle = k ? rgba(k, 0.9) : 'rgba(148,163,184,.25)'; ctx.fillRect(X(l), B + 1, X(l + 2) - X(l) + 0.5, 4); }
      // true curve
      ctx.strokeStyle = mode === 'cont' ? '#e2e8f0' : 'rgba(226,232,240,.35)'; ctx.lineWidth = mode === 'cont' ? 2.5 : 1.5; ctx.beginPath();
      for (let l = 380; l <= 1100; l += 2) { const x = X(l), y = Y(REFL(l)); l === 380 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      if (mode === 'cont') {
        for (let l = 380; l < 1100; l += 2) { const k = lightRGB(l); ctx.fillStyle = rgba(k, 0.28); const y = Y(REFL(l)); ctx.fillRect(X(l), y, X(l + 2) - X(l) + 0.5, B - y); }
        // a dot running along the curve
        const l = 380 + ((t * 120) % 720), k = lightRGB(l);
        ctx.fillStyle = rgba(k); ctx.beginPath(); ctx.arc(X(l), Y(REFL(l)), 5, 0, 7); ctx.fill();
        text(ctx, 'Reflectance curve of one object', W - 20, T + 4, { align: 'right', color: '#e2e8f0' });
        return;
      }
      const bands = bandsOf(mode), n = bands.length;
      bands.forEach((b, i) => {
        const g = still ? 1 : clamp(grow * 1.6 - (i / n) * 0.6, 0, 1); if (g <= 0) return;
        const [a, z, tag] = b, c = (a + z) / 2;
        if (tag === 'WL') {
          // white light gives R, G, B through the camera filters
          ['B', 'G', 'R'].forEach((ch, j) => {
            const lo = [400, 480, 570][j], hi = [500, 600, 700][j], v = bandMean(lo, hi) * 0.92;
            const col = { R: [248, 113, 113], G: [74, 222, 128], B: [96, 165, 250] }[ch];
            ctx.fillStyle = rgba(col, 0.22); ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 1.5;
            const y = Y(v * g); ctx.fillRect(X(lo), y, X(hi) - X(lo), B - y); ctx.strokeRect(X(lo), y, X(hi) - X(lo), B - y);
            text(ctx, 'WL-' + ch, (X(lo) + X(hi)) / 2, B - 8, { align: 'center', size: 11, color: rgba(col) });
          });
          return;
        }
        const v = bandMean(a, z), y = Y(v * g), col = tag ? { R: [248, 113, 113], G: [74, 222, 128], B: [96, 165, 250] }[tag] : lightRGB(c);
        ctx.fillStyle = rgba(col, tag ? 0.25 : 0.75); ctx.fillRect(X(a) + 0.5, y, Math.max(1, X(z) - X(a) - (n > 20 ? 0.6 : 1.5)), B - y);
        if (tag) { ctx.strokeStyle = rgba(col); ctx.lineWidth = 1.5; ctx.strokeRect(X(a), y, X(z) - X(a), B - y); text(ctx, tag, X(c), y - 5, { align: 'center', size: 12, color: rgba(col) }); }
        else if (mode === 'paper') text(ctx, String(c), X(c), W < 560 ? T + 22 + (LEDS.indexOf(c) % 2 ? 12 : 0) : y - 6, { align: 'center', size: 10.5, color: '#cbd5e1' });
        // dividing lines sweep in
        if (mode !== 'paper' && !tag) { ctx.strokeStyle = 'rgba(15,20,25,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(a), y); ctx.lineTo(X(a), B); ctx.stroke(); }
      });
      const N = { hyper: '144', multi: '8', rgb: '3', paper: '15' }[mode];
      text(ctx, `${N} numbers per pixel`, W - 20, T + 4, { align: 'right', bold: true, color: '#fbbf24', size: 14 });
    });
    root.querySelector('.lz-playbar .lz-tog').addEventListener('click', () => { since = 0; S.redraw(); });
    root.querySelector('.lz-play').addEventListener('click', () => { if(S.playing) since = S.t; });
    note.textContent = A2TXT[mode]; root.append(note);
  });

  // ======================= A3 LEDs =======================
  mount('A3', root => {
    let src = 'WL', all = false;
    const parts = [];
    const note = $('p', { class: 'note' });
    const s = seg('LED', [['WL', 'White light'], ...LEDS.map(l => [l, l + ' nm'])], src, v => { src = v; parts.length = 0; upd(); });
    const tg = toggle('Compare the 9 monochromatic sources', all, v => { all = v; S.redraw(); });
    root.append(row(s.el, tg));
    const sample = () => {
      if (src !== 'WL') return src + (Math.random() - 0.5) * 30;
      for (;;) { const l = 400 + Math.random() * 350; if (Math.random() * 1.05 < whiteLED(l)) return l; }
    };
    const S = stage(root, w => (w < 560 ? 330 : 270), (ctx, W, H, t, dt, still) => {
      const narrow = W < 560, lx = 46, ly = narrow ? 70 : H / 2, fw = narrow ? W - 24 : W * 0.38;
      // LED body
      const body = src === 'WL' ? [255, 244, 214] : lightRGB(src);
      const glow = ctx.createRadialGradient(lx, ly, 4, lx, ly, 60); glow.addColorStop(0, rgba(body, 0.75)); glow.addColorStop(1, rgba(body, 0));
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(lx, ly, 60, 0, 7); ctx.fill();
      ctx.fillStyle = '#334155'; ctx.fillRect(lx - 16, ly + 14, 32, 8);
      ctx.fillStyle = rgba(body, 0.95); ctx.beginPath(); ctx.arc(lx, ly + 2, 14, Math.PI, 0); ctx.lineTo(lx + 14, ly + 14); ctx.lineTo(lx - 14, ly + 14); ctx.fill();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx - 6, ly + 22); ctx.lineTo(lx - 6, ly + 36); ctx.moveTo(lx + 6, ly + 22); ctx.lineTo(lx + 6, ly + 36); ctx.stroke();
      // photons
      if (!still) for (let k = 0; k < 3; k++) { const a = (Math.random() - 0.5) * 1.1; parts.push({ x: lx + 14, y: ly, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, l: sample() }); }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x > lx + fw || p.y < 0 || p.y > (narrow ? 140 : H)) { parts.splice(i, 1); continue; }
        const c = wlRGB(p.l); ctx.fillStyle = c ? rgba(c) : 'rgba(148,163,184,.45)';
        ctx.beginPath(); ctx.arc(p.x, p.y, c ? 2.6 : 2, 0, 7); ctx.fill();
      }
      if (src !== 'WL' && src > 750) text(ctx, 'NIR: invisible to the eye (gray dots)', lx + 30, narrow ? 132 : ly + 70, { size: 12, color: '#94a3b8' });
      // spectrum plot
      const px0 = narrow ? 36 : W * 0.48, px1 = W - 14, py0 = narrow ? 170 : 34, py1 = H - 34;
      const X = l => px0 + ((l - 380) / 620) * (px1 - px0), Y = v => py1 - v * (py1 - py0);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px0, py0 - 4); ctx.lineTo(px0, py1); ctx.lineTo(px1, py1); ctx.stroke();
      [400, 500, 600, 700, 800, 900, 1000].forEach(l => text(ctx, String(l), X(l), py1 + 14, { align: 'center', size: 11, color: '#94a3b8' }));
      text(ctx, 'Wavelength (nm)', px1, py1 + 29, { align: 'right', size: 11, color: '#94a3b8' });
      text(ctx, 'Emission intensity', px0 + 4, py0 - 22, { size: 12, color: '#94a3b8' });
      const curve = (f, col, lw, fill) => {
        ctx.beginPath(); for (let l = 380; l <= 1000; l += 2) { const y = Y(f(l)); l === 380 ? ctx.moveTo(X(l), y) : ctx.lineTo(X(l), y); }
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
        if (fill) { ctx.lineTo(X(1000), py1); ctx.lineTo(X(380), py1); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
      };
      if (all) LEDS.forEach(c => curve(l => monoLED(c, l), rgba(lightRGB(c), 0.55), 1.2));
      const peak = src === 'WL' ? 1.02 : 1;
      if (src === 'WL') {
        for (let l = 400; l < 750; l += 2) { const k = wlRGB(l), y = Y(whiteLED(l) / peak); ctx.fillStyle = rgba(k, 0.55); ctx.fillRect(X(l), y, X(l + 2) - X(l) + 0.5, py1 - y); }
        curve(l => whiteLED(l) / peak, '#f8fafc', 2);
        text(ctx, 'Light across 400–750 nm', Math.min(Math.max(X(600), px0 + 78), px1 - 78), Y(1.0) - 4, { align: 'center', size: 12, color: '#f8fafc' });
      } else {
        curve(l => monoLED(src, l), rgba(lightRGB(src)), 2.5, rgba(lightRGB(src), 0.3));
        text(ctx, `Near ${src} nm`, X(src), Y(1) - 6, { align: src > 900 ? 'right' : 'center', size: 12, color: '#f8fafc' });
      }
    });
    function upd() {
      note.textContent = src === 'WL'
        ? 'The white LED (the paper used a LUXEON warm white) emits a wide range of light from 400 to 750 nm; mixed together it looks white. Compare its spectral width with that of monochromatic light.'
        : `A monochromatic LED emits only a narrow band of wavelengths near ${src} nm. The paper used 9 monochromatic LED arrays (470, 505, 590, 630, 780, 810, 850, 880, 940 nm), illuminating in turn and photographing separately. The paper notes that LEDs offer advantages such as long life and efficiency, and are a common light source in machine vision (Section II-A). Switch the source and see where the spectrum is concentrated.`;
      s.set(src); S.redraw();
    }
    root.append(note); upd();
  });

  // ======================= A4 white light vs monochromatic light (real images) =======================
  const CH = { WL: ['R', 'G', 'B'], 470: ['G', 'B'], 505: ['G', 'B'], 590: ['R', 'G'], 630: ['R'], 780: ['R'], 810: ['R'], 850: ['R'], 880: ['R'], 940: ['R'] };
  const img = (d, l, c) => `figs/benmoussat12-tab2-d${d}-${l}-${c}-real.png`;
  mount('A4', root => {
    let d = 1, src = 'WL', timer = 0;
    const lights = ['WL', ...LEDS];
    const sd = seg('Defect', [[1, 'Defect I dent'], [2, 'Defect II small dent'], [3, 'Defect III scratch']], d, v => { d = v; draw(); });
    const sl = seg('Illumination', lights.map(l => [l, l === 'WL' ? 'White light' : l + ' nm']), src, v => { stop(); src = v; draw(); });
    const play = $('button', { type: 'button', class: 'lz-tog', text: '▶ Auto play', 'aria-pressed': 'false' });
    function stop() { if (timer) { clearInterval(timer); timer = 0; play.textContent = '▶ Auto play'; play.setAttribute('aria-pressed', 'false'); } }
    play.addEventListener('click', () => {
      if (timer) { stop(); return; }
      play.textContent = '⏸ Pause'; play.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => { src = lights[(lights.indexOf(src) + 1) % lights.length]; sl.set(src); draw(); }, 1800);
    });
    root.append(row(sd.el), row(sl.el, play));
    const lamp = $('div', { class: 'lz-lamp' });
    const grid = $('div', { class: 'lz-shots' });
    const note = $('p', { class: 'note' });
    root.append($('p',{class:'lz-observe',text:'What to look for: '+LESSON_HINTS['demo-A4']}));
    root.append(lamp, grid, note);
    function draw() {
      const chs = CH[src], col = src === 'WL' ? 'linear-gradient(90deg,#60a5fa,#4ade80,#fbbf24,#f87171)' : rgba(lightRGB(src));
      lamp.style.background = col;
      lamp.textContent = src === 'WL' ? 'White LED (400–750 nm) illumination' : `${src} nm ${lightName(src)} LED illumination`;
      grid.innerHTML = '';
      chs.forEach((c, i) => {
        const f = $('figure', { class: 'lz-shot', style: `animation-delay:${i * 0.12}s` },
          $('img', { src: img(d, src, c), alt: `Defect ${d}, ${src} ${c} channel` }),
          $('figcaption', { text: `${c} channel` }));
        grid.append(f);
      });
      note.textContent = src === 'WL'
        ? 'White light covers a wider range of visible wavelengths. One color photo can be split into 3 grayscale channel images: R, G and B.'
        : src > 750
          ? `${src} nm is near-infrared light; the paper keeps only the R channel, as 1 component (Table II).`
          : `${src} nm monochromatic light illuminates only a narrow range of wavelengths; the paper keeps only the channels with a strong enough signal (${chs.join(', ')}), ${chs.length} images in all (Table II).`;
      note.textContent += ' Compare the brightness difference between the dent or scratch and the surrounding background, and see which illumination makes the defect easier to recognize.';
    }
    draw();
  });

  // ======================= B1 what polarisation is (two fences) =======================
  mount('B1', root => {
    let pol = true, ana = 0, twist = 25, spin = false;
    const parts = [];
    const tp = toggle('Polarizer in front of lamp', pol, v => { pol = v; parts.length = 0; });
    const st = slider('Polarization direction after reflection (illustrative, degrees)', 0, 90, 1, twist, v => (twist = v));
    const sa = slider('Analyzer angle (degrees)', 0, 180, 1, ana, v => { ana = v; spin = false; ts.set(false); });
    const ts = toggle('Auto-rotate analyzer', spin, v => { spin = v; if(v) S.playing = true; S.syncLabel(); S.redraw(); });
    root.append(row(tp, st), row(sa, ts));
    const readout = $('p', { class: 'note' });
    let shown = 0, lastText = 0;
    const S = stage(root, w => (w < 560 ? 250 : 270), (ctx, W, H, t, dt, still) => {
      if (spin) { ana = (ana + dt * 40) % 180; sa.set(Math.round(ana)); }
      const y = H / 2 - 10, xs = { lamp: 34, f1: W * 0.24, metal: W * 0.5, f2: W * 0.74, cam: W - 40 }, R = Math.min(46, H * 0.2);
      // labels
      const nw = W < 560, fs = nw ? 11.5 : 13, ly2 = y + R + 30;
      text(ctx, 'Lamp', xs.lamp, ly2, { align: 'center', size: fs });
      text(ctx, pol ? 'Polarizer' : nw ? '(removed)' : '(polarizer removed)', xs.f1, nw ? ly2 + 18 : ly2, { align: 'center', size: fs, color: pol ? '#cbd5e1' : '#64748b' });
      text(ctx, 'Metal reflection', xs.metal, ly2, { align: 'center', size: fs });
      text(ctx, `Analyzer ${Math.round(ana)}°`, xs.f2, nw ? ly2 + 18 : ly2, { align: 'center', size: fs });
      text(ctx, 'Camera', xs.cam, ly2, { align: 'center', size: fs });
      text(ctx, nw ? 'Random' : 'Random directions', (xs.lamp + xs.f1) / 2, y - R - 18, { align: 'center', size: fs, color: '#fde68a' });
      text(ctx, pol ? 'Aligned' : 'Still random', (xs.f1 + xs.metal) / 2, y - R - 18, { align: 'center', size: fs, color: '#67e8f9' });
      // lamp
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(xs.lamp, y, 13, 0, 7); ctx.fill();
      // metal strip
      ctx.fillStyle = '#64748b'; ctx.fillRect(xs.metal - 5, y - R, 10, 2 * R);
      ctx.fillStyle = 'rgba(203,213,225,.35)'; ctx.fillRect(xs.metal - 5, y - R, 3, 2 * R);
      // fences
      if (pol) fence(ctx, xs.f1, y, R, 0, '#67e8f9', 0.55);
      fence(ctx, xs.f2, y, R, ana, '#fbbf24', 0.55);
      // packets: theta = vibration direction (0 = vertical), a = amplitude
      if (!still && Math.random() < dt * 22) parts.push({ x: xs.lamp + 16, th: Math.random() * 180, a: 1, st: 0 });
      // Keep the field components visible when paused, including before the first frame.
      const fieldSnapshot = () => Array.from({ length: 28 }, (_, i) => {
        const x = xs.lamp + 18 + (xs.cam - xs.lamp - 44) * i / 27;
        const st = x < xs.f1 ? 0 : x < xs.metal ? 1 : x < xs.f2 ? 2 : 3;
        const natural = (i * 37) % 180;
        const th = st === 3 ? ana : st === 0 || !pol ? natural : st === 1 ? 0 : twist;
        let a = st > 0 && pol ? 0.7 : 1;
        if (st === 3) a *= Math.abs(Math.cos(rad((pol ? twist : natural) - ana)));
        return { x, st, th, a };
      });
      if (!still && !parts.length) parts.push(...fieldSnapshot());
      const shownParts = still ? fieldSnapshot() : parts;
      let arrived = 0;
      for (let i = shownParts.length - 1; i >= 0; i--) {
        const p = shownParts[i]; p.x += dt * 120;
        if (p.st === 0 && p.x >= xs.f1) { p.st = 1; if (pol) { p.a *= Math.abs(Math.cos(rad(p.th))); p.th = 0; } }
        if (p.st === 1 && p.x >= xs.metal) { p.st = 2; p.th = pol ? p.th + twist : Math.random() * 180; }
        if (p.st === 2 && p.x >= xs.f2) { p.st = 3; p.a *= Math.abs(Math.cos(rad(p.th - ana))); p.th = ana; }
        if (p.x >= xs.cam - 14) { arrived += p.a * p.a; shownParts.splice(i, 1); continue; }
        if (p.a < 0.04) { shownParts.splice(i, 1); continue; }
        // draw a jump-rope stroke: the vibration direction, squashed for perspective
        const L = R * 0.8 * p.a * (0.55 + 0.45 * Math.sin(t * 14 + p.x * 0.05)), a = rad(p.th);
        const dx = Math.sin(a) * L * 0.45, dy = -Math.cos(a) * L;
        ctx.strokeStyle = p.st === 0 ? 'rgba(253,230,138,.65)' : p.st === 1 ? 'rgba(103,232,249,.9)' : p.st === 2 ? 'rgba(196,181,253,.9)' : 'rgba(251,191,36,.95)';
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - dx, y - dy); ctx.lineTo(p.x + dx, y + dy); ctx.stroke();
      }
      // expected brightness at the camera (fraction of the lamp)
      const exp = pol ? 0.5 * Math.cos(rad(twist - ana)) ** 2 : 0.5;
      shown += (exp - shown) * Math.min(1, dt * 6) || 0; if (still) shown = exp;
      const v = Math.round(40 + 215 * clamp(shown / 0.5, 0, 1));
      ctx.fillStyle = '#1e293b'; ctx.fillRect(xs.cam - 16, y - 18, 32, 36);
      ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(xs.cam - 11, y - 13, 22, 26);
      ctx.fillStyle = '#334155'; ctx.fillRect(xs.cam - 24, y - 7, 8, 14);
      void arrived;
      if (!readout.textContent || t < lastText || t - lastText > 0.25 || still) {
        lastText = t;
        readout.textContent = pol
          ? `Blue lines show the uniform vibration direction after the polarizer; purple lines show the direction after reflection from the metal (${twist}°). Taking the light before the analyzer as 100%, with the analyzer at ${Math.round(ana)}° ${Math.round(100 * exp / 0.5)}% passes through. Most passes when the directions are parallel and least when they are perpendicular. This uses the same percentage baseline as B2.`
          : 'With the lamp polarizer removed, the vibration directions stay random. Taking the light before the analyzer as 100%, unpolarized light in this example keeps 50% after an ideal analyzer; the brightness does not change as the analyzer rotates.';
      }
    });
    root.append(readout); void S;
  });

  // ======================= B2 analyzer angle and Malus' law =======================
  const malus = (th, phi) => Math.cos(rad(th - phi)) ** 2;
  check('B2', 'Polarization direction 0°, analyzer 60° → cos²60° = 0.25', () => ({ expected: 0.25, actual: malus(60, 0), tol: 1e-9 }));
  check('B2', 'Polarization direction 0°, analyzer 90° → 0 (fully blocked)', () => ({ expected: 0, actual: malus(90, 0), tol: 1e-9 }));
  mount('B2', root => {
    let th = 0, phi = 0, spin = false;
    const sp = slider('Incident polarization direction φ (degrees)', 0, 180, 1, phi, v => (phi = v));
    const sa = slider('Analyzer angle θ (degrees)', 0, 180, 1, th, v => { th = v; spin = false; ts.set(false); });
    const ts = toggle('Auto-rotate', spin, v => { spin = v; if(v) S.playing = true; S.syncLabel(); S.redraw(); });
    const q = seg('Angles used in the paper', [[30, '30°'], [60, '60°'], [90, '90°']], 0, v => { th = v; spin = false; ts.set(false); sa.set(v); });
    root.append(row(sp, sa, ts), row(q.el));
    const S = stage(root, w => (w < 560 ? 420 : 260), (ctx, W, H, t, dt) => {
      if (spin) { th = (th + dt * 30) % 180; sa.set(Math.round(th)); }
      q.set(Math.round(th));
      const narrow = W < 560, cx = narrow ? W / 2 : 130, cy = narrow ? 105 : H / 2, R = 80, I = malus(th, phi);
      // incoming vibration (cyan), analyzer slits (gold), passing component (white)
      fence(ctx, cx, cy, R, th, 'rgba(251,191,36,.8)');
      const a = rad(phi), L = R * 0.9 * (0.6 + 0.4 * Math.sin(t * 10));
      ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - Math.sin(a) * L, cy + Math.cos(a) * L); ctx.lineTo(cx + Math.sin(a) * L, cy - Math.cos(a) * L); ctx.stroke();
      const b = rad(th), P = L * Math.cos(rad(th - phi));
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - Math.sin(b) * P, cy + Math.cos(b) * P); ctx.lineTo(cx + Math.sin(b) * P, cy - Math.cos(b) * P); ctx.stroke();
      text(ctx, 'Blue: incident field', cx, cy + R + 20, { align: 'center', size: 12, color: '#94a3b8' }); text(ctx, 'White: component along the analyzer', cx, cy + R + 36, { align: 'center', size: 12, color: '#94a3b8' });
      // brightness swatch
      const v = Math.round(25 + 230 * I), sx = narrow ? W - 60 : 270, sy = narrow ? 30 : cy - 40;
      ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(sx, sy, 44, 80); ctx.strokeStyle = '#475569'; ctx.strokeRect(sx, sy, 44, 80);
      text(ctx, `${narrow ? 'Bright' : 'Brightness'} ${Math.round(I * 100)}%`, sx + 22, sy + 98, { align: 'center', size: 12 });
      // cos^2 curve
      const x0 = narrow ? 40 : 360, x1 = W - 16, y0 = narrow ? 270 : 40, y1 = H - 34, X = d => x0 + (d / 180) * (x1 - x0), Y = v2 => y1 - v2 * (y1 - y0);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      [0, 30, 60, 90, 120, 150, 180].forEach(d => text(ctx, d + '°', X(d), y1 + 15, { align: 'center', size: 11, color: [30, 60, 90].includes(d) ? '#fbbf24' : '#94a3b8' }));
      [30, 60, 90].forEach(d => { ctx.strokeStyle = 'rgba(251,191,36,.3)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(X(d), y0); ctx.lineTo(X(d), y1); ctx.stroke(); ctx.setLineDash([]); });
      ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 2; ctx.beginPath();
      for (let d = 0; d <= 180; d += 1) { const yy = Y(malus(d, phi)); d === 0 ? ctx.moveTo(X(d), yy) : ctx.lineTo(X(d), yy); }
      ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(th), Y(I), 6, 0, 7); ctx.fill();
      text(ctx, 'Brightness = cos²(θ − φ)', x0 + 14, y0 - 8, { size: 13, color: '#e2e8f0' });
      text(ctx, 'Analyzer angle θ', x1, y1 + 30, { align: 'right', size: 11, color: '#94a3b8' });
    });
    root.append($('p', { class: 'note', text: 'The analyzer passes the component of the electric field along its transmission axis. For ideal linearly polarized light, the most light passes when the directions are parallel, none when they are perpendicular, and in between it varies as cos² (Malus\'s law). Brightness in the chart takes the light before the analyzer as 100%. The paper shot at 30°, 60° and 90° but does not say what the angle is measured from (Section IV).' }));
    void S;
    root.querySelectorAll('.lz-playbar button').forEach(button => button.addEventListener('click', () => { if(S.playing) { spin = true; ts.set(true); S.redraw(); } }));
  });

  // ======================= B3 the acquisition set-up (Fig. 1) =======================
  mount('B3', root => {
    let pol = true, src = 'WL', ana = 30, spin = false, step = 0, lastCopy = '';
    const titles = ['1. Source emits', '2. Passes polarizer', '3. Reflects off metal', '4. Analyzer and camera'];
    const stepTitle = $('h4', { class: 'lz-focus-title' }), cue = $('p', { class: 'lz-focus-cue' });
    const result = $('div', { class: 'lz-light-result', 'aria-label': 'Light before and after the analyzer' });
    const beforeBar = $('div', { class: 'lz-light-track' }, $('span', { style: 'width:100%' }));
    const afterFill = $('span');
    const value = $('strong');
    result.append($('div', {}, $('span', { text: 'Before the analyzer' }), beforeBar, $('strong', { text: '100%' })),
      $('div', {}, $('span', { text: 'After the analyzer' }), $('div', { class: 'lz-light-track' }, afterFill), value));
    const sm = seg('Illumination', [[true, '(a) With polarizer'], [false, '(b) Polarizer removed']], pol, v => { pol = v; jump(1); });
    const sl = seg('Source', [['WL', 'White light'], [470, '470 nm'], [505, '505 nm'], [630, '630 nm'], [850, '850 nm']], src, v => { src = v; jump(0); });
    const sa = seg('Analyzer angle', [[30, '30°'], [60, '60°'], [90, '90°']], ana, v => { ana = v; spin = false; tsp.set(false); jump(3); });
    const tsp = toggle('Rotate analyzer continuously', spin, v => { spin = v; step = 3; S.t = 9; S.playing = v; S.syncLabel(); S.redraw(); });
    const steps = seg('Steps', titles.map((v,i)=>[i,v]), step, v => jump(v));
    const previous = $('button', { type: 'button', class: 'lz-tog', text: 'Previous' });
    const next = $('button', { type: 'button', class: 'lz-tog', text: 'Next' });
    previous.addEventListener('click', () => jump(Math.max(0, step - 1)));
    next.addEventListener('click', () => jump(Math.min(3, step + 1)));
    root.append(row(steps.el), row(sm.el,sl.el),row(sa.el,tsp), $('div', { class: 'lz-focus-copy' }, stepTitle, cue));
    function jump(v) { step = v; spin = false; tsp.set(false); S.t = v * 3; S.playing = false; S.syncLabel(); S.redraw(); }
    const S = stage(root, 380, (ctx, W, H, t, dt, still) => {
      if (spin) { step = 3; ana = (ana + dt * 30) % 180; sa.set(Math.round(ana)); }
      else if (!still) { step = Math.min(3, Math.floor(t / 3)); if (t >= 12) { S.playing = false; S.t = 0; S.syncLabel(); } }
      steps.set(step); previous.disabled = step === 0; next.disabled = step === 3;
      const transmission = pol ? Math.cos(rad(ana - 25)) ** 2 : 0.5;
      const copies = [
        src === 'WL' ? 'Look at the top left: white light contains many visible wavelengths. Then follow the arrow to see how the light travels to the metal part.' : `Look at the top left: the source is concentrated near ${src} nm. ${src > 750 ? 'This is near-infrared light, which the eye cannot see; it is drawn in gray in the figure.' : 'The color changes, but the light path and the imaging order stay the same.'}`,
        pol ? 'Look at the blue polarizer and compare before and after: vibrations that had no fixed direction keep only the component along the transmission axis, so the short lines now point the same way.' : 'The lamp polarizer has been removed. Compare the short lines before and after: no polarization direction has been set beforehand.',
        pol ? 'Look at the purple short lines beside the metal: after reflection the light changes its direction of travel. In this example the polarization direction of the reflected light is set to 25° so you can compare it in the next step.' : 'Look at the light turning from the metal part toward the camera. The real polarization after reflection depends on the surface condition; this example uses unpolarized light as a reference.',
        pol ? `Look at the brightness bar on the right and the camera: the analyzer is now at ${Math.round(ana)}°. Choose 30°, 60° or 90° and compare the angle to the direction of the reflected light with the amount of light that passes.` : 'Look at the brightness bar on the right: here unpolarized light keeps half its light after an ideal analyzer, and this does not change as the angle rotates. Switch back to polarized illumination to compare.'
      ];
      const copyKey = step + copies[step];
      if (copyKey !== lastCopy) { lastCopy = copyKey; stepTitle.textContent = titles[step]; cue.textContent = copies[step]; }
      afterFill.style.width = (transmission * 100).toFixed(1) + '%'; value.textContent = (transmission * 100).toFixed(0) + '%';
      result.hidden = false;
      const lx = W * 0.16, ly = 46, py = 250, pY = 135, ax = W * 0.62, cx = W - 98;
      const col = src === 'WL' ? [255,248,220] : lightRGB(src);
      const regions = [[lx-55,22,110,74],[lx-78,pY-44,156,90],[lx-85,py-50,200,108],[ax-48,py-75,W-ax+24,170]];
      const r = regions[step]; ctx.fillStyle = 'rgba(103,232,249,.055)'; ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 1.5;
      ctx.fillRect(...r); ctx.strokeRect(...r);
      text(ctx, 'Now viewing', Math.max(4, r[0]+10), r[1]-7, {color:'#67e8f9',size:12});
      // A continuous path makes the order clear even when playback is paused.
      arrow(ctx, lx, ly+26, lx, pY-15, rgba(col,.7),2);
      arrow(ctx, lx, pY+15, lx, py-25, pol ? '#67e8f9' : rgba(col,.7),2);
      arrow(ctx, lx+12, py-9, ax-28, py-9, '#c4b5fd',2.5);
      arrow(ctx, ax+25, py-9, cx-43, py-9, '#fbbf24',2.5);
      // Field-direction marks, not a stream of identical dots.
      function component(x,y,angle,amp,color) {
        const a=rad(angle),dx=Math.sin(a)*amp,dy=-Math.cos(a)*amp;
        ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-dx,y-dy);ctx.lineTo(x+dx,y+dy);ctx.stroke();
      }
      for(let i=0;i<5;i++) component(lx+28,ly+34+i*9,(i*41)%180,9,rgba(col));
      for(let i=0;i<4;i++) component(lx+30,pY+28+i*15,pol?0:(i*41)%180,13,pol?'#67e8f9':rgba(col));
      for(let i=0;i<8;i++) component(lx+60+i*(ax-lx-95)/7,py-9,pol?25:(i*41)%180,15,'#c4b5fd');
      for(let i=0;i<4;i++) component(ax+37+i*(cx-ax-91)/3,py-9,ana,15*Math.sqrt(transmission),'#fbbf24');
      ctx.fillStyle=rgba(col);ctx.beginPath();ctx.arc(lx,ly,12,0,7);ctx.fill();
      text(ctx,src==='WL'?'White LED':`${src} nm LED`,lx+23,ly+4,{size:14});
      if(pol) {ctx.fillStyle='#163542';ctx.fillRect(lx-45,pY-9,90,18);for(let x=-40;x<=40;x+=8){ctx.strokeStyle='#67e8f9';ctx.beginPath();ctx.moveTo(lx+x,pY-8);ctx.lineTo(lx+x,pY+8);ctx.stroke();}}
      else {ctx.setLineDash([4,4]);ctx.strokeStyle='#64748b';ctx.strokeRect(lx-45,pY-9,90,18);ctx.setLineDash([]);}
      text(ctx,pol?'Lamp polarizer':'Lamp polarizer removed',lx+56,pY+5,{color:pol?'#67e8f9':'#94a3b8',size:14});
      ctx.fillStyle='#475569';ctx.beginPath();ctx.moveTo(lx-70,py+2);ctx.lineTo(lx+80,py+2);ctx.lineTo(lx+105,py-17);ctx.lineTo(lx-45,py-17);ctx.closePath();ctx.fill();
      text(ctx,'Metal part',lx-42,py+40,{size:14});
      text(ctx,pol?'Reflected polarization: 25°':'Unpolarized reflection (reference)',(lx+ax)/2,py-38,{align:'center',color:'#c4b5fd',size:13});
      fence(ctx,ax,py-9,33,ana,'#fbbf24',.45);
      text(ctx,`Analyzer ${Math.round(ana)}°`,ax,py+49,{align:'center',color:'#fbbf24',size:14});
      const brightness=Math.round(255*transmission);
      ctx.fillStyle='#334155';ctx.fillRect(cx-39,py-45,78,70);ctx.fillStyle=`rgb(${brightness},${brightness},${brightness})`;ctx.fillRect(cx-30,py-36,60,52);
      text(ctx,'Brightness at the camera',cx,py-58,{align:'center',size:13});
      text(ctx,`${(transmission*100).toFixed(0)}%`,cx,W < 560 ? py+85 : py+55,{align:'center',size:24,bold:true,color:'#fbbf24'});
      if(!still) {
        const progress=(t%3)/3;let x,y;
        if(step<2){x=lx;y=step===0?ly+26+progress*(pY-ly-42):pY+16+progress*(py-pY-43);}
        else{x=step===2?lx+12+progress*(ax-lx-40):ax+25+progress*(cx-ax-68);y=py-9;}
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.fill();
      }
      text(ctx,'Arrow: travel direction  Line: field direction',24,H-20,{size:13,color:'#94a3b8'});
    });
    root.append(row(previous,next),result,
      $('p',{class:'note',text:'First play the 4-step walkthrough, then compare analyzer angles. The percentages take the light before the analyzer as 100%; in this example the polarization direction of the reflected light is fixed at 25° to show how angle relates to brightness.'}));
    S.playing=false;S.syncLabel();S.redraw();
    root.querySelector('.lz-playbar .lz-tog').addEventListener('click', () => { spin = false; tsp.set(false); step = 0; S.redraw(); });
    const original=$('div',{class:'lz-original'});
    original.append($('h4',{text:'Compare with Fig. 1 of the paper'}),$('figure',{class:'figure'},$('img',{src:'figs/benmoussat12-fig1-real.png',alt:'Fig. 1 of the paper: the image acquisition system'}),$('figcaption',{text:'(a) A polarizer in front of the light source; (b) the polarizer in front of the light source removed. The analyzer stays in front of the camera in both.'})));
    root.append(original);
  });


  // ======================= B4 the four lighting modalities and the cubes =======================
  const ML12 = [['470', 'G'], ['470', 'B'], ['505', 'G'], ['505', 'B'], ['590', 'R'], ['590', 'G'], ['630', 'R'], ['780', 'R'], ['810', 'R'], ['850', 'R'], ['880', 'R'], ['940', 'R']];
  const WL3 = [['WL', 'R'], ['WL', 'G'], ['WL', 'B']];
  const CUBES = [['Cube 1', 'UWL', 3], ['Cube 2', 'PWL', 9], ['Cube 3', 'UML', 12], ['Cube 4', 'PML', 36], ['Cube 5', 'All combined', 60]];
  check('B4', 'Table I: components in cube 5 = 3 + 9 + 12 + 36 = 60', () => ({ expected: 60, actual: WL3.length + 3 * WL3.length + ML12.length + 3 * ML12.length, tol: 0 }));
  mount('B4', root => {
    let light = 'WL', pol = false, d = 1;
    const sL = seg('Source', [['WL', 'White light WL'], ['ML', 'Monochromatic light ML (9 arrays)']], light, v => { light = v; draw(); });
    const sP = seg('Polarizer in front of lamp', [[false, 'Off (U)'], [true, 'On (P)']], pol, v => { pol = v; draw(); });
    const sD = seg('Defect', [[1, 'I'], [2, 'II'], [3, 'III']], d, v => { d = v; draw(); });
    root.append(row(sL.el, sP.el, sD.el));
    const head = $('div', { class: 'lz-mode' }), shots = $('div', { class: 'lz-stack' }), note = $('p', { class: 'note' });
    root.append($('p',{class:'lz-observe',text:'What to look for: '+LESSON_HINTS['demo-B4']}));
    root.append(head, shots, note);
    function draw() {
      const code = (pol ? 'P' : 'U') + light;
      head.innerHTML = `<b>${code}</b><span>${pol ? 'Polarized' : 'Unpolarized'} + ${light === 'WL' ? 'White Light' : 'Monochromatic Light'}</span>`;
      const list = light === 'WL' ? WL3 : ML12, angles = pol ? [30, 60, 90] : [null];
      shots.innerHTML = '';
      let k = 0;
      angles.forEach(a => {
        const grp = $('div', { class: 'lz-grp' }, $('div', { class: 'lz-grp-t', text: a == null ? 'Analyzer at one fixed angle' : `Analyzer ${a}°` }));
        const g = $('div', { class: 'lz-thumbs' });
        list.forEach(([l, c]) => {
          // polarised shots are simulated from the unpolarised photo: each analyzer angle passes a different share of the glare
          const f = a == null ? '' : `filter:brightness(${[0.8, 0.62, 0.95][[30, 60, 90].indexOf(a)]}) contrast(${[1.15, 1.35, 1.05][[30, 60, 90].indexOf(a)]});`;
          g.append($('figure', { class: 'lz-thumb', style: `animation-delay:${(k++) * 0.04}s;${f}` },
            $('img', { src: img(d, l, c), alt: `${l} ${c}`, loading: 'lazy' }), $('figcaption', { text: `${l === 'WL' ? 'White light' : l + ' nm'} ${c}` })));
        });
        grp.append(g); shots.append(grp);
      });
      const n = list.length * angles.length, idx = { UWL: 0, PWL: 1, UML: 2, PML: 3 }[code];
      note.textContent = `${CUBES[idx][0]}: ${list.length} illumination-and-channel combinations${pol ? ' × 3 analyzer angles' : ''} = ${n} components. Each pixel therefore has ${n} brightness values; combining all four illumination types gives 60 components (Table I).${pol ? ' The same images are reused below, with the display brightness and contrast adjusted to tell the 3 angle groups apart; these adjustments do not represent the polarization effect actually measured at each angle.' : ''}`;
    }
    draw();
  });

  // ======================= C1 light direction and metal glare (stamped cup) =======================
  function buildPart(N) {
    const h = new Float32Array(N * N), mask = new Uint8Array(N * N);
    const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = i / (N - 1), y = j / (N - 1), k = j * N + i;
      // the plate, slightly warped, with two holes
      const inPlate = x > 0.06 && x < 0.94 && y > 0.08 && y < 0.92 + 0.03 * Math.sin(x * 6);
      const hole = Math.hypot(x - 0.24, y - 0.2) < 0.035 || Math.hypot(x - 0.76, y - 0.8) < 0.035;
      if (!inPlate || hole) { mask[k] = hole ? 2 : 0; continue; }
      mask[k] = 1;
      let z = 0.012 * Math.sin(x * 9 + y * 4) + 0.01 * Math.sin(y * 11);
      const r = Math.hypot(x - 0.5, y - 0.48);
      z += 0.22 * (1 - sstep(0.24, 0.28, r));        // the drawn cup
      z -= 0.025 * Math.exp(-(((r - 0.3) / 0.02) ** 2));   // groove around the base
      z -= 0.04 * Math.exp(-((Math.hypot(x - 0.78, y - 0.3) / 0.03) ** 2)); // a small dent (the defect)
      // a scratch
      const t = clamp(((x - 0.2) * 0.6 + (y - 0.7) * 0.2) / 0.4, 0, 1), sx = 0.2 + 0.24 * t, sy = 0.7 + 0.08 * t;
      z -= 0.006 * Math.exp(-((Math.hypot(x - sx, y - sy) / 0.006) ** 2));
      h[k] = z;
    }
    const nx = new Float32Array(N * N), ny = new Float32Array(N * N), nz = new Float32Array(N * N), s = N / 1.0;
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      const k = j * N + i, gx = ((h[k + 1] - h[k - 1]) / 2) * s, gy = ((h[k + N] - h[k - N]) / 2) * s, l = Math.hypot(gx, gy, 1);
      nx[k] = -gx / l; ny[k] = -gy / l; nz[k] = 1 / l;
    }
    return { N, h, mask, nx, ny, nz };
  }
  mount('C1', root => {
    let az = 30, el = 35, auto = false, src = 'WL', pol = false, ana = 90;
    const N = 180, P = buildPart(N), off = document.createElement('canvas'); off.width = off.height = N;
    const octx = off.getContext('2d'), im = octx.createImageData(N, N);
    const sAz = slider('Lamp azimuth (degrees)', 0, 360, 1, az, v => { az = v; auto = false; tA.set(false); S.redraw(); });
    const tA = toggle('Lamp orbits automatically', auto, v => { auto = v; if(v) S.playing = true; S.syncLabel(); S.redraw(); });
    const sEl = slider('Lamp elevation (degrees)', 8, 85, 1, el, v => { el = v; S.redraw(); });
    const sS = seg('Source', [['WL', 'White light'], [470, '470 nm'], [505, '505 nm'], [630, '630 nm'], [850, '850 nm']], src, v => { src = v; S.redraw(); upd(); });
    const sP = seg('Polarizer in front of lamp', [[false, 'Off'], [true, 'On']], pol, v => { pol = v; S.redraw(); upd(); });
    const sAn = slider('Analyzer (degrees)', 0, 90, 1, ana, v => { ana = v; S.redraw(); });
    root.append(row(sAz, tA, sEl), row(sS.el, sP.el, sAn));
    const note = $('p', { class: 'note' });
    const S = stage(root, w => Math.round(Math.min(w * 0.62, 420)), (ctx, W, H, t, dt) => {
      if (auto) { az = (az + dt * 40) % 360; sAz.set(Math.round(az)); }
      const L = [Math.cos(rad(el)) * Math.cos(rad(az)), Math.cos(rad(el)) * Math.sin(rad(az)), Math.sin(rad(el))];
            const col = src === 'WL' ? [255, 250, 240] : src > 750 ? [235, 235, 235] : lightRGB(src);
      // polarised light: the analyzer passes cos^2 of the specular glare (kept polarised) and half of the diffuse light
      const kSpec = pol ? Math.cos(rad(ana)) ** 2 * 0.95 + 0.05 : 0.5, kDiff = 0.5;
      const D = im.data;
      for (let k = 0; k < N * N; k++) {
        const m = P.mask[k], o = 4 * k; let v;
        if (m === 0 || m === 2) { // the table under the part: matte
          v = 0.55 * Math.max(0, L[2]) * 0.6 + 0.08; D[o] = col[0] * v * 0.9; D[o + 1] = col[1] * v * 0.9; D[o + 2] = col[2] * v * 0.9; D[o + 3] = 255; continue;
        }
        // camera above the centre: the view direction changes across the part, so the glare moves with the lamp
        const px = (k % N) / N - 0.5, py = Math.floor(k / N) / N - 0.5, vl = Math.hypot(px, py, 1.6), V0 = -px / vl, V1 = -py / vl, V2 = 1.6 / vl;
        let h0 = L[0] + V0, h1 = L[1] + V1, h2 = L[2] + V2; const hn = Math.hypot(h0, h1, h2); h0 /= hn; h1 /= hn; h2 /= hn;
        const nl = P.nx[k] * L[0] + P.ny[k] * L[1] + P.nz[k] * L[2], nh = Math.max(0, P.nx[k] * h0 + P.ny[k] * h1 + P.nz[k] * h2);
        v = kDiff * 0.5 * Math.max(0, nl) + kSpec * (1.6 * Math.pow(nh, 60) + 0.5 * Math.pow(nh, 8)) + 0.04;
        v = Math.min(1.2, v);
        D[o] = Math.min(255, col[0] * v); D[o + 1] = Math.min(255, col[1] * v); D[o + 2] = Math.min(255, col[2] * v); D[o + 3] = 255;
      }
      octx.putImageData(im, 0, 0);
      const side = Math.min(H, W * 0.62), ox = (W - side) / 2 - (W > 560 ? W * 0.12 : 0);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(off, ox, 0, side, side);
      // Fixed target marker: follows the dent position, not the moving illumination.
      const dentX = ox + side * 0.78, dentY = side * 0.30;
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dentX, dentY, side * 0.047, 0, Math.PI * 2); ctx.stroke();
      text(ctx, 'Check the dent', dentX, dentY - side * 0.047 - 8, { align: 'center', size: 12, color: '#fbbf24' });
      // light direction marker
      const cx = ox + side / 2, cy = side / 2, rr = side / 2 - 12, lx = cx + rr * Math.cos(rad(az)), ly = cy + rr * Math.sin(rad(az));
      ctx.fillStyle = rgba(col); ctx.beginPath(); ctx.arc(lx, ly, 7, 0, 7); ctx.fill();
      arrow(ctx, lx, ly, lx + (cx - lx) * 0.18, ly + (cy - ly) * 0.18, rgba(col, 0.8), 2, 7);
      // labels on the right
      if (W > 560) {
        const tx = ox + side + 22;
        text(ctx, (pol ? 'P' : 'U') + (src === 'WL' ? 'WL' : 'ML'), tx, 30, { bold: true, size: 20, color: '#fbbf24' });
        text(ctx, 'Circle: dent, upper right', tx, 62, { size: 12.5 });
        text(ctx, 'Scratch: lower left', tx, 80, { size: 12.5 });
        text(ctx, 'As the lamp orbits, bright', tx, 110, { size: 12.5, color: '#94a3b8' });
        text(ctx, 'spots and dark areas move', tx, 128, { size: 12.5, color: '#94a3b8' });
      }
    });
    function upd() {
      sAn.querySelector('input').disabled = !pol;
      note.textContent = 'This surface is a cup shape built in code to show how the light direction relates to the surface orientation. Move the lamp and watch the glare: when the light direction, the surface orientation or the camera position changes, the bright and dark areas change too, and the contrast of a defect can increase or decrease. Changing the wavelength only changes the displayed color; reflectance as a function of wavelength is not computed.'
        + (pol ? ' This figure uses a simplified reflection model that keeps the polarization direction: it is darker with the analyzer at 90° and brighter at 0°. Watch which details become clearer when glare is reduced, and which become darker instead.' : ' Set "Polarizer in front of lamp" to "On", then rotate the analyzer and compare the bright areas and the contrast near the defect.')
        + (src !== 'WL' && src > 750 ? ' Near-infrared light is invisible to the eye; it is shown here as the grayscale a camera would capture.' : '');
    }
    root.append(note); upd();
    root.querySelectorAll('.lz-playbar button').forEach(button => button.addEventListener('click', () => { if(S.playing) { auto = true; tA.set(true); S.redraw(); } }));
  });

  // ======================= C2 how a colour camera records colour =======================
  check('C2', 'At 470 nm, the blue filter response is about 82% (paper, Section IV)', () => ({ expected: 0.82, actual: resp('B', 470), tol: 0.03 }));
  check('C2', 'At 470 nm, the red filter response is about 3%', () => ({ expected: 0.03, actual: resp('R', 470), tol: 0.02 }));
  mount('C2', root => {
    let src = 470;
    const parts = [];
    const quick = seg('Source', [['WL', 'White light'], [470, '470 nm'], [505, '505 nm'], [590, '590 nm'], [630, '630 nm'], [850, '850 nm'], [940, '940 nm']], src, v => { src = v; if (v !== 'WL') sl.set(v); upd(); });
    const sl = slider('Or drag the wavelength (nm)', 400, 1000, 5, 470, v => { src = v; quick.set(-1); upd(); });
    root.append(row(quick.el), row(sl));
    const read = () => {
      if (src !== 'WL') return { R: resp('R', src), G: resp('G', src), B: resp('B', src) };
      let s = 0; const o = { R: 0, G: 0, B: 0 };
      for (let l = 400; l <= 750; l += 2) { const e = whiteLED(l); s += e; ['R', 'G', 'B'].forEach(c => (o[c] += e * resp(c, l))); }
      ['R', 'G', 'B'].forEach(c => (o[c] = (o[c] / s) * 2.2)); return o;
    };
    const note = $('p', { class: 'note' });
    const S = stage(root, w => (w < 560 ? 470 : 280), (ctx, W, H, t, dt, still) => {
      const narrow = W < 560, r = read(), gx = narrow ? W / 2 - 96 : 30, gy = narrow ? 50 : 60, cs = 32, n = 6;
      const CC = { R: [248, 113, 113], G: [74, 222, 128], B: [96, 165, 250] }, chOf = (i, j) => (j % 2 === 0 ? (i % 2 === 0 ? 'R' : 'G') : i % 2 === 0 ? 'G' : 'B');
      // photons falling on the sensor
      if (!still && Math.random() < dt * 30) parts.push({ x: gx + Math.random() * cs * n, y: gy - 46, l: src === 'WL' ? 420 + Math.random() * 300 : src });
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.y += dt * 110; if (p.y > gy) { parts.splice(i, 1); continue; } const c = wlRGB(p.l); ctx.fillStyle = c ? rgba(c) : 'rgba(148,163,184,.7)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill(); }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const c = chOf(i, j), v = clamp(r[c], 0, 1), pulse = 0.85 + 0.15 * Math.sin(t * 6 + i + j);
        ctx.fillStyle = rgba(CC[c], 0.12 + 0.88 * v * pulse); ctx.fillRect(gx + i * cs + 1, gy + j * cs + 1, cs - 2, cs - 2);
        text(ctx, c, gx + i * cs + cs / 2, gy + j * cs + cs / 2 + 4, { align: 'center', size: 11, color: v > 0.5 ? '#0f1419' : '#cbd5e1' });
      }
      text(ctx, 'Bayer pattern: one color per cell', gx, gy + n * cs + 20, { size: 12, color: '#94a3b8' });
      // response curves
      const x0 = narrow ? 40 : 290, x1 = W - 16, y0 = narrow ? 300 : 30, y1 = H - 34, X = l => x0 + ((l - 400) / 600) * (x1 - x0), Y = v => y1 - v * (y1 - y0);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      [400, 500, 600, 700, 800, 900, 1000].forEach(l => text(ctx, String(l), X(l), y1 + 14, { align: 'center', size: 11, color: '#94a3b8' }));
      ['R', 'G', 'B'].forEach(c => { ctx.strokeStyle = rgba(CC[c]); ctx.lineWidth = 2; ctx.beginPath(); for (let l = 400; l <= 1000; l += 4) { const y = Y(resp(c, l)); l === 400 ? ctx.moveTo(X(l), y) : ctx.lineTo(X(l), y); } ctx.stroke(); });
      text(ctx, 'Filter response', x0 + 6, y0 + 2, { size: 12, color: '#e2e8f0' });
      [0,0.5,1].forEach(v=>text(ctx,Math.round(v*100)+'%',x0-8,Y(v)+4,{align:'right',size:10,color:'#94a3b8'}));
      ['R','G','B'].forEach((c,i)=>text(ctx,c,x1-90+i*30,y0+2,{size:12,bold:true,color:rgba(CC[c])}));
      text(ctx,'Wavelength (nm)',x1,y1+30,{align:'right',size:11,color:'#94a3b8'});
      if (src !== 'WL') { ctx.strokeStyle = '#fff'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(src), y0); ctx.lineTo(X(src), y1); ctx.stroke(); ctx.setLineDash([]); ['R', 'G', 'B'].forEach(c => { ctx.fillStyle = rgba(CC[c]); ctx.beginPath(); ctx.arc(X(src), Y(resp(c, src)), 5, 0, 7); ctx.fill(); }); }
      else { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(X(400), y0, X(750) - X(400), y1 - y0); }
    });
    function upd() {
      const r = read(), p = c => Math.round(100 * Math.min(1, r[c])) + '%';
      note.textContent = `${src === 'WL' ? 'White light' : src + ' nm'}: R ${p('R')}, G ${p('G')}, B ${p('B')}. `
        + (src === 470 ? 'The R response is very low, so the paper does not keep the R channel for this illumination (Section IV).' : src !== 'WL' && src > 750 ? 'In the near-infrared, the paper uses only the R channel (Table II).' : 'Channels with too low a response have relatively high noise, so the paper does not use them.')
        + ' The curves are calibrated to the 470 nm values in the paper; their shape is a simplified model.';
      S.redraw();
    }
    root.append(note); upd();
  });

  // ======================= D1 stacking photos into a cube (real data) =======================
  function bandImage(k, b) {
    const d = HSI.defects[k], key = `_u${k}`;
    if (!d[key]) { const bin = atob(d.b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); d[key] = u; }
    return { H: d.H, W: d.W, v: d[key].subarray(b * d.H * d.W, (b + 1) * d.H * d.W) };
  }
  function cubeSpectrum(k, x, y) { const d = HSI.defects[k], N = d.H * d.W; bandImage(k, 0); const u = d[`_u${k}`]; return HSI.bands.map((_, b) => u[b * N + y * d.W + x]); }
  const PICKS = { 1: [[88, 82], [200, 140]], 2: [[35, 77], [180, 40]], 3: [[100, 73], [150, 110]] };   // defect centre, background
  mount('D1', root => {
    let k = 1, stacked = true, picks = PICKS[1].map(p => p.slice()), selected = 0, active = 0;
    const sD = seg('Defect', [[1, 'Defect I'], [2, 'Defect II'], [3, 'Defect III']], k, v => { k = v; picks = PICKS[v].map(p => p.slice()); build(); });
    const tS = toggle('Stacked view', stacked, v => { stacked = v; layout(); });
    const pickMode = seg('Click the image to set', [[0, 'Yellow sample point'], [1, 'Blue sample point']], selected, v => { selected = v; updatePreview(); });
    const reset = $('button', { type: 'button', class: 'lz-tog', text: 'Reset to default defect and background positions' });
    reset.addEventListener('click', () => { picks = PICKS[k].map(p => p.slice()); marks(); updatePreview(); plotS.redraw(); });
    root.append(row(sD.el, tS), row(pickMode.el, reset));
    root.append($('p',{class:'lz-observe',text:'What to look for: '+LESSON_HINTS['demo-D1']}));
    const box = $('div', { class: 'lz-cube3d' }), plotWrap = $('div');
    const preview = $('canvas', { class: 'lz-pixel-preview', tabindex: '0', role: 'img', 'aria-label': 'Click the image to set a sample point; you can also move the selected point with the arrow keys' });
    const layerSelect = $('select', { 'aria-label': 'Current image' });
    HSI.bands.forEach((name, b) => layerSelect.append($('option', { value: b, text: `${b + 1} / 15: ${name}` })));
    layerSelect.addEventListener('change', () => { active = +layerSelect.value; if (plotS) { plotS.playing = false; plotS.t = active / 2; plotS.syncLabel(); } updatePreview(); plotS.redraw(); });
    const readout = $('p', { class: 'lz-pixel-values' });
    const workspace = $('div', { class: 'lz-cube-workspace' },
      $('div', { class: 'lz-cube-panel' }, $('h4', { text: 'Same position, 15 image components' }), box),
      $('div', { class: 'lz-preview-panel' }, $('h4', { text: 'Pick one image and read the same pixel' }), row($('label', {}, 'Current image ', layerSelect)), preview, readout));
    root.append(workspace, plotWrap, $('p', { class: 'note', text: 'First choose the yellow or blue sample point, then click the image on the right. The curve below updates with the brightness of this position across the 15 images; during playback, the marker moves through the components in order. The horizontal axis is the shooting condition, not continuous wavelength.' }));
    let cvs = [], plotS, lastActive = -1;
    function movePoint(x, y) {
      const d = HSI.defects[k]; picks[selected] = [clamp(x, 0, d.W - 1), clamp(y, 0, d.H - 1)];
      marks(); updatePreview(); plotS.redraw();
    }
    preview.addEventListener('click', ev => {
      const r = preview.getBoundingClientRect(), d = HSI.defects[k];
      movePoint(Math.floor((ev.clientX - r.left) / r.width * d.W), Math.floor((ev.clientY - r.top) / r.height * d.H));
    });
    preview.addEventListener('keydown', ev => {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
      if (delta) { ev.preventDefault(); movePoint(picks[selected][0] + delta[0], picks[selected][1] + delta[1]); }
    });
    function build() {
      box.innerHTML = ''; cvs = [];
      HSI.bands.forEach((name, b) => {
        const I = bandImage(k, b), c = $('canvas', { width: I.W, height: I.H });
        const cx = c.getContext('2d'), id = cx.createImageData(I.W, I.H);
        for (let i = 0; i < I.v.length; i++) { const o = 4 * i; id.data[o] = id.data[o + 1] = id.data[o + 2] = I.v[i]; id.data[o + 3] = 255; }
        cx.putImageData(id, 0, 0); c._base = id;
        const f = $('figure', { class: 'lz-layer', style: `--i:${b}`, tabindex: '0', role: 'button', 'aria-label': `View image ${b + 1}: ${name}` }, c, $('figcaption', { text: name }));
        const choose = () => { active = b; if (plotS) { plotS.playing = false; plotS.t = active / 2; plotS.syncLabel(); } updatePreview(); if (plotS) plotS.redraw(); };
        f.addEventListener('click', choose);
        f.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); choose(); } });
        box.append(f); cvs.push(c);
      });
      layout(); marks(); updatePreview(); if (plotS) plotS.redraw();
    }
    function layout() {
      box.classList.toggle('stacked', stacked);
      if (!stacked) { box.style.height = ''; return; }
      const d = HSI.defects[k], w = Math.min(box.clientWidth - 84, 300), h = w * d.H / d.W;
      box.style.setProperty('--lw', Math.max(120, w) + 'px'); box.style.height = h + 14 * 7 + 32 + 'px';
    }
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (stacked) layout(); }).observe(box);
    function marks() {
      cvs.forEach(c => {
        const cx = c.getContext('2d'); cx.putImageData(c._base, 0, 0);
        picks.forEach(([x, y], j) => { cx.strokeStyle = j ? '#60a5fa' : '#fbbf24'; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, y, 6, 0, 7); cx.stroke(); });
      });
    }
    function updatePreview() {
      if (!cvs.length) return;
      const d = HSI.defects[k], c = cvs[active]; preview.width = d.W; preview.height = d.H;
      const cx = preview.getContext('2d'); cx.putImageData(c._base, 0, 0);
      picks.forEach(([x, y], j) => {
        cx.strokeStyle = j ? '#60a5fa' : '#fbbf24'; cx.lineWidth = j === selected ? 3 : 2;
        cx.beginPath(); cx.arc(x, y, 6, 0, 7); cx.stroke();
        cx.beginPath(); cx.moveTo(x - 10, y); cx.lineTo(x + 10, y); cx.moveTo(x, y - 10); cx.lineTo(x, y + 10); cx.stroke();
      });
      layerSelect.value = active;
      Array.from(box.children).forEach((f, b) => f.classList.toggle('is-active', b === active));
      readout.innerHTML = picks.map(([x, y], j) => `<span class="${j ? 'blue' : 'yellow'}">${j ? 'Blue' : 'Yellow'} (${x}, ${y}) brightness ${cubeSpectrum(k, x, y)[active]}</span>`).join('');
      preview.setAttribute('aria-label', `${HSI.bands[active]}; setting the ${selected ? 'blue' : 'yellow'} point, move it with the arrow keys`);
    }
    build();
    plotS = stage(plotWrap, 255, (ctx, W, H, t, dt, still) => {
      if (!still) active = Math.floor(t * 2) % HSI.bands.length;
      if (lastActive !== active) { lastActive = active; updatePreview(); }
      const L = 44, R = W - 24, T = 30, B = H - 56, n = HSI.bands.length, X = i => L + i / (n - 1) * (R - L), Y = v => B - v / 255 * (B - T);
      ctx.fillStyle = 'rgba(103,232,249,.09)'; ctx.fillRect(X(active) - 10, T, 20, B - T);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, B); ctx.lineTo(R, B); ctx.stroke();
      [0, 128, 255].forEach(v => text(ctx, String(v), L - 6, Y(v) + 4, { align: 'right', size: 11, color: '#94a3b8' }));
      HSI.bands.forEach((nm, i) => { if ((R - L) / 15 < 34 && i % 2 && i !== active) return; ctx.save(); ctx.translate(X(i), B + 12); ctx.rotate(-0.5); text(ctx, nm, 0, 0, { align: 'right', size: 11, color: i === active ? '#67e8f9' : '#94a3b8' }); ctx.restore(); });
      picks.forEach(([x, y], j) => {
        const values = cubeSpectrum(k, x, y), col = j ? '#60a5fa' : '#fbbf24';
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
        values.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))); ctx.stroke(); ctx.fillStyle = col;
        values.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i), Y(v), i === active ? 5 : 2.5, 0, 7); ctx.fill(); });
      });
      text(ctx, 'Brightness (0–255)', L, 16, { size: 12, color: '#94a3b8' });
      text(ctx, `Current: ${active + 1} / 15 - ${HSI.bands[active]}`, R, 16, { align: 'right', size: 12, color: '#67e8f9' });
    });
    plotS.playing = false; plotS.syncLabel(); plotS.redraw();
  });


  // ======================= D2 SAM: the angle between two spectra =======================
  const samAngle = (a, b) => { let d = 0, na = 0, nb = 0; a.forEach((v, i) => { d += v * b[i]; na += v * v; nb += b[i] * b[i]; }); return (Math.acos(clamp(d / Math.sqrt(na * nb), -1, 1)) * 180) / Math.PI; };
  check('D2', 'Scaling the whole spectrum by 0.5 gives an angle of 0° with the original', () => ({ expected: 0, actual: samAngle([3, 1, 2], [1.5, 0.5, 1]), tol: 1e-6 }));
  check('D2', 'The angle between (1,0) and (1,1) = 45°', () => ({ expected: 45, actual: samAngle([1, 0], [1, 1]), tol: 1e-9 }));
  mount('D2', root => {
    let scale = 1, diff = 0, pulse = false;
    const cases = seg('Try an example first', [['same', 'Same as background'], ['brighter', 'Just 2x brighter'], ['different', 'Brightness ratio changed']], 'same', v => {
      pulse = false; tP.set(false); S.playing = false; S.syncLabel();
      diff = v === 'different' ? (Math.atan2(100, 100) - Math.atan2(50, 100)) * 180 / Math.PI : 0;
      scale = v === 'brighter' ? 2 : v === 'different' ? Math.hypot(100, 100) / Math.hypot(100, 50) : 1;
      sS.set(scale); sD.set(diff); S.redraw();
    });
    const sS = slider('Multiply all brightness by', 0.3, 2.2, 0.01, scale, v => { scale = v; pulse = false; tP.set(false); cases.set(null); }, v => v.toFixed(2) + ' ×');
    const tP = toggle('Auto brighten and dim', pulse, v => { pulse = v; if(v) { cases.set(null); S.playing = true; } S.syncLabel(); S.redraw(); });
    const sD = slider('Change the brightness ratio (angle)', 0, 60, 1, diff, v => { diff = v; cases.set(null); }, v => v.toFixed(1) + '°');
    root.append(row(cases.el), row(sS, tP, sD));
    const realBox = $('p', { class: 'note' }), conclusion = $('p', {class:'lz-observe'});
    const S = stage(root, w => (w < 560 ? 520 : 330), (ctx, W, H, t) => {
      if (pulse) { scale = 0.95 + 0.6 * Math.sin(t * 1.4); sS.set(+scale.toFixed(2)); }
      const ref = [100, 50], ang0 = Math.atan2(ref[1], ref[0]), a1 = ang0 + rad(diff), len = Math.hypot(...ref);
      const x = [Math.cos(a1) * len * scale, Math.sin(a1) * len * scale];
      conclusion.textContent = diff < 0.001
        ? 'Same ratio: even if everything gets brighter, SAM still sees it as similar to the background.'
        : 'Ratio changed: SAM sees it as different from the background, so it can be flagged as a suspected defect.';
      const narrow = W < 560, O = [narrow ? 40 : 50, narrow ? 260 : H - 40], sz = narrow ? Math.min((W - 70) / 2.8, 90) : (H - 80) / 2.8;
      const P = v => [O[0] + v[0] / 100 * sz, O[1] - v[1] / 100 * sz];
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(O[0], O[1] - sz * 2.8); ctx.lineTo(O[0], O[1]); ctx.lineTo(O[0] + sz * 2.8, O[1]); ctx.stroke();
      text(ctx, 'Brightness under white light →', O[0] + sz * 2.8, O[1] + 18, { align: 'right', size: 11, color: '#94a3b8' });
      text(ctx, 'Brightness under monochromatic light', O[0] + 4, O[1] - sz * 2.8 - 6, { size: 11, color: '#94a3b8' });
      const pr = P(ref), px = P(x);
      arrow(ctx, O[0], O[1], px[0], px[1], '#fbbf24', 5, 12);
      arrow(ctx, O[0], O[1], pr[0], pr[1], '#60a5fa', 2, 9);
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(O[0], O[1], 46, -a1, -ang0, diff < 0); ctx.stroke();
      text(ctx, `Angle ${diff.toFixed(1)}°`, O[0] + 52 * Math.cos((ang0 + a1) / 2) + 6, O[1] - 52 * Math.sin((ang0 + a1) / 2), { size: 13, bold: true, color: '#e2e8f0' });
      text(ctx, 'Blue: background', O[0], 18, { size: 12, color: '#60a5fa' });
      text(ctx, 'Yellow: pixel to check', O[0] + 120, 18, { size: 12, color: '#fbbf24' });
      const bx = narrow ? 40 : W * 0.6, by = narrow ? 300 : 55, bw = narrow ? W - 60 : W * 0.36, bh = narrow ? 160 : H - 115;
      text(ctx, 'The same brightness values as bars', bx, narrow ? by - 8 : by - 25, { size: 12, color: '#94a3b8' });
      const Yb = v => by + bh - (v / 260) * bh, gw = bw / 2;
      [ref, x].forEach((v, j) => v.forEach((val, i) => { ctx.fillStyle = j ? '#fbbf24' : '#60a5fa'; const x0 = bx + i * gw + 10 + j * (gw / 2 - 8); ctx.fillRect(x0, Yb(val), gw / 2 - 14, by + bh - Yb(val)); text(ctx, val.toFixed(0), x0 + (gw / 2 - 14) / 2, Yb(val) - 7, {align:'center',size:12,color:j ? '#fbbf24' : '#60a5fa'}); }));
      text(ctx, 'White light', bx + gw / 2, by + bh + 16, { align: 'center', size: 11, color: '#94a3b8' });
      text(ctx, 'Monochromatic', bx + gw * 1.5, by + bh + 16, { align: 'center', size: 11, color: '#94a3b8' });
      text(ctx, `Similarity score ${Math.cos(rad(diff)).toFixed(3)}`, bx, by + bh + 34, { size: 12.5, color: '#e2e8f0' }); text(ctx, 'Closer to 1 = more background-like', bx, by + bh + 50, { size: 12, color: '#94a3b8' });
    });
    root.insertBefore(conclusion, root.querySelector('.lz-playbar'));
    root.append($('p', {class:'note', text:'Try it: first raise all the brightness together, then change the brightness ratio. The former only changes the arrow length; the latter changes the angle and the similarity score.'}));
    // the same on real pixels: defect centre and background against the whole-image mean spectrum
    const k = 1, d = HSI.defects[k], N = d.H * d.W; bandImage(k, 0);
    const u = d[`_u${k}`], L = HSI.bands.length, mean = new Array(L).fill(0);
    for (let b = 0; b < L; b++) { let s = 0; for (let i = 0; i < N; i++) s += u[b * N + i]; mean[b] = s / N; }
    const sc = cubeSpectrum(k, ...PICKS[1][0]), sb = cubeSpectrum(k, ...PICKS[1][1]);
    const aC = samAngle(sc, mean), aB = samAngle(sb, mean), aH = samAngle(sc.map(v => v * 0.5), mean);
    realBox.textContent = `Comparison on the 15 images: using the mean spectrum of the whole image as the reference, the angle at the defect center is ${aC.toFixed(1)}° and at a background pixel ${aB.toFixed(1)}°. When the defect pixel is dimmed by half, the angle is still ${aH.toFixed(1)}°, so SAM keeps this difference.`;
    root.append(realBox); void S;
    root.querySelectorAll('.lz-playbar button').forEach(button => button.addEventListener('click', () => { if(S.playing) { pulse = true; tP.set(true); cases.set(null); S.redraw(); } }));
  });
})();
