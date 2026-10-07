@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n'est pas installe. Ouverture de la version publiee...
  start "" "https://banana-navy.github.io/seveso-voicebot/"
  exit /b 0
)

if not exist node_modules (
  echo Installation des dependances...
  call npm ci
  if errorlevel 1 exit /b 1
)

echo Ouverture du Voicebot SEVESO sur http://127.0.0.1:5173/
call npm run dev -- --host 127.0.0.1 --open
