#!/bin/bash

echo "🏋️ Setting up Workout Tracker for Mobile Development"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "⚡ Installing Capacitor CLI..."
npm install -g @capacitor/cli

echo "🔧 Initializing Capacitor..."
npx cap init "Workout Tracker" "com.workouttracker.app"

echo "📱 Adding mobile platforms..."

# Check if we're on macOS (for iOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Adding iOS platform..."
    npx cap add ios
else
    echo "ℹ️  Skipping iOS platform (macOS required)"
fi

echo "🤖 Adding Android platform..."
npx cap add android

echo "🏗️  Building web app..."
npm run build

echo "🔄 Syncing with mobile platforms..."
npx cap sync

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. For iOS: npm run ios:dev (requires macOS + Xcode)"
echo "2. For Android: npm run android:dev (requires Android Studio)"
echo ""
echo "📖 See MOBILE_BUILD_GUIDE.md for detailed instructions"