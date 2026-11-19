@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Install dependency...
  call npm install
)
call npm start
