#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Fixing Import Issues${NC}"
echo "======================="

echo -e "${BLUE}🔍 Searching for versioned imports...${NC}"

# Search for any remaining versioned imports
versioned_imports=$(grep -r "from.*@[0-9]" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=ios 2>/dev/null || true)

if [ -n "$versioned_imports" ]; then
    echo -e "${YELLOW}❌ Found versioned imports:${NC}"
    echo "$versioned_imports"
    echo ""
    echo -e "${BLUE}🔧 Auto-fixing all versioned imports...${NC}"
    
    # Fix ALL versioned imports aggressively - handle different sed syntax on macOS vs Linux
    echo -e "${BLUE}Fixing all types of versioned imports...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - Fix import statements with versions
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i '' 's/from "\([^@"]*\)@[0-9][^"]*"/from "\1"/g' 2>/dev/null || true
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i '' 's/import.*from.*".*@[0-9][^"]*"/& /g' 2>/dev/null || true
        # Fix specific problematic patterns
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i '' 's/@radix-ui\/react-[a-z-]*@[0-9][^"]*/@radix-ui\/react-\1/g' 2>/dev/null || true
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i '' 's/lucide-react@[0-9][^"]*/lucide-react/g' 2>/dev/null || true
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i '' 's/class-variance-authority@[0-9][^"]*/class-variance-authority/g' 2>/dev/null || true
        # Another pass for any remaining patterns
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i '' 's/"\([^@"]*\)@[0-9][^"]*"/"\1"/g' 2>/dev/null || true
    else
        # Linux - Fix import statements with versions
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i 's/from "\([^@"]*\)@[0-9][^"]*"/from "\1"/g' 2>/dev/null || true
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i 's/import.*from.*".*@[0-9][^"]*"/& /g' 2>/dev/null || true
        # Fix specific problematic patterns
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i 's/@radix-ui\/react-\([a-z-]*\)@[0-9][^"]*/@radix-ui\/react-\1/g' 2>/dev/null || true
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i 's/lucide-react@[0-9][^"]*/lucide-react/g' 2>/dev/null || true
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i 's/class-variance-authority@[0-9][^"]*/class-variance-authority/g' 2>/dev/null || true
        # Another pass for any remaining patterns
        find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v ios | xargs sed -i 's/"\([^@"]*\)@[0-9][^"]*"/"\1"/g' 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Fixed all versioned imports${NC}"
else
    echo -e "${GREEN}✅ No versioned imports found${NC}"
fi

echo ""
echo -e "${BLUE}🔍 Double-checking for any remaining issues...${NC}"
remaining_imports=$(grep -r "from.*@[0-9]" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=ios 2>/dev/null || true)

if [ -n "$remaining_imports" ]; then
    echo -e "${YELLOW}⚠️  Still found some versioned imports that need manual fixing:${NC}"
    echo "$remaining_imports"
else
    echo -e "${GREEN}✅ All versioned imports have been fixed${NC}"
fi

echo ""
echo ""
echo -e "${BLUE}📦 Installing dependencies (in case they're missing)...${NC}"
npm install @radix-ui/react-slot @radix-ui/react-dialog lucide-react class-variance-authority --save

echo ""
echo -e "${BLUE}🏗️ Testing build...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Build successful! Ready for iOS deployment.${NC}"
    echo ""
    echo -e "${BLUE}📱 Next steps:${NC}"
    echo "• Run: ./complete-ios-deployment.sh"
    echo "• Or: ./deploy-ios.sh"
    echo ""
    
    # Show build output info
    if [ -d "dist" ]; then
        echo -e "${GREEN}📊 Build output:${NC}"
        du -sh dist 2>/dev/null || true
        echo "Files created: $(find dist -type f 2>/dev/null | wc -l)"
    fi
else
    echo ""
    echo -e "${RED}❌ Build still failing. Let me check what's left...${NC}"
    echo ""
    echo -e "${YELLOW}🔍 Remaining versioned imports:${NC}"
    grep -r "from.*@[0-9]" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=ios 2>/dev/null || echo "None found"
    echo ""
    echo -e "${YELLOW}💡 If build still fails, manually check the files above.${NC}"
fi