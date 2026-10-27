# Installs only the pinned authoring skill; ECC instructions ship with the project.
[CmdletBinding()]
param([switch]$ProjectOnly)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$skillsProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$skillsDoctorPath = Join-Path $PSScriptRoot 'skills-doctor.mjs'
$skillsNodePath = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$skillsLock = Get-Content -LiteralPath (Join-Path $skillsProjectRoot 'tools/skills-lock.json') -Raw | ConvertFrom-Json

function Get-SkillsReport {
    param([switch]$OnlyProject)
    $skillsArguments = @($skillsDoctorPath, '--json')
    if ($OnlyProject) { $skillsArguments += '--project-only' }
    # A failing doctor is data here; the script decides which states are installable.
    $skillsPriorErrorPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $skillsRawReport = & $skillsNodePath @skillsArguments
        $skillsDoctorExitCode = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $skillsPriorErrorPreference }
    if (-not $skillsRawReport) { throw 'Skills doctor did not return a report.' }
    $skillsParsedReport = ($skillsRawReport -join [Environment]::NewLine) | ConvertFrom-Json
    if ($skillsDoctorExitCode -notin @(0, 1)) { throw "Skills doctor failed with exit code $skillsDoctorExitCode." }
    return $skillsParsedReport
}

$skillsProjectReport = Get-SkillsReport -OnlyProject
if ($skillsProjectReport.status -ne 'project-pass') {
    throw 'ECC integrity failed. Restore the reviewed project files; no catalog will be downloaded or silently repaired.'
}
if ($ProjectOnly) {
    Write-Host "ECC verified: $($skillsProjectReport.ecc.skills) skills, $($skillsProjectReport.ecc.bytes) bytes."
    Write-Host 'img2threejs: OMITIDO explicitly by -ProjectOnly; authoring installation was not checked.'
    exit 0
}

$skillsInitialReport = Get-SkillsReport
if ($skillsInitialReport.status -eq 'pass') {
    Write-Host "ECC verified: $($skillsInitialReport.ecc.bytes) bytes."
    Write-Host "img2threejs already correct: $($skillsInitialReport.img2threejs.release.commit). No download or filesystem changes."
    exit 0
}

$skillsImgLock = $skillsLock.img2threejs
$skillsPinnedCommit = [string]$skillsImgLock.commit
$skillsInstallerUrl = 'https://raw.githubusercontent.com/img2threejs/img2threejs/' + $skillsPinnedCommit + '/bin/img2threejs.mjs'
if ($skillsPinnedCommit -notmatch '^[a-f0-9]{40}$' -or
    $skillsImgLock.installer.url -ne $skillsInstallerUrl -or
    $skillsImgLock.installer.cachePath -ne '.work/skill-adoption/img2threejs-installer.mjs' -or
    $skillsImgLock.installer.sha256 -notmatch '^[a-f0-9]{64}$') {
    throw 'Pinned installer metadata is invalid.'
}
if ($skillsInitialReport.img2threejs.link.exists -or
    $skillsInitialReport.img2threejs.issues -notcontains 'IMG_LINK_MISSING') {
    throw 'The Codex img2threejs path is occupied, changed, or inaccessible. It will not be replaced.'
}
if ($skillsInitialReport.img2threejs.release.exists -and -not $skillsInitialReport.img2threejs.release.verified) {
    throw 'The existing managed release failed SHA/origin/clean-tree/SKILL verification. It will not be repaired automatically.'
}
$skillsCodexHome = Split-Path -Parent (Split-Path -Parent ([string]$skillsInitialReport.img2threejs.link.path))
if (-not (Test-Path -LiteralPath $skillsCodexHome -PathType Container)) {
    throw 'The standard Codex user home is not present. Use -ProjectOnly for CI or machines without authoring tools.'
}
Get-Command git -CommandType Application -ErrorAction Stop | Out-Null

# This cache is small, project-local and contains one installer, never an npm tree.
$skillsCacheDirectory = $skillsProjectRoot
foreach ($skillsCacheSegment in @('.work', 'skill-adoption')) {
    $skillsCacheDirectory = Join-Path $skillsCacheDirectory $skillsCacheSegment
    if (Test-Path -LiteralPath $skillsCacheDirectory) {
        $skillsCacheItem = Get-Item -LiteralPath $skillsCacheDirectory -Force
        if (-not $skillsCacheItem.PSIsContainer -or $skillsCacheItem.LinkType) {
            throw 'Installer cache must be a real directory inside this workspace.'
        }
    }
    else { New-Item -ItemType Directory -Path $skillsCacheDirectory | Out-Null }
}
$skillsInstallerPath = Join-Path $skillsCacheDirectory 'img2threejs-installer.mjs'
if (Test-Path -LiteralPath $skillsInstallerPath) {
    $skillsInstallerItem = Get-Item -LiteralPath $skillsInstallerPath -Force
    if ($skillsInstallerItem.PSIsContainer -or $skillsInstallerItem.LinkType) { throw 'Installer cache file is not a regular owned file.' }
}
else {
    $skillsDownloadPath = Join-Path $skillsCacheDirectory ('img2threejs-download-' + [guid]::NewGuid().ToString('N') + '.mjs')
    New-Item -ItemType File -Path $skillsDownloadPath -ErrorAction Stop | Out-Null
    try {
        Write-Host "Downloading the reviewed 11.8 KB installer at $skillsPinnedCommit."
        Invoke-WebRequest -Uri $skillsInstallerUrl -OutFile $skillsDownloadPath
        $skillsDownloadedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $skillsDownloadPath).Hash.ToLowerInvariant()
        if ($skillsDownloadedHash -ne $skillsImgLock.installer.sha256 -or
            (Get-Item -LiteralPath $skillsDownloadPath).Length -ne $skillsImgLock.installer.bytes) {
            throw 'Downloaded installer checksum/size mismatch; it will not be executed.'
        }
        [System.IO.File]::Move($skillsDownloadPath, $skillsInstallerPath)
    }
    finally {
        # Only the unique regular file created above can be removed; no recursive deletion.
        if (Test-Path -LiteralPath $skillsDownloadPath) { Remove-Item -LiteralPath $skillsDownloadPath }
    }
}
$skillsInstallerHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $skillsInstallerPath).Hash.ToLowerInvariant()
if ($skillsInstallerHash -ne $skillsImgLock.installer.sha256 -or
    (Get-Item -LiteralPath $skillsInstallerPath).Length -ne $skillsImgLock.installer.bytes) {
    throw 'Cached installer checksum/size mismatch; it will not be executed or overwritten.'
}

$skillsPriorErrorPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    $skillsInstallerOutput = & $skillsNodePath $skillsInstallerPath install --host codex --ref $skillsPinnedCommit 2>&1
    $skillsInstallerExitCode = $LASTEXITCODE
}
finally { $ErrorActionPreference = $skillsPriorErrorPreference }
$skillsInstallerText = ($skillsInstallerOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
if ($skillsInstallerText) { Write-Host $skillsInstallerText }

if ($skillsInstallerExitCode -ne 0) {
    # The reviewed upstream installer stages/verifies the release before linking.
    # Native Windows may deny directory symlinks without elevated privileges.
    if ($env:OS -ne 'Windows_NT' -or $skillsInstallerText -notmatch '(?is)EPERM.*symlink|symlink.*EPERM') {
        throw "Pinned installer failed with exit code $skillsInstallerExitCode; no fallback was attempted."
    }
    $skillsFallbackReport = Get-SkillsReport
    if (-not $skillsFallbackReport.img2threejs.release.verified -or
        $skillsFallbackReport.img2threejs.link.exists -or
        $skillsFallbackReport.img2threejs.issues -notcontains 'IMG_LINK_MISSING') {
        throw 'EPERM fallback refused: exact clean release and an empty destination are required.'
    }
    $skillsVerifiedTarget = [string]$skillsFallbackReport.img2threejs.release.path
    $skillsHostLink = [string]$skillsFallbackReport.img2threejs.link.path
    $skillsHostDirectory = Split-Path -Parent $skillsHostLink
    if (-not (Test-Path -LiteralPath $skillsHostDirectory)) { New-Item -ItemType Directory -Path $skillsHostDirectory | Out-Null }
    # No -Force: an entry created concurrently or owned by someone else is never replaced.
    New-Item -ItemType Junction -Path $skillsHostLink -Target $skillsVerifiedTarget -ErrorAction Stop | Out-Null
    Write-Host 'Created a managed directory junction after verified EPERM; no elevated privileges were requested.'
}
$skillsFinalReport = Get-SkillsReport
if ($skillsFinalReport.status -ne 'pass') { throw 'Post-install integrity check failed. No success is claimed.' }
Write-Host "Skills verified. ECC $($skillsFinalReport.ecc.bytes) bytes; img2threejs $($skillsFinalReport.img2threejs.release.bytesIncludingGit) bytes including Git."
