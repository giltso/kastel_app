# Next Session Action Plan - September 2, 2025

## 🎯 SESSION GOAL
**Fix core shifts functionality and complete calendar integration**

## ⚠️ CRITICAL ISSUES TO RESOLVE

### 1. **FIX SHIFT ASSIGNMENT FUNCTIONALITY** (BLOCKING)
**Problem:** Workers and managers cannot actually sign in/assign to shifts  
**Current State:** UI exists but backend calls failing or incomplete  
**Required Actions:**
- [ ] Debug `assignWorkerToShift` mutation calls
- [ ] Test self-assignment workflow end-to-end  
- [ ] Verify manager assignment workflow
- [ ] Add proper error handling and user feedback
- [ ] Test with different user roles (worker/manager/dev)

### 2. **IMPLEMENT CALENDAR-SHIFTS INTEGRATION**
**Problem:** Shifts don't appear on calendar view  
**Requirements:**
- [ ] Display shifts as semi-transparent blocks on calendar
- [ ] Allow events to overlap with shifts  
- [ ] Enable click-to-assign directly from calendar
- [ ] Show shift capacity status on calendar blocks
- [ ] Integrate with existing drag-and-drop system

### 3. **FIX DAY-OF-WEEK ORDERING** 
**Problem:** Week starts Monday instead of Sunday  
**Scope:** Update throughout entire system  
**Files to Update:**
- [ ] `convex/schema.ts` - enum order in shifts table
- [ ] `convex/shifts.ts` - all day references
- [ ] `src/components/CreateShiftModal.tsx` - daysOfWeek array
- [ ] `src/components/EditEventModal.tsx` - daysOfWeek array (if exists)
- [ ] Any other day-of-week components
- [ ] Test recurring patterns work correctly

## 🔧 SECONDARY IMPROVEMENTS

### 4. **ADD NON-RECURRING SHIFT SUPPORT**
**Current:** All shifts must be recurring  
**Required:**
- [ ] Make `recurringDays` optional in schema
- [ ] Add `isRecurring` boolean to shifts table
- [ ] Update CreateShiftModal with one-time option
- [ ] Modify backend logic for single-day shifts

### 5. **SIMPLIFY NAVIGATION STRUCTURE**
**Problem:** Events tab redundant with Shifts system  
**Changes:**
- [ ] Remove Events tab from navigation
- [ ] Redirect `/events` to `/shifts` 
- [ ] Update permissions and role-based navigation
- [ ] Test all user role navigation flows

### 6. **ADD WORKER HOURS REPORTING**
**Requirements:**
- [ ] Create hours calculation backend queries
- [ ] Build date range selector component
- [ ] Implement total hours summary view
- [ ] Add calendar view with daily hours display
- [ ] Test with various shift patterns and assignments

## 📋 TESTING CHECKLIST

### End-to-End Workflows
- [ ] **Manager Creates Shift** → UI works, data saves, appears in list
- [ ] **Worker Self-Assigns** → Can join shift, capacity updates, status changes  
- [ ] **Manager Assigns Worker** → Can assign others, notifications work
- [ ] **Calendar Integration** → Shifts appear, clickable, assignment works
- [ ] **Capacity Management** → Status indicators accurate, limits enforced
- [ ] **Day Order** → Sunday-first throughout all components

### Role-Based Testing
- [ ] **As Manager/Dev:** Can create shifts, assign workers, view all data
- [ ] **As Worker:** Can self-assign, view own assignments, request swaps
- [ ] **As Guest/Customer:** Cannot access shifts (proper permissions)

## 🚀 SUCCESS CRITERIA

### Minimum Viable
1. **Core Assignment Works** - Workers and managers can assign to shifts successfully
2. **Calendar Integration** - Shifts visible on calendar with basic interaction
3. **Day Order Fixed** - Sunday-first week order throughout system

### Complete Success  
4. **One-Time Shifts** - Support for non-recurring shifts
5. **Simplified Navigation** - Events tab removed, clean UX
6. **Hours Reporting** - Basic worker hours tracking functional

## 🔍 DEBUGGING PRIORITIES

### Start Here
1. **Test assignment mutations** - Use browser console, check Convex dashboard
2. **Verify user authentication** - Ensure proper user context in mutations
3. **Check permission logic** - Confirm role-based access working
4. **Database inspection** - Verify data being written to assignments table

### If Assignment Works
5. **Calendar component integration** - Add shifts to existing calendar logic
6. **Visual styling** - Semi-transparent blocks, status colors
7. **Click handlers** - Assignment workflow from calendar clicks

## ⏰ TIME ALLOCATION ESTIMATE

- **Assignment Fix:** 30-45 minutes (critical debugging)
- **Calendar Integration:** 45-60 minutes (component modification)  
- **Day Order Fix:** 20-30 minutes (find/replace updates)
- **Testing:** 30 minutes (end-to-end validation)

**Total Estimated Time:** 2-2.5 hours for core functionality

## 📝 DOCUMENTATION UPDATES NEEDED

- [ ] Update DEPLOYMENT_BLOCKERS.md when issues resolved
- [ ] Document calendar-shift integration in PROJECT_OVERVIEW.md  
- [ ] Create user guide for shift management workflows
- [ ] Update API documentation for shifts system

---

**Priority:** Focus on assignment functionality first - everything else depends on core workflows working correctly.