@echo off
cd /d "%~dp0"
echo Fragrantica Local Enrichment
echo ==============================
echo.
echo Options:
echo   Enrich ALL fragrances with missing data:   --all
echo   Enrich by name (fuzzy search):             --name "Vaporocindro"
echo   Enrich by ID:                              --id 215
echo   Force re-scrape already-filled fields:     add --force
echo.
set /p CMD="Enter args (or press Enter to run --all): "
if "%CMD%"=="" set CMD=--all
python enrich_fragrantica_local.py %CMD%
echo.
pause
