# Next Session Action Plan - Updated September 13, 2025

## ✅ COMPLETED IN CURRENT SESSION
- **Shift Positioning Fix**: Resolved critical calendar day view positioning where shifts were incorrectly displaying side-by-side instead of proper overlap logic
- **Calendar Events Display**: Fixed backend filter settings to show all event types (events, shifts, tools) by default with UI-controlled filtering
- **Algorithm Correction**: Morning and Evening shifts now correctly share the same column position since they don't overlap in time

## 🎯 REMAINING SESSION GOALS
**Complete shifts functionality and polish calendar integration**

## ⚠️ PRIORITY ISSUES TO RESOLVE

### 1. **SHIFT ASSIGNMENT FUNCTIONALITY** (HIGH PRIORITY)
**Problem:** Workers and managers need to be able to assign to shifts from calendar
**Current State:** Shifts display correctly but assignment workflow needs testing
**Required Actions:**
- [ ] Test `assignWorkerToShift` mutation calls end-to-end
- [ ] Verify self-assignment workflow from calendar clicks
- [ ] Test manager assignment workflow  
- [ ] Add proper error handling and user feedback
- [ ] Test with different user roles (worker/manager/dev)

### 2. **WEEK START CONFIGURATION** (MEDIUM PRIORITY)
**Issue**: Potential Sunday vs Monday week start causing alignment problems
**Investigation Needed**:
- [ ] Verify shift creation uses same week start as calendar display
- [ ] Check recurring shift generation logic alignment
- [ ] Ensure consistent week start across all components
- [ ] Test calendar grid column alignment

### 3. **CALENDAR INTERACTION ENHANCEMENTS** (MEDIUM PRIORITY)
**Requirements:**
- [ ] Enable click-to-assign directly from calendar shift blocks
- [ ] Improve shift capacity status display on calendar
- [ ] Test integration with existing drag-and-drop system
- [ ] Add visual feedback for assignment actions

## 🔧 SECONDARY IMPROVEMENTS

### 4. **NON-RECURRING SHIFT SUPPORT**
**Current:** All shifts must be recurring  
**Required:**
- [ ] Make `recurringDays` optional in schema
- [ ] Add `isRecurring` boolean to shifts table
- [ ] Update CreateShiftModal with one-time option
- [ ] Modify backend logic for single-day shifts

### 5. **NAVIGATION SIMPLIFICATION**
**Problem:** Events tab may be redundant with Shifts system
**Changes:**
- [ ] Evaluate if Events tab should be removed
- [ ] Consider redirecting `/events` to `/shifts` or keep both
- [ ] Update permissions and role-based navigation
- [ ] Test all user role navigation flows

### 6. **WORKER HOURS REPORTING**
**Requirements:**
- [ ] Create hours calculation backend queries
- [ ] Build date range selector component
- [ ] Implement total hours summary view
- [ ] Add calendar view with daily hours display

## 📋 TESTING CHECKLIST

### End-to-End Workflows
- [x] **Calendar Display** → Shifts appear correctly positioned
- [ ] **Worker Self-Assigns** → Can join shift from calendar, capacity updates
- [ ] **Manager Assigns Worker** → Can assign others, notifications work
- [ ] **Calendar Assignment Clicks** → Clickable shifts, assignment workflow works
- [ ] **Capacity Management** → Status indicators accurate, limits enforced
- [ ] **Week Alignment** → Sunday-first consistent throughout components

### Role-Based Testing
- [ ] **As Manager/Dev:** Can create shifts, assign workers, view all data
- [ ] **As Worker:** Can self-assign from calendar, view own assignments
- [ ] **As Guest/Customer:** Cannot access shifts (proper permissions)

## 🚀 SUCCESS CRITERIA

### Minimum Viable
1. **✅ Calendar Display Fixed** - Shifts position correctly in day view
2. **Assignment Workflow** - Workers and managers can assign to shifts from calendar
3. **Week Alignment Verified** - Consistent week start throughout system

### Complete Success  
4. **One-Time Shifts** - Support for non-recurring shifts
5. **Simplified Navigation** - Clean UX with appropriate tabs
6. **Hours Reporting** - Basic worker hours tracking functional

## 🔍 DEBUGGING PRIORITIES

### Start Here
1. **Test assignment mutations** - Use browser console, check Convex dashboard
2. **Verify calendar click handlers** - Ensure shift assignment workflow works
3. **Check week start consistency** - Verify alignment across all components
4. **Database inspection** - Verify data being written to assignments table

### If Assignment Works
5. **Polish visual feedback** - Assignment confirmations, status updates
6. **Test edge cases** - Capacity limits, role permissions
7. **Performance optimization** - Calendar rendering with many shifts

## ⏰ TIME ALLOCATION ESTIMATE

- **Assignment Testing & Fixes:** 30-45 minutes
- **Week Start Verification:** 20-30 minutes  
- **Calendar Click Workflow:** 30-45 minutes
- **Testing & Polish:** 30 minutes

**Total Estimated Time:** 2-2.5 hours for remaining core functionality

## 📝 DOCUMENTATION STATUS

- [x] Shift positioning fix documented in session notes
- [ ] Update PROJECT_OVERVIEW.md with calendar completion status
- [ ] Document assignment workflow in user guides
- [ ] Update API documentation for shifts system

---

**Next Priority:** Focus on assignment functionality testing - the display layer is now working correctly, time to ensure the interaction layer works properly.

*Updated: Session September 13, 2025 - Shift positioning resolved*