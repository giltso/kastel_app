# System Architecture

📍 **Navigation:**
- **Parent**: [status.md](status.md) - Current project status
- **Technical**: [../CLAUDE.md](../CLAUDE.md) - Coding standards

**Feature Documentation:**
- [features/luz-shift-system.md](features/luz-shift-system.md) - Shift scheduling system
- [features/browser-text-editing.md](features/browser-text-editing.md) - Content management
- [features/test-design.md](features/test-design.md) - Testing strategy

**Purpose**: System design principles, role architecture, and integration patterns.

---

## Application Design

**Hardware Shop Management System** for small family-owned business. Designed for users with minimal technical expertise.

**Core Services**:
- Work scheduling (staff shifts, operational events)
- Tool rental (inventory, customer workflows)
- Course registration (educational offerings, enrollment)
- Customer interactions (orders, pickups)
- Reporting (work forms, operational reports)

**Design Principles**:
- Simplicity over features
- Role-based access (not feature-based)
- Single interface per user type
- Real-time collaboration where needed

---

## Role System Architecture

### Base + Tags Pattern

```
├── Guest (unauthenticated)
│   └── Home page access only
├── Staff (authenticated internal)
│   └── Tags (additive, combinable):
│       ├── Worker (operational staff)
│       ├── Instructor (teaching)
│       ├── Tool Handler (tool management)
│       └── Manager (requires Worker tag)
└── Customer (authenticated external)
    └── Tags (temporary, item-specific):
        ├── Student (per-course enrollment)
        └── Rental Approved (can request rentals)
```

**Key Concepts**:
- **Base roles**: Staff vs Customer (fundamental identity)
- **Tags**: Additive permissions, no conflicts
- **Requirement chains**: Manager requires Worker (enforced in UI, not backend)
- **Temporary tags**: Student/Rental tags granted per-item, not globally

### Permission Model

**Additive Only** - No role restrictions, only additions:
- Staff + Worker: Can work shifts
- Staff + Worker + Manager: Can work shifts + approve requests
- Staff + Customer: Would have both staff and customer access (future)

**Item-Specific Permissions**:
- Instructor tag: Can manage courses globally
- Course Writer: Per-course ownership (extends Instructor for that course only)
- Student tag: Not global - granted per successful enrollment
- Rental tag: Not "can rent" - it's "approved to request rentals"

**Permission Matrix**:
```
Feature          | Guest | Staff | +Worker | +Instructor | +Tool  | +Manager | Customer | +Rental
                 |       | Base  |         |             | Handler|          | Base     | Approved
-----------------|-------|-------|---------|-------------|--------|----------|----------|--------
Home Page        | ✓     | ✓     | ✓       | ✓           | ✓      | ✓        | ✓        | ✓
Tool Browsing    | ✗     | ✓     | ✓       | ✓           | ✓      | ✓        | ✓        | ✓
Course Browsing  | ✗     | ✓     | ✓       | ✓           | ✓      | ✓        | ✓        | ✓
LUZ (Scheduling) | ✗     | ✗     | ✓       | ✗           | ✗      | ✓        | ✗        | ✗
Tool Rentals     | ✗     | ✗     | ✗       | ✗           | ✓      | ✓        | ✗        | ✓
Course Mgmt      | ✗     | ✗     | ✗       | ✓           | ✗      | ✗        | ✗        | ✗
```

**Navigation Adapts**:
- Guest: Home only
- Customer: Home, Courses
- Staff+Worker: Home, LUZ, Courses
- Staff+Tool Handler: Home, Tools, Courses
- Staff+Manager: All tabs (requires Worker tag)

### Role Definitions

**Implementation**: [convex/users_v2.ts](../convex/users_v2.ts), [src/hooks/usePermissionsV2.ts](../src/hooks/usePermissionsV2.ts), [convex/schema.ts](../convex/schema.ts)

#### Base Roles

**Staff** (`isStaff: true`) - Internal employees. Base role provides authenticated access but no operational permissions until tags granted.

**Customer** - External users. Default authenticated role. Limited permissions, consumer-focused interfaces.

**Guest** - Unauthenticated public visitors. Home page access only.

**Dev** (`role: "dev"`) - System owner only (גיל צורן). Full access, debug tools, permission bypass. Never assigned to regular staff.

#### Staff Permission Tags

**Worker Tag** (`workerTag`) - LUZ scheduling access. View shifts, request assignments, manage personal schedule.

**Manager Tag** (`managerTag`) - Approval workflows, shift creation, worker assignment. **Requires Worker tag** (business rule).

**Instructor Tag** (`instructorTag`) - Create courses, approve enrollments, manage single-session and multi-meeting courses.

**Tool Handler Tag** (`toolHandlerTag`) - Tool inventory management, rental approval, manual rentals for walk-ins.

#### Customer Permission Tags

**Rental Approved Tag** (`rentalApprovedTag`) - Can submit rental requests. Granted after eligibility verification.

**Student Tag** (per-course) - Granted after enrollment approval for specific course. Not global.

### Business Rules

**Requirement Chains**:
- Manager requires Worker (enforced in UI, not backend)
- Instructor/Tool Handler require Staff
- Student/Rental require Customer

**Permission Composition**:
- Tags additive - no conflicts
- Staff + Worker + Manager + Tool Handler = all four permission sets
- Future: Staff + Customer would merge both (not implemented)

**Dev Role Separation**:
- Dev role only for system owner
- Gated by database role (not environment)
- Grants emulation and permission bypass

---

## System Integration

### LUZ - Unified Scheduling Hub

**Philosophy**: Single interface for all time-based activities.

**Integrated Systems**:
- **Primary**: Shift management (operational scheduling)
- **Secondary**: Tool rentals (shows active rentals on timeline)
- **Secondary**: Courses (shows scheduled sessions on timeline)
- **Future**: General events (after core proven)

**Architecture**:
- **70/30 split**: Overview sidebar (30%) + Timeline calendar (70%)
- **Three views**: Day (vertical), Week (grid), Month (calendar)
- **Role-adaptive**: Different capabilities for Base Staff, Worker, Instructor, Manager
- **Real-time**: Live capacity indicators, assignment tracking

**Design Decisions**:
- Dual approval workflows (manager↔worker consent required)
- Population-based shifts (hourly requirements, not fixed slots)
- No in-app notifications (external DM for now)
- Mobile-responsive with touch interactions

### Shift System Design

**Population Framework** - Not fixed shift types, but hourly staffing needs:
- Define hourly requirements (e.g., 8AM needs 2 workers, 2PM needs 3 workers)
- Managers assign workers to flexible time ranges
- System shows gaps/coverage in real-time
- Workers can request additional hours

**Flexible Accommodations**:
- Full-day workers (8AM-8PM)
- Split-shift workers (morning + evening, break midday)
- Partial workers (morning-only, afternoon-only)
- Offset workers (start 2hrs after open, end 2hrs before close)

**Workflows**:
- **Manager assigns**: Creates assignment → status: pending_worker_approval → worker approves → confirmed
- **Worker requests**: Creates request → status: pending_manager_approval → manager approves → confirmed
- **Worker switching**: Worker A → Worker B (external notification) → if B approves → manager approval → confirmed

**See** [features/luz-shift-system.md](features/luz-shift-system.md) for complete specifications.

### Tool Rental Integration

**Customer Flow**:
1. Browse tools (public info: availability, price)
2. Request booking (requires Rental Approved tag)
3. Manager reviews → approves or denies
4. If approved: customer picks up tool
5. Worker starts rental event (tracks time/cost)
6. Customer returns tool
7. Worker ends rental event
8. Cost settled, rental archived

**Staff Permissions**:
- Tool Handler tag: See inventory status, create issue tickets, process rentals
- Workers: View rental events, filter by approval level
- Managers: Approve booking requests

**LUZ Integration**: Active rentals appear on timeline (prevents tool conflicts with shifts).

### Course System Integration

**Instructor Model**:
- **Course Writer**: Creates course (gains ownership)
- **Helper Instructors**: Assigned to assist (can approve enrollments)
- **Writer-only**: Edit course details, manage helpers

**Student Flow**:
1. Browse courses (no special permission needed)
2. Request enrollment
3. Instructor approves
4. Student gains per-course access (not global Student tag)

**LUZ Integration**: Course sessions show on timeline (instructors see shift times for scheduling context).

---

## Database Architecture

**Implementation**: [convex/schema.ts](../convex/schema.ts)

### Core Tables

**users** - Tag-based role system:
- `isStaff` (boolean)
- `workerTag`, `instructorTag`, `toolHandlerTag`, `managerTag` (staff tags)
- `rentalApprovedTag` (customer tag)
- `role` (dev role for system owner only - not a user-facing role)
- Emulation fields for testing (dev role only)

**shifts** - Shift templates:
- Recurring pattern (days of week)
- Time boundaries (start/end)
- Hourly requirements (time ranges with min/optimal workers)
- Capacity targets (required/max workers for simple mode)

**shift_assignments** - Worker assignments:
- Links shift template + worker + specific date
- Flexible time ranges (worker can work partial hours)
- Dual approval status (pending_worker/manager_approval, confirmed)
- Assignment type (manager_assigned vs worker_requested)

**courses** + **course_sessions**:
- Course template with writer/helpers
- Individual sessions for multi-meeting courses
- Enrollment tracking per course

**tools** + **tool_rentals**:
- Tool inventory with ownership
- Rental workflows with approval
- Manual rentals for walk-in customers

### Schema Principles

**Separation**: Templates vs instances (shift template vs specific date assignment)
**Flexibility**: Time ranges not fixed (worker can work 8AM-2PM in 8AM-8PM shift)
**Status-driven**: Workflows tracked via status fields (pending → confirmed)
**No cascades**: Deleting template doesn't delete assignments (orphans allowed for now)

---

## Permission Enforcement

### Current State

**Frontend Only**:
- `usePermissionsV2()` hook checks tags
- UI conditionally renders based on permissions
- Role emulator for dev testing

**Backend Minimal**:
- Basic permission checks in some mutations
- No comprehensive validation
- No audit trail

### Gaps

**Missing Backend Enforcement**:
- ❌ Conflict detection (can double-book workers)
- ❌ Capacity validation (can exceed maxWorkers)
- ❌ Permission checks in all mutations
- ❌ Input validation and sanitization

**Missing Features**:
- ❌ Audit trail (who changed what when)
- ❌ Rate limiting
- ❌ Notification system

---

## Future Considerations

### Staff as Customer Edge Case

**Scenario**: Worker wants to rent tool for personal use, or Instructor enrolls in course as student.

**Additive Approach**: Customer + Staff + Worker should work naturally.
- No role restrictions
- Only additive permissions
- System designed to support multiple role combinations

*Not implemented yet but architecture supports it.*

### Planned Expansions

**Shift System**:
- Time tracking (check-in/out)
- Break period management
- Shift templates/presets
- Automatic assignment suggestions

**LUZ System**:
- General events (vanilla scheduling)
- Drag-and-drop assignment
- Bulk operations
- Real-time conflict detection

**Tool Rentals**:
- Damage tracking and owner notifications
- Late return warnings
- Maintenance scheduling

**Notification System**:
- Email/SMS for approvals
- Assignment change alerts
- Coverage gap warnings

---

## Technical Patterns

### Real-Time Data

**Convex Integration**:
- All views use `useQuery()` for live data
- Mutations trigger automatic re-renders
- No manual cache invalidation

**Performance**:
- Week view: 7 parallel queries (one per day)
- Month view: 30+ parallel queries (one per day)
- Conditional queries (skip when filter disabled)

### Modal Management

**Centralized State** (src/routes/luz.tsx):
- Single `activeModal` state
- Selected shift/assignment context
- 7 modals controlled from one place

**Workflow**: Timeline click → set modal state → modal opens → submit → backend mutation → close modal → refetch

**Issue**: No modal history, state lost when switching modals.

### Permission Hooks

**usePermissionsV2()** returns:
- Boolean flags: `hasWorkerTag`, `hasManagerTag`, etc.
- Derived permissions: `canCreateShift`, `canAssignWorkers`
- Emulation state (dev only)

**Usage**: Conditional rendering, button visibility, route protection.

---

**Last Updated**: October 28, 2025
**Replaces**: REDESIGN_V2.md (V1→V2 migration document, now obsolete)
