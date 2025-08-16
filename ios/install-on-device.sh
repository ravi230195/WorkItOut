#!/bin/bash

echo "📱 Installing Workout Tracker on iOS Device"
echo "==========================================="

# Function to show device selection
select_device() {
    echo "Available iOS devices:"
    xcrun devicectl list
    echo ""
    read -p "Enter your device UDID (or press Enter for Simulator): " DEVICE_UDID
    
    if [ -z "$DEVICE_UDID" ]; then
        echo "📱 Using iOS Simulator"
        DESTINATION="platform=iOS Simulator,name=iPhone 14"
    else
        echo "📱 Using device: $DEVICE_UDID"
        DESTINATION="platform=iOS,id=$DEVICE_UDID"
    fi
}

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: iOS builds require macOS"
    exit 1
fi

# Navigate to root directory
cd "$(dirname "$0")/.."

echo "📦 Building web assets..."
npm run build

echo "🔄 Syncing with iOS..."
npx cap sync ios

echo "🏗️ Building iOS app..."
cd ios/App

# Select device
select_device

# Build and install
echo "🚀 Building and installing on device..."
xcodebuild -workspace App.xcworkspace -scheme App -destination "$DESTINATION" -derivedDataPath build clean build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    
    if [ ! -z "$DEVICE_UDID" ]; then
        # Install on physical device
        echo "📲 Installing on device..."
        
        # Find the .app file
        APP_PATH=$(find build -name "*.app" | head -1)
        
        if [ ! -z "$APP_PATH" ]; then
            xcrun devicectl device install app --device "$DEVICE_UDID" "$APP_PATH"
            echo "✅ App installed successfully!"
            echo "🎉 Check your device for the Workout Tracker app"
        else
            echo "❌ Could not find built app"
        fi
    else
        echo "✅ App is running in iOS Simulator"
    fi
else
    echo "❌ Build failed"
    exit 1
fi