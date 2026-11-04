// THE FILM — "Gimana kalau internet Indonesia mati 24 jam?"  (9:16, dark-navy minimal 3D look:
// white mannequin figures, status chips, a big HUD clock). Every frame is a pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio, Data = globalThis.Data;
  const { BEAT, ev, clock, T } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H, SA = G.SAFE;
  const CX = SA.x + SA.w / 2; // centre of the safe column
  const STAGE = { y0: 500, y1: 1265 };
  const C = {
    bg0: '#060E22', bg1: '#13244A', floor: '#0E1C3C', grid: 'rgba(110,160,255,0.13)',
    white: '#EEF2F8', shade: '#AAB6CA', joint: '#7D8BA6', ink: '#0A1430',
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

  function chip(ctx, x, y, label, { color = C.red, dot = true, align = 'right', size = 30, alpha = 1, bg = 'rgba(8,16,38,0.82)' } = {}) {
    const wText = G.measure(ctx, label, size, SANS, 800);
    const w = wText + (dot ? 64 : 40), h = size + 26;
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.save(); ctx.globalAlpha *= alpha;
    rr(ctx, x0, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke();
    if (dot) { ctx.beginPath(); ctx.arc(x0 + 30, y + h / 2, 9, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
    txt(ctx, label, x0 + (dot ? 50 : 20), y + h / 2 + size * 0.36, { size, color: C.white });
    ctx.restore();
    return w;
  }

  // dark navy room with a perspective floor grid (the "minimal 3D" look)
  function room(ctx, t, { horizon = 900, warm = 0, night = 0 } = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const top = warm ? mixHex('#060E22', '#3B2346', warm) : C.bg0;
    const mid = warm ? mixHex('#13244A', '#B8645A', warm) : C.bg1;
    g.addColorStop(0, top); g.addColorStop(horizon / H, mid); g.addColorStop(1, warm ? mixHex(C.floor, '#5A3346', warm) : C.floor);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // floor
    ctx.fillStyle = warm ? mixHex('#0E1C3C', '#4A2E3E', warm) : '#0C1936';
    ctx.fillRect(0, horizon, W, H - horizon);
    ctx.save();
    ctx.strokeStyle = warm ? `rgba(255,190,150,${0.14})` : C.grid; ctx.lineWidth = 2;
    const vx = W / 2;
    for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(vx, horizon); ctx.lineTo(vx + i * 170, H + 400); ctx.stroke(); }
    const drift = (t * 0.25) % 1;
    for (let k = 0; k < 14; k++) {
      const u = (k + drift) / 14; const y = horizon + Math.pow(u, 2.2) * (H - horizon + 300);
      ctx.globalAlpha = 0.25 + 0.75 * u; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
    // horizon glow
    const hg = ctx.createLinearGradient(0, horizon - 120, 0, horizon + 40);
    hg.addColorStop(0, 'rgba(92,200,255,0)'); hg.addColorStop(1, warm ? 'rgba(255,170,120,0.22)' : 'rgba(92,200,255,0.10)');
    ctx.fillStyle = hg; ctx.fillRect(0, horizon - 120, W, 160);
    if (night) { ctx.fillStyle = `rgba(2,4,12,${night})`; ctx.fillRect(0, 0, W, H); }
  }
  function mixHex(a, b, k) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
  }

  // ---------------- the mannequin ----------------
  const ik = (S0, P, l1, l2, bend) => {
    let dx = P[0] - S0[0], dy = P[1] - S0[1]; let d = Math.hypot(dx, dy);
    const dd = clamp(d, 1, l1 + l2 - 0.5);
    const a = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const base = Math.atan2(dy, dx);
    const E = [S0[0] + l1 * Math.cos(base + bend * a), S0[1] + l1 * Math.sin(base + bend * a)];
    const Hn = [S0[0] + (dx / d) * dd, S0[1] + (dy / d) * dd];
    return [E, Hn];
  };
  function limb(ctx, pts, w, s) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.strokeStyle = C.joint; ctx.lineWidth = (w + 5) * s; ctx.stroke();
    ctx.strokeStyle = C.white; ctx.lineWidth = w * s; ctx.stroke();
    ctx.fillStyle = C.joint; ctx.beginPath(); ctx.arc(pts[1][0], pts[1][1], w * 0.28 * s, 0, Math.PI * 2); ctx.fill();
  }
  // o: {x, y (feet, or seat when sitting), s, face: 1|-1, pose: 'stand'|'sit'|'walk', walk, handF, handB ([dx,dy] from that shoulder, unit px),
  //     phone: 'F'|'B'|null, screen: colour|null, tilt (head), lean, alpha, bob}
  function mannequin(ctx, o) {
    const s = o.s || 1, f = o.face || 1, x = o.x, y = o.y;
    const sit = o.pose === 'sit';
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    // shadow
    const fy = sit ? y + 70 * s : y;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + (sit ? f * 30 * s : 0), fy + 4 * s, 46 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
    const hipY = sit ? y : y - 140 * s - (o.bob || 0) * s;
    const lean = (o.lean || 0) * s;
    const hip = [x, hipY], sh = [x + lean, hipY - 92 * s];
    // legs
    const legs = [];
    if (sit) {
      legs.push([[x - f * 8 * s, hipY], [x + f * 58 * s, hipY - 4 * s], [x + f * 62 * s, hipY + 68 * s]]);
      legs.push([[x + f * 6 * s, hipY], [x + f * 64 * s, hipY + 2 * s], [x + f * 70 * s, hipY + 70 * s]]);
    } else {
      const ph = o.pose === 'walk' ? o.walk || 0 : null;
      for (const side of [-1, 1]) {
        const hx = x + side * 13 * s;
        if (ph == null) legs.push([[hx, hipY], [hx + side * 2 * s, hipY + 70 * s], [hx + side * 4 * s, y]]);
        else {
          const a = Math.sin(ph * Math.PI * 2 + (side > 0 ? 0 : Math.PI)) * 0.42;
          const k = [hx + Math.sin(a) * 70 * s * f, hipY + Math.cos(a) * 70 * s];
          const bend = Math.max(0, -Math.sin(ph * Math.PI * 2 + (side > 0 ? 0 : Math.PI))) * 0.5;
          legs.push([[hx, hipY], k, [k[0] + Math.sin(a - bend) * 68 * s * f, Math.min(y, k[1] + Math.cos(a - bend) * 68 * s)]]);
        }
      }
    }
    const shB = [sh[0] - f * 28 * s, sh[1] + 6 * s], shF = [sh[0] + f * 28 * s, sh[1] + 6 * s];
    const hand = (S0, d) => [S0[0] + d[0] * s * f, S0[1] + d[1] * s];
    const HB = hand(shB, o.handB || [-6, 96]), HF = hand(shF, o.handF || [6, 96]);
    const [EB, HB2] = ik(shB, HB, 52 * s, 50 * s, f > 0 ? 1 : -1);
    const [EF, HF2] = ik(shF, HF, 52 * s, 50 * s, f > 0 ? 1 : -1);
    // back arm, back leg first
    limb(ctx, [shB, EB, HB2], 15, s);
    if (o.phone === 'B') phone(ctx, HB2, s, o.screen);
    limb(ctx, legs[0], 21, s);
    // torso
    ctx.beginPath();
    ctx.moveTo(sh[0] - 33 * s, sh[1] + 2 * s);
    ctx.quadraticCurveTo(sh[0], sh[1] - 10 * s, sh[0] + 33 * s, sh[1] + 2 * s);
    ctx.quadraticCurveTo(sh[0] + 30 * s, sh[1] + 50 * s, x + 22 * s, hipY - 10 * s);
    ctx.quadraticCurveTo(x + 27 * s, hipY + 8 * s, x, hipY + 12 * s);
    ctx.quadraticCurveTo(x - 27 * s, hipY + 8 * s, x - 22 * s, hipY - 10 * s);
    ctx.quadraticCurveTo(sh[0] - 30 * s, sh[1] + 50 * s, sh[0] - 33 * s, sh[1] + 2 * s);
    const tg = ctx.createLinearGradient(sh[0] - 33 * s * f, 0, sh[0] + 33 * s * f, 0);
    tg.addColorStop(0, C.white); tg.addColorStop(1, C.shade);
    ctx.fillStyle = tg; ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = C.joint; ctx.stroke();
    limb(ctx, legs[1], 21, s);
    // neck + head
    const tilt = o.tilt || 0;
    const hc = [sh[0] + Math.sin(tilt) * 34 * s, sh[1] - Math.cos(tilt) * 34 * s - 4 * s];
    ctx.strokeStyle = C.shade; ctx.lineWidth = 13 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(lerp(sh[0], hc[0], 0.6), lerp(sh[1], hc[1], 0.6)); ctx.stroke();
    ctx.save(); ctx.translate(hc[0], hc[1]); ctx.rotate(tilt);
    const hg = ctx.createRadialGradient(-8 * s * f, -10 * s, 4 * s, 0, 0, 30 * s);
    hg.addColorStop(0, '#FFFFFF'); hg.addColorStop(1, C.shade);
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 0, 22 * s, 27 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3 * s; ctx.strokeStyle = C.joint; ctx.stroke();
    if (o.screen) { // phone light on the face
      const lg = ctx.createRadialGradient(f * 14 * s, 10 * s, 2, f * 14 * s, 10 * s, 30 * s);
      lg.addColorStop(0, hexA(o.screen, 0.55)); lg.addColorStop(1, hexA(o.screen, 0));
      ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(0, 0, 22 * s, 27 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // front arm
    limb(ctx, [shF, EF, HF2], 15, s);
    if (o.phone === 'F') phone(ctx, HF2, s, o.screen);
    ctx.restore();
  }
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
  function phone(ctx, p, s, screen) {
    const w = 18 * s, h = 32 * s;
    ctx.save(); ctx.translate(p[0], p[1] - h * 0.55);
    if (screen) { const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 60 * s); g.addColorStop(0, hexA(screen, 0.45)); g.addColorStop(1, hexA(screen, 0)); ctx.fillStyle = g; ctx.fillRect(-60 * s, -60 * s, 120 * s, 120 * s); }
    rr(ctx, -w / 2, -h / 2, w, h, 4 * s); ctx.fillStyle = '#1A2238'; ctx.fill();
    rr(ctx, -w / 2 + 2.5 * s, -h / 2 + 3 * s, w - 5 * s, h - 6 * s, 2 * s); ctx.fillStyle = screen || '#0B1020'; ctx.fill();
    ctx.restore();
  }

  // ---------------- the cast (expressive rigged characters; no names are ever shown) ----------------
  const STY = {
    rafi: { skin: '#C68B59', hair: '#1B1310', hairStyle: 'quiff', outfit: 'tee', shirt: '#3A6FD8', bottoms: 'pants', shorts: '#2B3140', build: 'slim' },
    driver: { skin: '#A86F45', hair: '#1B1310', hairStyle: 'short', outfit: 'hoodie', shirt: '#2FB36B', trim: '#1E7D49', bottoms: 'pants', shorts: '#2B3140', headwear: 'cap', headwearColor: '#2FB36B', facialHair: 'stubble' },
    ibu: { skin: '#B97A4F', hairStyle: 'hijab', hijab: '#8E2C48', outfit: 'dress', shirt: '#E9A23B', build: 'heavy' },
    dina: { skin: '#D9A07A', hair: '#2A1A14', hairStyle: 'ponytail', outfit: 'hoodie', shirt: '#F2F2F2', trim: '#5CC8FF', bottoms: 'pants', shorts: '#3B4A6B', glasses: 'round' },
    bapak: { skin: '#9C6440', hair: '#D8D8D8', hairStyle: 'short', facialHair: 'mustache', outfit: 'shirt', shirt: '#7A4A2A', collar: '#5A3520', bottoms: 'pants', shorts: '#2B2B2B', headwear: 'topi', headwearColor: '#151515' },
  };
  const SKINS = ['#C68B59', '#A86F45', '#D9A07A', '#9C6440', '#B97A4F', '#E0B08A'];
  const SHIRTS = ['#3A6FD8', '#E2574C', '#2FB36B', '#E9A23B', '#8E5AC8', '#F2F2F2', '#1F8A8A', '#D9487E', '#5C6B8A'];
  const HAIRS = ['quiff', 'short', 'buzz', 'long', 'ponytail', 'hijab', 'curly', 'bun', 'short', 'hijab'];
  const CROWD = Array.from({ length: 40 }, (_, i) => {
    const hs = HAIRS[Math.floor(hsh(i, 1) * HAIRS.length)];
    const outfit = ['tee', 'shirt', 'hoodie', 'tee'][Math.floor(hsh(i, 2) * 4)];
    return { skin: SKINS[Math.floor(hsh(i, 3) * SKINS.length)], hair: hsh(i, 4) > 0.85 ? '#5A3A22' : '#1B1310', hairStyle: hs,
      hijab: SHIRTS[Math.floor(hsh(i, 5) * SHIRTS.length)], outfit, shirt: SHIRTS[Math.floor(hsh(i, 6) * SHIRTS.length)],
      bottoms: hs === 'hijab' && hsh(i, 7) > 0.5 ? 'skirt' : 'pants', shorts: ['#2B3140', '#3B4A6B', '#4A3A2A'][Math.floor(hsh(i, 8) * 3)],
      glasses: hsh(i, 9) > 0.82 ? 'square' : 'none', facialHair: hs === 'short' && hsh(i, 10) > 0.6 ? 'stubble' : 'none' };
  });
  const blinkAt = (t, k) => { const p = (t + hsh(k, 11) * 5) % 3.3; return p < 0.14 ? Math.sin((p / 0.14) * Math.PI) : 0; };
  // person: Ch.person + automatic blinking and breathing. style: a key of STY, a CROWD index, or an object
  function person(ctx, o) {
    const k = o.k || 1;
    const st = typeof o.style === 'string' ? STY[o.style] : typeof o.style === 'number' ? CROWD[o.style % CROWD.length] : o.style;
    const eyesClosed = o.eyes === 'happy' || o.eyes === 'closed' || o.eyes === 'sleep';
    const q = Object.assign({ pose: 'stand', mouth: 'flat', blink: eyesClosed ? 0 : blinkAt(G.t, k), sy: 1 + 0.012 * Math.sin(G.t * 2.4 + k), seed: 300 + k * 17 }, o, { style: st });
    delete q.k;
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    Ch.person(ctx, q);
    if (o.glow) { // the phone lights the face and hand
      const seated = q.pose === 'sit';
      const hx = o.x + 26 * o.s, hy = o.y + (seated ? -98 : -248) * o.s;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(hx, hy - 60 * o.s, 4, hx, hy - 60 * o.s, 190 * o.s);
      g.addColorStop(0, hexA(o.glow, 0.35)); g.addColorStop(1, hexA(o.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(hx - 200 * o.s, hy - 260 * o.s, 400 * o.s, 400 * o.s);
      ctx.restore();
    }
    ctx.restore();
  }

  // an isometric-ish box (tables, counters, ATMs) with three shaded faces
  function box(ctx, x, y, w, h, d, { top = '#2C3F6E', front = '#1E2E55', side = '#16244A' } = {}) {
    // (x, y) = front-bottom-left corner; d = depth going up-right
    const dx = d * 0.6, dy = -d * 0.45;
    ctx.fillStyle = front; ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + dx, y - h + dy); ctx.lineTo(x + w + dx, y - h + dy); ctx.lineTo(x + w, y - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = side; ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + dx, y + dy); ctx.lineTo(x + w + dx, y - h + dy); ctx.lineTo(x + w, y - h); ctx.closePath(); ctx.fill();
  }

  // ---------------- HUD ----------------
  function hud(ctx, t) {
    const v = S.clockAt(t);
    const changed = (() => { let last = 0; for (const s of ['blackout', 'online']) if (t >= ev[s]) last = Math.max(last, ev[s]); for (const k of ['wifi', 'ojol', 'qris', 'siang', 'maps', 'tunggu']) if (t >= S.S[k][0]) last = Math.max(last, S.S[k][0]); return last; })();
    const k = 1 + 0.12 * Math.exp(-(t - changed) * 10) * (t >= changed ? 1 : 0);
    const off = t >= ev.blackout && t < ev.online;
    const col = off ? C.red : C.green;
    txt(ctx, 'JAM', SA.x, SA.y + 34, { size: 26, fam: MONO, weight: 700, color: C.amber });
    ctx.save(); ctx.translate(SA.x, SA.y + 128); ctx.scale(k, k);
    txt(ctx, v, 0, 0, { size: 92, fam: MONO, weight: 800, color: C.white });
    ctx.restore();
    // 24h progress bar
    const bx = SA.x, by = SA.y + 160, bw = 560, bh = 10;
    rr(ctx, bx, by, bw, bh, 5); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    const u = S.hoursAt(t) / 24;
    if (u > 0) { rr(ctx, bx, by, Math.max(bh, bw * u), bh, 5); ctx.fillStyle = off ? C.amber : C.green; ctx.fill(); }
    for (const h of [0, 6, 12, 18, 24]) txt(ctx, String(h), bx + (bw * h) / 24, by + 44, { size: 22, fam: MONO, weight: 700, color: C.dim, align: h === 0 ? 'left' : h === 24 ? 'right' : 'center' });
    chip(ctx, SA.x + SA.w, SA.y + 4, off ? 'OFFLINE' : 'ONLINE', { color: col });
  }
  // second chip under the status chip, per scene
  function sceneChip(ctx, t, label, color = C.amber, t0) { chip(ctx, SA.x + SA.w, SA.y + 74, label, { color, dot: false, size: 26, alpha: fade(t, t0 == null ? -1 : t0, 0.2) }); }

  // ---------------- captions (karaoke: the creator reads along when recording) ----------------
  function captions(ctx, t) {
    const line = S.vo.find((l) => t >= l.t - 0.12 && t < l.end + 0.3);
    if (!line) return;
    const size = line.text === 'MATI.' ? 76 : 54, maxW = SA.w - 70;
    // wrap
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
    rr(ctx, SA.x, y0, SA.w, boxH, 26); ctx.fillStyle = 'rgba(5,10,26,0.78)'; ctx.fill();
    rows.forEach((r, i) => {
      const full = r.map((q) => q.w).join(' ');
      let x = CX - G.measure(ctx, full, size, SANS, 800) / 2;
      const y = y0 + 22 + lh * (i + 0.78);
      for (const w of r) {
        const said = t >= w.t, now = t >= w.t && t < w.end;
        const color = line.text === 'MATI.' ? C.red : now ? C.amber : said ? C.white : 'rgba(238,242,248,0.42)';
        txt(ctx, w.w, x, y, { size, color });
        x += G.measure(ctx, w.w + ' ', size, SANS, 800);
      }
    });
    ctx.restore();
  }

  // ---------------- scenes ----------------
  const CITIES = [[106.85, -6.21], [107.61, -6.91], [110.42, -6.97], [112.75, -7.25], [110.37, -7.8], [98.67, 3.59], [104.75, -2.99], [100.35, -0.95], [101.45, 0.51], [104.03, 1.13], [105.26, -5.43], [115.22, -8.65], [116.1, -8.58], [123.6, -10.17], [109.33, -0.03], [114.59, -3.32], [116.83, -1.27], [117.15, -0.5], [119.43, -5.15], [124.84, 1.47], [119.87, -0.9], [122.5, -3.97], [128.18, -3.65], [127.38, 0.79], [140.72, -2.53], [131.25, -0.88], [140.4, -8.5], [95.32, 5.55], [103.6, -1.6], [102.26, -3.8], [108.0, -7.3], [111.5, -7.6], [113.9, -7.9]];
  let MAP = null;
  function hook(ctx, t) {
    room(ctx, t, { horizon: 1500 });
    const dark = t >= ev.blackout;
    // headline (the premise), always readable in the first 3 seconds
    const hA = pop(t, 0.15, 0.35);
    ctx.save(); ctx.globalAlpha *= clamp(hA);
    txt(ctx, 'GIMANA KALAU', CX, STAGE.y0 + 40, { size: 50, align: 'center', color: C.amber, fam: MONO });
    txt(ctx, 'INTERNET INDONESIA', CX, STAGE.y0 + 112, { size: 70, align: 'center' });
    txt(ctx, 'MATI 24 JAM?', CX, STAGE.y0 + 190, { size: 70, align: 'center', color: dark ? C.red : C.white });
    ctx.restore();
    if (!MAP) MAP = Data.map({ region: [94.5, -11.5, 141.5, 6.5], x: 20, y: 760, w: 1040, h: 470, pad: 0.02 });
    Data.drawMap(ctx, MAP, { only: ['Indonesia', 'Malaysia', 'Papua New Guinea', 'Timor-Leste', 'East Timor'], land: dark ? '#17254A' : '#1F3566', stroke: null, lw: 0, highlight: {} });
    // network: arcs from Jakarta with packets, city lights
    const jk = MAP.proj(106.85, -6.21);
    if (!dark) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      CITIES.forEach((c, i) => {
        const p = MAP.proj(c[0], c[1]);
        if (i > 0) {
          const mx = (jk[0] + p[0]) / 2, my = Math.min(jk[1], p[1]) - 60 - (i % 4) * 18;
          ctx.strokeStyle = 'rgba(92,200,255,0.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(jk[0], jk[1]); ctx.quadraticCurveTo(mx, my, p[0], p[1]); ctx.stroke();
          const u = (t * 0.7 + hsh(i, 3)) % 1, q = (a, b, c2) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c2;
          ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(q(jk[0], mx, p[0]), q(jk[1], my, p[1]), 4, 0, Math.PI * 2); ctx.fill();
        }
        for (let j = 0; j < 7; j++) {
          const r = 3 + 3 * hsh(i, j, 1), ox = (hsh(i, j, 2) - 0.5) * 34, oy = (hsh(i, j, 3) - 0.5) * 18;
          const tw = 0.6 + 0.4 * Math.sin(t * 6 + i + j);
          const g = ctx.createRadialGradient(p[0] + ox, p[1] + oy, 0, p[0] + ox, p[1] + oy, r * 4);
          g.addColorStop(0, `rgba(255,214,140,${0.9 * tw})`); g.addColorStop(1, 'rgba(255,214,140,0)');
          ctx.fillStyle = g; ctx.fillRect(p[0] + ox - r * 4, p[1] + oy - r * 4, r * 8, r * 8);
        }
      });
      ctx.restore();
    } else {
      // dead cities: small grey dots + a red ring ripple from Jakarta
      CITIES.forEach((c, i) => { const p = MAP.proj(c[0], c[1]); ctx.fillStyle = 'rgba(160,170,190,0.35)'; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, Math.PI * 2); ctx.fill(); });
      const u = (t - ev.blackout) / 1.6;
      if (u < 1) { ctx.strokeStyle = `rgba(255,77,94,${0.8 * (1 - u)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(jk[0], jk[1], 30 + u * 900, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
    }
    // "MATI." stamp
    if (t >= ev.mati) {
      const k = 1 + 0.5 * Math.exp(-(t - ev.mati) * 18);
      ctx.save(); ctx.translate(CX, 1060); ctx.rotate(-0.08); ctx.scale(k, k);
      rr(ctx, -300, -120, 600, 190, 22); ctx.fillStyle = 'rgba(255,77,94,0.16)'; ctx.fill(); ctx.lineWidth = 12; ctx.strokeStyle = C.red; ctx.stroke();
      txt(ctx, 'MATI.', 0, 40, { size: 190, align: 'center', color: C.red, fam: SANS, weight: 800 });
      ctx.restore();
    }
  }

  function wifi(ctx, t) {
    room(ctx, t, { horizon: 980 });
    const s0 = S.S.wifi[0];
    // table + router
    box(ctx, 70, 1180, 320, 150, 110);
    const rx = 120, ry = 1030 - 0;
    box(ctx, rx, ry, 170, 44, 70, { top: '#E7ECF5', front: '#C7D0E0', side: '#A9B4C8' });
    ctx.strokeStyle = '#C7D0E0'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(rx + 30, ry - 44); ctx.lineTo(rx + 12, ry - 140); ctx.moveTo(rx + 140, ry - 44); ctx.lineTo(rx + 165, ry - 138); ctx.stroke();
    const n = S.restarts.filter((r) => t >= r).length, last = S.restarts[n - 1] ?? -9;
    const offBlink = t - last < 0.22;
    for (let i = 0; i < 4; i++) { ctx.fillStyle = offBlink ? '#2A3550' : i === 0 ? C.red : (Math.sin(t * 9 + i) > 0 ? C.red : '#5A2030'); ctx.beginPath(); ctx.arc(rx + 30 + i * 34, ry - 20, 7, 0, Math.PI * 2); ctx.fill(); }
    // he holds his phone (right hand) and pokes the router (left hand) on every restart, more frantic each time
    const poke = n > 0 ? Math.exp(-(t - last) * 7) : 0;
    const handL = n > 0 ? [lerp(-150, -205, poke), lerp(-215, -190, poke)] : undefined;
    const mood = n === 0 ? { eyes: 'normal', brows: 'up', mouth: t >= s0 + 0.9 ? 'o' : 'flat', look: 0.4, lookY: 0.7 }
      : n < 3 ? { eyes: poke > 0.5 ? 'wide' : 'normal', brows: 'worried', mouth: 'flat', look: poke > 0.3 ? -1 : 0.4, lookY: poke > 0.3 ? 0.3 : 0.7 }
        : n < 6 ? { eyes: poke > 0.5 ? 'wide' : 'normal', brows: 'determined', mouth: 'wavy', look: -1, lookY: 0.3, sweat: 0.6 }
          : { eyes: 'wide', brows: 'worried', mouth: 'open', look: -1, lookY: 0.2, sweat: 1 };
    person(ctx, Object.assign({ x: 480, y: 1210, s: 0.92, k: 1, style: 'rafi', gesture: 'phone', handL, headRot: n > 0 ? -0.06 * poke : 0.05, glow: C.red }, mood));
    // thought + error card
    if (t >= s0 + 0.9) {
      const a = pop(t, s0 + 0.9);
      ctx.save(); ctx.translate(770, 640); ctx.scale(a, a);
      rr(ctx, -150, -60, 300, 110, 30); ctx.fillStyle = C.white; ctx.fill();
      ctx.beginPath(); ctx.arc(-90, 74, 14, 0, Math.PI * 2); ctx.arc(-130, 104, 8, 0, Math.PI * 2); ctx.fill();
      txt(ctx, 'kuota habis?', 0, 14, { size: 40, align: 'center', color: C.ink });
      ctx.restore();
    }
    // wifi-x icon above the router
    const wy = 790, wx = 190;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 12;
    for (let i = 1; i <= 3; i++) { ctx.strokeStyle = i === 1 || Math.sin(t * 5) > 0 ? 'rgba(238,242,248,0.85)' : 'rgba(238,242,248,0.25)'; ctx.beginPath(); ctx.arc(wx, wy, i * 34, -Math.PI * 0.78, -Math.PI * 0.22); ctx.stroke(); }
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(wx, wy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.red; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(wx + 40, wy - 30); ctx.lineTo(wx + 90, wy + 20); ctx.moveTo(wx + 90, wy - 30); ctx.lineTo(wx + 40, wy + 20); ctx.stroke();
    ctx.restore();
    sceneChip(ctx, t, `RESTART ROUTER ×${n}`, C.amber);
  }

  function bigPhone(ctx, x, y, w, h, draw) { // a large phone in the scene; draw(ctx, w, h) paints the screen
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 20, w * 0.55, 22, 0, 0, Math.PI * 2); ctx.fill();
    rr(ctx, x, y, w, h, 48); ctx.fillStyle = '#1B2236'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#3A4766'; ctx.stroke();
    ctx.save(); rr(ctx, x + 14, y + 14, w - 28, h - 28, 36); ctx.clip(); ctx.translate(x + 14, y + 14); draw(ctx, w - 28, h - 28); ctx.restore();
    rr(ctx, x + w / 2 - 50, y + 24, 100, 22, 11); ctx.fillStyle = '#1B2236'; ctx.fill();
    ctx.restore();
  }
  function spinner(ctx, x, y, r, t, color) { ctx.save(); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(x, y, r, t * 6, t * 6 + 4.2); ctx.stroke(); ctx.restore(); }

  function ojol(ctx, t) {
    room(ctx, t, { horizon: 980 });
    const s0 = S.S.ojol[0], lost = t >= T(8, 2);
    // bus stop + queue on the right
    const qx = 640;
    ctx.fillStyle = '#22355F'; ctx.fillRect(qx - 40, 690, 420, 26);
    ctx.fillStyle = '#2E4677'; ctx.fillRect(qx - 30, 716, 12, 470); ctx.fillRect(qx + 350, 716, 12, 470);
    rr(ctx, qx + 90, 640, 170, 50, 10); ctx.fillStyle = C.amber; ctx.fill();
    txt(ctx, 'HALTE', qx + 175, 678, { size: 34, align: 'center', color: C.ink });
    const nq = S.queue.filter((q) => t >= q).length;
    for (let i = Math.min(nq, 10) - 1; i >= 0; i--) {
      const depth = i / 9, s = lerp(0.5, 0.28, depth);
      const x = lerp(qx + 300, qx + 20, depth), y = lerp(1180, 980, depth);
      const a = pop(t, S.queue[i], 0.3);
      const ph = i % 3 === 0;
      person(ctx, { x, y: y + (1 - a) * 40, s, k: 20 + i, style: i, alpha: clamp(a), gesture: ph ? 'phone' : i % 3 === 1 ? 'akimbo' : null, eyes: 'normal', brows: 'worried', mouth: i % 2 ? 'flat' : 'wavy', look: ph ? 0.3 : -0.6, lookY: ph ? 0.7 : 0, glow: ph ? C.red : null });
    }
    // the driver in front of the stop, staring at his phone
    person(ctx, { x: 700, y: 1290, s: 0.72, k: 2, style: 'driver', gesture: 'phone', eyes: t >= T(8, 2) ? 'wide' : 'normal', brows: t >= T(8, 2) ? 'up' : 'worried', mouth: t >= T(8, 2) ? 'o' : 'flat', look: 0.3, lookY: 0.8, glow: t >= T(8, 2) ? C.red : '#9EE6FF' });
    // the ride app, left
    bigPhone(ctx, SA.x + 10, 560, 420, 700, (c, w, h) => {
      c.fillStyle = '#E9EDF3'; c.fillRect(0, 0, w, h);
      // map placeholder
      c.fillStyle = '#D5DCE6'; c.fillRect(0, 90, w, h - 90);
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 16;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-20, 160 + i * 110); c.lineTo(w + 20, 120 + i * 120); c.stroke(); }
      c.beginPath(); c.moveTo(120, 90); c.lineTo(180, h); c.moveTo(300, 90); c.lineTo(250, h); c.stroke();
      c.fillStyle = '#2FB36B'; c.fillRect(0, 0, w, 90);
      txt(c, 'OJEK KITA', w / 2, 62, { size: 34, align: 'center', color: '#FFFFFF' });
      // bottom sheet
      rr(c, 0, h - 250, w, 260, 28); c.fillStyle = '#FFFFFF'; c.fill();
      if (!lost) { spinner(c, w / 2, h - 165, 34, t, '#2FB36B'); txt(c, 'Mencari driver…', w / 2, h - 80, { size: 34, align: 'center', color: '#1C2333' }); }
      else {
        c.fillStyle = C.red; c.beginPath(); c.arc(w / 2, h - 170, 40, 0, Math.PI * 2); c.fill();
        txt(c, '!', w / 2, h - 150, { size: 60, align: 'center', color: '#FFFFFF' });
        txt(c, 'Koneksi terputus', w / 2, h - 80, { size: 34, align: 'center', color: C.red });
      }
    });
    sceneChip(ctx, t, 'DRIVER TERSEDIA: 0', C.amber, s0 + 0.2);
  }

  function qris(ctx, t) {
    room(ctx, t, { horizon: 960 });
    const failed = t >= ev.gagal;
    // cashier behind the counter, customer in front-left
    person(ctx, { x: 560, y: 1050, s: 0.6, k: 3, style: 'bapak', eyes: 'normal', brows: failed ? 'worried' : 'neutral', mouth: failed ? 'wavy' : 'smile', look: -0.8, gesture: failed ? 'shrug' : null });
    box(ctx, 150, 1230, 760, 210, 150, { top: '#33497E', front: '#22355F', side: '#1A2A4F' });
    // QR stand on the counter
    box(ctx, 400, 1012, 70, 120, 20, { top: '#E7ECF5', front: '#FFFFFF', side: '#C7D0E0' });
    for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) if (hsh(i, j, 77) > 0.45) { ctx.fillStyle = '#0A1430'; ctx.fillRect(408 + i * 11, 900 + j * 14, 9, 12); }
    person(ctx, { x: 250, y: 1320, s: 0.82, k: 4, style: 'dina', gesture: 'phone', handR: [150, -330], eyes: failed ? 'wide' : 'normal', brows: failed ? 'up' : 'neutral', mouth: failed ? 'o' : 'smile', look: 0.6, lookY: -0.2, glow: failed ? C.red : '#9EE6FF' });
    // inset: the phone screen
    bigPhone(ctx, 640, 520, 300, 470, (c, w, h) => {
      c.fillStyle = failed ? '#2A0E16' : '#0F1A33'; c.fillRect(0, 0, w, h);
      if (!failed) {
        c.strokeStyle = C.cyan; c.lineWidth = 6; const q = 150;
        rr(c, w / 2 - q / 2, 120, q, q, 18); c.stroke();
        const sy = 120 + ((t * 1.6) % 1) * q; c.fillStyle = 'rgba(92,200,255,0.8)'; c.fillRect(w / 2 - q / 2, sy, q, 4);
        txt(c, 'Memindai QRIS…', w / 2, 340, { size: 26, align: 'center', color: C.white });
      } else {
        c.strokeStyle = C.red; c.lineWidth = 14; c.lineCap = 'round';
        c.beginPath(); c.moveTo(w / 2 - 50, 150); c.lineTo(w / 2 + 50, 250); c.moveTo(w / 2 + 50, 150); c.lineTo(w / 2 - 50, 250); c.stroke();
        txt(c, 'Transaksi gagal', w / 2, 330, { size: 28, align: 'center', color: C.white });
      }
    });
    if (failed) {
      const k = 1 + 0.6 * Math.exp(-(t - ev.gagal) * 16);
      ctx.save(); ctx.translate(330, 700); ctx.rotate(-0.08); ctx.scale(k, k);
      rr(ctx, -210, -85, 420, 140, 18); ctx.fillStyle = 'rgba(255,77,94,0.18)'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = C.red; ctx.stroke();
      txt(ctx, 'GAGAL', 0, 30, { size: 110, align: 'center', color: C.red });
      ctx.restore();
    }
    sceneChip(ctx, t, failed ? 'QRIS: GAGAL' : 'QRIS: …', failed ? C.red : C.amber);
  }

  function atm(ctx, t) {
    room(ctx, t, { horizon: 940 });
    const s0 = S.S.atm[0];
    // ATM
    box(ctx, SA.x + 10, 1250, 230, 560, 90, { top: '#3A5288', front: '#26396A', side: '#1B2B52' });
    const flick = t >= s0 + 1.0 && t < s0 + 1.45 && Math.sin(t * 60) > 0;
    rr(ctx, SA.x + 35, 760, 180, 140, 10); ctx.fillStyle = flick ? '#4A0E18' : '#0B1226'; ctx.fill();
    txt(ctx, 'JARINGAN', SA.x + 125, 815, { size: 26, align: 'center', color: C.red, fam: MONO });
    txt(ctx, 'TIDAK', SA.x + 125, 850, { size: 26, align: 'center', color: C.red, fam: MONO });
    txt(ctx, 'TERSEDIA', SA.x + 125, 885, { size: 26, align: 'center', color: C.red, fam: MONO });
    rr(ctx, SA.x + 50, 940, 150, 18, 6); ctx.fillStyle = '#0B1226'; ctx.fill();
    rr(ctx, SA.x + 60, 690, 130, 40, 8); ctx.fillStyle = C.amber; ctx.fill();
    txt(ctx, 'ATM', SA.x + 125, 722, { size: 32, align: 'center', color: C.ink });
    // queue snaking to the right into the distance
    for (let i = 11; i >= 0; i--) {
      const depth = i / 11, s = lerp(0.62, 0.3, depth);
      const x = lerp(420, 900, depth) + Math.sin(i * 1.3) * 30, y = lerp(1290, 1000, depth);
      const shuffle = Math.sin(t * 3 + i) * 3;
      const g = ['phone', 'akimbo', null, 'think', 'phone', 'shrug'][i % 6];
      person(ctx, { x: x + shuffle, y, s, k: 40 + i, style: i + 7, gesture: g, eyes: 'normal', brows: i % 2 ? 'worried' : 'determined', mouth: ['flat', 'wavy', 'flat', 'smirk'][i % 4], look: g === 'phone' ? 0.3 : -0.8, lookY: g === 'phone' ? 0.7 : 0, glow: g === 'phone' ? C.red : null });
    }
    sceneChip(ctx, t, 'ATM: OFFLINE', C.red);
  }

  function siang(ctx, t) {
    room(ctx, t, { horizon: 960, warm: 0.85 });
    const s0 = S.S.siang[0];
    // sun
    const sg = ctx.createRadialGradient(820, 640, 10, 820, 640, 200); sg.addColorStop(0, 'rgba(255,214,140,0.95)'); sg.addColorStop(0.35, 'rgba(255,190,120,0.5)'); sg.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = sg; ctx.fillRect(620, 440, 400, 400);
    // warung: back wall, counter, striped awning
    box(ctx, 120, 1080, 820, 330, 60, { top: '#7A4A55', front: '#5C3A4E', side: '#4A2E42' });
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#F4EDE4' : '#E2574C'; ctx.beginPath(); ctx.moveTo(110 + i * 85, 720); ctx.lineTo(195 + i * 85, 720); ctx.lineTo(195 + i * 85, 800); ctx.quadraticCurveTo(152 + i * 85, 830, 110 + i * 85, 800); ctx.closePath(); ctx.fill(); }
    rr(ctx, 360, 740, 340, 56, 12); ctx.fillStyle = '#FFF4E0'; ctx.fill();
    txt(ctx, 'WARUNG', 530, 782, { size: 34, align: 'center', color: '#5C3A4E' });
    // owner behind the counter
    const laughing = S.bubbles.some((bt, i) => (i === 1 || i === 6) && t >= bt && t < bt + 1.2);
    person(ctx, { x: 470, y: 1110, s: 0.62, k: 5, style: 'ibu', eyes: laughing ? 'happy' : 'normal', mouth: laughing ? 'open' : 'smile', brows: 'neutral', look: Math.sin(t * 0.9) * 0.6, headRot: Math.sin(t * 2) * 0.04, blush: laughing ? 0.6 : 0.2 });
    box(ctx, 160, 1110, 740, 120, 50, { top: '#C98A5A', front: '#A86E48', side: '#8A5A3C' });
    // radio on the counter, waves on the beat once it's on
    const radioOn = t >= T(15, 3) - 0.3;
    box(ctx, 720, 980 + 0, 130, 80, 30, { top: '#4D3A34', front: '#6B4A3E', side: '#3E2E2A' });
    ctx.fillStyle = '#2A1E1A'; ctx.beginPath(); ctx.arc(760, 940, 24, 0, Math.PI * 2); ctx.fill();
    rr(ctx, 795, 920, 40, 18, 4); ctx.fillStyle = radioOn ? C.amber : '#5A4A40'; ctx.fill();
    if (radioOn) for (let i = 0; i < 3; i++) { const u = (clock.phase(t) + i / 3) % 1; ctx.strokeStyle = `rgba(255,181,71,${0.8 * (1 - u)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(785, 920, 40 + u * 90, -Math.PI * 0.85, -Math.PI * 0.15); ctx.stroke(); }
    // bench + two neighbours chatting
    box(ctx, 140, 1300, 520, 26, 60, { top: '#8A5A3C', front: '#6B4630', side: '#5A3A28' });
    const talk = (who) => S.bubbles.some((bt, i) => i % 2 === who && t >= bt && t < bt + 0.9);
    const lA = talk(0), lB = talk(1);
    person(ctx, { x: 270, y: 1268, s: 0.62, k: 6, pose: 'sit', style: 'bapak', look: 0.9, eyes: lB ? 'happy' : 'normal', mouth: lA ? (Math.sin(t * 18) > 0 ? 'open' : 'smile') : 'smile', brows: lA ? 'up' : 'neutral', gesture: lA ? 'shrug' : null, headRot: 0.06 });
    person(ctx, { x: 540, y: 1268, s: 0.62, k: 7, pose: 'sit', style: 'driver', look: -0.9, eyes: lA ? 'happy' : 'normal', mouth: lB ? (Math.sin(t * 18) > 0 ? 'open' : 'grin') : 'smile', brows: 'neutral', gesture: lB ? 'clap' : null, headRot: -0.06 });
    // speech bubbles
    const words = ['beneran mati?', 'wkwk', 'sama!', 'kok bisa?', 'ngopi dulu', 'nyalain radio!', 'haha'];
    S.bubbles.forEach((bt, i) => {
      if (t < bt || t > bt + 1.6) return;
      const a = pop(t, bt, 0.25) * (1 - fade(t, bt + 1.3, 0.3));
      const left = i % 2 === 0, x = left ? 240 : 600, y = 1000 - (i % 3) * 70 - (t - bt) * 30;
      ctx.save(); ctx.translate(x, y); ctx.scale(a, a); ctx.globalAlpha *= clamp(a);
      const wv = G.measure(ctx, words[i], 34, SANS, 800) + 50;
      rr(ctx, -wv / 2, -40, wv, 70, 35); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(left ? -10 : 10, 28); ctx.lineTo(left ? -30 : 30, 56); ctx.lineTo(left ? 14 : -14, 28); ctx.fill();
      txt(ctx, words[i], 0, 7, { size: 34, align: 'center', color: '#3A2436' });
      ctx.restore();
    });
    sceneChip(ctx, t, 'SCREEN TIME: 0 MENIT', C.amber, s0 + 0.3);
  }

  function maps(ctx, t) {
    room(ctx, t, { horizon: 980, warm: 0.45 });
    const s0 = S.S.maps[0], street = t >= T(18);
    if (!street) {
      bigPhone(ctx, CX - 230, 540, 460, 720, (c, w, h) => {
        c.fillStyle = '#E3E8EF'; c.fillRect(0, 0, w, h);
        const u = clamp((t - s0 - 0.3) / 1.2);
        for (let i = 0; i < 6; i++) for (let j = 0; j < 9; j++) {
          const gone = hsh(i, j, 5) < u;
          c.fillStyle = gone ? '#C9D0DA' : (i + j) % 2 ? '#D2E8D0' : '#E9EEF4';
          c.fillRect(i * (w / 6), j * (h / 9), w / 6 + 1, h / 9 + 1);
          if (!gone) { c.fillStyle = '#FFFFFF'; c.fillRect(i * (w / 6), j * (h / 9) + 30, w / 6, 10); }
        }
        if (u < 0.6) { c.fillStyle = '#E2574C'; c.beginPath(); c.arc(w / 2, h / 2 - 20, 26, Math.PI, 0); c.lineTo(w / 2, h / 2 + 30); c.closePath(); c.fill(); }
        if (u > 0.5) { rr(c, 30, h / 2 - 60, w - 60, 120, 20); c.fillStyle = '#FFFFFF'; c.fill(); txt(c, 'Peta tidak', w / 2, h / 2 - 10, { size: 34, align: 'center', color: '#1C2333' }); txt(c, 'dapat dimuat', w / 2, h / 2 + 34, { size: 34, align: 'center', color: '#1C2333' }); }
      });
      sceneChip(ctx, t, 'GPS: HILANG', C.red, s0 + 0.2);
    } else {
      // street signpost, someone asks, someone points
      ctx.fillStyle = '#3A3F5A'; ctx.fillRect(850, 720, 14, 560);
      rr(ctx, 690, 740, 260, 64, 10); ctx.fillStyle = '#2FB36B'; ctx.fill();
      txt(ctx, 'JL. MERDEKA', 820, 784, { size: 32, align: 'center', color: '#FFFFFF' });
      const pointT = T(18, 2), p = clamp((t - pointT + 0.2) / 0.3);
      person(ctx, { x: 300, y: 1280, s: 0.82, k: 8, style: 'rafi', gesture: p > 0.5 ? 'thumbsUp' : 'think', eyes: p > 0.5 ? 'happy' : 'normal', brows: p > 0.5 ? 'neutral' : 'worried', mouth: p > 0.5 ? 'grin' : 'wavy', look: 0.9 });
      person(ctx, { x: 620, y: 1280, s: 0.82, k: 9, style: 'bapak', gesture: p > 0.5 ? 'point' : null, eyes: 'normal', brows: 'up', mouth: p > 0.5 ? 'open' : 'smile', look: p > 0.5 ? 1 : -0.9 });
      if (t >= pointT) {
        const u = clamp((t - pointT) / 0.8);
        ctx.save(); ctx.strokeStyle = C.amber; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.setLineDash([26, 22]); ctx.lineDashOffset = -t * 60;
        ctx.beginPath(); ctx.moveTo(740, 1000); ctx.quadraticCurveTo(820, 900, lerp(740, 990, u), lerp(1000, 900, u)); ctx.stroke(); ctx.restore();
        txt(ctx, 'lurus, terus belok kiri', CX, 640, { size: 40, align: 'center', color: C.amber, alpha: fade(t, pointT + 0.3) });
      }
      sceneChip(ctx, t, 'NAVIGASI: MANUSIA', C.green, T(18));
    }
  }

  function crowd(ctx, t, lit) {
    for (let r = 3; r >= 0; r--) for (let i = 0; i < 6; i++) {
      const s = lerp(0.52, 0.3, r / 3), y = lerp(1320, 1010, r / 3);
      const x = 90 + i * 165 + (r % 2) * 80 + (hsh(r, i) - 0.5) * 30;
      if (x > W - 40) continue;
      const buzz = lit ? Math.sin(t * 90 + i + r) * 3 * Math.exp(-((t - ev.online) % BEAT) * 4) : 0;
      const n = r * 6 + i;
      const face = lit ? { eyes: 'wide', brows: 'up', mouth: ['open', 'grin', 'o'][n % 3], lookY: 0.6 } : { eyes: 'normal', brows: 'worried', mouth: 'flat', lookY: 0.9 };
      person(ctx, Object.assign({ x: x + buzz, y, s, k: 60 + n, style: n + 3, gesture: lit && n % 5 === 0 ? 'cheer' : 'phone', look: 0.3, glow: lit ? '#9EE6FF' : null, alpha: lerp(0.7, 1, 1 - r / 3) }, face));
    }
  }
  function tunggu(ctx, t) {
    const frozen = t >= ev.breath;
    const tt = frozen ? ev.breath : t;
    room(ctx, tt, { horizon: 960, night: 0.35 });
    // slow push-in
    const z = 1 + 0.06 * clamp((tt - S.S.tunggu[0]) / 4);
    ctx.save(); ctx.translate(W / 2, 1100); ctx.scale(z, z); ctx.translate(-W / 2, -1100);
    crowd(ctx, tt, false);
    ctx.restore();
    const v = S.clockAt(t);
    txt(ctx, v, CX, 760, { size: 128, align: 'center', fam: MONO, color: frozen ? C.red : C.white });
    if (frozen) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H); txt(ctx, v, CX, 760, { size: 128, align: 'center', fam: MONO, color: C.red }); }
  }
  function balik(ctx, t) {
    room(ctx, t, { horizon: 960 });
    crowd(ctx, t, true);
    // notification cards
    const labels = ['Grup Keluarga · 243 pesan', 'Mama: kamu di mana??', 'Email · 57 baru', 'Promo kuota 50GB!', 'Bos: meeting jam 9 ya', 'Paket kamu tertunda'];
    const shown = S.notifs.filter((n) => t >= n.t);
    const latest = shown.slice(-5).reverse(); // newest first
    latest.forEach((n, k) => {
      const idx = S.notifs.indexOf(n);
      const a = pop(t, n.t, 0.22);
      const slide = k * 84 - (1 - clamp((t - n.t) / 0.18)) * 0; // stack positions
      const w = 760, x = CX - w / 2, y = 560 + slide;
      ctx.save(); ctx.globalAlpha *= (k === 0 ? clamp(a) : 1) * (1 - k * 0.13);
      ctx.translate(CX, y + 34); const sc = k === 0 ? lerp(0.85, 1, clamp(a)) : 1 - k * 0.03; ctx.scale(sc, sc); ctx.translate(-CX, -(y + 34));
      rr(ctx, x, y, w, 68, 20); ctx.fillStyle = 'rgba(240,244,250,0.97)'; ctx.fill();
      ctx.fillStyle = [C.green, C.cyan, C.amber, C.red][n.kind]; rr(ctx, x + 14, y + 14, 40, 40, 10); ctx.fill();
      txt(ctx, labels[(n.kind + idx) % labels.length], x + 70, y + 44, { size: 28, color: '#1C2333' });
      txt(ctx, 'sekarang', x + w - 20, y + 44, { size: 22, weight: 700, color: '#7A8499', align: 'right' });
      ctx.restore();
    });
    // flash + counter
    const fl = Math.exp(-(t - ev.online) * 10);
    if (fl > 0.02) { ctx.fillStyle = `rgba(220,245,255,${0.85 * fl})`; ctx.fillRect(0, 0, W, H); }
    const count = Math.min(999, Math.floor(Math.pow(clamp((t - ev.online) / 2.5), 1.6) * 999));
    sceneChip(ctx, t, `NOTIFIKASI: ${count >= 999 ? '999+' : count}`, C.green);
  }

  function postCard(ctx, t, x, y, w, s) {
    // the composer / posted card, drawn at scale s around (x, y top-left)
    const typed = S.keys.filter((k) => t >= k.t).length;
    const posted = t >= ev.postTap;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rr(ctx, 0, 0, w, 330, 30); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(60, 64, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(60, 56, 12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(60, 86, 20, 12, 0, Math.PI, 0); ctx.fill();
    txt(ctx, 'kamu', 112, 58, { size: 32, color: '#1C2333' });
    txt(ctx, posted ? 'baru saja' : 'menulis…', 112, 92, { size: 24, weight: 700, color: '#7A8499' });
    const str = S.POST.slice(0, typed);
    txt(ctx, str, 36, 186, { size: 46, color: '#1C2333' });
    if (!posted && Math.floor(t * 3) % 2 === 0) { const cx = 36 + G.measure(ctx, str, 46, SANS, 800) + 4; ctx.fillStyle = C.cyan; ctx.fillRect(cx, 148, 5, 48); }
    if (!posted) {
      const press = Math.exp(-Math.max(0, ev.postTap - t) * 8);
      rr(ctx, w - 210, 250, 180, 58, 29); ctx.fillStyle = typed >= S.POST.length ? C.cyan : '#B9C3D3'; ctx.fill();
      txt(ctx, 'Posting', w - 120, 290, { size: 30, align: 'center', color: '#FFFFFF', alpha: 1 - press * 0 });
    } else {
      const likes = Math.floor(Math.pow(clamp((t - ev.postTap) / 3), 1.3) * 2400000);
      txt(ctx, `♥ ${likes >= 1e6 ? (likes / 1e6).toFixed(1).replace('.', ',') + ' jt' : Math.floor(likes / 1000) + ' rb'}`, 36, 296, { size: 32, color: C.red });
      txt(ctx, '💬 99rb', w - 40, 296, { size: 30, align: 'right', color: '#7A8499' });
    }
    ctx.restore();
  }
  function posting(ctx, t) {
    room(ctx, t, { horizon: 1080 });
    const s0 = S.S.posting[0];
    // he sits on a stool in the dark, phone up, typing with a grin
    box(ctx, 470, 1340, 140, 60, 50, { top: '#2C3F6E', front: '#1E2E55', side: '#16244A' });
    person(ctx, { x: 540, y: 1282, s: 0.72, k: 10, pose: 'sit', style: 'rafi', gesture: 'phone', eyes: t >= ev.postTap ? 'happy' : 'normal', brows: 'neutral', mouth: t >= ev.postTap ? 'grin' : 'smirk', look: 0.3, lookY: 0.8, glow: '#9EE6FF' });
    const a = pop(t, s0 + 0.1, 0.35);
    ctx.save(); ctx.translate(CX, 760); ctx.scale(a, a); ctx.translate(-CX, -760);
    postCard(ctx, t, SA.x + 10, 590, SA.w - 20, 1);
    ctx.restore();
    if (t >= ev.postTap) { const u = clamp((t - ev.postTap) / 0.5); ctx.strokeStyle = `rgba(92,200,255,${1 - u})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(SA.x + SA.w - 120, 870, 20 + u * 140, 0, Math.PI * 2); ctx.stroke(); }
  }
  function cta(ctx, t) {
    room(ctx, t, { horizon: 1300 });
    const s0 = S.S.cta[0];
    postCard(ctx, t, SA.x + 60, SA.y + 20, SA.w - 120, 0.85);
    S.replies.forEach((r, i) => {
      if (t < r.t) return;
      const a = pop(t, r.t, 0.25);
      ctx.save(); ctx.globalAlpha *= clamp(a); ctx.translate(SA.x + 120, SA.y + 330 + i * 70);
      const w = G.measure(ctx, r.text, 26, SANS, 700) + G.measure(ctx, r.who + '  ', 26, SANS, 800) + 50;
      rr(ctx, 0, -30, w, 56, 18); ctx.fillStyle = 'rgba(240,244,250,0.95)'; ctx.fill();
      txt(ctx, r.who, 22, 7, { size: 26, color: '#2B6CB0' });
      txt(ctx, r.text, 22 + G.measure(ctx, r.who + '  ', 26, SANS, 800), 7, { size: 26, weight: 700, color: '#1C2333' });
      ctx.restore();
    });
    // the question
    const k = 1 + 0.4 * Math.exp(-(t - s0) * 14);
    ctx.save(); ctx.translate(CX, 900); ctx.scale(k, k);
    txt(ctx, 'KAMU KUAT', 0, 0, { size: 96, align: 'center' });
    txt(ctx, 'BERAPA JAM?', 0, 104, { size: 96, align: 'center', color: C.amber });
    ctx.restore();
    // a dial counting hours
    const h = 1 + (Math.floor((t - s0) / (BEAT / 2)) % 24);
    txt(ctx, `${String(h).padStart(2, '0')} JAM`, CX, 1100, { size: 64, align: 'center', fam: MONO, color: C.white, alpha: fade(t, s0 + 0.3) });
    if (t >= 58.8) {
      const b = Math.abs(Math.sin((t - 58.8) * 6)) * 16;
      txt(ctx, 'TULIS DI KOMEN', CX, 1180, { size: 54, align: 'center', color: C.green, alpha: fade(t, 58.8, 0.2) });
      ctx.save(); ctx.globalAlpha *= fade(t, 58.8, 0.2); ctx.fillStyle = C.green; ctx.beginPath(); ctx.moveTo(CX - 26, 1206 + b); ctx.lineTo(CX + 26, 1206 + b); ctx.lineTo(CX, 1240 + b); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }

  const SCENES = [['hook', hook], ['wifi', wifi], ['ojol', ojol], ['qris', qris], ['atm', atm], ['siang', siang], ['maps', maps], ['tunggu', tunggu], ['balik', balik], ['posting', posting], ['cta', cta]];

  Studio.film({
    draw(ctx, t) {
      const sc = SCENES.find(([k]) => inS(t, S.S[k])) || SCENES[SCENES.length - 1];
      // screen shake on the big hits
      let shake = 0;
      for (const h of [ev.blackout, ev.mati, ev.gagal, ev.online, S.S.cta[0]]) if (t >= h) shake = Math.max(shake, 22 * Math.exp(-(t - h) * 9));
      ctx.save();
      ctx.translate(U.noise1(t * 40, 1) * shake, U.noise1(t * 40, 2) * shake);
      sc[1](ctx, t);
      ctx.restore();
      if (sc[0] !== 'tunggu' && sc[0] !== 'cta') hud(ctx, t);
      if (sc[0] === 'tunggu') chip(ctx, SA.x + SA.w, SA.y + 4, 'OFFLINE', { color: C.red });
      // a white flash at the blackout (the last frame of light)
      if (t >= ev.blackout && t < ev.blackout + 0.2) { ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - (t - ev.blackout) / 0.2)})`; ctx.fillRect(0, 0, W, H); }
      captions(ctx, t);
    },
    post: { paper: 0, vignette: 0.4, grain: 0.03 },
  });
})();
// CAST_TEST
globalThis.CAST = {
  rafi: { skin: '#C68B59', hair: '#1B1310', hairStyle: 'quiff', outfit: 'tee', shirt: '#3A6FD8', bottoms: 'pants', shorts: '#2B3140', build: 'slim' },
  driver: { skin: '#A86F45', hair: '#1B1310', hairStyle: 'short', outfit: 'hoodie', shirt: '#2FB36B', trim: '#1E7D49', bottoms: 'pants', shorts: '#2B3140', headwear: 'cap', headwearColor: '#2FB36B', facialHair: 'stubble' },
  buSri: { skin: '#B97A4F', hairStyle: 'hijab', hijab: '#8E2C48', outfit: 'dress', shirt: '#E9A23B', build: 'heavy' },
  dina: { skin: '#D9A07A', hair: '#2A1A14', hairStyle: 'ponytail', outfit: 'hoodie', shirt: '#F2F2F2', trim: '#5CC8FF', bottoms: 'pants', shorts: '#3B4A6B', glasses: 'round' },
  pakHarto: { skin: '#9C6440', hair: '#D8D8D8', hairStyle: 'short', facialHair: 'mustache', outfit: 'shirt', shirt: '#7A4A2A', collar: '#5A3520', bottoms: 'pants', shorts: '#2B2B2B', headwear: 'topi', headwearColor: '#151515', build: 'regular' },
};
