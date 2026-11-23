# Pocket Notch (P-Notch)

Notch / dynamic island interaktif untuk Windows. Tema retro neon, dengan karakter pendamping di dalam "saku".

## Fitur
| Fitur | Keterangan |
|---|---|
| Notch menyatu | Bentuk menempel ke tepi atas layar dengan sudut melengkung keluar (seperti notch iPhone). Mode "melayang" = dynamic island |
| Ukuran | Tinggi notch dan lebar mini player bisa diatur; lebar otomatis mengikuti panjang lirik |
| Jam | Saat idle menampilkan jam (12/24 jam, detik opsional) |
| Musik + lirik | Windows Media Session (Spotify, YouTube di browser, VLC, dll); lirik tersinkron dari LRCLIB; play/pause/next/prev/seek |
| Popup pesan | Aplikasi/bot lain bisa mengirim popup (terkirim / masuk / error) + riwayat di tab INBOX |
| AI Agent | Chat di notch (Claude atau OpenAI-compatible). Bisa kontrol musik, timer, notifikasi, buka link |
| Karakter | Poki / Nova / Glitch: sprite pixel-art 24×22 dengan ekspresi, aksesori, reaksi saat disentuh, bubble dialog, respons musik/pesan, pengingat, idle dan persona AI |
| Focus Mode | Timer lokal 15/25/45 menit, pause/resume/reset, progres visual, indikator di notch, notifikasi ketika selesai; tidak perlu API atau jaringan |
| Control Center | Settings dengan pencarian dan navigasi kategori, pratinjau karakter langsung, serta preview warna tema |
| Multi-monitor | Pilih monitor di Settings atau tray; geser X/Y |
| Auto update | electron-updater via GitHub Releases |
| Uninstall | Uninstaller NSIS (Windows Settings > Apps), tombol di Settings dan menu tray |

Interaksi: arahkan kursor ke notch = panel terbuka. Klik kanan notch = Settings. `Esc` = tutup. `Ctrl+Alt+Space` = buka AI. **Klik maskot** (di notch kecil, mini music, atau HOME) untuk menyapa, **klik dua kali** untuk kejutan, atau **tekan-tahan ±0,6 detik** untuk respons tenang. Saat idle, maskot bergerak di jalur kecil tersendiri tanpa menutupi jam. Di luar notch, klik tetap menembus aplikasi lain.

### Living Mascot Motion Pack (pembaruan interaksi)

- **Idle hidup:** P-Notch berjalan, berjinjit, moonwalk, melompat, melihat-lihat, mengintip, meregangkan badan, berputar, dan sesekali berhenti. Riwayat 4 aktivitas terakhir dipakai untuk menghindari pola yang berulang.
- **Interaksi bertingkat:** klik, klik ganda, tekan-tahan, serta hover (reaksi singkat dengan cooldown). Dialog dan emosi disesuaikan persona Poki/Nova/Glitch. Tidak memerlukan AI key atau koneksi internet.
- **Gerakan berdasarkan keadaan:** saat musik aktif P-Notch bergoyang atau berputar; saat Focus Mode aktif lebih tenang; saat tidur akan bernapas; notifikasi dan kondisi perangkat tetap memicu ekspresi yang sesuai. Kedipan memiliki interval acak dan sesekali berkedip dua kali.
- **Hide/unhide halus:** membuka/tutup panel memakai easing lebih lembut. Hide dari tray **menganimasikan** notch terlebih dahulu; Electron baru menyembunyikan jendela setelah renderer mengonfirmasi animasi berakhir (dengan fallback). Saat tampil lagi, overlay dibuat ulang seperti arsitektur asli untuk menjaga klik dan z-order setelah fullscreen/lock.
- Setelan `Lite FX` dan `prefers-reduced-motion` membatasi animasi. Sistem gerak ada di `src/shared/pet-motion.js`, generator sprite di `src/shared/pet-art.js`, tanpa framework baru.

### Edisi Retro Glass

Tampilan baru mempertahankan gaya retro pixel dan tema Synthwave / Cyber / Matrix / Amber, tetapi memperhalus sudut, permukaan gelap, aksen neon, transisi tab, panel musik, chat AI, HUD, inbox, dan shelf. Mode `Lite` dan preferensi sistem **Reduce motion** tetap dihormati.

Di tab **HOME**, pilih `15M`, `25M`, atau `45M`, lalu tekan **START FOCUS**. Tekan **PAUSE** / **RESUME** untuk mengontrol sesi, atau `↺` untuk reset. Timer berjalan berdasarkan waktu absolut (`Date.now()`), tersimpan otomatis secara lokal di penyimpanan aplikasi, dan memberi notifikasi ketika berakhir. Fitur ini independen dari timer AI Agent.

Di **Settings**, gunakan kolom pencarian atau chip kategori untuk menuju opsi dengan cepat. Pratinjau maskot berubah ketika persona/nama diubah. Seluruhnya masih memakai HTML, CSS, JavaScript vanilla, Electron `contextBridge`, IPC, dan penyimpanan bawaan proyek.


## Jalankan (dev)
Butuh Node.js 20+ di Windows.
```
npm install
npm start
```
atau klik dua kali `start.bat`. Coba UI tanpa musik Windows: `npm run start:mock`. Test logika: `npm test` (25 kasus, termasuk timer fokus, ekspresi maskot, anti-pengulangan gerak, dan interaksi persona).

## Build installer + uninstaller
```
npm run dist
```
(atau `build-installer.bat`). Hasil: `dist\Pocket Notch Setup x.y.z.exe`.
Installer wizard (pilih folder, shortcut desktop/start menu) dan otomatis membuat uninstaller `Uninstall Pocket Notch.exe`. Saat uninstall: autostart dihapus, dan ada pertanyaan apakah pengaturan ikut dihapus (`build/installer.nsh`).
Build installer harus di Windows.

## Mode developer
Opsi webhook (port, token, contoh curl, tombol tes notifikasi) **disembunyikan** di versi terpasang.
- Otomatis tampil saat dijalankan dari source (`npm start`).
- Di versi terpasang: Settings, klik nomor versi 7 kali. Matikan lewat tombol "MATIKAN MODE DEVELOPER".
Webhook tetap berjalan di latar belakang agar bot/aplikasi lain bisa mengirim notifikasi.

## Auto update (sekali setup)
1. Buat repo GitHub `username/pocket-notch`, push folder ini.
2. Di `package.json` > `build.publish`, ganti `GANTI_USERNAME_GITHUB`.
3. Rilis: `npm version patch` lalu `git push --follow-tags`. Workflow `.github/workflows/release.yml` build di Windows dan upload ke GitHub Releases.
4. Repo harus public. Update hanya berjalan pada versi hasil installer.
Tanpa code signing, Windows SmartScreen menampilkan peringatan saat install pertama.

## Webhook notifikasi (developer)
```
curl -X POST http://127.0.0.1:47321/notify -H "Content-Type: application/json" \
  -d '{"title":"Pesan terkirim","message":"Halo Kak","type":"sent","app":"Freshchat"}'
```
Field: `title`, `message`, `type` (`info|sent|received|success|warn|error`), `app`, `duration` (1-30 detik), `icon` (emoji pendek). Array = banyak sekaligus. Token (opsional): header `Authorization: Bearer <token>`.

## Karakter
Settings > KARAKTER: pilih persona, ganti nama karakter, isi nama panggilan kamu, atur gaya bicara (ngobrol / tenang / diam) dan interval pengingat. Dialog lokal (tanpa API) di `src/shared/personas.js`; persona juga disisipkan ke system prompt AI Agent.
Menambah persona/dialog: edit `PERSONAS` di file tersebut. Sprite kini digambar di modul bersama `src/shared/pet-art.js`, dipakai oleh UI notch dan preview karakter di Settings. Ekspresi mengikuti status karakter (idle, talk, dance, sleep, think, happy, wink, surprised, sad).

## Struktur
```
src/main/main.js          window overlay, tray, IPC, multi-monitor, uninstall
src/main/media.js + ps/   SMTC via PowerShell
src/main/lyrics.js        LRCLIB + parser LRC
src/main/notify-server.js webhook lokal
src/main/ai.js            agen + tool-use
src/main/updater.js       auto update
src/main/store.js         setting (API key terenkripsi, migrasi dari "Neon Notch")
src/shared/personas.js    karakter, dialog, prompt persona
src/shared/pet-art.js     generator sprite SVG + ekspresi wajah/anggota badan
src/shared/pet-motion.js  pemilih gerakan anti-pengulangan & dialog interaksi
src/shared/focus.js       state machine timer fokus tanpa dependensi
src/renderer/             UI notch + Settings
build/installer.nsh       hook uninstaller
test/run.js               npm test
```
Windows 10 1809+ / Windows 11. Font VT323 dan Press Start 2P (SIL OFL) disertakan.

## Perangkat (Wi-Fi, Bluetooth, audio, baterai, dll.)

P-Notch menampilkan perubahan perangkat langsung di notch:

- **Popup**: Wi-Fi/jaringan tersambung & terputus, Bluetooth, output audio berganti, charger, baterai rendah/kritis/penuh, USB drive, monitor tersambung/dilepas.
- **HUD indikator**: volume & mute, kecerahan layar, mikrofon, Caps Lock.
- Karakter ikut berkomentar (Wi-Fi putus, baterai rendah, volume terlalu keras, dll.).
- Semua bisa dimatikan satu per satu di Pengaturan → `// PERANGKAT`. Ambang baterai rendah bisa diatur (5–50%).

Catatan teknis:

- Deteksi berjalan lewat `src/main/ps/device.ps1` (PowerShell persisten, polling ringan; grup yang dimatikan di pengaturan ikut dihentikan).
- Wi-Fi putus sesaat (roaming) diabaikan 4 detik agar tidak spam.
- Kecerahan hanya bekerja di laptop dengan WMI `WmiMonitorBrightness` (monitor eksternal tidak didukung).
- Tombol tes tiap event ada di Pengaturan → DEVELOPER (aktifkan dengan 7× klik versi).

## Shelf (file sementara)

Seret file/folder ke notch → panel otomatis membuka tab **SHELF** dan file disalin ke folder penyimpanan sementara. Seret item keluar untuk memakainya di aplikasi lain (email, chat, folder, dsb.), klik 2× untuk membuka, `×` untuk menghapus.

- File **disalin**, jadi aman walau file asal dipindah/dihapus. Lokasi: `%APPDATA%\Pocket Notch\shelf`.
- Kedaluwarsa otomatis (default 24 jam, maks 20 item). Atur di Pengaturan → `// SHELF`.

## Fullscreen & cover album

- Notch otomatis **disembunyikan** saat ada aplikasi fullscreen (game, video, presentasi) di monitor yang sama dengan notch, dan muncul lagi setelah keluar. Bisa dimatikan di Pengaturan → DISPLAY.
- Cover now playing mengikuti album lagu. Bila Windows/Spotify belum memberi gambar, P-Notch mencarinya online (iTunes Search) lalu memakainya.

## Improvement terbaru — Centered Clock & Full-Width Mascot Track

Waktu di tampilan notch idle sekarang diposisikan tepat di tengah, sedangkan maskot berjalan dari ujung kiri ke ujung kanan di **belakang** teks jam. Kecepatan langkah mengikuti lebar notch serta jenis gerakan; Focus Mode dan format jam berbeda tetap didukung. Perubahan ini memakai vanilla JavaScript, Web Animations API (WAAPI), dan CSS yang sudah digunakan di proyek. Detail: [`CENTERED-CLOCK-FULL-TRACK-CHANGELOG.md`](CENTERED-CLOCK-FULL-TRACK-CHANGELOG.md).
