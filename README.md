# Buku Event

Pembukuan kas berbasis web untuk event organizer. Satu akun dapat menyimpan beberapa proyek. Setiap proyek mempunyai buku kas, tagihan vendor, timeline, logo, dan laporan sendiri.

## Fitur

- Ringkasan kas masuk, kas keluar, saldo kas, sisa tagihan, dan realisasi anggaran.
- Transaksi pemasukan, belanja bahan, dan pengeluaran lain dengan lampiran foto nota.
- Tagihan vendor dengan jatuh tempo, pembayaran sebagian, pelunasan, dan riwayat pembayaran.
- Agenda berdasarkan tanggal, PIC, dan status.
- Ekspor PDF dengan logo proyek dan workbook Excel dengan lembar Ringkasan, Buku kas, Tagihan vendor, serta Timeline. Foto nota dibuka di aplikasi. Buku kas dalam laporan menunjukkan ada atau tidaknya nota.
- Di ponsel, **Ambil foto** meminta kamera belakang melalui pemilih gambar. Jika browser membuka galeri, pilih opsi kamera dari pemilih atau unggah foto dengan **Pilih gambar**.

## Cara menghitung

- Saldo kas = pemasukan tercatat dikurangi belanja, pengeluaran lain, dan pembayaran vendor.
- Mendaftarkan tagihan vendor menambah sisa kewajiban. Kas baru berkurang setelah pembayaran dicatat. Satu pembayaran vendor cukup dicatat melalui menu **Vendor**.
- Sisa tagihan = nilai tagihan dikurangi total DP dan pembayaran lainnya. Sistem menolak nominal melebihi sisa tagihan.
- **Batalkan** pada riwayat pembayaran menghapus pembayaran dari buku kas dan mengembalikan nilai tersebut ke sisa tagihan.
- Realisasi anggaran = kas keluar dibagi anggaran proyek. Laporan mencakup semua catatan proyek yang sedang dipilih.
- Nominal diinput sebagai rupiah bulat. Tanggal default dan status jatuh tempo mengikuti WIB.

## Uji coba di komputer

Memerlukan Node.js 22.12 atau versi yang lebih baru.

```sh
npm ci
npm run dev
```

Buka alamat dari terminal. Bila keempat variabel Firebase kosong, aplikasi masuk **Mode demo** dengan dua proyek simulasi. Perubahan demo tersimpan di penyimpanan browser untuk origin tersebut. Gunakan data contoh untuk uji coba. Data demo terpisah dari ruang kerja Firebase dan tidak ikut dipindah saat Firebase diaktifkan.

## Pasang online dengan GitHub, Vercel, dan Firebase

### 1. Siapkan Firebase

1. Di [Firebase Console](https://console.firebase.google.com/), buat atau pilih proyek khusus aplikasi ini.
2. Daftarkan aplikasi Web melalui **Project settings → General → Your apps**. Salin nilai konfigurasi Web `apiKey`, `authDomain`, `projectId`, dan `appId`.
3. Aktifkan **Authentication → Sign-in method → Email/Password**. Di **Authentication → Users**, tambahkan akun operator dan atur kata sandi melalui konsol.
4. Buat database **Cloud Firestore** dalam mode Production.
5. Terbitkan aturan dan pengecualian indeks dari folder source. Setelah login ke CLI Firebase, gunakan ID proyek yang benar.

```sh
npx firebase-tools login
npx firebase-tools deploy --only firestore --project ID_PROYEK_FIREBASE
```

Konfigurasi memakai Firebase Authentication dan Cloud Firestore. Foto nota dikompres ke JPEG dan disimpan di dokumen Firestore terpisah hingga 480.000 karakter base64. Logo tersimpan di dokumen proyek hingga 150.000 karakter base64. Dengan rancangan ini aplikasi tidak memerlukan bucket Cloud Storage. Foto asli sebelum kompresi maksimum 25 MB.

Akses Firestore dibatasi ke UID pemilik data. Akun berbeda mempunyai ruang kerja terpisah. Versi awal belum memiliki berbagi proyek atau peran tim. Gunakan akun yang sama di perangkat lain untuk membuka proyek milik akun tersebut. Gunakan penyimpanan browser biasa untuk data simulasi saja.

### 2. Buat repositori GitHub

Ekstrak ZIP dan buat repositori GitHub baru untuk folder source. Unggah isinya termasuk `.env.example`, `.gitignore`, `package-lock.json`, `vercel.json`, dan aturan Firebase. Folder `node_modules`, `dist`, dan file `.env.local` dihasilkan lokal atau saat build.

```sh
git init
git add .
git commit -m "Buat aplikasi Buku Event"
git branch -M main
git remote add origin URL_REPOSITORI_GITHUB
git push -u origin main
```

### 3. Import repositori ke Vercel

1. Di Vercel, pilih **Add New → Project**, lalu import repositori GitHub dengan preset **Vite**. Jika source disimpan di subfolder, pilih subfolder itu sebagai **Root Directory**.
2. Isi variabel untuk Production menggunakan konfigurasi aplikasi Web Firebase.

| Nama variabel | Properti konfigurasi Firebase |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

3. Klik **Deploy**. Jika variabel diubah setelah build, lakukan **Redeploy**. Buka URL HTTPS dari Vercel dan masuk dengan akun operator.
4. Buat satu proyek uji. Coba tambah transaksi beserta foto, buka ulang dari perangkat lain, catat pembayaran vendor, dan unduh kedua laporan. Untuk memeriksa pemisahan data, gunakan akun Firebase kedua dan pastikan daftar proyek akun pertama tidak muncul.

Untuk mencoba mode Firebase dari komputer, salin `.env.example` menjadi `.env.local` dan isi variabel yang sama. Restart Vite setelah mengubahnya. Pakai konfigurasi Web Firebase. File service account, kunci privat, dan kata sandi akun tidak diperlukan pada Vercel.

## Rujukan resmi

- [Firebase Web SDK](https://firebase.google.com/docs/web/setup)
- [Firebase Authentication untuk email dan kata sandi](https://firebase.google.com/docs/auth/web/password-auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Deploy Vite di Vercel](https://vercel.com/docs/frameworks/frontend/vite)
