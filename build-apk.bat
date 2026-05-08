@echo off
echo Building OrionTV APK for Android TV...
echo.

REM Set environment variables for TV build
set EXPO_TV=1
set EXPO_USE_METRO_WORKSPACE_ROOT=1

echo Setting up environment variables...
echo EXPO_TV=%EXPO_TV%
echo EXPO_USE_METRO_WORKSPACE_ROOT=%EXPO_USE_METRO_WORKSPACE_ROOT%
echo.

echo Step 1: Prebuilding Android project...
echo Y | call npx expo prebuild --clean --no-install
if %errorlevel% neq 0 (
    echo Error during prebuild. Please check your Expo setup.
    pause
    exit /b 1
)

echo.
echo Step 2: Copying TV-specific configurations...
if exist xml\ (
    xcopy xml\* android\app\src\ /E /I /Y
    echo TV configurations copied successfully.
) else (
    echo Warning: xml directory not found, skipping config copy.
)

echo.
echo Step 3: Building APK...
cd android

REM Try to build with offline mode first
echo Attempting offline build...
call .\gradlew --offline assembleRelease
if %errorlevel% equ 0 goto :success

REM If offline fails, try online build
echo Offline build failed, trying online build...
call .\gradlew assembleRelease
if %errorlevel% equ 0 goto :success

echo.
echo Build failed. This might be due to:
echo 1. Network connectivity issues
echo 2. Missing Android SDK components
echo 3. Java/JDK configuration issues
echo.
echo Please check:
echo - Internet connection for Gradle downloads
echo - Android SDK installation
echo - JAVA_HOME environment variable
echo.
pause
exit /b 1

:success
echo.
echo Build completed successfully!
echo.

REM Find and copy APK to root directory
for /r %%i in (*.apk) do (
    echo Found APK: %%i
    copy "%%i" "..\OrionTV.apk"
    echo APK copied to root directory as OrionTV.apk
    goto :done
)

echo Warning: APK file not found in build outputs.
:done
echo.
echo Done!
pause