/* Live formula cards for talk.html.
 * Each <div class="keyeq" data-live="name"> gets one row of controls and one line that shows the formula with the
 * current numbers plugged in, so the audience sees how each symbol changes the result.
 * Real data (Defect I, 12 monochromatic components, SAM with the whole-cube mean) comes from PR.algorithmData.
 */
(function () {
  'use strict';
  const $ = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => k === 'text' ? (e.textContent = v) : e.setAttribute(k, v)); kids.forEach(k => e.append(k)); return e; };
  const f = (v, d = 2) => Number(v).toFixed(d);
  const ML12 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  function slider(label, min, max, step, value) {
    const input = $('input', { type: 'range', min, max, step, value, 'aria-label': label });
    const out = $('output', { text: value });
    const wrap = $('label', { class: 'live-ctl' }, $('span', { text: label }), input, out);
    wrap.get = () => +input.value;
    input.addEventListener('input', () => { out.textContent = input.value; });
    return wrap;
  }
  function buttons(options, value) {
    const wrap = $('div', { class: 'live-seg' });
    let cur = value;
    options.forEach(([v, label]) => {
      const b = $('button', { type: 'button', text: label, 'aria-pressed': String(v === cur) });
      b.addEventListener('click', () => { cur = v; wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); wrap.dispatchEvent(new Event('input', { bubbles: true })); });
      wrap.append(b);
    });
    wrap.get = () => cur;
    return wrap;
  }
  function mount(card, controls, compute) {
    const out = $('div', { class: 'live-out' });
    const box = $('div', { class: 'live' }, $('div', { class: 'live-row' }, ...controls), out);
    card.append(box);
    const draw = () => { out.innerHTML = PR.tex(compute(), true); };
    box.addEventListener('input', draw);
    draw();
  }

  const LIVE = {
    vector(card) {
      const A = PR.algorithmData, D = A.defect(1);
      const at = (x, y) => ML12.map(i => D.raw[i * D.N + y * D.W + x]);
      const pick = buttons([['dent', 'Dent pixel (88, 82)'], ['bg', 'Background pixel (200, 140)']], 'dent');
      mount(card, [pick], () => {
        const v = pick.get() === 'dent' ? at(88, 82) : at(200, 140);
        return String.raw`\ca{x} = [\,${v.join(',\\ ')}\,]^{T} \quad (L = 12)`;
      });
    },
    cube(card) {
      const pick = buttons([[3, 'Cube 1'], [9, 'Cube 2'], [12, 'Cube 3'], [36, 'Cube 4'], [60, 'Cube 5']], 12);
      mount(card, [pick], () => {
        const L = pick.get();
        return String.raw`170 \times 420 \times \cb{${L}} = ${(170 * 420 * L).toLocaleString('en')} \text{ numbers for Defect I}`;
      });
    },
    sam(card) {
      const x1 = slider('x₁', 0, 200, 1, 50), x2 = slider('x₂', 0, 200, 1, 100);
      mount(card, [$('span', { class: 'live-note', text: 's = [100, 50]' }), x1, x2], () => {
        const a = x1.get(), b = x2.get(), n = Math.hypot(a, b) || 1e-9, c = (100 * a + 50 * b) / (Math.hypot(100, 50) * n);
        const deg = Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
        return String.raw`\cos\cc{\theta} = \frac{100\cdot\ca{${a}} + 50\cdot\ca{${b}}}{111.8 \times ${f(n, 1)}} = ${f(c, 3)} \;\Rightarrow\; \cc{\theta} = ${f(deg, 1)}^\circ`;
      });
    },
    rates(card) {
      const A = PR.algorithmData, D = A.defect(1), s = A.score('SAM', 1, ML12, 't4');
      let P = 0, N = 0; for (let i = 0; i < D.N; i++) D.gt[i] ? P++ : N++;
      const eta = slider('threshold η', 0, 1, 0.005, 0.145);
      mount(card, [eta], () => {
        const t = eta.get(); let tp = 0, fp = 0;
        for (let i = 0; i < D.N; i++) if (s[i] >= t) D.gt[i] ? tp++ : fp++;
        return String.raw`\cb{P_D}(\ca{${f(t, 3)}}) = \frac{${tp}}{${P}} = ${f(100 * tp / P, 1)}\%, \qquad \cc{P_{FA}}(\ca{${f(t, 3)}}) = \frac{${fp}}{${N}} = ${f(100 * fp / N, 2)}\%`;
      });
    },
    roc(card) { LIVE.rates(card); },
    malus(card) {
      const d = slider('θ − φ (degrees)', 0, 90, 1, 30);
      mount(card, [d], () => {
        const a = d.get(), v = Math.cos(a * Math.PI / 180) ** 2;
        return String.raw`I / \cc{I_0} = \cos^{2}(\ca{${a}^\circ}) = ${f(v, 3)} = ${f(100 * v, 0)}\%`;
      });
    },
    sid(card) {
      const x1 = slider('x₁', 1, 200, 1, 50), x2 = slider('x₂', 1, 200, 1, 100);
      mount(card, [$('span', { class: 'live-note', text: 's = [100, 50]' }), x1, x2], () => {
        const a = x1.get(), b = x2.get(), p = [100 / 150, 50 / 150], q = [a / (a + b), b / (a + b)];
        const y = p.reduce((acc, pj, j) => acc + pj * Math.log(pj / q[j]) + q[j] * Math.log(q[j] / pj), 0);
        return String.raw`\ca{p} = [${f(p[0])},\ ${f(p[1])}],\ \cb{q} = [${f(q[0])},\ ${f(q[1])}] \;\Rightarrow\; y_{SID} = ${f(y, 3)}`;
      });
    },
    tau(card) {
      const x = [slider('x₁', 0, 200, 1, 90), slider('x₂', 0, 200, 1, 60), slider('x₃', 0, 200, 1, 30)];
      const s = [100, 50, 25];
      mount(card, [$('span', { class: 'live-note', text: 's = [100, 50, 25]' }), ...x], () => {
        const v = x.map(c => c.get()), pairs = [[0, 1], [0, 2], [1, 2]];
        const sg = pairs.map(([l, k]) => Math.sign((v[k] - v[l]) * (s[k] - s[l])));
        const tau = sg.reduce((a, b) => a + b, 0) / 3;
        return String.raw`y_{TAU} = \tfrac{2}{3\cdot 2}\big(${sg.map(z => (z > 0 ? '+1' : z < 0 ? '-1' : '0')).join(' ')}\big) = ${f(tau, 2)}`;
      });
    },
    rx(card) {
      const x1 = slider('x₁', 0, 200, 1, 130), x2 = slider('x₂', 0, 100, 1, 50);
      mount(card, [$('span', { class: 'live-note', text: 'μ = [100, 50], spread σ = [20, 10]' }), x1, x2], () => {
        const a = x1.get(), b = x2.get(), y = ((a - 100) / 20) ** 2 + ((b - 50) / 10) ** 2;
        return String.raw`y_{RX} = \Big(\tfrac{${a}-100}{20}\Big)^{2} + \Big(\tfrac{${b}-50}{10}\Big)^{2} = ${f(y, 2)}`;
      });
    },
    amf(card) { matchCard(card, false); },
    ace(card) { matchCard(card, true); },
  };
  // AMF / ACE on a 2-light toy: template s = [50, 100], background spread sigma = [20, 10] (diagonal covariance)
  function matchCard(card, ace) {
    const x1 = slider('x₁', 0, 200, 1, 60), x2 = slider('x₂', 0, 200, 1, 110);
    mount(card, [$('span', { class: 'live-note', text: 's = [50, 100], σ = [20, 10]' }), x1, x2], () => {
      const a = x1.get(), b = x2.get(), w = [1 / 400, 1 / 100];
      const sx = 50 * a * w[0] + 100 * b * w[1], ss = 2500 * w[0] + 10000 * w[1], xx = a * a * w[0] + b * b * w[1];
      return ace
        ? String.raw`y_{ACE} = \frac{${f(sx, 2)}^{2}}{${f(ss, 2)} \times ${f(xx, 2)}} = ${f(sx * sx / (ss * (xx || 1e-9)), 3)}`
        : String.raw`y_{AMF} = \frac{${f(sx, 2)}^{2}}{${f(ss, 2)}} = ${f(sx * sx / ss, 2)}`;
    });
  }

  document.querySelectorAll('.keyeq[data-live]').forEach(card => {
    try { LIVE[card.dataset.live] && LIVE[card.dataset.live](card); }
    catch (e) { (PR.errors || []).push('live formula ' + card.dataset.live + ': ' + e.message); }
  });
})();
