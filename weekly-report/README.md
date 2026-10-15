# Weekly Report — Indogrosir Batam

Web pengisian laporan mingguan per divisi + halaman admin presentasi 3D dengan maskot.

## Menjalankan

Butuh **Node.js 18+**. Tidak ada dependency yang perlu di-install.

```bash
cd weekly-report
ADMIN_PIN=1234 PORT=3000 node server.js
```

- Halaman pengisian (semua divisi, tanpa login): `http://<ip-server>:3000/`
- Halaman admin (pakai PIN): `http://<ip-server>:3000/admin`

Kalau `ADMIN_PIN` tidak diisi, PIN default adalah `admin123` — **ganti sebelum dipakai**.

## Cara pakai

**Divisi:** buka halaman utama → pilih divisi → isi format sesuai divisi → **Kirim Laporan**.
Kolom bertanda *otomatis* dihitung sendiri (SL RP, growth, selisih, %, total, dll).
Tab **Laporan Terkirim** menampilkan laporan divisi itu saja. Kirim ulang = menimpa laporan sebelumnya.
Draft tersimpan otomatis di browser sampai laporan dikirim.

**Admin:** masuk dengan PIN → presentasi 3D (cover, satu slide per divisi, penutup "Salam Cinta").
- Navigasi: tombol ‹ ›, panah keyboard, swipe, atau klik ikon divisi di atas.
- `F` layar penuh · `P` putar otomatis · `R` muat ulang data.
- Klik tanggal di kiri atas (atau ⚙) untuk mengisi **tanggal** laporan secara manual.
- ⚙ **Kelola Data**: status pengisian tiap divisi, hapus per divisi, hapus semua, download backup JSON.

## Data & hapus harian

Semua laporan (termasuk foto, dikompres dan disimpan base64) ada di satu file: `data/reports.json`.
Untuk mengosongkan: tombol **Hapus Semua Laporan** di admin, atau hapus file tersebut.
Tanggal judul ikut tersimpan di file yang sama; tombol hapus di admin hanya menghapus laporan, tanggal tetap.

## Struktur

```
server.js             server HTTP + API JSON (tanpa dependency)
public/index.html     halaman pengisian divisi
public/admin.html     halaman admin 3D
public/js/schema.js   FORMAT LAPORAN TIAP DIVISI — ubah kolom/tabel di sini
public/js/form.js     form pengisian (dibangun otomatis dari schema)
public/js/render.js   tampilan laporan read-only (dipakai user & admin)
public/js/admin.js    scene 3D (three.js), slide, maskot, panel kelola
public/assets/character.png   maskot (ganti file ini untuk mengganti karakter)
public/vendor/three.module.min.js   three.js r160 (lokal, tidak butuh internet)
```

## Batasan keamanan

- Halaman divisi **tanpa login** sesuai permintaan: siapa pun yang membuka web bisa memilih divisi mana saja,
  melihat dan menimpa laporan divisi itu. Jalankan hanya di jaringan internal kantor.
- Halaman admin dilindungi PIN; sesi admin hilang saat server di-restart (cukup login ulang).
