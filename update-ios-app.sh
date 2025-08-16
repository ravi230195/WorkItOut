#!/bin/bash

echo "🔄 Updating iOS App with Latest Changes"
echo "======================================="

# Check if iOS project exists
if [[ ! -d "ios" ]]; then
    echo "❌ iOS project not found. Run ./deploy-ios.sh first."
    exit 1
fi

echo "📦 Building web assets..."
npm run build

if [[ $? -eq 0 ]]; then
    echo "✅ Web build successful"
else
    echo "❌ Web build failed"
    exit 1
fi

echo "🔄 Syncing changes to iOS..."
npx cap sync ios

if [[ $? -eq 0 ]]; then
    echo "✅ iOS sync successful"
else
    echo "❌ iOS sync failed"
    exit 1
fi

echo ""
echo "🎉 Update complete!"
echo ""
echo "Next steps:"
echo "1. In Xcode, press the ▶️ Play button to rebuild"
echo "2. The updated app will install on your iPhone"
echo ""
echo "💡 Tip: Keep this terminal open and run this script"
echo "   each time you make changes to your React code!"