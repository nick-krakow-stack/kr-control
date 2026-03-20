@echo off
cd /d "%~dp0frontend"
echo KR Control Frontend wird gestartet...
echo.

REM Prüfe ob Python verfügbar ist
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Frontend läuft auf http://localhost:3000
    echo.
    echo Öffne http://localhost:3000 in deinem Browser
    echo Strg+C zum Beenden
    echo.
    python -m http.server 3000
) else (
    echo Python nicht gefunden. Bitte manuell einen HTTP-Server starten.
    echo Oder: npx serve . -p 3000
    pause
)
