@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\update-huzzle-rules.ps1"
if errorlevel 1 (
    echo.
    echo Huzzle rules update failed. Review the message above.
    pause
    exit /b 1
)

echo.
echo Huzzle rules update completed successfully.
pause
