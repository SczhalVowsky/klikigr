"""Synthesize an upbeat 120 BPM summer-pop backing track (40 s) + transition SFX.

Output: build/music.wav (44.1 kHz stereo). Pure numpy/scipy, no samples needed.
"""
import os
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100
BPM = 120
BEAT = 60 / BPM          # 0.5 s
BAR = 4 * BEAT           # 2 s
DUR = 40.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    gl = gain * np.cos((pan + 1) * np.pi / 4)
    gr = gain * np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gl
    R[i:i + len(sig)] += sig * gr


def env(n, a=0.005, d=0.2, s=0.0, total=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (s + (1 - s) * np.exp(-t / d))
    return e


def saw(f, n, detune=0.0):
    t = np.arange(n) / SR
    ph = (t * f * (1 + detune)) % 1
    return 2 * ph - 1


# ---------- arrangement ----------
# Sections: intro 0-3, A 3-15, break 15-17, B 17-33, outro 33-40
def in_full(t):
    return (3 <= t < 15) or (17 <= t < 39)


CHORDS = [  # I - V - vi - IV in C
    ([60, 64, 67], 36),
    ([59, 62, 67], 43),
    ([57, 60, 64], 45),
    ([57, 60, 65], 41),
]


def chord_at(t):
    return CHORDS[int(t // BAR) % 4]


# ---------- drums ----------
def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7)
    s += 0.3 * rng.standard_normal(n) * np.exp(-t * 200)
    return np.tanh(1.6 * s)


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 900, 5000)
    e = np.exp(-t * 18)
    for k in (0.0, 0.012, 0.024):  # flam layers
        e += 0.6 * (t >= k) * np.exp(-np.maximum(t - k, 0) * 120)
    return nz * e * 0.7


def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    nz = hp(rng.standard_normal(n), 7000)
    return nz * np.exp(-t * (14 if open_ else 70))


K, C, H, HO = kick(), clap(), hat(), hat(True)
sidechain = np.ones(N)

for b in range(int(DUR / BEAT)):
    t = b * BEAT
    if in_full(t):
        add(K, t, 0.9)
        i = int(t * SR)
        m = min(N - i, int(0.3 * SR))
        sidechain[i:i + m] = np.minimum(sidechain[i:i + m],
                                        0.25 + 0.75 * (np.arange(m) / m) ** 0.6)
        if b % 2 == 1:
            add(C, t, 0.55)
        add(HO, t + BEAT / 2, 0.16, 0.3)
        add(H, t + BEAT / 4, 0.08, -0.3)
        add(H, t + 3 * BEAT / 4, 0.08, -0.3)
    elif t < 3:  # intro: claps on 2/4 + light hats
        if b % 2 == 1:
            add(C, t, 0.35)
        add(H, t + BEAT / 2, 0.08)

# snare roll into the drops (2.0-3.0 and 15.0-17.0)
for (a, z) in ((2.0, 3.0), (15.0, 17.0)):
    t = a
    step = BEAT / 2
    while t < z - 1e-6:
        prog = (t - a) / (z - a)
        add(C, t, 0.15 + 0.4 * prog)
        step = BEAT / 4 if prog < 0.5 else BEAT / 8
        t += step

# ---------- bass (pumping 8ths) ----------
bass = np.zeros(N)
for e8 in range(int(DUR / (BEAT / 2))):
    t = e8 * BEAT / 2
    if not in_full(t):
        continue
    root = chord_at(t)[1]
    note = root + (12 if e8 % 2 else 0)
    n = int(BEAT / 2 * SR)
    s = saw(midi(note), n) + saw(midi(note), n, 0.004)
    s = lp(s, 700) * env(n, 0.003, 0.18, 0.4)
    i = int(t * SR)
    bass[i:i + n] += s[: N - i]
add(bass * sidechain, 0, 0.32)

# ---------- pad (detuned saws, sidechained) ----------
pad_l = np.zeros(N)
pad_r = np.zeros(N)
for bar in range(int(DUR / BAR)):
    t = bar * BAR
    notes, _ = chord_at(t)
    n = int(BAR * SR)
    sl = np.zeros(n)
    sr_ = np.zeros(n)
    for nt in notes:
        for d, side in ((-0.006, 0), (0.0, 2), (0.006, 1)):
            w = saw(midi(nt), n, d)
            if side in (0, 2):
                sl += w
            if side in (1, 2):
                sr_ += w
    cutoff = 1200 if t < 3 or 15 <= t < 17 else 2600
    e = env(n, 0.03, 10, 0.9)
    i = int(t * SR)
    pad_l[i:i + n] += lp(sl, cutoff)[: N - i] * e
    pad_r[i:i + n] += lp(sr_, cutoff)[: N - i] * e
pad_gain = 0.045
L += pad_l * sidechain * pad_gain
R += pad_r * sidechain * pad_gain

# ---------- pluck arpeggio (16ths) ----------
ARP = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 3, 2]
for s16 in range(int(DUR / (BEAT / 4))):
    t = s16 * BEAT / 4
    if t >= 39:
        break
    notes, _ = chord_at(t)
    tones = notes + [notes[0] + 12]
    nt = tones[ARP[s16 % 16]] + 12
    n = int(0.25 * SR)
    tt = np.arange(n) / SR
    sq = np.sign(np.sin(2 * np.pi * midi(nt) * tt)) * 0.5 + 0.5 * np.sin(2 * np.pi * midi(nt) * tt)
    s = lp(sq, 3500) * np.exp(-tt * 22)
    add(s, t, 0.07, 0.35 if s16 % 2 else -0.35)

# ---------- lead hook (section B + outro) ----------
# scale-degree melody over each 2-bar phrase (8ths); None = rest
MEL = [72, None, 76, 79, 76, None, 74, 72,
       71, None, 74, 79, 74, None, 72, 71,
       72, None, 76, 81, 79, None, 76, 76,
       77, None, 76, 74, 72, None, 74, 76]
for e8 in range(int(DUR / (BEAT / 2))):
    t = e8 * BEAT / 2
    if not (17 <= t < 39 or 7 <= t < 15):
        continue
    nt = MEL[e8 % len(MEL)]
    if nt is None:
        continue
    n = int(0.42 * SR)
    tt = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt)
    ph = 2 * np.pi * np.cumsum(midi(nt) * vib) / SR
    s = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph))
    s *= env(n, 0.01, 0.25, 0.35)
    s *= np.minimum(1, (n - np.arange(n)) / (0.04 * SR))
    add(s, t, 0.11 if t >= 17 else 0.06)

# ---------- FX: risers, impacts, whooshes ----------
def riser(d):
    n = int(d * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    out = np.zeros(n)
    seg = int(0.05 * SR)
    for k in range(0, n, seg):
        p = k / n
        f = 400 + 7000 * p ** 2
        out[k:k + seg] = bp(nz[k:k + seg + 200], f * 0.7, min(f * 1.4, 18000))[: len(out[k:k + seg])]
    return out * (t / d) ** 2


def impact():
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (45 + 60 * np.exp(-t * 12)) * t) * np.exp(-t * 3)
    crash = hp(rng.standard_normal(n), 4000) * np.exp(-t * 2.5) * 0.5
    return boom + crash


def whoosh(d=0.5):
    n = int(d * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    sh = np.sin(np.pi * t / d) ** 2
    return bp(nz, 600, 6000) * sh


add(riser(2.0), 1.0, 0.25)
add(riser(2.0), 15.0, 0.3)
add(riser(1.5), 31.5, 0.12)
for tt in (3.0, 17.0, 33.0):
    add(impact(), tt, 0.6)
for tt in (6.0, 11.0, 15.0, 21.0, 25.0, 29.0):
    add(whoosh(), tt - 0.25, 0.22, -0.4)
add(impact(), 39.0, 0.5)

# ---------- master ----------
mix = np.stack([L, R], 1)
mix = hp(mix.T, 30).T
fade_in = np.minimum(1, np.arange(N) / (0.05 * SR))
fade_out = np.clip((DUR - np.arange(N) / SR) / 1.0, 0, 1)
mix *= (fade_in * fade_out)[:, None]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix /= np.max(np.abs(mix)) / 0.89
os.makedirs('build', exist_ok=True)
wavfile.write('build/music.wav', SR, (mix * 32767).astype(np.int16))
print('wrote build/music.wav', mix.shape)
