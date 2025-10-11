# V2 Shift System Redesign

📍 **Navigation:**
- **Parent**: [REDESIGN_V2.md](REDESIGN_V2.md) → **SHIFT_REDESIGN.md** (you are here)

**Related Documents:**
- **LUZ Interface**: [LUZ_CALENDAR_REDESIGN.md](LUZ_CALENDAR_REDESIGN.md) - Complete UI specifications for shift display
- **Implementation**: [SHIFTS_IMPLEMENTATION.md](SHIFTS_IMPLEMENTATION.md) - Code-level modal system and backend integration
- **Schema**: [convex/schema.ts](../convex/schema.ts) - Actual database implementation

**Purpose**: Population-based shift architecture design, database schema specifications, and workflow definitions.

---

**Date:** 2025-09-16 (Session 23)
**Status:** 🔄 DESIGN PHASE - COMPREHENSIVE SPECIFICATIONS COMPLETE
**Context:** V2 Redesign - Complete rebuild of shift system for LUZ integration

---

## 🎯 V2 SHIFT SYSTEM OVERVIEW


### **Core Design Principles:**

1. **Operational Visibility Focus**: Primary goal with secondary reporting and flexibility
2. **Dual Approval Workflows**: Both worker and manager must consent to assignments
3. **Action-Oriented Interface**: Overview section shows items requiring immediate attention
4. **Unified Scheduling**: All time-based activities (shifts, courses, rentals) in single interface
5. **Role-Based Defaults**: Interface adapts to user's primary responsibilities
6. **🆕 Flexible Worker Accommodation**: System adapts to different work arrangements without clutter
7. **🆕 Human Oversight Maintained**: Information-driven decisions with manager control
8. **🆕 Hourly Population Framework**: Requirements defined by hour, not fixed shift types

## 🔧 FLEXIBLE SHIFT ARCHITECTURE

### **Problem Statement:**
Current operational pain points requiring systematic solutions:

#### **Worker Arrangement Complexity:**
- **Full-day workers**: Opening to closing (8 AM - 8 PM)
- **Split-shift workers**: Work morning, long break, return evening
- **Partial workers**: Morning-only (8 AM - 2 PM) or afternoon-only (12 PM - 8 PM)
- **Offset workers**: Start 2 hours after opening, end 2 hours before closing

#### **Dynamic Population Requirements:**
- Different staffing needs throughout the day (quiet periods vs. peak hours)
- Opening procedures require specific worker count
- Lunch rush needs additional coverage
- Closing procedures require adequate staff

#### **Manager Decision Complexity:**
- Currently requires human problem-solving for scheduling decisions
- No systematic way to visualize coverage gaps
- Difficult to accommodate worker preferences while meeting operational needs

### **Solution: Population-Based Flexible Framework**

#### **1. Hourly Population Requirements Template**
Instead of creating multiple shift types, define **hourly staffing requirements**:

```typescript
Daily Operations Template Example:
Store Hours: 08:00 - 20:00

Hourly Staffing Requirements:
08:00-09:00: 2 workers (opening procedures, register setup)
09:00-12:00: 1 worker (quiet morning period)
12:00-15:00: 2 workers (lunch rush, customer traffic)
15:00-18:00: 3 workers (peak afternoon, deliveries, customers)
18:00-19:00: 2 workers (evening sales, prep for close)
19:00-20:00: 2 workers (closing procedures, cleanup)
```

**Benefits:**
- Clear visibility of when more/fewer workers are needed
- Flexible assignment accommodates any work arrangement
- Easy identification of coverage gaps and over-staffing

#### **2. Manager-Driven Assignment System**
Managers retain full control over assignments with enhanced information:

**What the system provides:**
- Clear hourly staffing requirements
- Visual timeline showing gaps and overlaps
- List of available workers with basic preferences noted
- Simple assignment interface with drag-and-drop capability
- Real-time coverage calculation and gap warnings

**What managers control:**
- Which worker gets assigned to which hours
- How to handle worker preferences and constraints
- Break scheduling and special arrangements
- Last-minute changes and coverage decisions

#### **3. Timeline Visualization Framework**
Unified vertical timeline for LUZ interface integration:

```
Manager's Assignment Interface Example:
     Time │ Required │ Current Workers
    ──────┼──────────┼─────────────────
     8 AM │    2     │ ██ Sarah ██ Mike
     9 AM │    1     │ ██ Sarah [Gap!]
    10 AM │    1     │ [Empty - Critical!]
    11 AM │    1     │ [Empty - Critical!]
    12 PM │    2     │ ██ Mike [Gap!]
     1 PM │    2     │ ██ Lisa [Gap!]
     2 PM │    2     │ ██ Lisa ██ John
     3 PM │    3     │ ██ Lisa ██ John [Gap!]
    ─ And so on through closing ─
```

#### **4. Worker Self-Service Opportunities**
Workers can identify and request suitable additional hours:

**Worker Interface Shows:**
- Their confirmed schedule for the week
- Available extra hours that fit their typical pattern
- Simple request system for additional coverage
- Clear status tracking for their requests

**Example Worker Opportunities:**
```
Extra Hours Available:
🟡 Wednesday 12PM-6PM - "Good fit for you!"
   (Matches your afternoon preference)
🟡 Friday 2PM-4PM - "Optional overtime"
   (Extends your normal shift by 2 hours)
```

---

## 🗂️ V2 DATABASE SCHEMA DESIGN - SIMPLIFIED HUMAN OVERSIGHT

### **1. Shift Templates (shifts_v2) - Population-Based**
*Defines hourly population requirements instead of fixed shifts*

```typescript
shifts_v2: {
  _id: Id<"shifts_v2">,
  _creationTime: number,

  // Basic Information
  name: string,                    // "Daily Operations", "Weekend Coverage"
  description?: string,            // Optional details about operational requirements
  type: "operational" | "maintenance" | "educational" | "special",

  // Store Operation Hours
  storeHours: {
    openTime: string,              // "08:00"
    closeTime: string,             // "20:00"
  },

  // Hourly Population Requirements (KEY CHANGE)
  hourlyRequirements: {
    hour: string,                  // "14:00" (24-hour format)
    minWorkers: number,            // Minimum required workers
    optimalWorkers: number,        // Ideal staffing level
    notes?: string,                // "Peak customer period", "Opening procedures"
  }[],

  // Recurrence Pattern
  recurringDays: DayName[],        // ["monday", "tuesday", "wednesday"]
  isActive: boolean,               // Enable/disable this template

  // Management
  createdBy: Id<"users">,          // Manager who created template
  lastModified: number,            // Track template changes
  color?: string,                  // Hex color for calendar display
}
```

### **2. Shift Assignments (shift_assignments_v2) - Flexible Hours**
*Individual worker assignments with flexible hour ranges*

```typescript
shift_assignments_v2: {
  _id: Id<"shift_assignments_v2">,
  _creationTime: number,

  // Core Assignment Data
  shiftTemplateId: Id<"shifts_v2">,// Reference to population template
  workerId: Id<"users">,           // Assigned worker
  date: string,                    // "2025-09-16" (specific date)

  // Flexible Hour Assignment (KEY CHANGE)
  assignedHours: {
    startTime: string,             // "08:00"
    endTime: string,               // "14:00" - Manager assigns flexible ranges
  }[],

  // Break Management (Optional)
  breakPeriods?: {
    startTime: string,             // "12:00"
    endTime: string,               // "13:00"
    isPaid: boolean,               // true/false for paid breaks
  }[],

  // Assignment Metadata
  assignedBy: Id<"users">,         // Manager who made assignment
  assignedAt: number,              // Timestamp of assignment

  // Simple Status (scheduling only)
  status: "assigned" | "confirmed" | "cancelled",

  // Notes
  assignmentNotes?: string,        // Manager's assignment notes
}
```

### **3. Worker Hour Requests (worker_hour_requests_v2) - Self-Service**
*Workers requesting additional hours or time off*

```typescript
worker_hour_requests_v2: {
  _id: Id<"worker_hour_requests_v2">,
  _creationTime: number,

  // Request Details
  workerId: Id<"users">,           // Worker making request
  shiftTemplateId: Id<"shifts_v2">,// Which operational template
  date: string,                    // "2025-09-16"

  // Request Type and Hours
  requestType: "extra_hours" | "time_off" | "schedule_change",
  requestedHours?: {
    startTime: string,             // "12:00" - for extra hours
    endTime: string,               // "18:00"
  },

  // Request Context
  reason?: string,                 // "Need overtime", "Doctor appointment"
  priority: "low" | "normal" | "urgent",

  // Approval Status
  status: "pending" | "approved" | "denied" | "cancelled",
  reviewedBy?: Id<"users">,        // Manager who reviewed
  reviewedAt?: number,             // Timestamp of review
  reviewNotes?: string,            // Manager's response notes

  // Auto-created assignment (if approved)
  createdAssignmentId?: Id<"shift_assignments_v2">,
}
```

---

## 🔄 V2 WORKFLOW SPECIFICATIONS

### **1. Worker Requests Shift Assignment**
```
Flow: Worker Initiative → Manager Approval → Assignment Created

1. Worker browses available shifts in LUZ interface
2. Worker clicks "Request Assignment" for desired shift on specific date
3. System creates shift_requests_v2 record:
   - requestType: "worker_request"
   - status: "pending"
   - requestedBy: worker's ID
4. Request appears in Manager's LUZ overview "Pending Approvals"
5. Manager reviews and approves → status: "manager_approved"
6. System automatically creates shift_assignments_v2 record
7. Worker receives confirmation (external notification in V2)
```

### **2. Manager Assigns Worker to Shift**
```
Flow: Manager Initiative → Worker Approval → Assignment Created

1. Manager selects shift needing coverage in LUZ interface
2. Manager assigns specific worker to shift on specific date
3. System creates shift_requests_v2 record:
   - requestType: "manager_assign"
   - status: "pending"
   - requestedBy: manager's ID
4. Request appears in Worker's LUZ overview "Pending My Approval"
5. Worker reviews and approves → status: "worker_approved"
6. System automatically creates shift_assignments_v2 record
7. Manager receives confirmation
```

### **3. Auto-Approval System (Mutual Agreement)**
```
Flow: Automatic Detection → Immediate Assignment Creation

Trigger Condition:
- Worker has existing request for Shift A on Date X (status: "pending")
- Manager assigns same worker to same Shift A on Date X

Auto-Approval Process:
1. System detects matching shift, worker, and date
2. Updates both requests with status: "auto_approved" and isAutoApproval: true
3. Immediately creates shift_assignments_v2 record
4. Sends notifications to both parties about automatic approval
5. autoApprovalReason: "Worker request matched manager assignment"
```

### **4. Worker Switch Request System**
```
Flow: Worker A → Worker B → Manager → Final Assignment

1. Worker A views their assigned shifts in LUZ
2. Worker A initiates switch request for specific shift/date
3. System creates shift_requests_v2 record:
   - requestType: "worker_switch"
   - targetWorkerId: Worker B's ID
   - originalAssignmentId: Worker A's current assignment
4. External notification sent to Worker B (email/SMS - outside app in V2)
5. Worker B checks LUZ for pending switch requests
6. If Worker B approves → status: "worker_approved"
7. Request goes to Manager's approval queue → status: "manager_approved"
8. System creates new assignments for both workers
9. If Worker B denies → request ends immediately (status: "denied")
```

---

## 🏗️ LUZ INTERFACE ARCHITECTURE

**Complete LUZ interface specifications documented in [LUZ_CALENDAR_REDESIGN.md](LUZ_CALENDAR_REDESIGN.md)**

**Key Integration Points for Shift System:**
- **70/30 Split Layout**: Overview section shows action items + Calendar section displays shift timeline
- **Population-Based Display**: Visual indicators show hourly requirements vs. current staffing (e.g., "2/3 workers")
- **Manager Workflow**: Drag-and-drop worker assignment, gap warnings, coverage status dashboard
- **Worker Workflow**: Click-to-join available shifts, view personal schedule, request extra hours
- **Real-time Capacity**: Live updates show understaffed (red), optimal (green), overstaffed (orange) states

👉 **See [LUZ_CALENDAR_REDESIGN.md](LUZ_CALENDAR_REDESIGN.md) for complete LUZ specifications including:**
- Detailed filter system design
- Interactive calendar features
- Role-based interface variations
- Timeline rendering algorithms
- Mobile responsiveness specs

---

## 🔒 V2 PERMISSION SYSTEM

**Complete permission system documented in [REDESIGN_V2.md](REDESIGN_V2.md#-redifined-role-system)**

**Shift System Permission Summary:**
- **Staff (Base)**: View public shift information (times, descriptions)
- **Staff + Worker Tag**: Request assignments, approve manager assignments to self, initiate switch requests
- **Staff + Manager Tag**: Create shift templates, assign workers, approve all requests, access full reporting
- **Staff + Instructor Tag**: View shift times for course scheduling context (no operational shift permissions)

👉 **See [REDESIGN_V2.md](REDESIGN_V2.md#-redifined-role-system) for:**
- Complete role structure and tag definitions
- Full permission matrix across all features
- Business rule requirements (e.g., Manager requires Worker tag)
- Future considerations (Staff as Customer scenarios)

---

## 📊 REPORTING SPECIFICATIONS

### **Work Hours Tracking System**
```typescript
interface WorkHoursReport {
  // Report parameters
  workerId: Id<"users">,
  startDate: string,        // "2025-09-01"
  endDate: string,          // "2025-09-30"

  // Calculated metrics
  totalScheduledHours: number,    // Based on shift assignments
  totalWorkedHours: number,       // Based on actual check-in/out times
  attendanceRate: number,         // Percentage of scheduled shifts worked

  // Detailed breakdown
  shiftSessions: {
    date: string,                 // "2025-09-16"
    shiftName: string,           // "Morning Operations"
    scheduledStart: string,       // "09:00"
    scheduledEnd: string,        // "17:00"
    actualStart?: string,        // "09:15" (if checked in)
    actualEnd?: string,          // "17:00" (if checked out)
    status: "completed" | "no_show" | "partial" | "cancelled",
    hoursWorked: number,         // Calculated actual hours
  }[],

  // Summary statistics
  averageHoursPerWeek: number,
  mostCommonShiftType: string,
  punctualityScore: number,       // Based on on-time check-ins
}
```

### **Manager Reporting Dashboard**
- **Individual Worker Reports**: Generate reports for any worker over any time period
- **Shift Coverage Analysis**: Track which shifts are consistently understaffed
- **Assignment Pattern Analysis**: Identify workers' preferred shift types and times
- **System Health Metrics**: Approval response times, request fulfillment rates
- **Capacity Planning**: Predicted staffing needs based on historical patterns

---

## 🚀 INTEGRATION WITH EXISTING SYSTEMS

### **Tool Rental LUZ Integration**
- **Unified Display**: Tool rentals appear alongside shifts in calendar view
- **Status Synchronization**: Rental status affects tool availability for work shifts
- **Worker Tool Access**: Workers see tool rental schedules to plan shift activities
- **Conflict Detection**: System prevents double-booking tools for shifts and rentals

### **Course System LUZ Integration**
- **Educational Shifts**: Course sessions appear as special shift types
- **Instructor Assignment**: Instructors are assigned to course "shifts" like operational shifts
- **Room/Resource Booking**: Courses reserve resources that affect operational shift planning
- **Cross-System Notifications**: Course cancellations notify affected workers

### **Future Extensibility**
- **Maintenance Shifts**: Special shift types for equipment maintenance
- **Security Shifts**: After-hours security coverage shifts
- **Event Shifts**: Special event setup/breakdown shifts
- **Training Shifts**: On-the-job training sessions as shift variants

---

## 🎯 SUCCESS METRICS

### **User Experience Metrics**
- **Request-to-Assignment Time**: Average time from worker request to final assignment
- **Approval Response Rate**: Percentage of requests receiving timely manager response
- **Auto-Approval Rate**: Percentage of assignments resolved through mutual agreement
- **User Interface Efficiency**: Time to complete common tasks in LUZ interface

### **Operational Metrics**
- **Shift Coverage Rate**: Percentage of shifts meeting minimum staffing requirements
- **Worker Satisfaction**: Survey metrics on shift assignment fairness and flexibility
- **Schedule Stability**: Frequency of last-minute changes and cancellations
- **System Adoption**: Usage rates of LUZ interface vs. legacy methods

### **Business Impact Metrics**
- **Labor Cost Optimization**: Reduction in overstaffing and understaffing incidents
- **Administrative Time Savings**: Reduction in manual scheduling overhead
- **Operational Reliability**: Consistency of shift coverage and service delivery
- **Worker Retention**: Impact of flexible scheduling on employee satisfaction

---

## 📋 FUTURE IMPLEMENTATION IDEAS

### **Time Tracking & Attendance System (Future Phase)**
*Features removed from V2 core to focus on scheduling, can be added later*

#### **Real-Time Work Session Management:**
```typescript
// Extended status for shift_assignments_v2
status: "assigned" | "confirmed" | "checked_in" | "checked_out" | "completed" | "no_show"

// Additional fields for time tracking:
actualStartTime?: string,       // When worker actually started (HH:MM)
actualEndTime?: string,         // When worker actually finished (HH:MM)
workNotes?: string,            // Notes from the actual work session
```

#### **Check-In/Check-Out Features:**
- Workers can clock in/out of assigned shifts via LUZ interface
- Real-time shift status updates (in-progress, completed)
- Manager oversight of active shifts and worker locations
- Mobile-friendly check-in for on-the-go workers

#### **Attendance & Reporting:**
- Compare scheduled vs. actual worked hours
- Track punctuality and no-show rates
- Generate individual worker attendance reports
- Export actual worked hours for payroll integration
- Productivity correlation analysis (staffing vs. business metrics)

#### **Advanced Analytics:**
- Peak staffing effectiveness analysis
- Historical data for optimizing hourly population requirements
- Worker productivity and preference pattern analysis
- Operational efficiency reporting and recommendations

### **Enhanced Worker Features (Future Phase)**

#### **Advanced Preference System:**
- Worker availability profiles and preferred hours
- Automatic assignment suggestions based on preferences
- Smart conflict resolution and alternative scheduling
- Break preference management and automatic scheduling

#### **Mobile Optimization:**
- Native mobile app for worker schedule management
- Push notifications for schedule changes and opportunities
- GPS-based check-in/out for location verification
- Offline schedule access for areas with poor connectivity

---

*This comprehensive design document serves as the foundation for V2 shift system implementation, focusing on core scheduling functionality while maintaining clear paths for future enhancement.*