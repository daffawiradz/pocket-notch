# Pocket Notch — Retro Glass update

Modifikasi dilakukan langsung pada **proyek root v1.0.6** dari arsip yang Anda berikan. Tidak ada migrasi framework, perubahan API key, atau penggantian metode utama Electron/IPC.

## Perubahan desain
- UI **Retro Glass**: permukaan gelap berlapis, glow neon yang lebih tenang, garis dan radius konsisten, fokus pada keterbacaan, transisi panel yang lebih halus.
- HOME berbentuk dashboard: identitas karakter, jam dan sapaan, status, Focus Mode, dan akses cepat ke Musik / AI / Inbox.
- Music, AI, notification, HUD, inbox, shelf diharmonisasikan dengan tema baru; Music memiliki empty-state yang jelas dan AI memiliki greeting serta indikator chat.
- Settings mendapat **pencarian kategori**, chip navigasi sticky, visual baru, dan **preview maskot + tema** langsung.
- Menghormati `prefers-reduced-motion` serta Settings `Lite FX`.

## Karakter
- `src/shared/pet-art.js`: renderer SVG pixel-art satu sumber untuk overlay & Settings. Tiap persona punya ciri warna/aksesori.
- Mood diperluas: idle, happy, talk, dance, think, sad, sleep, wink, surprised. Sprite tidak memakai gambar eksternal.
- Respons colekan beragam, status karakter tampil di HOME, dialog Focus baru untuk setiap persona.

## Fungsional
- `src/shared/focus.js`: timer lokal pilihan 15, 25, 45 menit; start, pause, resume, reset; progress; penyimpanan lokal; indikator idle/mini dan notifikasi selesai.
- Penanganan error AI diperkuat: request yang gagal tidak meninggalkan UI dalam kondisi `busy`; tombol send otomatis dinonaktifkan selama respons.
- Tab diberi label aktif untuk aksesibilitas; fokus keyboard dan preferensi reduced-motion diperbaiki.
- `README.md` dan tes otomatis diperluas.

## Kesesuaian proyek
- Tetap menggunakan Electron + Vanilla JS/HTML/CSS, `src/preload.js`, IPC, model data pengaturan `src/main/store.js`, Windows PowerShell media/devices, dan fitur-fitur proyek asal.
- Paket ZIP hasil akhir berisi **satu** versi sumber proyek utama (folder `pocket-notch/`), tanpa duplikat folder lama dan tanpa `.git`.
- Versi `package.json` dipertahankan pada 1.0.6 agar tidak mengubah mekanisme rilis/update tanpa permintaan.

## Validasi
- `npm test`: 23 tes lulus, termasuk 2 tes baru (timer fokus, seluruh mood/persona SVG).
- Smoke test terisolasi dengan Chromium + mock `window.notch`: HOME, MUSIC, AI, interaksi Focus, chat mock, Settings/pencarian; tidak ada page error.
- **Belum diverifikasi langsung di Windows dengan hardware/SMTC/PowerShell nyata, maupun dibuild menjadi installer `.exe`.** Untuk pemeriksaan final, gunakan `npm install`, `npm run start:mock`, `npm start`, lalu `npm run dist` di Windows.
