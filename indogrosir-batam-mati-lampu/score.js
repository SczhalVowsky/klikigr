// INDOGROSIR BATAM — "Mati lampu? Ke Indogrosir aja!" (9:16 Reel / TikTok, text + music, no voice).
// Story: a cosy evening at home -> the power cuts out (the music tape-stops with it) -> a dark,
// low-battery, offline minute -> an idea -> the lights come back ON at Indogrosir Batam (the drop) ->
// one bar per benefit (charge, chat, scroll, snacks, hang out) -> end card.
// This file is the single source of truth for BOTH the music (song.js) and the picture (film.js).
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const FORMAT = '9:16';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 120, offset: 0 }); // 1 beat = 0.5 s, 1 bar = 2 s
  const { T, BEAT, BAR } = clock;
  const DURATION = T(12) + 1.6; // 25.6 s

  const S = {
    home: [0, T(1)], dark: [T(1), T(3)], idea: [T(3), T(4)], store: [T(4), T(5)],
    charge: [T(5), T(6)], chat: [T(6), T(7)], scroll: [T(7), T(8)], snack: [T(8), T(9)],
    hangout: [T(9), T(10)], end: [T(10), DURATION],
  };

  const { chords, chordAt } = makeChords(clock, {
    Fmaj7: { notes: ['A3', 'C4', 'E4', 'F4'], bass: 'F1' },
    Dm7: { notes: ['A3', 'C4', 'F4'], bass: 'D2' },
    Dm: { notes: ['A3', 'D4', 'F4'], bass: 'D2' },
    Bb: { notes: ['Bb3', 'D4', 'F4'], bass: 'Bb1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    Csus: { notes: ['G3', 'C4', 'F4'], bass: 'C2' },
  }, [
    [0, 0, 2, 'Fmaj7'], [0, 2, 2, 'Dm7'],
    [1, 0, 4, 'Dm'], [2, 0, 4, 'Dm'],
    [3, 0, 2, 'Bb'], [3, 2, 2, 'C'],
    [4, 0, 4, 'F'], [5, 0, 4, 'C'], [6, 0, 4, 'Dm'], [7, 0, 4, 'Bb'],
    [8, 0, 4, 'F'], [9, 0, 4, 'C'],
    [10, 0, 4, 'Bb'], [11, 0, 2, 'Csus'], [11, 2, 2, 'C'], [12, 0, 4, 'F'],
  ]);

  // the hook (8th grid: [note, start8th, dur8ths]) — brass + guitar on the drop and the last bars
  const HK = {
    F: [['A4', 0, 1], ['C5', 1, 1], ['F5', 2, 2], ['E5', 4, 1], ['C5', 5, 1], ['A4', 6, 2]],
    C: [['G4', 0, 1], ['C5', 1, 1], ['E5', 2, 2], ['D5', 4, 1], ['C5', 5, 1], ['G4', 6, 2]],
    Bb: [['Bb4', 0, 1], ['D5', 1, 1], ['F5', 2, 2], ['G5', 4, 1], ['F5', 5, 1], ['D5', 6, 2]],
  };

  const ev = {
    flicker: [T(0, 3), T(0, 3.5)], // two 8th-note flickers before the cut
    blackout: T(1), // POWER OFF: picture goes dark, the music tape-stops
    q: T(1, 0.5), // "Listrik di rumah PADAM?"
    battery: [T(2, 0), T(2, 2)], // low-battery beeps
    noWifi: T(2, 1),
    idea: T(3, 2), // the light bulb over his head: "ting!"
    breath: [T(3, 3), T(4)], // one beat of held breath
    lightsOn: T(4), // THE DROP: Indogrosir Batam, lit up
    logo: T(10),
  };

  // CHARGE: the battery jumps 5% -> 100% one step per beat, each a higher pluck
  const chargeSteps = [30, 55, 80, 100].map((pct, i) => ({ pct, t: T(5, i), midi: m(['C5', 'E5', 'G5', 'C6'][i]) }));

  // CHAT: call and response, one bubble per beat
  const chat = [
    { t: T(6, 0), who: 'them', text: 'Mati lampu ya? 😩', midi: m('D5') },
    { t: T(6, 1), who: 'me', text: 'Aku di Indogrosir, terang!', midi: m('F5') },
    { t: T(6, 2), who: 'them', text: 'Wah, otw nyusul!', midi: m('A5') },
  ];

  // SCROLL: one swipe per beat, a heart pops on the off-8th
  const swipes = [0, 1, 2, 3].map((i) => ({ t: T(7, i), heart: T(7, i + 0.5), midi: m(['Bb4', 'D5', 'F5', 'Bb5'][i]) }));

  // SNACKS: an item drops into the basket on every beat
  const ITEMS = ['bottle', 'chips', 'can', 'noodle'];
  const drops = ITEMS.map((kind, i) => ({ kind, i, t: T(8, i), midi: m(['C5', 'F5', 'A5', 'C6'][i]) }));

  // HANG OUT: friends clink drinks on beat 3
  const cheers = T(9, 2);

  // END CARD
  const tagline = [{ w: 'Tetap terang', t: T(10, 1) }, { w: 'Tetap online', t: T(10, 2) }, { w: 'Tetap santai', t: T(10, 3) }];
  const cta = T(11, 0);

  const dropHook = [...placeBar(clock, HK.F, 4)];
  const endHook = [...placeBar(clock, HK.C, 9), ...placeBar(clock, HK.Bb, 10)];

  const captions = [
    { t: T(5, 0.1), end: T(5, 3.8), icon: 'plug', text: 'Bisa ngecas HP' },
    { t: T(6, 0.1), end: T(6, 3.8), icon: 'chat', text: 'Tetap online, balas chat WhatsApp' },
    { t: T(7, 0.1), end: T(7, 3.8), icon: 'phone', text: 'Scroll sosmed tanpa takut lowbat' },
    { t: T(8, 0.1), end: T(8, 3.8), icon: 'cart', text: 'Sambil belanja minuman & camilan' },
    { t: T(9, 0.1), end: T(9, 3.8), icon: 'smile', text: 'Nongkrong santai bareng teman' },
  ];

  // deterministic sparkle/confetti/star positions shared by every render worker
  const stars = [];
  { const r = U.mulberry32(7); for (let i = 0; i < 40; i++) stars.push({ x: r(), y: r() * 0.55, s: 0.5 + r(), ph: r() * 6.28 }); }

  const markers = {
    blackout: { t: ev.blackout, sync: 'av' },
    question: ev.q,
    battery: { t: ev.battery[0], sync: 'a' },
    idea: { t: ev.idea, sync: 'a' },
    breath: ev.breath[0],
    lightsOn: { t: ev.lightsOn, sync: 'av' },
    charge: T(5),
    chat: T(6),
    scroll: T(7),
    snack: T(8),
    hangout: T(9),
    logo: { t: ev.logo, sync: 'av' },
  };

  const SCORE = {
    FPS, FORMAT, W, H, SAFE, DURATION, clock, T, BEAT, BAR, S, m, chords, chordAt, HK, ev, markers,
    chargeSteps, chat, swipes, drops, cheers, tagline, cta, dropHook, endHook, captions, stars,
  };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
