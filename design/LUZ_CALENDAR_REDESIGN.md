# LUZ Calendar System Redesign

**Parent Design Documents**: [REDESIGN_V2.md](REDESIGN_V2.md) → [SHIFT_REDESIGN.md](SHIFT_REDESIGN.md) → **LUZ_CALENDAR_REDESIGN.md** (you are here)

**Context:** V2 Redesign - Unified scheduling interface with detailed interaction logic
**Status:** 🚀 TIMELINE VIEWS FUNCTIONAL - POPULATION STATUS IN PROGRESS

**Related Implementation**: [SHIFTS_IMPLEMENTATION.md](SHIFTS_IMPLEMENTATION.md) (code-level implementation details)

---

📍 **Navigation Guide:**
- **Architecture Overview**: See [REDESIGN_V2.md](REDESIGN_V2.md#-luz-system---unified-scheduling-hub) for high-level LUZ architecture
- **Shift System Design**: See [SHIFT_REDESIGN.md](SHIFT_REDESIGN.md) for population-based shift philosophy and database schema
- **Code Implementation**: See [SHIFTS_IMPLEMENTATION.md](SHIFTS_IMPLEMENTATION.md) for modal system and backend integration
- **Permission System**: See [REDESIGN_V2.md](REDESIGN_V2.md#-redifined-role-system) for role-based access control

---

---

## 📊 CURRENT IMPLEMENTATION STATUS

### ✅ **Successfully Implemented Features**

#### **Dual Timeline Architecture**
- **Vertical Timeline**: Calendar-style time flow (top-to-bottom) with side-by-side event display
- **Horizontal Timeline**: Gantt-style time flow (left-to-right) with stacked event display
- **Tab Navigation**: Seamless switching between views with "|" and "—" symbols
- **Dynamic Sizing**: Automatic height/width adjustments based on content

#### **Multi-Event Type Integration**
- **Shifts Integration**: Work scheduling with nested worker assignments
- **Course Integration**: Educational events with nested student enrollment
- **Visual Separation**: Primary (blue) for shifts, secondary (purple) for courses, info (cyan) for students
- **Layout Logic**: Side-by-side in vertical view (50%/50%), stacked in horizontal view

#### **User Interface Enhancements**
- **Hazelnut Logo**: Nut icon in header with proper alignment and amber coloring
- **Protected Headers**: Tab-style headers prevent title obstruction by nested content
- **Functional Filtering**: Working Education and Shifts checkboxes with real-time updates
- **Empty State Handling**: Proper messaging when no events are filtered/scheduled

#### **Mock Data Infrastructure**
- **Comprehensive Test Data**: Full shift and course scenarios for frontend development
- **Staffing Scenarios**: Various worker assignment states (confirmed, pending, understaffed)
- **Real Filter Logic**: Data visibility controlled by filter states
- **No Backend Dependency**: Pure frontend testing environment

### 🔧 **In Progress Features**

#### **Population Status Integration** *(Currently Being Implemented)*
- **Status Calculation Logic**: ✅ `getShiftStaffingStatus` function with understaffed/staffed/overstaffed determination
- **Component Integration**: ✅ Function passed to both timeline components
- **Color Application**: ❌ Timeline shift rendering not yet using status-based colors
- **Status Indicators**: ❌ Staffing level displays not yet in shift headers

**Expected Color Coding:**
- 🔴 **Understaffed** (`bg-error/20 border-error`): Current workers < minimum required
- 🟢 **Properly Staffed** (`bg-success/20 border-success`): Current workers = minimum required
- 🟡 **Overstaffed** (`bg-warning/20 border-warning`): Current workers > minimum required

### ⏳ **Pending Implementation**

#### **Backend Integration** *(Next Major Phase)*
- Replace mock data with Convex queries
- Real-time staffing calculations
- Live worker assignment updates
- Proper error handling and loading states

#### **Advanced Interactions** *(Future Development)*
- Drag-and-drop worker assignment
- Real-time conflict detection
- Bulk operations and approval workflows
- Mobile touch interactions

### 📁 **File Architecture**

#### **Core LUZ Components**
- `/src/routes/luz.tsx` - Main LUZ page with mock data and staffing logic
- `/src/components/LUZOverview.tsx` - Left sidebar overview section (30% width)
- `/src/components/LUZVerticalTimeline.tsx` - Vertical calendar view (70% width)
- `/src/components/LUZHorizontalTimeline.tsx` - Horizontal Gantt view (70% width)

#### **Mock Data Definitions** *(Temporary for Frontend Development)*
- **`mockShifts`**: Daily Operations shift (8:00-18:00) with hourly worker requirements
- **`mockAssignments`**: Alice Johnson (confirmed), Bob Smith (pending worker approval)
- **`mockCourses`**: Safety Training (10:00-12:00), Equipment Use (14:00-16:30)
- **`mockPendingAssignments`**: Carol Davis pending manager approval

#### **Backend Schema** *(Ready for Integration)*
- `/convex/shifts.ts` - Shift template management
- `/convex/shift_assignments.ts` - Worker assignment operations
- `/convex/courses.ts` - Educational course management
- `/convex/worker_requests.ts` - Self-service request workflows

### 🎯 **Immediate Next Steps**
1. Complete population status color integration (30 mins)
2. Add staffing level indicators to shift headers (20 mins)
3. Test various staffing scenarios (15 mins)
4. Prepare backend integration plan (15 mins)

---

## 🎯 LUZ SYSTEM OVERVIEW

### **LUZ = Unified Scheduling Hub**
The LUZ (Light/Luz in Spanish) system provides a single interface for all time-based activities: shifts, courses, and tool rentals. The name symbolizes "bringing light" to complex scheduling challenges. 


### **Core Architecture: 70/30 Split Interface**
```
┌─────────────────────────────────────────────────────────────┐
│                    LUZ TAB HEADER                           │
├─────────────────────────────────────────────────────────────┤
│ FILTER SECTION (Always Visible Top Bar)                     │
│ ☑ Shifts  ☑ Education  ☑ Rentals  [Search: _______]       │
├─────────────────────────────────────────────────────────────┤
│ MAIN CONTENT AREA                                           │
│ ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│ │        OVERVIEW            │ │       CALENDAR           │ │
│ │    (Left 30%)              │ │     (Right 70%)          │ │
│ │                            │ │                          │ │
│ │ Action-oriented display    │ │ Visual timeline with     │ │
│ │ - Pending items            │ │ vertical hour layout     │ │
│ │ - Role-specific alerts     │ │ - Drag-and-drop assign  │ │
│ │ - Quick actions            │ │ - Real-time updates      │ │
│ │ - Bulk operations          │ │ - Interactive elements  │ │
│ │                            │ │                          │ │
│ └─────────────────────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 1. LUZ INTERFACE INTERACTION SPECIFICATIONS

### **Drag-and-Drop Assignment Logic**

#### **Manager Drag-and-Drop Workflow:**
```typescript
interface DragAndDropBehavior {
  // Source: Worker from Overview Available Workers list
  // Target: Time slot in Calendar vertical timeline

  onDragStart: {
    highlightCompatibleSlots: boolean,    // Show which slots worker can fill
    showWorkerPreferences: boolean,       // Visual hints about fit quality
    temporaryPreview: boolean,            // Ghost outline during drag
  },

  onDragOver: {
    validateTarget: (worker: Worker, timeSlot: TimeSlot) => ValidationResult,
    showImpactPreview: boolean,           // Coverage gap changes preview
    conflictWarning: boolean,             // Red highlight for conflicts
  },

  onDrop: {
    createAssignment: boolean,            // Immediately create assignment
    updateCoverageDisplay: boolean,       // Real-time gap calculation update
    showConfirmation: boolean,            // Success feedback
  },

  validationRules: {
    noDoubleBooking: boolean,             // Prevent worker conflicts
    respectCapacityLimits: boolean,       // Don't exceed hourly maximums
    checkAvailability: boolean,           // Worker must be available
  }
}
```

#### **Real-Time Update Mechanics:**
```typescript
interface RealTimeUpdates {
  // When assignment changes occur
  updateTriggers: [
    "assignment_created",
    "assignment_cancelled",
    "worker_request_approved",
    "coverage_gap_detected"
  ],

  // What updates in real-time
  affectedComponents: {
    overviewAlerts: boolean,              // Staffing gap warnings
    timelineVisual: boolean,              // Worker assignments display
    coverageCalculation: boolean,         // Gap/overstaffed indicators
    availableWorkersList: boolean,       // Remove assigned workers
  },

  // Update performance strategy
  updateStrategy: {
    debounceTime: 300,                   // Milliseconds to batch updates
    optimisticUpdates: boolean,          // Show changes immediately
    rollbackOnError: boolean,            // Undo if server rejects
  }
}
```

#### **Mobile Responsiveness Specifications:**
```typescript
interface MobileAdaptation {
  // Screen size breakpoints
  breakpoints: {
    mobile: "< 768px",
    tablet: "768px - 1024px",
    desktop: "> 1024px"
  },

  // Layout adaptations
  mobileLayout: {
    splitRatio: "100% stacked",          // Overview and Calendar stack vertically
    dragAndDrop: "tap-to-assign",        // Replace drag with tap interactions
    timelineScroll: "horizontal",        // Horizontal scrollable timeline
  },

  // Touch interactions
  touchBehavior: {
    tapToAssign: boolean,                // Tap worker, then tap time slot
    swipeNavigation: boolean,            // Swipe between days/weeks
    pinchToZoom: boolean,                // Zoom timeline for precision
  }
}
```

---

## 📋 6. MANAGER ASSIGNMENT INTERFACE LOGIC

### **Assignment Validation Rules**

#### **Assignment Prevention Logic:**
```typescript
interface AssignmentValidation {
  // Core validation checks
  preventInvalidAssignments: {
    doubleBookingCheck: (worker: Worker, date: string, hours: TimeRange) => boolean,
    capacityLimitCheck: (timeSlot: TimeSlot, currentCount: number) => boolean,
    workerAvailabilityCheck: (worker: Worker, requestedHours: TimeRange) => boolean,
    skillRequirementCheck: (shift: Shift, worker: Worker) => boolean, // Future: opening/closing permissions
  },

  // Validation feedback
  validationFeedback: {
    blockingErrors: string[],            // "Worker already assigned during this time"
    warnings: string[],                  // "This exceeds optimal staffing"
    suggestions: string[],               // "Consider assigning Sarah who prefers mornings"
  },

  // Override capabilities
  managerOverrides: {
    emergencyStaffing: boolean,          // Allow capacity overrides
    conflictResolution: boolean,         // Resolve double-booking by moving assignments
    bulkAssignmentForce: boolean,        // Force assignments for urgent coverage
  }
}
```

#### **Coverage Gap Calculation Algorithm:**
```typescript
interface CoverageCalculation {
  // Real-time gap detection
  calculateCoverageGaps: (date: string, shiftTemplate: ShiftTemplate) => {
    hourlyAnalysis: {
      hour: string,                      // "14:00"
      required: number,                  // 3 workers needed
      assigned: number,                  // 1 worker currently assigned
      status: "critical" | "warning" | "optimal" | "overstaffed",
      gapSize: number,                   // 2 workers short
      priority: "urgent" | "moderate" | "low"
    }[],

    // Summary statistics
    totalGaps: number,                   // 8 hours need coverage
    criticalGaps: number,               // 3 hours critically understaffed
    optimalHours: number,               // 4 hours properly staffed
    overstaffedHours: number,           // 1 hour overstaffed
  },

  // Visual indicator logic
  statusColorCoding: {
    critical: "#ef4444",                 // Red - 2+ workers short
    warning: "#f59e0b",                  // Orange - 1 worker short
    optimal: "#10b981",                  // Green - perfect staffing
    overstaffed: "#8b5cf6",             // Purple - excess workers
  }
}
```

#### **Bulk Operation Handling:**
```typescript
interface BulkOperations {
  // Multi-worker assignment
  bulkAssignment: {
    selectionMode: "checkbox" | "drag_select",
    assignmentTargets: TimeSlot[],       // Multiple time slots selected
    workerPool: Worker[],                // Available workers to assign

    // Bulk validation
    validateBulkAssignment: (workers: Worker[], slots: TimeSlot[]) => {
      validAssignments: Assignment[],
      conflicts: Conflict[],
      warnings: Warning[]
    },

    // Assignment strategies
    assignmentStrategy: "optimal_fit" | "first_available" | "manager_choice"
  },

  // Bulk approval operations
  bulkApproval: {
    requestTypes: ["worker_requests", "extra_hour_requests", "time_off_requests"],
    batchSize: number,                   // Process N requests at once
    rollbackOnPartialFailure: boolean,   // All-or-nothing processing
  }
}
```

#### **Undo/Redo Functionality:**
```typescript
interface UndoRedoSystem {
  // Action tracking
  actionHistory: {
    maxHistorySize: 20,                  // Keep last 20 actions
    trackableActions: [
      "assignment_created",
      "assignment_cancelled",
      "bulk_assignment",
      "approval_decision"
    ]
  },

  // Undo implementation
  undoLogic: {
    stateCapture: "assignment_snapshot", // Save state before action
    conflictResolution: "ask_user",      // How to handle conflicts on undo
    undoTimeLimit: 300000,              // 5 minutes to undo actions
  },

  // UI integration
  undoInterface: {
    undoButton: boolean,                 // Show undo button after actions
    undoTooltip: string,                // "Undo: Assigned Sarah to 2-6PM"
    redoAvailable: boolean,             // Enable redo after undo
  }
}
```

---

## 📋 7. WORKER SELF-SERVICE REQUEST LOGIC 

### **Opportunity Matching Algorithm**

#### **"Good Fit" Determination Logic:** ( maybe not relevant for now, move to future implamentations)
```typescript
interface OpportunityMatching {
  // Worker pattern analysis
  calculateWorkerFit: (worker: Worker, availableHours: TimeSlot) => {
    fitScore: number,                    // 0-100% match quality
    fitReasons: string[],                // Why this is a good fit
    fitConcerns: string[],               // Potential issues
  },

  // Scoring criteria
  scoringFactors: {
    historicalPreference: {
      weight: 40,                        // 40% of fit score
      calculation: "similar_time_periods_worked"
    },
    currentScheduleAlignment: {
      weight: 30,                        // 30% of fit score
      calculation: "extends_existing_shifts" | "fills_gap_in_schedule"
    },
    workloadBalance: {
      weight: 20,                        // 20% of fit score
      calculation: "weekly_hours_approaching_limit"
    },
    skillRequirements: {
      weight: 10,                        // 10% of fit score
      calculation: "can_open_store" | "can_close_store" | "general_skills"
    }
  },

  // Opportunity presentation
  presentationLogic: {
    minimumFitScore: 60,                 // Only show 60%+ matches
    maxOpportunities: 3,                 // Show top 3 opportunities
    opportunityRefresh: "daily",         // How often to recalculate
  }
}
```

#### **Request Conflict Handling:**
```typescript
interface RequestConflictResolution {
  // Multiple workers requesting same hours
  conflictScenarios: {
    sameTimeSlot: {
      resolution: "manager_choice",      // Manager picks between workers
      notification: "inform_all_requesters",
      fallback: "suggest_alternative_hours"
    },

    capacityExceeded: {
      resolution: "first_come_first_served" | "best_fit_wins",
      waitlist: boolean,                 // Put others on waitlist
      alternativeSuggestions: boolean,   // Suggest similar time slots
    }
  },

  // Conflict prevention
  preventionMeasures: {
    realTimeCapacityCheck: boolean,      // Check availability before allowing request
    requestExpiration: 24 * 60 * 60000, // 24 hours to respond to conflicts
    automaticAlternatives: boolean,      // System suggests similar times
  }
}
```

#### **Request Priority System:**
```typescript
interface RequestPriority {
  // Priority levels
  priorityLevels: {
    urgent: {
      timeframe: "< 24 hours notice",
      managerNotification: "immediate",
      approvalExpectation: "< 2 hours"
    },
    normal: {
      timeframe: "24-72 hours notice",
      managerNotification: "daily_digest",
      approvalExpectation: "< 24 hours"
    },
    planning: {
      timeframe: "> 72 hours notice",
      managerNotification: "weekly_digest",
      approvalExpectation: "< 48 hours"
    }
  },

  // Priority factors
  priorityCalculation: {
    timeUrgency: number,                 // How soon the shift is
    businessNeed: number,                // How critical the coverage is
    workerRequest: number,               // Regular vs emergency request
    historyFactor: number,               // Reliable worker gets priority
  }
}
```

#### **Manager Review Interface Logic:**
```typescript
interface ManagerReviewInterface {
  // Request organization
  requestOrganization: {
    groupBy: "priority" | "date" | "worker" | "time_period",
    sortBy: "urgency" | "request_date" | "alphabetical",
    filterOptions: ["today_urgent", "this_week", "needs_coverage", "all_pending"]
  },

  // Quick review actions
  quickActions: {
    approveWithDefaults: boolean,        // One-click approve
    approveWithModifications: boolean,   // Approve but change hours
    denyWithReason: boolean,            // Quick denial with template reasons
    requestMoreInfo: boolean,           // Ask worker for clarification
  },

  // Review assistance
  reviewAssistance: {
    coverageImpactPreview: boolean,      // Show gap changes if approved
    workerWorkloadWarning: boolean,      // Alert if approaching hour limits
    conflictHighlighting: boolean,       // Show competing requests
    suggestionAlgorithm: boolean,       // AI-suggested responses
  }
}
```

---

## 📋 8. CALENDAR TIMELINE RENDERING LOGIC

### **Time Slot Calculation**

#### **Dynamic Time Slot System:**
```typescript
interface TimeSlotCalculation {
  // Time slot generation
  generateTimeSlots: (storeHours: {open: string, close: string}) => {
    baseSlots: {
      hour: string,                      // "14:00"
      duration: 60,                      // minutes per slot
      isOperational: boolean,            // During store hours
      requiresStaffing: boolean,         // Needs worker coverage
    }[],

    // Slot customization
    slotAdjustments: {
      breakSlots: string[],              // Times that can be break periods
      transitionSlots: string[],         // Opening/closing procedures
      peakSlots: string[],               // High-traffic periods
    }
  },

  // Rendering optimization
  renderingStrategy: {
    visibleSlotWindow: 12,               // Show 12 hours at once
    virtualScrolling: boolean,           // Render only visible slots
    slotHeight: 40,                      // Pixels per hour slot
    compactMode: boolean,                // Smaller slots for mobile
  }
}
```

#### **Visual Overlap Detection:**
```typescript
interface OverlapRendering {
  // Multiple workers in same time slot
  overlapDetection: {
    detectOverlaps: (assignments: Assignment[], timeSlot: string) => {
      overlappingWorkers: Worker[],
      renderingPositions: {
        workerId: string,
        xOffset: number,                 // Horizontal position (0-100%)
        width: number,                   // Width percentage (50% if 2 workers)
        zIndex: number,                  // Stacking order
      }[]
    }
  },

  // Visual rendering strategy
  overlapVisualization: {
    sideByeSide: {
      maxWorkersPerSlot: 4,              // Before switching to stacked mode
      workerBadgeWidth: "25%",           // Width when 4 workers
      gapBetweenBadges: 2,               // Pixels between worker badges
    },

    stackedMode: {
      triggerAt: 5,                      // 5+ workers triggers stacking
      stackHeight: 20,                   // Pixels per stacked worker
      showCountBadge: boolean,           // "+3 more" indicator
    }
  }
}
```

#### **Performance Optimization Strategy:**
```typescript
interface PerformanceOptimization {
  // Rendering performance
  renderingOptimizations: {
    virtualScrolling: {
      enabled: boolean,
      bufferSize: 5,                     // Extra slots above/below viewport
      recycleNodes: boolean,             // Reuse DOM elements
    },

    dataOptimization: {
      cacheTimelineData: boolean,        // Cache calculated positions
      incrementalUpdates: boolean,       // Only update changed slots
      backgroundCalculation: boolean,   // Pre-calculate next day
    },

    // Performance targets
    performanceTargets: {
      initialRenderTime: 500,            // ms to first paint
      scrollResponseTime: 16,            // ms per frame (60fps)
      assignmentUpdateTime: 100,         // ms to reflect assignment changes
    }
  }
}
```

#### **Interactive Element Specifications:**
```typescript
interface InteractiveElements {
  // Click behaviors
  clickInteractions: {
    emptyTimeSlot: {
      action: "show_assignment_options",
      modal: boolean,                    // Show assignment modal
      quickAssign: boolean,              // Quick assign available worker
    },

    occupiedTimeSlot: {
      action: "show_assignment_details",
      editCapability: boolean,           // Can modify assignment
      removeCapability: boolean,         // Can remove assignment
    },

    workerBadge: {
      action: "show_worker_details",
      moveCapability: boolean,           // Can drag to different time
      contextMenu: boolean,              // Right-click options
    }
  },

  // Hover behaviors
  hoverEffects: {
    previewMode: boolean,                // Show preview on hover
    tooltipContent: {
      timeSlot: "coverage_info",         // "2/3 workers assigned"
      workerBadge: "worker_schedule",    // Worker's full day schedule
      gapWarning: "coverage_details",    // What coverage is missing
    },

    visualFeedback: {
      highlightRow: boolean,             // Highlight entire time row
      showConnections: boolean,          // Show worker's other assignments
      fadeOthers: boolean,               // Dim unrelated elements
    }
  },

  // Keyboard navigation
  keyboardSupport: {
    tabNavigation: boolean,              // Tab through time slots
    arrowKeyNavigation: boolean,         // Arrow keys to move
    spaceToSelect: boolean,              // Spacebar to assign/select
    escapeToCancel: boolean,             // Escape to cancel operations
  }
}
```

---

## 🎨 VISUAL DESIGN SPECIFICATIONS

### **Color Coding System**
```typescript
interface ColorSystem {
  // Status colors
  statusColors: {
    critical: "#ef4444",                 // Red - severely understaffed
    warning: "#f59e0b",                  // Orange - needs attention
    optimal: "#10b981",                  // Green - perfect staffing
    overstaffed: "#8b5cf6",             // Purple - too many workers
    pending: "#6b7280",                 // Gray - awaiting approval
  },

  // Worker assignment colors
  workerColors: {
    assigned: "#3b82f6",                // Blue - confirmed assignment
    tentative: "#f59e0b",               // Orange - pending confirmation
    requested: "#8b5cf6",               // Purple - worker requested
    break: "#6b7280",                   // Gray - break period
  },

  // Item type colors (shifts vs courses vs rentals)
  itemTypeColors: {
    shift: "#3b82f6",                   // Blue base
    course: "#10b981",                  // Green base
    rental: "#f59e0b",                  // Orange base
  }
}
```

### **Typography and Spacing**
```typescript
interface VisualSpacing {
  // Timeline typography
  timelineText: {
    hourLabels: "text-sm font-medium",   // 14px, medium weight
    workerNames: "text-xs",              // 12px for worker badges
    statusLabels: "text-xs font-bold",   // 12px bold for status
  },

  // Spacing system
  spacing: {
    timeSlotHeight: 40,                  // pixels per hour
    workerBadgeHeight: 24,               // pixel height for badges
    gapBetweenSlots: 1,                  // pixel gap between hours
    sidebarPadding: 16,                  // padding in overview section
  },

  // Responsive adjustments
  mobileAdjustments: {
    timeSlotHeight: 32,                  // Smaller on mobile
    fontSize: "text-xs",                 // Smaller text
    touchTargetSize: 44,                 // Minimum touch target
  }
}
```

---

## 🔄 INTEGRATION SPECIFICATIONS

### **Cross-System Data Flow**
```typescript
interface CrossSystemIntegration {
  // Unified data structure
  unifiedCalendarItem: {
    id: string,
    type: "shift" | "course" | "rental",
    title: string,
    startTime: string,
    endTime: string,
    date: string,

    // Type-specific data
    shiftData?: ShiftAssignment,
    courseData?: CourseSession,
    rentalData?: ToolRental,

    // Display properties
    color: string,
    status: string,
    participants: number,
    capacity?: number,
  },

  // Data synchronization
  syncStrategy: {
    realTimeUpdates: boolean,
    conflictResolution: "last_write_wins" | "manual_resolution",
    crossSystemValidation: boolean,      // Prevent double-booking across systems
  }
}
```

### **Filter System Integration**
```typescript
interface FilterIntegration {
  // Multi-system filtering
  filterLogic: {
    shifts: {
      showAssigned: boolean,
      showPending: boolean,
      showGaps: boolean,
    },
    courses: {
      showScheduled: boolean,
      showEnrollmentOpen: boolean,
      showMyCourses: boolean,  // For instructors
    },
    rentals: {
      showActive: boolean,
      showPending: boolean,
      showOverdue: boolean,
    }
  },

  // Combined filter effects
  combinedFiltering: {
    andLogic: boolean,                   // All selected filters must match
    crossSystemSearch: boolean,          // Search across all item types
    savedFilterSets: boolean,            // Save common filter combinations
  }
}
```

---

## 📋 CURRENT TODO STATUS & COMPLETION GUIDE

### 🔄 **Active Todo List** *(From Current Session)*

#### **Population Status Integration** *(Priority: High)*
1. ✅ **Add population status logic to shift data** - COMPLETED
   - `getShiftStaffingStatus` function implemented with understaffed/staffed/overstaffed logic
   - Calculates current vs minimum worker requirements
   - Returns status object with severity indicators

2. 🔧 **Update vertical timeline shift colors based on staffing** - IN PROGRESS
   - Function passed to component but not yet applied to rendering
   - **Required Code Change**: Update shift container `className` in `LUZVerticalTimeline.tsx` line ~74
   - **Implementation**: Replace `bg-primary/20 border-primary` with status-based colors

3. ⏳ **Update horizontal timeline shift colors based on staffing** - PENDING
   - Same logic as vertical timeline
   - **Required Code Change**: Update shift container `className` in `LUZHorizontalTimeline.tsx` line ~174
   - **Implementation**: Apply same color logic to horizontal view

4. ⏳ **Add staffing status indicators to shift headers** - PENDING
   - Display "X/Y workers" in protected header areas
   - Add visual status badges (understaffed/OK/overstaffed)
   - **Location**: Both timeline components' header sections

5. ⏳ **Re-integrate with Convex backend once frontend is stable** - PENDING
   - Replace mock data with actual Convex queries
   - Implement real-time staffing calculations
   - Add proper error handling and loading states

### 🛠️ **Detailed Completion Steps**

#### **Step 1: Vertical Timeline Color Integration** *(15 minutes)*
```typescript
// In LUZVerticalTimeline.tsx around line 74
const shiftWorkers = assignmentsForDate?.filter(assignment => true) || [];
const staffingStatus = getShiftStaffingStatus(shift, shiftWorkers);

const shiftColorClasses = {
  understaffed: 'bg-error/20 border-2 border-error',
  staffed: 'bg-success/20 border-2 border-success',
  overstaffed: 'bg-warning/20 border-2 border-warning'
}[staffingStatus.status];

// Replace: className="absolute bg-primary/20 border-2 border-primary rounded left-2 right-2"
// With: className={`absolute ${shiftColorClasses} rounded left-2 right-2`}
```

#### **Step 2: Horizontal Timeline Color Integration** *(10 minutes)*
```typescript
// In LUZHorizontalTimeline.tsx around line 174
// Apply same logic as vertical timeline
// Update shift container className with status-based colors
```

#### **Step 3: Header Status Indicators** *(15 minutes)*
```typescript
// In both timeline components' header sections
<div className="bg-primary/30 border-b border-primary/50 px-2 py-1 rounded-t">
  <div className="flex justify-between items-center">
    <div>
      <div className="font-medium text-sm">{shift.name}</div>
      <div className="text-xs text-base-content/70">
        {shift.storeHours.openTime} - {shift.storeHours.closeTime}
      </div>
    </div>
    <div className="text-right">
      <div className="text-xs font-bold">
        {staffingStatus.currentWorkers}/{staffingStatus.minWorkers} workers
      </div>
      <div className={`badge badge-xs ${statusBadgeClass}`}>
        {staffingStatus.status}
      </div>
    </div>
  </div>
</div>
```

### 🧪 **Testing Scenarios** *(For Validation)*

#### **Mock Data Variations to Test**
1. **Understaffed Scenario**: 1 confirmed worker, 3 required → Red coloring
2. **Properly Staffed Scenario**: 3 confirmed workers, 3 required → Green coloring
3. **Overstaffed Scenario**: 4 confirmed workers, 3 required → Yellow coloring
4. **Mixed Status Scenario**: Multiple shifts with different staffing levels

#### **Filter Testing**
- Shifts only: Should show population status colors
- Courses only: Should show secondary colors
- Both: Should maintain distinct color schemes

### 🔌 **Backend Integration Preparation** *(Next Major Phase)*

#### **Mock Data Replacement Plan**
1. Replace `mockShifts` with `useQuery(api.shifts.listShiftsForDate, { date })`
2. Replace `mockAssignments` with `useQuery(api.shift_assignments.getAssignmentsForDate, { date })`
3. Replace `mockCourses` with `useQuery(api.courses.getCoursesForDate, { date })`
4. Implement real-time subscriptions for live updates

#### **Schema Validation Requirements**
- Ensure `hourlyRequirements` field exists in shift templates
- Verify worker assignment status values match frontend expectations
- Validate time format consistency (HH:MM)

### 📊 **Performance Considerations**
- Staffing calculations should be memoized to prevent unnecessary recalculations
- Color class determination should be cached for multiple shifts
- Timeline rendering optimizations for large datasets

## 📝 MOCK DATA DOCUMENTATION

### 🎭 **Current Mock Data Usage** *(Temporary Frontend Testing)*

**⚠️ Important**: All data is currently **mock-based** for frontend development. No backend integration yet implemented.

#### **Mock Shifts** (`mockShifts` in `/src/routes/luz.tsx`)
```typescript
const mockShifts = [{
  _id: "shift1",
  name: "Daily Operations",
  type: "operational",
  storeHours: { openTime: "08:00", closeTime: "18:00" },
  hourlyRequirements: [
    { hour: "08:00", minWorkers: 2, optimalWorkers: 3 },
    { hour: "09:00", minWorkers: 1, optimalWorkers: 2 },
    // ... 10 total hours with varying requirements
  ]
}];
```
**Purpose**: Demonstrates 10-hour shift with variable staffing requirements for testing population status logic.

#### **Mock Worker Assignments** (`mockAssignments`)
```typescript
const mockAssignments = [
  {
    _id: "assignment1",
    worker: { _id: "worker1", name: "Alice Johnson" },
    assignedHours: [{ startTime: "08:00", endTime: "14:00" }],
    status: "confirmed"  // ✅ Counts toward staffing
  },
  {
    _id: "assignment2",
    worker: { _id: "worker2", name: "Bob Smith" },
    assignedHours: [{ startTime: "12:00", endTime: "18:00" }],
    status: "pending_worker_approval"  // ❌ Doesn't count toward staffing
  }
];
```
**Purpose**: Tests different worker assignment states and their impact on shift population status.

#### **Mock Courses** (`mockCourses`)
```typescript
const mockCourses = [
  {
    _id: "course1",
    title: "Basic Safety Training",
    schedule: { startTime: "10:00", endTime: "12:00" },
    instructor: { _id: "instructor1", name: "Dr. Smith" },
    enrolledStudents: [
      { _id: "student1", name: "Emma Wilson" },
      { _id: "student2", name: "James Brown" }
    ],
    status: "confirmed",
    category: "safety"
  }
  // + Advanced Equipment Use course
];
```
**Purpose**: Demonstrates course integration with student enrollment for side-by-side timeline display.

#### **Mock Pending Assignments** (`mockPendingAssignments`)
```typescript
const mockPendingAssignments = [{
  _id: "pending1",
  worker: { _id: "worker3", name: "Carol Davis" },
  shift: { _id: "shift2", name: "Weekend Coverage" },
  assignedHours: [{ startTime: "10:00", endTime: "16:00" }],
  status: "pending_manager_approval"
}];
```
**Purpose**: Tests manager approval workflow displays in overview section.

### 🔄 **Data Flow Testing**

#### **Filter Integration**
- `shiftsForDate = filters.shifts ? mockShifts : []` - Respects shift filter
- `coursesForDate = filters.courses ? mockCourses : []` - Respects education filter
- Real-time filtering without backend dependencies

#### **Staffing Status Calculation**
- `getShiftStaffingStatus(shift, assignedWorkers)` uses mock data
- Only counts workers with `status: "confirmed"`
- Calculates understaffed/staffed/overstaffed based on `hourlyRequirements.minWorkers`

#### **Timeline Population**
- Both timeline components receive identical mock data
- Side-by-side vs stacked layout logic independent of data source
- Student/worker nesting uses mock enrollment/assignment data

### 🚀 **Backend Integration Transition Plan**

#### **Phase 1: Direct Replacement**
```typescript
// Replace mock arrays with Convex queries
const shiftsForDate = filters.shifts ?
  useQuery(api.shifts.listShiftsForDate, { date: selectedDate }) : [];
const assignmentsForDate =
  useQuery(api.shift_assignments.getAssignmentsForDate, { date: selectedDate });
```

#### **Phase 2: Real-time Integration**
- Replace static calculations with live Convex subscriptions
- Implement optimistic updates for assignment changes
- Add proper loading states and error handling

#### **Phase 3: Advanced Features**
- Real-time staffing notifications
- Drag-and-drop assignment creation
- Conflict detection and resolution

**📋 Current Mock Data Status**: Comprehensive frontend testing environment ready for seamless backend integration.

---

*This document provides comprehensive specifications for implementing the LUZ calendar system with detailed interaction logic, performance considerations, and current implementation status.*