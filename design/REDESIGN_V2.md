# Kastel App V2 Redesign Document

## 🎯 Redesign Overview

### **Critical Decision: Major Simplification**
⚠️ **BREAKING CHANGE**: This redesign will remove most existing functionality and rebuild from ground up with three core focuses.

### **What We're KEEPING**
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
- Multi-role emulation
- Homepage/Landing pages

---

## 🏗️ V2 Core System Architecture

### **1. Shift Management System**
*Complete redesign: Operational management and documentation based on new job requirements*

#### **NEW Requirements Analysis**
- [ ] *Document current job operational needs*
- [ ] *Define what "shift" means in new context*
- [ ] *Identify documentation requirements*
- [ ] *Map operational workflows*

#### **Staff Roles & Permissions (To Be Redefined)**
- **Workers**:
  - [ ] *Define shift interaction capabilities based on new requirements*
  - [ ] *Define operational documentation access*
  - [ ] *Define workflow participation*

- **Managers**:
  - [ ] *Define operational oversight capabilities*
  - [ ] *Define scheduling/planning permissions*
  - [ ] *Define reporting and analytics access*

#### **Core Functionality (Clean Slate Design)**
- [ ] *Design shift creation/definition process*
- [ ] *Design operational workflow management*
- [ ] *Design documentation and reporting system*
- [ ] *Design integration with calendar system*

#### **Data Model (New Schema)**
- [ ] *Design shift data structure for new requirements*
- [ ] *Design operational tracking relationships*
- [ ] *Design documentation and reporting schema*

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

### **Base Roles**
- [ ] *Define worker role scope*
- [ ] *Define manager role scope*
- [ ] *Define customer role scope*
- [ ] *Define instructor role scope*

### **Permission Matrix**
```
Feature          | Worker | Manager | Customer | Instructor
----------------|--------|---------|----------|------------
Shift Management| [ ]    | [ ]     | [ ]      | [ ]
Tool Rentals    | [ ]    | [ ]     | [ ]      | [ ]
Course System   | [ ]    | [ ]     | [ ]      | [ ]
```

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