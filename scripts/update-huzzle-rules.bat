@echo off
setlocal
chcp 65001 >nul
pushd "%~dp0.."

powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\update-huzzle-rules.ps1"
set "HUZZLE_EXIT=%ERRORLEVEL%"

popd
if not "%HUZZLE_EXIT%"=="0" (
    echo.
    echo Huzzle rules update failed. Review the message above.
    pause
    exit /b %HUZZLE_EXIT%
)

echo.
echo Huzzle rules update completed successfully.
pause
exit /b 0
