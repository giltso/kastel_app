# Kastel App V2 Redesign Document

## 🎯 Redesign Overview

### **Critical Decision: Major Simplification**
⚠️ **BREAKING CHANGE**: This redesign will remove most existing functionality and rebuild from ground up with three core focuses.

### **What We're KEEPING**

- landing page, sign in, and the basic role structure including emualtion
- UI decitions such as styling and color and basic tab layout
- Tool Rental System
- Course Management System
- Core Authentication & Roles

### **What We're COMPLETELY REDESIGNING**

- Shift Management System (complete rebuild to fit new job requirements)
- Calendar Interface (simplified to support new shift system via LUZ tab)
- Event Management System (integrated into LUZ unified scheduling hub)
- Advanced Calendar Features (simplified for LUZ system)

### **What We're REMOVING**

- Professional Services (Pro Help)
- Suggestion Box System
- Current Complex Shift System (replaced with redesigned version)

---

## 🏗️ V2 Core System Architecture

### **1. LUZ System - Unified Scheduling Hub**

*Primary focus: All event scheduling through single interface*

**LUZ System Scope & Priority:**
- **V2 Primary**: Shift Management (operational scheduling and documentation)
- **V2 Secondary**: Tool rentals and course integration (existing systems)
- **Future**: Vanilla events (general scheduling after core systems proven)

**Core Goals:**
- Present available shifts to workers
- Handle shift requests and assignments
- Provide unified interface for all time-based activities
- Allow managers to oversee and approve scheduling 

#### **Staff Roles & Permissions**
- **Staff (All)**:
  - [ ] *Define basic shift system access* 
    - all staff interacts with the shift systme through the same tab on the site, called LUZ.
    - this is the main hub for all actions regarding staff schedualing. 
    - the tab has 3 main features:
      - **top** filter field on that marks what is seen by the current user
      - **left** a overview section that shows schedualed events depending on the filtration
      - **right** a calander that visually allows for work assigment.  
    - **Permission Model**: Staff members see "public" (permissionless) information within staff context
      - Base Staff (no tags): See shift times and basic details, but not assignments or private info
      - Future extensibility: New staff tags can unlock specific LUZ functions (maintenance, security, reception, accounting staff)
      - Access is modular - each piece of information has its own permission requirement   

- **Workers**:
  - [ ] *Define available shift viewing* 
    - workers can see the shifts and see the population status for them
    - workers see by default their own status on shifts, meaning the main way for them to interact is see all available shifts and click on the shift they wanna join and make a reuqest to join.
    - workers have permission to check who is on every shift, but that is not the base interacion. 
  - [ ] *Define shift request capabilities*
    - Workers request assignment to shifts via simple action requiring authorization
    - **Empty Shift Request**: Direct to manager for approval
    - **Worker Switch Request**:
      - Worker A requests to switch with Worker B
      - Request queues in system (no in-app notifications in V2)
      - External notification: DM sent to Worker B outside the site
      - Worker B checks LUZ for pending requests
      - If Worker B approves → goes to manager for final approval
      - If Worker B denies → request ends immediately (no manager involvement)
  - [ ] *Define own assignment status*

- **Managers** (inherits Worker permissions +):
  - [ ] *Define shift assignment approval workflows*
    - shifts requests are collected for a few days, and the approval needs to be handled either on singular basis or with bulk actions
    - there should be a warning system in place to prevent overbooking 
    - the filteration system should be rubust and allow the manager to check the assignments easly on multiple parameters such as specific worker or time period
  - [ ] *Define worker assignment capabilities*
    - should allow a manager to assign a worker to a shift. in this case the worker needs to approve the assignment. 
    - after approval should interact 
  - [ ] *Define shift scheduling permissions*
    - managers can create and edit shifts as a basic tool. most shifts should be a recuring event that should be created and populated with minimal interfacing
    - in special cases, one time shfts can occur and they need to be easy to manage.
      - a non recurring shift can be made by editing an instance of an existing shift, by changing some parameter like number of workers or start time. in this case it should not affetct the recurring shift. 
      - it is not yet decided if the ability to change shifts is manager only. 
  - [ ] *Define reporting access*
    - the shift tool should create reports on hours worked. the reports can be made for each worker, for any specified time period. the formating and styling will be handeled later.

#### **LUZ Interface Design Progress**

**Detailed Specifications Created** (documented in `LUZ_CALENDAR_REDESIGN.md`):
- **70/30 Layout Architecture**: Overview section (30%) + Calendar timeline (70%) specified
- **Three-View System**: Daily (tool rental focus) → Weekly (shift planning) → Monthly (strategic planning) designed
- **Role-Based Interactions**: Complete specifications for Base Staff, Workers, Instructors, and Managers across all views
- **Visual Design System**: Color coding, typography, spacing, and responsive design specifications defined
- **Drag-and-Drop Logic**: Manager assignment workflows with real-time updates and validation designed
- **Coverage Gap Indicators**: Visual status system for staffing analysis specified

**Key Design Decisions Made:**
- **View-Specific Priorities**: Each view optimized for specific user tasks and time horizons
- **Cumulative Role Permissions**: Base Staff → Workers → Instructors → Managers with additive capabilities
- **Dual Approval System**: Manager assignments require worker approval for autonomy
- **Course Writer Hierarchy**: Owner vs helper instructor distinction with appropriate permissions
- **Mobile Responsiveness**: Touch-friendly interactions and stacked layouts specified

**Filter System (Question 2):**
- **V2 Minimum**: Basic tag system to differentiate Shifts, Education (courses), and Rentals
- **Future Phase**: Comprehensive filtering model to be designed separately
- **Implementation**: Simple tag-based filtering for now

**Manager Approval Workflow (Question 5):**
- Checkbox selection system for each pending request
- "Select All" button for bulk operations
- Mixed-mode approval: select specific requests for bulk processing
- Individual approval remains available

**Recurring Shift Modifications (Question 6):**
- **Edit Dialog Options**:
  - "Edit this occurrence only" (creates exception)
  - "Edit this and all future occurrences" (modifies pattern going forward)
- **Temporal Rule**: Past shifts are immutable for reporting integrity
- **Design Principle**: Shifts exist for action (present/future), become historical records (past)

**Worker Switch Request Flow (Question 4):**
- Request queues in system (no in-app notifications in V2)
- External communication for notifications (DM outside site)
- Worker B denial ends request immediately
- Worker B approval sends to manager for final decision 

- **Instructors**:
  - [ ] *Define course-related shift access*
    - courses are events that are not shifts. therefor they should show on the LUZ. courses have public information such as time and enrollment status, and have protected info such as who is enrolled and where is the course.  
  - [ ] *Define if instructor can also request worker shifts*
    - Instructor role provides course management permissions only
    - If instructor also has Worker tag: gains full worker shift permissions (additive system)
    - Base Instructor (no Worker tag): sees only public shift timing for course scheduling context

#### **Core Functionality**

**Shift System Specifications Designed** (documented in `SHIFT_REDESIGN.md`):

- **Define shift**: Population-based hourly requirements specified instead of fixed shift types
  - Flexible worker accommodations (full-day, split-shift, partial, offset workers)
  - Hourly staffing requirements with min/optimal worker counts designed
  - Human oversight with information-driven manager decisions specified

- **Define shift creation process**: Template-based system designed for recurring operations
  - Manager creation of shift templates with hourly population requirements
  - Recurring day patterns (monday-sunday flexibility) specified
  - Store hours integration with operational requirements designed

- **Define assignment workflows**: Dual approval system with worker autonomy designed
  - Manager assignment of workers to flexible hour ranges
  - Worker approval requirement for all assignments (dual consent) specified
  - Worker self-service opportunities for additional hours designed
  - Swap system with peer approval workflows specified

- **Define documentation requirements**: Simplified scheduling focus designed
  - Assignment tracking without complex time tracking
  - Break period management (paid/unpaid) specified
  - Assignment notes and metadata designed
  - Manager assignment history tracking planned

- **Define reporting features**: Basic operational reporting designed
  - Weekly/monthly work hours reports by worker
  - Coverage analysis and gap identification specified
  - Assignment status tracking designed
  - Future: Time tracking integration separate from scheduling

#### **Data Model**

**Schema Design Specifications** (documented in `SHIFT_REDESIGN.md`):

- **Design shift schema**: `shifts_v2` table with population-based requirements designed
  - Hourly requirements array (hour, minWorkers, optimalWorkers) specified
  - Store hours integration and recurrence patterns designed
  - Template-based approach for operational consistency specified

- **Design assignment relationships**: `shift_assignments_v2` with flexible hours designed
  - Worker-template-date relationships specified
  - Flexible hour ranges (startTime/endTime arrays) designed
  - Break period management and assignment metadata specified

- **Design documentation structure**: `worker_hour_requests_v2` for self-service designed
  - Worker-initiated requests for additional hours specified
  - Manager review and approval workflows designed
  - Request status tracking and opportunity matching specified

---

### **2. Tool Rental System**
*Keeping existing implementation with refinements*

#### **Customer Roles & Permissions**
- **Customers**:
  - [ ] *Define rental browsing permissions*
  - customers should be able to view the whole collection based on public info and search specific tools by parameters.
  - customers should see the price of items, but the site does not work with money at all and they wont be able to pay on the site.
  - tools have public data, like current availability, and private data such as problems or history of rentals that is not public. 
  - [ ] *Define booking capabilities*
    - customers should be able to request a booking for a tool, the request is pending manager approval
    - after permission is granted, the customer is allowed to take the tool and the manager can start a rental ,that has both the customer and all workers have access to.
    - while the tool is not returned, the site calculates the cost.
    - after returning the tool and setteling the cost the rental is over and stored as history for both the tool and the customer.  
  - [ ] *Define account management*
    - customer needs to put private info into account to create acountability in case of theft. 
    - customer manager approval *on account* in order to be allowed to make rentals at all **important- treat as customer role tag**

- **Staff**:
  - [ ] *tool management permissions*
      - Tool management actions currently part of Worker permissions
      - Future: Specific tool handler role may be added (TBD in tool rental design work) 
  - [ ] *Define inventory management permissions*
    - staff/tool permission role is allowed to see all tools a status and be create tickets for tool issues and fixes needed
    - workers can view rental events and filter by approvla level if needed. 
  - [ ] *Define rental processing workflows*
    - rental uccurs when customer chooses a tool and request use for an allotted time slot, through a form in the site.
    - the request is processed and checked to see if it colides with other approved requests.
      - if theres a collide, help find a solution via constraining time slot to allow.
      -  if there is no collide, move to manger aproval.
    - manager reviews the request and approves or denies 
      - if apporves the user takes the tool, when taken a worker should interact with a rental event to show that it started.
      - if not approved, trminate the process. 
    - after the tool is used and returned, a worker marks as returned and the rental event stops. 



#### **Core Functionality**
- [x] **KEEP**: Existing rental booking system
- [x] **KEEP**: Inventory management
- [ ] *Define any needed simplifications*
    - tools have owners, when damage uccurs to a tool the owner is informed. 
    - if a tool is late or reported to be damaged by otehr users, notify owner.
    - if tool reported late or out of commission, notify staff and show on site. 
---

### **3. Educational Meetings (Courses)**
*Keeping existing implementation with refinements*

#### **Customer/Student Roles & Permissions**
- **Students**:
  - [ ] *Define course browsing permissions*
    - students are just normal customers, no need for special permissions. 

 
  - [ ] *Define enrollment capabilities*
      - students can see all courses (for now) and can request enrollement to any course.
      
  - [ ] *Define progress tracking*
    - not a main feature. should keep what courses were done for user for future feture development.

- **Instructors**:
  - [ ] *Define course management permissions*
    - Every course has a writer (owner) and optional helpers, all are instructors
    - Course writer: Instructor who creates the course (gains writer permissions automatically)
    - Helper instructors: Additional instructors assigned to assist with course
    - Only course writer can edit course details and manage helper instructors
    - Any instructor for the specific course can approve enrollments

  - [ ] *Define student management capabilities*

#### **Core Functionality**
- [x] **KEEP**: Existing course enrollment system
- [x] **KEEP**: Course management
- [ ] *Define any needed simplifications*

---

## 👥 redifined Role System

### **Role Structure: Base + Tags**
```
├── Guest (unauthenticated users - handled by logout, not emulator)
│   └── Permissions: Home page access only, can view service offerings, can sign up
├── Staff (base role for internal users)
│   └── Tags (additive, can combine):
│       ├── Worker (operational staff capabilities)
│       ├── Instructor (teaching capabilities)
│       │   └── Course Writer (per-course: extends Instructor with ownership)
│       ├── Tool Handler (tool management and rental operations)
│       └── Manager (requires Worker tag, adds management)
└── Customer (base role for external users)
    └── Temporary Access Tags (per-item basis):
        ├── Student (per-class: access to enrolled course details)
        └── Tool Renter (per-tool: access to rental tool actions)
```

### **Role Definitions**
- **Guest**: Unauthenticated users with minimal access (emulated via logout, not role switcher)
- **Staff**: Base internal team member role (authenticated)
- **Customer**: Base external user role (authenticated)

### **Staff Tags (Additive & Combinable)**
- **Worker**: Operational staff capabilities (can be added to Staff)
- **Instructor**: Teaching and course management capabilities (can be added to Staff)
  - **Course Writer**: Per-course extension of Instructor with ownership permissions (gained when creating a course)
- **Tool Handler**: Tool management and rental processing capabilities (required for tool rental access)
- **Manager**: Management and approval capabilities (requires Worker tag, always additive)

### **Customer Tags (Temporary & Item-Specific)**
- **Student**: Per-class temporary access to enrolled course details (gained after successful enrollment)
- **Tool Renter**: Per-tool temporary access to rental actions (gained after successful booking approval)

### **Permission Matrix**
```
Feature          | Guest | Staff | Staff    | Staff       | Staff         | Staff           | Customer | Customer
                |       | Base  | +Worker  | +Instructor | +ToolHandler  | +Worker+Manager | Base     | +RentalTag
----------------|-------|-------|----------|-------------|---------------|-----------------|----------|----------
Home Page       | ✓     | ✓     | ✓        | ✓           | ✓             | ✓               | ✓        | ✓
Service Preview | ✓     | ✓     | ✓        | ✓           | ✓             | ✓               | ✓        | ✓
Sign Up         | ✓     | -     | -        | -           | -             | -               | -        | -
Tool Browsing   | ✗     | ✓     | ✓        | ✓           | ✓             | ✓               | ✓        | ✓
Course Browsing | ✗     | ✓     | ✓        | ✓           | ✓             | ✓               | ✓        | ✓
LUZ Portal      | ✗     | ✗     | ✓        | ✗           | ✗             | ✓               | ✗        | ✗
Tool Rentals    | ✗     | ✗     | ✗        | ✗           | ✓             | ✓               | ✗        | ✓
Course Mgmt     | ✗     | ✗     | ✗        | ✓           | ✗             | ✗               | ✗        | ✗
Navigation      | Home  | H+C   | H+L+C    | H+C         | H+T+C         | H+L+T+C         | H+C      | H+C
                | only  |       |          |             |               |                 |          |
```
Legend: H=Home, C=Courses, L=LUZ, T=Tool Rental

### **Role Requirements & Conditionals**

**Base Roles (no conditionals):**
- **Guest**: No authentication required (unauthenticated state)
- **Staff**: Requires authentication
- **Customer**: Requires authentication

**Staff Tags (conditional requirements):**
- **Worker**: Requires Staff
- **Instructor**: Requires Staff
- **Course Writer**: Requires Instructor (which requires Staff)
- **Tool Handler**: Requires Staff (required for tool rental access)
- **Manager**: Requires Worker (which requires Staff)

**Customer Tags (conditional requirements):**
- **Student**: Requires Customer + successful enrollment in specific course
- **Tool Renter**: Requires Customer + successful booking approval for specific tool

### **Future Consideration: Staff as Customer**
**Edge Case for Future Implementation**: Staff members may need Customer access for personal use

**Additive Permission Approach:**
- Customer + Staff + Worker: Should have access to both staff and customer functions
- No role restrictions, only additive permissions
- System design supports multiple role combinations

**Future Scenarios:**
- Worker renting tools for personal use
- Instructor enrolling in courses as a student
- Staff members booking services for personal needs

*Note: Additive permission system should handle this naturally without special restrictions.*

---

## 🗂️ Database Schema V2

### **Core Tables**
- [ ] **Users**: *Define simplified user schema*
- [ ] **Shifts**: *Design new shift data model (will be "shifts" after migration)*
- [ ] **Tools**: *Keep existing, document any changes*
- [ ] **Courses**: *Keep existing, document any changes*

### **Removed Tables**
- ❌ **Events**: Complete removal
- ❌ **Suggestions**: Complete removal
- ❌ **Professional Services**: Complete removal

---

## 🎨 User Interface Design

### **Navigation Structure**
- [ ] *Define main navigation*
- [ ] *Define role-based menu items*
- [ ] *Define mobile navigation*

### **Page Structure**
- [ ] **Dashboard**: *Define what each role sees on login*
- [ ] **Shifts**: *Design shift management interface*
- [ ] **Tools**: *Keep existing, note any changes*
- [ ] **Courses**: *Keep existing, note any changes*

### **Current Navigation Structure (Implemented)**
**Guest**: Home
**Customer**: Home, Courses
**Staff**: Home, Courses
**Staff+Worker**: Home, LUZ, Courses
**Staff+ToolHandler**: Home, Tool Rental, Courses (+ Worker tags if present)
**Staff+Instructor**: Home, Courses (+ other tags if present)
**Staff+Manager**: All V2 navigation options (requires Worker tag)

### **Removed Pages**
- ❌ Events page
- ❌ Forms page (V1 legacy - not part of V2)
- ❌ Pro Help page (V1 legacy - not part of V2)
- ❌ Suggestions page
- ❌ Complex landing pages

---

## 🔄 Migration Strategy

### **Data Migration**
- [ ] *Plan user data preservation*
- [ ] *Plan tool rental data preservation*
- [ ] *Plan course data preservation*
- [ ] *Plan shift data migration/rebuild*

### **Feature Migration**
- [ ] *Document what functionality to preserve*
- [ ] *Document what to rebuild from scratch*
- [ ] *Document what to completely remove*

---

## 📋 Implementation Planning (not updated)

### **Phase 1: Foundation** ✅ **COMPLETED**
- [x] *Define new role system implementation*
  - [x] *Implement additive permission framework*
  - [x] *Build role conditional validation system*
  - [x] *Design data-level permission integration: Most data objects will include permission fields to reflect the role system at the database level*
- [x] *Define database schema changes*
- [x] *Define authentication flow*

#### **Phase 1 Implementation Status - COMPLETE & TESTED**

**✅ COMPLETED FEATURES:**
- **V2 Role System**: Tag-based permissions fully implemented with `isStaff + workerTag/instructorTag/toolHandlerTag/managerTag/rentalApprovedTag`
- **Permission Framework**: `usePermissionsV2` hook with comprehensive permission checking (17 different permissions)
- **Role Emulator**: Toggle-based role switching interface for testing with business rule validation
- **Clean Navigation**: Removed Events, Shifts, suggestions functionality for clean slate
- **Database Schema**: V2 users table with role tags and emulation fields
- **Tool Handler Role**: Added dedicated toolHandlerTag for tool rental management permissions
- **Guest Role Simplification**: Guest access via logout (not emulator), 2-option Staff/Customer toggle

**🎯 TESTING RESULTS - ALL ROLE COMBINATIONS VERIFIED:**

| Role | Navigation | Home Page | Quick Actions | Status |
|------|-----------|-----------|---------------|---------|
| **Guest** | Home only | Clean welcome + large logo | Service preview | ✅ Perfect |
| **Customer** | Home, Courses | Same as Guest (auth'd) | Service preview | ✅ Perfect |
| **Staff** | Home, Courses | LUZ interface | None | ✅ Perfect |
| **Staff+Worker** | +LUZ | LUZ interface | Full Calendar View | ✅ Perfect |
| **Staff+ToolHandler** | +Tool Rental | LUZ interface | +Manage Tools | ✅ Perfect |
| **Staff+Instructor** | All navigation | LUZ interface | +Manage Courses | ✅ Perfect |
| **Staff+Manager** | All navigation | LUZ interface | All actions | ✅ Perfect |

**🔍 FUNCTIONAL VERIFICATION:**
- ✅ Role emulator updates display correctly (Staff → Staff+W → Staff+WT → Staff+WIT → Staff+WITM)
- ✅ Navigation permissions work perfectly (Tool Rental appears only with ToolHandler tag)
- ✅ Business rule enforcement (Manager tag requires Worker tag - checkbox disabled appropriately)
- ✅ Permission-based UI rendering (Quick Actions appear based on role capabilities)
- ✅ Badge system displays correctly for all combinations
- ✅ Guest vs Customer vs Staff differentiation works perfectly
- ✅ Tool rental access properly restricted to Staff+ToolHandler OR Customer+RentalApproved
- ✅ Course management access properly restricted to Staff+Instructor
- ✅ LUZ portal access properly restricted to Staff+Worker

**STATUS**: Phase 1 foundation is complete and production-ready. All role combinations tested and verified functional.

### **Phase 2: Core Features**
- [ ] *Implement shift management system*
- [ ] *Refine tool rental system*
- [ ] *Refine course system*

### **Phase 3: Integration**
- [ ] *Integrate all systems*
- [ ] *Implement simplified calendar*
- [ ] *Implement reporting features*

### **Phase 4: Polish**
- [ ] *UI/UX refinements*
- [ ] *Performance optimization*
- [ ] *Testing and validation*

---

## 📝 Stakeholder Requirements

### **Shift System Specific Needs**
- [ ] *Document operational management requirements*
- [ ] *Document documentation needs*
- [ ] *Document reporting requirements*
- [ ] *Document workflow requirements*

### **Integration Requirements**
- [ ] *Document tool rental integration needs*
- [ ] *Document course integration needs*
- [ ] *Document calendar integration needs*

---

*This document is a template to be filled out collaboratively before any implementation begins.*