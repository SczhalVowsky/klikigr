// THE FILM — "Gimana kalau kamu menyusut seukuran semut?" (9:16). Series look: navy HUD + chips,
// expressive cartoon cast, karaoke captions, a sources card at the end. Pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio, Ch = globalThis.Ch;
  const { BEAT, ev, clock, T, NUM } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H, SA = G.SAFE;
  const CX = SA.x + SA.w / 2;
  const C = { white: '#EEF2F8', ink: '#0A1430', red: '#FF4D5E', green: '#3BE38A', amber: '#FFB547', cyan: '#5CC8FF', dim: 'rgba(238,242,248,0.45)' };
  const MONO = '"JetBrains Mono", "DejaVu Sans Mono", monospace';
  const SANS = 'Inter';
  const inS = (t, s) => t >= s[0] && t < s[1];
  const hsh = (...a) => U.hash(...a);
  const GROUND = 1270; // feet line in the macro scenes

  // ---------------- helpers ----------------
  const txt = (ctx, s, x, y, o = {}) => G.text(ctx, s, x, y, Object.assign({ fam: SANS, weight: 800, size: 48, color: C.white, boil: 0 }, o));
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const pop = (t, t0, d = 0.25) => (t < t0 ? 0 : ease.outBack(clamp((t - t0) / d), 2.4));
  const fade = (t, t0, d = 0.3) => clamp((t - t0) / d);
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
  function chip(ctx, x, y, label, { color = C.red, dot = true, align = 'right', size = 30, alpha = 1, bg = 'rgba(8,16,38,0.86)', fam = SANS } = {}) {
    const w = G.measure(ctx, label, size, fam, 800) + (dot ? 64 : 40), h = size + 26;
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.save(); ctx.globalAlpha *= alpha;
    rr(ctx, x0, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke();
    if (dot) { ctx.beginPath(); ctx.arc(x0 + 30, y + h / 2, 9, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
    txt(ctx, label, x0 + (dot ? 50 : 20), y + h / 2 + size * 0.36, { size, fam });
    ctx.restore();
    return w;
  }
  function badge(ctx, t, t0, title, sub, color = C.amber, y = SA.y + 250) {
    const a = pop(t, t0, 0.3);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp(a);
    const w = Math.max(G.measure(ctx, title, 32, SANS, 800), G.measure(ctx, sub, 24, SANS, 700)) + 44;
    ctx.translate(SA.x, y); ctx.scale(lerp(0.9, 1, clamp(a)), lerp(0.9, 1, clamp(a)));
    rr(ctx, 0, 0, w, 94, 18); ctx.fillStyle = 'rgba(8,16,38,0.88)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.stroke();
    txt(ctx, title, 22, 40, { size: 32, color });
    txt(ctx, sub, 22, 76, { size: 24, weight: 700 });
    ctx.restore();
  }
  function wrap(ctx, str, size, maxW, weight = 700) {
    const ws = str.split(' '), rows = []; let row = '';
    for (const w of ws) { const test = row ? row + ' ' + w : w; if (row && G.measure(ctx, test, size, SANS, weight) > maxW) { rows.push(row); row = w; } else row = test; }
    if (row) rows.push(row);
    return rows;
  }

  // ---------------- cast ----------------
  const RAFI = { skin: '#C68B59', hair: '#1B1310', hairStyle: 'quiff', outfit: 'tee', shirt: '#3A6FD8', bottoms: 'pants', shorts: '#2B3140', build: 'slim' };
  const blinkAt = (t, k) => { const p = (t + hsh(k, 11) * 5) % 3.3; return p < 0.14 ? Math.sin((p / 0.14) * Math.PI) : 0; };
  function rafi(ctx, o) {
    const closed = o.eyes === 'happy' || o.eyes === 'closed';
    Ch.person(ctx, Object.assign({ pose: 'stand', mouth: 'flat', blink: closed ? 0 : blinkAt(G.t, 1), sy: 1 + 0.012 * Math.sin(G.t * 2.4), seed: 317 }, o, { style: Object.assign({}, RAFI, o.style || {}) }));
  }

  // ---------------- props drawn at macro scale ----------------
  function macroFloor(ctx, t, { top = '#F1E3CC', bottom = '#D9C4A2', horizon = 980, tint = null } = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, '#E9DCC8'); g.addColorStop(1, '#CDB997');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon);
    // out-of-focus background blobs (a room seen from the floor)
    for (let i = 0; i < 9; i++) { ctx.fillStyle = hexA(['#B98E63', '#8A6F5A', '#E8C9A0', '#6F8FA8'][i % 4], 0.35); ctx.beginPath(); ctx.arc(hsh(i, 1) * W, 200 + hsh(i, 2) * (horizon - 300), 90 + hsh(i, 3) * 160, 0, Math.PI * 2); ctx.fill(); }
    const f = ctx.createLinearGradient(0, horizon, 0, H); f.addColorStop(0, top); f.addColorStop(1, bottom);
    ctx.fillStyle = f; ctx.fillRect(0, horizon, W, H - horizon);
    // a giant tile grout line + speckles
    ctx.fillStyle = 'rgba(120,96,70,0.35)'; ctx.fillRect(0, horizon + 140, W, 18);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(110,90,60,0.25)'; ctx.beginPath(); ctx.arc(hsh(i, 7) * W, horizon + 20 + hsh(i, 8) * (H - horizon), 2 + hsh(i, 9) * 5, 0, Math.PI * 2); ctx.fill(); }
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
  }
  function riceGrain(ctx, x, y, len, wid, rot) { // (x,y) = bottom-centre when upright (rot 0)
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const g = ctx.createLinearGradient(-wid / 2, 0, wid / 2, 0); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.6, '#F3F1EA'); g.addColorStop(1, '#D9D4C6');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -len / 2, wid / 2, len / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,150,130,0.6)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(-wid * 0.18, -len * 0.62, wid * 0.08, len * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function scaleBar(ctx, x, yTop, yBot, label, color = C.ink) {
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yBot); ctx.moveTo(x - 14, yTop); ctx.lineTo(x + 14, yTop); ctx.moveTo(x - 14, yBot); ctx.lineTo(x + 14, yBot); ctx.stroke();
    rr(ctx, x + 18, (yTop + yBot) / 2 - 24, G.measure(ctx, label, 28, MONO, 800) + 24, 48, 10); ctx.fillStyle = color; ctx.fill();
    txt(ctx, label, x + 30, (yTop + yBot) / 2 + 10, { size: 28, fam: MONO, color: '#FFFFFF' });
  }
  function mosquito(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#2B2B33'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const a = 0.4 + i * 0.45; ctx.beginPath(); ctx.moveTo(sd * 10, 0); ctx.lineTo(sd * (40 + i * 10), 40 + i * 10); ctx.lineTo(sd * (60 + i * 30) * Math.cos(a), 130 + i * 20); ctx.stroke(); }
    const flap = Math.sin(t * 90);
    ctx.fillStyle = 'rgba(200,220,255,0.45)';
    for (const sd of [-1, 1]) { ctx.save(); ctx.rotate(sd * (0.4 + flap * 0.35)); ctx.beginPath(); ctx.ellipse(sd * 70, -30, 80, 22, sd * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#4A4552'; ctx.beginPath(); ctx.ellipse(0, -5, 22, 30, 0, 0, Math.PI * 2); ctx.fill(); // thorax
    ctx.fillStyle = '#3A3540'; ctx.beginPath(); ctx.ellipse(0, 70, 13, 60, 0, 0, Math.PI * 2); ctx.fill(); // abdomen
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, 30 + i * 18); ctx.lineTo(12, 30 + i * 18); ctx.stroke(); }
    ctx.fillStyle = '#2B2B33'; ctx.beginPath(); ctx.arc(0, -44, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2B2B33'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(0, -110); ctx.stroke();
    ctx.restore();
  }
  function ant(ctx, x, y, s, t, face = -1, carry = null) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
    const wk = t * 14;
    ctx.strokeStyle = '#2A1810'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const ph = wk + i * 2.1 + (i % 2 ? Math.PI : 0); const bx = -30 + i * 30; ctx.beginPath(); ctx.moveTo(bx, -40); ctx.lineTo(bx + Math.sin(ph) * 22, -18); ctx.lineTo(bx + Math.sin(ph) * 30 - 10, 0); ctx.stroke(); }
    ctx.fillStyle = '#3B2214';
    ctx.beginPath(); ctx.ellipse(-80, -52, 48, 36, -0.2, 0, Math.PI * 2); ctx.fill(); // gaster
    ctx.beginPath(); ctx.ellipse(0, -48, 36, 20, 0, 0, Math.PI * 2); ctx.fill(); // thorax
    ctx.beginPath(); ctx.ellipse(62, -58, 30, 26, 0.1, 0, Math.PI * 2); ctx.fill(); // head
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(74, -64, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3B2214'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(70, -80); ctx.lineTo(90, -120); ctx.lineTo(124, -110 + Math.sin(t * 6) * 6); ctx.stroke();
    if (carry) { ctx.fillStyle = carry; rr(ctx, 60, -150, 80, 60, 14); ctx.fill(); }
    ctx.restore();
  }
  function waterDrop(ctx, x, y, rx, ry, wobble = 0) { // a sessile drop sitting on a surface at y
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, rx * (1 + wobble * 0.05), ry * (1 - wobble * 0.05), 0, Math.PI, 0); ctx.closePath();
    const g = ctx.createLinearGradient(x, y - ry, x, y); g.addColorStop(0, 'rgba(190,230,255,0.55)'); g.addColorStop(1, 'rgba(120,190,240,0.45)');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.35, y - ry * 0.68, rx * 0.16, ry * 0.08, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function fallingDrop(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r); g.addColorStop(0, 'rgba(235,248,255,0.95)'); g.addColorStop(1, 'rgba(120,190,240,0.75)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  }

  // ---------------- HUD ----------------
  function shrinkK(t) { return clamp((t - ev.shrink) / 0.6); }
  function hud(ctx, t) {
    const k = ease.inOutCubic(shrinkK(t));
    const hcm = lerp(NUM.h0, NUM.h1, k);
    const hTxt = hcm >= 10 ? `${Math.round(hcm)} cm` : `${hcm.toFixed(1).replace('.', ',')} cm`;
    const mass = k < 1 ? `${Math.max(0, Math.round(lerp(NUM.m0, 0, k)))} kg` : '1,6 mg';
    rr(ctx, SA.x - 20, SA.y - 10, 420, 206, 22); ctx.fillStyle = 'rgba(6,12,30,0.8)'; ctx.fill();
    txt(ctx, 'TINGGI BADAN', SA.x, SA.y + 30, { size: 24, fam: MONO, weight: 700, color: C.amber });
    txt(ctx, hTxt, SA.x, SA.y + 122, { size: 88, fam: MONO });
    chip(ctx, SA.x, SA.y + 142, k < 1 ? 'SKALA 1:1' : 'SKALA 1:340', { color: C.cyan, align: 'left', size: 24, dot: false, fam: MONO });
    chip(ctx, SA.x + SA.w, SA.y + 4, `BERAT ${mass}`, { color: C.green, dot: false, size: 28, fam: MONO });
  }
  const sceneChip = (ctx, t, label, color = C.amber, t0 = -1) => chip(ctx, SA.x + SA.w, SA.y + 70, label, { color, dot: false, size: 26, alpha: fade(t, t0, 0.2) });

  // ---------------- captions ----------------
  function captions(ctx, t) {
    const line = S.vo.find((l) => t >= l.t - 0.12 && t < l.end + 0.3);
    if (!line) return;
    const size = 52, maxW = SA.w - 70;
    const rows = []; let row = [];
    for (const w of line.words) { const test = row.concat(w).map((q) => q.w).join(' '); if (row.length && G.measure(ctx, test, size, SANS, 800) > maxW) { rows.push(row); row = [w]; } else row.push(w); }
    if (row.length) rows.push(row);
    const lh = size * 1.22, boxH = rows.length * lh + 44, y0 = SA.y + SA.h - boxH - 10;
    const a = Math.min(fade(t, line.t - 0.12, 0.12), 1 - fade(t, line.end + 0.15, 0.15));
    ctx.save(); ctx.globalAlpha *= a;
    rr(ctx, SA.x, y0, SA.w, boxH, 26); ctx.fillStyle = 'rgba(5,10,26,0.82)'; ctx.fill();
    rows.forEach((r, i) => {
      let x = CX - G.measure(ctx, r.map((q) => q.w).join(' '), size, SANS, 800) / 2;
      const y = y0 + 22 + lh * (i + 0.78);
      for (const w of r) { const said = t >= w.t, now = said && t < w.end; txt(ctx, w.w, x, y, { size, color: now ? C.amber : said ? C.white : 'rgba(238,242,248,0.42)' }); x += G.measure(ctx, w.w + ' ', size, SANS, 800); }
    });
    ctx.restore();
  }

  // ---------------- scenes ----------------
  function room(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 1100); g.addColorStop(0, '#2D3B6B'); g.addColorStop(1, '#46558A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1100);
    rr(ctx, 660, 760, 260, 200, 10); ctx.fillStyle = '#9FC4F0'; ctx.fill(); ctx.strokeStyle = '#E8EDF6'; ctx.lineWidth = 14; ctx.stroke();
    ctx.fillStyle = '#E8EDF6'; ctx.fillRect(784, 760, 12, 200); ctx.fillRect(660, 854, 260, 12);
    ctx.fillStyle = '#B98E63'; ctx.fillRect(0, 1100, W, H - 1100);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(90,60,30,0.25)'; ctx.fillRect(0, 1100 + i * 120, W, 4); }
    ctx.fillStyle = '#6B4A35'; ctx.fillRect(120, 900, 300, 30); ctx.fillRect(140, 930, 20, 200); ctx.fillRect(380, 930, 20, 200); // table
  }
  function hookScene(ctx, t) {
    room(ctx);
    const k = shrinkK(t), s = lerp(0.85, 0.02, ease.inCubic(k));
    if (t < ev.shrink) rafi(ctx, { x: 560, y: 1290, s: 0.85, eyes: t > 1.5 ? 'wide' : 'normal', brows: 'up', mouth: t > 1.5 ? 'o' : 'smile', look: -0.4, lookY: 0.6, gesture: t > 1.2 ? 'shrug' : null });
    else if (k < 1) rafi(ctx, { x: 560, y: 1290, s, rot: k * 6, eyes: 'wide', brows: 'up', mouth: 'open' });
    if (t >= ev.shrink) {
      // ZAP: rings + flash, then a magnifier circle on the dot he became
      const u = t - ev.shrink;
      for (let i = 0; i < 3; i++) { const r = (u * 900 + i * 90) % 700; ctx.strokeStyle = `rgba(92,200,255,${Math.max(0, 0.7 - r / 900)})`; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(560, 1250, r, 0, Math.PI * 2); ctx.stroke(); }
      const fl = Math.exp(-u * 10); ctx.fillStyle = `rgba(255,255,255,${0.75 * fl})`; ctx.fillRect(0, 0, W, H);
      if (k >= 1) {
        ctx.fillStyle = '#3A6FD8'; ctx.beginPath(); ctx.arc(560, 1284, 5, 0, Math.PI * 2); ctx.fill();
        const a = pop(t, ev.shrink + 0.6, 0.35);
        ctx.save(); ctx.globalAlpha *= clamp(a);
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(560, 1284, 46 * a, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(600, 1250); ctx.lineTo(720, 1130); ctx.stroke();
        rr(ctx, 650, 1060, 220, 70, 16); ctx.fillStyle = C.amber; ctx.fill();
        txt(ctx, 'ini kamu', 760, 1108, { size: 36, align: 'center', color: C.ink });
        ctx.restore();
      }
    }
    // title (the premise) until the zap
    const ta = pop(t, 0.15, 0.35) * (1 - fade(t, ev.shrink + 1.2, 0.3));
    if (ta > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(ta);
      txt(ctx, 'GIMANA KALAU KAMU', CX, SA.y + 290, { size: 44, align: 'center', color: C.amber, fam: MONO });
      txt(ctx, 'MENYUSUT SEUKURAN', CX, SA.y + 370, { size: 64, align: 'center' });
      txt(ctx, 'SEMUT?', CX, SA.y + 460, { size: 96, align: 'center', color: C.amber });
      ctx.restore();
    }
  }
  function nasiScene(ctx, t) {
    macroFloor(ctx, t);
    const s0 = S.S.nasi[0];
    // other grains lying around, crumbs
    riceGrain(ctx, 160, 1330, 420, 170, -1.45);
    riceGrain(ctx, 960, 1180, 380, 150, 1.5);
    // the upright grain, taller than him (8 mm vs 5 mm at 62 px/mm)
    const a = ease.outBack(clamp((t - s0 - 0.1) / 0.5), 1.4);
    riceGrain(ctx, 690, GROUND + 6, 500 * a, 190, 0.06);
    rafi(ctx, { x: 360, y: GROUND, s: 0.64, eyes: 'wide', brows: 'up', mouth: t > s0 + 2.5 ? 'o' : 'smile', look: 1, lookY: -0.8, headRot: -0.1, gesture: t > s0 + 2.2 ? 'pointUp' : null });
    scaleBar(ctx, 190, GROUND - 310, GROUND, '5 mm', '#3A6FD8');
    if (t > s0 + 2.4) scaleBar(ctx, 840, GROUND - 500, GROUND, '±8 mm', '#8A6F5A');
    sceneChip(ctx, t, '1 BUTIR NASI > KAMU', C.amber, s0 + 2.4);
  }
  function beratScene(ctx, t) {
    macroFloor(ctx, t, { top: '#C9CED8', bottom: '#AEB4C0' });
    const s0 = S.S.berat[0];
    // a kitchen scale's platform edge and its display
    ctx.fillStyle = '#E9ECF2'; ctx.fillRect(0, GROUND - 6, W, 70); ctx.fillStyle = '#C3C9D4'; ctx.fillRect(0, GROUND + 64, W, 20);
    rr(ctx, 120, 560, 520, 230, 30); ctx.fillStyle = '#2B3140'; ctx.fill();
    rr(ctx, 150, 590, 460, 170, 18); ctx.fillStyle = '#B9E8C3'; ctx.fill();
    const flick = Math.floor(t * 4) % 2;
    txt(ctx, flick ? '0,00 g' : '0,00 g', 380, 712, { size: 104, align: 'center', fam: MONO, color: '#1F3A2A' });
    txt(ctx, 'timbangan dapur', 380, 830, { size: 26, align: 'center', weight: 700, color: '#2B3140' });
    rafi(ctx, { x: 420, y: GROUND, s: 0.6, eyes: 'normal', brows: 'worried', mouth: 'wavy', gesture: 'shrug', look: -0.6, lookY: -0.6 });
    // a mosquito of about the same size hovers by
    const mx = lerp(1150, 800, ease.outCubic(clamp((t - s0 - 1.5) / 1.2))), my = 950 + Math.sin(t * 3) * 30;
    if (t > s0 + 1.5) { mosquito(ctx, mx, my, 1.0, t); chip(ctx, mx, my + 220, 'nyamuk ±2 mg', { color: C.cyan, dot: false, size: 24, align: 'center' }); }
    sceneChip(ctx, t, '65 kg ÷ 340³ ≈ 1,6 mg', C.green, s0 + 0.4);
  }
  function kucingScene(ctx, t) {
    const s0 = S.S.kucing[0], lean = ease.inOutQuad(clamp((t - s0) / 4.5));
    ctx.fillStyle = '#E9DCC8'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(540, 560 + lean * 60); const z = 1 + lean * 0.18; ctx.scale(z, z);
    // ears
    ctx.fillStyle = '#D9893F'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 200, -420); ctx.lineTo(sd * 520, -820); ctx.lineTo(sd * 560, -300); ctx.closePath(); ctx.fill(); }
    // face
    ctx.fillStyle = '#E8A15A'; ctx.beginPath(); ctx.ellipse(0, 0, 640, 560, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#C97A35'; for (const [x, y, r] of [[-120, -460, 0.2], [0, -480, 0], [120, -460, -0.2]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); rr(ctx, -22, 0, 44, 170, 22); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#F6E3C8'; ctx.beginPath(); ctx.ellipse(0, 330, 330, 240, 0, 0, Math.PI * 2); ctx.fill();
    // eyes with slit pupils (dilate as he gets closer), slow blink
    const bl = (() => { const p = (t - s0 - 2.6); return p > 0 && p < 0.35 ? Math.sin((p / 0.35) * Math.PI) : 0; })();
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(sd * 250, -40); ctx.scale(1, 1 - bl * 0.92);
      ctx.fillStyle = '#C9D84A'; ctx.beginPath(); ctx.ellipse(0, 0, 150, 120, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1A140C'; ctx.beginPath(); ctx.ellipse(0, 0, 18 + lean * 50, 112, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-40, -40, 22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#E58A8A'; ctx.beginPath(); ctx.moveTo(-50, 200); ctx.lineTo(50, 200); ctx.lineTo(0, 250); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8A5A35'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 250); ctx.lineTo(0, 290); ctx.moveTo(0, 290); ctx.quadraticCurveTo(-50, 330, -90, 300); ctx.moveTo(0, 290); ctx.quadraticCurveTo(50, 330, 90, 300); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5; for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sd * 140, 250 + i * 30); ctx.lineTo(sd * 600, 190 + i * 70); ctx.stroke(); }
    ctx.restore();
    // floor + tiny him
    ctx.fillStyle = '#B98E63'; ctx.fillRect(0, 1200, W, H - 1200);
    rafi(ctx, { x: 540, y: 1290, s: 0.2, eyes: 'wide', brows: 'up', mouth: 'o', lookY: -1, gesture: t > s0 + 2 ? 'cheer' : null });
    // a building-height comparison
    const a = fade(t, s0 + 1.8);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha *= a;
      rr(ctx, 700, 980, 240, 220, 18); ctx.fillStyle = 'rgba(8,16,38,0.86)'; ctx.fill();
      ctx.fillStyle = '#9FB3D9'; ctx.fillRect(740, 1010, 50, 160);
      for (let i = 0; i < 7; i++) { ctx.fillStyle = '#2B3A66'; ctx.fillRect(748, 1020 + i * 21, 12, 10); ctx.fillRect(770, 1020 + i * 21, 12, 10); }
      txt(ctx, '±85 m', 860, 1080, { size: 32, align: 'center', fam: MONO });
      txt(ctx, '≈25', 860, 1126, { size: 32, align: 'center', fam: MONO, color: C.amber });
      txt(ctx, 'lantai', 860, 1160, { size: 24, align: 'center', weight: 700 });
      ctx.restore();
    }
    sceneChip(ctx, t, 'KUCING ±25 cm × 340', C.amber, s0 + 0.3);
  }
  // the fall: a building facade, he steps off the 10th floor and floats down at a walking pace
  const FLOOR = 300, BOTTOM = 10 * FLOOR;
  function worldY(t) { if (t < ev.stepOff) return 0; return BOTTOM * clamp((t - ev.stepOff) / (ev.land - ev.stepOff)); }
  function jatuhScene(ctx, t) {
    const wy = worldY(t), cam = Math.min(wy, BOTTOM - 480);
    const toScreen = (y) => y - cam + 800;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5FA8E8'); g.addColorStop(1, '#BFE3FF'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; const y = ((hsh(i, 1) * 3000 - cam * 0.3) % 2000 + 2000) % 2000 - 100; ctx.beginPath(); ctx.ellipse(700 + hsh(i, 2) * 400, y, 120, 40, 0, 0, Math.PI * 2); ctx.fill(); }
    // facade
    ctx.fillStyle = '#C9B8A6'; ctx.fillRect(0, toScreen(-200), 600, BOTTOM + 400);
    for (let f = 0; f <= 10; f++) {
      const y = toScreen(BOTTOM - f * FLOOR);
      if (y < -400 || y > H + 400) continue;
      ctx.fillStyle = '#9C8B7A'; ctx.fillRect(0, y - 14, 680, 18); // balcony slab
      ctx.fillStyle = '#7D93B8'; for (const x of [60, 250, 430]) ctx.fillRect(x, y - FLOOR + 60, 120, 180);
      if (f > 0) { rr(ctx, 450, y - FLOOR + 10, 130, 40, 10); ctx.fillStyle = 'rgba(8,16,38,0.8)'; ctx.fill(); txt(ctx, `LT ${f}`, 515, y - FLOOR + 40, { size: 24, align: 'center', fam: MONO }); }
    }
    // ground
    const gy = toScreen(BOTTOM);
    if (gy < H) { ctx.fillStyle = '#6E9C55'; ctx.fillRect(0, gy, W, H - gy + 10); ctx.fillStyle = '#5B8746'; for (let i = 0; i < 30; i++) ctx.fillRect(hsh(i, 5) * W, gy, 6, -10 - hsh(i, 6) * 20); }
    // him
    const landed = t >= ev.land;
    const x = t < ev.stepOff ? 640 : lerp(640, 760, clamp((t - ev.stepOff) / 0.4));
    const y = toScreen(wy) + (landed ? 0 : -6);
    const mood = t < ev.stepOff ? { eyes: 'normal', brows: 'up', mouth: 'wavy', look: 0.6, lookY: 1 }
      : landed ? { eyes: 'happy', brows: 'neutral', mouth: 'grin', gesture: 'thumbsUp' }
        : { eyes: 'happy', brows: 'neutral', mouth: 'smile', gesture: 'cheer', rot: Math.sin(t * 2) * 0.15 };
    rafi(ctx, Object.assign({ x, y, s: 0.5 }, mood));
    if (landed) { const u = t - ev.land; ctx.fillStyle = `rgba(200,190,170,${Math.max(0, 0.7 - u)})`; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sd * (60 + u * 120), y - 10, 26 + u * 20, 0, Math.PI * 2); ctx.fill(); } }
    if (t >= ev.stepOff) {
      chip(ctx, SA.x + SA.w, SA.y + 70, 'KAMU: ±6 km/jam', { color: C.green, dot: false, size: 26 });
      chip(ctx, SA.x + SA.w, SA.y + 134, 'ORANG BIASA: ±200 km/jam', { color: C.red, dot: false, size: 22 });
    } else sceneChip(ctx, t, 'LANTAI 10', C.amber);
    if (landed) badge(ctx, t, ev.land + 0.15, 'SELAMAT ✓', 'kecepatan jatuh maks. setara orang jalan kaki', C.green, SA.y + 260);
  }
  function kuatScene(ctx, t) {
    macroFloor(ctx, t);
    const s0 = S.S.kuat[0], lifted = t >= ev.lift;
    const up = lifted ? ease.outBack(clamp((t - ev.lift) / 0.35), 1.5) : 0;
    const x = 430;
    rafi(ctx, Object.assign({ x, y: GROUND, s: 0.6, sy: lifted ? 1 : 0.92 }, lifted ? { eyes: 'focus', brows: 'determined', mouth: 'grin', gesture: 'cheer' } : { eyes: 'focus', brows: 'determined', mouth: 'flat', handL: [-70, -150], handR: [70, -150] }));
    // the grain, lying across his hands
    const gy = lerp(GROUND - 90, GROUND - 350, up);
    riceGrain(ctx, x - 250, gy, 500, 180, Math.PI / 2);
    if (lifted) badge(ctx, t, ev.lift + 0.2, 'KEKUATAN ∝ L²  ·  BERAT ∝ L³', 'makin kecil, makin kuat dibanding berat badan', C.amber, SA.y + 260);
    // an ant strolls by carrying a crumb
    if (t > s0 + 3) ant(ctx, lerp(1250, 820, clamp((t - s0 - 3) / 2.5)), GROUND + 20, 0.9, t, -1, '#C98A4A');
    sceneChip(ctx, t, 'HUKUM KUBIK-KUADRAT', C.amber, s0 + 0.3);
  }
  function dinginScene(ctx, t) {
    macroFloor(ctx, t, { tint: 'rgba(60,120,220,0.28)' });
    const s0 = S.S.dingin[0];
    // a crumb pile
    for (let i = 0; i < 7; i++) { ctx.fillStyle = ['#D9A35A', '#C98A4A', '#E2B46C'][i % 3]; rr(ctx, 600 + hsh(i, 1) * 280, GROUND - 60 - hsh(i, 2) * 160, 110 + hsh(i, 3) * 70, 90, 20); ctx.fill(); }
    const shiver = Math.sin(t * 60) * 4;
    const eating = t > s0 + 1.8;
    const bite = eating ? Math.abs(Math.sin((t - s0) * Math.PI * 2)) : 0;
    rafi(ctx, Object.assign({ x: 380 + shiver, y: GROUND, s: 0.6 }, eating ? { eyes: 'normal', brows: 'worried', mouth: bite > 0.5 ? 'open' : 'flat', handR: [20, -360 + bite * 30], handL: [-60, -300] } : { eyes: 'normal', brows: 'worried', mouth: 'wavy', crossArms: true }));
    if (eating) { ctx.fillStyle = '#D9A35A'; rr(ctx, 380 + shiver + 2, GROUND - 0.6 * 360 + bite * 18 - 30, 40, 30, 8); ctx.fill(); }
    // breath puffs
    for (let i = 0; i < 3; i++) { const u = ((t * 0.8 + i / 3) % 1); ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - u)})`; ctx.beginPath(); ctx.arc(430 + u * 80, GROUND - 270 - u * 60, 12 + u * 20, 0, Math.PI * 2); ctx.fill(); }
    const snacks = eating ? Math.floor((t - s0 - 1.8) / BEAT) + 1 : 0;
    sceneChip(ctx, t, `CAMILAN KE-${snacks}`, C.amber, s0 + 1.8);
    badge(ctx, t, s0 + 0.4, 'PERMUKAAN / VOLUME × 340', 'mamalia terkecil (±1,8 g) makan 1,5–2× berat badannya/hari', C.cyan, SA.y + 260);
  }
  function hujanScene(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, 1000); g.addColorStop(0, '#5D6B80'); g.addColorStop(1, '#9AA6B8'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5B4632'; ctx.fillRect(0, GROUND, W, H - GROUND);
    // giant grass blades
    for (let i = 0; i < 9; i++) { const x = 40 + i * 125 + hsh(i, 1) * 40, h = 500 + hsh(i, 2) * 500, sw = Math.sin(t * 1.5 + i) * 30; ctx.fillStyle = i % 2 ? '#4E8A3A' : '#5FA046'; ctx.beginPath(); ctx.moveTo(x - 26, GROUND); ctx.quadraticCurveTo(x + sw * 0.3, GROUND - h * 0.6, x + sw, GROUND - h); ctx.quadraticCurveTo(x + 10 + sw * 0.3, GROUND - h * 0.6, x + 26, GROUND); ctx.closePath(); ctx.fill(); }
    // background drops (2 mm = 124 px at 62 px/mm) falling and splashing
    for (let i = 0; i < 6; i++) {
      const t0 = S.S.hujan[0] + 0.3 + i * 0.37 * 2.3, x = 120 + ((i * 263) % 860);
      if (Math.abs(x - 520) < 160) continue;
      const u = (t - (t0 - 0.6)) / 0.6;
      if (u > 0 && u < 1) fallingDrop(ctx, x, lerp(-100, GROUND - 60, u), 62);
      if (u >= 1 && u < 1.6) { const k = (u - 1) / 0.6; ctx.strokeStyle = `rgba(200,230,255,${1 - k})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, GROUND, 60 + k * 120, 16 + k * 20, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    const hit = t >= ev.splash, u = t - ev.splash;
    const knocked = hit && u < 1.0;
    rafi(ctx, Object.assign({ x: 520, y: GROUND, s: 0.6 }, knocked ? { rot: -1.2 * Math.exp(-Math.max(0, u - 0.4) * 2), sy: 0.85, eyes: 'closed', brows: 'worried', mouth: 'wavy' } : hit ? { eyes: 'normal', brows: 'worried', mouth: 'wavy', gesture: 'shrug' } : { eyes: 'wide', brows: 'up', mouth: 'o', lookY: -1 }));
    if (!hit) { const d = clamp((t - (ev.splash - 0.7)) / 0.7); if (d > 0) fallingDrop(ctx, 520, lerp(-150, GROUND - 330, d), 72); }
    else if (u < 0.8) { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI, r = 60 + u * 420; ctx.fillStyle = `rgba(190,230,255,${1 - u / 0.8})`; ctx.beginPath(); ctx.arc(520 + Math.cos(a) * r, GROUND - 200 - Math.sin(a) * r * 0.7, 18, 0, Math.PI * 2); ctx.fill(); } }
    if (hit && !knocked) { ctx.strokeStyle = 'rgba(140,200,255,0.8)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(520, GROUND - 170, 110, 190, 0, 0, Math.PI * 2); ctx.stroke(); } // wet film around him
    sceneChip(ctx, t, '1 TETES ≈ 2,5× BERATMU', C.cyan, S.S.hujan[0] + 0.3);
    if (hit) badge(ctx, t, ev.splash + 0.3, 'SELAMAT… TAPI BASAH', 'nyamuk seberat kamu juga selamat ditabrak hujan', C.green, SA.y + 260);
  }
  function leaf(ctx) {
    ctx.fillStyle = '#2F5E3A'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4E9A4E'; ctx.fillRect(0, 980, W, H);
    ctx.strokeStyle = 'rgba(200,240,190,0.45)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-50, 1500); ctx.quadraticCurveTo(540, 1250, 1130, 1050); ctx.stroke();
    ctx.lineWidth = 5; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(i * 200, 1500 - i * 70); ctx.lineTo(i * 200 + 140, 990); ctx.stroke(); }
  }
  function stuck(ctx, t, t0) { // him half inside the drop, struggling
    const u = t - t0;
    rafi(ctx, { x: 640, y: GROUND - 20, s: 0.6, rot: -0.5 + Math.sin(t * 9) * 0.12, eyes: 'wide', brows: 'worried', mouth: 'open', gesture: 'cheer', sweat: 0.6 });
    waterDrop(ctx, 760, GROUND, 330, 300, Math.sin(t * 12) * Math.exp(-u * 1.5));
    for (let i = 0; i < 5; i++) { const k = ((t * 0.7 + i / 5) % 1); ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(650 + i * 40, GROUND - 120 - k * 200, 10 + i * 2, 0, Math.PI * 2); ctx.stroke(); }
  }
  function terjebakScene(ctx, t) {
    leaf(ctx);
    const s0 = S.S.terjebak[0];
    if (t < ev.blup) {
      waterDrop(ctx, 760, GROUND, 330, 300);
      const walk = clamp((t - s0) / 1.5);
      const x = lerp(220, 410, walk), lean = clamp((t - (ev.blup - 0.6)) / 0.5);
      rafi(ctx, Object.assign({ x, y: GROUND, s: 0.6, rot: lean * 0.45 }, walk < 1 ? { pose: 'walk', walk: t * 1.6, eyes: 'happy', brows: 'neutral', mouth: 'smile' } : { eyes: 'normal', brows: 'neutral', mouth: 'o', handR: [140, -200] }));
    } else stuck(ctx, t, ev.blup);
    sceneChip(ctx, t, 'TEGANGAN PERMUKAAN', C.cyan, s0 + 0.3);
    if (t >= ev.blup + 0.6) badge(ctx, t, ev.blup + 0.6, '“Serangga yang mau minum…', '…sama bahayanya dengan manusia di tepi jurang.” — Haldane, 1926', C.amber, SA.y + 260);
  }
  function twistScene(ctx, t) {
    leaf(ctx);
    ctx.fillStyle = 'rgba(5,10,26,0.35)'; ctx.fillRect(0, 0, W, H);
    stuck(ctx, t, S.S.twist[0] - 5);
    const card = (t0, y, title, sub, color, mark) => {
      const a = pop(t, t0, 0.3); if (a <= 0) return;
      ctx.save(); ctx.translate(CX, y); ctx.scale(a, a);
      rr(ctx, -440, -70, 880, 140, 24); ctx.fillStyle = 'rgba(8,16,38,0.92)'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = color; ctx.stroke();
      txt(ctx, mark, -370, 30, { size: 90, align: 'center', color });
      txt(ctx, title, -300, -6, { size: 40, color });
      txt(ctx, sub, -300, 40, { size: 28, weight: 700 });
      ctx.restore();
    };
    card(ev.card1, SA.y + 120, 'JATUH DARI LANTAI 10', 'selamat, santai kayak jalan kaki', C.green, '✓');
    card(ev.card2, SA.y + 300, 'SETETES AIR', 'terjebak, nggak bisa keluar', C.red, '✗');
  }
  function ctaScene(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060E22'); g.addColorStop(1, '#13244A'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const k = 1 + 0.4 * Math.exp(-(t - ev.cta) * 14);
    ctx.save(); ctx.translate(CX, SA.y + 130); ctx.scale(k, k);
    txt(ctx, 'KAMU PILIH', 0, 0, { size: 84, align: 'center' });
    ctx.restore();
    const opt = (t0, y, letter, label, color) => {
      const a = pop(t, t0, 0.3); if (a <= 0) return;
      ctx.save(); ctx.translate(CX, y); ctx.scale(a, a);
      rr(ctx, -400, -70, 800, 140, 70); ctx.fillStyle = hexA(color, 0.18); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = color; ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(-320, 0, 48, 0, Math.PI * 2); ctx.fill();
      txt(ctx, letter, -320, 22, { size: 60, align: 'center', color: C.ink });
      txt(ctx, label, -240, 22, { size: 58 });
      ctx.restore();
    };
    opt(ev.cta + 0.3, SA.y + 300, 'A', 'TETAP KECIL', C.cyan);
    opt(ev.cta + 0.8, SA.y + 480, 'B', 'BALIK NORMAL', C.amber);
    const a = fade(t, ev.cta + 2.0);
    if (a > 0) {
      const b = Math.abs(Math.sin((t - ev.cta) * 5)) * 12;
      txt(ctx, 'TULIS DI KOMEN', CX, SA.y + 660, { size: 56, align: 'center', color: C.green, alpha: a });
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = C.green; ctx.beginPath(); ctx.moveTo(CX - 26, SA.y + 690 + b); ctx.lineTo(CX + 26, SA.y + 690 + b); ctx.lineTo(CX, SA.y + 724 + b); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    rafi(ctx, { x: 220, y: SA.y + 1000, s: 0.42, eyes: 'happy', brows: 'neutral', mouth: 'grin', gesture: 'wave' });
    rafi(ctx, { x: 820, y: SA.y + 1000, s: 0.07, eyes: 'happy', mouth: 'grin' });
    chip(ctx, 820, SA.y + 1010, 'kamu, versi semut', { color: C.cyan, dot: false, size: 22, align: 'center' });
  }
  function sumberScene(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060E22'); g.addColorStop(1, '#13244A'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const s0 = ev.sumber;
    ctx.save(); ctx.globalAlpha *= clamp((t - s0) / 0.35);
    txt(ctx, 'SUMBER & REFERENSI', SA.x, SA.y + 50, { size: 44, color: C.amber, fam: MONO });
    let y = SA.y + 118;
    S.SOURCES.forEach(([claim, cite], i) => {
      ctx.save(); ctx.globalAlpha *= fade(t, s0 + 0.2 + i * 0.15, 0.25);
      for (const r of wrap(ctx, `${i + 1}. ${claim}`, 34, SA.w - 10, 800)) { txt(ctx, r, SA.x, y, { size: 34 }); y += 42; }
      for (const r of wrap(ctx, cite, 27, SA.w - 30)) { txt(ctx, r, SA.x + 30, y, { size: 27, weight: 700, color: 'rgba(238,242,248,0.78)' }); y += 35; }
      y += 22;
      ctx.restore();
    });
    ctx.save(); ctx.globalAlpha *= fade(t, s0 + 1.2);
    rr(ctx, SA.x, y, SA.w, 140, 18); ctx.fillStyle = 'rgba(255,181,71,0.12)'; ctx.fill(); ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.stroke();
    let yy = y + 40;
    for (const r of wrap(ctx, 'Catatan: berat badan, tinggi kucing & berat tetes hujan = hitungan sendiri dengan skala 1:340 (kepadatan tubuh sama), dibulatkan.', 27, SA.w - 40)) { txt(ctx, r, SA.x + 20, yy, { size: 27, weight: 700, color: C.amber }); yy += 34; }
    ctx.restore();
    ctx.restore();
  }

  const SCENES = [['hook', hookScene], ['nasi', nasiScene], ['berat', beratScene], ['kucing', kucingScene], ['jatuh', jatuhScene], ['kuat', kuatScene], ['dingin', dinginScene], ['hujan', hujanScene], ['terjebak', terjebakScene], ['twist', twistScene], ['cta', ctaScene], ['sumber', sumberScene]];
  const NO_HUD = new Set(['cta', 'sumber']);

  Studio.film({
    draw(ctx, t) {
      const sc = SCENES.find(([k]) => inS(t, S.S[k])) || SCENES[SCENES.length - 1];
      let shake = 0;
      for (const h of [ev.shrink, ev.lift, ev.splash, ev.blup, ev.card2, ev.cta]) if (t >= h) shake = Math.max(shake, 16 * Math.exp(-(t - h) * 9));
      ctx.save(); ctx.translate(U.noise1(t * 40, 1) * shake, U.noise1(t * 40, 2) * shake);
      sc[1](ctx, t);
      ctx.restore();
      if (!NO_HUD.has(sc[0]) && sc[0] !== 'twist') hud(ctx, t);
      if (sc[0] !== 'sumber') captions(ctx, t);
    },
    post: { paper: 0, vignette: 0.3, grain: 0.03 },
  });
})();
