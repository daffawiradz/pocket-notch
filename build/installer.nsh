; Dijalankan oleh electron-builder (NSIS). Uninstaller dibuat otomatis: "Uninstall Pocket Notch.exe"
; di folder instalasi + entri di Windows Settings > Apps.
!macro customUnInstall
  ; hapus autostart (nama lama dan baru)
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "PocketNotch"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Pocket Notch"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Neon Notch"
  ; tanya apakah data/pengaturan ikut dihapus
  MessageBox MB_YESNO|MB_ICONQUESTION "Hapus juga pengaturan dan riwayat Pocket Notch?" /SD IDNO IDNO skipData
    RMDir /r "$APPDATA\Pocket Notch"
  skipData:
!macroend
