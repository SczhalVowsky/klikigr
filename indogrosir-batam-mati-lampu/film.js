// THE FILM (9:16) — "Mati lampu? Ke Indogrosir Batam aja!"
// Every frame is a pure function of t; every hit is read from score.js. Text stays inside G.SAFE.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, UI = globalThis.UI, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { T, BEAT, BAR, ev, clock } = S;
  const { clamp, lerp, ease, pulse } = U;
  const W = G.W, H = G.H, SAFE = G.SAFE;

  const BL = '#1b3fa8', RD = '#e8173b', YL = '#ffd23f', NAVY = '#0b1640', CREAM = '#fff6e3';
  UI.setTheme({ accent: BL, accent2: RD, ok: '#2E9E6B', ink: '#1d2340', muted: '#7d84a3', app: '#ffffff' });
  const HERO = { hairStyle: 'short', hair: '#1f1a17', skin: '#C68C5A', outfit: 'tee', shirt: BL, bottoms: 'pants', shorts: '#2b2f45' };
  const SITI = { hairStyle: 'hijab', hijab: RD, skin: '#D9A177', outfit: 'tee', shirt: YL, sleeves: 'long', bottoms: 'pants', shorts: '#3a3f5c' };
  const BUDI = { hairStyle: 'buzz', hair: '#1f1a17', skin: '#B97A50', outfit: 'shirt', shirt: '#2bb3a3', bottoms: 'pants', shorts: '#2b2f45', headwear: 'cap', headwearColor: RD };
  globalThis.CAST = { hero: HERO, siti: SITI, budi: BUDI };
  const hop = (t, amp) => amp * Math.sin(Math.PI * clock.phase(t)); // 0 on every beat

  // ---------------- type ----------------
  const FONT_T = 'Lilita', FONT_B = 'Fredoka';
  function title(ctx, str, x, y, size, { fill = '#fff', stroke = RD, sw, rot = 0, s = 1, alpha = 1, maxW = SAFE.w, font = FONT_T, weight = '' } = {}) {
    if (s <= 0.001 || alpha <= 0.001) return;
    ctx.save();
    ctx.font = `${weight} ${size}px "${font}"`;
    const k = Math.min(1, maxW / Math.max(1, ctx.measureText(str).width));
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * k, s * k); ctx.globalAlpha *= alpha;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const lw = (sw ?? size * 0.11) * 2;
    ctx.strokeStyle = 'rgba(0,0,20,0.28)'; ctx.lineWidth = lw; ctx.strokeText(str, 0, size * 0.07);
    ctx.strokeStyle = stroke; ctx.strokeText(str, 0, 0);
    ctx.fillStyle = fill; ctx.fillText(str, 0, 0);
    ctx.restore();
  }
  function pill(ctx, str, x, y, size, { bg = '#fff', fg = BL, bd = null, s = 1, rot = 0, alpha = 1 } = {}) {
    if (s <= 0.001) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= alpha;
    ctx.font = `700 ${size}px "${FONT_B}"`;
    const w = ctx.measureText(str).width + size * 1.3, h = size * 1.55;
    ctx.fillStyle = 'rgba(0,0,20,0.22)'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2 + 8, w, h, h / 2); ctx.fill();
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    if (bd) { ctx.strokeStyle = bd; ctx.lineWidth = 6; ctx.stroke(); }
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, size * 0.04);
    ctx.restore();
  }
  const popAt = (t, t0, d = 0.32, k = 2.2) => UI.pop(t, t0, d, k);

  // ---------------- the Indogrosir Batam sign (drawn, so it stays crisp at any size) ----------------
  function logo(ctx, cx, cy, w, { batam = true } = {}) {
    const h = w / 3.75;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.12); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2 + h * 0.07, -h / 2 + h * 0.07, w - h * 0.14, h - h * 0.14, h * 0.08); ctx.clip();
    ctx.fillStyle = '#1e3a9a'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.42);
    ctx.fillStyle = '#d7192f'; ctx.fillRect(-w / 2, h * 0.16, w, h);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-w * 0.36, -h * 0.27, w * 0.72, h * 0.54, h * 0.08); ctx.fill();
    ctx.restore();
    // wordmark: IND (target) GROSIR, bold and slanted
    const fs = h * 0.4;
    ctx.save(); ctx.transform(1, 0, -0.2, 1, 0, 0);
    ctx.font = `700 ${fs}px "${FONT_B}"`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1e3a9a';
    const a = ctx.measureText('IND').width, b = ctx.measureText('GROSIR').width, r = fs * 0.36, gap = fs * 0.06;
    let x = -(a + b + 2 * r + 2 * gap) / 2;
    ctx.textAlign = 'left'; ctx.fillText('IND', x, fs * 0.05); x += a + gap + r;
    for (const [rr, c] of [[r, '#d7192f'], [r * 0.72, '#fff'], [r * 0.5, '#d7192f'], [r * 0.25, '#fff']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, 0, rr, 0, Math.PI * 2); ctx.fill(); }
    x += r + gap; ctx.fillStyle = '#1e3a9a'; ctx.fillText('GROSIR', x, fs * 0.05);
    ctx.restore();
    if (batam) {
      const bw = w * 0.62, bh = h * 0.5, by = h / 2 + bh * 0.62;
      ctx.fillStyle = 'rgba(0,0,20,0.25)'; ctx.beginPath(); ctx.roundRect(-bw / 2, by - bh / 2 + 6, bw, bh, bh * 0.28); ctx.fill();
      ctx.fillStyle = RD; ctx.beginPath(); ctx.roundRect(-bw / 2, by - bh / 2, bw, bh, bh * 0.28); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(3, bh * 0.07); ctx.stroke();
      ctx.font = `${bh * 0.72}px "${FONT_T}"`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.letterSpacing = `${bh * 0.16}px`; ctx.fillText('BATAM', bh * 0.08, by + bh * 0.04); ctx.letterSpacing = '0px';
    }
    ctx.restore();
  }

  // ---------------- HOME: a warm living room (bars 0-3) ----------------
  const fanAngle = (t) => t < ev.blackout ? t * 22 : ev.blackout * 22 + (22 / 1.8) * (1 - Math.exp(-(t - ev.blackout) * 1.8));
  function lampOn(t) {
    if (t >= ev.blackout) return false;
    return !ev.flicker.some((f) => t >= f && t < f + 0.07);
  }
  function room(ctx, t, { lit }) {
    const g = ctx.createLinearGradient(0, 0, 0, 1450);
    g.addColorStop(0, '#ffd59a'); g.addColorStop(1, '#ffb877');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#c96a2a';
    for (let x = 30; x < W; x += 90) ctx.fillRect(x, 0, 18, 1450); // wallpaper stripes
    ctx.restore();
    G.poly(ctx, [[-40, 1450], [W + 40, 1450], [W + 40, H + 40], [-40, H + 40]], { fill: '#b8693a', lw: 5, seed: 2, hatch: { color: 'rgba(80,30,10,0.16)', gap: 10 } });
    // the window: night sky and the moon
    G.rrect(ctx, 600, 430, 360, 420, 18, { fill: '#162c6e', lw: 7, seed: 5 });
    for (const st of S.stars.slice(0, 10)) G.star(ctx, 620 + st.x * 320, 450 + st.y * 600, 7 * st.s, { fill: '#fff6c8' });
    G.ellipse(ctx, 870, 520, 46, 46, { fill: '#fff3c0', lw: 4, seed: 6 });
    G.line(ctx, [[780, 430], [780, 850]], { lw: 8, color: '#fff', seed: 7 });
    G.line(ctx, [[600, 640], [960, 640]], { lw: 8, color: '#fff', seed: 8 });
    // standing fan (kipas angin): spins, then winds down after the blackout
    G.line(ctx, [[880, 1450], [880, 1110]], { lw: 12, color: '#e9edf5', seed: 9 });
    G.ellipse(ctx, 880, 1452, 80, 18, { fill: '#e9edf5', lw: 4, seed: 10 });
    ctx.save(); ctx.translate(880, 1020);
    G.ellipse(ctx, 0, 0, 112, 112, { fill: 'rgba(220,235,255,0.55)', lw: 5, seed: 11 });
    ctx.rotate(fanAngle(t));
    for (let i = 0; i < 3; i++) { ctx.rotate((Math.PI * 2) / 3); G.ellipse(ctx, 0, -52, 30, 52, { fill: '#7cc6ff', lw: 3.5, seed: 12 + i }); }
    G.ellipse(ctx, 0, 0, 20, 20, { fill: '#e9edf5', lw: 4, seed: 15 });
    ctx.restore();
    // sofa
    G.rrect(ctx, 60, 1060, 620, 230, 50, { fill: '#2bb3a3', lw: 5, seed: 20 });
    G.rrect(ctx, 30, 1180, 120, 260, 40, { fill: '#249c8e', lw: 5, seed: 21 });
    G.rrect(ctx, 590, 1180, 120, 260, 40, { fill: '#249c8e', lw: 5, seed: 22 });
    G.rrect(ctx, 120, 1240, 520, 170, 30, { fill: '#33c4b3', lw: 5, seed: 23 });
    // the ceiling lamp
    G.line(ctx, [[300, 0], [300, 250]], { lw: 5, color: '#5a3a22', seed: 30 });
    G.poly(ctx, [[220, 340], [380, 340], [340, 250], [260, 250]], { fill: lit ? '#fff1b0' : '#c9a86a', lw: 5, seed: 31 });
    if (lit) {
      const gl = ctx.createRadialGradient(300, 360, 20, 300, 700, 900);
      gl.addColorStop(0, 'rgba(255,245,200,0.55)'); gl.addColorStop(1, 'rgba(255,245,200,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    }
  }
  function hero(ctx, t, mood) {
    const o = { x: 380, y: 1300, s: 1.35, pose: 'sit', style: HERO, seed: 300, gesture: 'phone', look: 0.3, lookY: 0.5 };
    if (mood === 'happy') Object.assign(o, { eyes: 'happy', mouth: 'smile' });
    if (mood === 'shock') Object.assign(o, { eyes: 'wide', brows: 'worried', mouth: 'o', sweat: 0.7, look: 0, lookY: 0 });
    if (mood === 'sad') Object.assign(o, { eyes: 'normal', brows: 'worried', mouth: 'wavy', sweat: 0.8 });
    if (mood === 'think') Object.assign(o, { gesture: 'think', eyes: 'normal', brows: 'up', mouth: 'flat', look: 0.4, lookY: -0.6, sweat: 0.5 });
    if (mood === 'idea') Object.assign(o, { gesture: 'pointUp', eyes: 'wide', brows: 'up', mouth: 'grin', look: 0.2, lookY: -0.5 });
    Ch.person(ctx, o);
  }
  function darkness(ctx, t, glow = 1) {
    ctx.fillStyle = 'rgba(4,8,30,0.86)'; ctx.fillRect(0, 0, W, H);
    // moonlight through the window
    ctx.save(); ctx.globalAlpha = 0.85;
    G.rrect(ctx, 600, 430, 360, 420, 18, { fill: '#132657', lw: 7, seed: 5 });
    for (const st of S.stars.slice(0, 10)) G.star(ctx, 620 + st.x * 320, 450 + st.y * 600, 7 * st.s * (0.7 + 0.3 * Math.sin(t * 4 + st.ph)), { fill: '#fff6c8' });
    G.ellipse(ctx, 870, 520, 46, 46, { fill: '#fff3c0', lw: 4, seed: 6 });
    ctx.restore();
    // the phone screen lights his face
    if (glow > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(470, 1000, 10, 470, 1000, 330);
      g.addColorStop(0, `rgba(120,170,255,${0.42 * glow})`); g.addColorStop(1, 'rgba(120,170,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }
  function shotHome(ctx, t) {
    const lit = lampOn(t);
    room(ctx, t, { lit });
    hero(ctx, t, t < ev.blackout ? 'happy' : 'shock');
    if (!lit) darkness(ctx, t, t >= ev.blackout ? 1 : 0.3);
    if (t < ev.blackout) {
      title(ctx, 'Lagi santai di rumah...', W / 2, 330, 76, { stroke: BL, s: popAt(t, 0.25) });
    } else {
      const sh = Math.sin((t - ev.q) * 50) * 10 * Math.exp(-(t - ev.q) * 5);
      title(ctx, 'Listrik di rumah', W / 2, 330, 96, { stroke: NAVY, s: popAt(t, ev.q - 0.12) });
      title(ctx, 'PADAM?!', W / 2 + sh, 480, 190, { fill: YL, stroke: RD, s: popAt(t, ev.q, 0.3, 2.6), rot: -0.04 });
    }
  }
  // bar 2: the phone close-up — 5% battery, no signal
  function lockScreen(ctx, w, h, t) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0f1a40'); g.addColorStop(1, '#05091c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    UI.text(ctx, '19:30', w / 2, 170, { size: 80, weight: 300, color: '#dfe6ff', align: 'center' });
    // battery
    const blink = ev.battery.reduce((a, tb) => Math.max(a, pulse(t, tb, 5)), 0);
    const bx = w / 2 - 70, by = 260;
    ctx.strokeStyle = '#dfe6ff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(bx, by, 140, 250, 22); ctx.stroke();
    ctx.fillStyle = '#dfe6ff'; ctx.beginPath(); ctx.roundRect(w / 2 - 30, by - 22, 60, 22, 6); ctx.fill();
    ctx.fillStyle = `rgba(255,${60 + 120 * (1 - blink)},${60 + 120 * (1 - blink)},1)`; ctx.fillStyle = blink > 0.3 ? '#ff4d4d' : '#e8173b';
    ctx.beginPath(); ctx.roundRect(bx + 14, by + 250 - 14 - 22, 112, 22, 6); ctx.fill();
    UI.text(ctx, '5%', w / 2, by + 330, { size: 64, weight: 800, color: blink > 0.3 ? '#ff6b6b' : '#ff4d4d', align: 'center' });
    UI.text(ctx, 'Baterai lemah', w / 2, by + 376, { size: 22, weight: 600, color: '#9fb0e8', align: 'center' });
    // no wifi
    const nw = popAt(t, ev.noWifi, 0.3, 2.4);
    if (nw > 0) {
      ctx.save(); ctx.translate(w / 2, by + 480); ctx.scale(nw, nw);
      ctx.strokeStyle = '#9fb0e8'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      for (const r of [22, 46, 70]) { ctx.beginPath(); ctx.arc(0, 30, r, -Math.PI * 0.78, -Math.PI * 0.22); ctx.stroke(); }
      ctx.fillStyle = '#9fb0e8'; ctx.beginPath(); ctx.arc(0, 30, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-60, -40); ctx.lineTo(60, 40); ctx.stroke();
      ctx.restore();
      UI.text(ctx, 'Tidak ada koneksi', w / 2, by + 570, { size: 24, weight: 700, color: '#ff8a8a', align: 'center', alpha: clamp(nw) });
    }
  }
  function shotPhoneLow(ctx, t) {
    ctx.fillStyle = '#040817'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, 1050, 50, W / 2, 1050, 800);
    g.addColorStop(0, 'rgba(60,90,180,0.35)'); g.addColorStop(1, 'rgba(60,90,180,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rise = ease.outCubic(clamp((t - T(2)) / 0.3));
    UI.phone(ctx, W / 2, lerp(1300, 1080, rise), 1060, lockScreen, t, { rot: lerp(0.08, -0.02, rise), dark: true, time: '19:30', bezel: '#0d0d12' });
    title(ctx, 'Baterai tinggal 5%...', W / 2, 310, 84, { stroke: RD, s: popAt(t, T(2, 0.1)) });
    title(ctx, 'WiFi ikut mati!', W / 2, 425, 84, { fill: YL, stroke: NAVY, s: popAt(t, T(2, 1.1)) });
  }
  // bar 3: the idea
  function bulb(ctx, x, y, p, t) {
    if (p <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(p, p);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 260); g.addColorStop(0, 'rgba(255,230,120,0.75)'); g.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = g; ctx.fillRect(-300, -300, 600, 600); ctx.restore();
    G.rays(ctx, 0, 0, { n: 10, r0: 85, r1: 130, color: YL, lw: 9, spin: t * 0.6 });
    G.ellipse(ctx, 0, 0, 62, 66, { fill: '#fff07a', lw: 5, seed: 40 });
    G.rrect(ctx, -28, 58, 56, 40, 8, { fill: '#c0c6d6', lw: 4, seed: 41 });
    ctx.restore();
  }
  function shotIdea(ctx, t) {
    room(ctx, t, { lit: false });
    const idea = t >= ev.idea;
    hero(ctx, t, idea ? 'idea' : 'think');
    darkness(ctx, t, 0.6);
    // redraw him on top, softly lit by the bulb, once he has the idea
    const bp = popAt(t, ev.idea, 0.35, 2.6);
    if (idea) { ctx.save(); ctx.globalAlpha = clamp(bp) * 0.85; hero(ctx, t, 'idea'); ctx.restore(); }
    bulb(ctx, 560, 700, bp, t);
    title(ctx, 'Tenang...', W / 2, 330, 110, { stroke: BL, s: popAt(t, T(3, 0.2)) });
    title(ctx, 'ada tempatnya!', W / 2, 460, 104, { fill: YL, stroke: RD, s: popAt(t, ev.idea + 0.06) });
  }

  // ---------------- THE DROP: Indogrosir Batam, lit up (bar 4) ----------------
  function houses(ctx) {
    for (const [x, w, h] of [[-40, 250, 330], [170, 160, 240], [870, 240, 300]]) {
      G.rrect(ctx, x, 1450 - h, w, h, 6, { fill: '#0a1238', lw: 4, seed: x + 100 });
      G.poly(ctx, [[x - 20, 1450 - h], [x + w / 2, 1450 - h - 110], [x + w + 20, 1450 - h]], { fill: '#0d1748', lw: 4, seed: x + 101 });
      for (let k = 0; k < 2; k++) G.rrect(ctx, x + 30 + k * (w - 110), 1450 - h + 60, 50, 60, 4, { fill: '#141d4a', lw: 3, seed: x + k });
    }
  }
  function storeFront(ctx, t, { glow = 1 } = {}) {
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, 1500); g.addColorStop(0, '#081133'); g.addColorStop(1, '#22409a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const st of S.stars) G.star(ctx, st.x * W, st.y * 900, 6 * st.s * (0.6 + 0.4 * Math.sin(t * 3 + st.ph)), { fill: '#fff6c8' });
    // light bursting out behind the store
    ctx.save(); ctx.globalAlpha = 0.5 * glow;
    G.rays(ctx, W / 2, 900, { n: 18, r0: 200, r1: 1500, color: 'rgba(255,224,120,0.5)', lw: 60, spin: t * 0.15 });
    ctx.restore();
    const hg = ctx.createRadialGradient(W / 2, 1000, 100, W / 2, 1000, 900);
    hg.addColorStop(0, `rgba(255,230,140,${0.55 * glow})`); hg.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    houses(ctx);
    // building
    G.rrect(ctx, 130, 640, 820, 820, 10, { fill: '#eef1fa', lw: 6, seed: 50 });
    G.rrect(ctx, 110, 620, 860, 300, 14, { fill: BL, lw: 6, seed: 51 });
    logo(ctx, W / 2, 735, 600);
    // the shop window: bright, with shelves
    G.rrect(ctx, 170, 960, 740, 470, 10, { fill: '#fff4c4', lw: 6, seed: 52 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 14; c++) {
      const col = ['#e8173b', '#1b3fa8', '#ffd23f', '#2bb3a3', '#ff8a00'][Math.floor(U.hash(r, c, 3) * 5)];
      ctx.fillStyle = col; ctx.fillRect(190 + c * 51, 1010 + r * 120, 40, 70 + U.hash(r, c) * 20);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(170, 960, 740, 470);
    G.rrect(ctx, 440, 1080, 200, 350, 6, { fill: 'rgba(200,230,255,0.55)', lw: 5, seed: 53 }); // the door
    G.line(ctx, [[540, 1080], [540, 1430]], { lw: 4, color: '#9bb3d6', seed: 54 });
    // ground
    G.poly(ctx, [[-40, 1450], [W + 40, 1450], [W + 40, H + 40], [-40, H + 40]], { fill: '#2b3354', lw: 5, seed: 55 });
    const pool = ctx.createRadialGradient(W / 2, 1460, 20, W / 2, 1460, 600);
    pool.addColorStop(0, `rgba(255,236,160,${0.5 * glow})`); pool.addColorStop(1, 'rgba(255,236,160,0)');
    ctx.fillStyle = pool; ctx.fillRect(0, 1450, W, 470);
  }
  function shotStore(ctx, t) {
    storeFront(ctx, t);
    const wk = Ch.walk(t, { x0: -160, speed: 330, t0: ev.lightsOn, stride: 300, s: 1.05 });
    Ch.person(ctx, { ...wk, x: Math.min(wk.x, 470), pose: wk.x < 470 ? 'walk' : 'stand', y: 1640, s: 1.05, style: HERO, seed: 300, eyes: 'happy', mouth: 'grin', gesture: wk.x < 470 ? undefined : 'thumbsUp', look: 1 });
    title(ctx, 'Di INDOGROSIR BATAM', W / 2, 300, 88, { stroke: BL, s: popAt(t, T(4, 0.5)) });
    title(ctx, 'tetap TERANG!', W / 2, 440, 150, { fill: YL, stroke: RD, s: popAt(t, T(4, 1)), rot: -0.03 });
    const fl = 0.95 * Math.exp(-(t - ev.lightsOn) * 7);
    if (fl > 0.01) { ctx.fillStyle = `rgba(255,252,235,${fl})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------------- INSIDE: the benefits (bars 5-9) ----------------
  function interior(ctx, t) {
    ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, 180);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.roundRect(60 + i * 260, 60, 180, 30, 15); ctx.fill(); }
    const gl = ctx.createLinearGradient(0, 0, 0, 700); gl.addColorStop(0, 'rgba(255,240,170,0.45)'); gl.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, 700);
    // shelves
    for (let r = 0; r < 4; r++) {
      const y = 560 + r * 220;
      for (let c = 0; c < 16; c++) {
        const col = ['#e8173b', '#1b3fa8', '#ffd23f', '#2bb3a3', '#ff8a00', '#8f5cff'][Math.floor(U.hash(r, c, 9) * 6)];
        const hh = 110 + U.hash(c, r) * 60;
        ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(20 + c * 66, y - hh, 54, hh, 8); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(28 + c * 66, y - hh + 14, 38, 16);
      }
      ctx.fillStyle = '#c9cfe0'; ctx.fillRect(0, y, W, 22);
    }
    ctx.fillStyle = 'rgba(255,246,227,0.55)'; ctx.fillRect(0, 0, W, H); // push the shelves back
    // floor
    ctx.fillStyle = '#e6e8f0'; ctx.fillRect(0, 1460, W, 460);
    ctx.strokeStyle = 'rgba(120,130,170,0.25)'; ctx.lineWidth = 3;
    for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(W / 2 + k * 60, 1460); ctx.lineTo(W / 2 + k * 260, H); ctx.stroke(); }
    for (const y of [1520, 1610, 1730, 1880]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  function caption(ctx, t) {
    for (const c of S.captions) {
      if (t < c.t - 0.05 || t > c.end + 0.25) continue;
      const lines = { 'Bisa ngecas HP': ['Bisa ngecas HP'], 'Tetap online, balas chat WhatsApp': ['Tetap online,', 'balas chat WhatsApp'],
        'Scroll sosmed tanpa takut lowbat': ['Scroll sosmed', 'tanpa takut lowbat'], 'Sambil belanja minuman & camilan': ['Sambil belanja', 'minuman & camilan'],
        'Nongkrong santai bareng teman': ['Nongkrong santai', 'bareng teman'] }[c.text];
      const out = 1 - clamp((t - c.end) / 0.2);
      if (lines.length === 1) title(ctx, lines[0], W / 2, 370, 120, { stroke: BL, s: popAt(t, c.t) * out });
      else {
        title(ctx, lines[0], W / 2, 290, 92, { stroke: BL, s: popAt(t, c.t) * out });
        title(ctx, lines[1], W / 2, 418, 92, { fill: YL, stroke: RD, s: popAt(t, c.t + 0.12) * out });
      }
    }
  }
  // phone screens (412 points wide)
  function chargeScreen(ctx, w, h, t) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#13246b'); g.addColorStop(1, '#0a1440');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    let pct = 5, from = 5, t0 = -9;
    for (const s of S.chargeSteps) if (t >= s.t) { from = pct; pct = s.pct; t0 = s.t; }
    const shown = lerp(from, pct, ease.outCubic(clamp((t - t0) / 0.18)));
    const col = shown < 20 ? '#ff4d4d' : shown < 60 ? '#ffd23f' : '#3ddc84';
    const bx = w / 2 - 80, by = 200, bh = 300;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.beginPath(); ctx.roundRect(bx, by, 160, bh, 26); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(w / 2 - 34, by - 24, 68, 24, 8); ctx.fill();
    const fh = (bh - 28) * shown / 100;
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(bx + 14, by + bh - 14 - fh, 132, Math.max(8, fh), 14); ctx.fill();
    // lightning bolt
    const bp = 1 + 0.15 * S.chargeSteps.reduce((a, s) => Math.max(a, pulse(t, s.t, 8)), 0);
    ctx.save(); ctx.translate(w / 2, by + bh / 2); ctx.scale(bp, bp);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = NAVY; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(14, -70); ctx.lineTo(-38, 10); ctx.lineTo(-4, 10); ctx.lineTo(-16, 70); ctx.lineTo(38, -12); ctx.lineTo(4, -12); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
    UI.text(ctx, `${Math.round(shown)}%`, w / 2, by + bh + 100, { size: 76, weight: 800, color: '#fff', align: 'center' });
    UI.text(ctx, shown >= 100 ? 'Terisi penuh!' : 'Mengisi daya...', w / 2, by + bh + 150, { size: 26, weight: 700, color: shown >= 100 ? '#3ddc84' : '#b9c6ff', align: 'center' });
  }
  function chatScreen(ctx, w, h, t) {
    ctx.fillStyle = '#efe7dc'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.globalAlpha = 0.08; for (let i = 0; i < 40; i++) { ctx.fillStyle = '#8a6d4a'; ctx.beginPath(); ctx.arc(U.hash(i, 1) * w, U.hash(i, 2) * h, 6, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    ctx.fillStyle = BL; ctx.fillRect(0, 0, w, 150);
    UI.text(ctx, '‹', 20, 118, { size: 40, weight: 400, color: '#fff' });
    ctx.fillStyle = YL; ctx.beginPath(); ctx.arc(76, 104, 26, 0, Math.PI * 2); ctx.fill();
    UI.text(ctx, 'R', 76, 113, { size: 24, weight: 800, color: BL, align: 'center' });
    UI.text(ctx, 'Rina', 116, 100, { size: 22, weight: 800, color: '#fff' });
    UI.text(ctx, 'online', 116, 126, { size: 15, weight: 600, color: '#c9d4ff' });
    UI.chat(ctx, w, S.chat, t, { y0: 190, typing: BEAT * 0.8, size: 20 });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(14, h - 86, 320, 52, 26); ctx.fill();
    UI.text(ctx, 'Ketik pesan', 36, h - 52, { size: 17, weight: 500, color: UI.theme.muted });
    ctx.fillStyle = BL; ctx.beginPath(); ctx.arc(368, h - 60, 26, 0, Math.PI * 2); ctx.fill();
  }
  const POSTS = [['#ff8a00', 'Kuliner Batam'], ['#2bb3a3', 'Pantai Melur'], ['#8f5cff', 'Jembatan Barelang'], ['#e8173b', 'Promo hari ini'], ['#1b3fa8', 'Nongkrong asik'], ['#ffd23f', 'Es kopi susu']];
  function feedScreen(ctx, w, h, t) {
    ctx.fillStyle = '#f3f4f8'; ctx.fillRect(0, 0, w, h);
    const PH = 470;
    let off = 0; for (const s of S.swipes) off += ease.outCubic(clamp((t - s.t) / 0.25)) * PH;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 140, w, h - 140); ctx.clip();
    POSTS.forEach(([col, name], i) => {
      const y = 160 + i * PH - off;
      if (y > h || y + PH < 0) return;
      UI.card(ctx, 14, y, w - 28, PH - 20, 20, { shadow: false });
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(52, y + 40, 22, 0, Math.PI * 2); ctx.fill();
      UI.text(ctx, name, 86, y + 47, { size: 18, weight: 800 });
      ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(14, y + 80, w - 28, 300); ctx.globalAlpha = 1;
      for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(80 + k * 120, y + 230 + (k % 2) * 40, 40 + k * 8, 0, Math.PI * 2); ctx.fill(); }
      const liked = i >= 1 && S.swipes[i - 1] && t >= S.swipes[i - 1].heart;
      G.heart(ctx, 46, y + 418, liked ? 1.1 : 0.9);
      if (!liked) { ctx.fillStyle = '#f3f4f8'; ctx.beginPath(); ctx.arc(46, y + 410, 9, 0, Math.PI * 2); ctx.fill(); }
      UI.text(ctx, liked ? `${120 + i * 37} suka` : `${119 + i * 37} suka`, 76, y + 425, { size: 16, weight: 700, color: UI.theme.muted });
    });
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 50, w, 90);
    UI.text(ctx, 'Beranda', 24, 110, { size: 30, weight: 900, color: BL });
    // the big heart on each like
    for (const s of S.swipes) {
      const p = popAt(t, s.heart, 0.25, 2.6), f = 1 - clamp((t - s.heart - 0.3) / 0.2);
      if (p > 0 && f > 0) { ctx.save(); ctx.globalAlpha = f; ctx.translate(w / 2, 420); ctx.scale(p * 3.2, p * 3.2); ctx.fillStyle = RD; G.heart(ctx, 0, 0, 1); ctx.restore(); }
    }
  }
  const SCREENS = [chargeScreen, chatScreen, feedScreen];
  function phoneScreen(ctx, w, h, t) {
    const i = clamp(Math.floor((t - T(5)) / BAR), 0, 2);
    const u = i > 0 ? clamp((t - T(5 + i)) / 0.24) : 1;
    if (u < 1) { ctx.save(); ctx.translate(-u * 120, 0); SCREENS[i - 1](ctx, w, h, t); ctx.restore(); }
    ctx.save(); ctx.translate((1 - ease.outCubic(u)) * w, 0); SCREENS[i](ctx, w, h, t); ctx.restore();
  }
  function shotPhone(ctx, t) {
    interior(ctx, t);
    const rise = ease.outBack(clamp((t - T(5)) / 0.4), 1.2);
    const cy = lerp(H + 600, 1050, rise);
    // the charging cable runs down out of frame
    G.line(ctx, [[W / 2, cy + 500], [W / 2 + 10, cy + 640], [W / 2 - 30, H + 40]], { lw: 22, color: '#f4f6fb', seed: 70 });
    G.line(ctx, [[W / 2, cy + 500], [W / 2 + 10, cy + 640], [W / 2 - 30, H + 40]], { lw: 10, color: '#d5dbea', seed: 71 });
    UI.phone(ctx, W / 2, cy, 1040, phoneScreen, t, { rot: lerp(0.1, 0.0, rise) + Math.sin(t * 2) * 0.008, time: '19:42', dark: t < T(6) + 0.12 });
    // hearts float out of the phone on every like
    for (const s of S.swipes) {
      const a = t - s.heart; if (a < 0 || a > 1.4) continue;
      const k = S.swipes.indexOf(s);
      ctx.save(); ctx.globalAlpha = 1 - a / 1.4; ctx.fillStyle = RD;
      G.heart(ctx, (k % 2 ? 860 : 220) + Math.sin(a * 6 + k) * 30, 900 - a * 380, 2.2); ctx.restore();
    }
    caption(ctx, t);
  }
  // snacks into the basket
  function item(ctx, kind, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    if (kind === 'bottle') {
      G.rrect(ctx, -42, -150, 84, 300, 30, { fill: '#9fd8ff', lw: 5, seed: 80 });
      G.rrect(ctx, -26, -190, 52, 48, 10, { fill: BL, lw: 5, seed: 81 });
      G.rrect(ctx, -44, -40, 88, 80, 6, { fill: '#fff', lw: 4, seed: 82 });
      ctx.fillStyle = BL; ctx.font = `30px "${FONT_T}"`; ctx.textAlign = 'center'; ctx.fillText('AIR', 0, 12);
    } else if (kind === 'chips') {
      G.poly(ctx, [[-95, -140], [95, -140], [110, 140], [-110, 140]], { fill: YL, lw: 5, seed: 83 });
      G.ellipse(ctx, 0, 30, 60, 50, { fill: '#ffb000', lw: 4, seed: 84 });
      ctx.fillStyle = RD; ctx.font = `38px "${FONT_T}"`; ctx.textAlign = 'center'; ctx.fillText('KERIPIK', 0, -70);
    } else if (kind === 'can') {
      G.rrect(ctx, -55, -110, 110, 220, 22, { fill: RD, lw: 5, seed: 85 });
      G.ellipse(ctx, 0, -108, 52, 14, { fill: '#d8dbe6', lw: 4, seed: 86 });
      ctx.fillStyle = '#fff'; ctx.font = `36px "${FONT_T}"`; ctx.textAlign = 'center'; ctx.fillText('SODA', 0, 10);
    } else if (kind === 'noodle') {
      G.poly(ctx, [[-90, -100], [90, -100], [70, 110], [-70, 110]], { fill: '#fff', lw: 5, seed: 87 });
      G.rrect(ctx, -96, -120, 192, 30, 10, { fill: RD, lw: 4, seed: 88 });
      ctx.fillStyle = RD; ctx.font = `34px "${FONT_T}"`; ctx.textAlign = 'center'; ctx.fillText('MIE', 0, 20);
    }
    ctx.restore();
  }
  function shotSnack(ctx, t) {
    interior(ctx, t);
    const bx = W / 2, by = 1300, land = [-190, -60, 70, 190];
    // basket back
    G.rrect(ctx, bx - 330, by - 150, 660, 60, 20, { fill: '#b8101f', lw: 5, seed: 90 });
    S.drops.forEach((d, i) => {
      const p = clamp((t - (d.t - 0.4)) / 0.4);
      if (p <= 0) return;
      const y = p < 1 ? lerp(-300, by - 140, ease.inQuad(p)) : by - 140 - 26 * Math.exp(-(t - d.t) * 9) * Math.abs(Math.cos((t - d.t) * 22));
      item(ctx, d.kind, bx + land[i], y, 1.0, (i - 1.5) * 0.12 + (p < 1 ? (1 - p) * 0.8 : 0));
    });
    // basket front
    G.poly(ctx, [[bx - 340, by - 110], [bx + 340, by - 110], [bx + 290, by + 160], [bx - 290, by + 160]], { fill: RD, lw: 6, seed: 91 });
    ctx.fillStyle = 'rgba(120,0,15,0.35)';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) { ctx.beginPath(); ctx.roundRect(bx - 270 + c * 62 + r * 6, by - 70 + r * 70, 40, 44, 10); ctx.fill(); }
    G.rrect(ctx, bx - 360, by - 130, 720, 40, 16, { fill: '#ff3d55', lw: 5, seed: 92 });
    ctx.save(); ctx.font = `44px "${FONT_T}"`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('INDOGROSIR', bx, by + 120); ctx.restore();
    caption(ctx, t);
  }
  function shotHangout(ctx, t) {
    // the terrace in front of the lit store
    interior(ctx, t);
    ctx.fillStyle = 'rgba(27,63,168,0.18)'; ctx.fillRect(0, 0, W, H);
    const up = t >= S.cheers;
    const people = [[230, HERO, 300, 'phone'], [540, SITI, 320, 'phone'], [850, BUDI, 340, 'wave']];
    people.forEach(([x, style, seed, g], i) => {
      const b = hop(t + i * 0.07, 22);
      Ch.person(ctx, { x, y: 1330 - b, s: 1.1, pose: 'sit', style, seed, eyes: 'happy', mouth: up ? 'open' : (i === 1 ? 'grin' : 'smile'), blush: 0.4, gesture: up ? 'cheer' : g, look: i === 0 ? 0.5 : i === 2 ? -0.5 : 0 });
    });
    // table + drinks
    G.rrect(ctx, 250, 1330, 580, 46, 18, { fill: '#ffffff', lw: 5, seed: 95 });
    G.rrect(ctx, 520, 1376, 40, 200, 8, { fill: '#c9cfe0', lw: 4, seed: 96 });
    for (const [x, c] of [[360, RD], [520, '#ff8a00'], [700, BL]]) {
      const lift = up ? -60 * ease.outBack(clamp((t - S.cheers) / 0.2)) : 0;
      G.rrect(ctx, x - 28, 1240 + lift, 56, 90, 10, { fill: c, lw: 4, seed: x });
      G.line(ctx, [[x + 8, 1240 + lift], [x + 22, 1190 + lift]], { lw: 6, color: '#fff', seed: x + 1 });
    }
    if (up) { const a = 1 - clamp((t - S.cheers) / 0.8); ctx.save(); ctx.globalAlpha = a; G.rays(ctx, 530, 1150, { n: 12, r0: 50, r1: 140, color: YL, lw: 10 }); ctx.restore(); }
    caption(ctx, t);
  }

  // ---------------- END CARD ----------------
  function confetti(ctx, t) {
    for (let i = 0; i < 46; i++) {
      const a = t - ev.logo - U.hash(i, 3) * 0.6; if (a < 0) continue;
      const x = U.hash(i, 1) * W + Math.sin(a * 2 + i) * 40, y = -40 + a * (380 + U.hash(i, 2) * 220);
      if (y > H) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a * (3 + U.hash(i, 4) * 4));
      ctx.fillStyle = [YL, RD, '#fff', '#7cc6ff', '#3ddc84'][i % 5]; ctx.fillRect(-10, -16, 20, 32 * Math.abs(Math.cos(a * 5 + i)));
      ctx.restore();
    }
  }
  function shotEnd(ctx, t) {
    const g = ctx.createRadialGradient(W / 2, 760, 50, W / 2, 760, 1200);
    g.addColorStop(0, '#3f72ff'); g.addColorStop(1, '#0b2f9e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.18; G.rays(ctx, W / 2, 760, { n: 20, r0: 0, r1: 1600, color: '#fff', lw: 70, spin: t * 0.12 }); ctx.restore();
    confetti(ctx, t);
    title(ctx, 'Mati lampu?', W / 2, 320, 130, { stroke: RD, s: popAt(t, ev.logo, 0.35, 2.4) });
    const lp = popAt(t, ev.logo + 0.12, 0.45, 2.2);
    if (lp > 0) {
      ctx.save(); ctx.translate(W / 2, 620); ctx.scale(lp, lp); ctx.rotate((1 - clamp(lp)) * -0.2);
      ctx.fillStyle = 'rgba(0,0,30,0.25)'; ctx.beginPath(); ctx.roundRect(-410, -150 + 14, 820, 380, 40); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-410, -150, 820, 380, 40); ctx.fill();
      UI.text(ctx, 'Ke sini aja!', 0, -88, { size: 50, weight: 800, color: BL, align: 'center', font: FONT_B });
      logo(ctx, 0, 30, 640);
      ctx.restore();
    }
    const cols = [[YL, NAVY], ['#fff', BL], [RD, '#fff']];
    S.tagline.forEach((w, i) => pill(ctx, w.w, W / 2, 940 + i * 120, 58, { bg: cols[i][0], fg: cols[i][1], s: popAt(t, w.t, 0.3, 2.4), rot: (i - 1) * 0.025 }));
    title(ctx, 'Mitra Usaha Terpercaya', W / 2, 1340, 76, { fill: YL, stroke: NAVY, s: popAt(t, S.cta, 0.35, 2.2) });
  }

  Studio.film({
    async init() {
      await Studio.loadFont(FONT_T, 'assets/lilita.woff2', 400);
      await Studio.loadFont(FONT_B, 'assets/fredoka-700.woff2', 700);
    },
    draw(ctx, t) {
      if (t < T(2)) shotHome(ctx, t);
      else if (t < T(3)) shotPhoneLow(ctx, t);
      else if (t < ev.breath[0]) shotIdea(ctx, t);
      else if (t < ev.lightsOn) { // the held breath: freeze on the idea and dim
        shotIdea(ctx, ev.breath[0] - 0.001);
        ctx.fillStyle = 'rgba(0,0,10,0.45)'; ctx.fillRect(0, 0, W, H);
      } else if (t < T(5)) shotStore(ctx, t);
      else if (t < T(8)) shotPhone(ctx, t);
      else if (t < T(9)) shotSnack(ctx, t);
      else if (t < ev.logo) shotHangout(ctx, t);
      else shotEnd(ctx, t);
      // a quick white flash on each bar-line cut inside the benefits
      for (const tc of [T(5), T(8), T(9)]) { const f = 0.6 * Math.exp(-(t - tc) * 14); if (t >= tc && f > 0.01) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H); } }
      if (t > ev.logo - 0.3 && t < ev.logo) UI.iris(ctx, t, ev.logo, { cx: W / 2, cy: 1150, dur: 0.3, color: '#0b2f9e' });
    },
    post: { paper: 0.12, vignette: 0.16, grain: 0.03 },
    fadeOut: 0.9,
  });
})();
