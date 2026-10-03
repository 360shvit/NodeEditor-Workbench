@echo off
setlocal
cd /d "%~dp0\..\.."

set "TAURI_CLI_VERSION=2.11.0"
echo Hytale Generator Workbench - Windows installer tooling

echo.
where cargo >nul 2>nul
if errorlevel 1 (
  echo Rust/Cargo was not found.
  echo Install the Rust MSVC toolchain first.
  pause
  exit /b 1
)

set "TAURI_VERSION="
for /f "tokens=*" %%V in ('cargo tauri --version 2^>nul') do set "TAURI_VERSION=%%V"
echo Existing Tauri CLI: %TAURI_VERSION%
echo Required Tauri CLI: %TAURI_CLI_VERSION%

if "%TAURI_VERSION%"=="tauri-cli %TAURI_CLI_VERSION%" (
  echo.
  echo Installer tooling is ready.
  pause
  exit /b 0
)

echo.
echo Installing pinned Tauri CLI %TAURI_CLI_VERSION% ...
cargo install tauri-cli --version %TAURI_CLI_VERSION% --locked
if errorlevel 1 (
  echo.
  echo Tauri CLI installation failed.
  pause
  exit /b 1
)

echo.
echo Installer tooling is ready.
pause
