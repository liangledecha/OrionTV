#!/usr/bin/env pwsh
#Requires -Version 7.0
<#
.SYNOPSIS
    OrionTV 完整环境安装与 APK 打包脚本
.DESCRIPTION
    一键完成：Node.js/Yarn/Expo CLI/Android Studio 安装、环境变量配置、SDK 安装、依赖安装、APK 打包
    请在管理员权限的 PowerShell 7 中运行此脚本
#>

$ErrorActionPreference = "Stop"

# ============================================
# 0. 检查管理员权限
# ============================================
function Test-Admin {
    return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host "[错误] 请使用管理员权限运行 PowerShell 7，然后重新执行此脚本。" -ForegroundColor Red
    Write-Host "提示: 在开始菜单搜索 'PowerShell 7'，右键选择'以管理员身份运行'" -ForegroundColor Yellow
    exit 1
}

# ============================================
# 1. 检查并安装 PowerShell 7
# ============================================
Write-Host "`n[1/10] 检查 PowerShell 7..." -ForegroundColor Cyan
if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) {
    Write-Host "正在安装 PowerShell 7..." -ForegroundColor Yellow
    winget install Microsoft.PowerShell --accept-source-agreements --accept-package-agreements --silent
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) {
        Write-Host "[错误] PowerShell 7 安装失败，请手动安装后重试。" -ForegroundColor Red
        exit 1
    }
}
Write-Host "PowerShell 7 已就绪: $((Get-Command pwsh).Source)" -ForegroundColor Green

# ============================================
# 2. 检查并安装 Node.js LTS
# ============================================
Write-Host "`n[2/10] 检查 Node.js..." -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "正在安装 Node.js LTS..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}
$nodeVersion = node -v
Write-Host "Node.js 已就绪: $nodeVersion" -ForegroundColor Green

# ============================================
# 3. 安装 Yarn
# ============================================
Write-Host "`n[3/10] 检查 Yarn..." -ForegroundColor Cyan
if (-not (Get-Command yarn -ErrorAction SilentlyContinue)) {
    Write-Host "正在安装 Yarn..." -ForegroundColor Yellow
    npm install -g yarn
}
$yarnVersion = yarn --version
Write-Host "Yarn 已就绪: $yarnVersion" -ForegroundColor Green

# ============================================
# 4. 安装 Expo CLI
# ============================================
Write-Host "`n[4/10] 检查 Expo CLI..." -ForegroundColor Cyan
try {
    $expoVersion = npx expo --version 2>$null
    if (-not $expoVersion) { throw }
    Write-Host "Expo CLI 已就绪: $expoVersion" -ForegroundColor Green
} catch {
    Write-Host "正在安装 Expo CLI..." -ForegroundColor Yellow
    npm install -g @expo/cli
}

# ============================================
# 5. 安装 Android Studio
# ============================================
Write-Host "`n[5/10] 检查 Android Studio..." -ForegroundColor Cyan
$androidStudioPaths = @(
    "${env:ProgramFiles}\Android\Android Studio\bin\studio64.exe"
    "${env:LOCALAPPDATA}\Programs\Android Studio\bin\studio64.exe"
    "${env:ProgramFiles(x86)}\Android\Android Studio\bin\studio64.exe"
)
$androidStudioFound = $androidStudioPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $androidStudioFound) {
    Write-Host "正在安装 Android Studio..." -ForegroundColor Yellow
    Write-Host "(下载约 1GB，请耐心等待...)" -ForegroundColor DarkGray
    winget install Google.AndroidStudio --accept-source-agreements --accept-package-agreements --silent
    $androidStudioFound = $androidStudioPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $androidStudioFound) {
        Write-Host "[警告] winget 安装未找到标准路径，尝试搜索..." -ForegroundColor Yellow
        $androidStudioFound = Get-ChildItem "${env:ProgramFiles}" -Recurse -Filter "studio64.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    }
} else {
    Write-Host "Android Studio 已安装" -ForegroundColor Green
}

if ($androidStudioFound) {
    Write-Host "Android Studio: $androidStudioFound" -ForegroundColor Green
    $studioDir = Split-Path (Split-Path $androidStudioFound -Parent) -Parent
    $jbrPath = Join-Path $studioDir "jbr"
    if (-not (Test-Path $jbrPath)) {
        $jbrPath = Join-Path $studioDir "jre"
    }
} else {
    Write-Host "[错误] 无法确认 Android Studio 安装路径，请手动安装后重试。" -ForegroundColor Red
    exit 1
}

# ============================================
# 6. 配置环境变量
# ============================================
Write-Host "`n[6/10] 配置环境变量..." -ForegroundColor Cyan

# JAVA_HOME
if (Test-Path $jbrPath) {
    [System.Environment]::SetEnvironmentVariable("JAVA_HOME", $jbrPath, "Machine")
    $env:JAVA_HOME = $jbrPath
    Write-Host "JAVA_HOME = $jbrPath" -ForegroundColor Green
} else {
    Write-Host "[警告] 未找到 Android Studio 内置 JDK，请确保 JAVA_HOME 已正确设置" -ForegroundColor Yellow
}

# ANDROID_HOME
$androidHome = "${env:LOCALAPPDATA}\Android\Sdk"
if (-not (Test-Path $androidHome)) {
    $androidHome = "${env:USERPROFILE}\AppData\Local\Android\Sdk"
}
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidHome, "Machine")
$env:ANDROID_HOME = $androidHome
Write-Host "ANDROID_HOME = $androidHome" -ForegroundColor Green

# 更新 Path
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$pathsToAdd = @(
    "$androidHome\platform-tools"
    "$androidHome\cmdline-tools\latest\bin"
)
foreach ($p in $pathsToAdd) {
    if (-not ($currentPath -like "*$p*")) {
        $currentPath += ";$p"
    }
}
[System.Environment]::SetEnvironmentVariable("Path", $currentPath, "Machine")
$env:Path = $currentPath + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
Write-Host "Path 已更新" -ForegroundColor Green

# ============================================
# 7. 安装 Android SDK 组件
# ============================================
Write-Host "`n[7/10] 安装 Android SDK 组件..." -ForegroundColor Cyan

# 确保 sdkmanager 可用
$sdkmanager = "$androidHome\cmdline-tools\latest\bin\sdkmanager.bat"
if (-not (Test-Path $sdkmanager)) {
    # 下载 command line tools
    $cmdlineToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $cmdlineToolsZip = "$env:TEMP\cmdline-tools.zip"
    Write-Host "正在下载 Android Command Line Tools..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $cmdlineToolsUrl -OutFile $cmdlineToolsZip -UseBasicParsing
    $cmdlineToolsDir = "$androidHome\cmdline-tools"
    if (Test-Path $cmdlineToolsDir) { Remove-Item $cmdlineToolsDir -Recurse -Force }
    Expand-Archive -Path $cmdlineToolsZip -DestinationPath $cmdlineToolsDir -Force
    # 重命名为 latest
    Rename-Item "$cmdlineToolsDir\cmdline-tools" "$cmdlineToolsDir\latest" -ErrorAction SilentlyContinue
    Remove-Item $cmdlineToolsZip -Force
    $sdkmanager = "$cmdlineToolsDir\latest\bin\sdkmanager.bat"
}

if (Test-Path $sdkmanager) {
    Write-Host "正在安装 SDK Platform 和 Build Tools..." -ForegroundColor Yellow
    & $sdkmanager --sdk_root=$androidHome "platform-tools" "platforms;android-34" "build-tools;34.0.0" "cmdline-tools;latest" --accept-licenses 2>&1 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
} else {
    Write-Host "[警告] 未找到 sdkmanager，请手动打开 Android Studio 完成 SDK 安装。" -ForegroundColor Yellow
}

# ============================================
# 8. 安装项目依赖
# ============================================
Write-Host "`n[8/10] 安装项目依赖..." -ForegroundColor Cyan
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (-not (Test-Path "$projectRoot\node_modules")) {
    Write-Host "正在运行 yarn install..." -ForegroundColor Yellow
    yarn install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] yarn install 失败，请检查网络连接。" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "node_modules 已存在，跳过安装" -ForegroundColor Green
}

# ============================================
# 9. Prebuild Android 项目
# ============================================
Write-Host "`n[9/10] Prebuild Android 项目..." -ForegroundColor Cyan

# 设置 TV 环境变量
$env:EXPO_TV = "1"
$env:EXPO_USE_METRO_WORKSPACE_ROOT = "1"

if (-not (Test-Path "$projectRoot\android\gradlew.bat")) {
    Write-Host "正在运行 expo prebuild --clean..." -ForegroundColor Yellow
    npx expo prebuild --clean --platform android
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] prebuild 失败。" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "android 目录已存在" -ForegroundColor Green
}

# 复制 TV 配置
if (Test-Path "$projectRoot\xml") {
    Write-Host "复制 TV 配置到 android 项目..." -ForegroundColor Yellow
    Copy-Item -Path "$projectRoot\xml\*" -Destination "$projectRoot\android\app\src\" -Recurse -Force
}

# ============================================
# 10. 打包 APK
# ============================================
Write-Host "`n[10/10] 构建 Release APK..." -ForegroundColor Cyan
Set-Location "$projectRoot\android"

Write-Host "正在运行 Gradle 构建 (./gradlew assembleRelease)..." -ForegroundColor Yellow
Write-Host "(首次构建需要下载 Gradle 依赖，可能需要 10-30 分钟，请耐心等待)" -ForegroundColor DarkGray

$gradleResult = 0
$apkOutput = "$projectRoot\android\app\build\outputs\apk\release\app-release.apk"

try {
    & .\gradlew.bat assembleRelease
    $gradleResult = $LASTEXITCODE
} catch {
    $gradleResult = 1
}

Set-Location $projectRoot

if ($gradleResult -eq 0 -and (Test-Path $apkOutput)) {
    Copy-Item -Path $apkOutput -Destination "$projectRoot\OrionTV.apk" -Force
    $finalApk = Get-Item "$projectRoot\OrionTV.apk"
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host " APK 构建成功!" -ForegroundColor Green
    Write-Host " 文件: $($finalApk.FullName)" -ForegroundColor Green
    Write-Host " 大小: $([math]::Round($finalApk.Length / 1MB, 2)) MB" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "`n[错误] APK 构建失败，请检查以上日志。" -ForegroundColor Red
    Write-Host "常见问题:" -ForegroundColor Yellow
    Write-Host "  1. 检查 JAVA_HOME 和 ANDROID_HOME 是否正确设置" -ForegroundColor Yellow
    Write-Host "  2. 打开 Android Studio 并同步项目 (File -> Sync Project with Gradle Files)" -ForegroundColor Yellow
    Write-Host "  3. 确保 Android SDK Platform 和 Build Tools 已安装" -ForegroundColor Yellow
    exit 1
}
