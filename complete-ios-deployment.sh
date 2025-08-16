#!/bin/bash

# Complete iOS Deployment Script with Error Handling
echo "🏋️‍♀️ Workout Tracker - Complete iOS Deployment"
echo "==============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Error handling
set -e
trap 'echo -e "${RED}❌ Deployment failed at step: $BASH_COMMAND${NC}"; echo -e "${YELLOW}💡 Try running ./fix-imports.sh first${NC}"' ERR

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    
    # Check macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        error "iOS deployment requires macOS"
        exit 1
    fi
    success "macOS detected"
    
    # Check Xcode
    if ! command -v xcodebuild &> /dev/null; then
        error "Xcode not installed"
        echo -e "${BLUE}Install from: https://apps.apple.com/app/xcode/id497799835${NC}"
        exit 1
    fi
    success "Xcode found"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js not found"
        exit 1
    fi
    success "Node.js found ($(node --version))"
    
    # Check for package.json
    if [[ ! -f "package.json" ]]; then
        error "package.json not found. Are you in the project root?"
        exit 1
    fi
    success "Project structure verified"
    
    # Check for versioned imports
    log "Checking for import issues..."
    local versioned_imports=$(grep -r "from.*@[0-9]" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=ios 2>/dev/null || true)
    
    if [[ -n "$versioned_imports" ]]; then
        warning "Found versioned imports that need fixing:"
        echo "$versioned_imports"
        log "Auto-fixing imports..."
        
        # Auto-fix imports
        log "Auto-fixing versioned imports..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i '' 's/from "\([^@"]*\)@[0-9][^"]*"/from "\1"/g' 2>/dev/null || true
        else
            find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i 's/from "\([^@"]*\)@[0-9][^"]*"/from "\1"/g' 2>/dev/null || true
        fi
        
        success "Import issues auto-fixed"
    else
        success "No import issues found"
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # NPM install
    npm install
    success "NPM dependencies installed"
    
    # Global Capacitor CLI
    if ! command -v cap &> /dev/null; then
        npm install -g @capacitor/cli
        success "Capacitor CLI installed globally"
    else
        success "Capacitor CLI already available"
    fi
}

# Setup iOS project
setup_ios_project() {
    log "Setting up iOS project..."
    
    # Initialize Capacitor if needed
    if [[ ! -f "capacitor.config.ts" ]] && [[ ! -f "capacitor.config.js" ]]; then
        npx cap init "Workout Tracker" "com.workouttracker.app"
        success "Capacitor initialized"
    else
        success "Capacitor already initialized"
    fi
    
    # Add iOS platform if needed
    if [[ ! -d "ios" ]]; then
        npx cap add ios
        success "iOS platform added"
    else
        success "iOS platform already exists"
    fi
}

# Build and sync
build_and_sync() {
    log "Building web application..."
    npm run build
    success "Web build completed"
    
    log "Syncing with iOS project..."
    npx cap sync ios
    success "iOS sync completed"
    
    # Install CocoaPods dependencies
    if [[ -f "ios/App/Podfile" ]]; then
        log "Installing CocoaPods dependencies..."
        cd ios/App
        pod install --repo-update
        cd ../..
        success "CocoaPods dependencies installed"
    fi
}

# Check for connected devices
check_devices() {
    log "Checking for connected devices..."
    
    # List all devices
    local devices=$(xcrun devicectl list 2>/dev/null | grep "iPhone" | grep -v "Simulator" || true)
    
    if [[ -n "$devices" ]]; then
        success "iPhone(s) detected:"
        echo "$devices" | while read -r line; do
            echo -e "${PURPLE}  📱 $line${NC}"
        done
        return 0
    else
        warning "No iPhone detected"
        echo -e "${BLUE}💡 Connect your iPhone via USB and trust this computer${NC}"
        return 1
    fi
}

# Open development environment
open_xcode() {
    log "Opening Xcode..."
    npx cap open ios &
    
    # Wait a moment for Xcode to start
    sleep 2
    success "Xcode opening..."
}

# Deployment instructions
show_instructions() {
    local device_connected=$1
    
    echo ""
    echo -e "${GREEN}🎉 Deployment Setup Complete!${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo ""
    
    if [[ $device_connected -eq 0 ]]; then
        echo -e "${GREEN}✅ iPhone detected - Ready for installation!${NC}"
        echo ""
        echo -e "${YELLOW}Final steps in Xcode:${NC}"
        echo "1. 📱 Select your iPhone from the device dropdown"
        echo "2. ▶️  Click the Play button to build and install"
        echo "3. ⏳ Wait for build to complete (2-5 minutes first time)"
        echo "4. 📲 On iPhone: Settings → General → VPN & Device Management"
        echo "5. 🔐 Trust your developer certificate"
        echo "6. 🚀 Launch Workout Tracker app!"
    else
        echo -e "${YELLOW}📱 Connect your iPhone:${NC}"
        echo "1. Connect iPhone via USB cable"
        echo "2. Tap 'Trust' on iPhone when prompted"
        echo "3. In Xcode: Select your iPhone from device dropdown"
        echo "4. Click ▶️ Play button"
    fi
    
    echo ""
    echo -e "${BLUE}🛠️  Development workflow:${NC}"
    echo "• After making React changes: ./update-ios-app.sh"
    echo "• Or manually: npm run build → npx cap sync ios → Press play"
    echo ""
    echo -e "${BLUE}📋 Troubleshooting:${NC}"
    echo "• Build errors: Check Bundle Identifier in Xcode signing settings"
    echo "• App won't launch: Trust developer certificate in iPhone Settings"
    echo "• Xcode issues: Product → Clean Build Folder, then rebuild"
    echo ""
    echo -e "${GREEN}📖 Full documentation: DEPLOYMENT_GUIDE.md${NC}"
}

# Create helper scripts
create_helper_scripts() {
    log "Creating helper scripts..."
    
    # Update script
    if [[ ! -f "update-ios-app.sh" ]]; then
        chmod +x update-ios-app.sh
    fi
    
    # Deploy script
    if [[ ! -f "deploy-ios.sh" ]]; then
        chmod +x deploy-ios.sh
    fi
    
    success "Helper scripts ready"
}

# Main execution
main() {
    echo -e "${PURPLE}Starting complete iOS deployment process...${NC}"
    echo ""
    
    preflight_checks
    install_dependencies
    setup_ios_project
    build_and_sync
    create_helper_scripts
    
    local device_status
    check_devices
    device_status=$?
    
    open_xcode
    show_instructions $device_status
    
    echo ""
    echo -e "${GREEN}🚀 Ready to deploy! Good luck!${NC}"
}

# Run main function
main "$@"