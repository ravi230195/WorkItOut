# 📱 Mobile App Build Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **For iOS builds**: macOS with Xcode installed
3. **For Android builds**: Android Studio with Android SDK

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Capacitor CLI (if not already installed)
```bash
npm install -g @capacitor/cli
```

### 3. Initialize Capacitor (first time only)
```bash
npx cap init "Workout Tracker" "com.workouttracker.app"
```

### 4. Add Mobile Platforms
```bash
# Add iOS platform (macOS only)
npx cap add ios

# Add Android platform  
npx cap add android
```

## Building for Mobile

### For Development Testing

#### iOS (macOS only)
```bash
npm run ios:dev
```
This will build the web app, sync to iOS, and open Xcode.

#### Android
```bash
npm run android:dev
```
This will build the web app, sync to Android, and open Android Studio.

### For Production Builds

#### iOS App Store / TestFlight
```bash
npm run ios:build
```
Then in Xcode:
1. Select your development team
2. Archive the project (Product → Archive)
3. Upload to App Store Connect

#### Android APK/AAB
```bash
npm run android:build
```
Then in Android Studio:
1. Build → Generate Signed Bundle/APK
2. Choose APK or AAB format
3. Sign with your keystore

## Installing on Your Phone

### Method 1: Development Install (Easiest)

#### For iOS:
1. Connect your iPhone via USB
2. Run `npm run ios:dev`
3. In Xcode, select your device and click "Run"
4. Trust the developer certificate on your phone (Settings → General → VPN & Device Management)

#### For Android:
1. Enable Developer Options and USB Debugging on your Android device
2. Connect via USB
3. Run `npm run android:dev`
4. In Android Studio, select your device and click "Run"

### Method 2: APK Install (Android only)
1. Build APK: `npm run android:build`
2. In Android Studio: Build → Generate Signed Bundle/APK → APK
3. Transfer the APK file to your phone
4. Enable "Install unknown apps" for your file manager
5. Install the APK

### Method 3: PWA Install (Web-based)
1. Deploy your app to a web server (Vercel, Netlify, etc.)
2. Visit the URL on your phone's browser
3. Look for "Add to Home Screen" option
4. The app will install as a PWA

## Debugging

### View logs:
```bash
# iOS logs
npx cap run ios --livereload --external

# Android logs  
npx cap run android --livereload --external
```

### Common Issues:

1. **"Module not found"** - Run `npm install` and `npx cap sync`
2. **iOS build fails** - Make sure Xcode is updated and you have a valid developer account
3. **Android build fails** - Check that Android SDK is properly installed
4. **App crashes on device** - Check device logs for specific errors

## App Icons

Place your app icons in `/public/` directory:
- `icon-72x72.png` through `icon-512x512.png`
- `apple-touch-icon.png` (180x180 for iOS)
- `favicon.svg` for web

## Production Checklist

- [ ] Update app name and bundle ID in `capacitor.config.ts`
- [ ] Add proper app icons
- [ ] Configure signing certificates
- [ ] Test on actual devices
- [ ] Update privacy policy and terms
- [ ] Test offline functionality
- [ ] Optimize performance and bundle size

## File Structure After Setup
```
your-app/
├── android/          # Android native project
├── ios/             # iOS native project  
├── dist/            # Built web assets
├── public/          # Static assets
├── capacitor.config.ts
└── package.json
```

## Next Steps

Once you have the mobile apps working:
1. Set up app store accounts (Apple Developer, Google Play Console)
2. Configure push notifications (optional)
3. Add native features like camera, geolocation
4. Set up CI/CD for automated builds