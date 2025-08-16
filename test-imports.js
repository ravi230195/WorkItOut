#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function scanForVersionedImports(dir) {
  const results = [];
  
  function scanDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      // Skip node_modules, dist, ios directories
      if (stat.isDirectory()) {
        if (['node_modules', 'dist', 'ios', '.git'].includes(item)) {
          continue;
        }
        scanDirectory(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, lineNum) => {
          // Look for versioned imports (e.g., from "package@1.2.3")
          const versionedImportMatch = line.match(/from\s+["']([^"']*@[0-9][^"']*)/);
          if (versionedImportMatch) {
            results.push({
              file: fullPath,
              line: lineNum + 1,
              content: line.trim(),
              package: versionedImportMatch[1]
            });
          }
        });
      }
    }
  }
  
  scanDirectory(dir);
  return results;
}

console.log('🔍 Scanning for remaining versioned imports...\n');

const results = scanForVersionedImports('.');

if (results.length === 0) {
  console.log('✅ No versioned imports found! Build should work now.\n');
} else {
  console.log(`❌ Found ${results.length} versioned imports that need fixing:\n`);
  
  results.forEach(result => {
    console.log(`📁 ${result.file}:${result.line}`);
    console.log(`   ${result.content}`);
    console.log(`   Package: ${result.package}\n`);
  });
  
  console.log('\n💡 These imports need to be fixed by removing the version numbers.');
}

console.log('\n📦 Recommended next steps:');
console.log('1. npm install  # Install dependencies');
console.log('2. npm run build  # Test build');
console.log('3. ./deploy-ios.sh  # Deploy to iOS if build succeeds');