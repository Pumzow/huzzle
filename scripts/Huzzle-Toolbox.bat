@echo off
setlocal
pushd "%~dp0.."

powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ".\tools\huzzle-toolbox.ps1" %*
set "HUZZLE_EXIT=%ERRORLEVEL%"

popd
exit /b %HUZZLE_EXIT%
