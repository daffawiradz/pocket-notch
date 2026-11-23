# Pocket Notch — Living Mascot Motion Pack

## Permintaan
1. Transisi hide/unhide notch lebih halus dan maskot interaktif.
2. Gerakan maskot tidak kaku, berjalan di notch saat idle dan bereaksi pada konteks.
3. Maskot lebih hidup, tidak terus mengulang animasi/dialog yang sama.

## Yang diubah
- `src/renderer/styles.css`: timing kurva panel/transisi native, animasi reveal/vanish dengan blur ringan; jalur aman di sisi kiri jam; mikroanimasi tangan/kaki dan reaksi spring, putar, intip, shy, wave, nod, sway.
- `src/renderer/index.html`: jalur `petRoam` untuk notch mini dan tombol maskot yang dapat diakses dengan keyboard, plus modul motion.
- `src/shared/pet-art.js`: wajah baru (curious, grin, shy, proud, dizzy, excited, peek, stretch, sleepy, walk), kelompok SVG lengan/kaki untuk animasi, arah pandang.
- `src/shared/pet-motion.js`: 11 gerakan idle non-repetitif (riwayat empat), pengacakan jeda gerak/kedipan; pilihan reaksi tap/double/hold/hover dan 3 kelompok dialog sesuai persona.
- `src/renderer/app.js`: motion director lokal; gerak kecil yang dapat berpindah ke kanan/kiri; gerakan kontekstual untuk musik, Focus, HOME; klik/double/hold/hover di mini/idle dan HOME; speech bubble/dialog; perbaikan tombol close yang tidak langsung membuka panel lagi; signal saat animasi vanish selesai.
- `src/preload.js`: IPC satu arah `overlay:vanished` (renderer → main).
- `src/main/main.js`: hide tray memakai jalur `applyHidden()` yang sama dengan fullscreen/lock, tunggu ACK animasi dengan fallback berdasar kecepatan Settings, lalu `BrowserWindow.hide()`; unhide membangun overlay baru untuk mempertahankan keandalan hit-test Windows; menu tray diperbarui saat visibility berubah.
- `test/run.js`: tes non-repetisi 70 kali dan matriks respons persona x interaksi.

## Prinsip kompatibilitas
- Tidak ada framework, dependency runtime, API eksternal, atau perubahan skema penyimpanan baru.
- Tetap Electron + vanilla HTML/CSS/JS dan existing preload/contextBridge/IPC.
- Native overlay tetap click-through di luar island, pemulihan pasca-fullscreen/lock tetap menggunakan recreate.
- `package.json` tetap 1.0.6; angka versi rilis tidak dinaikkan otomatis.
- Toggle karakter, `Lite FX`, preferensi Reduce Motion, dan semua tab/fungsi sebelumnya tetap tersedia.

## Pengujian
- `npm test`: **25 tes lulus**.
- Validasi syntax Node.js untuk JS renderer, preload, main, shared.
- Chromium (isolated mock, bukan Windows produksi): gerakan idle berbeda, tap/double/hold, panel expand/close, mini music, vanish → ACK → intro; tidak ada error JavaScript.
- **Perlu uji akhir di Windows nyata**: tray hide/unhide, fullscreen, lock/unlock/resume, monitor berbeda, media/device Windows, installer `.exe`.

## Jalankan
```
npm install
npm run start:mock
# di Windows untuk integrasi asli:
npm start
# opsional membuat installer di Windows:
npm run dist
```
