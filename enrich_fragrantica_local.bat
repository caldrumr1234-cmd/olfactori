@echo off
cd /d "%~dp0"
echo Fragrantica Local Enrichment
echo ==============================
echo.
echo Options:
echo   Enrich ALL fragrances with missing data:
echo     python enrich_fragrantica_local.py --all
echo.
echo   Enrich a single fragrance by ID:
echo     python enrich_fragrantica_local.py --id 215
echo.
set /p CMD="Enter command (or press Enter to run --all): "
if "%CMD%"=="" set CMD=--all
python enrich_fragrantica_local.py %CMD%
echo.
pause
