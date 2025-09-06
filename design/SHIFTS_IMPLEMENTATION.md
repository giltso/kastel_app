# Shifts System Implementation Issues

**Date:** 2025-09-02  
**Status:** INITIAL IMPLEMENTATION COMPLETE - ISSUES IDENTIFIED  

## areas in need of major improvement

### 1. **Calendar Integration**
- week view is not consecutive, segmented instead
- shifts need to contain other events inside them. 
  - some events are exempt, but that is the defalult
- the shift tab is not syncronized with the LUZ tab in tools and uses
- no easy viewing of who is on shift
- no switch button between workers 

### 2. **Assignment Functionality Broken**
- assignment by manager should pop the user out of possible assignments.
- assignments should look like toggles instead of like forms.
- signing in should not be possible if already on shift instead should have a switch out button.

### 3. **Non-Recurring Shifts Not Yet Supported**
- shifts should differ from events in regular use case.
  - reucuring shifts should be implamented as reucuring events
  - if a change to a specific shift is done, it should be treated as a unique event that replaces the shift
  so the database should of both in the same system. 
  - shifts should exist in the database only for 2 weeks in advance, and if there are assigned workers should be saved indefenatly.

## 🔧 TECHNICAL NOTES - for claude to update

### Database Changes Needed
- Make `recurringDays` optional in shifts schema
- Update day enum order to start with Sunday
- Consider adding `isRecurring` boolean to shifts table

### Backend Updates
- Fix assignment mutation calls
- Add non-recurring shift support
- Implement hours calculation queries

### Frontend Updates  
- Integrate shifts into calendar component
- Update all day-of-week components to Sunday-first
- Replace Events navigation with Shifts
- Add hours reporting components


## COMPLETED IMPLEMENTATION 

### 🚀 MAJOR FEATURES COMPLETED (Previous Sessions)
- **Database Schema:** Complete with 4 tables (shifts, shift_assignments, shift_swaps, golden_time_requests)
- **Backend API:** Full CRUD operations and capacity management in `convex/shifts.ts`
- **UI Components:** CreateShiftModal, ShiftCard, shifts page with status indicators
- **Navigation:** Shifts tab added to worker portal
- **Permission System:** Manager-only creation, worker self-assignment
- **Status Calculation:** Real-time bad/close/good/warning indicators based on capacity

### ✅ CALENDAR INTEGRATION COMPLETED 2025-09-06
1. **Consecutive Week View** - Fixed week view to show consecutive dates instead of segmented view
2. **Shift-Event Nesting** - Implemented shifts as containers that can hold other events inside them
3. **Worker Visibility** - Added easy viewing of who is currently on shift with avatars and status indicators
4. **Shift Switching** - Added switch button functionality for workers to request shift swaps through UI
5. **Calendar Synchronization** - Shifts tab now synchronized with LUZ tab for consistent user experience
