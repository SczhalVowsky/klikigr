// THE SONG — every sound comes from an event in score.js.   node song.js   (STEMS=1 writes stems)
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const { mtof } = require('./engine/music');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const home = bus(), drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), brass = bus(), fx = bus(), dark = bus();
const verb = bus(), dly = bus();
const pan = (x) => Math.max(-1, Math.min(1, x));
const inBreath = (t) => t >= ev.breath[0] && t < ev.breath[1];

// ================= HOME (bar 0): a cosy lo-fi groove that plays on past the blackout, then tape-stops =================
{
  const K = I.kick({ tail: 0.2, punch: 0.6 }), R = I.rim(1, 3), SH = I.shaker(0.7, 5);
  clock.eachStep(0, 2, 8, (t, b, s) => {
    if (s === 0 || s === 5) home.addMono(K, t, 0.5);
    if (s === 2 || s === 6) home.addMono(R, t, 0.3, 0.2);
    home.addMono(SH, t + (s % 2 ? 0.04 : 0), s % 2 ? 0.08 : 0.12, -0.3);
  });
  for (const c of sc.chords.filter((c) => c.t0 < T(1, 2))) {
    for (const n of c.notes) home.addMono(I.epiano(n, c.t1 - c.t0, { decay: 1.2 }), c.t0, 0.11, 0.1);
    home.addMono(I.bass(c.bass + 12, c.t1 - c.t0, { sub: 0.6 }), c.t0, 0.35);
  }
  const mel = [['C5', 0], ['A4', 0.5], ['F4', 1], ['A4', 1.5], ['E5', 2], ['D5', 2.5], ['C5', 3], ['A4', 3.5], ['F5', 4], ['E5', 4.5]];
  for (const [n, b] of mel) { const mb = I.musicBox(m(n)); home.addMono(mb, T(0, b), 0.14, -0.15); verb.addMono(mb, T(0, b), 0.06); }
  // two 8th-note flickers: the house power dips (a 70 ms dropout + an electric tick)
  for (const tf of ev.flicker) {
    const a = Math.round(tf * SR), b = Math.round((tf + 0.07) * SR);
    for (let i = a; i < b; i++) { home.L[i] *= 0.05; home.R[i] *= 0.05; }
    fx.addMono(I.tvClick(), tf, 0.18, 0.2);
  }
  // TAPE STOP at the blackout: playback rate falls from 1 to 0 over 0.6 s, then silence
  const t0 = Math.round(ev.blackout * SR), len = Math.round(0.6 * SR);
  const L = home.L.slice(), Rr = home.R.slice();
  let pos = t0;
  for (let i = 0; i < len; i++) {
    const rate = Math.pow(1 - i / len, 1.6);
    const j = Math.floor(pos), f = pos - j;
    const fade = Math.min(1, (len - i) / (0.08 * SR));
    home.L[t0 + i] = (L[j] * (1 - f) + L[j + 1] * f) * fade;
    home.R[t0 + i] = (Rr[j] * (1 - f) + Rr[j + 1] * f) * fade;
    pos += rate;
  }
  home.L.fill(0, t0 + len); home.R.fill(0, t0 + len);
}
// the power dies: a thunk and a falling electric whine
fx.addMono(I.thud(55, 0.25), ev.blackout, 0.55);
fx.addMono(I.tvClick(), ev.blackout, 0.4);
fx.addMono(I.noiseSweep(0.7, 3000, 200, { q: 4 }), ev.blackout, 0.12);

// ================= DARK (bars 1-3): a low drone, crickets, low-battery beeps, no-signal bwomp =================
for (const c of sc.chords.filter((c) => c.t0 >= T(1) && c.t0 < T(3))) {
  for (const n of c.notes) { const p = I.padNote(n - 12, c.t1 - c.t0 + 0.6, { cutoff: 520, attack: 0.9, release: 0.8 }); dark.addStereo(p.L, p.R, c.t0 + 0.3, 0.09); }
}
{ // crickets: three 4.6 kHz chirps, every ~0.7 s
  const chirp = new Float32Array(Math.round(0.14 * SR));
  for (let k = 0; k < 3; k++) for (let i = 0; i < 0.026 * SR; i++) {
    const t = i / SR; chirp[Math.round(k * 0.045 * SR) + i] += Math.sin(2 * Math.PI * 4600 * t) * Math.sin(Math.PI * t / 0.026);
  }
  for (let t = ev.blackout + 0.8, k = 0; t < ev.breath[0] - 0.2; t += 0.68, k++) dark.addMono(chirp, t, 0.045, k % 2 ? 0.6 : -0.5);
}
for (const tb of ev.battery) { fx.addMono(I.pulse(m('E6'), 0.09, { duty: 0.5 }), tb, 0.28, 0.1); fx.addMono(I.pulse(m('C6'), 0.12, { duty: 0.5 }), tb + 0.13, 0.28, 0.1); }
fx.addMono(I.bwomp(), ev.noWifi, 0.35);
// the idea: a rising music box (Bb -> C), the bulb "ting", a riser into one beat of silence
{
  const up = [['Bb4', 0], ['D5', 0.5], ['F5', 1], ['Bb5', 1.5], ['C5', 2], ['E5', 2.5]];
  for (const [n, b] of up) { const mb = I.musicBox(m(n)); keys.addMono(mb, T(3, b), 0.2, 0.1); verb.addMono(mb, T(3, b), 0.12); }
  keys.addMono(I.ting(m('G6')), ev.idea, 0.35, 0.2);
  keys.addMono(I.bell(mtof(m('C7')), 0.6, 1.6, 3.5), ev.idea, 0.08, -0.2);
  fx.addMono(I.noiseSweep(ev.breath[0] - T(3), 300, 8000, { q: 0.9, shape: (x) => x * x, pink: true }), T(3), 0.35);
  for (let i = 0; i < 6; i++) drums.addMono(I.snare(), T(3, 1.5) + i * BEAT / 4, 0.08 + i * 0.04, 0.05);
}

// ================= THE DROP (bar 4 on): lights on, full groove =================
fx.addMono(I.tvClick(), ev.lightsOn, 0.5); // the switch
fx.addMono(I.subBoom(1.8), ev.lightsOn, 0.6);
fx.addMono(I.thud(85, 0.09), ev.lightsOn, 0.55);
const K = I.kick({ tail: 0.26 }), CL = I.clap(), SN = I.snare(), HC = [I.hat(false, 11), I.hat(false, 12)], HO = I.hat(true, 14), CR = I.crash(18);
const kicks = [];
clock.eachStep(4, 12, 16, (t, b, s) => {
  if (s % 4 === 0) { drums.addMono(K, t, 0.9); kicks.push(t); }
  if (s % 8 === 4) { drums.addMono(CL, t, 0.5); drums.addMono(SN, t, 0.18); verb.addMono(CL, t, 0.15); }
  drums.addMono(HC[s % 2], t, s % 2 ? 0.16 : 0.1, -0.3);
  if (s % 4 === 2) drums.addMono(HO, t, 0.1, 0.3);
});
for (const tc of [ev.lightsOn, T(8), ev.logo]) drums.addMono(CR, tc, 0.38, -0.2);
for (let i = 0; i < 4; i++) drums.addMono(I.tom(180 - i * 25, 0.18), T(9, 3) + i * BEAT / 4, 0.3, -0.3 + i * 0.2); // fill into the end card

clock.eachStep(4, 12, 8, (t, b, s) => {
  const c = sc.chordAt(t); if (!c) return;
  const R = c.bass + 12;
  bass.addMono(I.bass(s % 2 ? R + 12 : R, BEAT / 2 * 0.8, { sub: 0.8 }), t, 0.5);
});
bass.addMono(I.bass(m('F1') + 12, 1.6, { bright: 0.3, sub: 1 }), T(12), 0.55);

for (const c of sc.chords.filter((c) => c.t0 >= T(4))) {
  const end = c.t0 >= T(12) ? 1.6 : c.t1 - c.t0;
  for (const n of c.notes) { const p = I.padNote(n, end, { cutoff: 2400, attack: 0.04, release: 0.6 }); pad.addStereo(p.L, p.R, c.t0, 0.075); }
}

// hook: brass + guitar on the drop bar and the last two bars
for (const n of [...sc.dropHook, ...sc.endHook]) {
  const g = I.guitar(n.midi, n.dur, { bright: 0.7, seed: 40 });
  lead.addMono(g, n.t, 0.38, 0.15);
  const a = I.brassNote(n.midi, n.dur * 0.9), b = I.brassNote(n.midi - 12, n.dur * 0.9, { bright: 0.8, seed: 99 });
  brass.addStereo(a.L, a.R, n.t, 0.18); brass.addStereo(b.L, b.R, n.t, 0.09); verb.addStereo(a.L, a.R, n.t, 0.07); dly.addStereo(a.L, a.R, n.t, 0.04);
}

// CHARGE: each battery step is a rising pluck + a zappy blip
for (const [i, c] of sc.chargeSteps.entries()) {
  const g = I.guitar(c.midi, 0.5, { bright: 0.7, seed: 20 + i });
  lead.addMono(g, c.t, 0.5, pan(-0.2 + i * 0.13)); verb.addMono(g, c.t, 0.1);
  fx.addMono(I.pulse(c.midi + 12, 0.07, { duty: 0.125, slide: 5 }), c.t, 0.12, 0.2);
}
// CHAT: message tings, them (left, e-piano) and me (right, guitar)
for (const c of sc.chat) {
  keys.addMono(I.ting(c.midi + 12), c.t, 0.22, c.who === 'me' ? 0.4 : -0.4);
  if (c.who === 'me') lead.addMono(I.guitar(c.midi, 0.6, { bright: 0.6, seed: 30 }), c.t, 0.45, 0.35);
  else keys.addMono(I.epiano(c.midi, 0.5), c.t, 0.3, -0.35);
}
// SCROLL: a swipe whoosh on the beat, a pop + marimba note on the heart
for (const s of sc.swipes) {
  fx.addMono(I.noiseSweep(0.16, 1200, 5000, { q: 0.8 }), s.t - 0.06, 0.16, 0.2);
  fx.addMono(I.pop(1600, 50), s.heart, 0.2, -0.1);
  lead.addMono(I.marimba(s.midi), s.heart, 0.09, 0.1);
}
// SNACKS: a thud into the basket + a marimba note per item
for (const d of sc.drops) {
  fx.addMono(I.thud(140 + d.i * 25, 0.06), d.t, 0.45);
  fx.addMono(I.woodTick(1 + d.i * 0.1), d.t, 0.15, 0.2);
  lead.addMono(I.marimba(d.midi), d.t, 0.1, pan(-0.3 + d.i * 0.2)); verb.addMono(I.marimba(d.midi), d.t, 0.02);
}
// HANG OUT: the clink of drinks + claps
for (const [k, f] of [[0, 'E7'], [1, 'G7']]) fx.addMono(I.bell(mtof(m(f)), 0.35, 1.2, 2.76), sc.cheers + k * 0.035, 0.12, k ? 0.3 : -0.3);
for (let i = 0; i < 3; i++) drums.addMono(CL, T(9, i + 0.5), 0.2, i % 2 ? 0.3 : -0.3);

// END: logo bells + brass chord, one music-box note per tagline phrase, a pop on the CTA, a held final chord
for (const [i, f] of ['F5', 'A5', 'C6', 'F6'].entries()) keys.addMono(I.bell(mtof(m(f)), 1.4, 1.6, 3.5), ev.logo + i * 0.06, 0.08, pan(-0.3 + i * 0.2));
for (const f of ['F3', 'A3', 'C4', 'F4']) { const a = I.brassNote(m(f), BEAT * 1.5); brass.addStereo(a.L, a.R, ev.logo, 0.13); }
for (const [i, w] of sc.tagline.entries()) { const mb = I.musicBox(m(['C6', 'D6', 'F6'][i])); keys.addMono(mb, w.t, 0.18); verb.addMono(mb, w.t, 0.12); }
fx.addMono(I.pop(1500, 90), sc.cta, 0.22);
for (const f of ['F3', 'A3', 'C4', 'F4', 'A4']) { const a = I.brassNote(m(f), 1.4); brass.addStereo(a.L, a.R, T(12), 0.12); }
drums.addMono(CR, T(12), 0.3, 0.2);

// ================= mix =================
MIX.sidechain([pad, bass], kicks);
const stems = {
  home, dark, drums, bass, pad, keys, lead, brass, fx,
  verb: reverb(verb, { room: 0.82, damp: 0.35 }),
  dly: pingpong(dly, BEAT * 0.75, 0.35, 3500),
};
const GAIN = { home: 1.0, dark: 2.2, drums: 0.42, bass: 0.7, pad: 2.2, keys: 1.0, lead: 3.0, brass: 1.6, fx: 0.85, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 22);
MIX.gate(mix, ev.breath[0], ev.breath[1]);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : null });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS at drive ${M.drive.toFixed(2)}` : ''})`);
