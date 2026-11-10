# Sumber API Hadis dan Tafsir

Dokumen ini mencatat pilihan sumber untuk fitur Hadis/Tafsir Quran Oyen, endpoint yang dipakai, dan batas yang diketahui. Respons layanan dapat berubah; dokumentasi resmi tetap menjadi rujukan terbaru.

## Transliterasi Latin Gulir Ayat

Transliterasi ayat dirangkai secara lokal dari anotasi per kata Quranic Arabic Corpus yang sudah ada di paket Gulir Ayat. Empat ayat yang tidak memiliki anotasi kata (2:181, 8:6, 13:37, dan 37:130) dilengkapi dari field `teksLatin` EQuran.id API v2, lalu disimpan di aplikasi agar tetap tersedia offline.

- Quranic Arabic Corpus: <https://corpus.quran.com>
- EQuran.id API v2 dan contoh data: <https://equran.id/apidev/v2>
- Ketentuan EQuran.id: <https://equran.id/terms>

Transliterasi adalah bantuan baca; bukan teks Arab, tajwid, atau pengganti bimbingan guru. Pengguna bisa menampilkan atau menyembunyikannya dari tombol di kartu ayat atau Pengaturan.

## Bacaan ibadah tersimpan lokal

Panel Doa/Wirid, Maulid, dan Tahlil membaca file JSON dari origin situs sendiri di `data/ibadah/`; konten ini tidak perlu diambil dari halaman NU Online saat dibuka, dan tab Maulid/Tahlil tidak mengalihkan pengguna ke situs sumber. Service worker memasukkan berkas `data/` ke manifest cache offline saat rilis. Katalog doa/wirid merupakan salinan statis hasil `GET https://equran.id/api/doa`; salinan ini tidak diperbarui otomatis dan perlu ditinjau sebelum diperbarui.

- **Maulid Barzanji:** 18 bab dan doa penutup, naskah Arab beserta arti Indonesia dari <https://www.alkhoirot.org/2024/11/teks-bacaan-maulid-nabi-barzanji.html>. Transliterasi Latin lengkap tidak tersedia di teks lengkap yang dipakai, sehingga aplikasi tidak membuat transliterasi yang belum diverifikasi.
- **Tahlil & Doa Arwah:** teks Arab, Latin, dan arti Indonesia dari <https://quran.nu.or.id/tahlil>, disusun sebagai 28 bagian agar mudah dibaca dan dinavigasi.
- **Doa/Wirid:** semua 227 rekaman pada snapshot katalog EQuran.id dari <https://equran.id/api/doa>. Ketentuan EQuran.id mengizinkan berbagi konten dengan atribusi dan penggunaan API secara wajar; data tidak dijual. Lihat <https://equran.id/terms>.

Satu rekaman katalog (ID 42, “Bila Ada Sesuatu Yang Menggembirakan”) menempatkan keterangan berbahasa Indonesia pada field `ar`, dan sumber tidak menyediakan teks doa Arab, transliterasi Latin, atau arti Indonesia untuk rekaman tersebut. UI menampilkannya sebagai keterangan sumber dan menyatakan kolom yang tidak tersedia; teks agama tidak dilengkapi dengan hasil tebakan. Rekaman lain tetap disajikan apa adanya, termasuk bila sumber tidak mengisi keterangan tambahan.

Sumber ditampilkan sebagai atribusi teks di panel. Data bacaan disajikan langsung oleh situs ini; pilihan waktu sholat berbasis lokasi dan pencarian tafsir/vektor tetap menggunakan layanan eksternal yang dijelaskan di bagian masing-masing.

## Tafsir Al-Qur'an: EQuran.id API v2

Quran Oyen menggunakan endpoint `GET https://equran.id/api/v2/tafsir/{nomor-surat}` untuk mengambil kumpulan tafsir per ayat dalam satu surat. Endpoint ini melengkapi pembaca tafsir yang sudah ada; pintasan baru memungkinkan pengguna memilih dan membuka tafsir lengkap dari masing-masing 114 surat. Respons, termasuk tafsir yang pernah dibuka, disimpan di cache perangkat melalui IndexedDB.

- Dokumentasi: <https://equran.id/apidev/v2>
- Contoh respons tafsir: <https://equran.id/api/v2/tafsir/1>
- Ketentuan layanan: <https://equran.id/terms>

API tidak membutuhkan akun atau API key untuk pemakaian wajar. Ketentuan EQuran.id menyebut rate limiting, atribusi EQuran.id, larangan menjual data, dan hak cipta terjemahan, tafsir, audio, serta fitur aplikasinya. Karena itu aplikasi menautkan sumber dan tidak menyajikan tafsir sebagai fatwa atau pengganti bimbingan ahli.

## Tafsir lokal pada Gulir Ayat

Jalalain (Al-Mahalli dan As-Suyuthi) dan Quraish Shihab dkk. (Al-Muntakhab) berasal dari unduhan resmi [Tanzil](https://tanzil.net/trans/), masing-masing 114 surah dan 6.236 teks ayat. Berkas dipisah per surah, dimuat dari origin Quran Oyen tanpa menghubungi situs referensi, dan dicache ketika dibuka. Sumber, checksum, footer asli, serta ketentuan non-komersial dicatat di [`tafsir/SOURCES.md`](tafsir/SOURCES.md). Teks tidak ditulis ulang oleh AI; pendahuluan surah tetap tersedia terpisah dari teks ayat.

[Al-Mukhtasar](https://quranenc.com/id/browse/indonesian_mokhtasar) dan [As-Sa’di](https://quranenc.com/id/browse/indonesian_saadi) hanya tersedia sebagai tautan sumber resmi, bukan data terintegrasi. API Al-Mukhtasar berhasil untuk Al-Fatihah namun penarikan lanjutan ditolak 403; endpoint As-Sa’di yang diuji mengembalikan string kosong. Metadata versi tidak berhasil diperoleh. Jangan mengklaim empat kitab penuh atau ketersediaan offline dua sumber QuranEnc ini. Ketentuan QuranEnc meminta teks tidak diubah, atribusi penerbit/QuranEnc, nomor versi, serta pembaruan; lihat [dokumentasi API resmi](https://quranenc.com/en/home/api/).

## Hadis: Fawaz Hadith API melalui jsDelivr

Aplikasi mematok rute CDN ke versi `@1`, lalu mengambil teks per nomor atau satu edisi lengkap hanya ketika pengguna memilih pencarian Indonesia pada kitab tersebut. Edisi Arab tersedia untuk 10 koleksi; katalog versi `1` menyediakan edisi Indonesia yang teridentifikasi untuk tujuh koleksi: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, dan Malik. Koleksi Nawawi, Hadis Qudsi, dan Shah Waliullah ditampilkan dengan Arab/Inggris bila sumber tersebut tersedia, tanpa mengklaim ada terjemahan Indonesia.

- Repositori dan petunjuk endpoint: <https://github.com/fawazahmed0/hadith-api>
- Katalog edisi: <https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.min.json>
- Contoh Arab: <https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1.min.json>
- Contoh Indonesia: <https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ind-bukhari/1.min.json>
- Lisensi repositori: <https://github.com/fawazahmed0/hadith-api/blob/1/LICENSE>
- Referensi sumber koleksi: <https://github.com/fawazahmed0/hadith-api/blob/1/References.md>

Repositori menyatakan lisensi Unlicense dan README menyarankan fallback CDN. Aplikasi memakai teks sebagaimana dikirim, menampilkan nama kitab/nomor dan tautan sumber, serta memakai mirror `fastly.jsdelivr.net` bila host utama gagal. Pencarian Indonesia mengunduh edisi lengkap kitab yang dipilih untuk pencarian lokal di perangkat; kueri tidak dikirim ke server pencarian. Isi kompilasi mencantumkan beragam rujukan, sehingga provenance setiap terjemahan/edisi tetap perlu diperlakukan terpisah dan belum diaudit secara ilmiah.

## Pencarian Hadis lintas koleksi: UmmahAPI

UmmahAPI dipakai sebagai fitur tambahan untuk pencarian teks Inggris lintas 10 koleksi, serta teks Arab/Inggris dan grade pada detail bila tersedia. Endpoint baca yang dipakai tanpa kredensial: `GET https://ummahapi.com/api/hadith/search?q=...&limit=25` dan `GET https://ummahapi.com/api/hadith/{collection}/{nomor}`. Dokumentasinya menyebut batas 100 permintaan per menit tanpa API key; permintaan kata pencarian global dikirim ke UmmahAPI. Pengguna perlu memilih pencarian Indonesia lokal jika ingin kata kunci Indonesia.

- Dokumentasi: <https://ummahapi.com/api/docs>
- Ringkasan Hadith API: <https://ummahapi.com/hadith-api>
- Daftar koleksi live: <https://ummahapi.com/api/hadith/collections>
- Contoh pencarian: <https://ummahapi.com/api/hadith/search?q=prayer&limit=5>

Saat diperiksa, daftar koleksi menyebut sumber `fawazahmed0/hadith-api` melalui jsDelivr. Header CORS wildcard dan respons JSON berhasil diuji dari origin Quran Oyen. Batas 100/menit berasal dari dokumentasi UmmahAPI, bukan SLA uptime. API ini tidak menjadi sumber terjemahan Indonesia; terjemahan Indonesia diambil langsung dari edisi Fawaz.

## Kitab Kuning dan tambahan hadis: Ahmad Sanusi Open API

Dokumentasi resmi menyediakan endpoint Kitab Kuning `GET /v1/kitab`, `/v1/kitab/kategori`, `/v1/kitab/{slug}`, `/v1/kitab/{slug}/bab/{nomor}`, dan `/v1/kitab/{slug}/search`. Untuk hadis, tersedia `GET /v1/hadits/daily`, `/v1/hadits`, `/v1/hadits/search`, `/v1/hadits/{kitab}`, dan `/v1/hadits/{kitab}/{nomor}`. Data endpoints memerlukan header `X-API-Key`; Quran Oyen meneruskannya melalui Vercel Function same-origin `/api/ahmad-sanusi` dengan `AHMAD_SANUSI_API_KEY` sebagai environment variable server-side, bukan kode browser. Aplikasi menampilkan sumber API dan menyatakan bahwa teks/grade perlu diverifikasi, bukan pengganti bimbingan ahli.

- Dokumentasi: <https://api.ahmadsanusi.com/docs>
- OpenAPI: <https://api.ahmadsanusi.com/openapi.json>
- Base URL: <https://api.ahmadsanusi.com>

## Konten harian dan 10 koleksi hadis: UmmahAPI

Konten harian dan tab **10 Koleksi** memakai endpoint baca-saja UmmahAPI lewat proxy same-origin Quran Oyen `/api/ummahapi`. Proxy hanya mengizinkan rute `GET` yang diperlukan, membatasi nama koleksi dan parameter, memakai timeout serta batas ukuran respons, dan tidak meneruskan cookie, API key, atau alamat IP pengunjung ke upstream. Bundel harian mengambil ayat acak, satu Asmaul Husna, dan hadis pilihan; URL memakai tanggal Asia/Jakarta agar cache CDN berlaku per hari. Tombol ayat membuka pembaca internal Quran Oyen.

Terjemahan ayat Kemenag lokal diutamakan; terjemahan Indonesia dari UmmahAPI menjadi fallback. Makna Asmaul Husna dan teks hadis yang diberikan API berbahasa Inggris dan UI menandainya demikian. Doa harian dipilih berputar dari katalog EQuran.id Indonesia `data/ibadah/doa.json`, yang sudah menjadi bagian situs dan cache PWA; 227 bacaan doa/wirid lengkap tetap tersedia pada panel ibadah.

Katalog UmmahAPI menyediakan Bukhari, Muslim, Abu Dawud, Tirmidzi, Ibnu Majah, Nasa’i, Malik, Arba’in Nawawi, 40 Hadis Qudsi, dan 40 Hadis Shah Waliullah. Tab baru menyediakan jelajah berhalaman, detail/nomor, Arab, teks Inggris, dan grade bila sumber mengirimkannya. Pencarian di tab ini menggunakan kata Inggris dan dibatasi hingga 100 hasil; pencarian Indonesia yang sudah ada pada tab Hadis tetap berjalan lokal lewat edisi Fawaz. Kueri pencarian yang diminta pengguna diteruskan ke UmmahAPI; endpoint bebas API key. Kebijakan privasi UmmahAPI menyebut pencatatan endpoint, waktu, IP, dan user-agent. Proxy tidak meneruskan IP pengunjung, tetapi teks kueri tetap dikirim sebagai parameter pencarian.

UmmahAPI menyatakan konten diambil dari sumber publik dan layanan disediakan gratis; halaman About tidak menetapkan satu lisensi menyeluruh untuk semua konten. Quran Oyen mengambil data saat diminta, menampilkan atribusi, dan tidak memaketkan seluruh koleksi hadis. Dataset sumber `fawazahmed0/hadith-api` menyatakan lisensi Unlicense pada repositorinya, tetapi provenance edisi/terjemahan dan penilaian hadis tetap perlu diperiksa secara terpisah. Konten API bukan fatwa atau pengganti bimbingan ahli.

- Dokumentasi: <https://ummahapi.com/api/docs>
- Tentang layanan dan sumber data: <https://ummahapi.com/about>
- Kebijakan privasi: <https://ummahapi.com/privacy>
- Katalog live: <https://ummahapi.com/api/hadith/collections>
- Sumber koleksi hadis: <https://github.com/fawazahmed0/hadith-api> · <https://github.com/fawazahmed0/hadith-api/blob/1/LICENSE>

## Alternatif yang tidak dipakai

- **Hadith API by gading.dev:** praktis dan menyebut sembilan koleksi dengan Arab/Indonesia, tetapi host publik mengalami kegagalan TLS saat riset dan repositori tidak memisahkan lisensi kumpulan data dari lisensi kode MIT. Tidak dijadikan dependensi produksi. Rujukan: <https://github.com/gadingnst/hadith-api>.
- **UmmahAPI Tafsir:** tersedia tanpa API key, tetapi endpoint yang diperiksa hanya mencantumkan tafsir berbahasa Inggris/Arab; ketentuan penggunaan ulang teks tidak ditemukan. Tidak dipakai sebagai sumber tafsir Quran Oyen. Rujukan: <https://ummahapi.com/tafsir-api> dan <https://ummahapi.com/api/tafsir>.
- **QuranEnc:** punya tiga edisi terjemahan Indonesia dan teks Arab per ayat, tetapi dokumentasi API yang diverifikasi tidak menunjukkan endpoint tafsir terpisah. Syaratnya meminta teks tidak diubah serta menyebut penerbit, sumber, dan versi. Rujukan: <https://quranenc.com/en/home/api>.
- **Quran Foundation Content API:** cakupannya luas, tetapi akses produksi memerlukan registrasi aplikasi, OAuth2, persetujuan, dan proxy backend; sumber tafsir Indonesia belum terbukti pada katalog yang diperiksa. Rujukan: <https://api-docs.quran.foundation/docs/quickstart/> dan <https://api-docs.quran.foundation/legal/developer-terms/>.

## Catatan verifikasi

Tes memeriksa allowlist endpoint, batas parameter, validasi origin, timeout, dan alur UI dengan respons API tiruan. Hal itu bukan jaminan uptime upstream. Nomor hadis, varian teks, provenance terjemahan, dan penilaian derajat perlu diverifikasi terhadap edisi ilmiah yang ditetapkan sebelum digunakan sebagai rujukan hukum atau fatwa. Fitur ini menampilkan sumber/nomor dan hanya menampilkan grade ketika API menyediakannya; teks/grade dari API tidak menggantikan pemeriksaan oleh ahli.

## Jadwal salat: kalkulasi GPS lokal dengan adhan-js

Pilihan **Gunakan lokasi saat ini** meminta izin melalui Geolocation API browser. Setelah izin diberikan, aplikasi menghitung seluruh kalender bulanan di perangkat memakai `adhan-js` versi 4.4.6; lintang/bujur tidak dikirim ke layanan lain dan tidak disimpan ke `localStorage` atau IndexedDB. Zona waktu memakai zona IANA perangkat. Pustaka dan lisensi MIT disertakan di `vendor/adhan-4.4.6/` dan masuk cache service worker, sehingga kalkulasi dapat dipakai offline setelah aplikasi dimuat.

Metode awal menerapkan sudut Fajar 20° dan Isya 18° (parameter Kemenag RI), dengan Asar Syafi’i. Pengguna dapat memilih metode Singapore, Muslim World League, Egyptian, atau Asar Hanafi. Imsak ditampilkan 10 menit sebelum Subuh. Arah kiblat dan hitung mundur salat berikutnya juga dihitung lokal.

- Kode dan panduan resmi: <https://github.com/batoulapps/adhan-js>
- Paket tersemat: <https://www.npmjs.com/package/adhan/v/4.4.6>
- Lisensi MIT: <https://github.com/batoulapps/adhan-js/blob/develop/LICENSE>

Mode GPS menampilkan Imsak, Subuh/Fajr, Terbit/Sunrise, Dzuhur, Ashar, Maghrib, dan Isya. `adhan-js` tidak menghitung waktu Dhuha; kolom Dhuha tetap tersedia untuk jadwal kota manual EQuran.id. Waktu hasil perhitungan dapat berbeda menurut lokasi, metode, zona waktu, atau koreksi yang digunakan; gunakan jadwal lokal otoritatif jika memerlukan penyesuaian khusus.
