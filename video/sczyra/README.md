# Sczyra – Character Trailer (YouTube 16:9)

Video animasi karakter **Sczyra** dari character sheet pixel art: 1920×1080, 60 fps, 20 detik, musik chiptune + SFX.

Hasil: `build/sczyra-trailer.mp4`

## Naskah

| Waktu | Adegan | Isi |
|---|---|---|
| 0–3.5 dtk | Intro | Langit malam, bulan, kelopak bunga jatuh. Sczyra (full art) muncul dengan rambut, kain & rumbai bergerak + bernapas. Judul **SCZYRA – The Blue Crescent**. Kamera zoom ke wajah. |
| 3.5–6.5 dtk | Close-up | Kartu potret: Neutral → Happy → Wink (cross-fade, wajah tidak bergeser) + kilau, balon dialog *"Halo, aku Sczyra!"* / *"Ayo berpetualang!"*. Transisi wipe pixel. |
| 6.5–10.5 dtk | Perjalanan | Dunia parallax (gunung, pagoda, torii, bambu). Walk → Run dengan afterimage, garis kecepatan, debu langkah. |
| 10.5–14 dtk | Aksi | Rem mendadak, slime muncul, "!" + wajah Surprised, lompat, **CRESCENT SLASH!**, layar bergetar, slime pecah jadi pixel, mendarat. |
| 14–17 dtk | Turnaround | Panggung lingkaran sihir: depan → samping → belakang → samping → depan. |
| 17–20 dtk | Penutup | Full art + nama, tagline, **COMING SOON**, fade out. |

## Build ulang

```bash
pip install pillow numpy scipy
python3 crop.py      # potong pose/ekspresi dari assets/sheet.webp -> assets/cut/*.png
python3 music.py     # musik + SFX -> build/music.wav
node render.js       # render index.html per frame (60 fps) + audio -> build/sczyra-trailer.mp4
node render.js --stills 2.5,12.2     # cek frame tertentu -> build/still-<t>.jpg
node render.js --fps 30 --out build/preview.mp4   # preview lebih cepat
```

## Cara kerjanya

- `render(t)` di `index.html` adalah fungsi murni waktu, jadi setiap frame deterministik.
- Karakter digambar lewat shader WebGL "warp": tiap region (rambut, lengan baju, kain, rumbai, ponytail)
  diberi gelombang sinus halus + napas + goyangan badan. Gambar diam dari sheet jadi bergerak ala Live2D sederhana.
  Region full art ada di `HERO_RIG`, potret di `PORTRAIT_RIG`, sprite kecil otomatis di `spriteRig()`.
- Pixel art di-upscale nearest-neighbour dulu, lalu ditempatkan sub-pixel, jadi gerakannya tetap halus tanpa "loncat" per pixel.
- Timing adegan ada di konstanta `T_*` dan di tiap fungsi `s*()`; titik SFX di `music.py` mengikuti timing yang sama.
