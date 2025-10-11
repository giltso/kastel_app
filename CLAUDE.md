Always follow the guidelines in this file, unless explicitly told otherwise by the user or overridden in the CLAUDE.local.md file.

## Project Overview

**Hardware Shop Management System** - Full-stack TypeScript application for staff scheduling, tool rentals, educational courses, and customer interactions.

### Tech Stack
- **Frontend**: React 19 + Vite + TanStack Router (type-safe routing)
- **Backend**: Convex (real-time database) + Clerk (authentication)
- **Styling**: Tailwind CSS 4 + daisyUI 5 (config in `src/index.css`, NOT tailwind.config.js)
- **Forms**: TanStack Form + Zod v4 (native Standard Schema support)
- **State**: TanStack Query + Convex integration (`@convex-dev/react-query`)
- **Testing**: Vitest (unit tests) + Playwright MCP (browser automation)
- **Drag-and-Drop**: @dnd-kit for shift assignment interactions
- **Development**: `pnpm dev` with `run_in_background` parameter (monitor via BashOutput)
- **Package Manager**: Always use `pnpm` and `pnpx`, NOT `npm` or `npx`
- **Import Alias**: `@/` maps to `src/` directory
- **Environment Variables**: Client vars need `VITE_` prefix, Convex vars set in dashboard

### Typography
- Uses `@tailwindcss/typography` with `prose prose-invert` at root level
- Use `not-prose` to escape (e.g., for buttons/tables)

### V2 Implementation Status
- **Role Management**: Tag-based permissions (workerTag, managerTag, instructorTag, toolHandlerTag, rentalApprovedTag)
- **LUZ Calendar**: Day/week/month views, shift templates, dual approval workflows, 7-modal system
- **Tool Rentals**: Inventory management, approval workflows, manual rentals for walk-in customers
- **Educational Courses**: Single-session and multi-meeting courses with course_sessions table
- **Testing**: 83 unit tests passing, comprehensive utility function coverage

## Critical Assessment Standards

**Always be brutally honest about implementation status and unsolved problems. Never overstate completion.**

### Documentation Standards
- **Distinguish "working" from "production-ready"** - Basic functionality ≠ complete implementation
- **Highlight production blockers prominently** - Schema validation failures, missing migrations, deployment issues
- **Document technical debt explicitly** - Temporary workarounds, optional fields that should be required
- **List specific unresolved problems** - Don't just say "needs more work", specify what exactly is missing

### Testing & Validation Requirements
- **One successful test case is insufficient** - Test edge cases, error conditions, malformed data, concurrent operations
- **Frontend crashes are critical bugs** - `.includes()` on undefined, missing null checks, unhandled errors
- **Schema validation failures block production** - Cannot deploy with inconsistent data models
- **Error handling is mandatory** - User-friendly messages, graceful failures, proper validation

### Implementation Completion Criteria
Before marking any feature as "complete":
1. **All critical paths tested** - Happy path, error path, edge cases
2. **No schema validation errors** - Database migrations completed, data integrity maintained
3. **Production deployment safe** - No crashes, proper error handling, backward compatibility
4. **Documentation reflects reality** - Current limitations clearly stated, required work itemized
5. **No temporary workarounds in production code** - Proper fixes implemented, not band-aids

## Development Workflow

### Git Workflow

#### Main Branch (Stable Development)
**Use for:** Small changes, well-understood features, quick iterations

1. **Commit after each user request**: `git add -A && git commit -m "[action]: [what was accomplished]"`
2. **Commits happen WITHOUT asking** - they're for checkpoints, not cleanliness (will be squashed later)
3. **Restore points**: If user says "let's go back to before X", use `git log` or `git reflog` to find commit, then `git reset --hard [commit-hash]`
4. **Go forward after reset**: Use `git reflog` to see "lost" commits, then `git reset --hard [commit-hash]` to jump forward
5. **Squash when feature complete**:
   - Run `pnpm lint` first
   - Check unpushed commits: `git log origin/main..HEAD --oneline`
   - Find starting commit: `git reset --soft [starting-commit]`
   - Commit with: `"feat: [complete feature description]"`
6. **Before major feature work**: Tell user "Starting [feature], will make frequent commits as checkpoints then squash when complete"

#### Feature Branches (Experimental/Risky Work)
**Use for:** Experimental features, risky refactors, large multi-session features, breaking changes

**Branch Naming Conventions:**
- `feature/[name]` - New features (e.g., `feature/course-sessions`)
- `fix/[issue]` - Bug fixes (e.g., `fix/week-view-date`)
- `refactor/[scope]` - Code improvements (e.g., `refactor/shift-modals`)
- `experiment/[name]` - Exploratory work (e.g., `experiment/drag-drop`)

**Branch Workflow:**
1. **Create branch**: `git checkout -b feature/[name]`
2. **Commit frequently** (checkpoint commits, same as main branch pattern)
3. **Push to remote**: `git push -u origin feature/[name]`
4. **When stable**: Squash commits, then merge to main or create PR
5. **Delete after merge**: `git branch -d feature/[name]`

**When to Branch vs. Main:**
- ✅ **Main**: Small UI changes, bug fixes, well-tested patterns, single-session work
- ✅ **Branch**: New architecture, large refactors, experimental features, uncertain approach

**Recovery & Rollback:**
- **Abandon work**: `git checkout main` (leaves branch intact)
- **Cherry-pick commits**: `git cherry-pick [commit-hash]` (selective merge)
- **Delete experimental branch**: `git branch -D experiment/[name]` (force delete)

### Test-Driven Development (TDD)

**When to use TDD:**
- ✅ **New utility functions** - Write tests first, define behavior via tests
- ✅ **Complex business logic** - Timeline calculations, capacity validation, conflict detection
- ✅ **Bug fixes** - Write failing test that reproduces bug, then fix
- ✅ **Refactoring** - Tests ensure no regression during code improvements
- ❌ **Simple UI components** - TDD overhead not justified for basic JSX
- ❌ **Prototyping** - Explore first, add tests when design stabilizes

**TDD Workflow (Red-Green-Refactor):**
1. **🔴 Red**: Write failing test that defines desired behavior
2. **🟢 Green**: Write minimal code to make test pass (don't optimize yet)
3. **🔵 Refactor**: Improve code quality while keeping tests green
4. **Repeat**: Add next test case, iterate

**TDD Best Practices:**
- **One behavior per test** - Don't test multiple things in single test
- **Descriptive test names** - `"should calculate capacity correctly when 3 workers assigned"`
- **Independent tests** - Each test should run in isolation, no shared state
- **Mock external dependencies** - Mock Convex queries, API calls, file system
- **Test behavior, not implementation** - Focus on inputs/outputs, not internal details
- **Edge cases matter** - Empty arrays, null/undefined, boundary values, malformed data

**Integration with Development:**
- Run `pnpm test` in watch mode during development (auto-reruns on file changes)
- Commit tests WITH implementation (never commit code without tests)
- Use `pnpm test:coverage` to identify untested code paths
- Use `pnpm test:ui` for interactive debugging and visualization

**Test Commands:**
- `pnpm test` - Run tests in watch mode (default for TDD workflow)
- `pnpm test:ui` - Interactive UI for debugging tests
- `pnpm test:coverage` - Generate code coverage report (identify gaps)

**What to Test:**
- ✅ Pure utility functions (no side effects)
- ✅ Data transformation functions (date calculations, formatting)
- ✅ Validation logic and permission checks
- ✅ Complex algorithms (positioning, conflict detection)
- ✅ Edge cases and error conditions
- ❌ React hooks (require mocking - test sparingly)
- ❌ Convex functions (require backend test environment - future work)

**Test Quality Standards:**
- **Minimum 3 test cases per function**: happy path, edge case, error condition
- **Type safety**: Tests should catch type errors when strict typing is added
- **No brittleness**: Don't test implementation details (e.g., internal function calls)
- **Fast execution**: Unit tests should run in milliseconds, not seconds

**Test Structure:**
```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from './module';

describe('ModuleName', () => {
  describe('functionToTest', () => {
    it('should handle the happy path', () => {
      const result = functionToTest(validInput);
      expect(result).toBe(expectedOutput);
    });

    it('should handle edge cases', () => {
      const result = functionToTest(edgeCase);
      expect(result).toBeDefined();
    });

    it('should throw on invalid input', () => {
      expect(() => functionToTest(invalidInput)).toThrow();
    });
  });
});
```

**Test Organization:**
- Test files: `*.test.ts` or `*.test.tsx` (colocated with source files)
- Setup file: `src/test/setup.ts` (test utilities and global configuration)
- Coverage exclusions: `node_modules/`, `convex/_generated/`, config files

### Session Workflow

This project follows a structured multi-session development approach with emphasis on documentation maintenance and systematic task management.

#### Session Start Protocol
1. **Always read these design files at session start**:
   - `design/PROJECT_OVERVIEW.md` - Read always, update after major changes
   - `design/session_history.md` - Read last 2 sessions for context, update current session when complete
   - Feature-specific docs (e.g., `design/SHIFTS_IMPLEMENTATION.md`) - Read all if working on that feature

2. **If approaching 5-hour limit**: Update documentation before doing anything else, add current todo list to PROJECT_OVERVIEW.md

#### Task Management Workflow
For major tasks, follow this systematic approach:

1. **Plan Phase**:
   - Read task requirements, create TodoWrite list
   - Write implementation plan in terminal
   - Ask clarifying questions if needed
   - Update relevant feature documentation (create new doc if needed using SHIFTS_IMPLEMENTATION template)
   - Update TodoWrite with refined tasks

2. **Implementation Phase**:
   - Execute tasks systematically
   - Use TodoWrite to track progress in real-time
   - Commit after each significant step (following Git Workflow above)

3. **Completion Phase**:
   - Run `pnpm typecheck` to verify all TypeScript types compile
   - Report completion status in terminal, focusing on problems and unfinished tasks
   - Update feature documentation with changes made
   - Update PROJECT_OVERVIEW.md implementation status
   - Mark TodoWrite tasks as completed

#### Documentation Standards
- **PROJECT_OVERVIEW.md**: Central project state, update after major feature completion
- **session_history.md**: Historical context, update at end of each session with achievements and issues
- **Feature docs**: Detailed implementation notes, update during development
- **CLAUDE.md**: Technical guidelines (this file), update when adding new patterns or practices

#### New Feature Documentation
When creating feature-specific documentation, use `design/SHIFTS_IMPLEMENTATION.md` as template structure.

## Testing & Validation

### Unit Testing with Vitest

**Test Framework**: Vitest (Jest-compatible, optimized for Vite projects)

**When to Write Tests** (see TDD section above for workflow):
1. **Always write unit tests for new utility functions** - Pure functions in `src/utils/` must have comprehensive test coverage
2. **Test business logic functions** - Any function with conditional logic, calculations, or data transformations
3. **Test validation logic** - Permission checks, data validation, edge case handling
4. **Test after strict typing changes** - When changing from `any` to strict types, verify no functionality broke
5. **Test complex algorithms** - Timeline positioning, conflict detection, capacity calculations

### Integration & UI Testing

**Pre-Push Checklist:**
- Always follow these steps before squashing or pushing
- Run `pnpm typecheck` to verify all TypeScript types are valid across the entire project
- Check background process output for Convex backend errors
- Run `pnpm lint` for comprehensive type checking and linting across the codebase

**Playwright MCP (Browser Automation):**
- Test UI with Playwright MCP: full browser automation with element interaction and console access
- The playwright mcp server is unreliable, if it doesn't work ask the user to test manually
- Responsive testing: Use `mcp__playwright__browser_resize` to test mobile (375x667), tablet (768x1024), desktop (1200x800)
- Clerk verification: sign in with `claude+clerk_test@example.com` and 424242 as the verification code. Type all 6 digits at once in first field with slowly: true - UI auto-distributes to separate inputs
- Debug with `mcp__playwright__browser_console_messages` to view all browser console output

**General Testing:**
- If you run into an issue you don't know how to fix, look for relevant documentation or a reference implementation

## Convex (Backend)

### Core Concepts
- `_creationTime` and `_id` are automatically added to all documents
- Adding required fields breaks existing data - if early in development, ask user to clear database. Otherwise, plan migration
- Use `ConvexError` for client-friendly errors, not generic Error
- Queries have 16MB/10s limits - always use indexes, never full table scans
- Transactions are per-mutation - can't span multiple mutations
- Hot reload issues: Restart if schema changes don't apply or types are stuck
- Use `import { Doc, Id } from "./_generated/dataModel";` and `v.id("table")` for type safety
- Add `"use node";` to the top of files containing actions that use Node.js built-in modules (not needed for fetch, can't contain queries and mutations)

### Convex + Clerk
Always use Convex's auth hooks (`useConvexAuth`) and components (`<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>`) instead of Clerk's hooks/components. This ensures auth tokens are properly validated by the Convex backend.

### Functions
- Import `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, `internalAction` from `./_generated/server`
- Use `ctx.runQuery`, `ctx.runMutation`, `ctx.runAction` to call functions from other functions
- Import with: `import { api, internal } from "./_generated/api";`
- If calling functions causes unexpected type errors, add type annotation: `const result: string = await ctx.runQuery(api.module.function, { arg });`
- Actions can't directly access DB - use `ctx.runQuery` / `ctx.runMutation`

### Validators
- Always use an args validator for functions
- `v.bigint()` is deprecated - use `v.int64()` instead for signed 64-bit integers
- Use `v.record()` for defining a record type - `v.map()` and `v.set()` are not supported

### Queries
- **Do NOT use `filter`** - Instead, define an index in the schema and use `withIndex`
- Queries do NOT support `.delete()` - Instead, `.collect()` results, iterate, and call `ctx.db.delete(row._id)` on each
- Use `.unique()` to get a single document - throws error if multiple documents match
- When using async iteration, don't use `.collect()` or `.take(n)` - use `for await (const row of query)` syntax

### Mutations
- Use `ctx.db.replace` to fully replace an existing document
- Use `ctx.db.patch` to shallow merge updates into an existing document

### Advanced Features
- **Paginated queries**: `.paginate(paginationOpts)` with `paginationOptsValidator`
- **Scheduled tasks**: `ctx.scheduler.runAfter(delay, internal.module.function, args)` or `ctx.scheduler.runAt(timestamp, ...)`
- **Unique fields**: Enforce in mutation logic - indexes don't guarantee uniqueness
- **Soft delete**: Add `deletedAt: v.optional(v.number())` field instead of `.delete()`
- **System tables**: Access `_scheduled_functions` and `_storage` with `ctx.db.system.get` and `ctx.db.system.query`
- **Default query order**: Ascending by `_creationTime`

### File Uploads
1. Generate upload URL in mutation: `ctx.storage.generateUploadUrl()`
2. POST from client
3. Store ID (take `v.id("_storage")`)
4. Serve with `ctx.storage.getUrl(fileId)` in queries

### Convex Components (Install as Needed)
- Text search: docs.convex.dev/search/text-search
- Crons: docs.convex.dev/scheduling/cron-jobs
- Workflows (durable long-running code): convex.dev/components/workflow
- AI agent framework: convex.dev/components/agent
- Work queues: convex.dev/components/workpool
- Collaborative text editor sync: convex.dev/components/collaborative-text-editor-sync
- Twilio SMS: convex.dev/components/twilio-sms
- Polar billing: convex.dev/components/polar
- Rate limiting: convex.dev/components/rate-limiter
- Data migrations: convex.dev/components/migrations
- Sharded counter: convex.dev/components/sharded-counter
- Action cache: convex.dev/components/action-cache
- Aggregate operations: convex.dev/components/aggregate
- Runtime crons: convex.dev/components/crons

## TanStack Router

**Key Patterns:**
- Avoid `const search = useSearch()` - use `select` option instead
- Route params update quirks - preserve location when updating
- Search params as filters: validate with zod schema in route definition
- Navigate programmatically: `const navigate = useNavigate()` then `navigate({ to: '/path' })`
- Type-safe links: always use `<Link to="/path">` not `<a href>`
- Nested routes require parent to have `<Outlet />`, use `.index.tsx` files to show content at parent paths

## TanStack Query + Convex Integration

**Integration Pattern:**
- Use `convexQuery()` from `@convex-dev/react-query` to create query options: `const queryOptions = convexQuery(api.module.function, { status: "active" })`
- Preload in route loaders: `loader: async ({ context: { queryClient } }) => await queryClient.ensureQueryData(queryOptions)`
- Use `useSuspenseQuery` in components: `const { data } = useSuspenseQuery(queryOptions)`
- For mutations, continue using Convex's `useMutation` directly

## TanStack Form + Zod v4

**No adapter needed** - TanStack Form natively supports Standard Schema libraries like Zod v4

**Form-level validation:**
```tsx
const schema = z.object({ name: z.string().min(1) });
const form = useForm({
  defaultValues: { name: "" },
  validators: { onChange: schema }
});
```

**Field errors** are StandardSchemaV1Issue[] with .message property:
```tsx
{!field.state.meta.isValid && (
  <em>{field.state.meta.errors.map(e => e.message).join(", ")}</em>
)}
```

**Number inputs** use valueAsNumber:
```tsx
onChange={(e) => field.handleChange(e.target.valueAsNumber)}
```

**Key Patterns:**
- Field validation can override form validation - design hierarchy carefully
- Submit handler: `onSubmit: async ({ value }) => { await mutate(value); form.reset(); }`
- Disable during submit: `<button disabled={!form.state.canSubmit || form.state.isSubmitting}>`
- Async validation: use `onChangeAsync` for server-side checks

## DaisyUI 5 Styling

### Class Organization
- `component`: Main class (btn), `part`: Child elements (card-title), `style`: Visual variants (btn-outline)
- `behavior`: State (btn-active), `color`: Colors (btn-primary), `size`: Sizes (btn-lg)
- `placement`: Position (dropdown-top), `direction`: Orientation (menu-horizontal), `modifier`: Special (btn-wide)

### Critical v4 → v5 Changes
- **btm-nav** → **dock** (bottom navigation now uses dock classes)
- **btn-group / input-group** → **join** + **join-item** on each child
- **form-control / label-text** → (removed) - use fieldset/legend or new form-group utilities
- **input-bordered / select-bordered** → (removed) - base classes include border; use `--ghost` variants for no border
- **.menu** (vertical) no longer w-full by default → add w-full if you need full width

### Key Components Reference
When using a component you aren't familiar with, always check its docs page.
- **dock**: Bottom navigation bar with `dock-label` parts ([docs](https://daisyui.com/components/dock/))
- **filter**: Radio button groups with `filter-reset` for clearing selection ([docs](https://daisyui.com/components/filter/))
- **list**: Vertical layout for data rows using `list-row` class for each item
- **fieldset**: Form grouping with `fieldset-legend` for titles and `label` for descriptions
- **floating-label**: Labels that float above inputs when focused, use as parent wrapper
- **Modal**: Use with HTML dialog ([docs](https://daisyui.com/components/modal/))
- **Drawer**: Grid layout with sidebar toggle using `drawer-toggle` checkbox ([docs](https://daisyui.com/components/drawer/))

### Usage Rules
- Responsive patterns: `lg:menu-horizontal`, `sm:card-horizontal`
- Prefer daisyUI colors (`bg-primary`) over Tailwind colors (`bg-blue-500`) for theme consistency
- Use `*-content` colors for text on colored backgrounds
- Typography plugin adds default margins to headings (h1, h2, h3, etc.) - use `mt-0` to override when precise spacing is needed

### Color System
- Semantic colors: `primary`, `secondary`, `accent`, `neutral`, `base-100/200/300`
- Status colors: `info`, `success`, `warning`, `error`
- Each color has matching `-content` variant for contrasting text
- Custom themes use OKLCH format, create at [theme generator](https://daisyui.com/theme-generator/)

## TypeScript Best Practices

- **Avoid `any` type**: Always use strict typing. Use `unknown` for truly unknown types, then narrow with type guards
- **Write tests when adding strict types**: When changing from `any` to strict types, write unit tests to verify no functionality broke
- **Use type narrowing**: Check for null/undefined before accessing properties (`if (value) { value.property }`)
- **Prefer interfaces for objects**: Use `interface` for object shapes, `type` for unions/intersections
- **Never leave floating promises**: Use `void` when intentionally not awaiting (`void someAsyncFunction()`)

## Other Guidelines

- When stuck: check official docs first (docs.convex.dev, tanstack.com, daisyui.com)
- Verify responsive design at multiple breakpoints
- Document non-obvious implementation choices in this file
- Import icons from `lucide-react`
- When making identical changes to multiple occurrences, use Edit with `replace_all: true` instead of MultiEdit. Avoid MultiEdit whenever possible, it is unreliable.

## Current V2 Implementation

**Role Management System:**
- V2 Tag-Based Permissions: Staff tags (workerTag, managerTag, instructorTag, toolHandlerTag) and customer tags (rentalApprovedTag)
- Role Emulation: Dev users can test different permission combinations
- Edit Roles Interface: Search, filter, and modify user roles with tag toggles
- Staff Promotion/Demotion: Convert customers to staff and vice versa

**LUZ Calendar System:**
- Timeline Views: Day (vertical), week, and month calendar views
- Shift Management: Create shift templates with hourly requirements
- Assignment System: Worker assignments with dual approval workflows
- Calendar Integration: Shifts, courses, and tool rentals display on unified timeline
- 7-Modal Workflow: ShiftDetailsModal, CreateEditShiftModal, RequestJoinShiftModal, AssignWorkerModal, EditAssignmentModal, ApproveAssignmentModal, ReviewRequestModal

**Educational System:**
- Course Management: Create courses with instructors, capacity, and schedules
- Multi-Meeting Support: course_sessions table for multi-meeting courses with independent session scheduling
- Enrollment Workflow: Student enrollment with instructor approval
- Role Integration: Instructor tag permissions for course management

**Tool Rental System:**
- Inventory Management: Tool catalog with availability tracking
- Rental Workflow: Customer requests, staff approval, rental lifecycle
- Manual Rentals: Tool handlers can create rentals for walk-in (non-registered) customers
- Calendar Integration: Active rentals display on LUZ timeline

**Key Files:**
- `convex/users_v2.ts`: User management with V2 permissions
- `convex/shifts.ts`: Shift template backend
- `convex/shift_assignments.ts`: Assignment management
- `convex/courses_v2.ts`: Course backend with course_sessions support
- `convex/tools.ts`: Tool rental backend
- `src/routes/luz.tsx`: Main LUZ calendar page
- `src/routes/roles.tsx`: Role management interface
- `src/routes/educational.tsx`: Educational courses page
- `src/routes/tools.tsx`: Tool rental interface
- `src/components/modals/*`: 13 modal components for workflows

**Authentication & Permissions (V2 System):**
- **Staff + Worker Tag**: Access to LUZ calendar, shift management
- **Staff + Manager Tag**: Approval workflows, requires worker tag
- **Staff + Instructor Tag**: Course creation and management
- **Staff + Tool Handler Tag**: Tool inventory and rental approval
- **Customer + Rental Approved Tag**: Can request tool rentals
- **Guest**: Public browsing only
