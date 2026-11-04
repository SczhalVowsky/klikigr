// THE SCORE — "Gimana kalau kamu menyusut seukuran semut?"
// Single source of truth for music AND picture. Narration is not voiced: lines are karaoke captions
// so the creator can record their own voice in sync.
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
  const DURATION = T(34) + 0.5; // 69 s

  const S = {
    hook: [0, T(2)],
    nasi: [T(2), T(4, 2)],
    berat: [T(4, 2), T(7)],
    kucing: [T(7), T(9, 2)],
    jatuh: [T(9, 2), T(13)],
    kuat: [T(13), T(16)],
    dingin: [T(16), T(19)],
    hujan: [T(19), T(22)],
    terjebak: [T(22), T(25, 2)],
    twist: [T(25, 2), T(28)],
    cta: [T(28), T(30, 2)],
    sumber: [T(30, 2), DURATION],
  };
  const ev = {
    shrink: T(1), // ZAP
    stepOff: T(10), // steps off the 10th-floor balcony
    land: T(12, 2), // lands softly
    lift: T(14), // lifts a grain of rice
    splash: T(21), // a raindrop hits him
    blup: T(23), // the water drop swallows him
    card1: T(26), // "fall: survived"
    card2: T(27), // "a drop of water: trapped"
    cta: T(28),
    sumber: T(30, 2),
  };

  // the numbers (scale 1:340, same body density)
  const NUM = {
    scale: 340, h0: 170, m0: 65, // cm, kg
    h1: 0.5, m1mg: 1.6, // cm, mg (65 kg / 340^3 = 1.65 mg)
    catM: 85, catFloors: 25, // a ~25 cm cat x 340
    vAnt: 6.4, vHuman: 200, // km/h terminal velocities
    dropMg: 4, // a 2 mm raindrop
    shrewG: 1.8,
  };

  // ---------- narration (to be recorded by the creator) ----------
  const VO_RAW = [
    [0.4, 4.2, 'Gimana kalau kamu tiba-tiba menyusut… seukuran semut?'],
    [4.7, 9.3, 'Tinggimu cuma setengah sentimeter. Sebutir nasi lebih tinggi dari kamu.'],
    [9.7, 14.0, 'Beratmu? Sekitar satu koma enam miligram. Seringan nyamuk.'],
    [14.7, 19.1, 'Kucing peliharaanmu sekarang setinggi gedung dua puluh lima lantai.'],
    [19.7, 25.9, 'Kabar baiknya: jatuh dari lantai sepuluh? Kamu cuma melayang turun… dan selamat.'],
    [26.7, 32.1, 'Kamu juga jadi super kuat. Angkat benda berkali-kali berat badanmu, kayak semut.'],
    [32.7, 38.2, 'Masalahnya, tubuh sekecil ini cepat kehilangan panas. Kamu harus makan… hampir tanpa henti.'],
    [38.8, 42.6, 'Hujan? Satu tetes air lebih berat dari kamu.'],
    [44.7, 51.2, 'Dan bahaya terbesarnya: mau minum setetes air… kamu bisa terjebak. Tegangan permukaan menahanmu kayak lem.'],
    [51.8, 55.9, 'Kebal jatuh dari gedung… tapi kalah sama setetes air.'],
    [56.8, 61.2, 'Kamu pilih tetap kecil, atau balik normal? Tulis di komen.'],
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
    ['Selamat jatuh & bahaya tegangan permukaan', 'Haldane, J.B.S. (1926). On Being the Right Size. Harper\'s Magazine.'],
    ['Kecepatan jatuh semut ±6,4 km/jam', 'The Globe and Mail, "Ants\' slow fall key to survival" (mengutip fisika Univ. of Illinois).'],
    ['Nyamuk selamat ditabrak tetes hujan', 'Dickerson, A.K. dkk. (2012). Mosquitoes survive raindrop collisions by virtue of their low mass. PNAS 109(25).'],
    ['Mamalia terkecil ±1,8 g, makan 1,5–2× berat badan/hari', 'Discover Wildlife; Wikipedia: Etruscan shrew (diakses 2026).'],
    ['Makin kecil, makin kuat relatif', 'Hukum kubik-kuadrat — Galileo, Two New Sciences (1638).'],
  ];

  // ---------- harmony ----------
  const { chords, chordAt } = makeChords(clock, {
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    Dm: { notes: ['A3', 'D4', 'F4'], bass: 'D2' },
    E: { notes: ['G#3', 'B3', 'E4'], bass: 'E2' },
  }, (() => {
    const rows = [];
    for (let b = 0; b < 35; b++) {
      let c;
      if (b < 19) c = ['C', 'G', 'Am', 'F'][b % 4];
      else if (b < 25) c = ['Am', 'F', 'Dm', 'E'][(b - 19) % 4];
      else if (b < 28) c = ['Dm', 'E', 'Am'][b - 25];
      else c = ['C', 'G', 'F', 'C'][(b - 28) % 4];
      rows.push([b, 0, 4, c]);
    }
    return rows;
  })());
  const HOOK = {
    a: [['E5', 0, 1], ['G5', 1, 1], ['C6', 2, 2], ['B5', 4, 1], ['G5', 5, 1], ['D5', 6, 2]],
    b: [['C5', 0, 1], ['E5', 1, 1], ['A5', 2, 2], ['G5', 4, 1], ['F5', 5, 1], ['E5', 6, 2]],
    c: [['E5', 0, 1], ['G5', 1, 1], ['C6', 2, 2], ['D6', 4, 2], ['B5', 6, 2]],
    d: [['A5', 0, 2], ['G5', 2, 1], ['F5', 3, 1], ['E5', 4, 4]],
  };
  const melody = [];
  for (let b = 2; b < 19; b++) melody.push(...placeBar(clock, HOOK['abcd'[(b - 2) % 4]], b));
  for (let b = 28; b < 30; b++) melody.push(...placeBar(clock, HOOK['ab'[b - 28]], b));

  const markers = {
    shrink: { t: ev.shrink, sync: 'av' },
    nasi: { t: S.nasi[0], sync: 'av' },
    berat: { t: S.berat[0], sync: 'av' },
    kucing: { t: S.kucing[0], sync: 'av' },
    jatuh: { t: S.jatuh[0], sync: 'av' },
    land: { t: ev.land, sync: 'av' },
    kuat: { t: S.kuat[0], sync: 'av' },
    lift: { t: ev.lift, sync: 'av' },
    dingin: { t: S.dingin[0], sync: 'av' },
    hujan: { t: S.hujan[0], sync: 'av' },
    splash: { t: ev.splash, sync: 'av' },
    terjebak: { t: S.terjebak[0], sync: 'av' },
    blup: { t: ev.blup, sync: 'av' },
    twist: { t: S.twist[0], sync: 'av' },
    card2: { t: ev.card2, sync: 'av' },
    cta: { t: ev.cta, sync: 'av' },
    sumber: { t: ev.sumber, sync: 'av' },
  };

  const SCORE = { FPS, FORMAT, W, H, SAFE, WIDE, STYLE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, markers, NUM, vo, SOURCES, melody };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
