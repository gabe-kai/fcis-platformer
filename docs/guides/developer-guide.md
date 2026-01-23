# Developer Guide - Working with Cursor AI

## Overview

This guide provides a repeatable development process for building the FCIS Platformer Game Editor using Cursor AI. It emphasizes good habits, proper Git workflow, documentation, and testing to ensure code quality and maintainability.

**Note:** This guide is designed to be used by developers of all experience levels, including parent-child development teams.

## Table of Contents

1. [Development Workflow](#development-workflow)
2. [Git Workflow & Branching Strategy](#git-workflow--branching-strategy)
3. [Commit Message Conventions](#commit-message-conventions)
4. [Working with Cursor AI](#working-with-cursor-ai)
5. [Documentation Standards](#documentation-standards)
6. [Testing Requirements](#testing-requirements)
7. [Code Review Checklist](#code-review-checklist)
8. [Daily Development Routine](#daily-development-routine)

## Development Workflow

### Step-by-Step Process

#### 1. Start Your Work Session

```bash
# Pull latest changes
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/your-feature-name

# Verify you're on the right branch
git branch
```

#### 2. Understand the Task

- Read the implementation plan for the current phase
- Review related documentation
- Check existing code for similar patterns
- Ask Cursor AI: "What do I need to know about [feature]?"

#### 3. Plan Your Implementation

Before coding, discuss with Cursor AI:
- "What's the best approach for implementing [feature]?"
- "What components/services will I need to create or modify?"
- "Are there any existing patterns I should follow?"

#### 4. Implement with Cursor AI

- Use Cursor AI to generate code following our patterns
- Ask for explanations: "Why did you choose this approach?"
- Request refactoring: "Can we make this more maintainable?"
- Get help with tests: "Write tests for this function"

#### 5. Test Your Changes

```bash
# Run unit tests
npm run test

# Run tests in watch mode while developing
npm run test:watch

# Check test coverage
npm run test:coverage
```

#### 6. Document Your Changes

- Update code comments
- Add JSDoc comments for functions
- Update relevant documentation files
- Add examples if needed

#### 7. Commit Your Work

Follow the [commit message conventions](#commit-message-conventions)

```bash
# Stage your changes
git add .

# Commit with a good message
git commit -m "feat(level-editor): add platform placement tool"

# Push to remote
git push origin feature/your-feature-name
```

#### 8. Create Pull Request

- Push your branch to GitHub
- Create a PR with a clear description
- Link to related issues/tasks
- Request review

#### 9. Address Feedback

- Make requested changes
- Update tests if needed
- Re-run tests
- Update documentation
- Push updates to the same branch

## Git Workflow & Branching Strategy

### Branch Naming Convention

Use descriptive branch names with prefixes:

- `feature/` - New features
  - Example: `feature/level-editor-platforms`
  - Example: `feature/graphics-upload`
  
- `fix/` - Bug fixes
  - Example: `fix/camera-scroll-bug`
  - Example: `fix/export-pdf-error`
  
- `refactor/` - Code refactoring
  - Example: `refactor/storage-service`
  - Example: `refactor/game-engine-physics`
  
- `docs/` - Documentation updates
  - Example: `docs/api-documentation`
  - Example: `docs/setup-guide`
  
- `test/` - Test additions/improvements
  - Example: `test/level-editor-coverage`
  - Example: `test/integration-tests`
  
- `chore/` - Maintenance tasks
  - Example: `chore/update-dependencies`
  - Example: `chore/linting-fixes`

### Branch Strategy

```
main (production-ready code)
  └── develop (integration branch)
      ├── feature/level-editor
      ├── feature/graphics-system
      ├── fix/camera-bug
      └── docs/api-guide
```

**Workflow:**
1. Create feature branch from `develop`
2. Work on feature branch
3. Create PR to merge into `develop`
4. After testing, merge `develop` into `main`

### Branch Lifecycle

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Work on feature (make commits)

# 4. Keep branch updated with develop
git checkout develop
git pull origin develop
git checkout feature/my-feature
git merge develop  # or git rebase develop

# 5. Push and create PR
git push origin feature/my-feature

# 6. After PR is merged, delete local branch
git checkout develop
git pull origin develop
git branch -d feature/my-feature
```

## Commit Message Conventions

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, config)
- `perf`: Performance improvements

### Scope

The scope should be the area of the codebase affected:
- `auth` - Authentication
- `level-editor` - Level editor
- `world-map` - World map editor
- `graphics` - Graphics system
- `game-engine` - Game engine
- `export` - Export functionality
- `scan` - Scan/reimport system
- `camera` - Camera system
- `storage` - Storage service
- `ui` - UI components

### Examples

**Good Commit Messages:**

```
feat(level-editor): add platform placement tool

- Add drag-and-drop platform placement
- Implement snap-to-grid functionality
- Add platform properties panel
- Include unit tests for platform placement

Closes #123
```

```
fix(camera): correct auto-scroll kill zone detection

The kill zone was not properly detecting when player
fell behind camera. Fixed by adjusting boundary check
to account for camera offset.

Fixes #456
```

```
docs(api): add storage service documentation

Document all methods in StorageService including
saveGame, loadGame, and deleteGame with examples.
```

```
test(graphics): add tests for graphics upload

- Test file validation
- Test image processing
- Test error handling
- Achieve 90% coverage for GraphicsService
```

**Bad Commit Messages:**

```
❌ "fixed bug"
❌ "update"
❌ "changes"
❌ "WIP"
❌ "asdf"
```

### Commit Frequency

**Commit Often:**
- After completing a logical unit of work
- After fixing a bug
- After adding tests
- Before taking a break
- After refactoring

**Don't Commit:**
- Broken code that doesn't compile
- Code with failing tests (unless fixing tests)
- Temporary debugging code
- Large unrelated changes together

## Working with Cursor AI

### Best Practices

#### 1. Be Specific in Your Requests

**Good:**
- "Create a LevelEditor component that uses Canvas API for rendering platforms with a grid overlay"
- "Add error handling to the storage service with proper logging using our logger utility"
- "Write unit tests for the calculateGridPosition function in grid.ts"

**Bad:**
- "Make a level editor"
- "Add error handling"
- "Write tests"

#### 2. Ask for Explanations

After Cursor AI generates code:
- "Why did you choose this approach?"
- "What are the trade-offs of this solution?"
- "How does this integrate with our existing code?"

#### 3. Request Refactoring

- "Can we make this more maintainable?"
- "Is there a better pattern we should use?"
- "Can we extract this into a reusable utility?"

#### 4. Get Help with Tests

- "Write unit tests for this function"
- "What edge cases should I test?"
- "How do I mock this dependency?"

#### 5. Follow Our Patterns

Ask Cursor AI to:
- "Follow our logging guide when adding logs"
- "Use our data models from the models folder"
- "Follow the testing plan for this component"

### Common Cursor AI Prompts

#### Starting a New Feature

```
I need to implement [feature name] for the FCIS Platformer.
According to our implementation plan, this should:
- [requirement 1]
- [requirement 2]
- [requirement 3]

Please help me:
1. Identify which files I need to create/modify
2. Show me the existing patterns I should follow
3. Create the initial implementation following our coding standards
```

#### Adding Logging

```
Add logging to this code following our logging guide:
- Use the logger from @/utils/logger
- Include appropriate log levels (INFO for operations, ERROR for failures)
- Add context (component, userId, levelId, etc.)
- Include structured data where helpful
```

#### Writing Tests

```
Write tests for [component/function] following our testing plan:
- Use Vitest and React Testing Library
- Test happy path and edge cases
- Mock dependencies appropriately
- Aim for 90%+ coverage
- Include integration tests if applicable
```

#### Refactoring

```
Refactor this code to:
- Follow our coding standards
- Improve maintainability
- Add proper error handling
- Include logging
- Make it more testable
```

#### Documentation

```
Add documentation to this code:
- JSDoc comments for all public functions
- Explain complex logic
- Add usage examples
- Document parameters and return values
```

### Working with Your Kid

If you're pair programming with a child:

1. **Explain the Process:**
   - "We're going to create a new feature. First, let's understand what we need to build."
   - "Before we code, let's plan what we'll need."
   - "After coding, we always test and document."

2. **Use Cursor AI Together:**
   - Let them suggest what to ask Cursor AI
   - Explain what Cursor AI generated
   - Ask them to explain the code back to you

3. **Review Together:**
   - "What does this code do?"
   - "Why did we write it this way?"
   - "What could go wrong?"

4. **Make It Fun:**
   - Celebrate small wins
   - Show them the game working
   - Let them test the features

## Documentation Standards

### Code Comments

#### Function Documentation (JSDoc)

```typescript
/**
 * Calculates the grid position for a given coordinate, snapping to the nearest grid cell.
 * 
 * @param x - The x coordinate in pixels
 * @param y - The y coordinate in pixels
 * @param gridSize - The size of each grid cell in pixels
 * @returns The snapped grid position
 * 
 * @example
 * ```typescript
 * const pos = calculateGridPosition(123, 456, 32);
 * // Returns: { x: 128, y: 448 }
 * ```
 */
export function calculateGridPosition(x: number, y: number, gridSize: number): { x: number; y: number } {
  // Implementation
}
```

#### Inline Comments

Use comments to explain:
- **Why**, not what (code should be self-explanatory)
- Complex algorithms
- Business logic decisions
- Workarounds for bugs
- Performance considerations

```typescript
// Good: Explains why
// We use requestAnimationFrame instead of setInterval to sync with browser refresh rate
// This ensures smooth 60fps rendering
function gameLoop() {
  requestAnimationFrame(gameLoop);
  // ...
}

// Bad: Explains what (obvious from code)
// Increment the counter by 1
counter++;
```

### README Files

Each major component/service should have a README:

```markdown
# Component/Service Name

## Purpose
Brief description of what this does.

## Usage
```typescript
import { ComponentName } from '@/components/...';

<ComponentName prop1={value1} prop2={value2} />
```

## Props/API
- `prop1` (type): Description
- `prop2` (type): Description

## Examples
[Code examples]

## Related
- Links to related components/services
- Links to documentation
```

### Updating Documentation

When you modify code:
- [ ] Update JSDoc comments if function signature changed
- [ ] Update README if API changed
- [ ] Update implementation plan if scope changed
- [ ] Add migration notes if breaking changes

## Testing Requirements

### Before Committing

**Always run:**
```bash
# Lint and format
npm run lint
npm run format

# Run all tests
npm run test

# Check coverage
npm run test:coverage
```

### Test Coverage Requirements

- **New Features:** Must have tests
- **Bug Fixes:** Must include regression test
- **Refactoring:** Update existing tests
- **Minimum Coverage:** 80% overall, 95% for critical paths

### Writing Tests

**Template:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { functionToTest } from './module';

describe('functionToTest', () => {
  beforeEach(() => {
    // Setup
  });

  it('should handle happy path', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });

  it('should handle edge case', () => {
    // Test edge case
  });

  it('should handle error case', () => {
    // Test error handling
  });
});
```

### Test Checklist

For every feature:
- [ ] Unit tests for utilities/services
- [ ] Integration tests for workflows
- [ ] E2E test for critical user journey (if applicable)
- [ ] Test error cases
- [ ] Test edge cases
- [ ] Verify coverage meets requirements

## Code Review Checklist

Before requesting review, check:

### Functionality
- [ ] Code works as intended
- [ ] All tests pass
- [ ] No console errors/warnings
- [ ] Handles error cases
- [ ] Follows existing patterns

### Code Quality
- [ ] Code is readable and maintainable
- [ ] No code duplication
- [ ] Proper error handling
- [ ] Logging added where needed
- [ ] No hardcoded values (use constants/config)

### Testing
- [ ] Tests written and passing
- [ ] Coverage meets requirements
- [ ] Tests are meaningful (not just for coverage)

### Documentation
- [ ] JSDoc comments added
- [ ] Complex logic explained
- [ ] README updated if needed
- [ ] Examples provided if applicable

### Git
- [ ] Meaningful commit messages
- [ ] Logical commit history
- [ ] No merge conflicts
- [ ] Branch is up to date with develop

## Daily Development Routine

### Morning Routine

1. **Check for Updates**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Review Today's Tasks**
   - Check project board/issue tracker
   - Review implementation plan
   - Identify what you'll work on

3. **Set Up Your Environment**
   ```bash
   # Start development server
   npm run dev
   
   # Run tests in watch mode (separate terminal)
   npm run test:watch
   ```

### During Development

1. **Work in Small Increments**
   - Make small, focused changes
   - Test frequently
   - Commit often

2. **Use Cursor AI Effectively**
   - Ask specific questions
   - Request explanations
   - Get help with tests

3. **Follow the Process**
   - Write code
   - Write tests
   - Add logging
   - Update documentation
   - Commit

### End of Day Routine

1. **Commit Your Work**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   git push origin feature/your-branch
   ```

2. **Update Progress**
   - Update issue tracker
   - Note any blockers
   - Document what you learned

3. **Clean Up**
   - Remove temporary files
   - Close unnecessary terminals
   - Save your work

### Weekly Routine

1. **Review Your Work**
   - Check test coverage
   - Review code quality
   - Update documentation

2. **Sync with Team**
   - Review PRs
   - Share progress
   - Discuss blockers

3. **Plan Next Week**
   - Review implementation plan
   - Identify next tasks
   - Set goals

## Troubleshooting

### Common Issues

#### Tests Failing
```bash
# Clear test cache
npm run test -- --clearCache

# Run specific test file
npm run test path/to/test.ts

# Run in verbose mode
npm run test -- --reporter=verbose
```

#### Git Conflicts
```bash
# Fetch latest
git fetch origin

# Rebase your branch
git rebase origin/develop

# Resolve conflicts, then
git add .
git rebase --continue
```

#### Build Errors
```bash
# Clear build cache
rm -rf node_modules/.vite
rm -rf dist

# Reinstall dependencies
npm ci

# Rebuild
npm run build
```

## Quick Reference

### Essential Commands

```bash
# Git
git status                    # Check status
git branch                    # List branches
git checkout -b feature/x   # Create feature branch
git add .                     # Stage changes
git commit -m "message"       # Commit
git push origin branch        # Push to remote

# Development
npm run dev                   # Start dev server
npm run build                 # Build for production
npm run test                  # Run tests
npm run test:watch            # Watch mode
npm run lint                  # Lint code
npm run format                # Format code

# Testing
npm run test:coverage         # Coverage report
npm run test:e2e             # E2E tests
```

### Cursor AI Quick Prompts

- "Follow our logging guide for this code"
- "Write tests for this following our testing plan"
- "Refactor this to be more maintainable"
- "Add JSDoc documentation to this function"
- "Explain this code to me"
- "What's the best approach for [feature]?"

## Resources

- [Implementation Plan](./implementation-plan.md)
- [Logging Guide](./logging-guide.md)
- [Testing Plan](./testing-plan.md)
- [Design Document](../design-document.md)

---

**Remember:** Good habits make great developers. Follow this process consistently, and you'll build maintainable, testable, well-documented code.

**Document Version:** 1.0  
**Last Updated:** [Date]  
**Status:** Active - Follow for all development
