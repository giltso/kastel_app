# Shifts System Implementation Design

**Date:** 2025-09-28
**Status:** in work - COMPREHENSIVE MODAL SYSTEM 

## 🎯 FUNCTIONAL DESIGN

### **Core Purpose**
The shifts system provides **recurring operational scheduling** for workers across different days of the week, with **capacity management** and **dynamic assignment capabilities**. It differs from the events system by focusing on **ongoing operations** rather than one-time activities.

### **Key Functional Requirements**

#### **1. Shift Templates (Recurring Patterns)**
- **Definition**: Managers create recurring shift templates that define when operational work needs to happen
- **Recurrence Logic**: Each shift template specifies which days of the week it runs (e.g., Monday-Friday, weekends only)
- **Time Boundaries**: Fixed start and end times for each shift template
- **Capacity Planning**: Required workers (target) and maximum workers (ceiling) for each shifttha

#### **2. Assignment System**
- **Manager Assignment**: Managers can assign specific workers to specific shift instances (date + shift combination)
- **Self-Assignment**: Workers can assign themselves to available shift instances
- **Conflict Prevention**: One worker cannot be assigned to multiple shifts on the same date
- **Capacity Enforcement**: Assignments cannot exceed the maximum worker limit

#### **3. Status Calculation Logic**
- **Bad**: Current workers ≤ required workers - 2 (severely understaffed)
- **Close**: Current workers = required workers - 1 (one short)
- **Good**: Current workers = required workers (perfectly staffed)
- **Warning**: Current workers > required workers (overstaffed, within max limit)

#### **4. Calendar Integration**
- **Day-Specific Display**: Only shifts that run on the selected day are shown
- **Real-Time Statistics**: Overview statistics reflect all shifts regardless of day filtering
- **Visual Status**: Color-coded status indicators for quick capacity assessment

---

## 🏗️ TECHNICAL IMPLEMENTATION

### **Database Schema Design**

#### **1. Shifts Table (Templates)**
```typescript
shifts: {
  name: string,                    // "Morning Shift", "Evening Shift"
  description?: string,            // Optional details
  type?: "operational" | "maintenance" | "educational",
  startTime: string,              // "09:00" (HH:MM format)
  endTime: string,                // "17:00" (HH:MM format)
  recurringDays: DayName[],       // ["monday", "tuesday", "wednesday"]
  requiredWorkers: number,        // Target staffing (2)
  maxWorkers?: number,            // Capacity limit (defaults to requiredWorkers + 2)
  isActive: boolean,              // Enable/disable shifts
  createdBy: Id<"users">,         // Manager who created
  color?: string                  // Hex color for calendar display
}
```

#### **2. Shift Assignments Table (Instances)**
```typescript
shift_assignments: {
  shiftId: Id<"shifts">,          // Reference to shift template
  workerId: Id<"users">,          // Assigned worker
  date: string,                   // "2025-09-13" (ISO date)
  assignmentType: "manager_assigned" | "self_signed",
  assignedBy: Id<"users">,        // Who made the assignment
  status: "assigned" | "confirmed" | "completed" | "no_show" | "cancelled",
  notes?: string                  // Optional assignment notes
}
```

### **Core Business Logic**

#### **1. Shift Creation (`createShift` mutation)**
**Authorization**: Only managers and devs can create shifts
**Process**:
1. Validate user permissions (effectiveRole check)
2. Create shift template with provided parameters
3. Auto-set `isActive: true` and `createdBy` fields

#### **2. Assignment Logic (`assignWorkerToShift` mutation)**
**Authorization**:
- **Self-Assignment**: Workers can assign themselves, **but need approval**
- **Manager Assignment**: Managers/devs can assign any worker

**Validation Process**:
1. **Authentication Check**: Verify user identity
2. **Permission Check**: Validate assignment authority (self vs manager)
3. **Worker Eligibility**: Target worker must be worker role or higher
4. **Conflict Prevention**: Check for existing assignment on same date
5. **Capacity Enforcement**: Verify shift hasn't reached maximum capacity
6. **Business Logic**: Create assignment record with appropriate type

#### **3. Status Calculation (`calculateShiftStatus` function)**
**Input**: Current workers, required workers, optional max workers
**Logic**:
```typescript
const max = maxWorkers || requiredWorkers + 2;
if (currentWorkers <= requiredWorkers - 2) return "bad";
if (currentWorkers === requiredWorkers - 1) return "close";
if (currentWorkers === requiredWorkers) return "good";
return "warning"; // Overstaffed
```

---

** why is it here ?? ** \

#### **4. Display Filtering Logic**
**Day-Specific Filtering**:
```typescript
const selectedDayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
const runsOnSelectedDay = shift.recurringDays.includes(selectedDayOfWeek);
```
**Statistics Calculation**: Always includes all shifts for capacity overview


---


### **UI Component Architecture**

#### **1. Shifts Page (`/shifts`)**
**Functionality**:
- Date selection with Today/Tomorrow quick buttons
- Real-time statistics overview (Fully Staffed, Almost Full, Need Workers, Overstaffed)
- Manager controls (Create Shift, Bulk Assign placeholder)
- Day-filtered shift cards display

#### **2. CreateShiftModal**
**Functionality**:
- Form validation for required fields
- Day-of-week selection (checkboxes for Monday-Sunday)
- Capacity configuration (required + maximum workers)
- Color selection for calendar integration
- Real-time form validation with error messages

#### **3. ShiftAssignmentModal**
**Functionality**:
- Worker selection dropdown (filters out already assigned workers)
- Assignment type detection (manager vs self)
- Optional notes field
- Conflict prevention with immediate feedback

#### **4. ShiftCard Component**
**Functionality**:
- Status display with color-coded indicators
- Capacity information (current/required/max)
- Assignment actions based on user role and current assignment status
- Time and day display

---

## 🔒 AUTHORIZATION MATRIX

### **Permission Levels**

| Action | Guest | Customer | Worker | Manager | Dev |
|--------|-------|----------|--------|---------|-----|
| View Shifts | ❌ | ❌ | ✅ | ✅ | ✅ |
| Self-Assign | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create Shifts | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assign Others | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage Capacity | ❌ | ❌ | ❌ | ✅ | ✅ |

### **Role Logic Implementation**
```typescript
// Permission checks in backend
const effectiveRole = user.emulatingRole || user.role;
const canManageShifts = ["manager", "dev"].includes(effectiveRole);
const canSelfAssign = ["worker", "manager", "dev"].includes(effectiveRole);
```

---

## ✅ DESIGN DECISIONS & REQUIREMENTS

### **1. Non-Recurring Shifts** ✅ **CONFIRMED**
**Requirement**: Support for one-time shifts to accommodate early endings or late starts
**Implementation Approach**:
- **Creation**: New shifts can be created as non-recurring with a unique tag
- **Instance Editing**: Managers can edit specific instances of recurring shifts through calendar
- **Data Inheritance**: Edited instances inherit all data, nested events, and assigned workers from original
- **Calendar Replacement**: Modified shifts replace the original instance in calendar with full functionality

### **2. Cross-Day Shifts** ❌ **NOT REQUIRED**
**Decision**: Cross-day shifts (e.g., 11PM-7AM) are not needed as of now

### **3. Shift Modification Logic** ✅ **CONFIRMED**
**Requirement**: Managers can modify specific instances through calendar
**Process**: Treat as edit operation that creates new unique shift instance with inherited data

### **4. Assignment Workflow Integration** ✅ **CONFIRMED**
**Primary Hub**: Calendar week view as main operational hub
**Secondary Interface**: Shifts tab retains all actions except calendar view
**Priority**: Calendar-based interactions are preferred workflow

### **5. Notification System** 📋 **FUTURE ENHANCEMENT**
**Scope**: Notifications for approval/rejection of assignment requests
**Status**: Not required for current implementation, add as future improvement

### **6. Shift Hierarchy & Dependencies** 📋 **FUTURE ENHANCEMENT**
**Current State**: All shifts equal priority, no dependencies
**Future Consideration**: Connecting shifts into shift groups/hierarchies

### **7. Historical Data & Reporting** ✅ **CONFIRMED**
**Primary Metric**: Work hours tracking - how many hours worked per day
**Future Metrics**: Additional analytics may be added later

---

## 🔄 NON-RECURRING SHIFTS IMPLEMENTATION PLAN

### **Schema Changes Required**

#### **1. Shifts Table Updates**
```typescript
shifts: {
  // ... existing fields
  isRecurring: boolean,               // NEW: true for recurring, false for one-time
  specificDate?: string,              // NEW: ISO date for non-recurring shifts
  parentShiftId?: Id<"shifts">,       // NEW: Reference to original shift if this is an edited instance
  instanceTag?: string,               // NEW: Unique identifier for edited instances
  recurringDays: DayName[] | null,    // MODIFIED: Allow null for non-recurring
}
```

#### **2. Logic Changes**
- **Recurring Shifts**: `isRecurring: true`, `recurringDays: ["monday", "tuesday"]`, `specificDate: null`
- **New Non-Recurring**: `isRecurring: false`, `recurringDays: null`, `specificDate: "2025-09-13"`
- **Edited Instance**: `isRecurring: false`, `recurringDays: null`, `specificDate: "2025-09-13"`, `parentShiftId: <original_id>`

### **Implementation Steps**

#### **Step 1: Backend Schema & Mutations**
1. **Update Schema**: Add new fields to shifts table with backward compatibility
2. **Modify `createShift`**: Support non-recurring shift creation
3. **Add `editShiftInstance`**: Create edited instances that inherit from parent
4. **Update `listShifts`**: Handle both recurring and non-recurring display logic

#### **Step 2: UI Components**
1. **CreateShiftModal**: Add "One-time shift" checkbox that hides recurringDays selection
2. **Calendar Integration**: Enable right-click → Edit Shift Instance
3. **EditShiftInstanceModal**: New modal for editing specific dates with data inheritance

#### **Step 3: Calendar Display Logic**
1. **Filtering Logic**: Show appropriate shifts based on `specificDate` or `recurringDays`
2. **Precedence Rules**: Edited instances override parent recurring shifts for that date
3. **Visual Indicators**: Different styling for edited instances vs recurring shifts

### **Data Inheritance Process**
When editing a recurring shift instance:
1. **Create New Shift**: Non-recurring shift with `parentShiftId` reference
2. **Copy Data**: Inherit name, description, times, capacity, color from parent
3. **Copy Assignments**: Create new assignments with same workers for the specific date
4. **Copy Nested Events**: Transfer any events scheduled within the shift
5. **Calendar Replacement**: New shift appears instead of recurring instance for that date

---

## 📊 CURRENT SYSTEM HEALTH

### ✅ **Fully Implemented & Tested**
- Shift template creation and management
- Worker assignment system (manager + self-assignment)
- Capacity management and conflict prevention
- Real-time status calculation and display
- Day-based filtering and statistics
- Authorization and permission enforcement
- **Complete 6-Modal Architecture**: ShiftDetailsModal, CreateEditShiftModal, RequestJoinShiftModal, AssignWorkerModal, ApproveAssignmentModal, ReviewRequestModal
- **Dual Approval Workflows**: Manager assigns → worker approves, worker requests → manager approves
- **Calendar Integration**: Timeline click handlers and modal state management
- **Real-time Backend Integration**: Live updates with Convex, comprehensive validation
- **Role-Adaptive UI**: Modals adapt to user permissions (Base + Worker + Manager layers)
- **Comprehensive Testing**: Playwright validation of all major workflows

### 🔄 **Future Enhancements**
- Non-recurring shift support (designed but not implemented)
- Shift swap request system (backend exists, UI incomplete)
- Golden time request system (backend exists, UI incomplete)
- Notification system
- Shift modification/exception handling

---

## 🎯 COMPREHENSIVE MODAL SYSTEM ARCHITECTURE

### **6-Modal Workflow System**

#### **1. ShiftDetailsModal** (Universal Viewer)
- **Purpose**: Role-adaptive shift information and action hub
- **Features**: Shift details display, contextual actions based on user permissions
- **Access Patterns**: Timeline clicks, overview buttons, detail navigation
- **Role Adaptation**: Shows different actions for workers vs managers

#### **2. CreateEditShiftModal** (Manager Tool)
- **Purpose**: Complete shift template management
- **Features**: Create new shifts, edit existing templates, hourly requirement setup
- **Access**: Manager-only, create/edit workflows
- **Integration**: Generates hourly slots from shift open/close times

#### **3. RequestJoinShiftModal** (Worker Initiative)
- **Purpose**: Worker-initiated join requests with time preferences
- **Features**: Time slot specification, conflict detection, optional notes
- **Workflow**: Worker requests → manager approves
- **Backend**: `requestJoinShift` mutation with status "pending_manager_approval"

#### **4. AssignWorkerModal** (Manager Tool)
- **Purpose**: Manager direct worker assignment interface
- **Features**: Worker selection, time slots, breaks, comprehensive form
- **Integration**: Filters available workers, prevents conflicts
- **API**: Fixed to use `api.users_v2.getAllUsersV2`

#### **5. ApproveAssignmentModal** (Worker Response)
- **Purpose**: Worker approval interface for manager assignments
- **Features**: Review assignment details, accept/reject workflow
- **Access**: Worker-specific, role-based validation
- **Integration**: Handles manager-initiated assignments

#### **6. ReviewRequestModal** (Manager Response)
- **Purpose**: Manager interface for bulk request approval
- **Features**: Filtering, batch operations, request review
- **Workflow**: Reviews worker join requests in bulk
- **Integration**: Comprehensive request management

### **Technical Implementation Details**

#### **Modal State Management**
- **Centralized Handlers**: All modals managed in `/luz.tsx` route
- **State Persistence**: Modal states preserved during navigation
- **Integration Points**: Timeline clicks, overview buttons, detail views

#### **Role-Adaptive Architecture**
- **Additive Permissions**: Base + Worker + Manager layers
- **V2 Tag System**: Uses Staff + Worker + Manager tags
- **Dynamic Content**: Modals show different content based on user permissions
- **Business Rules**: Manager tag requires Worker tag (enforced)

#### **Backend Integration**
- **Real-time Updates**: Live Convex integration with immediate UI updates
- **Comprehensive Validation**: Server-side conflict detection and capacity management
- **API Fixes**: Resolved `getAllUsers` vs `getAllUsersV2` naming issues
- **Status Management**: Pending approvals, confirmed assignments, comprehensive workflow states

### **Testing Validation**
- **Playwright Testing**: Comprehensive UI testing of all modal workflows
- **Role Testing**: Verified functionality across different user permissions
- **Workflow Testing**: End-to-end testing of assignment and approval processes
- **Integration Testing**: Timeline interactions and modal state management validated

---

**Current Status**: Complete shift action system with comprehensive modal architecture, dual approval workflows, and full role-based functionality. All major worker and manager workflows implemented and tested.