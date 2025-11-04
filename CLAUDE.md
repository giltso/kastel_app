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
- **Error handling is expected** - User-friendly messages, graceful failures, proper validation

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
   - `design/status.md` - Read always, update after major changes
   - `design/session_history.md` - Read last 2 sessions for context, update current session when complete
   - Feature-specific docs (e.g., `design/SHIFTS_IMPLEMENTATION.md`) - Read all if working on that feature

2. **If approaching 5-hour limit**: Update documentation before doing anything else, add current todo list to status.md

#### Context Compacting Before Big Features

**When to initiate context compact:**
- Before starting a major new feature that will take multiple sessions
- When conversation history is long and contains completed work no longer needed
- Before switching to a completely different area of the codebase (only if the new work will be substantial/multi-session)
- When planning a significant refactor or architectural change

**How to request:**
Ask the user: "This looks like a major feature. Should I initiate a context compact before we begin? This will create a clean summary of current state while preserving relevant history."

**What gets preserved:**
- Current implementation status from status.md
- Recent session history (last 1-2 sessions)
- Pending tasks and known issues
- Key architectural decisions
- Current branch state and uncommitted work

**What gets compressed:**
- Detailed implementation discussions from completed features
- Resolved bugs and their fixes
- Outdated approaches that were abandoned
- Verbose troubleshooting sessions

**Benefits:** Faster responses, clearer focus, reduced tokens, better feature organization.

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
   - Update status.md implementation status
   - Mark TodoWrite tasks as completed

#### Documentation Standards
- **status.md**: Central project state, update after major feature completion
- **session_history.md**: Historical context, update at end of each session with achievements and issues
- **Feature docs**: Detailed implementation notes, update during development
- **CLAUDE.md**: Technical guidelines (this file), update when adding new patterns or practices

#### New Feature Documentation
When creating feature-specific documentation, use `design/SHIFTS_IMPLEMENTATION.md` as template structure.

### Documentation Navigation

**Document Hierarchy:**
```
CLAUDE.md (Technical Guidelines) ← You are here
    └── design/status.md (Project State & Implementation Status)
        └── design/REDESIGN_V2.md (Main V2 Architecture & Role System)
            ├── design/SHIFT_REDESIGN.md (Shift Philosophy & Database Schema)
            │   ├── design/SHIFTS_IMPLEMENTATION.md (Code Implementation & Modals)
            │   └── design/LUZ_CALENDAR_REDESIGN.md (Complete LUZ UI Specs)
            └── [Other Feature Docs]
```

**Quick Navigation:**
- **Technical Guidelines**: CLAUDE.md (this file) - Coding standards, Git workflow, TDD, testing
- **Project Status**: [design/status.md](design/status.md) - Current implementation, priorities, roadmap
- **Session History**: [design/session_history.md](design/session_history.md) - Development timeline (read last 2 sessions)
- **V2 Architecture**: [design/REDESIGN_V2.md](design/REDESIGN_V2.md) - Role system, high-level design
- **Shift System**: [design/SHIFT_REDESIGN.md](design/SHIFT_REDESIGN.md) - Population-based architecture
- **LUZ Interface**: [design/LUZ_CALENDAR_REDESIGN.md](design/LUZ_CALENDAR_REDESIGN.md) - Complete UI specifications
- **Implementation**: [design/SHIFTS_IMPLEMENTATION.md](design/SHIFTS_IMPLEMENTATION.md) - Modal system, backend integration

**Document Purposes:**

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| CLAUDE.md | Technical standards & workflows | When patterns change |
| status.md | Current status & priorities | After major milestones |
| session_history.md | Development history | End of each session |
| REDESIGN_V2.md | V2 architecture & roles | During design changes |
| SHIFT_REDESIGN.md | Shift system design philosophy | When architecture evolves |
| SHIFTS_IMPLEMENTATION.md | Code-level implementation | During feature development |
| LUZ_CALENDAR_REDESIGN.md | Complete UI specifications | UI changes or new features |

**Navigation Tips:**
- Each design doc includes navigation links at the top pointing to parent/child documents
- Design docs reference related code files (e.g., `convex/shifts.ts`, `src/routes/luz.tsx`)
- When working on a feature, read parent design docs first, then implementation docs
- Always check if documentation exists before creating new files

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

### Database Migrations

**When Migrations Are Needed:**
- Removing fields from schema that exist in production data
- Changing field types (e.g., `string` to `number`)
- Renaming fields or tables
- Adding new required fields to existing documents
- Data cleanup operations (removing duplicate data, fixing malformed entries)

**The Correct Migration Workflow:**

**Real Example (Nov 4, 2025)**: The V2 schema cleanup attempted to remove V1 fields but production was never migrated, which would have crashed production. The `/prod-demo-testing` command caught this before deployment.

1. **Write Migration Function**
   - Use `internalMutation` for CLI execution (doesn't require auth)
   - Include rollback logic if possible
   - Log all changes for audit trail
   ```typescript
   export const migrateFieldName = internalMutation({
     args: {},
     handler: async (ctx) => {
       const allDocs = await ctx.db.query("tableName").collect();
       const toMigrate = allDocs.filter(doc => doc.oldField !== undefined);

       for (const doc of toMigrate) {
         await ctx.db.patch(doc._id, {
           newField: doc.oldField,
           oldField: undefined, // Remove old field
         });
       }

       return {
         success: true,
         message: `Migrated ${toMigrate.length} documents`,
         total: allDocs.length
       };
     }
   });
   ```

2. **Add DEPRECATED Fields to Schema (Temporary)**
   - Mark old fields as optional in schema
   - Add comments: `// DEPRECATED - kept for migration, remove after migrateFieldName runs`
   - This allows import/export operations during testing
   ```typescript
   users: defineTable({
     newField: v.string(),
     // DEPRECATED - kept for migration
     oldField: v.optional(v.string()),
   })
   ```

3. **Test Migration with Production Data Clone**
   - Run `/prod-demo-testing` slash command
   - This exports production data, imports to dev, runs migration
   - Verifies no schema validation errors
   - Confirms migration works on real production data
   ```bash
   # See .claude/commands/prod-demo-testing.md for full workflow
   pnpx convex export --prod --path prod-data.zip
   pnpx convex import --replace prod-data.zip
   pnpx convex run tableName:migrateFieldName --admin-key dev
   ```

4. **Deploy Migration Code to Production**
   - Commit migration function + DEPRECATED schema fields
   - Deploy to production (code deployment)
   - **DO NOT remove migration code yet**
   - At this point, production schema accepts both old and new formats

5. **Run Migration on Production**
   - Execute migration explicitly with `--prod` flag
   ```bash
   pnpx convex run tableName:migrateFieldName --prod --admin-key prod
   ```
   - Verify output shows successful migration
   - Check production data is clean (no old fields remaining)

6. **Verify Migration Success**
   ```bash
   # Query production to verify old fields are gone
   pnpx convex run tableName:getAllRecords --prod | grep "oldField"
   # Should return nothing
   ```

7. **Deploy Cleanup (Remove DEPRECATED Fields)**
   - Create new branch: `chore/remove-migration-code`
   - Remove DEPRECATED fields from schema
   - Remove migration function
   - Commit and deploy final cleanup

**Common Migration Mistakes:**

❌ **Running migration on dev only, assuming it's "done"**
- Dev database ≠ Production database
- Always run migration on production explicitly with `--prod` flag

❌ **Removing migration code before running on production**
- Keep migration code in codebase through deployment
- Remove only after production migration verified successful

❌ **Deploying schema changes without migration function**
- Leads to schema validation errors on production
- All queries fail, application crashes

❌ **Not testing with production data clone**
- Production data may have edge cases dev doesn't
- Use `/prod-demo-testing` to catch issues before deployment

❌ **Not adding DEPRECATED fields temporarily**
- Import/export operations fail during testing phase
- Schema must accept both old and new formats during migration

**Best Practices:**

✅ **Use internalMutation for migrations** - Allows CLI execution without auth
✅ **Test with production data first** - Run `/prod-demo-testing` before deploying
✅ **Add DEPRECATED fields to schema temporarily** - Enables safe testing and gradual migration
✅ **Always include success/failure reporting** - Return migrated count and total count
✅ **Document migration in commit message** - Include "why", "what", and "next steps"
✅ **Keep migration code through production deployment** - Remove only after verification

**Migration Checklist:**
- [ ] Migration function written as `internalMutation`
- [ ] DEPRECATED fields added to schema (temporary)
- [ ] Tested with `/prod-demo-testing` on production data clone
- [ ] Migration code deployed to production
- [ ] Migration run on production with `--prod --admin-key prod`
- [ ] Production data verified clean (no old fields)
- [ ] Cleanup deployed (DEPRECATED fields removed)

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

## Internationalization (i18next)

**Stack**: i18next + react-i18next + i18next-browser-languagedetector + i18next-http-backend

### Supported Languages
- **English (en)**: Default fallback language, source of truth for all translations
- **Hebrew (he)**: Primary working language, RTL support enabled
- **Russian (ru)**: Structure in place, marked "Coming Soon"
- **French (fr)**: Structure in place, marked "Coming Soon"

### Directory Structure
```
public/locales/
  ├── en/          # English translations (complete)
  │   ├── common.json      # Shared UI elements, actions, errors
  │   ├── auth.json        # Authentication flows
  │   ├── shifts.json      # LUZ calendar, shift management
  │   ├── tools.json       # Tool rental system
  │   ├── courses.json     # Educational courses
  │   └── roles.json       # Role management
  ├── he/          # Hebrew translations (placeholder)
  ├── ru/          # Russian (empty structure)
  └── fr/          # French (empty structure)
```

### Configuration
- **Config file**: `src/i18n/config.ts`
- **Custom hook**: `src/hooks/useLanguage.ts` - Use this instead of raw `useTranslation()`
- **Component**: `src/components/LanguageSwitcher.tsx` - Language dropdown in header
- **RTL Detection**: Automatic `dir` attribute switching on `<html>` element
- **Language Detection**: Auto-detects from localStorage → navigator → HTML tag
- **Persistence**: User's language choice saved to localStorage as `i18nextLng`

### Usage in Components

**Import the custom hook:**
```tsx
import { useLanguage } from '@/hooks/useLanguage';

function MyComponent() {
  const { t, isRTL, currentLanguage } = useLanguage();

  return (
    <div>
      <h1>{t('common:app.name')}</h1>
      <p>{t('shifts:luz.subtitle')}</p>
      {isRTL && <span>RTL mode active</span>}
    </div>
  );
}
```

**Translation key format:**
- Use namespace prefix: `namespace:key.path`
- Examples:
  - `t('common:actions.save')` → "Save"
  - `t('auth:signIn')` → "Sign in"
  - `t('shifts:luz.title')` → "LUZ"
  - `t('tools:rental.status')` → "Rental Status"

### Best Practices

1. **Always use namespaces** - Never put all strings in one file
   - `common.json`: Shared across app (nav, actions, errors, time)
   - Feature-specific: One namespace per major feature

2. **Organize translations hierarchically**:
   ```json
   {
     "shift": {
       "title": "Shift",
       "createShift": "Create Shift",
       "staffing": {
         "minWorkers": "Min Workers",
         "optimalWorkers": "Optimal Workers"
       }
     }
   }
   ```

3. **Use the custom `useLanguage()` hook** instead of raw `useTranslation()`
   - Provides `isRTL` and `direction` for layout adjustments
   - Provides `currentLanguage` for conditional logic
   - Provides `changeLanguage()` function

4. **Handle pluralization properly**:
   ```json
   {
     "itemCount": "{{count}} item",
     "itemCount_other": "{{count}} items"
   }
   ```

5. **Interpolation for dynamic values**:
   ```tsx
   t('common:messages.greeting', { name: user.name })
   // Translation: "Hello, {{name}}!"
   ```

6. **Date/time formatting** - Use locale-aware formatting:
   ```tsx
   new Date(dateString).toLocaleDateString(currentLanguage, options)
   ```

7. **RTL Layout Considerations**:
   - Use CSS logical properties: `margin-inline-start` instead of `margin-left`
   - Test with Hebrew to verify RTL layout
   - Icons may need mirroring (arrows, chevrons)
   - Some elements should NOT mirror (logos, certain icons)

8. **Adding new translations**:
   - Add to English first (source of truth)
   - Use proper Hebrew text for RTL testing (not just placeholders)
   - Russian/French can remain empty until needed
   - Always use meaningful placeholder text that tests string length

9. **Translation file naming**: Must match namespace name
   - Namespace: `shifts` → File: `shifts.json`
   - Access: `t('shifts:key')`

10. **Never hardcode user-facing strings** - Always use translation keys
    - Exception: Developer tools, debug messages, console logs

### RTL (Right-to-Left) Support

**Automatic direction switching:**
- Hebrew triggers RTL mode automatically
- HTML `dir` attribute updated: `<html dir="rtl">`
- All text flows right-to-left
- No manual intervention needed in most cases

**Testing RTL:**
1. Switch to Hebrew in LanguageSwitcher
2. Verify text alignment is correct
3. Check that longer Hebrew strings don't break layout
4. Ensure icons point in correct direction
5. Verify modals, dropdowns, and menus mirror correctly

**Common RTL Issues:**
- Absolute positioning needs adjustment
- Custom margins/padding may need logical properties
- Flex layouts usually work fine with `dir` attribute
- Grid layouts may need `direction` CSS property

### Adding a New Language

1. Create directory: `public/locales/{language_code}/`
2. Copy all JSON files from `en/` directory
3. Translate each key (or leave empty)
4. Add language to `LANGUAGES` object in `src/i18n/config.ts`:
   ```typescript
   {
     code: {
       name: 'Language',
       nativeName: 'Native',
       dir: 'ltr',
       flag: '🇫🇷',
       comingSoon: false  // Remove when ready
     }
   }
   ```
5. If RTL language: Add code to `RTL_LANGUAGES` array

### Common Issues

**Missing translations:**
- Falls back to English automatically
- Check browser console for missing key warnings (in dev mode)
- Use `debug: true` in config during development

**Direction not switching:**
- Verify language is in `RTL_LANGUAGES` array
- Check that `i18n.on('languageChanged')` listener is working
- Inspect HTML element for `dir` attribute

**Translations not loading:**
- Verify JSON files are in `public/locales/` (not `src/`)
- Check file naming matches namespace
- Verify JSON is valid (no syntax errors)
- Check network tab for 404 errors on translation files

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
