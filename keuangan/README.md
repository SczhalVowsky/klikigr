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

## Halaman Budget & Net Worth

Dari halaman utama, gunakan tombol **Budget** dan **Net Worth** di bawah header.
Semua data (transaksi, budget, net worth) disimpan **di HP Anda saja**. Tidak ada data
keuangan di repo GitHub, jadi aman walaupun repo-nya public.

| Halaman | Alamat | Isinya |
|---|---|---|
| Laporan | `keuangan/` | catat transaksi, ringkasan bulanan, backup & pulihkan |
| Budget vs Realisasi | `keuangan/budget/` | budget per kategori vs pengeluaran yang dicatat di Laporan |
| Net Worth | `keuangan/networth/` | snapshot aset & utang per bulan, tren, komposisi |

### Mengisi budget bulan baru

1. Buka **Budget**, pilih bulannya di pojok kanan atas (bulan ini dan bulan depan selalu tersedia).
2. Buka **Atur budget**, isi angka per kategori. Kosongkan kategori yang tidak dianggarkan.
   Tombol **Salin dari [bulan sebelumnya]** mengisi otomatis dari budget terakhir.
3. Ketuk **Simpan budget**.

Pengeluaran di kategori yang tidak punya budget tetap muncul, ditandai "tanpa budget".
Untuk menghapus budget satu bulan, kosongkan semua kolom lalu simpan.

### Mengisi snapshot net worth bulan baru

1. Di akhir bulan, buka **Net Worth** → **Tambah / ubah snapshot**.
2. Bulan otomatis terisi bulan ini, dan daftar aset/utang disalin dari snapshot terakhir.
   Cukup perbarui nilainya, tambah atau hapus baris kalau perlu.
3. Ketuk **Simpan snapshot**.

Pakai nama aset yang sama dari bulan ke bulan supaya grafik komposisi rapi (nama lama muncul
sebagai saran saat mengetik). Untuk memperbaiki bulan yang sudah ada, pilih bulannya lalu
ketuk **Ubah snapshot ini**.

### Backup

**Backup data** di halaman Laporan menyimpan transaksi, budget, dan net worth dalam satu file.
**Pulihkan backup** menerima file backup baru maupun file backup lama (yang hanya berisi transaksi;
budget dan net worth Anda tidak tersentuh saat memulihkan file lama).

## Mengubah aplikasi

- Daftar kategori ada di `shared.js`, di bagian `const KATEGORI = { ... }` (dipakai halaman Laporan dan Budget). Tambah atau hapus sesuai kebutuhan.
- Setelah mengubah file apa pun, naikkan angka `VERSION` di `sw.js` (misalnya `keuangan-v3`)
  supaya HP mengambil versi terbaru.
- Coba di komputer: jalankan `npx http-server keuangan` lalu buka `http://localhost:8080`.
