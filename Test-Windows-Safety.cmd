@echo off
setlocal
cd /d "%~dp0"

echo Hytale Generator Workbench v0.11.36-rc.4-r1 - Windows Native Safety Matrix

where cargo >nul 2>nul
if errorlevel 1 (
  echo.
  echo Rust/Cargo was not found.
  echo Install the Rust MSVC toolchain first, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "src-tauri\Cargo.lock" (
  echo.
  echo Native safety test BLOCKED: src-tauri\Cargo.lock is missing.
  echo Run tools\windows\Freeze-Windows-Dependencies.cmd first.
  echo.
  pause
  exit /b 1
)

set "CARGO_TARGET_DIR=%LOCALAPPDATA%\HytaleGeneratorWorkbench\cargo-target"
if not exist "%CARGO_TARGET_DIR%" mkdir "%CARGO_TARGET_DIR%"

echo.
echo Running native Rust tests from the checked lock...
cargo test --locked --manifest-path src-tauri\Cargo.toml
if errorlevel 1 goto :failed

echo.
echo PASS: native Rust tests are green.
echo   project_scan_rejects_external_junction_and_reports_reparse passed; regular files used the fast path and external junction traversal stayed rejected.
echo.
pause
exit /b 0

:failed
echo.
echo Windows native safety matrix FAILED.
echo Keep this window open and send the last error lines.
echo.
pause
exit /b 1
