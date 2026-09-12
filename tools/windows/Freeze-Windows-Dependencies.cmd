@echo off
setlocal
cd /d "%~dp0\..\.."

echo Hytale Generator Workbench v0.11.35-r10 - Dependency Lock Capture

echo.
echo This command is intentionally separate from the normal release build.
echo It creates/verifies the Cargo dependency lock once, then proves that
echo Cargo can resolve the desktop host with --locked.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the version from .nvmrc first.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install the Node.js toolchain first.
  pause
  exit /b 1
)
where cargo >nul 2>nul
if errorlevel 1 (
  echo Rust/Cargo was not found.
  echo Install the Rust MSVC toolchain first, then run this file again.
  pause
  exit /b 1
)

if not exist "package-lock.json" (
  echo Creating package-lock.json from the exact package.json constraints...
  npm install --package-lock-only --ignore-scripts
  if errorlevel 1 goto :failed
) else (
  echo Existing package-lock.json found; it will be verified, not regenerated.
)
npm ci --ignore-scripts
if errorlevel 1 goto :failed

set "CARGO_TARGET_DIR=%LOCALAPPDATA%\HytaleGeneratorWorkbench\cargo-target"
if not exist "%CARGO_TARGET_DIR%" mkdir "%CARGO_TARGET_DIR%"
if not exist build mkdir build

if not exist "src-tauri\Cargo.lock" (
  echo Creating src-tauri\Cargo.lock from the frozen Cargo.toml constraints...
  cargo generate-lockfile --manifest-path src-tauri\Cargo.toml
  if errorlevel 1 goto :failed
) else (
  echo Existing src-tauri\Cargo.lock found; it will be verified, not regenerated.
)

echo.
echo Verifying dependency resolution with --locked...
cargo check --locked --manifest-path src-tauri\Cargo.toml
if errorlevel 1 goto :failed

echo.
echo Capturing dependency evidence...
cargo tree --locked --manifest-path src-tauri\Cargo.toml > build\cargo-tree-v0.11.35.txt
if errorlevel 1 goto :failed
cargo metadata --locked --format-version 1 --manifest-path src-tauri\Cargo.toml > build\cargo-metadata-v0.11.35.json
if errorlevel 1 goto :failed
copy /y "src-tauri\Cargo.lock" "build\Cargo.lock.capture" >nul
certutil -hashfile "src-tauri\Cargo.lock" SHA256 > build\Cargo.lock.sha256.txt
if errorlevel 1 goto :failed

echo.
echo PASS: package-lock.json and Cargo.lock were created or verified; locked resolution succeeded.
echo.
echo IMPORTANT FOR THE VERIFIED SOURCE:
echo   Keep package-lock.json and src-tauri\Cargo.lock as checked dependency evidence.
echo   v0.11.35-r10 keeps that exact verified lock as local build evidence before a release build
echo   is retained in the verified source and rebuilt with --locked.
echo.
pause
exit /b 0

:failed
echo.
echo Dependency lock capture FAILED.
echo No release build should be published from this source tree.
echo Keep this window open and send the last error lines.
echo.
pause
exit /b 1
