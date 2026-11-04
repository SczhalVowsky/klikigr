// THE SONG — an adventurous, slightly cosmic cue for the fall through the Earth.
// Leaves room for a voiceover recorded later. Every sound is tied to an event in score.js.
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

const K = I.kick({ punch: 0.9 }), SN = I.snare(), CL = I.clap(), HC = [I.hat(false, 11), I.hat(false, 12)], HO = I.hat(true, 14), CR = I.crash(18);
const SH = [I.shaker(1, 15), I.shaker(0.5, 16)];
const kicks = [];
const sec = (b) => (b < 4 ? 'intro' : b < 11 ? 'fall' : b < 14 ? 'float' : b < 22 ? 'core' : b < 25 ? 'decel' : b < 28 ? 'back' : b < 30 ? 'cta' : 'outro');

// ---------- drums ----------
clock.eachStep(0, 33, 16, (t, b, s) => {
  const z = sec(b);
  if (t >= ev.center - BEAT && t < ev.center) return; // a held beat before the centre
  if (z === 'intro') { if (s % 4 === 0) drums.addMono(SH[(s / 4) % 2], t, 0.12, 0.3); if (s % 8 === 0) { drums.addMono(K, t, 0.6); kicks.push(t); } return; }
  if (z === 'float' || z === 'outro') { if (s % 8 === 0 && z === 'float') drums.addMono(HC[0], t, 0.05, 0.4); return; }
  if (z === 'fall' || z === 'decel' || z === 'back') {
    if (s === 0 || s === 8 || s === 10) { drums.addMono(K, t, 0.8); kicks.push(t); }
    if (s === 4 || s === 12) { drums.addMono(CL, t, 0.35); verb.addMono(CL, t, 0.15); }
    if (s % 2 === 0) drums.addMono(HC[(s / 2) % 2], t, s % 4 === 2 ? 0.14 : 0.07, 0.25);
  } else if (z === 'core' || z === 'cta') {
    if (s % 4 === 0) { drums.addMono(K, t, 0.95); kicks.push(t); }
    if (s === 4 || s === 12) { drums.addMono(CL, t, 0.5); drums.addMono(SN, t, 0.3); verb.addMono(CL, t, 0.2); }
    drums.addMono(HC[s % 2], t, s % 2 ? 0.14 : 0.07, -0.3);
    if (s % 4 === 2) drums.addMono(HO, t, 0.09, 0.3);
  }
});
// a hit on every scene cut
for (const k of ['globe', 'monas', 'float', 'inti', 'panas', 'kolombia', 'cta', 'sumber']) {
  const t = S[k][0];
  if (k !== 'sumber') fx.addMono(I.noiseSweep(0.4, 500, 6000, { q: 0.9, shape: (x) => x * x, pink: true }), t - 0.4, 0.16); // the end card cuts clean
  fx.addMono(I.tvClick(), t, 0.5);
  drums.addMono(K, t, 0.5);
}
for (const t of [S.inti[0], S.cta[0]]) drums.addMono(CR, t, 0.3);

// ---------- bass ----------
clock.eachStep(2, 30, 8, (t, b, s) => {
  if (t >= ev.center - BEAT && t < ev.center) return;
  const z = sec(b), c = sc.chordAt(t); if (!c) return;
  const Rt = c.bass + 12;
  if (z === 'float') { if (s === 0) bass.addMono(I.bass(Rt, BEAT * 3.8, { sub: 1, bright: 0.05 }), t, 0.4); return; }
  if (z === 'core' || z === 'cta') bass.addMono(I.bass(s % 2 ? Rt + 12 : Rt, BEAT / 2 * 0.8, { sub: 0.8 }), t, 0.5);
  else if (s === 0 || s === 3 || s === 4 || s === 6) bass.addMono(I.bass(Rt, BEAT / 2 * 0.9, { bright: 0.2 }), t, 0.45);
});

// ---------- pads (wide and airy, brighter in the core) ----------
for (const c of sc.chords) {
  const b = c.bar, z = sec(b);
  const opts = z === 'core' ? { cutoff: 2400, attack: 0.1, release: 0.6 } : z === 'float' ? { cutoff: 1400, attack: 0.9, release: 1.6, detune: 14 } : { cutoff: 1000, attack: 0.4, release: 1.0 };
  for (const n of c.notes) { const { L, R } = I.padNote(n, c.t1 - c.t0, opts); pad.addStereo(L, R, c.t0, z === 'float' ? 0.11 : 0.08); }
}
// float: a music-box sparkle on the 8ths (weightless)
clock.eachStep(11, 14, 8, (t, b, s) => { const c = sc.chordAt(t); const n = c.notes[[0, 2, 1, 2, 0, 1, 2, 1][s]] + 24; const x = I.musicBox(n); keys.addMono(x, t, 0.12, s % 2 ? 0.4 : -0.4); verb.addMono(x, t, 0.12); dly.addMono(x, t, 0.06); });
// fall: a pluck arpeggio
clock.eachStep(4, 11, 8, (t, b, s) => { const c = sc.chordAt(t); const n = c.notes[[0, 1, 2, 1, 0, 2, 1, 2][s]] + 12; const p = I.pluck(n, { decay: 0.16, cutoff: 2400 }); keys.addMono(p, t, 0.2, s % 2 ? 0.3 : -0.3); dly.addMono(p, t, 0.05); });
for (const n of sc.leadMel) { const a = I.brassNote(n.midi, n.dur * 0.9); lead.addStereo(a.L, a.R, n.t, 0.2); verb.addStereo(a.L, a.R, n.t, 0.06); }

// ---------- events ----------
// hook: a deep rumble from the hole
fx.addMono(I.noiseSweep(4.2, 90, 260, { q: 0.7, shape: (x) => Math.sin(Math.PI * x), pink: true }), 0.2, 0.5);
fx.addMono(I.subBoom(3, 50, 30), 0.5, 0.35);
// the leap: a whoosh down and a thump of the take-off
fx.addMono(I.thud(90, 0.1), ev.jump, 0.7);
fx.addMono(I.noiseSweep(2.0, 6000, 200, { q: 0.8, shape: (x) => Math.sin(Math.PI * Math.min(1, x * 1.4)), pink: true }), ev.jump, 0.4);
fx.addMono(I.launchWhistle(1.2), ev.jump - 0.05, 0.12);
// a continuous wind rising with speed through the core
fx.addMono(I.noiseSweep(ev.center - S.inti[0], 300, 3500, { q: 0.6, shape: (x) => 0.3 + 0.7 * x, pink: true }), S.inti[0], 0.18);
// the centre: silence for a beat, then a sub boom + crash
fx.addMono(I.subBoom(2.4), ev.center, 0.85); drums.addMono(CR, ev.center, 0.45, -0.2); drums.addMono(K, ev.center, 1);
// decel + pop out
fx.addMono(I.noiseSweep(3.5, 3000, 300, { q: 0.8, pink: true }), T(22), 0.18);
fx.addMono(I.pop(900), ev.popOut, 0.6); fx.addMono(I.boing(), ev.popOut + 0.02, 0.35); drums.addMono(K, ev.popOut, 0.7);
// fall back: a slide whistle down
fx.addMono(I.whistle(1.0), ev.fallBack, 0.18);
fx.addMono(I.noiseSweep(1.4, 5000, 250, { q: 1, pink: true }), ev.fallBack, 0.3); fx.addMono(I.thud(70, 0.1), ev.fallBack, 0.6);
// CTA + sources
fx.addMono(I.thud(70, 0.12), ev.cta, 0.6);
for (const [n, i] of [['D6', 0], ['F6', 1], ['A6', 2], ['E6', 3], ['D6', 4]]) { const x = I.musicBox(m(n)); keys.addMono(x, ev.sumber + 0.5 + i * BEAT / 2, 0.14); verb.addMono(x, ev.sumber + 0.5 + i * BEAT / 2, 0.14); }

// ---------- mix ----------
MIX.sidechain([pad, bass], kicks.filter((t) => t >= S.inti[0] && t < S.kolombia[0]));
const stems = { drums, bass, pad, keys, lead, fx, verb: reverb(verb, { room: 0.84, damp: 0.3 }), dly: pingpong(dly, BEAT * 0.75, 0.38, 3500) };
const GAIN = { drums: 0.32, bass: 0.6, pad: 2.3, keys: 1.1, lead: 1.3, fx: 0.85, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 24);
MIX.gate(mix, ev.center - BEAT, ev.center - 0.01);
MIX.fadeOut(mix, DURATION - 2.5, DURATION);
const M = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : -16 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s, ${M.lufs.toFixed(1)} LUFS)`);
