"""Cut Sczyra's poses out of the character sheet (assets/sheet.webp) into clean PNG cut-outs.

The sheet's alpha channel is unreliable: panel backdrops and drop-shadow halos are semi-opaque
grey, while some legit pixels (legs, boots) are only ~200 alpha. So a pixel counts as character
when it is near-opaque, or fairly opaque *and* not a dull grey halo colour. Small specks are
dropped and holes filled. Output: assets/cut/<name>.png with hard 0/255 alpha.

Expression portraits are cut at face-aligned offsets (measured by correlation) so they can be
cross-faded into each other without the face jumping.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets', 'cut')
os.makedirs(OUT, exist_ok=True)

sheet = np.array(Image.open(os.path.join(HERE, 'assets', 'sheet.webp')).convert('RGBA'))

# cut-out poses: name -> (x0, y0, x1, y1, trim)
POSES = {
    'hero':   (0, 0, 442, 1125, False),   # untrimmed: index.html warp regions use these coords
    'idle':   (470, 550, 572, 762, True),
    'walk':   (582, 565, 684, 758, True),
    'run':    (696, 584, 806, 756, True),
    'attack': (818, 545, 934, 756, True),  # stop at the hand; the slash is drawn in code
    'jump':   (990, 545, 1095, 756, True),
    'front':  (484, 860, 588, 1066, True),
    'side':   (654, 862, 748, 1066, True),
    'back':   (804, 858, 910, 1066, True),
    'side2':  (970, 862, 1056, 1066, True),
}

# face-aligned expression portraits (top-left corner, all PORTRAIT_W x PORTRAIT_H)
PORTRAIT_W, PORTRAIT_H = 152, 148
PORTRAITS = {
    'e_neutral': (502, 80), 'e_happy': (707, 78), 'e_wink': (920, 80),
    'e_sad': (498, 276), 'e_angry': (707, 278), 'e_surprised': (918, 274),
}


def cut(x0, y0, x1, y1, trim):
    img = sheet[y0:y1, x0:x1].copy()
    a = img[..., 3].astype(int)
    rgb = img[..., :3].astype(int)
    halo = ((rgb.max(-1) - rgb.min(-1)) < 30) & (rgb.mean(-1) < 110)
    m = (a >= 247) | ((a >= 110) & ~halo)
    m = nd.binary_opening(m, iterations=1)
    lab, n = nd.label(m)
    sizes = nd.sum(m, lab, range(1, n + 1))
    m = np.isin(lab, 1 + np.flatnonzero(sizes >= sizes.max() * 0.02))
    m = nd.binary_fill_holes(m)
    img[..., 3] = np.where(m, 255, 0).astype(np.uint8)
    if trim:
        ys, xs = np.nonzero(m)
        img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return img


def clean_attack(img):
    # drop the sheet's slash remnant (top-right shadow + blue streak above the hand)
    h, w = img.shape[:2]
    yy, xx = np.mgrid[:h, :w]
    rgb = img[..., :3].astype(int)
    blue = (rgb[..., 2] > rgb[..., 0] + 70) & (rgb[..., 2] > 150)
    img[((xx >= 86) & (yy < 72)) | ((xx >= 92) & (yy < 96) & blue), 3] = 0
    return img


for name, box in POSES.items():
    out = cut(*box)
    if name == 'attack':
        out = clean_attack(out)
    Image.fromarray(out).save(os.path.join(OUT, f'{name}.png'))
    print(f'{name:12s} {out.shape[1]}x{out.shape[0]}')

rgb = Image.fromarray(sheet).convert('RGB')
for name, (x, y) in PORTRAITS.items():
    rgb.crop((x, y, x + PORTRAIT_W, y + PORTRAIT_H)).save(os.path.join(OUT, f'{name}.png'))
    print(f'{name:12s} {PORTRAIT_W}x{PORTRAIT_H}')
