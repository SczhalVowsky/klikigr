# Video Promo Es Krim Indogrosir Batam (Reels/TikTok)

Video motion 9:16, 1080×1920, 30 fps, 40 detik. Hanya teks + musik (tanpa voice-over).

Hasil: `build/indogrosir-batam-icecream-promo.mp4`

## Build ulang

```bash
pip install pillow numpy scipy
python3 crop.py      # potong produk/logo dari poster di assets/1-5.jpg
python3 music.py     # buat musik latar 120 BPM -> build/music.wav
node render.js       # render index.html per frame + gabung audio -> MP4
node render.js --stills 9,23.5   # cek frame tertentu -> build/still-<t>.jpg
```

Semua animasi ada di `index.html` (fungsi `render(t)` deterministik per adegan).
Teks, harga dan posisi tiap adegan diatur di blok `scene(...)`.
