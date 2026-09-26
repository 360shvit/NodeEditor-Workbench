@echo off
setlocal
cd /d "%~dp0"

echo Hytale Generator Workbench v0.11.36-rc.4-r1 - Native Windows Build
if not exist "src-tauri\icons\icon.ico" (
  echo.
  echo Required Windows icon is missing: src-tauri\icons\icon.ico
  echo Re-extract the release package and try again.
  echo.
  pause
  exit /b 1
)

where cargo >nul 2>nul
if errorlevel 1 (
  echo.
  echo Rust/Cargo was not found.
  echo Install the Rust MSVC toolchain and Microsoft C++ Build Tools first.
  echo Then run this file again.
  echo.
  pause
  exit /b 1
)

rem RC hardening: dependency resolution must never happen implicitly during a build.
if not exist "src-tauri\Cargo.lock" (
  echo.
  echo Release build BLOCKED: src-tauri\Cargo.lock is missing.
  echo Run tools\windows\Freeze-Windows-Dependencies.cmd once on the verified Windows toolchain.
  echo Then keep that exact lock with the release source and rebuild using this file.
  echo.
  pause
  exit /b 1
)

rem Keep Cargo's generated build paths short on Windows.
rem Raw/native development builds must fail closed for auto-update.
set "HGW_DISTRIBUTION_KIND=development"

set "CARGO_TARGET_DIR=%LOCALAPPDATA%\HytaleGeneratorWorkbench\cargo-target"
if not exist "%CARGO_TARGET_DIR%" mkdir "%CARGO_TARGET_DIR%"

echo.
echo Cargo target directory:
echo   %CARGO_TARGET_DIR%
echo.
echo Building only from the checked dependency lock...

cargo build --release --locked --manifest-path src-tauri\Cargo.toml
if errorlevel 1 (
  echo.
  echo Build failed. Keep this window open and send the last error lines.
  pause
  exit /b 1
)

if not exist build mkdir build
copy /y "%CARGO_TARGET_DIR%\release\hytale-generator-workbench.exe" "build\Hytale Generator Workbench.exe" >nul
if errorlevel 1 (
  echo.
  echo Build succeeded, but the EXE could not be copied from:
  echo   %CARGO_TARGET_DIR%\release\hytale-generator-workbench.exe
  pause
  exit /b 1
)

echo.
echo Finished:
echo   build\Hytale Generator Workbench.exe
echo.
echo Next steps:
echo   Test-Windows-Safety.cmd
echo   Build-Windows-Installer.cmd
echo   docs\VALIDATION.md
echo.
pause
