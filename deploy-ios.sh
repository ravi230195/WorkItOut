#!/bin/bash

echo "🏋️‍♀️ Workout Tracker - Quick iOS Deployment"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ Error: iOS deployment requires macOS${NC}"
    exit 1
fi

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Xcode not found${NC}"
    echo -e "${BLUE}📲 Install from: https://apps.apple.com/app/xcode/id497799835${NC}"
    exit 1
fi

echo -e "${GREEN}✅ macOS + Xcode detected${NC}"

# Function to check if iPhone is connected
check_device() {
    local devices=$(xcrun devicectl list | grep "iPhone" | grep -v "Simulator")
    if [[ -n "$devices" ]]; then
        echo -e "${GREEN}📱 iPhone detected${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  No iPhone detected${NC}"
        echo -e "${BLUE}💡 Connect your iPhone via USB and trust the computer${NC}"
        return 1
    fi
}

# Step 1: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install || {
    echo -e "${RED}❌ Failed to install npm dependencies${NC}"
    exit 1
}

# Step 2: Install Capacitor CLI
echo -e "${BLUE}⚡ Installing Capacitor CLI...${NC}"
npm install -g @capacitor/cli

# Step 3: Initialize if not already done
if [[ ! -d "ios" ]]; then
    echo -e "${BLUE}🔧 Initializing Capacitor...${NC}"
    npx cap init "Workout Tracker" "com.workouttracker.app"
    npx cap add ios
fi

# Step 4: Build web assets
echo -e "${BLUE}🏗️  Building web application...${NC}"
npm run build || {
    echo -e "${RED}❌ Web build failed${NC}"
    exit 1
}

# Step 5: Sync with iOS
echo -e "${BLUE}🔄 Syncing with iOS project...${NC}"
npx cap sync ios || {
    echo -e "${RED}❌ iOS sync failed${NC}"
    exit 1
}

# Step 6: Check for connected device
check_device
device_connected=$?

# Step 7: Open Xcode
echo -e "${BLUE}🍎 Opening Xcode...${NC}"
npx cap open ios &

# Give Xcode time to open
sleep 3

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps in Xcode:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━"

if [[ $device_connected -eq 0 ]]; then
    echo -e "${GREEN}✅ iPhone detected - Ready to deploy!${NC}"
    echo ""
    echo "1. In Xcode toolbar, select your iPhone from device dropdown"
    echo "2. Click the ▶️ Play button to build and install"
    echo "3. On iPhone: Settings → General → VPN & Device Management"
    echo "4. Trust your developer certificate"
    echo "5. Open the Workout Tracker app!"
else
    echo -e "${YELLOW}⚠️  Connect your iPhone first:${NC}"
    echo ""
    echo "1. Connect iPhone via USB cable"
    echo "2. Trust the computer when prompted on iPhone"
    echo "3. In Xcode: Select your iPhone from device dropdown"
    echo "4. Click ▶️ Play button"
fi

echo ""
echo -e "${BLUE}💡 Troubleshooting tips:${NC}"
echo "• If build fails: Check Bundle Identifier in Signing & Capabilities"
echo "• If app won't launch: Trust developer certificate in iPhone Settings"
echo "• For changes: npm run build → npx cap sync ios → Press play in Xcode"

echo ""
echo -e "${GREEN}📖 Full guide available in: DEPLOYMENT_GUIDE.md${NC}"

# Ask if user wants to rebuild after changes
echo ""
read -p "🔄 Set up automatic rebuild script for development? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat > rebuild-and-sync.sh << 'EOF'
#!/bin/bash
echo "🔄 Rebuilding and syncing..."
npm run build && npx cap sync ios
echo "✅ Ready! Press play in Xcode to install updates."
EOF
    chmod +x rebuild-and-sync.sh
    echo -e "${GREEN}✅ Created rebuild-and-sync.sh for quick updates${NC}"
fi

echo ""
echo -e "${GREEN}🚀 Happy coding! Your workout tracker is ready to deploy!${NC}"