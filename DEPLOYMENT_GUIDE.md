# 📱 Complete iOS App Deployment Guide

## Prerequisites Checklist

Before starting, make sure you have:

- [ ] **macOS computer** (required for iOS development)
- [ ] **Xcode** installed from Mac App Store
- [ ] **iPhone** with USB cable
- [ ] **Apple ID** (free account works for personal development)
- [ ] **Node.js** (v18 or higher)

---

## Step 1: Initial Setup

### 1.1 Install Node Dependencies
```bash
# In your project root directory
npm install
```

### 1.2 Install Capacitor CLI Globally
```bash
npm install -g @capacitor/cli
```

### 1.3 Make Scripts Executable
```bash
chmod +x setup-ios-direct.sh
chmod +x ios/build.sh
chmod +x ios/install-on-device.sh
```

---

## Step 2: Initialize iOS Project

### 2.1 Run the iOS Setup Script
```bash
./setup-ios-direct.sh
```

This script will:
- Install all dependencies
- Initialize Capacitor with your app details
- Add iOS platform
- Build your web assets
- Sync everything to iOS project
- Offer to open Xcode

### 2.2 If Setup Script Fails, Manual Setup:
```bash
# Initialize Capacitor
npx cap init "Workout Tracker" "com.workouttracker.app"

# Add iOS platform
npx cap add ios

# Build web app
npm run build

# Sync with iOS
npx cap sync ios
```

---

## Step 3: Configure Xcode Project

### 3.1 Open Xcode
```bash
npx cap open ios
```

### 3.2 Configure App Signing

1. **Select your project** in the left sidebar (top "App" item)
2. **Select "App" target** in the main area
3. **Go to "Signing & Capabilities" tab**
4. **Check "Automatically manage signing"**
5. **Select your Team**:
   - If you don't see your team, add your Apple ID:
     - Xcode → Preferences → Accounts → + → Add Apple ID
   - Select your personal team (Your Name - Personal Team)

### 3.3 Change Bundle Identifier (if needed)
- In "Signing & Capabilities", change Bundle Identifier to something unique:
  - Example: `com.yourname.workouttracker`

---

## Step 4: Prepare Your iPhone

### 4.1 Enable Developer Mode
1. **Connect iPhone to Mac** via USB cable
2. **Trust the computer** on your iPhone when prompted
3. **Enable Developer Mode**:
   - Settings → Privacy & Security → Developer Mode → Turn On
   - Restart iPhone when prompted

### 4.2 In Xcode Device Selection
- Click the device dropdown next to the play button
- Select your iPhone from the list
- If you don't see it, try unplugging and reconnecting

---

## Step 5: Build and Install

### 5.1 Method A: Direct Xcode Build (Recommended)

1. **Make sure your iPhone is selected** in Xcode device dropdown
2. **Click the Play button (▶️)** in Xcode toolbar
3. **Wait for build to complete** (first build takes 2-5 minutes)
4. **Trust the developer** on your iPhone:
   - Settings → General → VPN & Device Management
   - Tap your Apple ID under "Developer App"
   - Tap "Trust [Your Apple ID]"
5. **Open the app** on your iPhone

### 5.2 Method B: Command Line Build
```bash
# Build and install directly
./ios/install-on-device.sh
```

### 5.3 Method C: Quick Rebuild After Changes
```bash
# After making changes to your React code
npm run build
npx cap sync ios
# Then press play in Xcode
```

---

## Step 6: Troubleshooting Common Issues

### 6.1 "No Matching Provisioning Profile"
**Solution:**
1. In Xcode → Signing & Capabilities
2. Change Bundle Identifier to something unique
3. Make sure "Automatically manage signing" is checked
4. Select your team again

### 6.2 "iPhone is Busy"
**Solution:**
1. Wait for any background processes to finish
2. Restart Xcode
3. Disconnect and reconnect iPhone

### 6.3 "Could not launch app"
**Solution:**
1. On iPhone: Settings → General → VPN & Device Management
2. Trust your developer certificate
3. Try launching the app again

### 6.4 Build Fails with Pod Errors
**Solution:**
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

### 6.5 Web App Not Loading
**Solution:**
```bash
# Clean build
rm -rf dist
npm run build
npx cap sync ios
```

---

## Step 7: Development Workflow

### 7.1 Making Changes to Your App
1. **Edit your React code** in VS Code or your preferred editor
2. **Build and sync**:
   ```bash
   npm run build
   npx cap sync ios
   ```
3. **Press play in Xcode** to rebuild and install

### 7.2 Faster Development with Live Reload
```bash
# Start development server
npm run dev

# In another terminal, enable live reload
npx cap run ios --livereload --external
```

### 7.3 View Console Logs
- In Xcode: Window → Devices and Simulators
- Select your iPhone → View Device Logs
- Or use Safari Developer Tools for web console

---

## Step 8: Alternative Deployment Methods

### 8.1 TestFlight Distribution (for sharing with others)
1. **Archive your app**:
   - Xcode → Product → Archive
2. **Upload to App Store Connect**:
   - In Organizer → Distribute App → App Store Connect
3. **Add to TestFlight**:
   - Go to App Store Connect → My Apps → TestFlight
   - Add internal/external testers

### 8.2 Direct IPA Installation
```bash
# Build IPA file
./ios/install-on-device.sh

# Install using Apple Configurator 2 or 3uTools
# (Alternative to Xcode for mass deployment)
```

---

## Step 9: Verification Checklist

After successful installation, verify:

- [ ] **App appears** on iPhone home screen
- [ ] **App launches** without crashing  
- [ ] **Authentication works** (Supabase login)
- [ ] **Step tracking works** (if permissions granted)
- [ ] **Pull-to-refresh works**
- [ ] **All screens navigate** properly
- [ ] **Data persists** after closing/reopening app

---

## Step 10: Production Release (Optional)

### 10.1 App Store Submission
1. **Create App Store listing** in App Store Connect
2. **Update app icons** (required sizes in Assets.xcassets)
3. **Add privacy policy** and app description
4. **Archive and upload** final version
5. **Submit for review**

### 10.2 Enterprise Distribution
- Requires Apple Developer Enterprise Program ($299/year)
- Allows internal distribution without App Store

---

## Quick Reference Commands

```bash
# Complete fresh setup
./setup-ios-direct.sh

# Build and sync after code changes
npm run build && npx cap sync ios

# Open Xcode
npx cap open ios

# Install on device via command line
./ios/install-on-device.sh

# Check device status
xcrun devicectl list

# Clean everything and start over
rm -rf ios node_modules dist
npm install
./setup-ios-direct.sh
```

---

## Support

If you encounter issues:

1. **Check Xcode Console** for error messages
2. **Try cleaning build folder**: Xcode → Product → Clean Build Folder
3. **Restart Xcode and iPhone**
4. **Check iOS version compatibility** (iOS 13+ required)
5. **Verify Supabase configuration** in your app

---

## Success! 🎉

Once deployed, your workout tracker will have:
- ✅ Native iOS performance
- ✅ Step tracking with HealthKit
- ✅ Push notifications support
- ✅ Offline functionality
- ✅ iOS-native UI elements
- ✅ App Store ready (with proper assets)

Your app is now a real iOS application that can be used, shared, or even published! 📱