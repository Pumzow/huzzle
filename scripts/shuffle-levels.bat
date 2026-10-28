@echo off
setlocal
chcp 65001 >nul
pushd "%~dp0.."

where bun >nul 2>nul
if errorlevel 1 (
  echo Bun was not found. Install Bun or add it to PATH, then try again.
  popd
  pause
  exit /b 1
)

bun run tools\shuffle-levels.ts
set "HUZZLE_EXIT=%ERRORLEVEL%"

popd
if not "%HUZZLE_EXIT%"=="0" (
  echo.
  echo Shuffle stopped with an error.
)
pause
exit /b %HUZZLE_EXIT%
