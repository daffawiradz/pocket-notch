# Pocket Notch — Centered Clock & Full-Width Mascot Track

Perbaikan lanjutan dari **Living Mascot v2**. Tidak ada perubahan framework, metode IPC, dependency, skema settings, atau nomor versi aplikasi.

## Perubahan

1. **Jam persis di tengah**: `.v-idle .idle-time` memakai posisi absolut `left:50%` dan `translate(-50%,-50%)`, bebas dari lebar/posisi maskot dan label Focus Mode.
2. **Lapisan maskot penuh**: `#petLane` sekarang mengisi 100% luas notch. `#petRoam` melintas sepanjang lebar yang tersedia; jam berada pada `z-index:3` di depannya, maskot di `z-index:1`.
3. **Jarak perjalanan responsif**: koordinat batas gerak dihitung dari `petLane.clientWidth` dan lebar sprite, dengan jarak aman 6px di kedua ujung notch. Berlaku saat lebar notch berubah karena detik, AM/PM, dan Focus Mode.
4. **Gerak lebih natural**: maskot bergantian berjalan dari ujung ke ujung, membalik arah secara otomatis, memakai waktu perjalanan berdasarkan jarak dan jenis langkah (patrol, tiptoe, moonwalk, skip). Interaksi maskot ketika berjalan mempertahankan posisinya, tidak tiba-tiba kembali ke titik awal.
5. **Pilihan aktivitas lebih hidup**: aktivitas berjalan lebih sering, dengan tetap menghindari 4 gerakan yang baru dipakai.
6. **Focus Mode**: ruang indikator Focus Mode diperbesar dari +92px menjadi +112px agar jam tetap centered tanpa bertabrakan dengan label.
7. **Aksesibilitas tetap aktif**: karakter bisa dimatikan melalui Settings; animasi jalan berhenti pada Lite FX / `prefers-reduced-motion` atau ketika view tidak idle.

## File yang berubah
- `src/renderer/index.html`
- `src/renderer/styles.css`
- `src/renderer/app.js`
- `src/shared/pet-motion.js`
- `test/run.js`

## Pengujian
- `npm test`: **26 pengujian lulus**.
- Node syntax check untuk modul yang diubah.
- Chromium mock smoke test: pusat jam meleset **0px**, layer maskot selebar notch, pergerakan terukur **>135px** pada notch default 172px, sprite melintas area teks, tes 12h+detik, maskot nonaktif, Focus Mode tanpa overlap, **0 JavaScript page errors**.
- Integrasi native Windows (tray, fullscreen, overlay hit-test, multi-monitor) perlu diuji di Windows karena pengujian dilakukan di Chromium dengan mock IPC.

## Jalankan
```powershell
npm install
npm run start:mock
# Windows + integrasi real:
npm start
```
