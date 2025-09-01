# Kastel App - Project Overview

## 🎯 Goal Overview

this app is suppossed to be a tool made to serve a mom and pop hardwere shop. the app need to be usable to people with very low understanding of the tech used. the services its meant to help with are:

- work schedualing
- tool rental
- course sign up 
- customer order-pick up interaction
- work forms and reports generation

## 👥 User Roles & Permissions System

### Role Hierarchy

**Tester** (Development Environment Only)
- Can impersonate any role for testing purposes
- Role emulation dropdown/switcher
- Test data generation tools
- Debugging utilities

**Guest** (Default role for new users)
- Browse public services
- Create simple requests
- Request role upgrades
- Track their own requests
- Limited read-only access

**Customer** (Special external user role)
- All guest capabilities
- Create customer-specific requests
- Enhanced tracking dashboard
- Customer support features
- Access to customer portal (extension of guest portal)

**Worker** (Operational staff)
- Handle guest/customer requests
- Create events (requires manager approval)
- Report problems as tickets (manager post-review)
- Limited administrative functions
- Access to worker portal

**Manager** (Highest operational permissions)
- Approve/reject all worker requests
- Manage role transitions via in-app tools
- Full event management
- Approve customer requests and assign to workers
- Close problem tickets
- System oversight and reporting

### Item Types & Workflows

**1. Requests** (Service-oriented)
- **Guest Requests**: Simple service requests with basic routing
- **Customer Requests**: Enhanced requests requiring manager approval → potential worker assignment
- Different source types with unique data structures
- Full tracking available to request originators

**2. Events & Courses** (Operational scheduling)
- Workers create events → Manager approval required
- In-app notifications for pending approvals
- Full CRUD operations for managers
- Advanced calendar with drag-and-drop interactions:
  - Event moving via drag and drop
  - Event resizing via edge dragging
  - Cross-day event dragging
  - Multi-day event creation via edge dragging to next/previous day
  - Day/week/month views with responsive design
  - Real-time visual feedback and cursor-position-based interactions

**Courses** (Educational offerings)
- Course creation and management by staff
- Student enrollment system with approval workflow
- Role-based access (staff vs customers)
- Calendar integration for course events
- Payment status tracking
- Skill level categorization (beginner/intermediate/advanced)

**Tool Rental System**
- Complete tool inventory management
- Rental request system with approval workflow
- Role-based UI (operational vs customer views)
- Calendar integration for rental periods
- Condition tracking and pricing management

**Super Events** (Recurring operational events)
- Events that happen constantly such as shifts
- Allow for swaps without manager approval (worker to worker approval)
- Automated scheduling patterns
- Shift coverage management

**3. Tickets** (Problem resolution system)
- Workers report problems → Collaborative resolution
- Comment threads for manager/worker discussion
- Only managers can close tickets
- Separate from request system

## 📋 General App Structure

### Frontend (React + Vite + TanStack Router)

- **Authentication**: Clerk integration for user management
- **Routing**: TanStack Router for type-safe navigation with role-based access
- **State Management**: TanStack Query + Convex integration
- **UI Framework**: Tailwind CSS 4 + daisyUI 5
- **Forms**: TanStack Form + Zod v4 validation
- **Role-Based Portals**: Separate interfaces for guests/customers vs workers/managers

### Backend (Convex)

- **Database**: Convex real-time database
- **API**: Convex functions (queries, mutations, actions)
- **Authentication**: Convex + Clerk integration with role management
- **File Storage**: Convex file storage system
- **Notifications**: In-app notification system for approvals

### Key Features

- [x] User authentication and profiles
  - [x] Clerk integration with sign-in/sign-up
  - [ ] Role-based access control (Guest/Customer/Worker/Manager/Tester)
  - [ ] In-app role transition management
- [x] Core functionality (basic structure)
  - [x] Event scheduling (page structure)
    - [ ] Worker creation → Manager approval workflow
    - [ ] Notification system for pending approvals
  - [x] Calendar view for scheduled events (page structure)
  - [x] Form generation (page structure)
    - [ ] Work hours tracking (day/week/month)
- [ ] Request management system
  - [ ] Guest/Customer request creation and tracking
  - [ ] Manager approval and worker assignment workflows
  - [ ] Different request types with unique data structures
- [ ] Problem ticket system
  - [ ] Worker reporting → Manager/Worker collaborative resolution
  - [ ] Comment threads and ticket closure management
- [x] Real-time updates (Convex backend)
- [ ] File upload/management
- [x] Responsive design (mobile, tablet, desktop)
- [ ] Role-based portal interfaces

## 📝 Todo List

### Setup & Configuration ✅ COMPLETED

- [x] Set up Clerk authentication
- [x] Configure Convex backend

### Core Development

- [x] Design database schema
- [x] Implement user authentication flow
- [x] Create main app navigation
- [ ] Build core features (functional components)
- [x] Add responsive design
- [ ] Implement file upload functionality

### Testing & Deployment

- [x] Add basic testing (Playwright integration)
- [ ] Performance optimization
- [x] Deploy to development (Convex backend deployed)

## 📅 Development Sessions

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

**Next Session Focus**: TypeScript error resolution before deployment

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


