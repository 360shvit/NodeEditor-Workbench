@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "TAURI_CLI_VERSION=2.11.0"
echo Hytale Generator Workbench v0.11.36-rc.1-r1 - Windows NSIS Setup

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

for /f "tokens=*" %%V in ('cargo tauri --version 2^>nul') do set "TAURI_VERSION=%%V"
echo !TAURI_VERSION! | findstr /c:"%TAURI_CLI_VERSION%" >nul
if errorlevel 1 (
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

set "NSISDIR=%CARGO_TARGET_DIR%\release\bundle\nsis"
set "SETUP_SOURCE="
for /f "delims=" %%F in ('dir /b /a-d /o-d "%NSISDIR%\*-setup.exe" 2^>nul') do if not defined SETUP_SOURCE set "SETUP_SOURCE=%NSISDIR%\%%F"
if not defined SETUP_SOURCE (
  echo.
  echo Tauri build succeeded, but no NSIS setup executable was found in:
  echo   %NSISDIR%
  pause
  exit /b 1
)
set "SIGNATURE_SOURCE=!SETUP_SOURCE!.sig"
if not exist "!SIGNATURE_SOURCE!" (
  echo.
  echo Tauri build succeeded, but the required updater signature was not found:
  echo   !SIGNATURE_SOURCE!
  pause
  exit /b 1
)

if not exist release mkdir release
set "SETUP_OUT=release\Hytale-Generator-Workbench_0.11.36-rc.1_x64-setup.exe"
copy /y "!SETUP_SOURCE!" "%SETUP_OUT%" >nul
if errorlevel 1 (
  echo.
  echo Setup was built but could not be copied to the release folder.
  pause
  exit /b 1
)
copy /y "!SIGNATURE_SOURCE!" "%SETUP_OUT%.sig" >nul
if errorlevel 1 (
  echo.
  echo Updater signature was built but could not be copied to the release folder.
  pause
  exit /b 1
)

set "SETUPHASH="
for /f "skip=1 tokens=* delims=" %%H in ('certutil -hashfile "%SETUP_OUT%" SHA256 ^| findstr /v /c:"CertUtil"') do if not defined SETUPHASH set "SETUPHASH=%%H"
set "SETUPHASH=!SETUPHASH: =!"
> "%SETUP_OUT%.sha256" echo !SETUPHASH!  Hytale-Generator-Workbench_0.11.36-rc.1_x64-setup.exe

echo.
echo Finished installer:
echo   %SETUP_OUT%
echo.
echo The signed installer and .sig are the updater payload.
echo SHA-256 evidence is kept next to the installer for independent release verification.
echo Run npm run release:surface with the real GitHub repository before publishing.
echo.
pause
