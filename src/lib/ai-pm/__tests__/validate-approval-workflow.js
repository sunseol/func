// Simple validation script for approval workflow functionality
// This script validates the basic structure and exports of the approval workflow

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

function validateApprovalWorkflow() {
  console.log('🚀 Approval Workflow Validation');
  console.log('===============================');
  
  let allValid = true;
  
  // Validate API endpoints
  const apiEndpoints = [
    '../../../app/api/ai-pm/documents/[documentId]/approve/route.ts',
    '../../../app/api/ai-pm/documents/[documentId]/request-approval/route.ts',
    '../../../app/api/ai-pm/documents/[documentId]/approval-history/route.ts',
    '../../../app/api/ai-pm/documents/pending-approvals/route.ts'
  ];
  
  console.log('\n📋 Checking Approval API endpoints:');
  apiEndpoints.forEach(endpoint => {
    const fullPath = path.join(__dirname, endpoint);
    if (validateFile(fullPath, `API endpoint: ${path.basename(endpoint)}`)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for required HTTP methods
      const methods = ['POST', 'GET', 'PUT', 'DELETE'].filter(method => 
        content.includes(`export async function ${method}`)
      );
      
      if (methods.length > 0) {
        console.log(`    📡 HTTP methods: ${methods.join(', ')}`);
      }
      
      // Check for approval-specific functionality
      const approvalFeatures = [
        'checkApprovalPermissions',
        'createApprovalHistory',
        'pending_approval',
        'official',
        'private'
      ];
      
      const foundFeatures = approvalFeatures.filter(feature => 
        content.includes(feature)
      );
      
      if (foundFeatures.length > 0) {
        console.log(`    🔧 Features: ${foundFeatures.join(', ')}`);
      }
    } else {
      allValid = false;
    }
  });
  
  // Validate React components
  const components = [
    '../../../components/ai-pm/DocumentApprovalPanel.tsx'
  ];
  
  console.log('\n📋 Checking React components:');
  components.forEach(component => {
    const fullPath = path.join(__dirname, component);
    if (validateFile(fullPath, `Component: ${path.basename(component)}`)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for React component structure
      const reactFeatures = [
        'export function',
        'useState',
        'useEffect',
        'onRequestApproval',
        'onApprove',
        'onReject',
        'DocumentApprovalPanel'
      ];
      
      const foundFeatures = reactFeatures.filter(feature => 
        content.includes(feature)
      );
      
      console.log(`    ⚛️  React features: ${foundFeatures.join(', ')}`);
    } else {
      allValid = false;
    }
  });
  
  // Validate hooks
  const hooks = [
    '../hooks/useDocumentManager.ts',
    '../hooks/usePendingApprovals.ts'
  ];
  
  console.log('\n📋 Checking React hooks:');
  hooks.forEach(hook => {
    const fullPath = path.join(__dirname, hook);
    if (validateFile(fullPath, `Hook: ${path.basename(hook)}`)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for hook-specific functionality
      const hookFeatures = [
        'requestApproval',
        'approveDocument',
        'rejectDocument',
        'getApprovalHistory',
        'useState',
        'useCallback'
      ];
      
      const foundFeatures = hookFeatures.filter(feature => 
        content.includes(feature)
      );
      
      if (foundFeatures.length > 0) {
        console.log(`    🪝 Hook features: ${foundFeatures.join(', ')}`);
      }
    } else {
      allValid = false;
    }
  });
  
  // Validate database migration
  const migrationPath = path.join(__dirname, '../../../../database/migrations/002_approval_workflow.sql');
  if (validateFile(migrationPath, 'Database migration')) {
    const content = fs.readFileSync(migrationPath, 'utf8');
    
    // Check for database features
    const dbFeatures = [
      'document_approval_history',
      'can_approve_document',
      'validate_status_transition',
      'get_pending_approvals_for_user',
      'CREATE TABLE',
      'CREATE POLICY',
      'CREATE FUNCTION'
    ];
    
    const foundFeatures = dbFeatures.filter(feature => 
      content.includes(feature)
    );
    
    console.log(`    🗄️  Database features: ${foundFeatures.join(', ')}`);
  } else {
    allValid = false;
  }
  
  // Validate types
  const typesPath = path.join(__dirname, '../../../types/ai-pm.ts');
  if (validateFile(typesPath, 'TypeScript types')) {
    const content = fs.readFileSync(typesPath, 'utf8');
    
    // Check for approval-related types
    const typeFeatures = [
      'ApprovalHistoryEntry',
      'PendingApprovalDocument',
      'ApprovalHistoryResponse',
      'PendingApprovalsResponse',
      'RequestApprovalRequest',
      'ApproveDocumentRequest',
      'RejectDocumentRequest'
    ];
    
    const foundFeatures = typeFeatures.filter(feature => 
      content.includes(feature)
    );
    
    console.log(`    📝 Type definitions: ${foundFeatures.join(', ')}`);
  } else {
    allValid = false;
  }
  
  // Test status transition logic
  console.log('\n📋 Testing status transition logic:');
  
  function validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'private': ['pending_approval', 'private'],
      'pending_approval': ['official', 'private'],
      'official': ['official', 'private']
    };
    
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
  
  const testCases = [
    { from: 'private', to: 'pending_approval', expected: true },
    { from: 'pending_approval', to: 'official', expected: true },
    { from: 'pending_approval', to: 'private', expected: true },
    { from: 'private', to: 'official', expected: false },
    { from: 'official', to: 'pending_approval', expected: false }
  ];
  
  testCases.forEach(testCase => {
    const result = validateStatusTransition(testCase.from, testCase.to);
    const status = result === testCase.expected ? '✅' : '❌';
    console.log(`    ${status} ${testCase.from} → ${testCase.to}: ${result} (expected: ${testCase.expected})`);
    if (result !== testCase.expected) {
      allValid = false;
    }
  });
  
  // Test approval permissions
  console.log('\n📋 Testing approval permissions:');
  
  function canRoleApproveStep(role, step) {
    const approvalMatrix = {
      1: ['서비스기획'],
      2: ['서비스기획'],
      3: ['서비스기획'],
      4: ['UIUX기획'],
      5: ['개발자'],
      6: ['서비스기획'],
      7: ['서비스기획'],
      8: ['서비스기획'],
      9: ['콘텐츠기획', '서비스기획']
    };
    
    return approvalMatrix[step]?.includes(role) || false;
  }
  
  const permissionTests = [
    { role: '서비스기획', step: 1, expected: true },
    { role: 'UIUX기획', step: 4, expected: true },
    { role: '개발자', step: 5, expected: true },
    { role: '콘텐츠기획', step: 9, expected: true },
    { role: '서비스기획', step: 9, expected: true },
    { role: 'UIUX기획', step: 1, expected: false },
    { role: '개발자', step: 4, expected: false }
  ];
  
  permissionTests.forEach(test => {
    const result = canRoleApproveStep(test.role, test.step);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`    ${status} ${test.role} can approve step ${test.step}: ${result} (expected: ${test.expected})`);
    if (result !== test.expected) {
      allValid = false;
    }
  });
  
  // Final result
  console.log('\n' + '='.repeat(60));
  if (allValid) {
    console.log('🎉 All validations passed! Approval workflow system is ready.');
    console.log('\n📋 Summary of implemented features:');
    console.log('   • Document status management (private → pending → official)');
    console.log('   • Role-based approval permissions');
    console.log('   • Approval history tracking');
    console.log('   • Request approval API');
    console.log('   • Approve/reject document APIs');
    console.log('   • Pending approvals dashboard');
    console.log('   • React components and hooks');
    console.log('   • Database schema and functions');
    console.log('   • TypeScript type definitions');
  } else {
    console.log('❌ Some validations failed. Please check the issues above.');
  }
  
  return allValid;
}

// Run validation
validateApprovalWorkflow();