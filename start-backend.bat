@echo off
cd /d "%~dp0backend"
echo KR Control Backend wird gestartet...
echo.

REM Prüfe ob venv existiert
if not exist "venv" (
    echo Erstelle virtuelle Umgebung...
    python -m venv venv
    echo.
)

REM Aktiviere venv und installiere Pakete
call venv\Scripts\activate.bat
echo Installiere/aktualisiere Abhängigkeiten...
pip install -r requirements.txt -q
echo.

echo Backend läuft auf http://localhost:8000
echo API-Docs: http://localhost:8000/docs
echo.
echo Strg+C zum Beenden
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
