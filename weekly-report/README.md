# Weekly Report — Indogrosir Batam

Web pengisian laporan mingguan per divisi + halaman admin presentasi 3D dengan maskot.
Berjalan di web server lokal yang mendukung **PHP 7.4+** (XAMPP, Laragon, WAMP, dll). Tidak perlu database.

## Pasang

1. Copy seluruh folder `weekly-report` ke folder web Anda, misalnya `C:\xampp\htdocs\weekly-report`.
2. Buka `config.php`, ganti `admin_pin`.
3. Buka di browser:
   - Pengisian divisi: `http://localhost/weekly-report/` (dari PC lain: `http://<ip-pc-server>/weekly-report/`)
   - Admin: `http://localhost/weekly-report/admin.html`

Folder `data/` harus bisa ditulis oleh web server (di XAMPP Windows sudah otomatis bisa).

## Cara pakai

**Divisi:** buka halaman utama → pilih divisi → isi format → **Kirim Laporan**.
Kolom bertanda *otomatis* dihitung sendiri. Tab **Laporan Terkirim** menampilkan laporan divisi itu.
Kirim ulang = menimpa laporan sebelumnya. Draft tersimpan otomatis di browser sampai dikirim.

**Admin:** masuk dengan PIN → presentasi 3D (cover, satu slide per divisi, penutup "Salam Cinta").
- Navigasi: tombol ‹ ›, panah keyboard, swipe, atau klik ikon divisi di atas.
- `F` layar penuh · `P` putar otomatis · `R` muat ulang data.
- Klik tanggal di kiri atas untuk mengisi **tanggal** laporan secara manual.
- ⚙ **Kelola Data**: status tiap divisi, hapus per divisi, hapus semua, download backup JSON.

## Data & hapus harian

Semua laporan (termasuk foto) ada di satu file: `data/reports.php` (isinya JSON; diawali `<?php exit; ?>`
supaya tidak bisa dibuka langsung dari browser). Untuk mengosongkan: tombol **Hapus Semua Laporan**
di admin, atau hapus file tersebut.

Foto ikut terkirim bersama laporan. Kalau muncul pesan "Laporan terlalu besar", naikkan `post_max_size`
di `php.ini` (mis. `64M`) lalu restart Apache. File `.htaccess` / `.user.ini` di folder ini sudah mencoba
mengaturnya otomatis.

## Struktur

```
index.html            halaman pengisian divisi
admin.html            halaman admin 3D
api.php               simpan/baca laporan (JSON)
config.php            PIN admin
data/                 tempat file laporan (diblokir dari browser)
js/schema.js          FORMAT LAPORAN TIAP DIVISI — ubah kolom/tabel di sini
js/form.js            form pengisian (dibangun otomatis dari schema)
js/render.js          tampilan laporan read-only (dipakai user & admin)
js/admin.js           scene 3D (three.js), slide, maskot, panel kelola
assets/character.png  maskot (ganti file ini untuk mengganti karakter)
vendor/               three.js lokal (tidak butuh internet)
```

## Batasan keamanan

- Halaman divisi **tanpa login** sesuai permintaan: siapa pun yang membuka web bisa memilih divisi mana saja,
  melihat dan menimpa laporan divisi itu. Pakai hanya di jaringan internal kantor.
- Halaman admin dilindungi PIN (sesi PHP); 5x salah PIN = dikunci 1 menit.
