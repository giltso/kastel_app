# LUZ Calendar System Redesign

**Context:** V2 Redesign - Unified scheduling interface with detailed interaction logic
**Status:** 🔧 DETAILED DESIGN SPECIFICATIONS

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

*This document provides comprehensive specifications for implementing the LUZ calendar system with detailed interaction logic, performance considerations, and visual design guidelines.*