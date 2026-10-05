# Sczyra – Character Trailer (YouTube 16:9)

Video animasi karakter **Sczyra** dari character sheet pixel art: 1920×1080, 60 fps, 20 detik, musik chiptune + SFX.

Hasil: `build/sczyra-trailer.mp4`

## Naskah

| Waktu | Adegan | Isi |
|---|---|---|
| 0–3.5 dtk | Intro | Langit malam, bulan, kelopak bunga jatuh. Sczyra (full art) muncul dengan rambut, kain & rumbai bergerak + bernapas. Judul **SCZYRA – The Blue Crescent**. Kamera zoom ke wajah. |
| 3.5–6 dtk | Close-up | Kartu potret: Neutral → Happy → Wink (cross-fade, wajah tidak bergeser) + kilau, balon dialog *"Halo, aku Sczyra!"* / *"Ayo berpetualang!"*. Transisi wipe pixel. |
| 6–10.5 dtk | Perjalanan | Dunia parallax (gunung, pagoda, torii, bambu). Sczyra **benar-benar berjalan lalu berlari**: kaki dirig (paha + betis/sepatu, lutut menekuk), lengan & rambut berayun, telapak menapak tanpa meluncur, lalu rem/skid. |
| 10.5–13 dtk | Aksi | Slime muncul, "!" + wajah Surprised, lompat, **CRESCENT SLASH!**, layar bergetar, slime pecah jadi pixel, mendarat. |
| 13–17 dtk | Turnaround | Panggung lingkaran sihir: berputar 360° pelan & mulus (depan → samping → belakang → samping → depan), tanpa lompatan. |
| 17–20 dtk | Penutup | Full art + nama, tagline, **COMING SOON**, fade out. |

## Build ulang

```bash
pip install pillow numpy scipy
python3 crop.py      # potong pose/ekspresi + rig kaki dari assets/sheet.webp -> assets/cut/*.png
node render.js --events   # timing (langkah kaki, hit, putaran) -> build/events.json
python3 music.py     # musik + SFX sesuai events.json -> build/music.wav
node render.js       # render index.html per frame (60 fps) + audio -> build/sczyra-trailer.mp4
node render.js --stills 2.5,12.2     # cek frame tertentu -> build/still-<t>.jpg
node render.js --fps 30 --out build/preview.mp4   # preview lebih cepat
```

## Cara kerjanya

- `render(t)` di `index.html` adalah fungsi murni waktu, jadi setiap frame deterministik.
- Karakter digambar lewat shader WebGL "warp": tiap region (rambut, lengan baju, kain, rumbai, ponytail)
  diberi gelombang sinus halus + napas + goyangan badan. Gambar diam dari sheet jadi bergerak ala Live2D sederhana.
  Region full art ada di `HERO_RIG`, potret di `PORTRAIT_RIG`, sprite kecil otomatis di `spriteRig()`.
- Jalan/lari: sprite samping dipotong jadi badan, paha, dan betis+sepatu (`rig_*.png`). Siklus langkah
  (`legPose`) mengayun pinggul & menekuk lutut; kaki yang menapak bergerak tepat secepat tanah bergulir,
  dan tinggi badan dihitung dari telapak terendah, jadi ada ayunan naik-turun alami tanpa kaki meluncur.
  Parameter gaya jalan vs lari ada di `GAIT_WALK` / `GAIT_RUN`.
- Turnaround: tiap 90° satu sudut pandang "morph" ke sudut berikutnya (lebar siluet + cross-fade) dengan
  kecepatan putar konstan, jadi terlihat seperti berputar, bukan berganti gambar.
- Pixel art di-upscale nearest-neighbour dulu, lalu ditempatkan sub-pixel, jadi gerakannya tetap halus tanpa "loncat" per pixel.
- Timing adegan ada di konstanta `T_*` dan di tiap fungsi `s*()`; titik SFX di `music.py` mengikuti timing yang sama.
