# LUZ Shift System

📍 **Navigation:**
- **Parent**: [../architecture.md](../architecture.md) - V2 architecture
- **Project Status**: [../status.md](../status.md)

**Purpose**: Documentation of LUZ shift scheduling - what works, what doesn't, what's missing.

**Status**: Core functional with real-time backend. Advanced features missing.

---

## What Works

- ✅ Shift templates with recurring days
- ✅ Shift template editing (update name, time, days, capacity)
- ✅ Worker assignments with dual approval
- ✅ 7-modal workflow system
- ✅ Day/Week/Month timeline views
- ✅ Real-time Convex backend
- ✅ Tag-based permissions

## What Doesn't Work

- ❌ No non-recurring shifts (all must repeat on specified days)
- ❌ No shift instance exceptions (cannot modify single occurrence - only template)
- ❌ No conflict detection
- ❌ No capacity enforcement
- ❌ Hourly requirements in schema but unused by UI
- ❌ No notifications
- ❌ No time tracking
- ❌ No bulk operations

---

## Part 1: Backend Logic

### Database Schema

**Files**: [convex/schema.ts](../convex/schema.ts), [convex/shifts.ts](../convex/shifts.ts), [convex/shift_assignments.ts](../convex/shift_assignments.ts)

#### shifts table (Shift Templates)

Shift templates define recurring patterns. Example: "Morning Shift runs Monday-Friday 8AM-2PM".

**Key Fields**:
- `name`, `description`, `type`
- `storeHours`: `{openTime, closeTime}` (when shop is open on days this shift runs)
- `recurringDays`: array of weekday names (required - no one-time shifts)
- `hourlyRequirements`: array of time ranges with min/optimal worker counts (UNUSED by UI)
- `color`, `isActive`, `createdBy`, `lastModified`

**Critical Distinction**:
- **Shift Template** = recurring pattern (e.g., "Daily Operations: Mon-Fri 8AM-8PM")
- **Shift Instance** = specific occurrence on a date (e.g., "Daily Operations on Oct 28, 2025")
- Currently: Can edit template (affects all future instances), **cannot edit single instance**

**Limitations**:
- All shifts must be recurring (cannot create one-time shifts)
- No instance-level modifications (editing template changes all occurrences)
- Hourly requirements exist but UI doesn't use them

#### shift_assignments table (Worker Assignments)

Worker assignments to specific shift instances on specific dates.

**Key Fields**:
- `shiftTemplateId`, `workerId`, `date` (which shift template, which worker, which day)
- `assignedHours`: array of time ranges (worker can work partial hours within shift)
- `status`: pending_worker_approval, pending_manager_approval, confirmed, rejected, cancelled
- `assignmentType`: manager_assigned (manager→worker needs approval) or worker_requested (worker→manager needs approval)
- `assignedBy`, `assignedAt`, `confirmedAt`, `notes`

**Critical Distinction**:
- Assignment is always to a **specific instance** (shift template + date)
- Worker time can differ from shift template time (e.g., shift is 8AM-8PM, worker assigned 8AM-2PM)

**Limitations**:
- No conflict validation (can assign same worker to overlapping times)
- No capacity checks (can exceed shift's required/max workers)
- No break periods
- Deleting shift template doesn't cascade delete assignments (orphans)

### Backend Operations

**Files**: [convex/shifts.ts](../convex/shifts.ts), [convex/shift_assignments.ts](../convex/shift_assignments.ts)

#### Shift Template Management

**`createShiftTemplate`** (manager only)
- Creates recurring shift pattern
- Requires: name, time, recurring days, capacity
- Sets createdBy to current user

**`updateShiftTemplate`** (manager only, line 347)
- Modifies shift template fields
- Changes apply to all future instances
- **Does NOT allow modifying single instance** (no exception system)

**`deleteShift`** (manager only)
- Removes shift template
- **Does NOT cascade delete assignments** - orphaned assignments remain

**`getShiftsForDate`**
- Returns shifts where recurringDays includes the target day of week

#### Assignment Management

**`assignWorkerToShift`** (manager only)
- Creates assignment: status "pending_worker_approval", type "manager_assigned"
- No conflict/capacity validation

**`requestJoinShift`** (worker)
- Creates assignment: status "pending_manager_approval", type "worker_requested"
- No validation

**`approveAssignment`** (worker or manager depending on status)
- Changes status to "confirmed"

**`rejectAssignment`** / **`cancelAssignment`**
- Status → rejected or cancelled

**`getAssignmentsForDate`** / **`getPendingAssignments`**
- Query assignments

#### Missing Features
- ❌ Create one-time shift (non-recurring)
- ❌ Edit single shift instance (exception to template)
- ❌ Conflict detection
- ❌ Capacity enforcement
- ❌ Bulk approval
- ❌ Shift switching

### Permissions

**Files**: [convex/users_v2.ts](../convex/users_v2.ts), [src/hooks/usePermissionsV2.ts](../src/hooks/usePermissionsV2.ts)

**Worker Tag**: View shifts, request assignments, approve manager assignments to self
**Manager Tag**: Create/edit/delete shift templates, assign workers, approve all requests
**Dev Role**: Full access

**Gaps**: Minimal backend enforcement, no shift ownership, Manager tag should require Worker tag (not enforced)

---

## Part 2: User Interface

### Timeline Views

**File**: [src/routes/luz.tsx](../src/routes/luz.tsx) - Main page with queries and modal state

**Real-Time Integration**: All views use `useQuery(api.shifts.getShiftsForDate)` and `useQuery(api.shift_assignments.getAssignmentsForDate)` for live data.

#### Day View
**Component**: [src/components/LUZVerticalTimeline.tsx](../src/components/LUZVerticalTimeline.tsx)

Vertical hourly timeline. Shifts as blocks, workers as badges. Click → ShiftDetailsModal.

**Issues**: No status colors, no staffing counts, no click-to-create

#### Week View
**Component**: [src/components/LUZWeekView.tsx](../src/components/LUZWeekView.tsx)

7-column grid. Shift cards per day.

**Issues**: No capacity indicators, poor overlap handling

#### Month View
**Component**: [src/components/LUZMonthView.tsx](../src/components/LUZMonthView.tsx)

Calendar grid with shift badges. Click date → day view.

**Issues**: Badges tiny, minimal info

### Overview Sidebar

**Component**: [src/components/LUZOverview.tsx](../src/components/LUZOverview.tsx)

Date navigation, view switcher, pending approvals count, statistics.

**Issues**: No action list, stats incomplete

**Performance Note**: Week/month views fire 7-30+ parallel queries.

---

## Part 3: 7-Modal System

**Location**: [src/components/modals/](../src/components/modals/), state in [src/routes/luz.tsx](../src/routes/luz.tsx)

### 1. ShiftDetailsModal
[ShiftDetailsModal.tsx](../src/components/modals/ShiftDetailsModal.tsx)

View shift details and assigned workers. Role-based actions.

**Gaps**: Edit shifts template, no hourly requirements display

### 2. CreateEditShiftModal
[CreateEditShiftModal.tsx](../src/components/modals/CreateEditShiftModal.tsx)

Create/edit shift templates. Form for name, time, days, capacity.

**Works**: Create and edit modes functional
**Gaps**: No hourly requirements UI, no one-time shift option

### 3. RequestJoinShiftModal
[RequestJoinShiftModal.tsx](../src/components/modals/RequestJoinShiftModal.tsx)

Worker requests assignment. Time range selection.

**Gaps**: No conflict warnings, no capacity check

### 4. AssignWorkerModal
[AssignWorkerModal.tsx](../src/components/modals/AssignWorkerModal.tsx)

Manager assigns worker. Worker dropdown, time selection.

**Gaps**: No conflict filtering, no bulk assign

### 5. EditAssignmentModal
[EditAssignmentModal.tsx](../src/components/modals/EditAssignmentModal.tsx)

Modify assignment time/notes.

**Gaps**: Partially implemented, re-approval incomplete

### 6. ApproveAssignmentModal
[ApproveAssignmentModal.tsx](../src/components/modals/ApproveAssignmentModal.tsx)

Worker approves manager assignment.

**Gaps**: No counter-proposal

### 7. ReviewRequestModal
[ReviewRequestModal.tsx](../src/components/modals/ReviewRequestModal.tsx)

Manager reviews worker requests in bulk.

**Gaps**: Bulk approve not functional

---

## Critical Concepts

### Shift Templates vs. Instances

**Template**: Recurring pattern stored in database
- Example: "Daily Operations" runs Mon-Fri, 8AM-8PM
- Editing template affects all future occurrences
- Cannot create template-less instances (no one-time shifts)

**Instance**: Specific occurrence on a date
- Example: "Daily Operations" on October 28, 2025
- Generated dynamically when viewing calendar
- Cannot be edited independently (no exception system)

**Current System**:
- ✅ Can edit template (changes all instances going forward)
- ❌ Cannot create one-time shift (no template-less instances)
- ❌ Cannot edit single instance (no "on Oct 28 only, start at 9AM instead of 8AM")

### Dual Approval Workflow

Two assignment flows, both require both parties to consent:

**Manager-Initiated**:
1. Manager assigns worker → status: pending_worker_approval
2. Worker approves → status: confirmed

**Worker-Initiated**:
1. Worker requests shift → status: pending_manager_approval
2. Manager approves → status: confirmed

Both flows create identical assignment records, just different initial status.

---

## Missing Features

### High Priority
- Conflict detection (overlapping assignments)
- Capacity enforcement (max workers)
- One-time shifts (non-recurring)
- Shift instance exceptions (edit single occurrence)
- Loading/error states in UI
- Status-based visual indicators

### Medium Priority
- Bulk operations
- Worker shift switching
- Notifications
- Time tracking
- Hourly requirements UI

### Low Priority
- Break period management
- Shift templates/presets
- Reporting/analytics

---

## File Reference

### Backend
- [convex/schema.ts](../convex/schema.ts)
- [convex/shifts.ts](../convex/shifts.ts)
- [convex/shift_assignments.ts](../convex/shift_assignments.ts)
- [convex/users_v2.ts](../convex/users_v2.ts)

### Frontend - Main
- [src/routes/luz.tsx](../src/routes/luz.tsx)

### Frontend - Timeline
- [src/components/LUZOverview.tsx](../src/components/LUZOverview.tsx)
- [src/components/LUZVerticalTimeline.tsx](../src/components/LUZVerticalTimeline.tsx)
- [src/components/LUZWeekView.tsx](../src/components/LUZWeekView.tsx)
- [src/components/LUZMonthView.tsx](../src/components/LUZMonthView.tsx)

### Frontend - Modals
- [src/components/modals/ShiftDetailsModal.tsx](../src/components/modals/ShiftDetailsModal.tsx)
- [src/components/modals/CreateEditShiftModal.tsx](../src/components/modals/CreateEditShiftModal.tsx)
- [src/components/modals/RequestJoinShiftModal.tsx](../src/components/modals/RequestJoinShiftModal.tsx)
- [src/components/modals/AssignWorkerModal.tsx](../src/components/modals/AssignWorkerModal.tsx)
- [src/components/modals/EditAssignmentModal.tsx](../src/components/modals/EditAssignmentModal.tsx)
- [src/components/modals/ApproveAssignmentModal.tsx](../src/components/modals/ApproveAssignmentModal.tsx)
- [src/components/modals/ReviewRequestModal.tsx](../src/components/modals/ReviewRequestModal.tsx)

### Frontend - Hooks
- [src/hooks/usePermissionsV2.ts](../src/hooks/usePermissionsV2.ts)

---

**Last Updated**: October 28, 2025
**Replaces**: SHIFT_REDESIGN.md, SHIFTS_IMPLEMENTATION.md, LUZ_CALENDAR_REDESIGN.md
