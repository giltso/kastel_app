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

#### **LUZ Interface Design (Detailed Specifications)**

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
  - [ ] *Define if instructor can also request worker shifts*

#### **Core Functionality**
- [ ] *Define shift creation process*
- [ ] *Define assignment workflows*
- [ ] *Define documentation requirements*
- [ ] *Define reporting features*

#### **Data Model**
- [ ] *Design shift schema*
- [ ] *Design assignment relationships*
- [ ] *Design documentation structure*

---

### **2. Tool Rental System**
*Keeping existing implementation with refinements*

#### **Customer Roles & Permissions**
- **Customers**:
  - [ ] *Define rental browsing permissions*
  - [ ] *Define booking capabilities*
  - [ ] *Define account management*

- **Staff**:
  - [ ] *Define inventory management permissions*
  - [ ] *Define rental processing workflows*

#### **Core Functionality**
- [x] **KEEP**: Existing rental booking system
- [x] **KEEP**: Inventory management
- [ ] *Define any needed simplifications*

---

### **3. Educational Meetings (Courses)**
*Keeping existing implementation with refinements*

#### **Customer/Student Roles & Permissions**
- **Students**:
  - [ ] *Define course browsing permissions*
  - [ ] *Define enrollment capabilities*
  - [ ] *Define progress tracking*

- **Instructors**:
  - [ ] *Define course management permissions*
  - [ ] *Define student management capabilities*

#### **Core Functionality**
- [x] **KEEP**: Existing course enrollment system
- [x] **KEEP**: Course management
- [ ] *Define any needed simplifications*

---

## 👥 redifined Role System

### **Role Structure: Base + Tags**
```
├── Staff (base role for internal users)
│   └── Tags (additive, can combine):
│       ├── Worker (operational staff capabilities)
│       ├── Instructor (teaching capabilities)
│       └── Manager (requires Worker tag, adds management)
└── Customer (base role for external users)
```

### **Role Definitions**
- **Staff**: Base internal team member role
- **Customer**: Base external user role

### **Staff Tags (Additive & Combinable)**
- **Worker**: Operational staff capabilities (can be added to Staff)
- **Instructor**: Teaching and course management capabilities (can be added to Staff)
- **Manager**: Management and approval capabilities (requires Worker tag first)

### **Permission Matrix**
```
Feature          | Staff | Staff    | Staff       | Staff           | Customer
                | Base  | +Worker  | +Instructor | +Worker+Manager |
----------------|-------|----------|-------------|-----------------|----------
Shift Management| [ ]   | [ ]      | [ ]         | [ ]             | [ ]
Tool Rentals    | [ ]   | [ ]      | [ ]         | [ ]             | [ ]
Course System   | [ ]   | [ ]      | [ ]         | [ ]             | [ ]
```

### **Valid Role Combinations**
- **Staff** (base access only)
- **Staff + Worker** (operational capabilities)
- **Staff + Instructor** (teaching capabilities)
- **Staff + Worker + Instructor** (both operational and teaching)
- **Staff + Worker + Manager** (operational + management)
- **Staff + Worker + Instructor + Manager** (full staff access)
- **Customer** (external service access)

### **Future Challenge: Staff as Customer**
⚠️ **Known Issue to Address Later**: Staff members may need Customer access for personal use

**Scenarios Requiring Special Handling:**
- **Worker renting tools** for personal use (not work-related)
- **Instructor enrolling in courses** as a student
- **Staff members booking services** for personal needs
- **Billing and payment** separation between work and personal

**Implementation Considerations:**
- [ ] Design dual-role switching mechanism
- [ ] Separate personal vs. work transaction tracking
- [ ] Handle billing/payment context switching
- [ ] UI/UX for role context awareness
- [ ] Permission boundary management between Staff and Customer contexts

*Note: This is a complex edge case that will require dedicated design work in future phases.*

---

## 🗂️ Database Schema V2

### **Core Tables**
- [ ] **Users**: *Define simplified user schema*
- [ ] **Shifts**: *Design new shift data model*
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

### **Removed Pages**
- ❌ Events page
- ❌ Pro Help page
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

## 📋 Implementation Planning

### **Phase 1: Foundation**
- [ ] *Define new role system implementation*
- [ ] *Define database schema changes*
- [ ] *Define authentication flow*

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