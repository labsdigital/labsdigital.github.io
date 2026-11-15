# Lumin — Pembuat Konten H5P Berbasis Web

Lumin adalah aplikasi web (terinspirasi dari **Lumi Education**) untuk membuat, mengedit, memutar, dan mengekspor konten pembelajaran interaktif bergaya **H5P**. Aplikasi ini berjalan sepenuhnya di peramban. Tidak perlu server, akun, atau proses build, dan **semua data disimpan di Local Storage**.

## Menjalankan

Buka `index.html` langsung di peramban, atau jalankan server statis:

```bash
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## Desain antarmuka: tinta & stabilo
Identitas Lumin diambil dari meja guru: tinta pulpen biru (#22318F) di atas kertas buku tulis bergaris, dengan sapuan stabilo kuning (#FFE14D) sebagai satu-satunya penanda yang mencolok, yaitu posisi aktif, tab terpilih, dan jawaban yang dipilih. Judul memakai Schibsted Grotesk, teks memakai Atkinson Hyperlegible yang dirancang agar mudah dibaca. Beranda dibuka dengan kotak tulis "Apa yang ingin Anda ajarkan hari ini?": ketik judul, pilih tipe, tekan Enter.

- Tampilan minimalis: palet netral dengan satu warna aksen (bisa diganti), tipografi Inter, dan ikon garis SVG yang konsisten
- **Palet perintah** (`Ctrl/⌘ + K` atau `/`) untuk mencari konten, membuat tipe baru, dan menjalankan perintah apa pun
- **Dialog buat konten dua langkah**: pilih tipe (dengan pencarian dan kategori), lalu beri judul dan pilih mulai dari contoh atau kosong
- **Editor tiga mode**: Formulir, Split (formulir + pratinjau), dan Pratinjau, plus pratinjau perangkat desktop/tablet/ponsel
- Kartu pustaka dengan aksi saat kursor diarahkan, menu konteks, dan bilah aksi massal mengambang
- Sidebar bisa diciutkan menjadi ikon, mode gelap, dan tata letak responsif untuk ponsel

## Fitur

### 21 tipe konten
| Kategori | Tipe |
|---|---|
| Kuis & Soal | Pilihan Ganda, Benar/Salah, Isi Titik-Titik, Seret Kata, Tandai Kata, Set Pilihan Tunggal, Kuis (Set Soal), Esai, Ringkasan, Urutkan Paragraf |
| Kartu & Permainan | Flashcard, Kartu Dialog, Permainan Memori, Tebak Jawaban |
| Multimedia | Presentasi Kursus (dengan kuis per slide), Video Interaktif, Gambar Hotspot, Slider Gambar, Grafik |
| Tata Letak & Teks | Akordeon, Halaman Teks |

### Menu lengkap (gaya aplikasi desktop)
- **Berkas**: Konten baru, Buka pustaka, Impor (.h5p/.json), Simpan, Simpan sebagai salinan, Ekspor (H5P / HTML / SCORM / JSON), Cetak, Cadangkan, Pulihkan, Tutup editor
- **Edit**: Urungkan/Ulangi, Ganti nama, Metadata, Gandakan, Favorit, Hapus
- **Tampilan**: Pratinjau langsung, Mode putar, Layar penuh, Sidebar, Kisi/Daftar, Tema terang/gelap/sistem
- **Alat**: Hasil & analitik, Sampah, Pengaturan, Pemeriksaan konten, Kosongkan sampah
- **Bantuan**: Panduan, Pintasan keyboard, Daftar tipe konten, Tentang

### Editor
- Formulir yang dibangun dari skema (mirip *semantics* H5P), dengan daftar bersarang, bidang kondisional, editor teks kaya, unggah gambar (dikompres otomatis), dan pemilih posisi hotspot
- Pratinjau langsung dengan mode desktop/tablet/ponsel
- Simpan otomatis, riwayat urungkan/ulangi (100 langkah), tab Metadata (penulis, lisensi, bahasa, tag, folder), Tampilan (warna aksen), dan Pemeriksaan (validasi)

### Pustaka
- Tampilan kisi/daftar, pencarian, filter tipe, urutan, folder, tag, favorit, terakhir dibuka
- Aksi massal: pindah folder, tambah tag, ekspor, hapus
- Sampah dengan pemulihan dan penghapusan otomatis

### Ekspor & impor
- **.h5p**: `h5p.json` + `content/content.json` dengan pemetaan ke pustaka H5P resmi (mis. `H5P.MultiChoice 1.16`); gambar dipisah ke `content/images/`
- **HTML mandiri**: satu berkas yang bisa diputar tanpa koneksi internet
- **SCORM 1.2**: paket `.zip` yang melaporkan skor dan status lulus ke LMS
- **JSON Lumin**: konten tunggal, bundel, atau cadangan penuh
- **Impor .h5p** dari platform lain untuk 17 tipe utama, ditambah seret-dan-lepas berkas ke jendela

### Hasil & analitik
Skor dari mode putar dicatat per percobaan. Tersedia rata-rata, skor terbaik, grafik per konten, dan unduhan CSV.

## Struktur

```
index.html          kerangka aplikasi
css/app.css         gaya aplikasi (tema terang/gelap)
js/icons.js         set ikon SVG
js/player.js        mesin pemutar semua tipe konten (disematkan saat ekspor HTML/SCORM)
js/types.js         registri tipe konten + skema editor + contoh
js/editor.js        pembangun formulir berbasis skema
js/storage.js       lapisan Local Storage (konten, sampah, folder, hasil, pengaturan, cadangan)
js/zip.js           penulis/pembaca ZIP mini (untuk .h5p & SCORM)
js/exporter.js      ekspor/impor H5P, HTML, SCORM, JSON
js/app.js           router, menu, tampilan, editor, pemutar
```

## Catatan
- Kapasitas Local Storage sekitar 5 MB per situs, jadi untuk video sebaiknya gunakan URL.
- Paket `.h5p` hasil ekspor memuat konten tetapi tidak menyertakan kode pustaka H5P. Platform tujuan harus sudah memasang pustaka terkait.
- H5P adalah merek dagang H5P Group. Proyek ini independen.
