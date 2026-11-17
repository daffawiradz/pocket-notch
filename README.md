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
| Karakter | Poki / Nova / Glitch: sprite pixel, bubble dialog, bereaksi pada pesan & musik, pengingat minum / peregangan / istirahat mata, tidur saat idle, dan jadi persona AI Agent |
| Multi-monitor | Pilih monitor di Settings atau tray; geser X/Y |
| Auto update | electron-updater via GitHub Releases |
| Uninstall | Uninstaller NSIS (Windows Settings > Apps), tombol di Settings dan menu tray |

Interaksi: arahkan kursor ke notch = panel terbuka. Klik kanan notch = Settings. `Esc` = tutup. `Ctrl+Alt+Space` = buka AI. Colek karakter di tab HOME. Di luar notch, klik tembus ke aplikasi lain.

## Jalankan (dev)
Butuh Node.js 20+ di Windows.
```
npm install
npm start
```
atau klik dua kali `start.bat`. Coba UI tanpa musik Windows: `npm run start:mock`. Test logika: `npm test`.

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
Menambah persona/dialog: edit `PERSONAS` di file tersebut. Sprite digambar di `app.js` (`BODY`, `ACC`, `EYE`, `MOUTH`).

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
