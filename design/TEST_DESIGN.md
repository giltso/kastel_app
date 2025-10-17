# Testing Strategy & Design

**Status**: 🌱 Early Stage - Building Foundation
**Last Updated**: October 17, 2025

---

## Testing Philosophy

The project is in early stages of building comprehensive test coverage. We focus on testing critical business logic, utility functions, and component behavior where automated tests provide high confidence. The strategy balances coverage with development velocity - we test what matters most first.

---

## Current Test Framework

**Test Runner**: Vitest
Fast, Vite-native test runner with Jest-compatible API. Hot module reload during test development.

**Component Testing**: @testing-library/react
Encourages testing components from user perspective rather than implementation details.

**E2E Testing**: Playwright MCP
Browser automation for manual exploratory testing during development. No automated E2E suite yet.

**Configuration**: [vitest.config.ts](../vitest.config.ts), [src/test/setup.ts](../src/test/setup.ts)

---

## Testing Workflow

### Test-Driven Development (TDD) - When Applicable

**When to use TDD:**
- New utility functions with clear input/output contracts
- Complex business logic (timeline calculations, conflict detection)
- Bug fixes (write failing test reproducing bug, then fix)

**When to skip TDD:**
- UI prototyping and exploratory design work
- Simple presentational components
- Rapid feature iteration in early stages

**TDD Cycle:**
1. **Red** - Write failing test defining desired behavior
2. **Green** - Write minimal code to make test pass
3. **Refactor** - Improve code quality while keeping tests green
4. **Repeat** - Add next test case

### Test Commands

```bash
# Watch mode for development (auto-reruns on file changes)
pnpm test

# Run once (CI mode)
pnpm test:run

# Interactive UI for debugging tests
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

---

## Current Coverage (83 tests)

**Utility Functions:**
- Date calculations and calendar generation
- Timeline positioning and overlap detection

**Components:**
- LUZ timeline views (Day/Week)
- Click handlers and empty state behavior
- Basic rendering and prop handling

**E2E (Manual via Playwright):**
- Pre-deployment validation (Session 37)
- Authentication flows, language switching, responsive layouts

---

## Future Expansion Goals

### Foundational Testing
- Modal system testing (7 LUZ modals)
- Form validation testing (TanStack Form + Zod)
- Backend function testing (Convex mutations/queries)
- Permission enforcement validation

### System Coverage
- Integration testing (complete user workflows)
- Tool rental and educational system tests
- Role management testing
- i18n testing (translation loading, RTL validation)

### Production Readiness
- Automated E2E test suite (Playwright or Cypress)
- Performance testing under load
- Accessibility testing (WCAG compliance)
- Visual regression testing

---

## Testing Standards

**Minimum Requirements:**
- 3 test cases per function: happy path, edge case, error condition
- Descriptive test names: "should [behavior] when [condition]"
- Independent tests with no shared state
- Fast execution (unit tests in milliseconds)

**Test Organization:**
- Colocate tests with source files (`*.test.ts` next to `*.ts`)
- Shared test utilities in [src/test/](../src/test/)
- Exclude generated code and config files from coverage

---

**Note**: This document focuses on high-level strategy. Detailed testing patterns and examples will be added as the test suite matures.
