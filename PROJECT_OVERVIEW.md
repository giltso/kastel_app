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
- **Public Interface**: Service browsing and course catalog
- **Booking System**: Self-service appointment and rental scheduling
- **Request Tracking**: Status updates and communication tools
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
- ✅ **Calendar System**: Advanced drag-and-drop with multi-view support  
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

### Planned Features
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

### Recent Major Milestones

**Session 1 (Aug 20)**: Project Foundation
- ✅ Full-stack TypeScript setup with React 19 + Vite + TanStack Router
- ✅ Convex backend deployment and Clerk authentication integration
- ✅ Core page structure (Events, Calendar, Forms) with responsive design

**Session 2 (Aug 21)**: System Architecture Planning
- ✅ Comprehensive role hierarchy design and workflow specifications
- ✅ Approval system architecture with proper authorization flows

**Session 3 (Aug 25)**: Role System & Event Management
- ✅ Role management system with emulation dropdown for testing
- ✅ Complete scheduled events system with recurring patterns and validation

## ⚠️ Known Issues & Next Steps

**High Priority Issues:**
- **Shift Assignment System**: Core functionality not working end-to-end
- **Day-of-Week Order**: Should start Sunday instead of Monday
- **Non-Recurring Shifts**: System only supports recurring patterns

**Architecture Transition:**
- **Tag-Based Role System**: Major overhaul planned (see CALENDAR_CENTRIC_REDESIGN.md)
- **Interface Adaptation**: Different UIs needed for different user types
- **Calendar-Centric Staff Experience**: Embed manager approvals in calendar

**Session 4 (Aug 26)**: Advanced Calendar System
- ✅ Full drag-and-drop calendar with day/week/month views
- ✅ Event editing, participant management, and approval workflows

**Session 5 (Aug 27)**: Business Systems Implementation
- ✅ Complete tool rental system with inventory management
- ✅ Educational course system with enrollment workflows

**Session 6-7 (Aug 28)**: Advanced Calendar Interactions
- ✅ Event edge dragging, resizing, and cross-day movement
- ✅ Professional calendar design with visual feedback systems


**Session 8 (Aug 28)**: Theme System
- ✅ Custom light/dark themes with hardware shop branding
- ✅ Theme persistence and automatic system preference detection

**Session 9 (Sep 1)**: Professional Services & User Experience
- ✅ Global suggestion box system with developer dashboard
- ✅ Professional services marketplace with pro tag system
- ✅ Customer-focused home page with business information and service previews

**Session 10 (Sep 2)**: Shifts System & TypeScript Cleanup
- ✅ 62% TypeScript error reduction, application deployment-ready
- ✅ Complete shifts system with capacity management and status indicators
- ⚠️ Identified critical issues: assignment functionality, calendar integration

**Session 11 (Sep 3)**: Calendar-Shifts Integration & Architecture Planning
- ✅ Successfully integrated shifts into calendar with semi-transparent styling
- ✅ Unified calendar query combining events and shifts with role-based filtering
- ✅ Comprehensive testing across different user roles and calendar views
- ✅ Created detailed architectural redesign plan for tag-based role system



