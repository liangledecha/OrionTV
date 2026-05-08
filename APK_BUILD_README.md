# OrionTV APK Build Instructions

## Prerequisites

Before building the APK, ensure you have the following installed:

1. **Node.js** (v16 or later)
2. **Java JDK** (v17 recommended)
3. **Android Studio** with Android SDK
4. **Expo CLI**

## Environment Setup

Make sure the following environment variables are set:

```powershell
# Set JAVA_HOME
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\', 'Machine')

# Set ANDROID_HOME
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\Administrator\AppData\Local\Android\Sdk', 'Machine')
```

## Build Methods

### Method 1: Automated Build Script (Recommended)

Run the provided PowerShell script:

```powershell
.\build-apk.ps1
```

Or the batch file:

```cmd
build-apk.bat
```

### Method 2: Manual Build Steps

1. **Prebuild the Android project:**
   ```powershell
   $env:EXPO_TV = "1"
   $env:EXPO_USE_METRO_WORKSPACE_ROOT = "1"
   npx expo prebuild --clean
   ```

2. **Copy TV-specific configurations:**
   ```powershell
   Copy-Item -Path "xml\*" -Destination "android\app\src\" -Recurse -Force
   ```

3. **Build the APK:**
   ```powershell
   cd android
   .\gradlew assembleRelease
   ```

4. **Copy APK to root directory:**
   The APK will be located in `android/app/build/outputs/apk/release/`
   Copy it to the root directory as `OrionTV.apk`

## Troubleshooting

### Network Issues
If you encounter SSL or network errors during Gradle build:

1. Check your internet connection
2. Try building with offline mode: `.\gradlew --offline assembleRelease`
3. If offline fails, ensure all dependencies are cached

### Java/Android SDK Issues
- Verify JAVA_HOME is set correctly
- Verify ANDROID_HOME is set correctly
- Ensure Android SDK Build Tools are installed

### Expo Issues
- Run `npx expo install --fix` to fix dependency issues
- Clear Expo cache: `npx expo r -c`

## Output

The final APK will be copied to the root directory as `OrionTV.apk` and can be installed on Android TV devices.