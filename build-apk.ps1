# OrionTV APK Build Script
# This script builds the Android APK for OrionTV app

Write-Host "Building OrionTV APK for Android TV..." -ForegroundColor Green
Write-Host ""

# Set environment variables for TV build
$env:EXPO_TV = "1"
$env:EXPO_USE_METRO_WORKSPACE_ROOT = "1"

Write-Host "Setting up environment variables..." -ForegroundColor Yellow
Write-Host "EXPO_TV=$env:EXPO_TV"
Write-Host "EXPO_USE_METRO_WORKSPACE_ROOT=$env:EXPO_USE_METRO_WORKSPACE_ROOT"
Write-Host ""

Write-Host "Step 1: Prebuilding Android project..." -ForegroundColor Yellow
try {
    & npx expo prebuild --clean
    if ($LASTEXITCODE -ne 0) {
        throw "Prebuild failed with exit code $LASTEXITCODE"
    }
    Write-Host "Prebuild completed successfully." -ForegroundColor Green
} catch {
    Write-Host "Error during prebuild: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check your Expo setup and try again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 2: Copying TV-specific configurations..." -ForegroundColor Yellow
if (Test-Path "xml") {
    Copy-Item -Path "xml\*" -Destination "android\app\src\" -Recurse -Force
    Write-Host "TV configurations copied successfully." -ForegroundColor Green
} else {
    Write-Host "Warning: xml directory not found, skipping config copy." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Building APK..." -ForegroundColor Yellow
Push-Location android

# Try to build with offline mode first
Write-Host "Attempting offline build..." -ForegroundColor Yellow
try {
    & .\gradlew --offline assembleRelease
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Offline build completed successfully!" -ForegroundColor Green
        Pop-Location
        break
    }
} catch {
    Write-Host "Offline build failed, trying online build..." -ForegroundColor Yellow
}

# If offline fails, try online build
try {
    & .\gradlew assembleRelease
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build completed successfully!" -ForegroundColor Green
    } else {
        throw "Gradle build failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "Build failed. This might be due to:" -ForegroundColor Red
    Write-Host "1. Network connectivity issues" -ForegroundColor Red
    Write-Host "2. Missing Android SDK components" -ForegroundColor Red
    Write-Host "3. Java/JDK configuration issues" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "- Internet connection for Gradle downloads" -ForegroundColor Yellow
    Write-Host "- Android SDK installation" -ForegroundColor Yellow
    Write-Host "- JAVA_HOME environment variable" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    Pop-Location
    exit 1
}

Pop-Location

Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Find and copy APK to root directory
Write-Host "Looking for APK file..." -ForegroundColor Yellow
$apkFiles = Get-ChildItem -Path "android" -Recurse -Filter "*.apk" | Where-Object { $_.Name -like "*release*" -or $_.Name -like "*debug*" }

if ($apkFiles) {
    foreach ($apk in $apkFiles) {
        Write-Host "Found APK: $($apk.FullName)" -ForegroundColor Green
        Copy-Item $apk.FullName "OrionTV.apk" -Force
        Write-Host "APK copied to root directory as OrionTV.apk" -ForegroundColor Green
        break
    }
} else {
    Write-Host "Warning: APK file not found in build outputs." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Read-Host "Press Enter to exit"