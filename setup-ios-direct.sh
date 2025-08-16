#!/bin/bash

echo "🏋️‍♀️ Workout Tracker - Direct iOS Setup"
echo "========================================"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script requires macOS to build iOS apps"
    echo "💡 For other platforms:"
    echo "   • Android: Run './setup-mobile.sh' and use Android Studio"  
    echo "   • Web PWA: Deploy to web and install from browser"
    exit 1
fi

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode not found"
    echo "📲 Please install Xcode from the Mac App Store first"
    echo "🔗 https://apps.apple.com/app/xcode/id497799835"
    exit 1
fi

echo "✅ macOS + Xcode detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Capacitor globally
echo "⚡ Setting up Capacitor..."
npm install -g @capacitor/cli

# Initialize Capacitor
echo "🔧 Initializing iOS project..."
npx cap init "Workout Tracker" "com.workouttracker.app"

# Add iOS platform
echo "🍎 Adding iOS platform..."
npx cap add ios

# Build web assets
echo "🏗️ Building web application..."
npm run build

# Sync with iOS
echo "🔄 Syncing with iOS project..."
npx cap sync ios

# Set permissions for scripts
chmod +x ios/*.sh

echo ""
echo "🎉 iOS project setup complete!"
echo ""
echo "📱 To install on your iPhone:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. ./ios/build.sh                    (Opens Xcode)"
echo "2. Connect iPhone via USB cable"
echo "3. Trust computer on iPhone"  
echo "4. In Xcode: Select your iPhone from device list"
echo "5. Click ▶️ Play button to build & install"
echo ""
echo "🔧 Alternative installation methods:"
echo "• Quick device install: ./ios/install-on-device.sh"
echo "• Manual Xcode: npx cap open ios"
echo ""
echo "💡 First time setup in Xcode:"
echo "• Add your Apple ID in Xcode → Preferences → Accounts"
echo "• Select your development team in project settings"
echo "• Enable 'Automatically manage signing'"

# Ask if user wants to open Xcode immediately
echo ""
read -p "🚀 Open Xcode now? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📱 Opening Xcode..."
    npx cap open ios
    echo ""
    echo "✨ Ready to build! Connect your iPhone and click ▶️ in Xcode"
fi