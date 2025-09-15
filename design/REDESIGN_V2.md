# Kastel App V2 Redesign Document

## 🎯 Redesign Overview

### **Critical Decision: Major Simplification**
⚠️ **BREAKING CHANGE**: This redesign will remove most existing functionality and rebuild from ground up with three core focuses.

### **What We're KEEPING**
- Tool Rental System
- Course Management System
- Core Authentication & Roles
- Calendar Interface (simplified)

### **What We're REMOVING**
- Event Management System
- Professional Services (Pro Help)
- Suggestion Box System
- Advanced Calendar Features (drag/drop, complex approvals)
- Current Complex Shift System
- Multi-role emulation
- Homepage/Landing pages

---

## 🏗️ V2 Core System Architecture

### **1. Shift Management System**
*Primary focus: Operational management and documentation*

#### **Staff Roles & Permissions**
- **Workers**:
  - [ ] *Define shift viewing permissions*
  - [ ] *Define shift assignment capabilities*
  - [ ] *Define documentation access*

- **Managers**:
  - [ ] *Define approval workflows*
  - [ ] *Define scheduling permissions*
  - [ ] *Define reporting access*

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