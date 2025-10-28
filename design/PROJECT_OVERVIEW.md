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

**Core Implementation:**
The V2 system uses an additive tag-based permission model where staff members have a base `isStaff` role combined with specific permission tags that unlock functionality. This design allows flexible permission combinations (e.g., Staff+Worker+Manager) without rigid hierarchical roles.

**Key Implementation Files:**
- **Backend**: [convex/users_v2.ts](../convex/users_v2.ts) - User management queries, role validation, and permission enforcement
- **Frontend**: [src/hooks/usePermissionsV2.ts](../src/hooks/usePermissionsV2.ts) - React hook providing `hasWorkerTag`, `hasManagerTag`, etc. for UI permission checks
- **Schema**: [convex/schema.ts](../convex/schema.ts) - Database schema with `isStaff`, `workerTag`, `managerTag`, `instructorTag`, `toolHandlerTag` fields
- **Dev Tools**: [src/components/RoleEmulator.tsx](../src/components/RoleEmulator.tsx) - Role emulation dropdown for testing different permission combinations

---

### Base Roles

**Staff** (`isStaff: true`)
Internal employees who can be granted permission tags to access various operational features. The base staff role alone provides access to authenticated areas but no specific operational permissions.

**Implementation**: Staff status check in [convex/users_v2.ts](../convex/users_v2.ts) via `isStaffUser()` function. Navigation routing handled in [src/routes/_authenticated.tsx](../src/routes/_authenticated.tsx).

**Customer**
External authenticated users who interact with the business for services (tool rentals, course enrollment). Customers have limited permissions and see consumer-focused interfaces.

**Implementation**: Customer interface routing in [src/routes/_authenticated.tsx](../src/routes/_authenticated.tsx). Can be promoted to staff via role management system.

**Guest**
Public unauthenticated visitors who can browse the public-facing site. Accessed by logging out of the system.

**Implementation**: Public home page at [src/routes/index.tsx](../src/routes/index.tsx) with service previews and business information.

**Dev Role** (`role: "dev"`)
Special development-only role that grants access to debug tools and bypasses permission checks for testing. This role requires direct database access to assign.

**Debug Tools** (only visible when `role === "dev"`):
- [RoleEmulator](../src/components/RoleEmulator.tsx): Toggle between role combinations for testing
- Backend bypass: View all users, modify any role, bypass course ownership checks

**Environment Separation**: Development tools are gated by database role, not environment variables. Only the system owner (גיל צורן) has dev role in both development and production for administrative access. Regular staff should never have dev role.

---

### Staff Permission Tags (Additive & Combinable)

**Worker Tag** (`workerTag`)
Grants access to the LUZ scheduling system where workers can view shifts, request assignments, and manage their own schedule. Workers see shift availability and can submit join requests that require manager approval.

**Implementation:**
- **Permission Hook**: `usePermissionsV2().hasWorkerTag` checks in components
- **LUZ Interface**: [src/routes/luz.tsx](../src/routes/luz.tsx) - Main scheduling hub with timeline views (Day/Week/Month)
- **Backend Logic**: [convex/shift_assignments.ts](../convex/shift_assignments.ts) - Worker self-assignment and request submission
- **UI Components**: [src/components/modals/RequestJoinShiftModal.tsx](../src/components/modals/RequestJoinShiftModal.tsx) for shift requests

**Manager Tag** (`managerTag`)
Enables approval workflows, shift template creation, and worker assignment capabilities. Managers inherit all worker permissions and gain additional administrative controls. **Business Rule**: Manager tag requires Worker tag (enforced at database level).

**Implementation:**
- **Permission Hook**: `usePermissionsV2().hasManagerTag` for UI permission checks
- **Shift Management**: [convex/shifts.ts](../convex/shifts.ts) - Create/edit shift templates with capacity settings
- **Approval Workflows**: [src/components/modals/ReviewRequestModal.tsx](../src/components/modals/ReviewRequestModal.tsx) (review worker requests), [src/components/modals/ApproveAssignmentModal.tsx](../src/components/modals/ApproveAssignmentModal.tsx) (approve manager-initiated assignments)
- **Worker Assignment**: [src/components/modals/AssignWorkerModal.tsx](../src/components/modals/AssignWorkerModal.tsx) for direct assignment

**Instructor Tag** (`instructorTag`)
Allows creation and management of educational courses, approval of student enrollments, and access to course administration features. Instructors can create both single-session and multi-meeting courses.

**Implementation:**
- **Permission Hook**: `usePermissionsV2().hasInstructorTag`
- **Course System**: [convex/courses_v2.ts](../convex/courses_v2.ts) - Course creation, session management, and enrollment approval
- **UI Interface**: [src/routes/educational.tsx](../src/routes/educational.tsx) - Course management dashboard with student tracking

**Tool Handler Tag** (`toolHandlerTag`)
Grants access to tool inventory management and rental approval system. Tool handlers can approve customer rental requests and create manual rentals for walk-in customers who don't have app accounts.

**Implementation:**
- **Permission Hook**: `usePermissionsV2().hasToolHandlerTag`
- **Rental System**: [convex/tools.ts](../convex/tools.ts) - Tool management, rental approval, and manual rental creation
- **Manual Rentals**: [src/components/modals/CreateManualRentalModal.tsx](../src/components/modals/CreateManualRentalModal.tsx) - Special feature for pre-approved walk-in customer rentals
- **UI Interface**: [src/routes/tools.tsx](../src/routes/tools.tsx) - Tool handler operational view

---

### Customer Permission Tags (Item-Specific)

**Rental Approved Tag** (`rentalApprovedTag`)
Customers with this tag can submit tool rental requests through the app. Approval is granted by staff after verifying customer eligibility (e.g., valid ID, deposit paid).

**Implementation**: Rental request validation in [convex/tools.ts](../convex/tools.ts). Customer rental interface in [src/routes/tools.tsx](../src/routes/tools.tsx).

**Student Tag** (Per-Course, Temporary)
Granted automatically when a customer enrolls in a course and instructor approves. Tag is course-specific and provides access to course materials and session information.

**Implementation**: Enrollment management in [convex/courses_v2.ts](../convex/courses_v2.ts).

---

### V2 Permission System Features

- **Unified LUZ System**: Staff with Worker tag access the LUZ (scheduling hub) interface at [src/routes/luz.tsx](../src/routes/luz.tsx), providing day/week/month calendar views with shift management
- **Role Emulation**: Development testing interface ([src/components/RoleEmulator.tsx](../src/components/RoleEmulator.tsx)) allows toggling between 7 role combinations (Guest, Customer, Staff, Staff+Worker, Staff+Manager, etc.)
- **Dynamic Navigation**: Header menu ([src/components/Header.tsx](../src/components/Header.tsx)) adapts based on user permissions - Workers see "LUZ" tab, Tool Handlers see "Tool Rental" tab, etc.
- **Business Rule Enforcement**: Manager tag requires Worker tag, enforced in [convex/users_v2.ts](../convex/users_v2.ts) via validation logic
- **Additive Permission Model**: Multiple tags combine naturally - a user with Worker+Manager+ToolHandler tags has all three sets of permissions simultaneously

## 🔧 Core Features & Workflows

### 1. LUZ System (Primary Staff Interface)

**Overview:**
LUZ (unified scheduling hub) is the primary interface for staff scheduling and shift management. It provides day/week/month calendar views where workers can browse shifts and request assignments, while managers can create shift templates, assign workers, and approve requests. The system uses a dual approval workflow where both workers and managers must consent to assignments.

**Core Implementation Files:**
- **Main Interface**: [src/routes/luz.tsx](../src/routes/luz.tsx) - Main LUZ page with view switching, date navigation, and modal management
- **Backend**: [convex/shifts.ts](../convex/shifts.ts) (shift templates), [convex/shift_assignments.ts](../convex/shift_assignments.ts) (worker assignments)
- **Timeline Components**:
  - [src/components/LUZOverview.tsx](../src/components/LUZOverview.tsx) - Sidebar with shift summaries and quick actions
  - [src/components/LUZVerticalTimeline.tsx](../src/components/LUZVerticalTimeline.tsx) - Day view with hourly timeline
  - [src/components/LUZWeekView.tsx](../src/components/LUZWeekView.tsx) - 7-day grid view
  - [src/components/LUZMonthView.tsx](../src/components/LUZMonthView.tsx) - Calendar month view
- **Modal System** (7 modals in [src/components/modals/](../src/components/modals/)):
  - `ShiftDetailsModal.tsx` - View shift details and worker assignments
  - `CreateEditShiftModal.tsx` - Create/edit shift templates (manager only)
  - `RequestJoinShiftModal.tsx` - Worker shift join requests
  - `AssignWorkerModal.tsx` - Manager assigns workers to shifts
  - `EditAssignmentModal.tsx` - Edit existing worker assignments
  - `ReviewRequestModal.tsx` - Manager reviews pending worker requests
  - `ApproveAssignmentModal.tsx` - Worker approves manager-initiated assignments

**Key Features:**

**Timeline Views**
The LUZ interface provides three distinct calendar view modes. Day view shows an hourly timeline with shifts displayed as vertical blocks, allowing detailed inspection of worker assignments and shift overlaps. Week view displays a 7-day grid with shifts shown as colored cards in each day's column, making it easy to see weekly patterns. Month view provides a traditional calendar layout with shift indicators as badges, useful for long-term planning. Users can seamlessly switch between views while maintaining their selected date context.

**Shift Template Management**
Managers can create recurring shift patterns that define regular operational scheduling needs. Each shift template includes start/end times, days of week it runs (e.g., Monday-Friday), and worker capacity settings (minimum required, optimal target, maximum allowed). Shift templates are the foundation of the scheduling system - they define when work needs to happen, and then workers are assigned to specific instances of these templates on particular dates. Templates can be edited to adjust capacity or timing, and changes apply to future instances while preserving existing assignments.

**Dual Approval Workflows**
The system implements bidirectional approval workflows ensuring both parties consent to assignments. In the manager-initiated flow, a manager assigns a worker to a shift, the worker receives the assignment and can approve or reject it, and only after approval does the assignment become confirmed. In the worker-initiated flow, a worker requests to join a shift, the request goes to a manager for review, and upon manager approval the assignment is confirmed. This dual-consent approach prevents unwanted assignments and respects worker preferences while giving managers scheduling control.

**Real-time Synchronization**
All LUZ data updates in real-time using Convex's reactive query system. When a manager approves a request, all connected clients (other managers, the assigned worker) see the update immediately without page refresh. This enables collaborative scheduling where multiple managers can work simultaneously without conflicts. The system also prevents race conditions - if two managers try to assign the same worker to overlapping shifts, the backend rejects the second attempt with a conflict error.

**Smart Date Navigation**
The date navigation system provides context-aware functionality. When viewing today's date, the date button opens a native date picker allowing quick jumps to any date. When viewing a past or future date, the same button becomes "Jump to Today" for quick return to current date. This dual-mode behavior reduces clicks for common navigation patterns. The selected date persists across view changes, so switching from day to week to month maintains the same date context.

**Worker Assignment Management**
Workers appear in shifts as colored indicator badges showing their initials and assignment status. Confirmed assignments display in green, pending approvals in yellow, and conflicts in red. Clicking a shift opens the details modal showing all assigned workers, their time preferences, and approval status. Workers can edit their own assignments (changing hours or adding notes) which triggers a re-approval workflow. Managers can directly assign or unassign workers, with the system preventing double-booking and over-capacity assignments through backend validation.

**Click-to-Create Interactions**
Managers can create shifts by clicking empty timeline slots in day or week views. Clicking an empty hour in day view opens the create modal pre-filled with that time. Clicking an empty day column in week view opens the modal with that date selected. This direct manipulation approach is faster than navigating to a separate form page. The system checks permissions before showing click handlers - workers see a read-only view without click-to-create capability.

**Testing Coverage:**
The LUZ system has a budding test suite with 83 passing unit tests covering core timeline components and utility functions. Current coverage includes date helper functions ([src/utils/dateHelpers.test.ts](../src/utils/dateHelpers.test.ts)), positioning algorithms ([src/utils/timelinePositioning.test.ts](../src/utils/timelinePositioning.test.ts)), and component behavior tests ([src/components/LUZVerticalTimeline.test.tsx](../src/components/LUZVerticalTimeline.test.tsx), [src/components/LUZWeekView.test.tsx](../src/components/LUZWeekView.test.tsx)). Pre-deployment Playwright testing validated critical workflows on desktop and mobile viewports.

**Testing Strategy**: The project is in early stages of building comprehensive test coverage. Current focus is on unit testing utility functions and complex business logic. Future expansion planned for integration tests, API endpoint testing, and expanded E2E coverage. See [features/TEST_DESIGN.md](features/TEST_DESIGN.md) for testing strategy and expansion roadmap.

### 2. Tool Rental System

**Overview:**
The tool rental system manages inventory and rental workflows for customers borrowing equipment from the shop. Tool handlers can manage the tool catalog, approve rental requests from customers, and create manual rentals for walk-in customers who don't have app accounts. The system tracks tool availability, rental periods, and return status.

**Core Implementation Files:**
- **Backend**: [convex/tools.ts](../convex/tools.ts) - Tool inventory, rental workflows, approval logic
- **Frontend**: [src/routes/tools.tsx](../src/routes/tools.tsx) - Tool handler operational view and customer rental interface
- **Modals**:
  - [src/components/modals/CreateManualRentalModal.tsx](../src/components/modals/CreateManualRentalModal.tsx) - Walk-in customer rental creation
  - Additional rental modals in [src/components/modals/](../src/components/modals/)

**Key Features:**

**Inventory Management**
Tool handlers can create, edit, and delete tools in the catalog. Each tool includes name, description, daily rental rate, and availability status. Tools marked as unavailable (during maintenance or already rented) don't appear in customer rental requests. The catalog supports both paid and free tool rentals, with daily rates calculated automatically for multi-day bookings.

**Customer Rental Workflow**
Customers with the rental approved tag can browse the tool catalog and submit rental requests specifying start/end dates and purpose. Requests enter pending status and appear in the tool handler's approval queue. Tool handlers review requests, check customer eligibility, and approve or reject with optional notes. Upon approval, the tool becomes unavailable and the rental enters active status. When the customer returns the tool, the handler marks it returned and the tool becomes available again.

**Manual Rental Creation**
Tool handlers can create pre-approved rentals for walk-in customers who don't have app accounts. This feature accommodates tech-illiterate customers or situations requiring immediate rentals without registration. The manual rental form captures renter name and contact information (phone or email) and creates the rental in active status, bypassing the approval workflow. Manual rentals display with "Walk-in" badges in rental lists to distinguish them from app-based rentals.

**LUZ Calendar Integration**
Active tool rentals appear on the LUZ calendar timeline, providing managers visibility into equipment availability alongside shift scheduling. Rental blocks display the tool name and renter, allowing staff to see resource allocation at a glance. Only active rentals appear - pending requests and completed returns are excluded from the timeline view.

**Availability Tracking**
The system enforces tool availability rules - only one rental per tool at a time. When a rental is approved or manually created, the tool automatically becomes unavailable. When marked as returned, availability is restored. This prevents double-booking and ensures accurate inventory status. Tool handlers can manually override availability for maintenance periods or other operational needs.

**Future Enhancements:**
Planned features include overdue tracking with automated reminder notifications, rental history analytics, and damage reporting workflows.

### 3. Educational Courses

**Overview:**
The educational courses system allows instructors to create and manage training courses for customers. Instructors can offer both single-session workshops and multi-meeting courses with independent session scheduling. Customers can browse available courses, submit enrollment requests, and track their course participation. The system handles enrollment approvals, capacity management, and course visibility.

**Core Implementation Files:**
- **Backend**: [convex/courses_v2.ts](../convex/courses_v2.ts) - Course management, enrollment workflows, session scheduling
- **Schema**: [convex/schema.ts](../convex/schema.ts) - `courses` and `course_sessions` tables
- **Frontend**: [src/routes/educational.tsx](../src/routes/educational.tsx) - Instructor dashboard and customer course browsing
- **Modals**: Course creation, enrollment, and management modals in [src/components/modals/](../src/components/modals/)

**Key Features:**

**Course Types**
The system supports two course formats. Single-session courses are one-time workshops with a single start/end time, ideal for introductory classes or short skill demonstrations. Multi-meeting courses span multiple sessions over days or weeks, with each session having independent date and time scheduling stored in the `course_sessions` table. This flexibility accommodates different teaching formats - a weekend workshop might have two 4-hour sessions, while a weekly class might have six 2-hour sessions.

**3-Step Course Creation Wizard**
Instructors use a progressive multi-step form to create courses. Step 1 captures basic information (title, description, category, capacity, pricing). Step 2 handles session scheduling - for single-session courses this is one date/time picker, for multi-meeting courses instructors can add multiple sessions with different dates. Step 3 (future) will handle course materials upload. The wizard validates each step before allowing progression and shows clear visual progress indicators.

**Enrollment Workflow**
Customers browse courses filtered by category and availability, seeing only future courses that haven't reached capacity. When a customer enrolls, the request enters pending status and appears in the instructor's approval queue. Instructors review enrollment requests, check customer qualifications, and approve or reject with optional feedback. Approved enrollments grant the student tag for that specific course, providing access to course details and materials. The system enforces capacity limits - enrollment requests are blocked when a course reaches maximum students.

**Multi-Instructor Support**
Courses can have a primary instructor (owner) and helper instructors. The primary instructor has full control - editing course details, managing sessions, and approving enrollments. Helper instructors can view course information and student lists but cannot modify course settings. This supports teaching scenarios where multiple instructors collaborate, with clear ownership hierarchy preventing conflicting course changes.

**LUZ Calendar Integration**
Course sessions appear on the LUZ calendar timeline, providing visibility into facility scheduling alongside shifts and tool rentals. Each session displays as a colored block showing course name and enrollment count. This unified view helps managers identify scheduling conflicts and facility capacity issues before they become problems.

**Future Enhancements:**
Planned features include recurring course templates (create new independent instances of popular courses), course materials management (file uploads for handouts and resources), and student progress tracking for multi-meeting courses.

### 4. Role Management System

**Overview:**
The role management system is an administrative interface (accessed via the Roles tab) that provides staff with tools to manage user accounts, assign permission tags, and control access levels. This is distinct from the V2 permission architecture itself (described in User Roles & Permissions section above) - this section focuses on the **administrative tools** for managing that architecture.

**Core Implementation Files:**
- **Backend**: [convex/users_v2.ts](../convex/users_v2.ts) - User queries, role updates, promotion/demotion logic
- **Frontend**: [src/routes/roles.tsx](../src/routes/roles.tsx) - Role management administrative interface (the Roles tab)
- **Modals**: User edit and role assignment modals in [src/components/modals/](../src/components/modals/)
- **Dev Tools**: [src/components/RoleEmulator.tsx](../src/components/RoleEmulator.tsx) - Development testing dropdown

**Key Features:**

**User Search and Filtering**
The Roles tab provides search and filtering capabilities to find and manage users. Administrators can search by name or email, filter by role type (staff vs customer), and filter by specific permission tags (worker, manager, instructor, tool handler). The interface displays users in a sortable table showing name, email, current role badges, and last active date. This centralized view allows quick auditing of who has what permissions.

**Permission Tag Assignment**
Clicking a user opens the Edit Roles modal showing all available permission tags as interactive toggles. Administrators can enable or disable tags (workerTag, managerTag, instructorTag, toolHandlerTag) individually. The modal shows the current state and allows atomic updates - either all changes succeed or none do, preventing inconsistent permission states. Real-time validation enforces business rules before saving.

**Staff Promotion and Demotion**
The interface supports converting users between customer and staff status. The "Promote to Staff" action grants the `isStaff` flag and opens the tag assignment modal to select initial permissions. The "Demote to Staff" action removes the staff flag, clears all permission tags, and cleans up related data like instructor course ownership or manager shift assignments. These transitions preserve customer-level data (rental history, course enrollments) while removing operational privileges.

**Business Rule Enforcement**
The system validates role combinations at both UI and backend levels. Attempting to assign manager tag without worker tag shows an inline error message explaining the requirement. Trying to assign instructor or tool handler tags to non-staff users is blocked. The validation happens in real-time as toggles are clicked, providing immediate feedback. Backend mutations double-check these rules to prevent privilege escalation via API manipulation.

**Role Emulator (Development Tool)**
The role emulator dropdown (visible only in development environments) allows developers to test permission-based UI without creating multiple user accounts. The dropdown shows toggles for staff status and all permission tags, with a live preview of the effective role combination displayed as badges. Changes apply instantly, allowing rapid testing of different user perspectives. This tool is essential for validating that features appear correctly for each role type.

**Key Distinction:**
- **User Roles & Permissions (architecture)**: Defines what tags exist, how they combine, what each tag grants access to
- **Role Management System (this section)**: Administrative interface for assigning those tags to users

**Future Enhancements:**
Planned features include audit trail logging (track who changed what roles when with timestamps), bulk user operations (CSV import/export for initial setup), role templates (save common tag combinations like "shift supervisor" = worker+manager), and permission group management for enterprise scaling.

### 5. Browser Text Editing

**Overview:**
In-browser content management system allowing managers to edit UI text elements (banners, help text, instructions) directly in the interface without code deployments. Managers toggle edit mode, double-click text to edit inline, and changes save to database with multilingual support and translation tracking.

**Current Status:**
Tech demo level - 3 editable fields on home page (About Us, Welcome title, Store Information). Infrastructure complete and functional but minimal coverage.

**Future Work (Medium Priority):**
- Expand to additional editable fields (LUZ help text, course descriptions, tool instructions)
- Translation management dashboard
- Rich text editing support
- Content versioning

**Documentation:** See [features/BROWSER_TEXT_EDITING.md](features/BROWSER_TEXT_EDITING.md) for complete design, implementation details, and technical decisions.

### 6. Internationalization (i18n)

**Overview:**
The application supports multiple languages with full internationalization infrastructure. Users can switch languages dynamically via a dropdown in the header, with their preference persisted to localStorage. The system includes automatic RTL (right-to-left) support for Hebrew, locale-aware date formatting, and comprehensive translation coverage for the LUZ system. Translation expansion is ongoing for remaining pages.

**Core Implementation Files:**
- **Configuration**: [src/i18n/config.ts](../src/i18n/config.ts) - i18next setup, language detection, RTL configuration
- **Custom Hook**: [src/hooks/useLanguage.ts](../src/hooks/useLanguage.ts) - Provides `t()`, `isRTL`, `currentLanguage`, `changeLanguage()`
- **Language Switcher**: [src/components/LanguageSwitcher.tsx](../src/components/LanguageSwitcher.tsx) - Language selection dropdown
- **Translation Files**: [public/locales/](../public/locales/) - 6 namespaces (common, auth, shifts, tools, courses, roles)

**Supported Languages:**
- **Hebrew (עברית)**: Primary working language, **100% complete** with full RTL support - production-ready
- **English**: Default fallback language, source of truth for all translations (100% complete)
- **Russian (Русский)**: Structure in place, marked "Coming Soon"
- **French (Français)**: Structure in place, marked "Coming Soon"
- **Arabic (العربية)**: Planned RTL language for future implementation

**Translation Coverage:**

**Fully Translated (100%):**
- **LUZ System**: All components, views, and 7 modals with locale-aware date formatting
- **Home Page**: Guest, customer, and staff dashboard views
- **Navigation**: Header menu, sign-in/out buttons, language switcher
- **Authentication**: Sign-in flows and access control messages
- **Tools Page**: Tool rental interface and all rental modals (CreateManualRentalModal, etc.)
- **Educational Page**: Course management, enrollment workflows, all course modals
- **Roles Page**: User and role management interface, all filters and actions

**Mobile & RTL Status:**
Mobile UI tested and optimized at 375px width with responsive card layouts for tables, scroll indicators for week view, and proper modal stacking. RTL layout verified in Hebrew with correct text alignment, mirrored navigation, and proper calendar rendering. Both are production-ready and awaiting real-world validation.

**Key Features:**

**Dynamic Language Switching**
Users select their preferred language from a dropdown showing flag icons and native language names. The selection applies immediately without page reload, updating all UI text, date formats, and text direction. The choice persists to localStorage (`i18nextLng` key) and is restored on subsequent visits. The system auto-detects user language on first visit using browser preferences.

**RTL (Right-to-Left) Support**
Hebrew triggers automatic RTL mode, updating the HTML `dir` attribute to `"rtl"`. All text flows right-to-left, navigation elements mirror horizontally, and layouts adapt using CSS logical properties. The LUZ system was specifically designed with RTL in mind - timeline views, modals, and forms all render correctly in both directions without layout breaks. Arabic will use the same RTL infrastructure when implemented.

**Locale-Aware Date Formatting**
All date displays use `toLocaleDateString(currentLanguage)` for proper localization. Hebrew dates format as day/month/year, English as month/day/year, following each locale's conventions. Time displays use 24-hour format for Hebrew, 12-hour for English. The LUZ timeline components pass the current language to all date formatting functions ensuring consistency throughout.

**Namespace Organization**
Translations are organized into logical namespaces to avoid conflicts and improve maintainability. The `common` namespace contains shared UI elements (actions, navigation, time units). Feature-specific namespaces (`shifts`, `tools`, `courses`, `roles`) contain domain-specific terminology. The `auth` namespace handles authentication and access control messages. The `ui_content` namespace stores editable UI content managed through the browser text editing feature. This structure allows parallel translation work on different features.

**Implementation Guidelines:**
For detailed translation workflow, best practices, and implementation patterns, see the Internationalization section in [CLAUDE.md](../CLAUDE.md#internationalization-i18next). The LUZ system provides a reference implementation for proper i18n integration.

**Future Enhancements:**
Complete translation of Tools, Educational, and Roles pages to achieve 100% coverage. Add Russian, French, and Arabic translations when needed. Implement translation management workflow for non-technical translators (potential integration with translation services or spreadsheet-based workflow).

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
  │   ├── roles.json         # Role management, permissions, tags
  │   └── ui_content.json    # Editable UI content (banners, help text)
  └── he/                    # Hebrew (production-ready)
      └── [same structure]
```

**Future Enhancements:**
Complete translation of Tools, Educational, and Roles pages to achieve 100% coverage. Add Russian, French, and Arabic translations when needed. Implement translation management workflow for non-technical translators (potential integration with translation services or spreadsheet-based workflow).

## 🎯 Current Status & Future Work

### Production Deployment Status

**Live URL**: https://kastel.code-bloom.app
**Deployment Date**: October 16, 2025
**Status**: Deployed and operational

**Environment**:
- **Frontend**: Vercel (production)
- **Backend**: Convex (production deployment)
- **Authentication**: Clerk (production instance)
- **Domain**: Custom domain configured, DNS propagation complete

### What's Working in Production

**LUZ Shift Management System**
Three timeline views (Day/Week/Month) with date navigation, 7-modal workflow system for shift management, dual approval workflows (manager↔worker), worker assignment display, conflict detection, and real-time backend synchronization. Managers can create shift templates and assign workers. Workers can request assignments and view their schedules.

**Tool Rental System**
Inventory management, customer rental requests with approval workflow, manual rental creation for walk-in customers, availability tracking, and basic calendar integration.

**Educational Courses System**
Single-session and multi-meeting course creation, 3-step wizard, enrollment requests with instructor approval, multi-instructor support, and calendar integration.

**Role Management System**
User search and filtering, permission tag assignment via modal interface, staff promotion/demotion workflows, business rule validation, and development role emulator.

**Internationalization (100% - Testing Phase)**
Complete Hebrew translation with RTL layout, dynamic language switching, and locale-aware date formatting. All pages (LUZ, Tools, Educational, Roles) and modals fully translated. Currently deployed to production for user acceptance testing.

### Unfinished Past Work

None currently - all committed features are complete and in production testing.

### Known Limitations

**Mobile UI Issues**
Mobile layout tested at 375px width shows usability problems. Timeline components, modals, and navigation need responsive design improvements for touch interactions and small screens.

**RTL Layout Issues**
Hebrew RTL mode has layout inconsistencies. Some components don't properly mirror, margins and padding need CSS logical properties, and certain UI elements break in right-to-left direction.

**No Notification System**
Users must manually check the LUZ interface for shift assignments, approval requests, and schedule changes. No email or SMS notifications are implemented.

**Limited Testing Coverage**
83 unit tests cover utility functions and core timeline components. Modal workflows, backend mutations, and integration testing remain gaps. See [features/TEST_DESIGN.md](features/TEST_DESIGN.md) for testing expansion roadmap.

**No Audit Trail**
Role changes and system modifications are not logged. No history tracking for permission assignments or administrative actions.

**Manual Backup Procedures**
No automated backup system. Database backups rely on Convex platform defaults.

## 🚀 Future Tasks

### Immediate Priority

**Production User Feedback**
Collect initial feedback from staff users on live system. Document usability issues and prioritize fixes based on operational impact. Hebrew translation and mobile UI are production-ready and awaiting real-world validation.

### Later Scope Work

**Browser Text Editing Feature** ✅ **IMPLEMENTED**
In-browser content management system allowing managers to edit UI content (banners, help text, instructions) directly in the interface. Database-driven with multilingual support and translation tracking. Enables non-technical content updates without code changes.

**Implementation Status:**
- ✅ Complete workflow implemented with "About Us" field as proof-of-concept
- ✅ Database schema (`ui_content` table with multilingual fields and translation tracking)
- ✅ Backend API (`convex/ui_content.ts` with permission checks)
- ✅ Edit mode toggle in header (manager-only feature)
- ✅ Inline editing with double-click activation
- ✅ Click-outside-to-save pattern
- ✅ Visual indicators (pencil icon on hover, edit mode highlight)
- ✅ Multilingual support (separate content per language)
- ✅ Translation tracking (needsTranslation flags)
- ✅ Navigation updated (staff can access home page for content editing)

**Next Steps:**
Expand feature to additional editable fields across the application. See [features/BROWSER_TEXT_EDITING.md](features/BROWSER_TEXT_EDITING.md) for complete design and implementation reference.

**Notification System**
Implement email/SMS alerts for shift changes, approval requests, rental reminders, and course enrollments. Integrate with third-party service (e.g., Twilio, SendGrid).

**Audit Trail System**
Track all role changes, shift modifications, and administrative actions with timestamps and user attribution. Compliance and security reporting.

**Analytics Dashboard**
Usage metrics, system health monitoring, staffing reports, and operational insights. Business intelligence for decision-making.

**Testing Expansion**
Expand test coverage to include modal workflows, backend mutations, integration tests, and E2E scenarios. See [features/TEST_DESIGN.md](features/TEST_DESIGN.md).

**Performance & Monitoring**
Implement error tracking (Sentry), performance monitoring, automated backups, and load testing under realistic usage.

**User Training Materials**
Create documentation, video walkthroughs, and quick reference guides for staff users.

**Additional Languages**
Add Russian, French, and Arabic translations when needed. Implement translation management workflow for non-technical translators.

### Technical Debt / Future Refactoring

**Role System Schema Cleanup**
Current implementation uses confusing field naming and duplicate data storage:
- `role: "dev"` should be `isDev: boolean` for clarity and consistency with other flags
- `emulating*` fields are redundant - if `isDev === true`, treat all tags as emulation; if `false`, treat as real permissions
- Current design: 12 fields per user (role + 5 real tags + 6 emulating tags)
- Proposed design: 7 fields per user (isDev + 6 tags that change meaning based on isDev)
- Benefits: Simpler schema, clearer intent, less storage, easier to reason about
- Migration required: Update schema, refactor ~15-20 code references, migrate existing users