# Kastel App - Project Overview

## 🎯 Application Purpose

**Hardware Shop Management System**: A comprehensive tool designed for a small family-owned hardware shop, built with simplicity and usability as core principles. The application must be accessible to users with minimal technical expertise.

### Core Services
- **Work Scheduling**: Staff shifts, operational events, and resource planning
- **Tool Rental**: Inventory management and customer rental workflows  
- **Course Registration**: Educational offerings and enrollment management
- **Customer Interactions**: Order processing and pickup coordination
- **Reporting**: Work forms and operational report generation

## 👥 User Roles & Permissions

### Current Role System (In Transition)
*Note: Moving toward tag-based flexible role system - see CALENDAR_CENTRIC_REDESIGN.md*

**Base Roles:**
- **Staff**: Operational employees (workers, managers)
- **Customer**: External users requiring services  
- **Guest**: Public visitors (limited access)
- **Dev**: Development/testing role (emulates other roles)

**Additional Tags:**
- **Pro**: Professional services provider (can be combined with staff roles)
- **Manager**: Approval permissions (full or conditional/shift-specific)

### Permission Highlights
- **Staff**: Calendar-centric interface with embedded manager approvals
- **Customers/Guests**: Service-focused interface with booking capabilities
- **Dev**: Full system access with role emulation tools
- **Pro Tag**: Enhanced profile and service offering capabilities
- **Manager Tag**: Approval workflows and administrative functions

## 🔧 Core Features & Workflows

### 1. Calendar System (Primary Interface for Staff)
- **Event Management**: Create, edit, approve operational events
- **Shifts System**: Recurring shift patterns with assignment and swapping
- **Advanced Interactions**: Drag-and-drop event manipulation, resizing, cross-day moves
- **Real-time Updates**: Live status indicators and capacity management
- **Embedded Approvals**: Manager approval workflows integrated into calendar view

### 2. Service Management
- **Requests**: Customer service requests with approval workflows
- **Tool Rentals**: Complete inventory and rental management system
- **Courses**: Educational offerings with enrollment and scheduling
- **Professional Services**: Pro worker marketplace for specialized services

### 3. Operational Tools
- **Tickets**: Problem reporting and collaborative resolution
- **Forms**: Custom form builder for work tracking and reports
- **Notifications**: Real-time alerts for approvals and assignments
- **Role Management**: Dynamic permission system with role transitions

### 4. Customer Experience
- **Public Interface**: Service browsing and educational content interation.
- **Booking System**: Self-service appointment and rental scheduling
- **Request Tracking**: Status updates and communication tools ( not of now)
- **Professional Directory**: Browse and contact pro service providers

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

## ✅ Implementation Status

### Completed Core Systems
- ✅ **Authentication & Roles**: Clerk integration with dev role emulation

- ✅ **Event Management**: Full CRUD with approval workflows and participants
- ✅ **Shifts System**: Recurring shift patterns with assignment workflows
- ✅ **Tool Rentals**: Complete inventory and rental management
- ✅ **Courses**: Educational offerings with enrollment system
- ✅ **Professional Services**: Pro worker marketplace and profiles
- ✅ **Forms System**: Custom form builder with work tracking
- ✅ **Suggestion Box**: Global feedback collection with developer dashboard
- ✅ **Responsive Design**: Mobile, tablet, desktop optimized
- ✅ **Custom Themes**: Professional light/dark theme system

### In Development
- 🔄 **Tag-Based Roles**: Flexible permission system (planned major overhaul)
- 🔄 **Calendar-Centric Interface**: Embedded approvals for staff users
- 🔄 **Assignment System**: Core shift assignment functionality fixes needed
- ⚠️ **Calendar System**: Multi-view support complete, drag-and-drop partially implemented (needs refinement) 

### Planned Features
- 📋 **Calendar-Centric Redesign**: Tag-based role system with adaptive interfaces (see CALENDAR_CENTRIC_REDESIGN.md)
- 📋 **Advanced Request System**: Enhanced workflows and assignment logic
- 📋 **Ticket Management**: Collaborative problem resolution
- 📋 **File Upload System**: Document and image management
- 📋 **Analytics Dashboard**: Usage tracking and business insights

## 🎯 Current Development Focus

### Immediate Priority: Calendar-Centric Architecture
*Detailed plan in CALENDAR_CENTRIC_REDESIGN.md*

**Key Objectives:**
1. **Tag-Based Role System**: Replace rigid roles with flexible tag system
2. **Interface Adaptation**: Different UIs for staff vs customers/guests
3. **Embedded Approvals**: Manager workflows integrated into calendar
4. **Assignment System Fixes**: Resolve core shift assignment functionality

### Next Session Priorities
1. Fix shift assignment system functionality
2. Implement day-of-week order fixes (Sunday-first)
3. Add non-recurring shift support
4. Test role-adaptive interface concepts

## 📅 Development History

### Session 1 - August 20, 2025

**Goals**: Initialize Kastel hardware shop management app with basic navigation and authentication

**Completed**:
- ✅ **Project Initialization**: Set up full-stack TypeScript app structure
- ✅ **Authentication System**: Integrated Clerk with working sign-in/sign-up flow
- ✅ **Backend Deployment**: Deployed Convex backend to `https://energetic-badger-805.convex.cloud`
- ✅ **Database Schema**: Created comprehensive schema for users, events, forms, and submissions
- ✅ **Three Core Pages**: Events, Calendar, and Forms with proper navigation
- ✅ **Responsive Design**: Mobile, tablet, and desktop layouts with DaisyUI 5
- ✅ **Protected Routes**: Authentication-gated pages working correctly
- ✅ **Navigation System**: Header navigation + mobile sidebar with active states

**Technical Stack Implemented**:
- Frontend: React 19 + Vite + TanStack Router + TanStack Query
- Backend: Convex (deployed and functional)
- Auth: Clerk (tested with development instance)
- Styling: Tailwind CSS 4 + DaisyUI 5
- Type Safety: Full TypeScript integration

**Next Steps**:
- Implement functional event creation and management
- Build calendar interaction (add/edit/delete events)
- Create form builder with work hours/team report templates
- Add user roles and permissions system
- Populate database with test data

### Session 2 - August 21, 2025

**Goals**: Define user roles and system architecture (Planning session - no code)

**Completed**:
- ✅ **Role System Design**: Defined comprehensive 5-role hierarchy (Tester/Guest/Customer/Worker/Manager)
- ✅ **Workflow Architecture**: Designed three distinct item types (Requests/Events/Tickets) with proper approval flows
- ✅ **Portal Structure**: Planned role-based interfaces with appropriate permissions
- ✅ **Authorization Framework**: Detailed approval workflows and notification systems
- ✅ **Documentation**: Updated PROJECT_OVERVIEW.md with complete role and workflow specifications

**Key Design Decisions**:
- Role-based portals: Guest/Customer share portal vs Worker/Manager operational interface
- Request approval: Customer requests require manager approval → optional worker assignment
- Event workflow: Worker creation → Manager approval with in-app notifications
- Problem tickets: Separate from requests, collaborative resolution, manager-only closure
- Dev testing: Tester role for environment-specific user emulation

### Session 3 - August 25, 2025

**Goals**: Implement role-based access control, database schema updates, and scheduled event system

**Completed**:
- ✅ **Development Environment**: Successfully configured Convex development environment (team: giltso, project: kastel-app)
- ✅ **Role Management System**: Implemented comprehensive 5-role hierarchy with database schema and user management functions
- ✅ **Role Switcher**: Added role emulation dropdown for tester users with all 5 roles (Tester/Guest/Customer/Worker/Manager)
- ✅ **Clean UI**: Removed debug elements from main interface, moved admin functions to backend-only access
- ✅ **Scheduled Events System**: Complete implementation with:
  - ✅ **Event Schema**: Database schema with title, description, date/time fields, and recurring options
  - ✅ **Event Creation Form**: Professional modal with date pickers, time inputs, and event type selection
  - ✅ **Recurring Events**: One-time vs weekly recurring toggle with days-of-week selection
  - ✅ **Form Validation**: TanStack Form + Zod schema validation
  - ✅ **UI Integration**: Modal integrated with Events page and quick action buttons

**Technical Achievements**:
- Backend: Updated Convex schema and functions for scheduled events with recurring support
- Frontend: Complete event creation modal with professional UI/UX
- Database: Development environment with proper team/project configuration
- Role System: Fully functional role switching and permission management
- Authentication: Clerk development environment with proper JWT configuration

### 🐛 Known Issues

**Calendar Drag Interactions**:
- ❌ **Drag and Drop Integration**: Advanced drag/drop features are partially implemented but not fully stable
  - Status: Edge dragging, cross-day dragging, and multi-day events need refinement
  - Impact: Inconsistent behavior during event manipulation
  - Priority: High - core calendar functionality
  - Note: Basic event creation and editing work correctly via modals

### Session 4 - August 26, 2025

**Goals**: Complete event management system with advanced calendar interactions

**Completed**:
- ✅ **Event Creation System**: Fixed validation errors and implemented full CRUD operations
- ✅ **Advanced Calendar Views**: Day, week, month views with professional layout and navigation
- ✅ **Drag & Drop System**: Complete event moving with @dnd-kit integration
- ✅ **Event Editing**: Modal-based editing with participant management and search
- ✅ **Role-Based Permissions**: Event approval workflow with worker/manager permissions
- ✅ **Recurring Events**: Weekly recurring events with proper state management
- ✅ **Event Positioning**: Advanced concurrent events display with side-by-side positioning

### Session 5 - August 27, 2025

**Goals**: Implement comprehensive business systems (tools & courses)

**Completed**:
- ✅ **Tool Rental System**: Complete operational/customer views with rental workflows
- ✅ **Educational Courses**: Full course management with enrollment and approval systems
- ✅ **Role-Based UI**: Separate interfaces for staff vs customers across all systems
- ✅ **Calendar Integration**: Tools and courses create linked calendar events
- ✅ **Database Schema**: Extended schema for tools, rentals, courses, and enrollments

### Session 6 - August 28, 2025

**Goals**: Polish calendar interactions and implement advanced dragging features

**Completed**:
- ✅ **Calendar Design Improvements**: 
  - Redesigned header layout (toggle left, title center, navigation right)
  - Enhanced cursor styles for professional feel
  - Centered week view with proper max-width constraints
  - Redesigned day view with events sidebar for better space utilization
- ✅ **Event Edge Dragging**: 
  - Cursor-position-based event resizing with 15-minute snapping
  - Visual resize handles that appear on hover
  - Real-time time updates based on exact cursor position
  - Minimum duration enforcement and boundary checking
- ✅ **Cross-Day Event Dragging**: 
  - Visual drag zones for previous/next day in day view
  - Real-time preview of target date and time
  - Automatic navigation to target day after successful drop
  - Gradient backgrounds with professional styling

**Technical Achievements**:
- Advanced drag interactions with precise cursor tracking
- Professional visual feedback systems
- Responsive calendar layouts across all device sizes
- Real-time event manipulation with database synchronization

### Session 7 - August 28, 2025 (Continued)

**Goals**: Attempt advanced drag interactions (partially completed)

**Attempted but Incomplete**:
- ⚠️ **Multi-Day Events**: Edge dragging implementation started but needs refinement
- ⚠️ **Cross-Day Dragging**: Basic functionality implemented but unstable
- ⚠️ **Advanced Resize**: Complex edge dragging behavior partially working
- ⚠️ **Drag Zone Visual**: Improved positioning but interaction logic needs work

**Status**: Drag and drop features marked as incomplete - requires future refinement session

### Session 8 - August 28, 2025

**Goals**: Color customization and theme toggle implementation

**Completed**:
- ✅ **Custom Theme Implementation**: Integrated "kastel-nord" (light) and "kastle-dim" (dark) themes
- ✅ **Theme Configuration**: Applied custom color schemes with hardware shop branding using proper DaisyUI syntax
- ✅ **Color System**: Implemented OKLCH color format for better consistency and professional appearance
- ✅ **Theme Toggle Component**: Created interactive theme switcher with Sun/Moon icons
- ✅ **Theme Persistence**: Added localStorage persistence and system preference detection
- ✅ **UI Integration**: Positioned theme toggle next to RoleSwitcher in navbar (desktop and mobile)
- ✅ **CSS Error Resolution**: Fixed DaisyUI plugin syntax errors that prevented themes from loading

**Technical Achievements**:
- Custom DaisyUI themes using `@plugin "daisyui/theme"` syntax with OKLCH color definitions
- ThemeToggle component with automatic icon switching and smooth transitions
- Light theme "kastel-nord": Clean whites/grays with subtle blue-purple accents (default)
- Dark theme "kastle-dim": Deep blues with bright cyan primary and warm accents
- Both themes include custom radius, border widths, and animation configurations
- Full responsive integration in root layout component
- System preference detection with manual override capability

### Session 9 - September 1, 2025

**Goals**: Complete suggestion system implementation and tester→dev role migration

**Completed**:
- ✅ **Completed Session Work**:
  - Fixed tester→dev role migration and updated all references
  - Implemented complete suggestion box system with global access
  - Added suggestion management dashboard for developers
  - Created customer-focused home page with work hours, contact info, and service previews
  - Implemented automatic navigation logic (operational users → Calendar, guests/customers → Home)
  - Built complete professional services system with pro tag functionality

**Key Features Implemented**:

**1. Suggestion Box System**
- ✅ **Global Implementation**: Added suggestion box trigger to all pages via root layout
- ✅ **Modal Interface**: Professional modal with problem/solution input fields
- ✅ **Context Collection**: Automatically captures page URL and context for developer reference
- ✅ **Database Integration**: Full Convex backend with suggestions table and CRUD operations
- ✅ **Developer Dashboard**: Complete suggestion management interface at `/suggestions`
- ✅ **Status Management**: Pending/reviewed/implemented/rejected status workflow
- ✅ **Search & Filtering**: Advanced search by status, location, and content

**2. Customer-Focused Home Page Redesign**
- ✅ **Hero Section**: Professional gradient hero with clear call-to-action
- ✅ **Business Information**: Store hours, contact details, and location info
- ✅ **Service Previews**: Tool rental, educational courses, and professional services windows
- ✅ **Trust Indicators**: Professional credibility section with company values
- ✅ **Role-Based Navigation**: Automatic redirect logic for operational vs customer users

**3. Professional Services System (Pro Help)**
- ✅ **Pro Tag System**: Tag-based professional capabilities (not role-based)
- ✅ **Profile Management**: Complete profile creation/editing with specialties, rates, contact info
- ✅ **Professional Search**: Browse and search interface for non-pro users
- ✅ **Permission Integration**: Pro-specific permissions for profile management
- ✅ **Role Switcher Integration**: Pro tag toggle in dev emulation tools

**4. System Improvements**
- ✅ **Role Migration**: Successfully migrated from "tester" to "dev" role across entire system
- ✅ **Navigation Logic**: Smart routing based on user permissions and roles
- ✅ **Permission System**: Enhanced permissions with pro tag support
- ✅ **Data Migration**: Clean migration tools for role system updates

**Technical Achievements**:
- Advanced form validation with TanStack Form + Zod integration
- Complex permission system with role + tag-based access control
- Professional modal interfaces with proper error handling
- Real-time search and filtering functionality
- Clean data migration patterns with temporary schema updates
- Role-based UI rendering with automatic redirects

**Database Schema Updates**:
- Added `suggestions` table with similarity detection and status management
- Added `pro_profiles` table with comprehensive professional information
- Added `proTag` field to users for professional service capabilities
- Implemented proper indexing for search and filtering operations

### Session 10 - September 2, 2025

**Goals**: TypeScript error resolution and Special Events (Shifts) system implementation

**Completed**:
- ✅ **TypeScript Error Resolution (62% reduction)**:
  - Fixed 25+ blocking errors in forms, events, courses, calendar components
  - Resolved validation schema conflicts and type mismatches
  - Updated DEPLOYMENT_BLOCKERS.md - now ready for feature development
  - Application fully functional despite remaining 15 non-blocking warnings

- ✅ **Special Events (Shifts) System - Core Implementation**:
  - Complete database schema: shifts, shift_assignments, shift_swaps, golden_time_requests
  - Full backend API with capacity management and status calculation
  - CreateShiftModal for managers with recurring day selection and capacity settings
  - ShiftCard component with real-time status indicators (bad/close/good/warning)
  - Shifts management page with date selector, self-assignment, and stats dashboard
  - Worker self-assignment and manager assignment workflows
  - Navigation integration (desktop and mobile)

**Technical Achievements**:
- Advanced capacity management with real-time status calculation
- Role-based access control for shift creation and assignment
- Recurring shift patterns with day-of-week selection
- Worker-to-worker shift swap request system foundation
- Golden time detection for overpopulated shifts

**Database Schema Updates**:
- Added 4 new tables for comprehensive shift management
- Proper indexing for efficient queries and date-based lookups
- Support for shift capacity, recurring patterns, and worker assignments

**❗ IDENTIFIED ISSUES** (see SHIFTS_IMPLEMENTATION_ISSUES.md):
- Shift assignment functionality not working end-to-end
- Calendar integration missing (no semi-transparent shift display)
- No support for non-recurring shifts
- Day-of-week order incorrect (should start Sunday)
- Events tab redundancy with shifts system
- Calendar assignment workflow missing
- Worker hours reporting system needed

**Next Session Focus**: Fix core assignment functionality and calendar integration

## 🚀 Future Feature Roadmap

### ✅ Recently Completed Features

**1. Suggestion Box System** ✅ COMPLETED
- ✅ Universal feedback collection across all application tabs
- ✅ Professional modal interface with context collection
- ✅ Developer dashboard with status management workflow
- ✅ Advanced search and filtering capabilities

**2. Professional Services System (Pro Help)** ✅ COMPLETED  
- ✅ Tag-based professional capabilities system
- ✅ Complete profile management with specialties and contact info
- ✅ Professional search and browse interface
- ✅ Integration with role switcher for dev testing

**3. Customer-Focused Home Page** ✅ COMPLETED
- ✅ Professional landing page with hero section
- ✅ Business information (hours, contact, location)
- ✅ Service preview windows for all major features
- ✅ Trust indicators and professional credibility section

### Next Session Priority: Deployment Preparation

**TypeScript Error Resolution** - IMMEDIATE PRIORITY
- **Description**: 40+ TypeScript build errors preventing deployment readiness
- **Critical Issues**:
  - **Form Validation**: TanStack Form + Zod integration broken in CreateEventModal/EditEventModal
  - **Event Management**: Missing approval parameters and type mismatches in events.tsx  
  - **Course System**: Property mismatches in course queries and components
  - **Type Safety**: Missing properties and implicit any types across components
- **Documentation**: Complete error analysis available in `DEPLOYMENT_BLOCKERS.md`
- **Fix Priority**: Forms → Events → Courses → Types → Deployment
- **Estimated Effort**: 2-3 hours of systematic error resolution
- **Goal**: Production-ready build with full TypeScript compliance

### Future Session Focus: Special Events System

**Special Events (Super Events)**
- **Description**: Advanced recurring operational events system for ongoing business operations
- **Key Features**:
  - **Shift Management**: Recurring shifts with worker assignments
  - **Swap System**: Worker-to-worker shift swapping without manager approval
  - **Coverage Management**: Automatic shift coverage and backup assignments
  - **Pattern Recognition**: Smart scheduling patterns (weekly, bi-weekly, monthly)
  - **Notification System**: Automated alerts for shift changes and coverage needs
- **Integration**: Enhanced calendar with special event types and color coding
- **Technical Requirements**: Advanced recurring event logic, peer-to-peer approval system, notification framework

### Future Implementation Priority

1. **TypeScript Error Resolution** - IMMEDIATE: Fix build errors for deployment readiness
2. **Deployment** - Production deployment to Vercel + Convex production environment  
3. **Special Events System** - Advanced recurring operational events and shift management
4. **Enhanced Request System** - Advanced approval workflows and assignment logic
5. **Ticket Management** - Collaborative problem resolution system
6. **File Upload System** - Document management and image storage
7. **Advanced Analytics** - Usage tracking and business insights
8. **Mobile App** - Native mobile application for on-the-go access


