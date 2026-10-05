# Keuangan Bulanan

Aplikasi pencatat pemasukan dan pengeluaran yang bisa dipasang di HP (Android/iPhone)
seperti aplikasi biasa. Tidak perlu Play Store, tidak perlu internet setelah dipasang.

## Fitur

- Catat **pemasukan** dan **pengeluaran** (jumlah, kategori, tanggal, catatan)
- **Ringkasan per bulan**: total pemasukan, pengeluaran, dan saldo
- **Grafik pengeluaran per kategori** (tahu uang paling banyak habis di mana)
- **Unduh laporan bulanan** dalam format CSV (bisa dibuka di Excel / Google Sheets)
- **Backup & pulihkan** data (file `.json`)
- Jalan **offline**, mendukung mode gelap

## Cara memasang di HP

### 1. Online-kan aplikasinya (sekali saja) lewat GitHub Pages

1. Buka repo ini di GitHub → **Settings** → **Pages**.
2. Di bagian **Build and deployment**, pilih **Source: Deploy from a branch**.
3. Pilih branch tempat folder `keuangan/` berada (misalnya `main` setelah digabung), folder `/ (root)`, lalu **Save**.
4. Tunggu 1–2 menit. Alamatnya menjadi:
   `https://<username-github>.github.io/<nama-repo>/keuangan/`

> GitHub Pages gratis untuk repo **public**. Kalau repo-nya private, pakai GitHub Pro,
> atau unggah folder `keuangan/` ke hosting gratis lain seperti Netlify Drop
> (app.netlify.com/drop, tinggal seret folder) atau Vercel.

### 2. Pasang di HP

**Android (Chrome):**
1. Buka alamat tadi di Chrome.
2. Ketuk menu **⋮** → **Tambahkan ke layar utama** / **Instal aplikasi**.
3. Ikon "Keuangan" muncul di layar utama. Buka dari situ seperti aplikasi biasa.

**iPhone (Safari):**
1. Buka alamat tadi di **Safari** (harus Safari).
2. Ketuk tombol **Bagikan** (kotak dengan panah ke atas) → **Tambah ke Layar Utama**.

### 3. Pakai sehari-hari

1. Pilih **Pengeluaran** atau **Pemasukan**, isi jumlah, pilih kategori, lalu **Simpan**.
2. Ganti bulan lewat pilihan bulan di pojok kanan atas untuk melihat laporan bulan lain.
3. Di akhir bulan, ketuk **Unduh laporan bulan ini** untuk menyimpan laporan ke Excel.

## Penting: soal data

- Data disimpan **di HP itu sendiri** (penyimpanan browser), tidak dikirim ke server mana pun.
- Kalau data browser dihapus atau aplikasi di-uninstall, data ikut hilang.
  Biasakan **Backup data** rutin (misalnya sebulan sekali) dan simpan file backup-nya
  di Google Drive atau WhatsApp ke diri sendiri.
- Pindah HP? Backup di HP lama → kirim file-nya ke HP baru → **Pulihkan backup**.

## Mengubah aplikasi

- Daftar kategori ada di `index.html`, di bagian `const KATEGORI = { ... }`. Tambah atau hapus sesuai kebutuhan.
- Setelah mengubah file apa pun, naikkan angka `VERSION` di `sw.js` (misalnya `keuangan-v2`)
  supaya HP mengambil versi terbaru.
- Coba di komputer: jalankan `npx http-server keuangan` lalu buka `http://localhost:8080`.
