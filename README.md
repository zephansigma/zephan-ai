# Zephan AI

Zephan AI adalah antarmuka chat AI responsif dengan tema hitam-biru, riwayat chat lokal, pilihan Web Search, dan tautan sumber. Proyek ini dapat dipublikasikan sebagai website di Netlify.

## Isi proyek

- `web/`: tampilan website dan PWA.
- `netlify/functions/chat.mjs`: backend serverless yang memanggil OpenAI Responses API.
- `netlify.toml`: pengaturan build dan alamat `/api/chat` serta `/api/health`.
- `server/`: backend Express lama untuk pengembangan lokal atau hosting Node.js terpisah.
- `capacitor.config.ts`: konfigurasi awal untuk pembungkus Android.

## Cara paling mudah deploy ke Netlify

1. Ekstrak ZIP ini jika perlu, lalu unggah seluruh folder proyek `zephan-ai` ke repositori GitHub milikmu.
2. Buka https://app.netlify.com/ dan masuk/daftar. Pilih **Add new project** lalu **Import an existing project**.
3. Hubungkan GitHub dan pilih repositori Zephan AI.
4. Pastikan pengaturan build terbaca dari `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `web/dist`
   - Functions directory: `netlify/functions`
5. Sebelum atau sesudah deploy, buka **Site configuration → Environment variables** (nama menu bisa sedikit berbeda) dan tambahkan:
   - `OPENAI_API_KEY` = API key OpenAI milikmu
   - `OPENAI_MODEL` = `gpt-4.1-mini` (gunakan model yang tersedia untuk akun API-mu)
6. Jalankan deploy. Setelah selesai, buka URL website Netlify yang diberikan.

**Penting:** Jangan menulis API key di file frontend, chat, atau repositori GitHub. Masukkan hanya sebagai Environment Variable privat di Netlify. Jangan membagikan API key kepada siapa pun.

## Catatan tentang API dan biaya

- Website memerlukan akun OpenAI API dengan akses dan metode pembayaran/kuota yang sesuai. Penggunaan API dapat menimbulkan biaya.
- Jika kamu masih di bawah umur, minta orang tua/wali membantu membuat atau mengelola akun API dan pengaturan pembayaran sesuai ketentuan layanan.
- Model default fungsi adalah `gpt-4.1-mini`. Jika model itu tidak tersedia untuk akunmu, ubah `OPENAI_MODEL` ke model Responses API yang tersedia.
- Web Search memakai tool bawaan `web_search` pada Responses API. Penggunaan tool ini juga mengikuti ketentuan dan biaya API yang berlaku.

## Tes setelah deploy

- Buka `https://ALAMAT-SITUS-NETLIFY/api/health`. Jika fungsi aktif, hasilnya berupa JSON dengan `ok: true`.
- Kembali ke halaman utama dan coba kirim pesan.
- Jika chat memberi pesan API key belum dipasang, periksa Environment Variables lalu lakukan redeploy.

## Android

Proyek ini belum menjadi APK. Untuk membangun APK Capacitor diperlukan toolchain Android (umumnya Android Studio dan Android SDK). Setelah website dan backend berfungsi, konfigurasi aplikasi Android perlu diarahkan ke URL backend HTTPS yang benar. Pembuatan APK dapat dilakukan kemudian melalui komputer atau layanan build cloud yang mendukung Android.

## Keamanan dan batasan

- API key disimpan di Environment Variables Netlify, bukan di browser.
- Fungsi ini memvalidasi input dasar, tetapi belum memiliki login pengguna atau kuota per pengguna. Jangan langsung membagikan website secara luas tanpa menambahkan autentikasi, pembatasan penggunaan, dan perlindungan penyalahgunaan.
- Riwayat chat disimpan di browser/perangkat, bukan disinkronkan antarperangkat.
- Sumber web ditampilkan dari anotasi sitasi yang dikembalikan API; pengguna tetap perlu memeriksa relevansi dan keakuratan sumber.
