// THE SCORE — "Gimana kalau internet Indonesia mati 24 jam?"
// Single source of truth for music AND picture. Every narration line, cut and hit lives here.
// The narration is NOT voiced: the lines are shown as karaoke captions so the creator can record
// their own voice over the finished video at exactly this pace.
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
  const DURATION = T(30) + 1.0; // 61.5 s

  // ---------- scenes (cuts on bar lines) ----------
  const S = {
    hook: [0, T(4)], // map of Indonesia goes dark
    wifi: [T(4), T(7)], // 01:00 restart the router
    ojol: [T(7), T(10)], // 06:00 ride app empty, bus stop queue
    qris: [T(10), T(11, 2)], // 08:00 QRIS fails
    atm: [T(11, 2), T(13)], // ATM queue, also offline
    siang: [T(13), T(17)], // 12:00 neighbours talk, radio on
    maps: [T(17), T(20)], // 18:00 maps gone, ask a human
    tunggu: [T(20), T(22)], // 23:59 countdown + held breath
    balik: [T(22), T(25)], // 24:00 every phone buzzes
    posting: [T(25), T(28)], // the punchline post
    cta: [T(28), DURATION],
  };

  const ev = {
    blackout: T(1), // 00:00:00, every light dies
    mati: T(3), // "MATI." stamp
    gagal: T(11), // QRIS GAGAL stamp
    atmCut: T(11, 2),
    breath: T(21, 2), // silence before the return
    online: T(22), // everything comes back
    postTap: T(27, 3), // the post goes live
    end: T(28),
  };

  // HUD clock: what the top-left clock shows at time t
  const CLOCK = [
    [0, '23:59:55'], [T(0, 0), '23:59:56'], [T(0, 1), '23:59:57'], [T(0, 2), '23:59:58'], [T(0, 3), '23:59:59'],
    [ev.blackout, '00:00:00'],
    [S.wifi[0], '01:00:00'], [S.ojol[0], '06:00:00'], [S.qris[0], '08:00:00'], [S.siang[0], '12:00:00'],
    [S.maps[0], '18:00:00'], [S.tunggu[0], '23:59:50'],
    [T(20, 2), '23:59:54'], [T(20, 3), '23:59:55'], [T(21), '23:59:56'], [T(21, 1), '23:59:57'], [T(21, 2), '23:59:58'], [T(21, 3), '23:59:59'],
    [ev.online, '24:00:00'],
  ];
  const clockAt = (t) => { let v = CLOCK[0][1]; for (const [t0, s] of CLOCK) if (t >= t0) v = s; return v; };
  const hoursAt = (t) => { // 0..24 for the progress bar
    if (t < ev.blackout) return 0;
    if (t >= ev.online) return 24;
    const s = clockAt(t).split(':').map(Number);
    return s[0] + s[1] / 60 + s[2] / 3600;
  };

  // ---------- narration (to be recorded by the creator) ----------
  // Each line: [start, end, text]. Word times are spread over the line by length (+ pauses at punctuation).
  const VO_RAW = [
    [0.4, 2.3, 'Jam dua belas malam.'],
    [2.6, 4.6, 'Seluruh internet Indonesia mati.'],
    [4.9, 6.3, 'Bukan lemot.'],
    [6.5, 7.9, 'MATI.'],
    [8.8, 13.8, 'Satu jam pertama, semua orang yakin ini cuma kuota habis.'],
    [14.8, 17.4, 'Jam enam pagi, aplikasi ojol kosong.'],
    [17.6, 20.2, 'Jutaan orang bingung cara ke kantor.'],
    [20.8, 22.9, 'Bayar pakai QRIS? Gagal.'],
    [23.2, 26.3, 'Semua orang lari ke ATM… yang juga butuh jaringan.'],
    [26.8, 29.0, 'Tengah hari, hal aneh terjadi.'],
    [29.2, 31.6, 'Orang mulai ngobrol sama tetangga.'],
    [31.8, 34.2, 'Radio jadi sumber berita lagi.'],
    [34.8, 36.0, 'Maps hilang.'],
    [36.3, 40.0, 'Kita kembali tanya jalan… ke manusia.'],
    [40.8, 43.4, 'Lalu, tepat dua puluh empat jam…'],
    [44.7, 47.2, 'Semua HP bergetar bersamaan.'],
    [50.8, 53.6, 'Dan hal pertama yang dilakukan semua orang?'],
    [53.8, 56.3, 'Posting: "Tadi internet mati ya?"'],
    [56.8, 58.6, 'Kamu kuat berapa jam?'],
    [58.8, 60.4, 'Tulis di komen.'],
  ];
  const vo = VO_RAW.map(([t, end, text]) => {
    const ws = text.split(' ');
    const weight = ws.map((w) => w.length + 2 + (/[.,?…:]$/.test(w) ? 4 : 0));
    const total = weight.reduce((a, b) => a + b, 0);
    let acc = t;
    const words = ws.map((w, i) => { const d = ((end - t) * weight[i]) / total; const o = { w, t: acc, end: acc + d }; acc += d; return o; });
    return { t, end, text, words };
  });
  const subtitles = vo.map((l) => ({ t: l.t, end: l.end + 0.25, text: l.text }));

  // ---------- harmony ----------
  // tense: Am F C G   warm (midday): F C G Am in a major colour   drop: Am F C G full
  const { chords, chordAt } = makeChords(clock, {
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
    Fmaj7: { notes: ['A3', 'C4', 'E4'], bass: 'F1' },
    Am9: { notes: ['G3', 'B3', 'C4', 'E4'], bass: 'A1' },
  }, (() => {
    const rows = [];
    const cyc = ['Am', 'F', 'C', 'G'];
    for (let b = 0; b < 13; b++) rows.push([b, 0, 4, cyc[b % 4]]);
    const warm = ['F', 'C', 'G', 'Am'];
    for (let b = 13; b < 20; b++) rows.push([b, 0, 4, warm[(b - 13) % 4]]);
    rows.push([20, 0, 4, 'F'], [21, 0, 4, 'G']);
    for (let b = 22; b < 28; b++) rows.push([b, 0, 4, cyc[(b - 22) % 4]]);
    rows.push([28, 0, 4, 'Fmaj7'], [29, 0, 6, 'Am9']);
    return rows;
  })());

  // ---------- notification storm on the return (one per 8th, seeded) ----------
  const rng = U.mulberry32(2400);
  const notifs = [];
  for (let i = 0; i < 22; i++) {
    const t = ev.online + 0.04 + i * (BEAT / 2) * (i < 8 ? 0.5 : 1);
    if (t > S.balik[1] - 0.3) break;
    notifs.push({ t, x: 0.12 + rng() * 0.76, y: rng(), kind: Math.floor(rng() * 4), n: 1 + Math.floor(rng() * 99) });
  }
  // typed post text, one key per 16th
  const POST = 'tadi internet mati ya?';
  const typeT0 = T(26, 3);
  const keys = POST.split('').map((ch, i) => ({ t: typeT0 + i * (BEAT / 4) * 0.62, ch }));
  // replies + likes after the post goes live
  const replies = [
    { t: ev.postTap + 0.5, who: 'rina.bdg', text: 'iyaa aku kira kuota habis' },
    { t: ev.postTap + 1.0, who: 'bang_ojol', text: 'seharian narik offline wkwk' },
    { t: ev.postTap + 1.5, who: 'warung_bu_sri', text: 'warung saya rame banget kemarin' },
  ];
  // restart-router counter in the wifi scene: one restart per beat after the first bar
  const restarts = [];
  for (let i = 0; i < 9; i++) restarts.push(T(5) + i * BEAT);
  // midday speech bubbles pop on beats
  const bubbles = [T(14, 1), T(14, 3), T(15, 1), T(15, 2), T(15, 3), T(16, 0), T(16, 2)];
  // people joining the bus-stop queue
  const queue = []; for (let i = 0; i < 10; i++) queue.push(T(7, 2) + i * BEAT * 0.5);

  // melody for the warm midday section (marimba) and the drop (lead), 8th-note grid
  const HOOK = {
    a: [['E5', 0, 2], ['C5', 2, 1], ['D5', 3, 1], ['E5', 4, 2], ['G5', 6, 2]],
    b: [['D5', 0, 2], ['B4', 2, 1], ['C5', 3, 1], ['D5', 4, 3]],
    c: [['C5', 0, 1], ['D5', 1, 1], ['E5', 2, 2], ['A5', 4, 2], ['G5', 6, 2]],
    d: [['E5', 0, 3], ['D5', 3, 1], ['C5', 4, 4]],
  };
  const warmMel = [];
  [13, 14, 15, 16, 17, 18, 19].forEach((b, i) => warmMel.push(...placeBar(clock, HOOK['abcd'[i % 4]], b, -12)));
  const dropMel = [];
  [22, 23, 24, 25, 26, 27].forEach((b, i) => dropMel.push(...placeBar(clock, HOOK['abcd'[i % 4]], b, -12)));

  const markers = {
    blackout: { t: ev.blackout, sync: 'av' },
    mati: { t: ev.mati, sync: 'av' },
    wifi: { t: S.wifi[0], sync: 'av' },
    ojol: { t: S.ojol[0], sync: 'av' },
    qris: { t: S.qris[0], sync: 'av' },
    gagal: { t: ev.gagal, sync: 'av' },
    atm: { t: S.atm[0], sync: 'av' },
    siang: { t: S.siang[0], sync: 'av' },
    maps: { t: S.maps[0], sync: 'av' },
    tunggu: { t: S.tunggu[0], sync: 'av' },
    breath: ev.breath,
    online: { t: ev.online, sync: 'av' },
    posting: { t: S.posting[0], sync: 'av' },
    postTap: { t: ev.postTap, sync: 'av' },
    cta: { t: S.cta[0], sync: 'av' },
  };

  const SCORE = {
    FPS, FORMAT, W, H, SAFE, WIDE, STYLE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, markers,
    clockAt, hoursAt, vo, subtitles, notifs, POST, keys, replies, restarts, bubbles, queue, warmMel, dropMel,
  };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
