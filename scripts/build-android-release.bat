@echo off
setlocal
chcp 65001 >nul
pushd "%~dp0.."

echo Huzzle Android release builder
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\build-android-release.ps1"
set "HUZZLE_EXIT=%ERRORLEVEL%"

popd
if not "%HUZZLE_EXIT%"=="0" (
    echo.
    echo Build failed. Review the message above.
    pause
    exit /b %HUZZLE_EXIT%
)

echo.
echo Build completed successfully.
pause
exit /b 0
