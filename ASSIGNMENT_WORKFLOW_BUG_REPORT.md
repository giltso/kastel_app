# LUZ Assignment Workflow - Critical Bug Report

**Date**: October 30, 2025
**Session**: 43
**Tester**: Claude Code
**Environment**: Development (localhost:5173)

---

## Executive Summary

**CRITICAL BUG FOUND**: The assignment approval workflow has a UI/UX bug where managers see approve/reject buttons for assignments they cannot approve, causing the approval to fail with a ConvexError.

**Impact**: Managers attempting to approve `pending_worker_approval` assignments in the production demo experience silent failures, making it appear that "assignments don't work."

---

## Bug Description

### What the User Reported
> "I used the production version today at a demo and went through the assignment pipeline. The result of this action did not create a shift assignment."

### What Actually Happens
1. Manager creates an assignment for a worker → Assignment is created with status `pending_worker_approval`
2. Assignment appears in manager's "Pending Approvals" section with **Approve/Reject buttons**
3. Manager clicks "Approve" button (אושר)
4. **Backend throws error**: `ConvexError: Assignment is not pending your approval`
5. Assignment remains in `pending_worker_approval` status
6. User perceives this as "assignments don't work"

---

## Root Cause Analysis

### Backend Logic (CORRECT)

**File**: `convex/shift_assignments.ts:335-342`

```typescript
if (assignment.status === "pending_worker_approval" && isAssignedWorker) {
  updates.status = "confirmed";
  updates.workerApprovedAt = Date.now();
} else if (assignment.status === "pending_manager_approval" && isManager) {
  updates.status = "confirmed";
  updates.managerApprovedAt = Date.now();
} else {
  throw new ConvexError("Assignment is not pending your approval");
}
```

**The dual approval system works correctly**:
- `pending_worker_approval` assignments can ONLY be approved by the assigned worker
- `pending_manager_approval` assignments can ONLY be approved by a manager
- Anyone else attempting to approve gets an error

### Query Logic (PROBLEMATIC)

**File**: `convex/shift_assignments.ts:156-166`

```typescript
if (isStaff && hasWorkerTag && hasManagerTag) {
  // Manager sees all pending assignments
  assignments = await ctx.db
    .query("shift_assignments")
    .filter((q) =>
      q.or(
        q.eq(q.field("status"), "pending_worker_approval"),
        q.eq(q.field("status"), "pending_manager_approval")
      )
    )
    .collect();
```

**The problem**: Managers see **ALL** pending assignments, including those pending worker approval (which they cannot approve).

### UI Logic (MISSING VALIDATION)

**File**: `src/components/LUZOverview.tsx:102-122`

```tsx
{pendingAssignments.slice(0, 3).map((assignment) => (
  <div key={assignment._id}>
    <button onClick={() => onApproveAssignment?.(assignment._id)}>
      Approve
    </button>
    <button onClick={() => onRejectAssignment?.(assignment._id)}>
      Reject
    </button>
  </div>
))}
```

**The problem**: UI shows approve/reject buttons for ALL pending assignments without checking:
- Who can actually approve them
- What status they have
- Whether the current user has permission

---

## Testing Evidence

### Database State
Ran `pnpx convex run shift_assignments:debugAssignmentStatuses`:

```json
{
  "totalAssignments": 16,
  "statusCounts": {
    "confirmed": 7,
    "pending_worker_approval": 1,
    "rejected": 8
  },
  "assignments": [
    {
      "_id": "jd73nkfs46f76mevjsqcfk0sxn7tfmkg",
      "workerName": "גיל צורן",
      "shiftName": "Daily Operations",
      "date": "2025-10-27",
      "status": "pending_worker_approval",
      "hasManagerApproval": true,
      "hasWorkerApproval": false
    }
  ]
}
```

**Key Finding**: Assignment exists with `pending_worker_approval` status and has manager approval but not worker approval.

### Browser Test
1. Signed in as manager (Claude Code with Staff+Worker+Manager tags)
2. Navigated to LUZ → Overview panel showed "ממתין לאישור (1)" (1 pending approval)
3. Displayed: גיל צורן assigned to Daily Operations with **Approve/Reject buttons**
4. Clicked "אושר" (Approve)
5. **Console Error**:
   ```
   [CONVEX M(shift_assignments:approveAssignment)] Server Error
   ConvexError: Assignment is not pending your approval
   at handler (../convex/shift_assignments.ts:342:4)
   ```

### Why This Happens
- Manager created assignment for גיל → Status: `pending_worker_approval`
- Manager tries to approve it → Backend correctly rejects (only גיל can approve)
- UI incorrectly shows approve button to manager

---

## Impact Assessment

### Production Demo Scenario
During the user's demo, they likely:
1. Created an assignment as a manager
2. Tried to immediately approve it (thinking they could finalize it)
3. Got silent error (no user-facing error message shown)
4. Believed the assignment wasn't created
5. Reported: "assignments don't work"

### User Experience Issues
1. **Confusing UI**: Manager sees buttons they can't use
2. **Silent Failure**: No clear error message in UI
3. **No Guidance**: User doesn't understand they need to wait for worker approval
4. **Broken Workflow**: In demo scenarios, manager can't self-approve unless they assign themselves

---

## Proposed Solutions

### Solution 1: Conditional Button Display (Recommended)
**Change**: Show approve/reject buttons ONLY when the current user can actually approve.

**Implementation**:
```tsx
{pendingAssignments.map((assignment) => {
  const canApprove = (
    (assignment.status === "pending_worker_approval" && assignment.workerId === currentUser._id) ||
    (assignment.status === "pending_manager_approval" && isManager)
  );

  return (
    <div key={assignment._id}>
      {canApprove ? (
        <>
          <button onClick={() => onApproveAssignment(assignment._id)}>Approve</button>
          <button onClick={() => onRejectAssignment(assignment._id)}>Reject</button>
        </>
      ) : (
        <div className="badge badge-warning">Awaiting approval</div>
      )}
    </div>
  );
})}
```

**Pros**:
- Clear UI - buttons only appear when actionable
- Prevents user confusion
- No backend changes needed

**Cons**:
- Managers can't see pending approvals they can't act on (but this is actually clearer)

### Solution 2: Filter Pending Assignments by Actionable Items
**Change**: Modify `getPendingAssignments` query to only return assignments the current user can approve.

**Implementation** (`convex/shift_assignments.ts:156-176`):
```typescript
if (isStaff && hasWorkerTag && hasManagerTag) {
  // Manager sees only assignments pending manager approval
  assignments = await ctx.db
    .query("shift_assignments")
    .filter((q) => q.eq(q.field("status"), "pending_manager_approval"))
    .collect();

  // ALSO get assignments where they are the assigned worker
  const workerAssignments = await ctx.db
    .query("shift_assignments")
    .withIndex("by_workerId", (q) => q.eq("workerId", user._id))
    .filter((q) => q.eq(q.field("status"), "pending_worker_approval"))
    .collect();

  assignments = [...assignments, ...workerAssignments];
}
```

**Pros**:
- Backend ensures only actionable items are shown
- UI automatically correct (no frontend changes needed)
- Clear separation of concerns

**Cons**:
- Managers lose visibility into assignments pending worker approval
- May want a separate "Monitoring" view for manager oversight

### Solution 3: Add Status Indicator + Disable Buttons
**Change**: Show all pending assignments but disable buttons with clear explanation.

**Implementation**:
```tsx
{pendingAssignments.map((assignment) => {
  const canApprove = /* check logic */;
  const statusLabel = assignment.status === "pending_worker_approval"
    ? "Waiting for worker approval"
    : "Waiting for manager approval";

  return (
    <div key={assignment._id}>
      <div className="badge">{statusLabel}</div>
      <button
        disabled={!canApprove}
        onClick={() => onApproveAssignment(assignment._id)}
      >
        Approve
      </button>
    </div>
  );
})}
```

**Pros**:
- Maintains visibility for managers
- Clear explanation of what's needed
- Educational for users

**Cons**:
- Cluttered UI
- Disabled buttons can be confusing ("why show it if I can't click it?")

---

## Recommendation

**Implement Solution 1** (Conditional Button Display) because:
1. Cleanest UX - only show actionable items
2. Fastest to implement
3. No backend changes required
4. Prevents user confusion

**Additionally**:
- Add a user-facing error toast when approval fails (catch the ConvexError in frontend)
- Add translation keys for assignment statuses (currently missing - shows raw keys like `assignment.pending_worker_approval`)
- Consider adding a "View All Assignments" section for managers that shows ALL assignments (pending and confirmed) for oversight purposes

---

## Related Issues Found

### Issue 2: Missing Translation Keys
**Console Errors**:
```
i18next::translator: missingKey he common time.to
i18next::translator: missingKey he shifts assignment.pending_worker_approval
```

**Fix**: Add to translation files:
- `public/locales/he/common.json`: `"time": { "to": "עד" }`
- `public/locales/he/shifts.json`: `"assignment": { "pending_worker_approval": "ממתין לאישור עובד", "pending_manager_approval": "ממתין לאישור מנהל" }`
- Same for English translations

### Issue 3: Pending Assignments Don't Count in Staffing Numbers
Week view shows "0/3" workers even when pending assignments exist with worker badges visible. This creates visual confusion about whether anyone is assigned.

**Options**:
- Count pending assignments: "1/3" (includes pending)
- Show split: "0+1/3" (0 confirmed + 1 pending)
- Different badge color for pending vs confirmed

---

## Files to Modify

1. **`src/components/LUZOverview.tsx`** - Add conditional button display logic
2. **`src/routes/luz.tsx`** - Add error toast for failed approvals
3. **`public/locales/he/common.json`** - Add `time.to` translation
4. **`public/locales/he/shifts.json`** - Add assignment status translations
5. **`public/locales/en/common.json`** - Add `time.to` translation
6. **`public/locales/en/shifts.json`** - Add assignment status translations

---

## Conclusion

**The assignment system backend works correctly**. The bug is a UI/UX issue where:
- Managers are shown buttons they can't use
- Errors fail silently without user feedback
- Status indicators are missing or show raw translation keys

This creates the perception that "assignments don't work" when in reality the dual approval workflow is functioning as designed - it just needs better UI to communicate the state to users.

The fix is straightforward: only show approve/reject buttons when the current user can actually approve the assignment, and add proper error handling with user-facing messages.
