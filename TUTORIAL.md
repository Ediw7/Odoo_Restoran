# 🍽️ TUTORIAL LENGKAP: Testing Restoran Multi-Cabang (Backend & Frontend)

Sistem ini terdiri dari dua bagian yang saling terhubung:
1. **Odoo Backend** (Database & Manajemen Data)
2. **Custom Frontend** (Tampilan Kasir POS modern)

Keduanya sudah disatukan dan *running* di server Odoo (`http://localhost:8069`). Berikut adalah panduan lengkap cara melakukan testing dari awal sampai data masuk ke database.

---

## ========================================
## BAGIAN A: PERSIAPAN DI ODOO (BACKEND)
## ========================================

Sebelum bisa bertransaksi di kasir, kita harus pastikan ada menu yang dijual di database.

### 1. Buka Odoo & Login
1. Buka browser dan ketik: `http://localhost:8069`
2. Login menggunakan akun admin kamu (Email: `admin`, Password: `admin`).

### 2. Mulai Buka Modul Restoran
1. Setelah login, klik icon **Menu Utama** (titik-titik sembilan di pojok kiri atas).
2. Pilih modul **Restoran**.
3. Di dalam modul ini, perhatikan menu di atas:
   - **Operasional**: Berisi daftar Orders.
   - **Master Data**: Berisi manajemen Cabang, Kategori, dan Menu.

### 3. Buat Master Data Database (PENTING!)
Agar Kasir tampil dengan sempurna, kamu harus mengisi data-data ini (jika masih kosong):

1. **Buat Kategori Menu**
   - Klik `Master Data` → `Kategori Menu`.
   - Klik tombol **New**.
   - Isi Nama (misal: "Makanan Utama") dan pilih Icon. Save.
2. **Buat Menu Makanan**
   - Klik `Master Data` → `Daftar Menu`.
   - Klik tombol **New**.
   - Isi Nama (misal: "Nasi Goreng Spesial"), Harga (misal: "25000"), dan pilih Kategori yang barusan dibuat.
   - Pastikan checkbox **Tersedia (Available)** terceklis aktif (✓). Save.
3. **Cek Cabang**
   - Klik `Master Data` → `Daftar Cabang`.
   - Pastikan ada cabang yang aktif (Status "Buka"). Jika belum ada, buat baru atau edit yang sudah ada.

---

## ========================================
## BAGIAN B: TESTING KASIR (FRONTEND)
## ========================================

Sekarang kita akan bertransaksi layaknya seorang kasir restoran menggunakan tampilan POS modern yang terkoneksi langsung dengan database Odoo di atas.

### 1. Pastikan Mode LIVE Aktif
Sebelum buka kasir, pastikan aplikasinya berjalan dalam Mode Live (terhubung ke Odoo), bukan Mode Demo.
File konfigurasi ada di: `/home/edi/custom_addons/restoran_edi/frontend/js/config.js`
Pastikan kondisinya:
```javascript
const CONFIG = {
    ODOO_URL: '',      // Harus kosong karena satu server dengan Odoo
    DEMO_MODE: false,  // Harus false agar mengambil data dari database
};
```
*(Jika kamu baru saja mengubahnya, ikuti langkah ini, kalau sudah false, lanjutkan ke no 2)*

### 2. Buka Halaman Kasir (POS)
1. Buka tab baru di browser (jangan logout Odoo di tab sebelumnya).
2. Pergi ke link: **`http://localhost:8069/restoran/pos`**
3. Tampilan POS modern putih bersih akan muncul.

### 3. Tes Transaksi (Order)
Sekarang, coba pesan makanan:
1. Pastikan di halaman **Kasir (POS)**, kamu melihat menu "Nasi Goreng Spesial" yang tadi kamu buat di Odoo (tandanya koneksi frontend-backend *SUKSES*).
2. Kilk menu tersebut beberapa kali untuk menambahkannya ke **Keranjang** (sebelah kanan).
3. Pilih tipe pesanan di bawah keranjang: **Dine In**, **Take Away**, atau **Delivery**.
4. *(Opsional)* Isi No. Meja dan Nama Pelanggan.
5. Pilih metode pembayaran: Tunai / Kartu / QRIS.
6. Klik tombol besar **Buat Order**.
7. Muncul notifikasi "Order Berhasil!" beserta Nomor Order (contoh: *JKT-ORD/2026/00001*).

### 4. Tes Manajemen Order & Dapur
Ini adalah proses pengolahan setelah pesanan masuk:
1. Klik menu **Daftar Order** di sebelah kiri.
2. Kamu akan melihat orderan yang barusan kamu buat statusnya adalah **"Draft"**.
3. Klik tombol **Konfirmasi**. Status berubah menjadi *Dikonfirmasi*.
4. Pergi ke menu **Kitchen Display**.
5. Disini koki dapur akan melihat orderanmu. Koki bisa menekan **Mulai Masak** (status jadi *Sedang Disiapkan*) dan **Siap Saji** (status jadi *Siap Saji*).
6. Kembali ke menu **Daftar Order**, klik orderanmu, lalu selesaikan dengan menekan tombol **Selesai**.

---

## ========================================
## BAGIAN C: PEMBUKTIAN DATABASE ODOO
## ========================================

Bagian terpenting dari integrasi ini adalah membuktikan bahwa transaksi yang terjadi di aplikasi frontend modern tadi **benar-benar masuk ke database ERP Odoo backend**.

### 1. Cek Order Masuk ke Odoo
1. Kembali ke tab browser **Odoo Backend** (`http://localhost:8069/web`).
2. Masuk ke modul **Restoran**.
3. Klik menu **Operasional** → **Orders**.
4. **BINGO!** 🎉 Kamu akan melihat record pesanan dengan nomor order persis seperti yang dibuat di Kasir POS tadi.

### 2. Validasi Detail Transaksi
1. Klik pada orderan tersebut di Odoo untuk membuka formulir detailnya.
2. Cek kecocokannya dengan yang ada di POS:
   - Apakah nama pelanggannya sama?
   - Apakah No Mejanya benar?
   - Cek Tab *Item Order*, apakah menu "Nasi Goreng Spesial" masuk beserta harganya?
   - Cek Jumlah Total tagihannya, apakah sama?
   - Apakah Statusnya berubah sesuai dengan tombol (Mulai Masak/Selesai) yang ditekan di Web Frontend tadi?

Jika semuanya sama, selamat! Sistem Frontend Modern-mu sudah **100% terintegrasi dengan Database Odoo**. Semua transaksi, rekap pendapatan, dan analitik sudah terpusat di satu sistem yang kuat.

---

### *Catatan Penting (Troubleshooting)*
* Jika tampilan di kasir terasa aneh atau kamu baru saja mengubah kode di file JS/CSS, kamu harus membersihkan cache browser lamamu di halaman POS (`http://localhost:8069/restoran/pos`) dengan cara menekan **Ctrl + Shift + R** atau **Cmd + Shift + R**.
* Jika muncul pesan *Error Fetching*, pastikan kamu sudah Login ke dalam Odoo Backend di browser/peramban yang sama karena integrasinya sangat bergantung pada keabsahan sesi (Session Cookie) User/Staff yang Login.
