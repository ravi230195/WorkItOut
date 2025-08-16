#!/bin/bash

echo "🧪 Testing Build for Import Issues"
echo "=================================="

# Add colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🔍 Checking for versioned imports first...${NC}"
versioned_imports=$(grep -r "from.*@[0-9]" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=ios 2>/dev/null || true)

if [ -n "$versioned_imports" ]; then
    echo -e "${YELLOW}⚠️  Found versioned imports that need to be fixed:${NC}"
    echo "$versioned_imports"
    echo ""
    echo -e "${BLUE}🔧 Auto-fixing imports...${NC}"
    
    # Auto-fix imports inline
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i '' 's/from "\([^@"]*\)@[0-9][^"]*"/from "\1"/g' 2>/dev/null || true
    else
        # Linux
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i 's/from "\([^@"]*\)@[0-9][^"]*"/from "\1"/g' 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Auto-fixed versioned imports${NC}"
else
    echo -e "${GREEN}✅ No versioned imports found${NC}"
fi

echo -e "${BLUE}🏗️ Testing build...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Build successful! All import issues resolved.${NC}"
    echo ""
    echo -e "${BLUE}📱 Ready for iOS deployment:${NC}"
    echo "• Run: ./complete-ios-deployment.sh"
    echo "• Or: ./deploy-ios.sh"
    echo ""
    
    # Show build output info
    if [ -d "dist" ]; then
        echo -e "${GREEN}📊 Build output:${NC}"
        du -sh dist
        echo "Files created: $(find dist -type f | wc -l)"
    fi
else
    echo ""
    echo -e "${RED}❌ Build failed. Check the errors above.${NC}"
    echo ""
    echo -e "${YELLOW}💡 Try running:${NC}"
    echo "• ./fix-imports.sh (to fix import issues)"
    echo "• npm install (to reinstall dependencies)"
    echo "• npm run build (to test build again)"
fi