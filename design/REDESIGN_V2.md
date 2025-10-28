# Kastel App V2 Redesign Document

📍 **Navigation:**
- **Parent**: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) → **REDESIGN_V2.md** (you are here)
- **Technical Guidelines**: [../CLAUDE.md](../CLAUDE.md) - Coding standards and workflows

**Child Design Documents:**
- **Shift System Design**: [LUZ_SHIFT_SYSTEM.md](LUZ_SHIFT_SYSTEM.md) - Population-based architecture and database schema
- **LUZ Interface**: [LUZ_SHIFT_SYSTEM.md](LUZ_SHIFT_SYSTEM.md) - Complete UI specifications
- **Implementation Details**: [LUZ_SHIFT_SYSTEM.md](LUZ_SHIFT_SYSTEM.md) - Code-level architecture

**Purpose**: Main V2 architecture document defining role system, high-level design, and system integration.

---

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

#### **LUZ Interface Specifications**

**Complete LUZ interface specifications documented in [LUZ_SHIFT_SYSTEM.md](LUZ_SHIFT_SYSTEM.md)**

**High-Level Overview:**
- **70/30 Split Layout**: Overview section (left 30%) + Calendar timeline (right 70%)
- **Three Views**: Day, Week, Month - each optimized for different user workflows
- **Role-Adaptive Interface**: Different permissions and capabilities for Base Staff, Workers, Instructors, Managers
- **Real-time Updates**: Live capacity indicators, assignment tracking, conflict detection

**Key Design Decisions:**
- Dual approval workflows (manager↔worker consent required)
- Population-based shift system (hourly requirements, not fixed shifts)
- Unified calendar for shifts, courses, and tool rentals
- Mobile-responsive with touch-friendly interactions

👉 **See [LUZ_SHIFT_SYSTEM.md](LUZ_SHIFT_SYSTEM.md) for complete specifications including:**
- Detailed drag-and-drop logic
- Timeline rendering algorithms
- Mobile responsiveness specs
- Performance optimization strategies
- Interactive element specifications 

- **Instructors**:
  - [ ] *Define course-related shift access*
    - courses are events that are not shifts. therefor they should show on the LUZ. courses have public information such as time and enrollment status, and have protected info such as who is enrolled and where is the course.  
  - [ ] *Define if instructor can also request worker shifts*
    - Instructor role provides course management permissions only
    - If instructor also has Worker tag: gains full worker shift permissions (additive system)
    - Base Instructor (no Worker tag): sees only public shift timing for course scheduling context

#### **Core Shift System Functionality**

**Complete shift system design documented in [LUZ_SHIFT_SYSTEM.md](LUZ_SHIFT_SYSTEM.md)**

**High-Level Summary:**
- **Population-Based Framework**: Hourly staffing requirements (not fixed shift slots)
- **Flexible Worker Accommodations**: Full-day, split-shift, partial, offset arrangements
- **Dual Approval Workflows**: Manager assigns → worker approves OR worker requests → manager approves
- **Worker Self-Service**: Request additional hours, time off, schedule changes
- **Shift Swapping**: Worker-to-worker swap requests with manager final approval

👉 **See [LUZ_SHIFT_SYSTEM.md](LUZ_SHIFT_SYSTEM.md) for complete specifications including:**
- Detailed workflow diagrams
- Database schema (shifts_v2, shift_assignments_v2, worker_hour_requests_v2)
- Assignment algorithms and validation logic
- Reporting specifications
- Success metrics and future enhancements

**Code implementation details in [LUZ_SHIFT_SYSTEM.md](LUZ_SHIFT_SYSTEM.md)**

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

**Complete database schema documented in [LUZ_SHIFT_SYSTEM.md](LUZ_SHIFT_SYSTEM.md) and implemented in [convex/schema.ts](../convex/schema.ts)**

### **Core V2 Tables (Implemented)**
- ✅ **users**: V2 tag-based role system (`isStaff`, `workerTag`, `instructorTag`, `toolHandlerTag`, `managerTag`, `rentalApprovedTag`)
- ✅ **shifts**: Population-based shift templates with hourly requirements and recurrence patterns
- ✅ **shift_assignments**: Flexible worker assignments with dual approval workflows
- ✅ **worker_hour_requests**: Worker self-service requests (join, switch, extra hours, time off)
- ✅ **courses**: Course templates with session support (single, multi-meeting)
- ✅ **course_sessions**: Individual session scheduling for multi-meeting courses
- ✅ **tools**: Tool inventory management
- ✅ **tool_rentals**: Rental workflows with manual rental support

### **Removed Tables**
- ❌ **Events**: Complete removal
- ❌ **Suggestions**: Complete removal
- ❌ **Professional Services**: Complete removal

👉 **See [LUZ_SHIFT_SYSTEM.md](LUZ_SHIFT_SYSTEM.md) for detailed schema specifications and [convex/schema.ts](../convex/schema.ts) for implementation**

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
## 📋 Implementation Planning (not updated)

### **Phase 1: Foundation** ✅ **COMPLETED**
- [x] *Define new role system implementation*
  - [x] *Implement additive permission framework*
  - [x] *Build role conditional validation system*
  - [x] *Design data-level permission integration: Most data objects will include permission fields to reflect the role system at the database level*
- [x] *Define database schema changes*
- [x] *Define authentication flow*

#### **Phase 1 Implementation Status - COMPLETE & BACKEND INTEGRATION TESTED**

**✅ COMPLETED FEATURES:**
- **V2 Role System**: Tag-based permissions fully implemented with `isStaff + workerTag/instructorTag/toolHandlerTag/managerTag/rentalApprovedTag`
- **Permission Framework**: `usePermissionsV2` hook with comprehensive permission checking (17 different permissions)
- **Role Emulator**: Toggle-based role switching interface for testing with business rule validation
- **Clean Navigation**: Removed Events, Shifts, suggestions functionality for clean slate
- **Database Schema**: V2 users table with role tags and emulation fields
- **Tool Handler Role**: Added dedicated toolHandlerTag for tool rental management permissions
- **Guest Role Simplification**: Guest access via logout (not emulator), 2-option Staff/Customer toggle
- **Backend Integration**: Real user data, live queries, permission enforcement at database level
- **LUZ Interface**: Timeline views connected to real shift data with role-based access control
- **Role Management**: Real user statistics, search/filter functionality, security validation

**🎯 BACKEND INTEGRATION TESTING RESULTS - ALL SYSTEMS VERIFIED:**

| Feature | Authentication | Real Data | Security | Live Updates | Status |
|---------|---------------|-----------|----------|--------------|---------|
| **Role System** | JWT validation | User database | Access control | Real-time | ✅ Tested |
| **LUZ Interface** | Worker access | Shift templates | Permission gates | Timeline sync | ✅ Tested |
| **Role Management** | Manager access | User statistics | Edit blocked | Search/filter | ✅ Tested |
| **Edge Cases** | Business rules | Validation | Escalation blocked | Transition smooth | ✅ Tested |

**🔍 COMPREHENSIVE SECURITY VALIDATION:**
- ✅ Manager tag properly requires Worker tag (real-time UI enforcement)
- ✅ Customer role blocked from manager interfaces with clear error messages
- ✅ Role transitions work flawlessly (Customer ↔ Staff+WIM combinations tested)
- ✅ Permission escalation attempts blocked (incomplete features safely disabled)
- ✅ Real-time data synchronization across all role changes
- ✅ Query consistency verified (statistics match actual database state)
- ✅ No unauthorized access paths discovered in comprehensive testing

**STATUS**: Phase 1 foundation complete with backend integration tested. Ready for workflow implementation (modals, assignments, approvals).

### **Phase 2: Core Features - BACKEND INTEGRATION COMPLETE**

**✅ COMPLETED FEATURES:**
- **LUZ Timeline System**: Complete dual-view timeline architecture with backend integration
  - Self-contained shift timeline system with perfect alignment
  - Connected headers and visual design consistency
  - Real-time capacity management indicators showing actual staffing (0/1, 0/2, 0/3)
  - Connected to live shift data (3 operational shift templates)
  - Responsive filtering and display controls functional
  - Role-based feature access (Create Shift button for managers)
- **Backend Shift Data Integration**: Real Convex queries replacing mock data
- **Role Management System**: Live user statistics and role display functional

**🚧 IN PROGRESS:**
- **Workflow Implementation**: Modal dialogs and form handling for shift creation/editing
- **Assignment Pipeline**: Worker request submission and manager approval workflows

**📋 REMAINING:**
- **Interactive Features**: Click-to-edit, drag-and-drop assignment management
- **Real-time Collaboration**: Live assignment updates across connected clients
- **Mobile Optimization**: Touch interactions and responsive behavior improvements

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

## 🚨 CURRENT STATUS & CRITICAL IMPLEMENTATION GAPS

### **FRONTEND COMPLETE - BACKEND CRITICAL**
**Date Updated**: Current Session
**Status**: All frontend interfaces complete, immediate backend integration required

#### **✅ COMPLETED FRONTEND WORK**
- **LUZ System**: Dual timeline views with self-contained shift architecture
- **Role Management**: Complete staff/customer dual-mode interface with permission-based access
- **Permission System**: V2 tag-based system fully implemented and tested
- **Navigation**: Clean role-based interface with dynamic menu items
- **UI Components**: Production-ready interface components ready for data integration

#### **🚨 CRITICAL BACKEND GAPS**

##### **LUZ System Backend Requirements**
- **PRIORITY 1**: Replace mock data arrays with Convex queries
- **PRIORITY 2**: Implement shift CRUD operations with permission validation
- **PRIORITY 3**: Add real-time staffing calculations and conflict detection
- **PRIORITY 4**: Design shift assignment workflows and approval system

##### **Role Management Backend Requirements**
- **PRIORITY 1**: Connect role management interface to real user database
- **PRIORITY 2**: Implement staff/customer CRUD operations
- **PRIORITY 3**: Add customer-to-staff promotion workflow logic
- **PRIORITY 4**: Create tag assignment validation and audit trails

##### **Security & Validation Requirements**
- **PRIORITY 1**: Add server-side permission validation for all operations
- **PRIORITY 2**: Implement input sanitization and error handling
- **PRIORITY 3**: Add comprehensive data validation and business rule enforcement
- **PRIORITY 4**: Create audit logging for all role and shift modifications

#### **🛠 IMMEDIATE NEXT STEPS (Week 1-2)**
1. **Convex Schema Design**: Define data models for shifts, assignments, users with proper relationships
2. **Basic Backend CRUD**: Implement create/read/update/delete operations for core entities
3. **Data Migration**: Plan transition from mock data to production data structure
4. **Permission Middleware**: Add server-side role checking for all database operations

#### **⚠️ PRODUCTION BLOCKERS**
- **Mock Data Dependency**: All interfaces currently display static demo data
- **No Server Validation**: Client-side permissions only, no backend security enforcement
- **Missing Error Handling**: No comprehensive error states for failed operations
- **No Conflict Detection**: Scheduling conflicts not prevented or resolved
- **No Audit Trail**: No tracking of role changes or system modifications

#### **📈 SUCCESS METRICS FOR NEXT PHASE**
- **Data Integration**: All mock data replaced with live backend queries
- **Security**: All operations validated server-side with proper error handling
- **Functionality**: Complete CRUD operations for shifts, assignments, and user management
- **Performance**: Sub-200ms query response times for all timeline operations
- **Reliability**: Zero data loss during role modifications and shift scheduling

---

*Frontend foundation complete. Backend integration is the critical path to production deployment.*