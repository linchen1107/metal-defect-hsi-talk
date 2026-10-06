/* Demos for Benmoussat, Spinnler, Guillaume 2012 — every knowledge point computes in the browser.
 * Real data: the 45 band images embedded in the paper's PDF (Table II, p.4), loaded from data.js.
 * The same computation in numpy is _work/src/reference.py; a few of its results are used as checks below. */
(function () {
  'use strict';
  const fmt = v => PR.fmt(v);
  const r2 = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

  // ---------------- data ----------------
  const BANDS = HSI.bands;                       // 15 unpolarized components, Table II order
  const DEF_NAMES = ['Defect I (dent, 2 mm)', 'Defect II (dent, 0.5 mm)', 'Defect III (scratch)'];
  const defOf = s => DEF_NAMES.indexOf(s) + 1;
  const CUBE_NAMES = ['Cube 1 (white light, 3 components)', 'Cube 3 (monochromatic light, 12 components)', 'Cube 1+3 (15 components)'];
  const CUBE_IDX = [[0, 1, 2], [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]];
  const cubeOf = s => CUBE_IDX[CUBE_NAMES.indexOf(s)];
  const TGT_NAMES = ['t1 defect center pixel', 't2 defect edge pixel', 't3 background pixel', 't4 mean spectrum of the whole cube'];
  const tgtOf = s => ['t1', 't2', 't3', 't4'][TGT_NAMES.indexOf(s)];
  // ground truth drawn by eye on the 505 nm G image (this run's annotation; the paper gives none)
  const GT = {
    1: [['ell', 88.7, 81.7, 43, 31], ['ell', 307.2, 79.7, 43, 32]],
    2: [['ell', 35.3, 76.7, 11, 9], ['ell', 318.7, 26.4, 13, 11]],
    3: [['line', [[0, 135], [20, 123], [40, 109], [60, 97.5], [80, 85.5], [100, 73.5], [120, 62.5], [140, 51.5], [160, 38], [180, 25.5], [200, 12.5], [220, 0], [230, -6]], 4]]
  };
  const TARGETS = { 1: { t1: [88, 82], t2: [88, 52], t3: [200, 140] }, 2: { t1: [35, 77], t2: [35, 68], t3: [180, 40] }, 3: { t1: [100, 73], t2: [100, 70], t3: [150, 110] } };

  const cache = {};
  function memo(key, f) { if (!(key in cache)) cache[key] = f(); return cache[key]; }

  function defect(k) {
    return memo('def' + k, () => {
      const d = HSI.defects[k], bin = atob(d.b64), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const N = d.H * d.W;
      return { H: d.H, W: d.W, N, L: u.length / N, raw: u, gt: gtMask(k, d.H, d.W, 0) };
    });
  }
  function gtMask(k, H, W, grow) {
    const m = new Uint8Array(H * W);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let inside = false;
      for (const s of GT[k]) {
        if (s[0] === 'ell') {
          const a = Math.max(1, s[3] + grow), b = Math.max(1, s[4] + grow);
          if (((x - s[1]) / a) ** 2 + ((y - s[2]) / b) ** 2 <= 1) inside = true;
        } else {
          const hw = Math.max(0.5, s[2] + grow), P = s[1];
          for (let i = 0; i + 1 < P.length && !inside; i++) {
            const [x0, y0] = P[i], [x1, y1] = P[i + 1], dx = x1 - x0, dy = y1 - y0;
            const u = Math.min(1, Math.max(0, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
            if ((x - x0 - u * dx) ** 2 + (y - y0 - u * dy) ** 2 <= hw * hw) inside = true;
          }
        }
      }
      m[y * W + x] = inside ? 1 : 0;
    }
    return m;
  }
  // pixel-major matrix N x L of the chosen components
  function pixels(k, idx) {
    return memo(`X${k}|${idx}`, () => {
      const D = defect(k), L = idx.length, X = new Float64Array(D.N * L);
      idx.forEach((b, j) => { const off = b * D.N; for (let i = 0; i < D.N; i++) X[i * L + j] = D.raw[off + i]; });
      return X;
    });
  }
  function meanCov(X, L, mask) {               // mask: only pixels with mask[i]===0 are used (null: all)
    const mu = new Float64Array(L), C = new Float64Array(L * L); let n = 0;
    const N = X.length / L;
    for (let i = 0; i < N; i++) { if (mask && mask[i]) continue; n++; for (let a = 0; a < L; a++) mu[a] += X[i * L + a]; }
    for (let a = 0; a < L; a++) mu[a] /= n;
    for (let i = 0; i < N; i++) {
      if (mask && mask[i]) continue;
      for (let a = 0; a < L; a++) { const da = X[i * L + a] - mu[a]; for (let b = a; b < L; b++) C[a * L + b] += da * (X[i * L + b] - mu[b]); }
    }
    let tr = 0;
    for (let a = 0; a < L; a++) for (let b = a; b < L; b++) { C[a * L + b] /= n; C[b * L + a] = C[a * L + b]; if (a === b) tr += C[a * L + a]; }
    for (let a = 0; a < L; a++) C[a * L + a] += 1e-6 * Math.max(tr, 1e-9) / L + 1e-9;   // a saturated band (Defect III, 880 nm) is constant
    return { mu, C, n };
  }
  function inv(C, L) {                          // Gauss-Jordan
    const A = Array.from({ length: L }, (_, i) => Array.from({ length: 2 * L }, (_, j) => (j < L ? C[i * L + j] : +(j - L === i))));
    for (let c = 0; c < L; c++) {
      let p = c; for (let r = c + 1; r < L; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      const v = A[c][c]; for (let j = 0; j < 2 * L; j++) A[c][j] /= v;
      for (let r = 0; r < L; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * L; j++) A[r][j] -= f * A[c][j]; }
    }
    const R = new Float64Array(L * L); for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) R[i * L + j] = A[i][L + j];
    return R;
  }
  function stats(k, idx) { return memo(`S${k}|${idx}`, () => { const L = idx.length, s = meanCov(pixels(k, idx), L, null); s.Ci = inv(s.C, L); return s; }); }
  function targetVec(k, idx, t, at) {
    const L = idx.length, X = pixels(k, idx), D = defect(k);
    if (t === 't4') return Array.from(stats(k, idx).mu);
    const [x, y] = at || TARGETS[k][t], i = y * D.W + x;
    return Array.from(X.subarray(i * L, i * L + L));
  }
  const quad = (u, M, v, L) => { let s = 0; for (let a = 0; a < L; a++) { let r = 0; for (let b = 0; b < L; b++) r += M[a * L + b] * v[b]; s += u[a] * r; } return s; };
  const dot = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);

  // ---------------- the six detectors, Eqs. (1)-(6) ----------------
  function detect(alg, k, idx, s) {
    const L = idx.length, X = pixels(k, idx), N = X.length / L, y = new Float64Array(N), st = stats(k, idx), Ci = st.Ci, mu = st.mu;
    const x = new Float64Array(L);
    if (alg === 'AMF' || alg === 'ACE') {
      const w = new Float64Array(L); for (let a = 0; a < L; a++) { let r = 0; for (let b = 0; b < L; b++) r += Ci[a * L + b] * s[b]; w[a] = r; }
      const ss = dot(s, w);
      for (let i = 0; i < N; i++) {
        let num = 0; for (let a = 0; a < L; a++) { x[a] = X[i * L + a]; num += w[a] * x[a]; }
        num *= num;
        y[i] = alg === 'AMF' ? num / ss : num / (ss * quad(x, Ci, x, L) + 1e-12);
      }
    } else if (alg === 'RX') {
      for (let i = 0; i < N; i++) { for (let a = 0; a < L; a++) x[a] = X[i * L + a] - mu[a]; y[i] = quad(x, Ci, x, L); }
    } else if (alg === 'SAM') {
      const ns = Math.sqrt(dot(s, s));
      for (let i = 0; i < N; i++) { let d = 0, n = 0; for (let a = 0; a < L; a++) { const v = X[i * L + a]; d += v * s[a]; n += v * v; } y[i] = d / (ns * Math.sqrt(n) + 1e-12); }
    } else if (alg === 'SID') {
      let S = 0; for (let a = 0; a < L; a++) S += s[a] + 1e-6;
      const p = s.map(v => (v + 1e-6) / S);
      for (let i = 0; i < N; i++) {
        let Q = 0; for (let a = 0; a < L; a++) Q += X[i * L + a] + 1e-6;
        let r = 0; for (let a = 0; a < L; a++) { const q = (X[i * L + a] + 1e-6) / Q; r += p[a] * Math.log(p[a] / q) + q * Math.log(q / p[a]); }
        y[i] = r;
      }
    } else if (alg === 'TAU') {
      for (let i = 0; i < N; i++) {
        let acc = 0;
        for (let l = 0; l < L - 1; l++) for (let m = l + 1; m < L; m++) acc += Math.sign((X[i * L + m] - X[i * L + l]) * (s[m] - s[l]));
        y[i] = (2 * acc) / (L * (L - 1));
      }
    }
    return y;
  }
  // normalise to [0,1]; for t3/t4 the paper takes the complement-to-one (Section IV). SID is a distance, so its
  // complement goes the other way (this run's reading of Section IV, stated on the page).
  function orient(alg, y, t, complement) {
    let lo = Infinity, hi = -Infinity; for (const v of y) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const z = new Float64Array(y.length), sc = 1 / (hi - lo + 1e-12);
    let flip = false;
    if (alg !== 'RX') { const similar = alg !== 'SID'; flip = ((t === 't3' || t === 't4') === similar); }
    if (complement === false) flip = false;
    for (let i = 0; i < y.length; i++) { const v = (y[i] - lo) * sc; z[i] = flip ? 1 - v : v; }
    return z;
  }
  function score(alg, k, idx, t) {
    return memo(`Y${alg}|${k}|${idx}|${t}`, () => orient(alg, detect(alg, k, idx, alg === 'RX' ? null : targetVec(k, idx, t)), t));
  }
  // PD and PFA for eta = 0, step, 2 step, ... 1 (Section V: step 1e-3)
  function sweep(z, gt, step = 1e-3) {
    const nb = Math.round(1 / step), hp = new Float64Array(nb + 2), hn = new Float64Array(nb + 2);
    let P = 0, Nn = 0;
    for (let i = 0; i < z.length; i++) { const b = Math.min(nb, Math.floor(z[i] / step + 1e-9)); if (gt[i]) { hp[b]++; P++; } else { hn[b]++; Nn++; } }
    const pd = new Float64Array(nb + 1), pfa = new Float64Array(nb + 1);
    let cp = 0, cn = 0;
    for (let b = nb; b >= 0; b--) { cp += hp[b]; cn += hn[b]; pd[b] = cp / P; pfa[b] = cn / Nn; }
    return { pd, pfa, step, P, N: Nn };
  }
  function farAt(z, gt, gdr = 0.9, step = 1e-3) {
    const s = sweep(z, gt, step); let b = 0;
    while (b + 1 < s.pd.length && s.pd[b + 1] >= gdr) b++;
    return { eta: b * step, far: s.pfa[b], pd: s.pd[b], P: s.P, N: s.N, tp: Math.round(s.pd[b] * s.P), fp: Math.round(s.pfa[b] * s.N) };
  }
  function rocSeries(z, gt, name, color, dashed) {
    const s = sweep(z, gt), x = [], y = [];
    for (let b = 0; b < s.pd.length; b++) { const f = Math.max(s.pfa[b], 1e-5); x.push(Math.log10(f)); y.push(s.pd[b]); }
    return { name, x, y, color, dashed };
  }
  function heat(k, z, title) {                   // downsampled map for display
    const D = defect(k), f = Math.ceil(D.W / 120), rows = [];
    for (let y = 0; y + f <= D.H; y += f) { const row = []; for (let x = 0; x + f <= D.W; x += f) { let s = 0; for (let a = 0; a < f; a++) for (let b = 0; b < f; b++) s += z[(y + a) * D.W + x + b]; row.push(s / (f * f)); } rows.push(row); }
    return { title, type: 'heatmap', z: rows, height: Math.max(170, Math.min(300, 40 + 330 * D.H / D.W)) };
  }
  const pct = v => r2(100 * v, 2) + '%';
  const vecStr = (v, n = 4) => v.slice(0, n).map(a => r2(a, 1)).join(', ') + (v.length > n ? ', …' : '');
  const defCtl = (v = DEF_NAMES[2]) => ({ key: 'def', label: 'Defect type', options: DEF_NAMES, value: v });
  const cubeCtl = (v = CUBE_NAMES[1]) => ({ key: 'cube', label: 'Cube', options: CUBE_NAMES, value: v });
  const tgtCtl = (v = TGT_NAMES[3]) => ({ key: 'tgt', label: 'Reference spectrum', options: TGT_NAMES, value: v });
  const median = a => { const s = Array.from(a).sort((p, q) => p - q); return s[s.length >> 1]; };
  // a pixel inside the first defect, used for the step-by-step formula animations
  function samplePixel(k, idx) { const [x, y] = TARGETS[k].t1, D = defect(k), L = idx.length, i = y * D.W + x; return Array.from(pixels(k, idx).subarray(i * L, i * L + L)); }

  PR.algorithmData = {defect, pixels, score, stats, targetVec, farAt, detect, sweep};

  PR.terms({
    'metal part': 'A part made of metal, for example a flat plate that has been stamped or machined.',
    'PDF': 'The electronic file format of the paper; this paper embeds the original measurement photos at full resolution in the file.',
    'dent': 'A region where the surface is pressed inward. It has depth, so it is a three-dimensional (3D) defect.',
    'scratch': 'A long, thin, shallow groove cut into the surface.',
    'LED': 'Light-emitting diode, a small, energy-efficient light source; depending on the type, it can provide light in a narrow wavelength range.',
    'monochromatic light': 'Light concentrated in a narrow range of wavelengths, for example blue light centered at 470 nm.',
    'nm': 'Nanometer, a unit of wavelength. This page treats visible light as roughly 380 to 750 nm; the near-infrared LEDs used are 780 to 940 nm, which the human eye cannot see.',
    'near-infrared': 'Light with a longer wavelength than red (this paper uses 780 to 940 nm). The human eye cannot see it, but a camera sensor may still respond to it.',
    'polarization': 'How the electric field of light oscillates in the plane perpendicular to its direction of travel. Ordinary lamp light has no fixed direction, while linearly polarized light oscillates along one specific direction.',
    'polarizer': 'A filter that passes only the component of the electric field along one specific direction. Placed in front of the light source, it produces polarized light; placed in front of the camera, it is called an analyzer.',
    'analyzer': 'A polarizer placed in front of the camera lens; turning it to different angles makes the reflected light brighter or darker.',
    'hyperspectral imaging': 'Measuring many narrow, adjacent wavelength bands for the same scene, so each pixel has a set of spectral values that preserve fine detail.',
    'HSI': 'Abbreviation of hyperspectral imaging.',
    'spectrum': 'How the intensity of light varies with wavelength; it can also describe the reflectance of an object. A sequence of brightness values taken under different imaging conditions is called a pseudo-spectrum on this page.',
    'pseudo-spectral cube': 'In this paper, grayscale images of the same position taken under different lighting conditions are stacked into data that hyperspectral imaging methods can analyze.',
    'PSC': 'Abbreviation of pseudo-spectral cube.',
    'component': "One grayscale image in the image cube; the number of components is the length of each pixel's spectrum.",
    'RGB': 'The three color channels red (R), green (G), and blue (B).',
    'Bayer pattern': 'The arrangement of tiny filters on a color camera sensor: each pixel is covered by only one color, with green taking half and red and blue a quarter each.',
    'demosaicing': 'The step that starts from raw data with only one color per pixel and interpolates from neighboring pixels to fill in full RGB.',
    'contrast': 'The brightness difference between the defect and the background; the larger the difference, the easier the defect usually is to recognize.',
    'SNR': 'Signal-to-noise ratio: the strength of the useful signal relative to the noise.',
    'threshold': 'A score cutoff; a pixel whose score exceeds it is judged to be a defect.',
    'PD': 'Detection rate: the fraction of truly defective pixels that are judged to be defects.',
    'PFA': 'False alarm rate: the fraction of normal background pixels that are wrongly judged to be defects.',
    'ROC curve': 'The curve of detection rate against false alarm rate as the threshold is lowered from high to low; the closer to the top-left corner, the better.',
    'GDR': 'Good detection rate; the paper fixes it at 90%, meaning 90% of the defect pixels must be detected.',
    'FAR': 'False alarm rate: the PFA read off at a specified GDR; the paper uses GDR = 90%. Lower is better, and 0% means no false alarms under this scoring condition.',
    'AFAR': 'Average false alarm rate: the mean FAR of one algorithm over different combinations of image cube and reference spectrum.',
    'detection map': 'An image that shows the score of each pixel; this page always orients scores so that a higher score means more likely a defect.',
    'covariance matrix': 'A matrix describing how the brightness of the components varies together; its (i, j) entry says how much component i and component j move together when they deviate from their own means.',
    'Mahalanobis distance': 'A distance that accounts for the spread and correlation in each direction; along directions where the background varies more, the same gap counts for less.',
    'AMF': 'Adaptive matched filter: uses the supplied reference spectrum as a template and measures how similar a pixel is to it after accounting for the background covariance.',
    'ACE': 'Adaptive cosine estimator: builds on AMF by also dividing by the squared length of the pixel after weighting by the background covariance, so it is insensitive to overall brightness scaling.',
    'CFAR': 'Constant false alarm rate: when the background follows the model assumptions, the false alarm rate does not depend on parameters such as overall background brightness, so the threshold can be computed from the required false alarm rate.',
    'RX': 'An anomaly detection method named after Reed and Yu: it computes the Mahalanobis distance between each pixel and the mean background spectrum.',
    'anomaly detection': 'Finding pixels whose properties differ from the background, without being given a defect template first.',
    'SAM': 'Spectral angle mapper: treats two spectra as vectors and computes the cosine of the angle between them; the result does not change when the overall brightness of a spectrum is scaled proportionally.',
    'SID': 'Spectral information divergence: normalizes each of two spectra into a probability distribution, then measures the difference between the two distributions.',
    "Kendall's tau": 'Rank agreement: checks whether the brightness ordering of the components is the same in two spectra; the value lies between −1 and 1.',
    'TAU': "This paper's short name for the detector based on Kendall's tau.",
    'supervised': 'On this page, an approach that needs a defect spectrum template to be supplied beforehand.',
    'unsupervised': "Following the paper's wording, an approach that does not need a defect spectrum template to be supplied beforehand.",
    'white light': 'Light that contains many visible wavelengths, for example the light from a fluorescent lamp.',
    'specular reflection': 'Reflection in which light bounces mostly in one specific direction, like a mirror; the metal surfaces in this paper behave mainly this way.',
    'diffuse reflection': 'Reflection in which incoming light scatters in all directions, for example from paper.',
    'normal distribution': 'A bell-shaped probability distribution; some statistical methods on this page use it as the background model.',
    'chi-square distribution': 'The distribution formed by adding the squares of independent standard normal variables; when the background follows a normal model, it describes the theoretical distribution of RX scores.'
  });

  // The knowledge-point demos now live in lessons.js; the old ones are in _work/backup-v1/demos.js.

  PR.formulaMap('fmap', {
    lanes: [{id:'dec',label:'Shared flow'}, {id:'tgt',label:'Template matching'}, {id:'ano',label:'Background difference'}, {id:'dist',label:'Brightness comparison'}],
    nodes: [
      {id:'u3',lane:'dec',col:0,tag:'U3',title:'Organize scores',href:'#eq-u3',kind:'new'},
      {id:'u1',lane:'dec',col:1,tag:'U1',title:'Threshold selection',href:'#eq-u1',kind:'base'},
      {id:'u2',lane:'dec',col:2,tag:'U2',title:'Compute detection and false alarms',href:'#eq-u2',kind:'base'},
      {id:'u4',lane:'dec',col:3,tag:'U4',title:'Compare false alarms and average',href:'#eq-u4',kind:'target'},
      {id:'e1',lane:'tgt',col:1,tag:'Eq. (1)',title:'AMF',href:'#eq-1',kind:'base'},
      {id:'e2',lane:'tgt',col:2,tag:'Eq. (2)',title:'ACE',href:'#eq-2',kind:'base'},
      {id:'e3',lane:'ano',col:1,tag:'Eq. (3)',title:'RX',href:'#eq-3',kind:'base'},
      {id:'e4',lane:'dist',col:1,tag:'Eq. (4)',title:'SAM',href:'#eq-4',kind:'new'},
      {id:'e5',lane:'dist',col:2,tag:'Eq. (5)',title:'SID',href:'#eq-5',kind:'base'},
      {id:'e6',lane:'dist',col:3,tag:'Eq. (6)',title:'TAU',href:'#eq-6',kind:'base'}
    ],
    edges: [
      {from:'u3',to:'u1',label:'Choose threshold'},
      {from:'u1',to:'u2',label:'Compare with annotation'},
      {from:'u2',to:'u4',label:'PD ≥ 90%'},
      {from:'e1',to:'e2',label:'÷ weighted squared length',dashed:true},
      ...['e1','e2','e3','e4','e5','e6'].map(from=>({from,to:'u3',label:'score',route:'bus'}))
    ]
  });
})();
