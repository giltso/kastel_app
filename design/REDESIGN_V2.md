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
- Calendar Interface (simplified to support new shift system)

### **What We're REMOVING**

- Event Management System
- Professional Services (Pro Help)
- Suggestion Box System
- Advanced Calendar Features (drag/drop, complex approvals)
- Current Complex Shift System (replaced with redesigned version)


---

## 🏗️ V2 Core System Architecture

### **1. Shift Management System**

*Primary focus: Operational management and documentation*
the goal of this tool is to allow workers to ask for shifts during the coming week or 2. for this the tool needs to present the available shifts, handle work requests, and assigments by managers if needed. 


#### **Staff Roles & Permissions**
- **Staff (All)**:
  - [ ] *Define basic shift system access*

- **Workers**:
  - [ ] *Define shift request capabilities*
  - [ ] *Define available shift viewing*
  - [ ] *Define own assignment status*

- **Managers** (inherits Worker permissions +):
  - [ ] *Define shift assignment approval workflows*
  - [ ] *Define worker assignment capabilities*
  - [ ] *Define shift scheduling permissions*
  - [ ] *Define reporting access*

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

## 👥 Simplified Role System

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