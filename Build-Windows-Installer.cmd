@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "TAURI_CLI_VERSION=2.11.0"
echo Hytale Generator Workbench v0.11.36-rc.6-r1 - Windows NSIS Setup

if not exist "src-tauri\icons\icon.ico" (
  echo.
  echo Required Windows icon is missing: src-tauri\icons\icon.ico
  pause
  exit /b 1
)
if not exist "src-tauri\Cargo.lock" (
  echo.
  echo Installer build BLOCKED: src-tauri\Cargo.lock is missing.
  echo Run tools\windows\Freeze-Windows-Dependencies.cmd once on the verified Windows toolchain.
  pause
  exit /b 1
)
if not exist "package-lock.json" (
  echo.
  echo Installer build BLOCKED: package-lock.json is missing.
  echo Run tools\windows\Freeze-Windows-Dependencies.cmd once on the verified Windows toolchain.
  pause
  exit /b 1
)
if not exist "src-tauri\updater.pubkey" (
  echo.
  echo Installer build BLOCKED: src-tauri\updater.pubkey is missing.
  pause
  exit /b 1
)
findstr /b /c:"UNCONFIGURED" "src-tauri\updater.pubkey" >nul
if not errorlevel 1 (
  echo.
  echo Installer build BLOCKED: updater public key is not configured.
  echo Run tools\windows\Generate-Updater-Signing-Key.cmd first.
  pause
  exit /b 1
)
if "%TAURI_SIGNING_PRIVATE_KEY%"=="" (
  echo.
  echo Installer build BLOCKED: TAURI_SIGNING_PRIVATE_KEY is not set for this shell.
  pause
  exit /b 1
)
if "%HGW_GITHUB_REPOSITORY%"=="" (
  echo.
  echo Installer build BLOCKED: HGW_GITHUB_REPOSITORY is not set.
  echo Set it to the real owner/repository slug before building an updater-enabled installer.
  pause
  exit /b 1
)
where cargo >nul 2>nul
if errorlevel 1 (
  echo.
  echo Rust/Cargo was not found.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found. It is required to generate third-party notices.
  pause
  exit /b 1
)

set "TAURI_VERSION="
for /f "tokens=*" %%V in ('cargo tauri --version 2^>nul') do set "TAURI_VERSION=%%V"
if not "%TAURI_VERSION%"=="tauri-cli %TAURI_CLI_VERSION%" (
  echo.
  echo Required Tauri CLI %TAURI_CLI_VERSION% was not found.
  echo Run tools\windows\Install-Windows-Installer-Tooling.cmd first.
  pause
  exit /b 1
)

rem Only the installed NSIS distribution class may enable the native updater.
set "HGW_DISTRIBUTION_KIND=installed"

set "CARGO_TARGET_DIR=%LOCALAPPDATA%\HytaleGeneratorWorkbench\cargo-target"
if not exist "%CARGO_TARGET_DIR%" mkdir "%CARGO_TARGET_DIR%"

echo.
echo Generating Windows runtime third-party notices from checked dependencies...
node scripts\generate-third-party-notices.mjs --target x86_64-pc-windows-msvc --output THIRD_PARTY_NOTICES.txt
if errorlevel 1 (
  echo.
  echo Installer build BLOCKED: third-party notice generation failed.
  pause
  exit /b 1
)

echo.
echo Building application and NSIS installer from the checked dependency lock...
echo Output target: %CARGO_TARGET_DIR%
echo.

cargo tauri build --bundles nsis --config src-tauri\tauri.installer.conf.json -- --locked
if errorlevel 1 (
  echo.
  echo Installer build failed. Keep this window open and send the last error lines.
  pause
  exit /b 1
)

node scripts\verify-installer-materials.mjs
if errorlevel 1 (
  echo Installer build BLOCKED: installer toolset provenance verification failed.
  pause
  exit /b 1
)

set "NSISDIR=%CARGO_TARGET_DIR%\release\bundle\nsis"
node scripts\release-surface.mjs --installer-dir "%NSISDIR%" --repository "%HGW_GITHUB_REPOSITORY%"
if errorlevel 1 (
  echo.
  echo Installer build BLOCKED: release surface staging failed.
  pause
  exit /b 1
)
node scripts\release-surface.mjs --check
if errorlevel 1 (
  echo.
  echo Installer build BLOCKED: release surface validation failed.
  pause
  exit /b 1
)
node scripts\verify-updater-signature.mjs
if errorlevel 1 (
  echo.
  echo Installer build BLOCKED: updater signature verification failed.
  pause
  exit /b 1
)

echo.
echo Finished verified installer and updater assets:
echo   release\public\
echo.
echo The signed installer and .sig are the updater payload.
echo SHA-256 evidence is kept next to the installer for independent release verification.
echo Publication still requires the separate protected release workflow.
echo.
pause
