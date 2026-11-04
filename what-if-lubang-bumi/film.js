// THE FILM — "Gimana kalau ada lubang tembus Bumi dari Jakarta?" (9:16).
// Same series look as "internet mati": navy HUD, status chips, expressive cartoon cast, karaoke captions.
// Every frame is a pure function of t; the counters read the physics model in score.js.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio, Ch = globalThis.Ch;
  const { BEAT, ev, clock, T } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H, SA = G.SAFE;
  const CX = SA.x + SA.w / 2;
  const C = {
    bg0: '#060E22', bg1: '#13244A', white: '#EEF2F8', ink: '#0A1430',
    red: '#FF4D5E', green: '#3BE38A', amber: '#FFB547', cyan: '#5CC8FF', dim: 'rgba(238,242,248,0.45)',
  };
  const MONO = '"JetBrains Mono", "DejaVu Sans Mono", monospace';
  const SANS = 'Inter';
  const inS = (t, s) => t >= s[0] && t < s[1];
  const hsh = (...a) => U.hash(...a);

  // ---------------- helpers ----------------
  const txt = (ctx, s, x, y, o = {}) => G.text(ctx, s, x, y, Object.assign({ fam: SANS, weight: 800, size: 48, color: C.white, boil: 0 }, o));
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const pop = (t, t0, d = 0.25) => (t < t0 ? 0 : ease.outBack(clamp((t - t0) / d), 2.4));
  const fade = (t, t0, d = 0.3) => clamp((t - t0) / d);
  const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
  function mixHex(a, b, k) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k))).toString(16).padStart(2, '0')).join('');
  }
  function chip(ctx, x, y, label, { color = C.red, dot = true, align = 'right', size = 30, alpha = 1, bg = 'rgba(8,16,38,0.85)', fam = SANS } = {}) {
    const wText = G.measure(ctx, label, size, fam, 800);
    const w = wText + (dot ? 64 : 40), h = size + 26;
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.save(); ctx.globalAlpha *= alpha;
    rr(ctx, x0, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke();
    if (dot) { ctx.beginPath(); ctx.arc(x0 + 30, y + h / 2, 9, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
    txt(ctx, label, x0 + (dot ? 50 : 20), y + h / 2 + size * 0.36, { size, color: C.white, fam });
    ctx.restore();
    return w;
  }
  function box(ctx, x, y, w, h, d, { top = '#2C3F6E', front = '#1E2E55', side = '#16244A' } = {}) {
    const dx = d * 0.6, dy = -d * 0.45;
    ctx.fillStyle = front; ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + dx, y - h + dy); ctx.lineTo(x + w + dx, y - h + dy); ctx.lineTo(x + w, y - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = side; ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + dx, y + dy); ctx.lineTo(x + w + dx, y - h + dy); ctx.lineTo(x + w, y - h); ctx.closePath(); ctx.fill();
  }

  // ---------------- cast (no names are ever shown) ----------------
  const STY = {
    rafi: { skin: '#C68B59', hair: '#1B1310', hairStyle: 'quiff', outfit: 'tee', shirt: '#3A6FD8', bottoms: 'pants', shorts: '#2B3140', build: 'slim' },
    lokal: { skin: '#C99366', hair: '#2A1A14', hairStyle: 'long', outfit: 'shirt', shirt: '#F2C230', collar: '#D9A520', bottoms: 'skirt', shorts: '#2E5AA8', headwear: 'cap', headwearColor: '#C8102E' },
  };
  const blinkAt = (t, k) => { const p = (t + hsh(k, 11) * 5) % 3.3; return p < 0.14 ? Math.sin((p / 0.14) * Math.PI) : 0; };
  function person(ctx, o) {
    const k = o.k || 1;
    const st = typeof o.style === 'string' ? STY[o.style] : o.style;
    const closed = o.eyes === 'happy' || o.eyes === 'closed' || o.eyes === 'sleep';
    const q = Object.assign({ pose: 'stand', mouth: 'flat', blink: closed ? 0 : blinkAt(G.t, k), sy: 1 + 0.012 * Math.sin(G.t * 2.4 + k), seed: 300 + k * 17 }, o, { style: st });
    delete q.k;
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha; Ch.person(ctx, q); ctx.restore();
  }

  // ---------------- background bits ----------------
  function sky(ctx, top, mid, horizon) {
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, top); g.addColorStop(1, mid);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon + 2);
  }
  function monasShape(ctx, x, base, h, color, flame = '#FFC93C') { // the national monument as a simple silhouette, h = total height
    const k = h / 300;
    ctx.fillStyle = color;
    ctx.beginPath(); // base cup
    ctx.moveTo(x - 70 * k, base); ctx.lineTo(x + 70 * k, base); ctx.lineTo(x + 52 * k, base - 22 * k); ctx.lineTo(x + 30 * k, base - 30 * k); ctx.lineTo(x - 30 * k, base - 30 * k); ctx.lineTo(x - 52 * k, base - 22 * k); ctx.closePath(); ctx.fill();
    ctx.beginPath(); // shaft
    ctx.moveTo(x - 13 * k, base - 30 * k); ctx.lineTo(x + 13 * k, base - 30 * k); ctx.lineTo(x + 7 * k, base - 250 * k); ctx.lineTo(x - 7 * k, base - 250 * k); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 16 * k, base - 250 * k); ctx.lineTo(x + 16 * k, base - 250 * k); ctx.lineTo(x + 9 * k, base - 262 * k); ctx.lineTo(x - 9 * k, base - 262 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = flame; ctx.beginPath(); ctx.moveTo(x, base - 300 * k); ctx.quadraticCurveTo(x + 12 * k, base - 278 * k, x + 8 * k, base - 262 * k); ctx.lineTo(x - 8 * k, base - 262 * k); ctx.quadraticCurveTo(x - 12 * k, base - 278 * k, x, base - 300 * k); ctx.fill();
  }
  function jakarta(ctx, t, horizon) {
    sky(ctx, '#0B1640', '#5A3A6E', horizon);
    // skyline
    for (let i = 0; i < 16; i++) {
      const w = 50 + hsh(i, 1) * 50, h = 80 + hsh(i, 2) * 230, x = i * 72 - 30;
      ctx.fillStyle = i % 2 ? '#1A2347' : '#222C55'; ctx.fillRect(x, horizon - h, w, h);
      for (let r = 0; r < h / 26 - 1; r++) for (let c = 0; c < w / 18 - 1; c++) if (hsh(i, r, c) > 0.55) { ctx.fillStyle = hsh(i, r, c, 2) > 0.5 ? '#FFD27A' : '#8FB3FF'; ctx.globalAlpha = 0.6; ctx.fillRect(x + 8 + c * 18, horizon - h + 12 + r * 26, 7, 10); ctx.globalAlpha = 1; }
    }
    monasShape(ctx, 820, horizon, 300, '#2A3566');
    // ground
    const g = ctx.createLinearGradient(0, horizon, 0, H); g.addColorStop(0, '#3A3E5C'); g.addColorStop(1, '#1C2038');
    ctx.fillStyle = g; ctx.fillRect(0, horizon, W, H - horizon);
  }
  function hole(ctx, x, y, rx, ry, t) {
    ctx.save();
    ctx.fillStyle = '#5A4632'; ctx.beginPath(); ctx.ellipse(x, y + 10, rx + 16, ry + 10, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x, y + ry * 0.4, 4, x, y, rx);
    g.addColorStop(0, `rgba(255,120,40,${0.55 + 0.15 * Math.sin(t * 3)})`); g.addColorStop(0.35, '#2A0E08'); g.addColorStop(1, '#05030A');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------------- tunnel (inside the Earth) ----------------
  const LAYER_COL = [[0, '#6B4A35'], [35, '#7A4128'], [600, '#9A3A1C'], [2900, '#C2471A'], [2950, '#E0701F'], [5150, '#F5A43A'], [5200, '#FFE0A0'], [6371, '#FFF4D6']];
  const colAt = (km) => { for (let i = 1; i < LAYER_COL.length; i++) if (km <= LAYER_COL[i][0]) { const [a, ca] = LAYER_COL[i - 1], [b, cb] = LAYER_COL[i]; return mixHex(ca, cb, (km - a) / (b - a)); } return '#FFF4D6'; };
  // visual scroll offset: integral of a speed that grows with the real speed (precomputed, deterministic)
  const OFF = [];
  (() => { let o = 0; for (let i = 0; i <= Math.ceil(S.DURATION * 60); i++) { const t = i / 60; const f = S.fall(S.tauAt(t)); const vs = t < ev.jump ? 0 : 260 + 2600 * (f.v / 9530); o += vs / 60; OFF.push(o); } })();
  const offAt = (t) => { const x = clamp(t, 0, S.DURATION) * 60, i = Math.floor(x); const a = OFF[i] || 0, b = OFF[i + 1] || a; return lerp(a, b, x - i); };
  const timeOfTau = (tau) => { let lo = ev.jump, hi = ev.popOut; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (S.tauAt(mid) < tau) lo = mid; else hi = mid; } return lo; };
  const BANDS = [
    { tau: 50, label: 'LUBANG KOLA · 12.262 m', sub: 'lubang terdalam buatan manusia', color: C.amber },
    { tau: S.tCMB, label: 'BATAS INTI LUAR · 2.900 km', sub: 'besi & nikel cair', color: C.amber },
    { tau: 1032, label: 'INTI DALAM · 5.150 km', sub: 'besi padat, ±5.400°C', color: C.red },
  ].map((b) => Object.assign(b, { at: timeOfTau(b.tau) }));
  const RAFI_Y = 1000;

  function tunnel(ctx, t) {
    const f = S.fall(S.tauAt(t)), km = f.depth / 1000;
    const base = colAt(km), dark = mixHex(base, '#000000', 0.45), lite = mixHex(base, '#FFFFFF', 0.18);
    const off = offAt(t);
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    // strata + rocks on both walls, scrolling up
    const period = 260;
    const k0 = Math.floor(off / period);
    for (let k = k0 - 1; k < k0 + H / period + 2; k++) {
      const y = k * period - off + H * 0.1;
      ctx.fillStyle = k % 2 ? dark : lite; ctx.globalAlpha = 0.35; ctx.fillRect(0, y, W, 26 + hsh(k, 1) * 40); ctx.globalAlpha = 1;
      for (let j = 0; j < 6; j++) {
        const side = j % 2 ? 1 : -1, x = side > 0 ? 760 + hsh(k, j, 2) * 300 : 20 + hsh(k, j, 2) * 230;
        const yy = y + hsh(k, j, 3) * period, r = 14 + hsh(k, j, 4) * 34;
        ctx.fillStyle = hsh(k, j, 5) > 0.5 ? dark : lite; ctx.beginPath(); ctx.ellipse(x, yy, r * 1.4, r, hsh(k, j, 6) * 3, 0, Math.PI * 2); ctx.fill();
      }
      if (km > 300) { // glowing cracks deeper down
        ctx.strokeStyle = hexA('#FFB547', clamp((km - 300) / 2000) * 0.6); ctx.lineWidth = 4;
        ctx.beginPath(); const sx = hsh(k, 9) > 0.5 ? 120 : 900; ctx.moveTo(sx, y); ctx.lineTo(sx + 40, y + 60); ctx.lineTo(sx - 10, y + 130); ctx.lineTo(sx + 30, y + 200); ctx.stroke();
      }
    }
    // the shaft
    const x0 = 290, x1 = 750;
    const sg = ctx.createLinearGradient(x0, 0, x1, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0.85)'); sg.addColorStop(0.5, km > 2900 ? hexA('#3A1405', 0.75) : 'rgba(4,6,16,0.75)'); sg.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = sg; ctx.fillRect(x0, 0, x1 - x0, H);
    ctx.fillStyle = hexA(mixHex(base, '#000000', 0.7), 1); ctx.fillRect(x0 - 14, 0, 14, H); ctx.fillRect(x1, 0, 14, H);
    // speed streaks
    const v = f.v / 9530;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const x = x0 + 20 + hsh(i, 21) * (x1 - x0 - 40), len = 60 + 380 * v;
      const y = ((hsh(i, 22) * H - off * (1.2 + hsh(i, 23))) % (H + len) + H + len) % (H + len) - len;
      ctx.strokeStyle = `rgba(255,240,220,${0.08 + 0.3 * v})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
    }
    ctx.restore();
    // depth bands (Kola, core boundaries) pass by with the walls
    for (const b of BANDS) {
      const y = RAFI_Y - 150 + (offAt(b.at) - off);
      if (y < -120 || y > H + 60) continue;
      ctx.fillStyle = hexA(b.color, 0.85); ctx.fillRect(0, y - 4, W, 8);
      rr(ctx, SA.x, y - 80, 450, 66, 14); ctx.fillStyle = 'rgba(8,16,38,0.85)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = b.color; ctx.stroke();
      txt(ctx, b.label, SA.x + 20, y - 52, { size: 26, color: b.color });
      txt(ctx, b.sub, SA.x + 20, y - 24, { size: 22, weight: 700, color: C.white });
    }
    // heat shimmer in the core
    if (km > 2900) {
      ctx.save(); ctx.globalAlpha = clamp((km - 2900) / 2000) * 0.35; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) { ctx.beginPath(); const y = (i * 240 + t * 120) % H; for (let x = 0; x <= W; x += 30) ctx.lineTo(x, y + Math.sin(x * 0.03 + t * 6 + i) * 10); ctx.stroke(); }
      ctx.restore();
    }
  }
  // Rafi tumbling down the shaft
  function faller(ctx, t, mood = {}) {
    const rot = Math.sin(t * 0.9) * 0.35 + (mood.spin || 0);
    person(ctx, Object.assign({ x: 610, y: RAFI_Y + (mood.dy || 0) + Math.sin(t * 1.7) * 14, s: 0.62, k: 1, style: 'rafi', gesture: 'cheer', rot, eyes: 'wide', brows: 'up', mouth: 'open' }, mood));
  }
  // mini cross-section with the faller's dot
  function miniMap(ctx, t) {
    const f = S.fall(S.tauAt(t));
    const cx = 845, cy = 600, r = 92;
    ctx.save();
    ctx.fillStyle = 'rgba(8,16,38,0.85)'; ctx.beginPath(); ctx.arc(cx, cy, r + 18, 0, Math.PI * 2); ctx.fill();
    for (const [rr0, col] of [[1, '#6B4A35'], [0.96, '#B5471F'], [0.546, '#E0701F'], [0.19, '#FFE0A0']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r * rr0, 0, Math.PI * 2); ctx.fill(); }
    ctx.setLineDash([6, 6]); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke(); ctx.setLineDash([]);
    const frac = f.travelled / (2 * S.R), down = f.trip % 2 === 0;
    const y = down ? cy - r + frac * 2 * r : cy + r - frac * 2 * r;
    ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(cx, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.stroke();
    txt(ctx, 'JKT', cx, cy - r - 26, { size: 20, align: 'center', fam: MONO, color: C.white });
    txt(ctx, 'KOL', cx, cy + r + 42, { size: 20, align: 'center', fam: MONO, color: C.white });
    ctx.restore();
  }
  function badge(ctx, t, t0, title, sub, color = C.amber, y = 520) {
    const a = pop(t, t0, 0.3);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp(a);
    ctx.translate(SA.x, y); ctx.scale(lerp(0.9, 1, clamp(a)), lerp(0.9, 1, clamp(a)));
    const w = Math.max(G.measure(ctx, title, 34, SANS, 800), G.measure(ctx, sub, 24, SANS, 700)) + 44;
    rr(ctx, 0, 0, w, 96, 18); ctx.fillStyle = 'rgba(8,16,38,0.88)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.stroke();
    txt(ctx, title, 22, 42, { size: 34, color });
    txt(ctx, sub, 22, 78, { size: 24, weight: 700, color: C.white });
    ctx.restore();
  }

  // ---------------- HUD ----------------
  function hud(ctx, t) {
    const tau = S.tauAt(t), f = S.fall(tau), km = f.depth / 1000;
    const mm = Math.floor(tau / 60), ss = Math.floor(tau % 60);
    rr(ctx, SA.x - 20, SA.y - 10, 470, 216, 22); ctx.fillStyle = 'rgba(6,12,30,0.78)'; ctx.fill();
    txt(ctx, f.trip > 0 ? `WAKTU JATUH · PERJALANAN #${f.trip + 1}` : 'WAKTU JATUH', SA.x, SA.y + 30, { size: 24, fam: MONO, weight: 700, color: C.amber });
    txt(ctx, `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, SA.x, SA.y + 120, { size: 92, fam: MONO, weight: 800 });
    const layer = S.layerAt(km);
    chip(ctx, SA.x, SA.y + 146, km < 0.05 && tau > 100 ? 'PERMUKAAN' : layer, { color: colAt(Math.max(km, 1)), align: 'left', size: 24 });
    const dTxt = km < 1 ? `${fmt(f.depth)} m` : `${fmt(km)} km`;
    chip(ctx, SA.x + SA.w, SA.y + 4, `↓ ${dTxt}`, { color: C.cyan, dot: false, size: 28, fam: MONO });
    chip(ctx, SA.x + SA.w, SA.y + 68, `${fmt(f.v * 3.6)} km/jam`, { color: C.green, dot: false, size: 28, fam: MONO });
    chip(ctx, SA.x + SA.w, SA.y + 132, `≈ ${fmt(Math.round(S.tempAt(km) / 10) * 10)}°C`, { color: C.red, dot: false, size: 28, fam: MONO });
  }

  // ---------------- captions (karaoke: the creator reads along while recording) ----------------
  function captions(ctx, t) {
    const line = S.vo.find((l) => t >= l.t - 0.12 && t < l.end + 0.3);
    if (!line) return;
    const size = 52, maxW = SA.w - 70;
    const rows = []; let row = [];
    for (const w of line.words) {
      const test = row.concat(w).map((q) => q.w).join(' ');
      if (row.length && G.measure(ctx, test, size, SANS, 800) > maxW) { rows.push(row); row = [w]; } else row.push(w);
    }
    if (row.length) rows.push(row);
    const lh = size * 1.22, boxH = rows.length * lh + 44;
    const y0 = SA.y + SA.h - boxH - 10;
    const a = Math.min(fade(t, line.t - 0.12, 0.12), 1 - fade(t, line.end + 0.15, 0.15));
    ctx.save(); ctx.globalAlpha *= a;
    rr(ctx, SA.x, y0, SA.w, boxH, 26); ctx.fillStyle = 'rgba(5,10,26,0.8)'; ctx.fill();
    rows.forEach((r, i) => {
      const full = r.map((q) => q.w).join(' ');
      let x = CX - G.measure(ctx, full, size, SANS, 800) / 2;
      const y = y0 + 22 + lh * (i + 0.78);
      for (const w of r) {
        const said = t >= w.t, now = t >= w.t && t < w.end;
        txt(ctx, w.w, x, y, { size, color: now ? C.amber : said ? C.white : 'rgba(238,242,248,0.42)' });
        x += G.measure(ctx, w.w + ' ', size, SANS, 800);
      }
    });
    ctx.restore();
  }

  // ---------------- scenes ----------------
  function hookScene(ctx, t) {
    jakarta(ctx, t, 980);
    hole(ctx, 600, 1180, 300, 78, t);
    person(ctx, { x: 250, y: 1215, s: 0.72, k: 1, style: 'rafi', eyes: 'wide', brows: 'up', mouth: t > 1.2 ? 'o' : 'flat', look: 1, lookY: 1, headRot: 0.12, gesture: t > 2.2 ? 'point' : null });
    const a = pop(t, 0.15, 0.35);
    ctx.save(); ctx.globalAlpha *= clamp(a);
    txt(ctx, 'GIMANA KALAU ADA', CX, SA.y + 60, { size: 46, align: 'center', color: C.amber, fam: MONO });
    txt(ctx, 'LUBANG TEMBUS', CX, SA.y + 150, { size: 80, align: 'center' });
    txt(ctx, 'BUMI', CX, SA.y + 240, { size: 80, align: 'center', color: '#FF8A3C' });
    txt(ctx, 'DARI JAKARTA?', CX, SA.y + 330, { size: 64, align: 'center' });
    ctx.restore();
  }
  function globeScene(ctx, t) {
    sky(ctx, '#050A1C', '#0E1A3C', H);
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.6 * hsh(i, 3)})`; ctx.fillRect(hsh(i, 1) * W, hsh(i, 2) * H, 2 + hsh(i, 4) * 2, 2 + hsh(i, 4) * 2); }
    const cx = 500, cy = 880, r = 330, s0 = S.S.globe[0];
    const grow = ease.outBack(clamp((t - s0) / 0.4), 1.6);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(grow, grow);
    ctx.fillStyle = '#2E6FD8'; ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, Math.PI * 2); ctx.fill();
    const layers = [[1, '#6B4A35', 'kerak'], [0.97, '#B5471F', 'mantel'], [0.546, '#E0701F', 'inti luar'], [0.19, '#FFE0A0', 'inti dalam']];
    for (const [k, col] of layers) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r * k, 0, Math.PI * 2); ctx.fill(); }
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3); glow.addColorStop(0, 'rgba(255,255,255,0.8)'); glow.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
    // the tunnel draws on
    const u = clamp((t - s0 - 0.4) / 1.6);
    ctx.setLineDash([18, 12]); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, -r - 10); ctx.lineTo(0, -r - 10 + u * (2 * r + 20)); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // labels
    const la = fade(t, s0 + 0.3);
    ctx.save(); ctx.globalAlpha *= la;
    const lx = cx + r + 20;
    [[0.985, 'kerak'], [0.76, 'mantel'], [0.37, 'inti luar'], [0.0, 'inti dalam']].forEach(([k, name], i) => {
      const y = cy - r * k * 0.82 + (i === 3 ? 0 : 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + r * k * 0.55 + (i === 3 ? 20 : 0), y); ctx.lineTo(lx + 20, y); ctx.stroke();
      txt(ctx, name, lx + 26, y + 9, { size: 28, color: C.white });
    });
    ctx.restore();
    // pins
    const pinA = pop(t, s0 + 0.2), pinB = pop(t, s0 + 1.9);
    for (const [a, y, label, col] of [[pinA, cy - r - 10, 'JAKARTA', C.red], [pinB, cy + r + 10, 'KOLOMBIA', C.amber]]) {
      if (a <= 0) continue;
      ctx.save(); ctx.translate(cx, y); ctx.scale(a, a);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; ctx.stroke();
      rr(ctx, -110, label === 'JAKARTA' ? -86 : 30, 220, 54, 14); ctx.fillStyle = col; ctx.fill();
      txt(ctx, label, 0, label === 'JAKARTA' ? -48 : 68, { size: 32, align: 'center', color: C.ink });
      ctx.restore();
    }
  }
  function jumpScene(ctx, t) {
    jakarta(ctx, t, 900);
    hole(ctx, 540, 1170, 380, 100, t);
    const j = ev.jump;
    let y = 1150, sy = 1, mood = { eyes: 'normal', brows: 'determined', mouth: 'smirk' };
    if (t > j - 1 && t < j) { sy = 1 - 0.12 * clamp((t - (j - 1)) / 0.6); mood = { eyes: 'focus', brows: 'determined', mouth: 'flat' }; }
    if (t >= j) { const u = t - j; y = 1150 - 260 * u + 1300 * u * u; mood = { eyes: 'wide', brows: 'up', mouth: 'open', gesture: 'cheer' }; }
    if (y < 1600) {
      ctx.save();
      if (t >= j) { ctx.beginPath(); ctx.rect(0, 0, W, 1170 + (y < 1100 ? 200 : 0)); ctx.clip(); }
      person(ctx, Object.assign({ x: 540, y, s: 0.78, k: 1, style: 'rafi', sy }, mood));
      ctx.restore();
      if (t >= j && y > 1100) { ctx.fillStyle = '#3A3E5C'; ctx.fillRect(0, 1250, W, H); } // front lip of the ground hides him as he drops
    }
    // the disclaimer
    const a = fade(t, S.S.jump[0] + 0.3);
    chip(ctx, CX, SA.y + 250, '*SIMULASI: hampa udara & dinding tahan panas', { color: C.amber, dot: false, size: 26, align: 'center', alpha: a });
    if (t >= j) { const fl = Math.exp(-(t - j) * 10); ctx.fillStyle = `rgba(255,255,255,${0.6 * fl})`; ctx.fillRect(0, 0, W, H); }
  }

  function fallScene(ctx, t, key) {
    tunnel(ctx, t);
    const s = S.S[key];
    if (key === 'monas') {
      faller(ctx, t, { eyes: 'wide', brows: 'up', mouth: 'open' });
      // depth vs Monas ruler
      const surf = 760, k = 2.1; // px per metre
      const d = S.fall(S.tauAt(t)).depth;
      rr(ctx, SA.x - 10, 520, 250, 820, 20); ctx.fillStyle = 'rgba(8,16,38,0.82)'; ctx.fill();
      monasShape(ctx, SA.x + 70, surf, 132 * k, '#C9D3E6');
      txt(ctx, '132 m', SA.x + 130, surf - 132 * k + 30, { size: 26, fam: MONO, color: C.white });
      ctx.fillStyle = '#7A5A40'; ctx.fillRect(SA.x, surf, 230, 6);
      ctx.setLineDash([8, 8]); ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(SA.x + 10, surf + 132 * k); ctx.lineTo(SA.x + 220, surf + 132 * k); ctx.stroke(); ctx.setLineDash([]);
      const dy = Math.min(d, 260) * k;
      ctx.strokeStyle = C.cyan; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(SA.x + 170, surf); ctx.lineTo(SA.x + 170, surf + dy); ctx.stroke();
      ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(SA.x + 170, surf + dy, 12, 0, Math.PI * 2); ctx.fill();
      if (d > 132) { const a = pop(t, timeOfTau(5.2), 0.3); ctx.save(); ctx.translate(SA.x + 115, surf + 132 * k + 70); ctx.scale(a, a); rr(ctx, -105, -26, 210, 52, 12); ctx.fillStyle = C.green; ctx.fill(); txt(ctx, 'LEWAT MONAS', 0, 10, { size: 26, align: 'center', color: C.ink }); ctx.restore(); }
    } else if (key === 'kola') {
      faller(ctx, t, { eyes: 'happy', brows: 'neutral', mouth: 'grin' });
    } else if (key === 'float') {
      faller(ctx, t, { eyes: 'happy', brows: 'neutral', mouth: 'grin', gesture: 'cheer', spin: (t - s[0]) * 0.25 });
      const items = [['phone', 300], ['drop', 390], ['sandal', 640], ['drop', 690], ['phone2', 410]];
      items.forEach(([kind, x0], i) => {
        const x = x0 + Math.sin(t * 0.8 + i) * 40, y = 760 + i * 90 + Math.cos(t * 0.7 + i * 2) * 40;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * (0.5 + i * 0.2));
        if (kind.startsWith('phone')) { rr(ctx, -22, -40, 44, 80, 8); ctx.fillStyle = '#1A2238'; ctx.fill(); rr(ctx, -17, -33, 34, 66, 4); ctx.fillStyle = '#9EE6FF'; ctx.fill(); }
        else if (kind === 'drop') { ctx.fillStyle = 'rgba(120,200,255,0.9)'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); }
        else { rr(ctx, -20, -44, 40, 88, 18); ctx.fillStyle = '#E2574C'; ctx.fill(); }
        ctx.restore();
      });
      badge(ctx, t, s[0] + 0.6, '0 g · MELAYANG', 'jatuh bebas = tanpa berat', C.cyan);
    } else if (key === 'inti') {
      faller(ctx, t, { eyes: 'wide', brows: 'determined', mouth: 'grin', sweat: 0.4 });
      badge(ctx, t, s[0] + 0.2, 'INTI LUAR', 'lautan besi cair', '#FF8A3C');
    } else if (key === 'panas') {
      faller(ctx, t, { eyes: 'wide', brows: 'worried', mouth: 'wavy', sweat: 1 });
      const a = pop(t, s[0] + 0.3, 0.3);
      if (a > 0) {
        badge(ctx, t, s[0] + 0.3, '≈ PERMUKAAN MATAHARI', 'inti ±5.400°C · Matahari ±5.500°C', C.red);
        ctx.save(); ctx.translate(SA.x + 560, 568); ctx.scale(a, a); // little sun
        ctx.fillStyle = '#FFC93C'; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#FFC93C'; ctx.lineWidth = 6; for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2 + t; ctx.beginPath(); ctx.moveTo(Math.cos(an) * 38, Math.sin(an) * 38); ctx.lineTo(Math.cos(an) * 52, Math.sin(an) * 52); ctx.stroke(); }
        ctx.restore();
      }
    } else if (key === 'pusat') {
      const atC = t >= ev.center;
      faller(ctx, t, atC ? { eyes: 'wide', brows: 'up', mouth: 'o', spin: (t - ev.center) * 2 } : { eyes: 'focus', brows: 'determined', mouth: 'flat' });
      if (atC) {
        const fl = Math.exp(-(t - ev.center) * 6);
        ctx.fillStyle = `rgba(255,250,235,${0.9 * fl})`; ctx.fillRect(0, 0, W, H);
        badge(ctx, t, ev.center + 0.1, 'PUSAT BUMI · 6.371 km', 'kecepatan puncak ±9,5 km/detik', C.amber);
      }
    } else if (key === 'kolombia') {
      faller(ctx, t, { eyes: 'normal', brows: 'neutral', mouth: 'smile', gesture: 'wave' });
      badge(ctx, t, s[0] + 0.3, 'MELAMBAT…', 'gravitasi sekarang menarik ke belakang', C.green);
    } else if (key === 'balik2') {
      faller(ctx, t, { eyes: 'wide', brows: 'worried', mouth: 'open', spin: Math.PI, dy: -330 });
      if (t >= 54.8) {
        const a = pop(t, 54.8, 0.4);
        ctx.save(); ctx.translate(330, 700); ctx.scale(a, a);
        txt(ctx, '∞', 0, 60, { size: 200, align: 'center', color: C.amber });
        ctx.restore();
      }
    }
    miniMap(ctx, t);
  }

  function colombia(ctx, t) {
    sky(ctx, '#3A86D8', '#BFE3FF', 980);
    // Andes hills
    for (const [y, col, amp, sd] of [[860, '#5E8C6A', 120, 1], [940, '#3F7A4E', 90, 2], [1010, '#2F6B3C', 60, 3]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y - amp * (0.5 + 0.5 * Math.sin(x * 0.006 * (1 + sd * 0.3) + sd * 2)) - hsh(x, sd) * 12);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#4E8A3A'; ctx.fillRect(0, 1060, W, H - 1060);
    rr(ctx, SA.x + 500, 620, 330, 56, 12); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    txt(ctx, 'SANTANDER, KOLOMBIA', SA.x + 665, 658, { size: 26, align: 'center', color: '#2E5AA8' });
  }
  function popOutScene(ctx, t) {
    colombia(ctx, t);
    const hx = 520, hy = 1200;
    hole(ctx, hx, hy, 230, 64, t);
    // the local who greets him
    const fb = t >= ev.fallBack;
    person(ctx, { x: 820, y: 1270, s: 0.62, k: 3, style: 'lokal', eyes: fb ? 'wide' : 'happy', brows: fb ? 'up' : 'neutral', mouth: fb ? 'o' : 'grin', gesture: fb ? 'point' : 'wave', look: -1 });
    // Rafi's head and shoulders out of the hole, then he slips back
    let y = 1500;
    if (t >= ev.popOut) y = lerp(1500, 1420, ease.outBack(clamp((t - ev.popOut) / 0.25), 2));
    if (fb) y = lerp(1420, 1900, ease.inQuad(clamp((t - ev.fallBack) / 0.35)));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hy + 4); ctx.clip();
    person(ctx, { x: hx, y, s: 0.72, k: 1, style: 'rafi', eyes: fb ? 'wide' : 'happy', brows: fb ? 'up' : 'neutral', mouth: fb ? 'open' : 'grin', gesture: fb ? 'cheer' : 'wave' });
    ctx.restore();
    // ground lip in front
    ctx.fillStyle = '#4E8A3A'; ctx.beginPath(); ctx.ellipse(hx, hy + 44, 250, 40, 0, 0, Math.PI); ctx.fill();
    if (t >= ev.popOut + 0.2 && !fb) {
      const a = pop(t, ev.popOut + 0.2, 0.25);
      ctx.save(); ctx.translate(800, 860); ctx.scale(a, a);
      rr(ctx, -95, -46, 190, 80, 40); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-20, 30); ctx.lineTo(-40, 64); ctx.lineTo(10, 30); ctx.fill();
      txt(ctx, '¡Hola!', 0, 8, { size: 46, align: 'center', color: '#C8102E' });
      ctx.restore();
    }
    if (fb) chip(ctx, 820, 840, '¡Nooo!', { color: C.red, dot: false, size: 34, align: 'center' });
  }
  function ctaScene(ctx, t) {
    jakarta(ctx, t, 1000);
    hole(ctx, 600, 1200, 260, 70, t);
    person(ctx, { x: 270, y: 1240, s: 0.7, k: 1, style: 'rafi', eyes: 'happy', brows: 'neutral', mouth: 'grin', gesture: 'wave', look: 0.5 });
    const k = 1 + 0.4 * Math.exp(-(t - ev.cta) * 14);
    ctx.save(); ctx.translate(CX, SA.y + 170); ctx.scale(k, k);
    txt(ctx, 'BERANI', 0, 0, { size: 110, align: 'center' });
    txt(ctx, 'LOMPAT?', 0, 116, { size: 110, align: 'center', color: '#FF8A3C' });
    ctx.restore();
    const a = fade(t, ev.cta + 1.2);
    if (a > 0) {
      const b = Math.abs(Math.sin((t - ev.cta) * 5)) * 12;
      txt(ctx, 'TAG TEMAN YANG', CX, SA.y + 420, { size: 52, align: 'center', color: C.green, alpha: a });
      txt(ctx, 'MAU KAMU AJAK', CX, SA.y + 482, { size: 52, align: 'center', color: C.green, alpha: a });
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = C.green; ctx.beginPath(); ctx.moveTo(CX - 26, SA.y + 512 + b); ctx.lineTo(CX + 26, SA.y + 512 + b); ctx.lineTo(CX, SA.y + 546 + b); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  function wrap(ctx, str, size, maxW, weight = 700) {
    const ws = str.split(' '), rows = []; let row = '';
    for (const w of ws) { const test = row ? row + ' ' + w : w; if (row && G.measure(ctx, test, size, SANS, weight) > maxW) { rows.push(row); row = w; } else row = test; }
    if (row) rows.push(row);
    return rows;
  }
  function sumberScene(ctx, t) {
    sky(ctx, '#060E22', '#13244A', H);
    const s0 = ev.sumber;
    const k = clamp((t - s0) / 0.35);
    ctx.save(); ctx.globalAlpha *= k;
    txt(ctx, 'SUMBER & REFERENSI', SA.x, SA.y + 50, { size: 44, color: C.amber, fam: MONO });
    let y = SA.y + 120;
    S.SOURCES.forEach(([claim, cite], i) => {
      const a = fade(t, s0 + 0.2 + i * 0.15, 0.25);
      ctx.save(); ctx.globalAlpha *= a;
      txt(ctx, `${i + 1}. ${claim}`, SA.x, y, { size: 36, color: C.white });
      y += 46;
      for (const r of wrap(ctx, cite, 29, SA.w - 30)) { txt(ctx, r, SA.x + 30, y, { size: 29, weight: 700, color: 'rgba(238,242,248,0.78)' }); y += 38; }
      y += 26;
      ctx.restore();
    });
    const da = fade(t, s0 + 1.2);
    ctx.save(); ctx.globalAlpha *= da;
    rr(ctx, SA.x, y + 4, SA.w, 170, 18); ctx.fillStyle = 'rgba(255,181,71,0.12)'; ctx.fill(); ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.stroke();
    let yy = y + 44;
    for (const r of wrap(ctx, 'Catatan: ini simulasi tanpa hambatan udara & panas. Waktu, kecepatan & suhu per titik di video = estimasi model, dibulatkan.', 28, SA.w - 40)) { txt(ctx, r, SA.x + 20, yy, { size: 28, weight: 700, color: C.amber }); yy += 36; }
    ctx.restore();
    ctx.restore();
  }

  const SCENES = [
    ['hook', hookScene], ['globe', globeScene], ['jump', jumpScene],
    ['monas', (c, t) => fallScene(c, t, 'monas')], ['kola', (c, t) => fallScene(c, t, 'kola')], ['float', (c, t) => fallScene(c, t, 'float')],
    ['inti', (c, t) => fallScene(c, t, 'inti')], ['panas', (c, t) => fallScene(c, t, 'panas')], ['pusat', (c, t) => fallScene(c, t, 'pusat')],
    ['kolombia', (c, t) => (t < ev.popOut ? fallScene(c, t, 'kolombia') : popOutScene(c, t))],
    ['balik', (c, t) => (t < ev.fallBack + 0.4 ? popOutScene(c, t) : fallScene(c, t, 'balik2'))],
    ['cta', ctaScene], ['sumber', sumberScene],
  ];
  const HUD_ON = new Set(['monas', 'kola', 'float', 'inti', 'panas', 'pusat', 'kolombia', 'balik']);

  Studio.film({
    draw(ctx, t) {
      const sc = SCENES.find(([k]) => inS(t, S.S[k])) || SCENES[SCENES.length - 1];
      let shake = 0;
      for (const h of [ev.jump, ev.center, ev.popOut, ev.fallBack, ev.cta]) if (t >= h) shake = Math.max(shake, 18 * Math.exp(-(t - h) * 9));
      if (inS(t, S.S.inti) || inS(t, S.S.panas)) shake = Math.max(shake, 4);
      ctx.save();
      ctx.translate(U.noise1(t * 40, 1) * shake, U.noise1(t * 40, 2) * shake);
      sc[1](ctx, t);
      ctx.restore();
      if (HUD_ON.has(sc[0]) || (sc[0] === 'jump' && t >= ev.jump)) hud(ctx, t);
      if (sc[0] !== 'sumber') captions(ctx, t);
    },
    post: { paper: 0, vignette: 0.35, grain: 0.03 },
  });
})();
