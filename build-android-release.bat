@echo off
setlocal
cd /d "%~dp0"

echo Huzzle Android release builder
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build-android-release.ps1"

if errorlevel 1 (
    echo.
    echo Build failed. Review the message above.
    pause
    exit /b 1
)

echo.
echo Build completed successfully.
pause
