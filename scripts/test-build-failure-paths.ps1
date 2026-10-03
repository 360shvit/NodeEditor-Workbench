$ErrorActionPreference = 'Stop'
# Exercise the real workflow/helper command blocks with local command doubles.
# No network, dependency installation, signing data or release mutation is used.
function Assert-True($condition, [string]$message) {
    if (-not $condition) { throw $message }
}

$workflow = Get-Content -LiteralPath '.github/workflows/release-windows.yml' -Raw
$match = [regex]::Match($workflow, '(?ms)      - name: Require tag commit from main\r?\n        shell: pwsh\r?\n        run: \|\r?\n(?<body>.*?)(?=      - name:)')
Assert-True $match.Success 'Release ancestry gate was not found.'
$gate = [scriptblock]::Create((($match.Groups['body'].Value -split '\r?\n') | ForEach-Object { $_ -replace '^          ', '' }) -join "`n")

function git {
    $script:gitCalls += $args[0]
    if ($args[0] -eq 'fetch') { $global:LASTEXITCODE = $script:fetchCode }
    elseif ($args[0] -eq 'merge-base') { $global:LASTEXITCODE = $script:ancestryCode }
    else { throw 'Unexpected Git command in release ancestry fixture.' }
}

foreach ($case in @(
    @{ fetch = 17; ancestry = 0; blocked = $true; calls = 1 },
    @{ fetch = 0; ancestry = 1; blocked = $true; calls = 2 },
    @{ fetch = 0; ancestry = 0; blocked = $false; calls = 2 }
)) {
    $script:fetchCode = $case.fetch
    $script:ancestryCode = $case.ancestry
    $script:gitCalls = @()
    $blocked = $false
    try { & $gate } catch { $blocked = $true }
    Assert-True ($blocked -eq $case.blocked) 'Release ancestry gate did not fail closed.'
    Assert-True ($script:gitCalls.Count -eq $case.calls) 'Release ancestry continued after a failed fetch.'
}
Remove-Item Function:git

$freeze = Get-Content -LiteralPath 'tools/windows/Freeze-Windows-Dependencies.cmd' -Raw
$commands = [regex]::Matches($freeze, '(?m)^\s*(?:call )?npm [^\r\n]+\r?\n\s*if errorlevel 1 goto :failed')
Assert-True ($commands.Count -eq 2) 'Both dependency bootstrap npm commands need failure fixtures.'
$cliChecks = foreach ($file in @('Build-Windows-Installer.cmd', 'tools/windows/Install-Windows-Installer-Tooling.cmd', 'tools/windows/Generate-Updater-Signing-Key.cmd')) {
    $source = Get-Content -LiteralPath $file -Raw
    Assert-True ($source -match 'set "TAURI_VERSION="\r?\nfor /f') 'Clear inherited CLI-version state before reading the installed version.'
    $pin = [regex]::Match($source, 'TAURI_CLI_VERSION=(\d+\.\d+\.\d+)').Groups[1].Value
    $check = [regex]::Match($source, '(?m)^if (?:not )?"%TAURI_VERSION%"=="tauri-cli %TAURI_CLI_VERSION%" \(')
    Assert-True ($pin -ne '' -and $check.Success) 'Windows tooling must compare the complete pinned CLI identity.'
    @{ pin = $pin; command = $check.Value; negative = $check.Value.StartsWith('if not ') }
}
$tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$fixtureRoot = Join-Path $tempParent ('hgw-bootstrap-failure-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
try {
    Push-Location $fixtureRoot
    try {
        foreach ($command in $commands) {
            foreach ($code in @(0, 23)) {
                Set-Content -LiteralPath 'npm.cmd' -Encoding ascii -Value "@exit /b $code"
                $probe = "@echo off`r`n" + $command.Value.Trim() + "`r`necho BOOTSTRAP_CONTINUED`r`nexit /b 0`r`n:failed`r`nexit /b 1`r`n"
                Set-Content -LiteralPath 'probe.cmd' -Encoding ascii -Value $probe
                $output = & $env:ComSpec /d /c probe.cmd
                $exitCode = $LASTEXITCODE
                if ($code -eq 0) {
                    Assert-True ($exitCode -eq 0 -and $output -contains 'BOOTSTRAP_CONTINUED') 'npm.cmd returned success but the bootstrap never resumed.'
                } else {
                    Assert-True ($exitCode -eq 1 -and $output -notcontains 'BOOTSTRAP_CONTINUED') 'npm failure must stop dependency capture.'
                }
            }
        }
        foreach ($check in $cliChecks) {
            foreach ($version in @("tauri-cli $($check.pin)", "tauri-cli $($check.pin)0", "tauri-cli $($check.pin)-beta.1", '')) {
                $probe = "@echo off`r`nset `"TAURI_CLI_VERSION=$($check.pin)`"`r`nset `"TAURI_VERSION=$version`"`r`n" + $check.command + "`r`necho CLI_GATE_TAKEN`r`n)`r`nexit /b 0`r`n"
                Set-Content -LiteralPath 'probe.cmd' -Encoding ascii -Value $probe
                $output = & $env:ComSpec /d /c probe.cmd
                Assert-True ($LASTEXITCODE -eq 0) 'CLI identity fixture failed to execute.'
                $versionMatches = $version -eq "tauri-cli $($check.pin)"
                $expected = if ($check.negative) { -not $versionMatches } else { $versionMatches }
                Assert-True (($output -contains 'CLI_GATE_TAKEN') -eq $expected) 'CLI gate accepted a substring, suffix or missing version.'
            }
        }
    } finally { Pop-Location }
} finally {
    $resolved = [IO.Path]::GetFullPath($fixtureRoot)
    Assert-True ($resolved.StartsWith($tempParent, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolved -Leaf).StartsWith('hgw-bootstrap-failure-')) 'Fixture cleanup escaped its temporary directory.'
    Remove-Item -LiteralPath $resolved -Recurse -Force
}

Write-Output 'Build failure paths: PASS (3 release ancestry cases, 4 npm batch return/failure cases, 12 exact CLI identity cases).'
exit 0
