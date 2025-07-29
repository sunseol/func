# AI PM E2E Tests

This directory contains end-to-end tests for the AI PM feature using Playwright.

## Test Structure

### Test Files

- `ai-pm-complete-workflow.spec.ts` - Complete workflow from project creation to document approval
- `ai-pm-collaboration.spec.ts` - Multi-user collaboration scenarios
- `ai-pm-access-control.spec.ts` - Permission and access control tests
- `ai-pm-ai-integration.spec.ts` - AI functionality integration tests

### Utilities

- `utils/test-helpers.ts` - Common test helper functions and utilities
- `setup/test-setup.ts` - Database setup and cleanup functions

## Running Tests

### Prerequisites

1. Ensure the development server is running or configure the webServer in `playwright.config.ts`
2. Set up environment variables for test database and API keys
3. Install Playwright browsers: `npx playwright install`

### Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Run specific test file
npx playwright test ai-pm-complete-workflow.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Scenarios Covered

### 1. Complete Workflow Tests (`ai-pm-complete-workflow.spec.ts`)

- **Project Creation to Document Approval**: Full workflow from admin creating a project, adding members, working through workflow steps, AI interaction, document generation, and approval process
- **AI Functionality Integration**: Testing AI chat, document generation, and conflict detection
- **Document Approval Edge Cases**: Testing private documents, approval workflows, and access restrictions

### 2. Multi-User Collaboration (`ai-pm-collaboration.spec.ts`)

- **Multi-User Workflow**: Multiple users working simultaneously on different workflow steps
- **Concurrent Document Editing**: Testing document locking and conflict resolution
- **Project Member Management**: Adding/removing members and role changes
- **Real-time Collaboration**: Activity tracking and notifications

### 3. Access Control (`ai-pm-access-control.spec.ts`)

- **Admin Access Control**: Full admin permissions and project management
- **Regular User Access**: Limited user permissions and project visibility
- **Non-Member Access Denial**: Ensuring non-members cannot access projects
- **Role-Based Document Access**: Testing document visibility based on user roles
- **Session Management**: Login/logout and session security
- **API Endpoint Security**: Testing API access control
- **Document Version Access**: Version history permissions
- **Bulk Operations**: Mass member management operations

### 4. AI Integration (`ai-pm-ai-integration.spec.ts`)

- **AI Chat and Document Generation**: Complete AI interaction workflow
- **AI Conflict Detection**: Testing conflict analysis between documents
- **AI Streaming Response**: Testing real-time AI response streaming
- **AI Error Handling**: Network errors, timeouts, and recovery
- **AI Context Awareness**: Testing AI memory across workflow steps
- **AI Prompt Customization**: Different prompts for different workflow steps
- **Conversation Persistence**: Chat history preservation
- **Content Quality Validation**: Ensuring AI-generated content meets requirements

## Test Data Management

### Test Users

The tests use predefined test users with different roles:

- `admin@test.com` - Administrator with full permissions
- `planner1@test.com` - Content planner
- `planner2@test.com` - Service planner  
- `designer@test.com` - UI/UX designer

### Database Setup

- Test users are automatically created before tests run
- Test data is cleaned up after each test to ensure isolation
- Projects, documents, and conversations are created as needed per test

## Environment Variables

Required environment variables for E2E tests:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/funcommute_test

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Service
GROQ_API_KEY=your_groq_api_key
```

## Test Data Attributes

The tests rely on specific `data-testid` attributes in the UI components:

### Project Management
- `create-project-button`
- `project-name-input`
- `project-description-input`
- `save-project-button`
- `add-member-button`
- `member-email-input`
- `member-role-select`

### Workflow
- `workflow-step-{number}`
- `document-editor`
- `ai-chat-input`
- `send-message-button`
- `generate-document-button`
- `request-approval-button`
- `approve-document-button`

### AI Features
- `ai-chat-panel`
- `ai-response`
- `ai-typing-indicator`
- `check-conflicts-button`
- `conflict-analysis-panel`

### Status and Feedback
- `document-status`
- `save-status`
- `toast-message`
- `access-denied`

## CI/CD Integration

The tests are configured to run in GitHub Actions:

- Runs on push to main/develop branches
- Runs on pull requests to main
- Uses PostgreSQL service for database
- Uploads test reports as artifacts
- Configurable timeout and retry settings

## Debugging Tests

### Local Debugging

1. Run tests in headed mode: `npm run test:e2e:headed`
2. Use debug mode: `npm run test:e2e:debug`
3. Add `await page.pause()` in test code for breakpoints
4. Use browser developer tools during test execution

### CI Debugging

1. Check uploaded Playwright reports in GitHub Actions artifacts
2. Review test screenshots and videos for failed tests
3. Check console logs and network requests in test reports

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Data Cleanup**: Always clean up test data after tests complete
3. **Explicit Waits**: Use proper wait conditions instead of fixed timeouts
4. **Error Handling**: Test both success and failure scenarios
5. **Realistic Data**: Use realistic test data that matches production scenarios
6. **Performance**: Keep tests focused and avoid unnecessary operations

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout values for slow operations like AI responses
2. **Database Connection**: Ensure test database is accessible and properly configured
3. **Missing Test IDs**: Verify all required `data-testid` attributes are present in components
4. **Environment Variables**: Check all required environment variables are set
5. **Browser Installation**: Run `npx playwright install` if browsers are missing

### Performance Optimization

1. Use `page.waitForLoadState('networkidle')` for complex page loads
2. Implement proper test data seeding to avoid repeated setup
3. Use browser contexts for multi-user scenarios instead of multiple browsers
4. Cache authentication states where possible