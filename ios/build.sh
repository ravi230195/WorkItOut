#!/bin/bash

echo "🏋️ Building Workout Tracker for iOS"
echo "=================================="

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: iOS builds require macOS"
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: Xcode is not installed"
    echo "Please install Xcode from the Mac App Store"
    exit 1
fi

# Navigate to root directory
cd "$(dirname "$0")/.."

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building web app..."
npm run build

echo "⚡ Installing Capacitor..."
npm install -g @capacitor/cli

echo "🔄 Syncing with iOS..."
npx cap sync ios

echo "🍎 Opening Xcode..."
npx cap open ios

echo ""
echo "✅ Setup complete!"
echo ""
echo "In Xcode:"
echo "1. Select your development team in Signing & Capabilities"
echo "2. Connect your iPhone via USB"
echo "3. Select your device in the toolbar"
echo "4. Click the Play button to build and run"
echo ""
echo "📱 Your workout tracker will install on your iPhone!"