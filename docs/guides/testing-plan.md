# Testing Plan & CI/CD Strategy

## Overview

This document outlines the comprehensive testing strategy and CI/CD pipeline for the FCIS Platformer Game Editor. Testing ensures quality, reliability, and maintainability throughout development.

## Testing Principles

1. **Test Early:** Write tests alongside code, not after
2. **Test Often:** Run tests on every commit
3. **Test Comprehensively:** Cover critical paths and edge cases
4. **Test Realistically:** Use realistic data and scenarios
5. **Maintain Tests:** Keep tests updated with code changes
6. **Fast Feedback:** Tests should run quickly for rapid iteration

## Testing Pyramid

```
        /\
       /  \      E2E Tests (Few, Critical Paths)
      /____\
     /      \    Integration Tests (Some, Key Workflows)
    /________\
   /          \  Unit Tests (Many, All Components)
  /____________\
```

### Distribution Target
- **Unit Tests:** 70% of test suite
- **Integration Tests:** 20% of test suite
- **E2E Tests:** 10% of test suite

## Test Types

### Unit Tests
**Purpose:** Test individual functions, methods, and components in isolation

**Scope:**
- Utility functions
- Service methods
- Component rendering (without side effects)
- Data transformations
- Business logic

**Tools:**
- Vitest (primary)
- React Testing Library (for components)
- @testing-library/jest-dom (matchers)

**Example:**
```typescript
// src/utils/grid.test.ts
import { describe, it, expect } from 'vitest';
import { calculateGridPosition } from './grid';

describe('calculateGridPosition', () => {
  it('should snap to grid correctly', () => {
    const result = calculateGridPosition(123, 456, 32);
    expect(result).toEqual({ x: 128, y: 448 });
  });
});
```

### Integration Tests
**Purpose:** Test interactions between multiple components/services

**Scope:**
- Service interactions
- API integrations
- Data flow between components
- State management
- Storage operations

**Tools:**
- Vitest
- MSW (Mock Service Worker) for API mocking
- Testing Library for component integration

**Example:**
```typescript
// src/services/storageService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from './storageService';

describe('StorageService', () => {
  beforeEach(() => {
    // Clear storage before each test
    localStorage.clear();
  });

  it('should save and load game correctly', async () => {
    const service = new StorageService();
    const game = { id: 'test', title: 'Test Game' };
    
    await service.saveGame(game);
    const loaded = await service.loadGame('test');
    
    expect(loaded).toEqual(game);
  });
});
```

### End-to-End (E2E) Tests
**Purpose:** Test complete user workflows from start to finish

**Scope:**
- Critical user journeys
- Complete workflows
- Cross-browser compatibility
- Real user scenarios

**Tools:**
- Playwright (recommended) or Cypress
- Test in multiple browsers (Chrome, Firefox, Safari)

**Example:**
```typescript
// e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and play a level', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.click('text=Sign in with Google');
  
  // Create game
  await page.goto('/games');
  await page.click('text=New Game');
  await page.fill('[name="gameTitle"]', 'My Test Game');
  await page.click('button:has-text("Create")');
  
  // Create level
  await page.click('text=New Level');
  // ... continue workflow
});
```

### Visual Regression Tests
**Purpose:** Detect unintended visual changes

**Scope:**
- UI components
- Layout changes
- Styling updates

**Tools:**
- Playwright with screenshot comparison
- Percy or Chromatic (optional)

### Performance Tests
**Purpose:** Ensure acceptable performance

**Scope:**
- Load times
- Frame rates
- Large level handling
- Image processing performance

**Tools:**
- Lighthouse CI
- Custom performance benchmarks

## Test Coverage Goals

### Minimum Coverage Requirements
- **Overall:** 80% code coverage
- **Critical Paths:** 95% coverage
- **Utilities/Services:** 90% coverage
- **Components:** 75% coverage

### Critical Paths (Must have 95%+ coverage)
- Authentication flow
- Game save/load
- Level editor operations
- Export functionality
- Scan/reimport pipeline
- Sharing operations

## Testing Tools & Setup

### Primary Testing Stack
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@playwright/test": "^1.40.0",
    "msw": "^2.0.0",
    "@vitest/ui": "^1.0.0"
  }
}
```

### Test Configuration

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

## Test Organization

### Directory Structure
```
src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── Button.test.tsx
├── services/
│   ├── authService.ts
│   └── authService.test.ts
├── utils/
│   ├── grid.ts
│   └── grid.test.ts
└── test/
    ├── setup.ts
    ├── mocks/
    │   ├── handlers.ts (MSW)
    │   └── data.ts
    └── helpers/
        └── testUtils.tsx

e2e/
├── specs/
│   ├── auth.spec.ts
│   ├── level-editor.spec.ts
│   └── game-playback.spec.ts
└── fixtures/
    └── testData.ts
```

## CI/CD Pipeline

### Pipeline Stages

#### 1. Pre-commit Hooks (Local)
**Tools:** Husky + lint-staged

**Actions:**
- Run linter (ESLint)
- Format code (Prettier)
- Run affected unit tests
- Check commit message format

**Configuration:**
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{ts,tsx}": [
      "vitest related --run"
    ]
  }
}
```

#### 2. Build & Lint (CI)
**Trigger:** On every push to any branch

**Actions:**
- Install dependencies
- Run linter
- Type check (TypeScript)
- Build application
- Check for build errors

**Failure:** Blocks merge

#### 3. Unit & Integration Tests (CI)
**Trigger:** On every push

**Actions:**
- Run all unit tests
- Run integration tests
- Generate coverage report
- Upload coverage to service (Codecov)

**Failure:** Blocks merge if coverage drops below threshold

**Parallelization:** Run tests in parallel for speed

#### 4. E2E Tests (CI)
**Trigger:** On push to main/develop, PRs

**Actions:**
- Run E2E test suite
- Test in multiple browsers (Chrome, Firefox)
- Generate test reports

**Failure:** Blocks merge for critical paths

**Note:** May run in parallel with other stages

#### 5. Visual Regression (CI)
**Trigger:** On push to main/develop, PRs

**Actions:**
- Capture screenshots
- Compare with baseline
- Flag visual changes

**Failure:** Review required (may be intentional)

#### 6. Performance Tests (CI)
**Trigger:** On push to main/develop

**Actions:**
- Run Lighthouse CI
- Check performance budgets
- Run custom performance benchmarks

**Failure:** Warning only (doesn't block)

#### 7. Security Scan (CI)
**Trigger:** On every push

**Actions:**
- Dependency vulnerability scan (npm audit)
- Code security scan (if applicable)

**Failure:** Blocks merge for critical vulnerabilities

#### 8. Deploy to Staging
**Trigger:** On merge to develop branch

**Actions:**
- Build production bundle
- Deploy to staging environment
- Run smoke tests
- Notify team

**Failure:** Alert team, don't block development

#### 9. Deploy to Production
**Trigger:** On merge to main branch (or manual)

**Actions:**
- Build production bundle
- Run final checks
- Deploy to production
- Run smoke tests
- Monitor for errors

**Failure:** Rollback and alert

### CI/CD Configuration

**GitHub Actions Example (.github/workflows/ci.yml):**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build-and-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  deploy-staging:
    needs: [build-and-lint, test, e2e]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - name: Deploy to Staging
        # Add deployment steps
```

## Test Data Management

### Mock Data
- Create reusable mock data factories
- Use MSW for API mocking
- Maintain test fixtures

**Example:**
```typescript
// src/test/mocks/data.ts
export const mockGame = {
  id: 'test-game-1',
  title: 'Test Game',
  userId: 'test-user-1',
  // ... complete game structure
};

export const createMockGame = (overrides = {}) => ({
  ...mockGame,
  ...overrides
});
```

### Test Isolation
- Each test should be independent
- Clean up after tests (localStorage, mocks, etc.)
- Use beforeEach/afterEach for setup/teardown

## Performance Testing

### Metrics to Track
- **Load Time:** < 3 seconds initial load
- **Time to Interactive:** < 5 seconds
- **Frame Rate:** 60 FPS during gameplay
- **Level Load Time:** < 1 second for typical level
- **Export Generation:** < 5 seconds for typical level

### Performance Test Examples
```typescript
// src/test/performance/levelEditor.test.ts
import { performance } from 'perf_hooks';

describe('Level Editor Performance', () => {
  it('should handle large levels efficiently', () => {
    const start = performance.now();
    // Create large level
    const end = performance.now();
    expect(end - start).toBeLessThan(1000); // < 1 second
  });
});
```

## Accessibility Testing

### Automated Checks
- Use @axe-core/playwright for E2E tests
- Check ARIA labels
- Verify keyboard navigation
- Test with screen readers (manual)

### Manual Testing
- Keyboard-only navigation
- Screen reader compatibility
- Color contrast verification
- Focus management

## Browser Compatibility

### Supported Browsers
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Testing Strategy
- E2E tests in Chrome and Firefox
- Manual testing in Safari and Edge
- Use BrowserStack for additional coverage if needed

## Test Maintenance

### Regular Tasks
- **Weekly:** Review failing tests, update flaky tests
- **Monthly:** Review test coverage, add missing tests
- **Quarterly:** Refactor test suite, remove obsolete tests

### Test Quality Checklist
- [ ] Tests are fast (< 100ms for unit, < 5s for integration)
- [ ] Tests are independent and can run in any order
- [ ] Tests have clear, descriptive names
- [ ] Tests cover both happy path and edge cases
- [ ] Tests are maintainable and easy to understand
- [ ] Mock data is realistic
- [ ] Tests fail for the right reasons

## Continuous Improvement

### Metrics to Track
- Test execution time
- Test failure rate
- Flaky test rate
- Coverage trends
- CI/CD pipeline duration

### Goals
- Keep test suite execution under 10 minutes
- Maintain < 1% flaky test rate
- Achieve 80%+ coverage
- Keep CI/CD pipeline under 15 minutes

## Testing Checklist for New Features

When adding a new feature:
- [ ] Write unit tests for utilities/services
- [ ] Write integration tests for workflows
- [ ] Add E2E test for critical user journey
- [ ] Update test coverage report
- [ ] Verify tests pass in CI
- [ ] Document any special testing requirements
- [ ] Add performance tests if applicable

## Tools & Services

### Testing Tools
- **Vitest:** Unit and integration testing
- **Playwright:** E2E testing
- **MSW:** API mocking
- **React Testing Library:** Component testing

### CI/CD Services
- **GitHub Actions:** Primary CI/CD (free for public repos)
- **Alternative:** GitLab CI, CircleCI, or Jenkins

### Coverage & Quality
- **Codecov:** Coverage tracking and reporting
- **Sentry:** Error tracking (integration with tests)
- **Lighthouse CI:** Performance monitoring

---

**Document Version:** 1.0  
**Last Updated:** [Date]  
**Status:** Active - Follow for all development
