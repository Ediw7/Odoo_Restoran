# 📖 TUTORIAL LENGKAP — Warung Nusantara ERP

> Versi Panduan: 1.0 | Terakhir Diperbarui: April 2026

---

## 🗺️ GAMBARAN UMUM SISTEM

Warung Nusantara ERP adalah sistem manajemen restoran berbasis web yang terdiri dari **4 Stasiun Kerja** yang saling terhubung secara real-time:

| Stasiun | Siapa | Fungsi Utama |
|---|---|---|
| 🛒 **Kasir (POS)** | Staf Kasir Depan | Input pesanan, cetak struk, terima bayaran |
| 👨‍🍳 **Layar Dapur (KDS)** | Koki / Chef | Lihat antrean masak dari kasir secara real-time |
| 📦 **Gudang/Backoffice** | Staf Gudang | Stok bahan, catatan rusak, beli barang (PO) |
| 📈 **Manajer/Owner** | Pemilik / Bos | Dashboard omset, laporan laba, kelola menu & harga |

---

## 🔐 LANGKAH 1 — LOGIN (Sekali di Pagi Hari)

**Tujuan:** Mengunci perangkat ke Cabang yang benar. Biasanya dilakukan oleh Kepala Shift atau Manajer di awal hari buka warung.

1. Buka browser di perangkat (Tablet/PC/Laptop).
2. Akses alamat sistem: `http://[alamat-server]/restoran/pos`
3. Masukkan **Username/Email Odoo** dan **Password** yang sudah didaftarkan.
4. Klik **"Masuk ke Sistem"**.

> ✅ Jika berhasil, Anda akan langsung masuk ke **Portal Kiosk** untuk memilih Stasiun.

---

## 🖥️ LANGKAH 2 — PORTAL KIOSK (Pilih Stasiun Kerja)

Setelah login, Anda akan melihat halaman Portal dengan 4 kartu besar. Di bagian atas tertulis nama Cabang yang aktif (contoh: *"Kiosk Mode - Cabang Semarang"*).

**Cara menggunakannya:**
- Klik salah satu kotak sesuai Stasiun yang dibutuhkan.
- Tidak perlu login ulang — sistem langsung terbuka tanpa hambatan.

### Catatan Khusus:
- **Tombol "Ganti Stasiun"** (di sidebar, pojok kiri bawah): Klik ini untuk kembali ke Portal Kiosk dan berpindah ke stasiun lain tanpa logout.
- **Tombol "Logout / Ganti Cabang"** (di pojok kanan atas Portal): Klik ini jika perangkat dipindah ke cabang lain atau akhir shift harian.

---

## 🛒 PANDUAN STASIUN KASIR (POS)

### A. Input Pesanan Baru (Walk-in)
1. Klik menu **"Kasir (POS)"** di sidebar kiri.
2. **Pilih Tipe Order:**
   - `Dine In` → untuk pelanggan makan di tempat (isi nomor meja)
   - `Take Away` → bungkus dibawa pulang
   - `Delivery` → diantar ke luar
3. Cari dan klik item menu di bagian kanan layar. Item akan masuk ke keranjang di kiri.
4. Gunakan tombol `+/-` untuk ubah jumlah, atau klik ikon `🗑️` untuk hapus.
5. (Opsional) Isi **Nama Pelanggan** dan klik ikon 🔍 untuk cek status Loyalty poin.
6. Klik **"Kirim ke Dapur"** → Pesanan dikirim ke Layar Dapur. Lanjut terima pelanggan berikutnya.

### B. Proses Pembayaran
1. Saat pesanan selesai dimasak (status "Siap"), klik banner *"Tagihan Aktif Ditemukan"* untuk mode bayar.
2. Pilih metode bayar: **Tunai / Kartu / QRIS / Transfer**.
3. Klik **"Bayar & Selesai"** → Struk otomatis tercetak, stok bahan berkurang otomatis.

### C. Sistem Loyalty (Poin Pelanggan Setia)
- Setiap 1 pesanan = +10 poin untuk pelanggan terdaftar.
- Setiap kunjungan ke-10 → Muncul notifikasi hijau berkedip → Klik **"Klaim"** → Otomatis tambah 1 item **Kopi/Es Teh Gratis (Rp 0)** ke keranjang.
- Jika Manajer memberi hadiah kejutan (VIP Reward), banner kuning emas 👑 akan muncul saat nama pelanggan tersebut diketik di kasir.

---

## 👨‍🍳 PANDUAN STASIUN LAYAR DAPUR (KDS)

1. Setiap pesanan yang dikonfirmasi Kasir akan **muncul otomatis** sebagai kartu di layar Dapur.
2. Kartu berisi: Nomor/Nama Meja, daftar item yang harus dimasak, dan waktu masuk.
3. Klik **"Proses"** saat mulai memasak → Status berubah jadi *"Sedang Dimasak"*.
4. Klik **"Siap"** saat makanan telah siap disajikan → Sistem notifikasi ke Kasir bahwa pesanan bisa diantar.
5. Layar Dapur otomatis refresh setiap beberapa detik (real-time tanpa perlu reload manual).

---

## 📦 PANDUAN STASIUN GUDANG

### A. Stok Etalase Makanan
- Menampilkan sisa stok bahan baku mentah yang dipakai untuk memasak menu.
- Bisa diedit langsung jika ada stok masuk manual yang belum masuk lewat PO.

### B. Pembelian Bahan (Purchase Order / PO)
1. Klik menu **"Pembelian (PO)"**.
2. Klik **"+ Buat PO Baru"**.
3. Pilih Supplier, tambahkan bahan-bahan yang dibeli beserta jumlah dan harga beli per unit.
4. Klik **"Kirim PO ke Supplier"** → PO tersimpan dengan nomor seri otomatis (cth: `PO/2026/04/0001`).
5. Saat barang benar-benar datang ke dapur → Klik **"Barang Datang"** pada PO tersebut.
6. **Stok bahan mentah otomatis bertambah** sesuai jumlah di PO.

### C. Mencatat Wastage (Barang Rusak/Expired)
1. Klik menu **"Barang Rusak / Wastage"**.
2. Klik **"+ Catat Barang Rusak"**, isi bahan apa yang rusak/expired, berapa jumlahnya, dan alasannya.
3. Klik **"Konfirmasi"** → Stok bahan berkurang otomatis dan kerugian tercatat di sistem.

---

## 📈 PANDUAN MANAJER / OWNER

### A. Dashboard Analytics
- Lihat **Omset Hari Ini / Minggu / Bulan** secara real-time.
- Grafik batang/garis untuk tren penjualan.
- Top 5 Menu Terlaris dan analisa metode bayar (Tunai vs QRIS vs Transfer).
- Tabel **Pelanggan Terfavorit** (Loyalty Leaderboard) — siapa yang paling sering makan di sini.

### B. Beri Hadiah VIP ke Pelanggan Setia
1. Di Dashboard, scroll ke tabel **"Pelanggan Terfavorit"**.
2. Arahkan mouse/hover ke baris nama pelanggan → Akan muncul tombol 🎁.
3. Klik → Muncul popup untuk mengetik hadiah bebas (cth: *"Gratis 1 Porsi Bakso"*).
4. Klik **"Kirim Kado"** → Hadiah tersimpan diam-diam.
5. Saat pelanggan tersebut datang dan namanya diketik di Kasir → Banner Emas 👑 akan muncul otomatis!

### C. Laporan Keuangan
- Klik menu **"Laporan Keuangan"**.
- Filter berdasarkan Hari / Minggu / Bulan / Tahun.
- Lihat **Pendapatan Kotor, Total HPP (Harga Pokok Penjualan), dan Laba Bersih** secara akurat.

### D. Kelola Menu & Harga
- Klik menu **"Master Menu & Harga"**.
- Tambah, edit, atau nonaktifkan item menu.
- Set resep bahan (BOM) untuk kalkulasi HPP otomatis.

---

## ⚠️ TROUBLESHOOTING UMUM

| Masalah | Solusi |
|---|---|
| Login gagal | Pastikan server Odoo menyala dan URL benar |
| Menu tidak muncul di Kasir | Cek status menu di "Kelola Menu" - pastikan "Tersedia" = On |
| Stok tidak berkurang setelah transaksi | Pastikan menu punya Resep BOM yang sudah diisi |
| Pesanan tidak muncul di Dapur | Pastikan Kasir klik "Kirim ke Dapur" dan cabang sama |
| PO tidak menambah stok | Klik tombol "Barang Datang" bukan hanya "Konfirmasi PO" |

---

*Untuk pertanyaan teknis dan customisasi tambahan, hubungi tim developer.*
