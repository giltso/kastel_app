# Kastel App V2 Redesign Document

## 🎯 Redesign Goals

### **Primary Objectives**
1. **Technical Debt Elimination**: Remove mountains of legacy code from schema evolution
2. **Code Consolidation**: Eliminate duplicate functions and redundant implementations
3. **Architecture Simplification**: Clean, maintainable codebase with clear patterns
4. **Shift System Overhaul**: Complete reimplementation based on stakeholder feedback
5. **Developer Experience**: Easy navigation, predictable patterns, minimal bugs

### **Core Problems Being Solved**
- **Legacy Code Accumulation**: Multiple schema migrations left dead/redundant code
- **Function Duplication**: Similar functionality scattered across multiple files
- **Complex Navigation**: Hard to find and understand TSX component relationships
- **Bug-Prone Development**: New features break due to unclear dependencies
- **Shift System Issues**: Current shift implementation doesn't meet real-world needs

## 🏗️ Technical Architecture V2

### **Clean Slate Principles**
1. **Single Source of Truth**: One function per responsibility, no duplicates
2. **Predictable Patterns**: Consistent file structure and naming conventions
3. **Minimal Abstractions**: Only abstract when there's clear benefit
4. **Type Safety First**: Leverage TypeScript to prevent runtime errors
5. **Component Clarity**: Clear component hierarchy and data flow

### **Core Systems Redesign**

#### **1. Calendar System (Keep & Simplify)**
- **Status**: KEEP - proven successful, needs refinement
- **Changes**:
  - Consolidate calendar logic into single hook
  - Remove redundant positioning functions
  - Simplify event rendering pipeline
  - Clean up drag & drop implementation

#### **2. Shift System (Complete Redesign)**
- **Status**: REDESIGN - stakeholder feedback requires changes
- **New Requirements**: [TO BE DEFINED based on stakeholder meeting]
- **Current Issues**: Complex assignment logic, confusing UI patterns
- **V2 Approach**: Clean slate implementation with simplified data model

#### **3. Role System (Simplify)**
- **Status**: SIMPLIFY - current tag system works but over-engineered
- **Changes**:
  - Reduce role complexity
  - Clear permission hierarchy
  - Single role switching mechanism

#### **4. Event Management (Consolidate)**
- **Status**: CONSOLIDATE - too many similar functions
- **Changes**:
  - Single event CRUD API
  - Unified approval workflow
  - Remove redundant event types

#### **5. Tool Rentals (Keep)**
- **Status**: KEEP - working well, minimal changes needed

#### **6. Courses (Keep)**
- **Status**: KEEP - recently validated, stable implementation

## 📋 Implementation Strategy

### **Phase 1: Analysis & Planning (This Session)**
- [ ] Document current code complexity issues
- [ ] Identify all duplicate functions
- [ ] Map component dependencies
- [ ] Define new shift requirements
- [ ] Create migration strategy

### **Phase 2: Schema Redesign**
- [ ] Design clean V2 schema
- [ ] Plan data migration approach
- [ ] Identify breaking changes
- [ ] Create migration scripts

### **Phase 3: Core Systems Rebuild**
- [ ] Implement unified calendar hooks
- [ ] Rebuild shift system from scratch
- [ ] Consolidate event management
- [ ] Simplify role system

### **Phase 4: Component Cleanup**
- [ ] Standardize component patterns
- [ ] Remove duplicate components
- [ ] Create clear component hierarchy
- [ ] Implement consistent styling

### **Phase 5: Migration & Testing**
- [ ] Progressive migration strategy
- [ ] Comprehensive testing plan
- [ ] Performance validation
- [ ] User acceptance testing

## 🔥 Specific Technical Debt to Address

### **Function Duplication Examples**
- Multiple event creation functions
- Redundant approval workflows
- Duplicate positioning calculations
- Similar role checking logic

### **Schema Evolution Issues**
- Old fields still in database
- Unused indexes
- Conflicting validation rules
- Migration artifacts

### **Component Complexity**
- Overly complex component trees
- Unclear prop drilling
- Mixed concerns in single components
- Hard-to-follow state management

## 📝 Stakeholder Requirements

### **Shift System Changes**
*[TO BE FILLED BASED ON MEETING FEEDBACK]*
- Current issues with shift functionality
- New requirements for shift management
- User workflow improvements needed
- Integration requirements

### **Architecture Changes**
*[TO BE FILLED BASED ON MEETING FEEDBACK]*
- Performance requirements
- New feature requests
- Integration needs
- User experience priorities

## 🎨 Development Standards V2

### **File Organization**
```
src/
├── hooks/           # Single-purpose hooks
├── components/      # Reusable UI components
├── pages/          # Route components
├── lib/            # Utility functions
├── types/          # TypeScript definitions
└── constants/      # App constants
```

### **Naming Conventions**
- **Hooks**: `use{Feature}{Action}` (e.g., `useEventCreate`)
- **Components**: `{Feature}{Type}` (e.g., `EventCard`, `ShiftModal`)
- **Functions**: `{verb}{Noun}` (e.g., `createEvent`, `updateShift`)
- **Types**: `{Feature}{Type}` (e.g., `EventData`, `ShiftConfig`)

### **Code Quality Rules**
1. **No Duplicate Logic**: If code exists twice, extract to utility
2. **Single Responsibility**: Each function/component does one thing
3. **Clear Dependencies**: Explicit imports, no deep prop drilling
4. **Type Everything**: No `any` types, complete TypeScript coverage
5. **Test Coverage**: Unit tests for all business logic

## 🚀 Success Metrics

### **Developer Experience**
- [ ] 50% reduction in lines of code
- [ ] 90% elimination of duplicate functions
- [ ] Clear component hierarchy with max 3 levels deep
- [ ] 100% TypeScript coverage with no `any` types

### **Maintainability**
- [ ] New features don't break existing functionality
- [ ] Clear debugging and error tracking
- [ ] Predictable code patterns across codebase
- [ ] Easy onboarding for new developers

### **Performance**
- [ ] Faster build times
- [ ] Reduced bundle size
- [ ] Improved runtime performance
- [ ] Better Core Web Vitals scores

## 📅 Timeline

**Target: 2-3 focused development sessions**
- Session 1: Analysis, planning, schema design
- Session 2: Core system implementation
- Session 3: Migration, testing, polish

---

*This document will be updated throughout the redesign process with specific implementation details and stakeholder feedback.*