@echo off
setlocal
chcp 65001 >nul
pushd "%~dp0"

where bun >nul 2>nul
if errorlevel 1 (
  echo Bun was not found. Install Bun or add it to PATH, then try again.
  popd
  exit /b 1
)

where scp >nul 2>nul
if errorlevel 1 (
  echo SCP was not found. Enable the Windows OpenSSH Client, then try again.
  popd
  exit /b 1
)

bun run tools\publish-verified-levels.ts %*
set "HUZZLE_EXIT=%ERRORLEVEL%"

popd
if not "%HUZZLE_EXIT%"=="0" (
  echo.
  echo Publish stopped with an error.
)
exit /b %HUZZLE_EXIT%
