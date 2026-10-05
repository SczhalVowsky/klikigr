"""Synthesize Sczyra's 20 s trailer score + SFX (chiptune with koto-style plucks, D minor pentatonic).

Output: build/music.wav (44.1 kHz stereo). Pure numpy/scipy.
Timing comes from build/events.json (`node render.js --events`), so footsteps land on the rig's actual
heel strikes and every hit point follows index.html.
"""
import json
import os
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100
DUR = 20.0
N = int(SR * DUR)
BEAT = 0.5           # 120 BPM
rng = np.random.default_rng(3)
HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, 'build', 'events.json')) as f:
    E = json.load(f)
L = np.zeros(N)
R = np.zeros(N)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def filt(x, f, kind='low', order=2):
    return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * np.cos((pan + 1) * np.pi / 4)
    R[i:i + len(sig)] += sig * gain * np.sin((pan + 1) * np.pi / 4)


def tt(d):
    return np.arange(int(d * SR)) / SR


def pluck(f, d=1.2, bright=1.0):
    """koto-ish pluck: decaying harmonic stack with a tiny pitch bend down at the attack"""
    t = tt(d)
    bend = 1 + 0.012 * np.exp(-t * 40)
    out = np.zeros_like(t)
    for k in range(1, 9):
        out += (1 / k ** (1.3 / bright)) * np.sin(2 * np.pi * f * k * np.cumsum(bend) / SR) * np.exp(-t * (2.2 + k * 1.6))
    return out * np.minimum(1, t / 0.002) * 0.5


def square(f, d, duty=0.5, decay=6.0):
    t = tt(d)
    s = np.where((t * f) % 1 < duty, 1.0, -1.0)
    return filt(s, 5000) * np.exp(-t * decay) * np.minimum(1, t / 0.003)


def tri(f, d, decay=3.0):
    t = tt(d)
    return (2 * np.abs(2 * ((t * f) % 1) - 1) - 1) * np.exp(-t * decay) * np.minimum(1, t / 0.004)


def pad(notes, d, att=0.8, rel=1.2, cutoff=1600):
    t = tt(d)
    s = np.zeros_like(t)
    for n in notes:
        for det in (-0.004, 0.0, 0.005):
            s += 2 * ((t * midi(n) * (1 + det) + rng.random()) % 1) - 1
    s = filt(s / (len(notes) * 3), cutoff)
    e = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel).clip(0, 1)
    return s * e


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


def kick(g=1.0):
    t = tt(0.4)
    f = 45 + 110 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * g


def snare():
    t = tt(0.25)
    return (filt(noise(0.25), 1800, 'high') * 0.7 + 0.4 * np.sin(2 * np.pi * 190 * t)) * np.exp(-t * 18)


def hat(d=0.06):
    t = tt(d)
    return filt(noise(d), 7000, 'high') * np.exp(-t * 60)


def whoosh(d, f0=400, f1=4000, rev=False):
    n = noise(d)
    t = tt(d)
    out = np.zeros_like(n)
    steps = 24
    for k in range(steps):
        a, b = int(k * len(n) / steps), int((k + 1) * len(n) / steps)
        fc = f0 * (f1 / f0) ** (k / steps)
        out[a:b] = filt(n, [fc * 0.7, min(fc * 1.4, SR / 2 - 100)], 'band')[a:b]
    e = np.sin(np.pi * t / d) ** 2
    return (out * e)[::-1] if rev else out * e


def chime(f, d=1.4):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * 3.5) * 0.4


def sweep(f0, f1, d, wave='square', decay=4.0):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = np.cumsum(f) / SR
    s = np.where(ph % 1 < 0.5, 1.0, -1.0) if wave == 'square' else np.sin(2 * np.pi * ph)
    return filt(s, 6000) * np.exp(-t * decay) * np.minimum(1, t / 0.003)


# ------------------------------------------------------------------ harmony
# Dm – Bb – C – Am (2 s per chord), D minor pentatonic melody (D F G A C)
PROG = [(50, [62, 65, 69, 72]), (46, [58, 62, 65, 69]), (48, [60, 64, 67, 72]), (45, [57, 60, 64, 69])]
PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81]

# pads all the way, swelling for intro + final
for bar in range(10):
    root, ch = PROG[bar % 4]
    g = 0.22 if bar < 3 or bar >= 7 else 0.15
    add(pad(ch, 2.3, att=0.6 if bar else 1.2, rel=0.6), bar * 2, g, -0.2)
    add(pad(ch, 2.3, att=0.6 if bar else 1.2, rel=0.6), bar * 2 + 0.01, g, 0.2)

# koto arpeggios (intro, close-up, turnaround)
arp = [0, 2, 1, 3, 2, 4, 3, 1]
for s0, s1, g in [(0.5, E['walk'], 0.32), (E['turn'], E['final'], 0.3)]:
    k = 0
    t0 = s0
    while t0 < s1 - 0.1:
        _, ch = PROG[int(t0 // 2) % 4]
        note = (ch + [ch[0] + 12])[arp[k % 8]] + 12
        add(pluck(midi(note)), t0, g, -0.4 + 0.8 * ((k % 4) / 3))
        k += 1
        t0 += BEAT / 2

# ------------------------------------------------------------------ groove (walk → brake, after the hit → turnaround)
def groove(a, b, full=True):
    t0 = a
    while t0 < b - 1e-6:
        beat_i = int(round((t0 - a) / BEAT))
        add(kick(), t0, 0.75)
        if full and beat_i % 2 == 1:
            add(snare(), t0, 0.35)
        add(hat(), t0 + BEAT / 2, 0.18, 0.3)
        add(hat(0.03), t0 + BEAT / 4, 0.08, -0.3)
        root, _ = PROG[int(t0 // 2) % 4]
        add(square(midi(root - 12), 0.22, 0.25, 9), t0, 0.16)
        add(square(midi(root), 0.18, 0.25, 12), t0 + BEAT / 2, 0.1)
        t0 += BEAT


groove(E['walk'], E['brake'])
groove(E['hit'] + 0.05, E['turn'])

# chiptune lead melody over the run
w0 = E['walk']
MEL = [(w0 + a, n, d) for a, n, d in [(0, 69, .5), (.5, 72, .5), (1.0, 74, .25), (1.25, 72, .25), (1.5, 69, .5), (2.0, 67, .25),
       (2.25, 69, .25), (2.5, 74, .5), (3.0, 77, .25), (3.25, 74, .25), (3.5, 72, .5)]]
h0 = E['hit'] + 0.05
MEL += [(h0 + a, n, d) for a, n, d in [(0, 74, .25), (.25, 77, .25), (.5, 81, .5)]]
for t0, n, d in MEL:
    add(square(midi(n), d + 0.05, 0.5, 3), t0, 0.09, 0.15)
    add(square(midi(n) * 1.004, d + 0.05, 0.5, 3), t0 + 0.012, 0.05, -0.15)

# ------------------------------------------------------------------ SFX
for i, n in enumerate([74, 77, 79, 81, 84, 86]):         # title letters
    add(chime(midi(n + 12)), 0.8 + i * 0.1, 0.22, -0.5 + i * 0.2)
add(whoosh(0.5, 300, 6000), 3.05, 0.5)                    # zoom into face
add(chime(midi(86)), 3.5, 0.3)
for i, n in enumerate([81, 84, 88]):                       # happy bling
    add(chime(midi(n + 12), 0.8), E['happy'] + i * 0.05, 0.22)
add(chime(midi(100), 1.0), E['wink'], 0.35)                # wink ting
add(chime(midi(105), 0.8), E['wink'] + 0.05, 0.2)
for k, a in enumerate(np.arange(3.88, 4.3, 0.045)):        # typewriter blips
    add(square(1200 + 80 * (k % 3), 0.03, 0.5, 60), a, 0.05)
add(whoosh(0.45, 2000, 300), E['wipe'], 0.45)              # pixel wipe
for st in E['steps']:                                      # heel strikes
    d = 0.06
    tap = filt(noise(d), 1400 if st['run'] else 900) * np.exp(-tt(d) * (60 if st['run'] else 70))
    tap += 0.5 * np.sin(2 * np.pi * (140 if st['run'] else 110) * tt(d)) * np.exp(-tt(d) * 50)
    add(tap, st['t'], 0.32 if st['run'] else 0.26, 0.1)
add(whoosh(0.6, 400, 5000), E['run'], 0.5)                 # dash
add(filt(noise(0.5), [1500, 6000], 'band') * np.exp(-tt(0.5) * 5), E['brake'] + 0.03, 0.35)  # skid
for a in E['hops']:                                        # slime hops
    add(sweep(180, 520, 0.25, 'sine', 8), a, 0.4)
    add(sweep(520, 160, 0.15, 'sine', 14), a + 0.3, 0.3)
add(sweep(900, 1800, 0.12, 'square', 10), E['alert'], 0.18)     # "!"
add(sweep(1800, 1800, 0.12, 'square', 10), E['alert'] + 0.1, 0.15)
add(whoosh(0.45, 300, 3000) * np.linspace(0, 1, int(0.45 * SR)), E['alert'], 0.25)  # riser
add(sweep(220, 880, 0.3, 'square', 6), E['jump'], 0.16)          # jump
add(whoosh(0.35, 1200, 9000), E['slash'] - 0.05, 0.75)            # slash
add(kick(1.4), E['hit'], 1.0)                                     # HIT
add(filt(noise(1.2), 3000) * np.exp(-tt(1.2) * 4), E['hit'], 0.55)
add(sweep(140, 40, 0.8, 'sine', 3), E['hit'], 0.7)
for k in range(10):                                               # burst crackle
    add(hat(0.04), E['hit'] + 0.05 + k * 0.045, 0.2, rng.uniform(-0.6, 0.6))
add(filt(noise(0.2), 600) * np.exp(-tt(0.2) * 25), E['land'], 0.5)  # land
add(whoosh(0.4, 300, 6000), E['turn'] - 0.4, 0.4)
add(chime(midi(93), 1.6), E['turn'], 0.35)
r0, r1 = E['turnRot']                                             # one long soft swirl for the turntable
add(whoosh(r1 - r0, 500, 2500) * 0.6, r0, 0.25)
for k, q in enumerate(E['quarters']):                             # a soft chime as each view comes round
    add(chime(midi([86, 89, 93, 98][k]), 1.0), q + 0.12, 0.14, -0.4 + k * 0.27)
add(whoosh(0.5, 300, 7000), E['final'] - 0.4, 0.35)
# final: big chord + shimmer
add(kick(1.2), E['final'], 0.7)
add(filt(noise(2.5), 5000, 'high') * np.exp(-tt(2.5) * 2), E['final'], 0.18)
for n in [50, 57, 62, 65, 69, 76]:
    add(pluck(midi(n), 2.8, 1.4), E['final'], 0.28, rng.uniform(-0.5, 0.5))
for i, n in enumerate([74, 77, 79, 81, 84, 86]):
    add(chime(midi(n + 12)), E['final'] + 0.35 + i * 0.08, 0.2, -0.5 + i * 0.2)
add(chime(midi(98), 2.0), E['final'] + 1.45, 0.3)        # coming soon

# ------------------------------------------------------------------ master: light reverb, fade, normalise
def reverb(x):
    out = x.copy()
    for d, g in [(0.031, 0.32), (0.047, 0.28), (0.071, 0.22), (0.113, 0.17), (0.173, 0.12), (0.241, 0.08)]:
        k = int(d * SR)
        out[k:] += x[:-k] * g
    return out


L, R = reverb(L), reverb(R)
t = np.arange(N) / SR
fade = np.clip((20.0 - t) / 0.7, 0, 1) * np.clip(t / 0.3, 0, 1)
L *= fade
R *= fade
# soft limiter: scale so loud passages sit near full scale, tanh catches the hit transients
mix = np.stack([L, R], 1)
mix /= np.percentile(np.abs(mix), 99.7)
mix = np.tanh(mix * 0.9) * 0.92
wavfile.write(os.path.join(HERE, 'build', 'music.wav'), SR, (mix * 32767).astype(np.int16))
print('wrote build/music.wav')
