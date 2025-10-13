# Kastel App - Project Overview

📍 **Navigation:**
- **Technical Guidelines**: [../CLAUDE.md](../CLAUDE.md) - Coding standards, workflows, testing protocols
- **Design Architecture**: [REDESIGN_V2.md](REDESIGN_V2.md) - Complete V2 architecture and role system
- **Session History**: [session_history.md](session_history.md) - Development timeline and historical context

**Purpose**: This document tracks current implementation status, feature progress, and priority tasks. Update after major milestones.

---

## 🎯 Application Purpose

**Hardware Shop Management System**: A comprehensive tool designed for a small family-owned hardware shop, built with simplicity and usability as core principles. The application must be accessible to users with minimal technical expertise.

### Core Services
- **Work Scheduling**: Staff shifts, operational events, and resource planning
- **Tool Rental**: Inventory management and customer rental workflows  
- **Course Registration**: Educational offerings and enrollment management
- **Customer Interactions**: Order processing and pickup coordination
- **Reporting**: Work forms and operational report generation

## 👥 User Roles & Permissions

### V2 Tag-Based Role System (CURRENT)
*Clean, additive permission system - see REDESIGN_V2.md for complete specifications*

**Base Roles:**
- **Staff** (`isStaff: true`): Internal employees with additive permission tags
- **Customer**: External authenticated users requiring services
- **Guest**: Public visitors (unauthenticated, accessed via logout)

**Staff Permission Tags (Additive & Combinable):**
- **Worker Tag** (`workerTag`): Access to LUZ portal, shift requests and management
- **Manager Tag** (`managerTag`): Approval workflows, shift scheduling (requires Worker Tag)
- **Instructor Tag** (`instructorTag`): Course management and educational content
- **Tool Handler Tag** (`toolHandlerTag`): Tool inventory and rental operations

**Customer Permission Tags (Item-Specific):**
- **Rental Approved Tag** (`rentalApprovedTag`): Approved for tool rental bookings
- **Student Tag**: Per-course access after enrollment (temporary)

### V2 Permission Highlights
- **LUZ System**: Staff+Worker access to unified scheduling hub
- **Role Emulation**: Development testing with 7 role combinations
- **Clean Navigation**: Role-based menu items (Home/LUZ/Tools/Courses)
- **Business Rules**: Manager tag requires Worker tag (enforced)
- **Additive System**: Multiple tags combine permissions naturally

## 🔧 Core Features & Workflows

### 1. LUZ System (Primary Staff Interface) - FULLY FUNCTIONAL
**Current Implementation Status:**
- ✅ **Database Schema**: Shift templates and assignments fully functional
- ✅ **Timeline Views**: Daily, Week, Month views with date-aware click handlers
- ✅ **Permission System**: Role-based access control working
- ✅ **Modal System**: Complete 7-modal workflow system operational
- ✅ **Timeline Integration**: Click handlers working with correct date context
- ✅ **Assignment Workflows**: Dual approval workflows (manager↔worker) fully implemented
- ✅ **Date Navigation**: Smart date button with picker modal and jump-to-today functionality
- ✅ **Real-time Updates**: Backend integration stable with Convex
- ✅ **Worker Assignment**: Display and interaction fully operational

**Recent Enhancements:**
- **Session 32 (Oct 8)**: Week View date fix, smart date button with context-aware navigation
- **Session 33 (Oct 9)**: Direct native date picker with instant calendar access
- **Session 34 (Oct 9)**: Mobile UI optimization, click-to-create fixes, comprehensive unit testing (83 tests passing)

### 2. Tool Rental System - FULLY FUNCTIONAL
- ✅ **Inventory Management**: Tool catalog with CRUD operations functional
- ✅ **Rental Workflows**: Booking system operational with approval processes
- ✅ **Manual Rental Creation**: Tool handlers can create rentals for walk-in (non-registered) customers
- ✅ **Walk-in Customer Support**: Pre-approved rentals for tech-illiterate customers via staff assistance
- ✅ **Contact Tracking**: Non-user renter name and contact information capture
- ✅ **LUZ Integration**: Tool rentals visible on calendar timeline
- ✅ **Staff Management**: Tool handler role with rental management operational
- ✅ **Customer Experience**: Tool browsing and rental requests functional
- ✅ **Display Integration**: Manual rentals shown with "Walk-in" badges in rental lists and history
- 🚧 **Advanced Features**: Overdue tracking and automated reminders pending

### 3. Educational Courses - FUNCTIONAL
- ✅ **Course Management**: Full CRUD operations for courses implemented
- ✅ **Course Types**: Single-session and multi-meeting courses fully supported
- ✅ **Session Management**: Multi-meeting courses with independent session scheduling
- ✅ **3-Step Wizard**: Progressive course creation UI (Basic Info → Sessions → Materials)
- ✅ **Enrollment System**: Student enrollment with approval workflows functional
- ✅ **Role Integration**: Instructor permissions with course ownership operational
- ✅ **Helper Instructors**: Multi-instructor support with permission differentiation
- ✅ **Student Experience**: Course browsing, enrollment requests, and tracking functional
- ✅ **Schema**: course_sessions table for multi-meeting courses deployed and tested
- 🚧 **Recurring Templates**: Future feature for independent course instances
- 🚧 **Advanced Features**: Course materials management and progress tracking pending

### 4. Role Management System - FUNCTIONAL
**Implementation Status:**
- ✅ **V2 Tag-Based Roles**: Full implementation (Staff+Worker+Manager+Instructor+ToolHandler)
- ✅ **Role Emulation**: Development testing interface operational
- ✅ **Permission Framework**: Complete access control with role-based filtering
- ✅ **User Management**: Full CRUD operations with search and filtering
- ✅ **Role Assignment**: Edit Roles modal with tag toggles functional
- ✅ **Staff Promotion**: Customer-to-staff promotion with tag assignment
- ✅ **Staff Demotion**: Staff-to-customer demotion with enrollment cleanup
- 🚧 **Audit Trail**: Role change tracking not implemented
- 🚧 **Bulk Operations**: Import/export functionality not implemented

### 5. Internationalization (i18n) - 85% COMPLETE
**Implementation Status:**
- ✅ **i18n Infrastructure**: Complete setup with i18next + react-i18next + browser language detection
- ✅ **Translation Files**: 6 namespaces with 500+ keys in Hebrew + English (shifts.json has 290+ keys)
- ✅ **Language Switcher**: Dropdown component with live language switching and persistence
- ✅ **RTL Support**: Automatic text direction switching for Hebrew (right-to-left)
- ✅ **Home Page**: Full translation for guest, customer, and staff views (30+ keys)
- ✅ **Navigation**: Header, menu, and sign-in/out buttons translated
- ✅ **Staff Dashboard**: LUZ hub, quick actions, development status translated
- ✅ **LUZ Main Page**: All views (day/week/month), overview panel, search - 100% translated
- ✅ **LUZ Components**: LUZOverview, LUZVerticalTimeline, LUZWeekView, LUZMonthView - fully translated with locale-aware dates
- ✅ **LUZ Modals (7/7)**: All modals complete - ShiftDetailsModal, CreateEditShiftModal, RequestJoinShiftModal, AssignWorkerModal, EditAssignmentModal, ReviewRequestModal, ApproveAssignmentModal
- 🚧 **Tools Page**: Needs translation implementation
- 🚧 **Educational Page**: Needs translation implementation
- 🚧 **Roles Page**: Needs translation implementation

**Supported Languages:**
- **Hebrew (עברית)** - Primary working language, complete with RTL support
- **English** - Default fallback, source of truth for translations
- **Russian (Русский)** - Structure ready, marked "Coming Soon"
- **French (Français)** - Structure ready, marked "Coming Soon"

**Technical Details:**
- **Custom Hook**: `useLanguage()` provides `t()`, `isRTL`, `currentLanguage`, `changeLanguage()`
- **Namespace Pattern**: Use `t("namespace:key.path")` for organized translations
- **Variable Interpolation**: Support for dynamic values like `{{name}}` in translations
- **HTML Direction**: Automatic `dir="rtl"` attribute on `<html>` element for Hebrew
- **Persistence**: Language preference saved to localStorage
- **Detection Order**: localStorage → navigator → htmlTag

**Translation Organization:**
```
public/locales/
  ├── en/                    # English (source of truth)
  │   ├── common.json        # App name, nav, actions, time, home, staff (30+ keys)
  │   ├── auth.json          # Sign in/out, access control
  │   ├── shifts.json        # LUZ calendar, shift management, assignments
  │   ├── tools.json         # Tool rentals, inventory, customer management
  │   ├── courses.json       # Educational courses, instructors, enrollment
  │   └── roles.json         # Role management, permissions, tags
  └── he/                    # Hebrew (production-ready)
      └── [same structure]
```

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: React 19 + Vite for modern development experience
- **Routing**: TanStack Router with type-safe, role-based navigation
- **State**: TanStack Query + Convex for real-time data synchronization
- **Styling**: Tailwind CSS 4 + daisyUI 5 with custom themes
- **Forms**: TanStack Form + Zod v4 for robust validation
- **Auth**: Clerk integration with role-based access control

### Backend Stack
- **Database**: Convex real-time database with automatic synchronization
- **API**: Convex functions (queries, mutations, actions) with type safety
- **Authentication**: Integrated Clerk + Convex auth with JWT validation
- **File Storage**: Convex file storage for documents and images
- **Real-time**: Live updates across all connected clients

## Current Development Status & Next Phase Requirements

### 🚨 **PRIORITY 1: Workflow Implementation** ✅ COMPLETED

#### **LUZ System Workflow Requirements** ✅ COMPLETED
- ✅ **Modal Dialogs**: Complete 7-modal system (ShiftDetailsModal, CreateEditShiftModal, RequestJoinShiftModal, AssignWorkerModal, EditAssignmentModal, ApproveAssignmentModal, ReviewRequestModal)
- ✅ **Assignment Workflows**: Dual approval system implemented (manager↔worker, worker↔manager) with assignment editing capability
- ✅ **Date Integration**: Timeline views connected to real scheduling with date-aware click handlers (Session 32)
- ✅ **Date Navigation**: Smart date button with context-aware picker/jump functionality (Session 32)
- ✅ **Week View Fix**: Shifts now correctly update selectedDate to clicked day instead of current date (Session 32)
- ✅ **Conflict Detection**: Comprehensive validation and real-time conflict prevention
- ✅ **Real-time Updates**: Live backend integration with Convex and proper state management
- ✅ **Assignment Editing**: Workers can edit existing assignments with role-based approval workflows

#### **Role Management Workflow Requirements**
- **Edit User Interface**: Implement modal forms for role tag modification
- **Promotion Workflows**: Build customer-to-staff conversion interfaces
- **Bulk Operations**: Add mass user import/export functionality
- **Change Tracking**: Implement audit trail for all role modifications

### 🔧 **PRIORITY 2: Production-Ready Features**

#### **Data Validation & Security**
- **Input Sanitization**: Validate all user inputs on server side
- **Error Handling**: Comprehensive error states and user feedback
- **Performance Optimization**: Query optimization and caching strategies
- **Backup & Recovery**: Data backup procedures and rollback capabilities

#### **Advanced Functionality**
- **Search & Filtering**: Real backend search across users, shifts, and assignments
- **Bulk Operations**: Mass import/export of staff data and role assignments
- **Audit Logging**: Track all role changes and system modifications
- **Notification System**: Email/SMS alerts for shift changes and approvals

### 📊 **PRIORITY 3: Analytics & Reporting**
- **Usage Metrics**: Track system usage and identify optimization opportunities
- **Operational Reports**: Generate staffing reports and shift analysis
- **Performance Dashboards**: Real-time system health and user activity monitoring
- **Business Intelligence**: Data insights for operational decision making

## 🚀 Immediate Development Roadmap

### **Week 1-2: Workflow Implementation**
1. **Modal Dialog System**: Implement create/edit forms for shifts and user management
2. **Assignment Pipeline**: Build worker request submission and manager approval workflows
3. **Form Validation**: Add comprehensive input validation and error handling
4. **Date Integration**: Connect timeline views to real scheduling logic

### **Week 3-4: Advanced Features**
1. **Drag-and-Drop**: Implement interactive assignment management interface
2. **Conflict Detection**: Add scheduling validation and double-booking prevention
3. **Real-time Collaboration**: Ensure live updates across all connected clients
4. **Mobile Optimization**: Improve responsive design for tablet/mobile interfaces

### **Month 2: Advanced Features**
1. **Workflow Implementation**: Customer-to-staff promotion and approval workflows
2. **Notification System**: Email/SMS alerts for critical system events
3. **Audit Trail**: Complete change tracking and modification history
4. **Performance Optimization**: Query optimization and caching implementation

### **Month 3+: Production Readiness**
1. **Load Testing**: Performance testing under realistic usage scenarios
2. **Backup Systems**: Automated backup and disaster recovery procedures
3. **Monitoring**: System health monitoring and alerting infrastructure
4. **Documentation**: Complete API documentation and user guides

## 🚨 Critical Technical Debt and Unresolved Issues

### **Calendar System Problems (Session 27 - September 21, 2025)**
- ❌ **User-Reported vs Technical Reality Mismatch**: User claimed calendar dates were wrong, but technical investigation showed correct calculations
- ❌ **Architecture Instability**: Horizontal timeline view removed mid-development due to complexity, indicating unstable design decisions
- ❌ **Date Calculation Complexity**: Multiple overlapping functions (getWeekDates, getMonthDates, generateMonthGrid) with potential synchronization issues
- ❌ **No Calendar Library Integration**: System uses custom JavaScript Date logic, limiting configuration options and increasing maintenance burden
- ❌ **Timezone/Locale Testing Gaps**: No validation tools for different browser/OS environments that might affect date display

### **LUZ System Implementation Gaps - RESOLVED**
- ✅ **Timeline View Reduction**: Originally planned 4 views (vertical, horizontal, week, month) reduced to 3 due to complexity - system now stable with 3 views
- ✅ **Worker Assignment Visualization**: Fixed display of individual workers in week view containers and timeline views
- ✅ **Hourly Capacity Calculation**: Fixed multiple time slot support and cross-shift capacity bleeding in timeline displays
- ✅ **Week View Date Selection**: Fixed shifts opening with wrong date - now correctly updates selectedDate to clicked day (Session 32)
- ✅ **Date Navigation UX**: Added smart date button with context-aware picker/jump functionality (Session 32)
- **Testing Infrastructure**: Comprehensive date/calendar validation testing still needed

### **Development Process Issues**
- **User Feedback Reliability**: Difficulty reproducing user-reported problems during technical investigation
- **Architecture Decision Instability**: Major component removal (horizontal timeline) indicates poor initial planning
- **Complex Calendar Logic**: Multiple interdependent date calculation functions prone to edge cases
- **Limited Configuration Options**: Week start day changes require code modifications rather than settings

### **Current Implementation Status (Post-Backend Integration Testing)**
- ✅ **Real Data Integration**: LUZ and Role Management connected to live database
- ✅ **Permission Enforcement**: Server-side role validation working correctly
- ✅ **Real-time Updates**: Live data synchronization functional
- ⚠️ **Calendar System**: Functional but with unresolved user experience issues
- 🚧 **User Workflows**: Modal dialogs and form interactions need implementation
- ⏳ **Mobile Responsiveness**: Tablet/mobile optimization pending
- ⏳ **Error Handling**: Comprehensive error boundaries and user feedback needed

### **Future Testing Requirements (After Workflow Implementation)**
- **Enhanced Calendar Testing**: Comprehensive date validation across different environments and edge cases
- **User Environment Investigation**: Browser/OS locale settings impact on date display
- **End-to-End Workflow Testing**: Full assignment request/approval cycles
- **Concurrent User Testing**: Multi-user assignment conflicts and real-time updates
- **Mobile Interface Testing**: Touch interactions and responsive behavior validation
- **Performance Load Testing**: Database performance under realistic usage scenarios
- **Data Migration Testing**: Validate system behavior during database schema changes

## 📋 Current Priority Tasks

### 🚀 Next Session Priority: Deployment Preparation
**Goal**: Get application ready for production deployment

**Pre-Deployment Checklist**:
1. **Environment Configuration**
   - [ ] Verify all environment variables are properly configured
   - [ ] Set up production Convex deployment
   - [ ] Configure Clerk for production domain
   - [ ] Review and update CORS/security settings

2. **Testing & Quality Assurance**
   - [x] Unit tests passing (83/83 tests)
   - [x] TypeScript compilation clean (zero errors)
   - [ ] End-to-end workflow testing
   - [ ] Cross-browser compatibility testing
   - [ ] Mobile responsiveness verification (all breakpoints)
   - [ ] Performance testing under load

3. **Production Readiness**
   - [ ] Error boundary implementation
   - [ ] Loading states and error messages
   - [ ] Database migration strategy
   - [ ] Backup and recovery procedures
   - [ ] Monitoring and logging setup
   - [ ] Documentation for deployment process

4. **Security & Performance**
   - [ ] Input validation on all forms
   - [ ] Rate limiting on API endpoints
   - [ ] Query optimization and indexing
   - [ ] Image optimization and lazy loading
   - [ ] Bundle size analysis and optimization

5. **User Acceptance Testing**
   - [ ] Staff workflows (shift creation, assignment)
   - [ ] Manager workflows (approvals, scheduling)
   - [ ] Tool rental workflows
   - [ ] Course enrollment workflows
   - [ ] Role management workflows

### Immediate (This Week)
1. **Deployment Preparation**: Complete pre-deployment checklist above
2. **Mobile Testing**: Comprehensive mobile device testing across all features
3. **Error Handling**: Implement error boundaries and user-friendly error messages

### Short-term (Next 2 Weeks)
1. **Production Deployment**: Deploy to production environment
2. **User Training**: Create documentation and train staff users
3. **Monitoring Setup**: Implement error tracking and performance monitoring

### Medium-term (Next Month)
1. **Feature Enhancements**: Based on user feedback from production
2. **Analytics Dashboard**: Usage metrics and operational reporting
3. **Notification System**: Email/SMS integration for shift changes and approvals