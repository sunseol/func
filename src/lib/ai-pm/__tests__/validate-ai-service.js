// Simple validation script for AI service functionality
// This script validates the basic structure and exports of the AI service

const fs = require('fs');
const path = require('path');

function validateFile(filePath, description) {
  console.log(`\n🔍 Validating ${description}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`✅ File exists: ${path.basename(filePath)} (${content.length} characters)`);
  return true;
}

function validateAIService() {
  console.log('🚀 AI Service Validation');
  console.log('========================');
  
  const aiServicePath = path.join(__dirname, '../ai-service.ts');
  const conversationManagerPath = path.join(__dirname, '../conversation-manager.ts');
  
  let allValid = true;
  
  // Validate AI Service file
  if (!validateFile(aiServicePath, 'AI Service')) {
    allValid = false;
  } else {
    const content = fs.readFileSync(aiServicePath, 'utf8');
    
    // Check for key exports
    const requiredExports = [
      'export class AIService',
      'export function getAIService',
      'export function createAIService',
      'generateResponse',
      'generateStreamingResponse',
      'generateDocument',
      'analyzeConflicts'
    ];
    
    console.log('\n📋 Checking AI Service exports:');
    requiredExports.forEach(exportName => {
      if (content.includes(exportName)) {
        console.log(`  ✅ ${exportName}`);
      } else {
        console.log(`  ❌ Missing: ${exportName}`);
        allValid = false;
      }
    });
    
    // Check for workflow prompts
    if (content.includes('WORKFLOW_PROMPTS')) {
      console.log('  ✅ WORKFLOW_PROMPTS defined');
    } else {
      console.log('  ❌ Missing: WORKFLOW_PROMPTS');
      allValid = false;
    }
  }
  
  // Validate Conversation Manager file
  if (!validateFile(conversationManagerPath, 'Conversation Manager')) {
    allValid = false;
  } else {
    const content = fs.readFileSync(conversationManagerPath, 'utf8');
    
    // Check for key exports
    const requiredExports = [
      'export class ConversationManager',
      'export function getConversationManager',
      'export function createConversationManager',
      'loadConversation',
      'saveConversation',
      'addMessage',
      'getCurrentMessages'
    ];
    
    console.log('\n📋 Checking Conversation Manager exports:');
    requiredExports.forEach(exportName => {
      if (content.includes(exportName)) {
        console.log(`  ✅ ${exportName}`);
      } else {
        console.log(`  ❌ Missing: ${exportName}`);
        allValid = false;
      }
    });
  }
  
  // Validate API endpoints
  const apiEndpoints = [
    '../../../app/api/ai-pm/chat/route.ts',
    '../../../app/api/ai-pm/chat/stream/route.ts',
    '../../../app/api/ai-pm/documents/generate/route.ts',
    '../../../app/api/ai-pm/documents/analyze-conflicts/route.ts'
  ];
  
  console.log('\n📋 Checking API endpoints:');
  apiEndpoints.forEach(endpoint => {
    const fullPath = path.join(__dirname, endpoint);
    if (validateFile(fullPath, `API endpoint: ${path.basename(endpoint)}`)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for required HTTP methods
      const methods = ['POST', 'GET', 'DELETE'].filter(method => 
        content.includes(`export async function ${method}`)
      );
      
      if (methods.length > 0) {
        console.log(`    📡 HTTP methods: ${methods.join(', ')}`);
      }
    } else {
      allValid = false;
    }
  });
  
  // Final result
  console.log('\n' + '='.repeat(50));
  if (allValid) {
    console.log('🎉 All validations passed! AI conversation system is ready.');
  } else {
    console.log('❌ Some validations failed. Please check the issues above.');
  }
  
  return allValid;
}

// Run validation
validateAIService();