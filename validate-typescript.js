const fs = require('fs');
const path = require('path');

// Simple TypeScript syntax validation
function validateTypeScriptFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax checks
    const issues = [];
    
    // Check for unmatched brackets
    const openBrackets = (content.match(/\{/g) || []).length;
    const closeBrackets = (content.match(/\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push(`Unmatched brackets: ${openBrackets} open, ${closeBrackets} close`);
    }
    
    // Check for unmatched parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
    }
    
    // Check for basic import/export syntax
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
    const exportLines = content.split('\n').filter(line => line.trim().startsWith('export'));
    
    console.log(`✓ ${filePath}: ${importLines.length} imports, ${exportLines.length} exports`);
    
    if (issues.length > 0) {
      console.log(`  Issues: ${issues.join(', ')}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.log(`✗ ${filePath}: ${error.message}`);
    return false;
  }
}

// Validate all TypeScript files we created
const filesToValidate = [
  'src/app/api/ai-pm/documents/route.ts',
  'src/app/api/ai-pm/documents/[documentId]/route.ts',
  'src/components/ai-pm/DocumentEditor.tsx',
  'src/components/ai-pm/DocumentManager.tsx',
  'src/components/ai-pm/DocumentWorkspace.tsx',
  'src/lib/ai-pm/document-sync.ts',
  'src/lib/ai-pm/hooks/useDocumentManager.ts'
];

console.log('Validating TypeScript files...\n');

let allValid = true;
filesToValidate.forEach(file => {
  if (fs.existsSync(file)) {
    const isValid = validateTypeScriptFile(file);
    allValid = allValid && isValid;
  } else {
    console.log(`✗ ${file}: File not found`);
    allValid = false;
  }
});

console.log(`\n${allValid ? '✓ All files validated successfully' : '✗ Some files have issues'}`);
process.exit(allValid ? 0 : 1);