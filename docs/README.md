# FCIS Platformer Documentation

This directory contains documentation for the First Cat In Space Platformer Game Editor project.

## Structure

- **guides/** - Implementation guides and development documentation
  - `level-editor-design.md` - Level editor design specification (current progress, overlap/validation/textures, phases)
  - `implementation-plan.md` - High-level implementation plan with development phases
  - `phase1-detailed-plan.md` - Detailed Phase 1 implementation with per-task branches (includes current status)
  - `manual-testing-plan.md` - End-to-end manual testing checklist for Phase 1 (sign-in, editor, save, storage, build)
  - `developer-guide.md` - Developer workflow guide for working with Cursor AI
  - `logging-guide.md` - Unified logging strategy and guidelines
  - `testing-plan.md` - Comprehensive testing strategy and CI/CD pipeline

## Documentation Overview

### Level Editor Design
The [level editor design](guides/level-editor-design.md) specifies:
- Current progress (implemented vs partial/deferred)
- Tool palette, view mode (Grid/Texture), layers, tile placement, overlap detection, level validation
- **Moving platforms**: Create from tiles or pattern, convert existing platform, path editor, draggable path points, animated preview, orphan cleanup
- Deletion confirmation (in-editor group delete; level browser delete preference)
- System tile visuals driven by **fill patterns** (stripes, grids, bricks, hexes, symbol-based icons) with optional textures layered on top in texture mode
- Spawn/win validation warnings in Properties Panel
- Implementation phases and testing checklist

**Use this for:** Level editor behavior, UX details, and what's implemented.

### Implementation Plan
The [implementation plan](guides/implementation-plan.md) outlines:
- Technology stack decisions
- Development phases (7 phases total)
- Task breakdowns for each phase
- File structure
- Key implementation considerations
- Timeline estimates

### Phase 1 Detailed Plan
The [Phase 1 detailed plan](guides/phase1-detailed-plan.md) provides:
- Step-by-step implementation for each task
- One git branch per task with branch creation steps
- Development steps for each task
- Logging implementation requirements
- Testing requirements and coverage goals
- Commit message templates
- PR checklists

**Use this for:** Detailed implementation of Phase 1: Core Foundation

### Phase 1 Status (see phase1-detailed-plan.md)
- All 5 tasks complete: Project Setup, User Authentication, Data Models, Basic Level Editor, Local Storage.
- **Local Storage (Task 5):** IndexedDB for all data; one-time localStorage migration; auto-save (2s debounce + 30s interval, Ctrl+S); game save/load (Dashboard My Games, LevelBrowser scoped by game); storage quota UI (usage, warning, clear background images/patterns); logging and tests.

### Logging Guide
The [logging guide](guides/logging-guide.md) defines:
- Unified logging format and standards
- Log levels and when to use them
- Component-specific logging guidelines
- Logger implementation
- Environment-specific configuration
- Privacy and performance considerations

**Important:** All development must follow the logging plan. Every service, component, and utility should use the unified logger.

### Developer Guide
The [developer guide](guides/developer-guide.md) provides:
- Step-by-step development workflow
- Git branching and commit conventions
- Best practices for working with Cursor AI
- Documentation standards
- Testing requirements
- Daily development routines
- Troubleshooting tips

**Important:** All developers should follow this guide to maintain consistency and code quality. This is especially helpful for parent-child development teams.

### Testing Plan
The [testing plan](guides/testing-plan.md) covers:
- Testing pyramid and strategy
- Unit, integration, and E2E testing approaches
- Test coverage goals (80% minimum)
- CI/CD pipeline configuration
- Test organization and maintenance
- Performance and accessibility testing

**Important:** All code must include appropriate tests. The CI/CD pipeline will enforce test coverage requirements.

### Manual Testing Plan
The [manual testing plan](guides/manual-testing-plan.md) is an end-to-end checklist for Phase 1:
- Sign-in, dashboard, level browser, level editor, save/auto-save, storage, persistence, build
- Use before release or merge to verify critical paths; optional “Quick smoke” path for minimal validation

### Test and coverage status (Phase 1)
- **Tests:** All 433 tests pass (`npm run test -- --run`). No test failures.
- **Coverage:** Vitest is configured with 80% thresholds (lines, functions, branches, statements). Current coverage is below 80%, so `npm run test:coverage` may exit with code 1 until coverage is improved. Use `npm run test` for a passing CI when only test results (not coverage thresholds) are required.

## Future Documentation

Additional documentation will be added as the project progresses:
- API documentation
- User guides
- Developer setup guides
- Architecture diagrams
- Deployment guides
