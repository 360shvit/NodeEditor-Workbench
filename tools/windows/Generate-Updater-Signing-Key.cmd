@echo off
setlocal
cd /d "%~dp0\..\.."

set "TAURI_CLI_VERSION=2.11.0"
set "KEYDIR=%USERPROFILE%\.tauri"
set "KEYFILE=%KEYDIR%\hytale-generator-workbench.key"

echo Hytale Generator Workbench v0.11.36-rc.3-r1 - Updater Signing Key Bootstrap
echo.
echo This creates the private updater key OUTSIDE the repository and copies only
echo the public key into src-tauri\updater.pubkey. Never commit the private key.
echo.

for /f "tokens=*" %%V in ('cargo tauri --version 2^>nul') do set "TAURI_VERSION=%%V"
echo %TAURI_VERSION% | findstr /c:"%TAURI_CLI_VERSION%" >nul
if errorlevel 1 (
  echo Required Tauri CLI %TAURI_CLI_VERSION% was not found.
  echo Run tools\windows\Install-Windows-Installer-Tooling.cmd first.
  pause
  exit /b 1
)

if not exist "%KEYDIR%" mkdir "%KEYDIR%"
if exist "%KEYFILE%" (
  echo Private key already exists at:
  echo   %KEYFILE%
  echo Refusing to overwrite it.
  pause
  exit /b 1
)

cargo tauri signer generate -w "%KEYFILE%"
if errorlevel 1 goto :failed
if not exist "%KEYFILE%.pub" (
  echo Public key sidecar was not generated at %KEYFILE%.pub
  goto :failed
)
copy /y "%KEYFILE%.pub" "src-tauri\updater.pubkey" >nul

echo.
echo PASS: public key copied to src-tauri\updater.pubkey.
echo Private key remains outside the repository:
echo   %KEYFILE%
echo.
echo Add the PRIVATE KEY CONTENT to the protected GitHub secret:
echo   TAURI_SIGNING_PRIVATE_KEY
echo If you chose a password, add it as:
echo   TAURI_SIGNING_PRIVATE_KEY_PASSWORD
echo.
pause
exit /b 0

:failed
echo.
echo Updater signing key bootstrap FAILED.
pause
exit /b 1
