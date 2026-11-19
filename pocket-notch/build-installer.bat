@echo off
cd /d "%~dp0"
call npm install
call npm run dist
echo.
echo Selesai. Installer ada di folder dist\
pause
