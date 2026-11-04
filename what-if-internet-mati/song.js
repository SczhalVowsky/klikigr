// THE SONG — tense minimal electronic for a what-if short, mixed to leave room for a voiceover
// the creator records later. Every sound is tied to an event in score.js.
//   node song.js            (STEMS=1 writes out/stem-*.wav, LUFS=-16 masters to a loudness)
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock, S } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), fx = bus();
const verb = bus(), dly = bus();
const inS = (t, s) => t >= s[0] && t < s[1];

const K = I.kick({ punch: 0.9 }), SN = I.snare(), CL = I.clap(), HC = [I.hat(false, 11), I.hat(false, 12)], HO = I.hat(true, 14), CR = I.crash(18);
const SH = [I.shaker(1, 15), I.shaker(0.5, 16)];
const kicks = [];

// ---------- the clock: a dry tick on every beat before the blackout, and in the countdown ----------
for (let b = 0; b < 4; b++) { const t = T(0, b); fx.addMono(I.woodTick(b === 3 ? 1.3 : 1.1), t, 0.5); }
clock.eachStep(20, 22, 4, (t) => { if (t < ev.breath) fx.addMono(I.woodTick(t >= T(21) ? 1.35 : 1.1), t, 0.5 + (t - T(20)) * 0.06); });

// ---------- hook: hum, then the blackout ----------
{ // the city hum before midnight (a soft Am pad) dies at the blackout
  for (const n of ['A3', 'C4', 'E4']) { const { L, R } = I.padNote(m(n), ev.blackout - 0.02, { cutoff: 900, attack: 0.3, release: 0.02 }); pad.addStereo(L, R, 0, 0.11); }
}
fx.addMono(I.subBoom(2.4, 70, 24), ev.blackout, 0.85);
fx.addMono(I.thud(70, 0.12), ev.blackout, 0.7);
fx.addMono(I.noiseSweep(1.1, 4000, 120, { q: 0.8, shape: (x) => Math.pow(1 - x, 2), pink: true }), ev.blackout, 0.35); // power-down
drums.addMono(CR, ev.blackout, 0.25);
// after the blackout: a low drone and a heartbeat until the first cut
{ const { L, R } = I.padNote(m('A2'), S.wifi[0] - ev.blackout - 0.3, { cutoff: 500, attack: 0.6, release: 0.3 }); pad.addStereo(L, R, ev.blackout + 0.1, 0.14); }
for (const t of [T(1, 2), T(2), T(2, 2)]) fx.addMono(I.heartbeat(), t, 0.5);
// "MATI." stamp
fx.addMono(I.thud(55, 0.16), ev.mati, 0.9);
drums.addMono(SN, ev.mati, 0.5); drums.addMono(K, ev.mati, 0.9); verb.addMono(SN, ev.mati, 0.35);
bass.addMono(I.bass808(m('A1'), 1.6, { drive: 0.4 }), ev.mati, 0.5);

// ---------- drums ----------
clock.eachStep(4, 30, 16, (t, b, s) => {
  if (t >= ev.breath && t < ev.online) return;
  const tense = b >= 4 && b < 13, warm = b >= 13 && b < 20, wait = b >= 20 && b < 22, drop = b >= 22 && b < 28, outro = b >= 28;
  if (wait) return;
  if (outro) { if (b === 28 && s === 0) { drums.addMono(K, t, 0.9); kicks.push(t); } return; }
  if (tense) {
    if (s === 0 || s === 6 || s === 8) { drums.addMono(K, t, s === 6 ? 0.6 : 0.85); kicks.push(t); }
    if (s === 4 || s === 12) { drums.addMono(SN, t, 0.22); drums.addMono(CL, t, 0.35); verb.addMono(CL, t, 0.15); }
    if (s % 2 === 0) drums.addMono(HC[(s / 2) % 2], t, s % 4 === 2 ? 0.16 : 0.08, 0.25);
  } else if (warm) {
    if (s === 0 || s === 10) { drums.addMono(K, t, 0.6); kicks.push(t); }
    if (s === 8) { drums.addMono(CL, t, 0.3); verb.addMono(CL, t, 0.2); }
    if (s % 2 === 0) drums.addMono(SH[(s / 2) % 2], t, 0.14, 0.35);
  } else if (drop) {
    if (s % 4 === 0) { drums.addMono(K, t, 0.95); kicks.push(t); }
    if (s === 4 || s === 12) { drums.addMono(CL, t, 0.55); drums.addMono(SN, t, 0.3); verb.addMono(CL, t, 0.25); }
    drums.addMono(HC[s % 2], t, s % 2 ? 0.16 : 0.08, -0.3);
    if (s % 4 === 2) drums.addMono(HO, t, 0.1, 0.3);
  }
});
// a hit on every scene cut (whoosh in, click on the bar line)
for (const k of ['wifi', 'ojol', 'qris', 'atm', 'siang', 'maps', 'tunggu', 'posting']) {
  const t = S[k][0];
  fx.addMono(I.noiseSweep(0.35, 600, 6000, { q: 0.9, shape: (x) => x * x, pink: true }), t - 0.35, 0.18);
  fx.addMono(I.tvClick(), t, 0.55);
  if (k !== 'tunggu') drums.addMono(K, t, 0.5);
}

// ---------- bass ----------
clock.eachStep(4, 28, 8, (t, b, s) => {
  if (t >= ev.breath && t < ev.online) return;
  const c = sc.chordAt(t); if (!c) return;
  const R = c.bass + 12;
  if (b >= 20 && b < 22) { if (s === 0) bass.addMono(I.bass(R, BEAT * 3.6, { sub: 1, bright: 0.1 }), t, 0.45); return; }
  if (b >= 22) bass.addMono(I.bass(s % 2 ? R + 12 : R, BEAT / 2 * 0.8, { sub: 0.8 }), t, 0.55);
  else if (b >= 13) { if (s === 0 || s === 3 || s === 6) bass.addMono(I.bass(s === 6 ? R + 7 : R, BEAT * 0.9, { bright: 0.3 }), t, 0.45); }
  else if (s === 0 || s === 3 || s === 4 || s === 6) bass.addMono(I.bass(R, BEAT / 2 * 0.9, { bright: 0.2 }), t, 0.5);
});
bass.addMono(I.bass(m('F2'), 2, { sub: 1, bright: 0.2 }), T(28), 0.45);
bass.addMono(I.bass(m('A1') + 12, 3, { sub: 1, bright: 0.1 }), T(29), 0.45);

// ---------- pads ----------
for (const c of sc.chords) {
  if (c.t0 < S.wifi[0]) continue;
  let t1 = c.t1; if (c.t0 < ev.breath && t1 > ev.breath) t1 = ev.breath;
  if (c.t0 >= ev.breath && c.t0 < ev.online) continue;
  const drop = c.t0 >= ev.online && c.t0 < ev.end;
  const opts = drop ? { cutoff: 2400, attack: 0.04, release: 0.4 } : { cutoff: c.t0 >= S.siang[0] && c.t0 < S.tunggu[0] ? 1600 : 900, attack: 0.4, release: 1.0 };
  for (const n of c.notes) { const { L, R } = I.padNote(n, t1 - c.t0, opts); pad.addStereo(L, R, c.t0, drop ? 0.07 : 0.08); }
}
// drop: supersaw stabs on the off-beats
clock.eachStep(22, 28, 8, (t, b, s) => {
  if (s % 2 === 0) return;
  const c = sc.chordAt(t);
  for (const n of c.notes) { const { L, R } = I.supersaw(n + 12, BEAT * 0.35, { cutoff: 3200 }); lead.addStereo(L, R, t, 0.045); }
});

// ---------- keys: tense pluck arpeggio, warm marimba melody, drop lead ----------
clock.eachStep(4, 13, 8, (t, b, s) => {
  const c = sc.chordAt(t); const ns = c.notes;
  const n = ns[[0, 1, 2, 1, 0, 2, 1, 2][s]] + 12;
  const p = I.pluck(n, { decay: 0.18, cutoff: 2200 });
  keys.addMono(p, t, 0.16, s % 2 ? 0.3 : -0.3); dly.addMono(p, t, 0.05);
});
for (const n of sc.warmMel) { const x = I.marimba(n.midi + 12, { thock: 0.2 }); keys.addMono(x, n.t, 0.32, 0.1); verb.addMono(x, n.t, 0.12); }
for (const n of sc.dropMel) { const x = I.pulse(n.midi + 12, n.dur * 0.9, { duty: 0.25, vib: 0.2 }); lead.addMono(x, n.t, 0.16); dly.addMono(x, n.t, 0.06); }

// ---------- scene sounds ----------
for (const t of sc.restarts) { fx.addMono(I.tvClick(), t, 0.28, 0.4); fx.addMono(I.pop(1400 + (t * 37 % 400)), t + 0.05, 0.12, 0.4); }
for (const t of sc.queue) fx.addMono(I.pop(700), t, 0.12, -0.2);
// GAGAL: a stamp + an error buzz (two low square blips)
fx.addMono(I.thud(60, 0.12), ev.gagal, 0.8); drums.addMono(SN, ev.gagal, 0.35);
fx.addMono(I.pulse(m('D3'), 0.14, { duty: 0.5 }), ev.gagal + 0.02, 0.25); fx.addMono(I.pulse(m('D3'), 0.22, { duty: 0.5 }), ev.gagal + 0.2, 0.25);
fx.addMono(I.pulse(m('D3'), 0.14, { duty: 0.5 }), S.atm[0] + 1.0, 0.16); fx.addMono(I.pulse(m('D3'), 0.22, { duty: 0.5 }), S.atm[0] + 1.18, 0.16);
for (const t of sc.bubbles) fx.addMono(I.pop(1100 + (t * 113 % 700)), t, 0.2, (t * 7 % 2) - 0.5);
// maps: the map tiles dissolve (a falling sweep), then a little "aha" bell when someone points
fx.addMono(I.noiseSweep(1.2, 5000, 300, { q: 1.2, pink: true }), S.maps[0] + 0.3, 0.12);
fx.addMono(I.bell(1318, 0.5), T(18, 2), 0.2); verb.addMono(I.bell(1318, 0.5), T(18, 2), 0.1);
// countdown riser, then silence, then everything comes back
fx.addMono(I.noiseSweep(ev.breath - T(20), 200, 9000, { q: 0.8, shape: (x) => x * x * x, pink: true }), T(20), 0.4);
fx.addMono(I.subBoom(2.2), ev.online, 0.8); drums.addMono(CR, ev.online, 0.45, -0.2); drums.addMono(CR, ev.online, 0.3, 0.3);
for (const n of sc.notifs) { const x = I.ting(84 + (n.kind * 3), { seed: n.n }); fx.addMono(x, n.t, 0.13, (n.x - 0.5) * 1.4); }
// phone vibration: a 150 Hz buzz in bursts on the drop
{
  const len = 0.32, b = new Float32Array(Math.ceil(len * SR));
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = Math.sign(Math.sin(2 * Math.PI * 150 * t)) * 0.12 * Math.min(1, t / 0.01) * Math.min(1, (len - t) / 0.03); }
  for (const t of [ev.online + 0.05, T(22, 2), T(23), T(23, 2)]) fx.addMono(b, t, 0.5);
}
// typing + post
for (const k of sc.keys) fx.addMono(I.woodTick(1.8 + (k.t * 13 % 1) * 0.4), k.t, 0.12, 0.1);
fx.addMono(I.pop(1800), ev.postTap, 0.4); fx.addMono(I.ting(91), ev.postTap + 0.02, 0.2);
for (const r of sc.replies) fx.addMono(I.ting(86), r.t, 0.1, 0.3);
// CTA slam + a music-box tag at the end
fx.addMono(I.thud(70, 0.12), S.cta[0], 0.7); drums.addMono(CR, S.cta[0], 0.3);
for (const [n, i] of [['A5', 0], ['C6', 1], ['E6', 2], ['B5', 3], ['A5', 4]]) { const x = I.musicBox(m(n)); keys.addMono(x, T(29) + i * BEAT / 2, 0.16); verb.addMono(x, T(29) + i * BEAT / 2, 0.15); }

// ---------- mix ----------
MIX.sidechain([pad, bass, lead], kicks.filter((t) => t >= ev.online && t < ev.end));
const stems = { drums, bass, pad, keys, lead, fx, verb: reverb(verb, { room: 0.82, damp: 0.35 }), dly: pingpong(dly, BEAT * 0.75, 0.35, 3200) };
const GAIN = { drums: 0.32, bass: 0.6, pad: 2.2, keys: 1.1, lead: 1.9, fx: 0.85, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 24);
MIX.gate(mix, ev.breath, ev.online); // the held breath is truly silent
MIX.fadeOut(mix, DURATION - 1.4, DURATION);
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : -16 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS at drive ${M.drive.toFixed(2)}` : ''})`);
