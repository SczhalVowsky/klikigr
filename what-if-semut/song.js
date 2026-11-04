// THE SONG — playful, curious pizzicato + marimba; darker in the rain; leaves room for a voiceover.
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
const K = I.kick({ punch: 0.8 }), SN = I.snare(), CL = I.clap(), HC = [I.hat(false, 11), I.hat(false, 12)], CR = I.crash(18);
const SH = [I.shaker(1, 15), I.shaker(0.5, 16)];
const kicks = [];
const zone = (b) => (b < 2 ? 'intro' : b < 19 ? 'play' : b < 25 ? 'rain' : b < 28 ? 'twist' : b < 30 ? 'cta' : 'outro');
const quiet = (t) => (t >= ev.shrink - BEAT && t < ev.shrink) || (t >= ev.blup - BEAT / 2 && t < ev.blup);

// ---------- drums ----------
clock.eachStep(0, 34, 16, (t, b, s) => {
  const z = zone(b);
  if (quiet(t)) return;
  if (z === 'intro') { if (s % 4 === 0) drums.addMono(HC[(s / 4) % 2], t, 0.07, 0.3); return; }
  if (z === 'outro') return;
  if (z === 'play' || z === 'cta') {
    if (s === 0 || s === 7 || s === 10) { drums.addMono(K, t, 0.7); kicks.push(t); }
    if (s === 4 || s === 12) { drums.addMono(CL, t, 0.32); verb.addMono(CL, t, 0.14); }
    if (s % 2 === 0) drums.addMono(SH[(s / 2) % 2], t, 0.12, 0.35);
  } else if (z === 'rain') {
    if (s === 0 || s === 8) { drums.addMono(K, t, 0.6); kicks.push(t); }
    if (s === 12) drums.addMono(SN, t, 0.18);
    if (s % 4 === 2) drums.addMono(HC[0], t, 0.06, -0.3);
  } else if (z === 'twist') {
    if (s === 0) { drums.addMono(K, t, 0.6); kicks.push(t); }
  }
});
// a click on every cut
for (const k of ['nasi', 'berat', 'kucing', 'jatuh', 'kuat', 'dingin', 'hujan', 'terjebak', 'twist', 'cta']) {
  const t = S[k][0];
  fx.addMono(I.tvClick(), t, 0.5); drums.addMono(K, t, 0.5);
}

// ---------- bass: pizzicato-ish plucked bass ----------
clock.eachStep(2, 30, 8, (t, b, s) => {
  if (quiet(t)) return;
  const z = zone(b), c = sc.chordAt(t); if (!c) return;
  const R = c.bass + 12;
  if (z === 'play' || z === 'cta') { if (s === 0 || s === 3 || s === 4 || s === 6) bass.addMono(I.bass(s === 6 ? R + 7 : R, BEAT * 0.45, { bright: 0.35 }), t, 0.5); }
  else if (z === 'rain') { if (s === 0 || s === 4) bass.addMono(I.bass(R, BEAT * 1.6, { sub: 1, bright: 0.1 }), t, 0.45); }
  else if (z === 'twist') { if (s === 0) bass.addMono(I.bass(R, BEAT * 3.5, { sub: 1, bright: 0.1 }), t, 0.45); }
});
// ---------- pads ----------
for (const c of sc.chords) {
  const z = zone(c.bar);
  const g = z === 'rain' || z === 'twist' ? 0.1 : z === 'outro' ? 0.09 : 0.06;
  for (const n of c.notes) { const { L, R } = I.padNote(n, c.t1 - c.t0, { cutoff: z === 'rain' ? 800 : 1300, attack: 0.4, release: 1.0 }); pad.addStereo(L, R, c.t0, g); }
}
// ---------- pizzicato chords on the off-beats + marimba melody ----------
clock.eachStep(2, 30, 8, (t, b, s) => {
  if (quiet(t)) return;
  const z = zone(b);
  if (!(z === 'play' || z === 'cta') || s % 2 === 0) return;
  const c = sc.chordAt(t);
  for (const n of c.notes) keys.addMono(I.pizz(n + 12), t, 0.32, (n % 3 - 1) * 0.3);
});
for (const n of sc.melody) { if (quiet(n.t)) continue; const x = I.marimba(n.midi, { thock: 0.25 }); lead.addMono(x, n.t, 0.28, 0.1); verb.addMono(x, n.t, 0.1); dly.addMono(x, n.t, 0.04); }
// rain: a music-box line, sparse
clock.eachStep(19, 25, 4, (t) => { const c = sc.chordAt(t); const n = c.notes[Math.floor(t * 2) % 3] + 24; const x = I.musicBox(n); keys.addMono(x, t, 0.1, 0.3); verb.addMono(x, t, 0.12); });

// ---------- events ----------
// hook: curious intro, then the shrink: a falling sweep + bwomp + sparkle
for (const [n, i] of [['C6', 0], ['E6', 1], ['G6', 2]]) { const x = I.musicBox(m(n)); keys.addMono(x, 0.5 + i * BEAT, 0.14); verb.addMono(x, 0.5 + i * BEAT, 0.1); }
fx.addMono(I.noiseSweep(1.0, 7000, 300, { q: 2, shape: (x) => Math.pow(1 - x, 1.5), pink: true }), ev.shrink, 0.35);
fx.addMono(I.bwomp(), ev.shrink, 0.5);
fx.addMono(I.pop(2600), ev.shrink, 0.5);
drums.addMono(CR, ev.shrink, 0.2);
// the cat: a low purr under the scene
{ const len = S.kucing[1] - S.kucing[0] - 0.3, b = new Float32Array(Math.ceil(len * SR)); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += 26 / SR; const am = 0.5 + 0.5 * Math.sin(2 * Math.PI * ph); b[i] = (Math.sin(2 * Math.PI * 55 * t) * 0.6 + Math.sin(2 * Math.PI * 110 * t) * 0.2) * am * am * 0.25 * Math.min(1, t / 0.4, (len - t) / 0.4); } fx.addMono(b, S.kucing[0] + 0.15, 0.55); }
// the fall: a slow slide-whistle down, then a soft pop on landing
fx.addMono(I.whistle(ev.land - ev.stepOff), ev.stepOff, 0.12);
fx.addMono(I.noiseSweep(0.4, 300, 3000, { q: 1, pink: true }), ev.stepOff, 0.15);
fx.addMono(I.pop(500), ev.land, 0.6); fx.addMono(I.thud(140, 0.05), ev.land, 0.4); drums.addMono(K, ev.land, 0.5);
// the lift: a heave
fx.addMono(I.thud(80, 0.1), ev.lift, 0.7); drums.addMono(SN, ev.lift, 0.3); fx.addMono(I.pop(1200), ev.lift, 0.3);
// snacks in the cold: a tiny crunch on each beat
clock.eachStep(17, 19, 4, (t) => fx.addMono(I.chipNoise('hat', Math.round(t * 10)), t + 0.02, 0.18, 0.2));
// rain: drops hitting the ground, then the big one
for (let i = 0; i < 14; i++) { const t = S.hujan[0] + 0.3 + i * 0.37; if (Math.abs(t - ev.splash) < 0.4) continue; fx.addMono(I.pop(500 + (i * 137) % 600), t, 0.12, ((i * 7) % 5) / 5 - 0.4); }
fx.addMono(I.thud(90, 0.12), ev.splash, 0.8); fx.addMono(I.noiseSweep(0.35, 5000, 800, { q: 0.7, shape: (x) => Math.pow(1 - x, 2), pink: true }), ev.splash, 0.5); drums.addMono(CR, ev.splash, 0.2);
// the blup: silence, then a deep bubble pop
fx.addMono(I.pop(260), ev.blup, 0.9); fx.addMono(I.thud(110, 0.06), ev.blup, 0.5);
for (let i = 0; i < 6; i++) fx.addMono(I.pop(700 + i * 160), ev.blup + 0.4 + i * 0.35, 0.12);
// the two verdict cards
fx.addMono(I.ting(86), ev.card1, 0.35); drums.addMono(K, ev.card1, 0.6);
fx.addMono(I.thud(60, 0.14), ev.card2, 0.9); drums.addMono(SN, ev.card2, 0.4); fx.addMono(I.pulse(m('D3'), 0.25, { duty: 0.5 }), ev.card2 + 0.02, 0.2);
fx.addMono(I.thud(70, 0.12), ev.cta, 0.6); drums.addMono(CR, ev.cta, 0.25);
for (const [n, i] of [['C6', 0], ['E6', 1], ['G6', 2], ['E6', 3], ['C6', 4]]) { const x = I.musicBox(m(n)); keys.addMono(x, ev.sumber + 0.5 + i * BEAT / 2, 0.14); verb.addMono(x, ev.sumber + 0.5 + i * BEAT / 2, 0.14); }

// ---------- mix ----------
const stems = { drums, bass, pad, keys, lead, fx, verb: reverb(verb, { room: 0.8, damp: 0.35 }), dly: pingpong(dly, BEAT * 0.75, 0.32, 3500) };
const GAIN = { drums: 0.34, bass: 0.6, pad: 2.2, keys: 1.1, lead: 1.0, fx: 0.85, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 24);
MIX.gate(mix, ev.blup - BEAT / 2, ev.blup - 0.01);
MIX.fadeOut(mix, DURATION - 2.5, DURATION);
const M = MIX.master(mix, 0.8, undefined, { lufs: -16 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s, ${M.lufs.toFixed(1)} LUFS)`);
