// THE SCORE — "Gimana kalau ada lubang tembus Bumi dari Jakarta?"
// Single source of truth for music AND picture, plus the physics model the on-screen counters read.
// Narration is not voiced: lines are karaoke captions so the creator can record their own voice in sync.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const WIDE = W / H > 1.2;
  const STYLE = 'flat';
  const clock = makeClock({ bpm: 120, offset: 0.5 }); // 1 beat = 0.5 s, 1 bar = 2 s
  const { T, BEAT } = clock;
  const DURATION = T(33) + 0.5; // 67 s

  const S = {
    hook: [0, T(2)],
    globe: [T(2), T(4)],
    jump: [T(4), T(6)],
    monas: [T(6), T(8, 2)],
    kola: [T(8, 2), T(11)],
    float: [T(11), T(14)],
    inti: [T(14), T(17)],
    panas: [T(17), T(19, 2)],
    pusat: [T(19, 2), T(22)],
    kolombia: [T(22), T(25)],
    balik: [T(25), T(28)],
    cta: [T(28), T(30)],
    sumber: [T(30), DURATION],
  };
  const ev = {
    jump: T(5, 2), // he leaps
    center: T(20, 2), // passes the centre of the Earth
    popOut: T(24, 2), // head pops out in Colombia
    fallBack: T(26), // slips and falls back
    cta: T(28),
    sumber: T(30),
  };

  // ---------- physics (Klotz 2015 style: gravity ~constant through the mantle, falling linearly in the core) ----------
  const R = 6371e3, RC = 3480e3, RI = 1221e3, g = 9.8;
  const tCMB = Math.sqrt((2 * (R - RC)) / g); // ~769 s
  const vCMB = g * tCMB;
  const w = Math.sqrt(g / RC);
  const A = Math.sqrt(RC * RC + (vCMB / w) * (vCMB / w));
  const phi0 = Math.asin(RC / A);
  const tCentre = tCMB + phi0 / w; // ~1162 s (19.4 min)
  const tTrip = 2 * tCentre; // ~38.7 min
  const half = (tau) => { // tau in [0, tCentre] -> {d (m, from the start), v (m/s)}
    if (tau <= tCMB) return { d: 0.5 * g * tau * tau, v: g * tau };
    const ph = phi0 - w * (tau - tCMB);
    return { d: R - A * Math.sin(ph), v: A * w * Math.cos(ph) };
  };
  // the whole trip: depth below the surface you're nearest to, distance travelled along the tunnel, speed
  const fall = (tau) => {
    tau = Math.max(0, tau);
    const k = Math.floor(tau / tTrip), u = tau - k * tTrip; // k = which crossing
    let travelled, v;
    if (u <= tCentre) { const h = half(u); travelled = h.d; v = h.v; } else { const h = half(tTrip - u); travelled = 2 * R - h.d; v = h.v; }
    const depth = Math.min(travelled, 2 * R - travelled);
    return { travelled, depth, v, trip: k, toward: k % 2 === 0 ? 'KOLOMBIA' : 'JAKARTA' };
  };
  // temperature vs depth (km): rough estimates for display only (Kola ~180 °C at 12 km; core ~5,400 °C)
  const GEO_T = [[0, 30], [12, 180], [35, 500], [100, 1300], [410, 1500], [660, 1900], [2900, 3800], [5150, 5400], [6371, 5500]];
  const tempAt = (km) => { for (let i = 1; i < GEO_T.length; i++) if (km <= GEO_T[i][0]) { const [a, ta] = GEO_T[i - 1], [b, tb] = GEO_T[i]; return ta + ((km - a) / (b - a)) * (tb - ta); } return 5500; };
  const layerAt = (km) => (km < 35 ? 'KERAK' : km < 2900 ? 'MANTEL' : km < 5150 ? 'INTI LUAR' : 'INTI DALAM');

  // video time -> fall time (compressed). Anchors: [video t, tau seconds]
  const TAU = [
    [ev.jump, 0], [13.6, 6], [18.4, 50], [22.5, 70], [T(14) + 0.1, tCMB], [T(17), 1032], [T(19, 2), 1135], [ev.center, tCentre],
    [T(22), tCentre + 40], [T(23, 2), tTrip - 300], [ev.popOut, tTrip], [ev.fallBack, tTrip], [T(28), tTrip + 700],
  ];
  const tauAt = (t) => {
    if (t <= TAU[0][0]) return 0;
    for (let i = 1; i < TAU.length; i++) if (t <= TAU[i][0]) { const [a, ta] = TAU[i - 1], [b, tb] = TAU[i]; return ta + ((t - a) / (b - a)) * (tb - ta); }
    return TAU[TAU.length - 1][1];
  };

  // ---------- narration (to be recorded by the creator) ----------
  const VO_RAW = [
    [0.4, 4.2, 'Gimana kalau ada lubang tembus Bumi… dari Jakarta?'],
    [4.7, 8.3, 'Ujung satunya? Kolombia. Persis di sisi lain Bumi.'],
    [8.7, 12.3, 'Anggap lubangnya hampa udara dan tahan panas. Kamu lompat.'],
    [12.8, 16.9, 'Enam detik: kamu sudah lebih dalam dari tinggi Monas.'],
    [17.7, 22.3, 'Lima puluh detik: kamu lewati lubang terdalam yang pernah digali manusia.'],
    [22.8, 27.9, 'Dan selama jatuh, kamu melayang. Tanpa berat. Kayak astronot.'],
    [28.7, 34.3, 'Menit ketiga belas: inti Bumi. Kecepatanmu? Lebih dari dua puluh ribu kilometer per jam.'],
    [34.7, 39.3, 'Di sekelilingmu, lebih dari lima ribu derajat. Sepanas permukaan Matahari.'],
    [39.6, 44.4, 'Menit kesembilan belas: pusat Bumi. Kecepatan puncak: lebih dari delapan kilometer per detik.'],
    [44.7, 50.3, 'Lalu kamu melambat… melambat… dan menit ketiga puluh delapan, kepalamu nongol di Kolombia.'],
    [50.7, 56.3, 'Tapi kalau nggak ada yang nangkep… kamu jatuh lagi. Balik ke Jakarta. Selamanya.'],
    [56.7, 60.3, 'Berani lompat? Tag teman yang mau kamu ajak.'],
  ];
  const vo = VO_RAW.map(([t, end, text]) => {
    const ws = text.split(' ');
    const weight = ws.map((x) => x.length + 2 + (/[.,?…:]$/.test(x) ? 4 : 0));
    const total = weight.reduce((a, b) => a + b, 0);
    let acc = t;
    const words = ws.map((x, i) => { const d = ((end - t) * weight[i]) / total; const o = { w: x, t: acc, end: acc + d }; acc += d; return o; });
    return { t, end, text, words };
  });

  const SOURCES = [
    ['Waktu jatuh 38 menit', 'Klotz, A. (2015). The gravity tunnel in a non-uniform Earth. American Journal of Physics 83(3).'],
    ['Kecepatan > 8 km/detik', 'Live Science (2015). How long would it take to fall through the Earth?'],
    ['Lubang Kola 12.262 m', 'Kola Superdeep Borehole, Wikipedia (diakses 2026).'],
    ['Inti Bumi ±5.400°C', 'Smithsonian Magazine (2013). The center of the Earth is as hot as the Sun.'],
    ['Titik tembus: Santander, Kolombia', 'Geodatos. Antipode of Jakarta, Indonesia.'],
  ];

  // ---------- harmony ----------
  const { chords, chordAt } = makeChords(clock, {
    Dm: { notes: ['A3', 'D4', 'F4'], bass: 'D2' },
    Bb: { notes: ['Bb3', 'D4', 'F4'], bass: 'Bb1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    Gm: { notes: ['G3', 'Bb3', 'D4'], bass: 'G1' },
    A: { notes: ['A3', 'C#4', 'E4'], bass: 'A1' },
    Dmaj: { notes: ['A3', 'D4', 'F#4'], bass: 'D2' },
  }, (() => {
    const rows = [], cyc = ['Dm', 'Bb', 'F', 'C'];
    for (let b = 0; b < 33; b++) {
      let c = cyc[b % 4];
      if (b >= 19 && b < 22) c = ['Gm', 'A', 'A'][b - 19];
      if (b >= 30) c = b % 2 ? 'F' : 'Bb';
      rows.push([b, 0, 4, c]);
    }
    return rows;
  })());

  const HOOK = {
    a: [['D5', 0, 2], ['F5', 2, 1], ['A5', 3, 1], ['G5', 4, 2], ['F5', 6, 2]],
    b: [['D5', 0, 2], ['F5', 2, 1], ['Bb5', 3, 1], ['A5', 4, 4]],
    c: [['C5', 0, 2], ['F5', 2, 1], ['A5', 3, 1], ['C6', 4, 2], ['A5', 6, 2]],
    d: [['G5', 0, 3], ['F5', 3, 1], ['E5', 4, 4]],
  };
  const leadMel = [];
  [14, 15, 16, 17, 18].forEach((b, i) => leadMel.push(...placeBar(clock, HOOK['abcd'[i % 4]], b)));
  [22, 23, 24].forEach((b, i) => leadMel.push(...placeBar(clock, HOOK['abc'[i]], b, -12)));
  [28, 29].forEach((b, i) => leadMel.push(...placeBar(clock, HOOK['ab'[i]], b)));

  const markers = {
    globe: { t: S.globe[0], sync: 'av' },
    jump: { t: ev.jump, sync: 'av' },
    monas: { t: S.monas[0], sync: 'av' },
    float: { t: S.float[0], sync: 'av' },
    inti: S.inti[0], // continuous tunnel: no cut to measure
    panas: S.panas[0],
    center: { t: ev.center, sync: 'av' },
    kolombia: S.kolombia[0],
    popOut: { t: ev.popOut, sync: 'v' },
    fallBack: { t: ev.fallBack, sync: 'av' },
    cta: { t: ev.cta, sync: 'av' },
    sumber: { t: ev.sumber, sync: 'av' },
  };

  const SCORE = {
    FPS, FORMAT, W, H, SAFE, WIDE, STYLE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, markers,
    R, RC, RI, tCMB, tCentre, tTrip, fall, tempAt, layerAt, tauAt, vo, SOURCES, leadMel,
  };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
