import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// V2 Schema - Clean implementation from REDESIGN_V2.md and SHIFT_REDESIGN.md
export default defineSchema({
  // V2 Users - Tag-based role system
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),

    // V2 Tag-based role system from REDESIGN_V2.md
    isStaff: v.optional(v.boolean()), // Base role: Staff vs Customer
    workerTag: v.optional(v.boolean()), // Staff + Worker tag: operational capabilities
    instructorTag: v.optional(v.boolean()), // Staff + Instructor tag: course management
    toolHandlerTag: v.optional(v.boolean()), // Staff + Tool Handler tag: tool rental management
    managerTag: v.optional(v.boolean()), // Staff + Manager tag: approvals (requires workerTag)
    rentalApprovedTag: v.optional(v.boolean()), // Customer + Rental Approved: can request tool rentals

    // Dev role flag - enables RoleEmulator UI and permission management
    isDev: v.optional(v.boolean()), // Dev users can toggle their own permissions for testing

    // DEPRECATED V1 fields - kept temporarily for migration
    // Run migrateToIsDev mutation to clean these up
    role: v.optional(v.literal("dev")),
    emulatingIsStaff: v.optional(v.boolean()),
    emulatingWorkerTag: v.optional(v.boolean()),
    emulatingInstructorTag: v.optional(v.boolean()),
    emulatingToolHandlerTag: v.optional(v.boolean()),
    emulatingManagerTag: v.optional(v.boolean()),
    emulatingRentalApprovedTag: v.optional(v.boolean()),
  }).index("by_clerkId", ["clerkId"]),

  // V2 Shift Templates - Population-based from SHIFT_REDESIGN.md
  shifts: defineTable({
    name: v.string(), // "Daily Operations", "Weekend Coverage"
    description: v.optional(v.string()),
    type: v.union(v.literal("operational"), v.literal("maintenance"), v.literal("educational"), v.literal("special")),

    // Store Operation Hours
    storeHours: v.object({
      openTime: v.string(), // "08:00"
      closeTime: v.string(), // "20:00"
    }),

    // Range-based Hourly Requirements (V2.1)
    hourlyRequirements: v.array(v.object({
      startTime: v.string(), // "08:00" - Start of requirement range
      endTime: v.string(),   // "12:00" - End of requirement range
      minWorkers: v.number(), // Minimum required workers for this range
      optimalWorkers: v.number(), // Ideal staffing level for this range
      notes: v.optional(v.string()), // "Morning rush", "Lunch coverage"
    })),

    // Recurrence Pattern
    recurringDays: v.array(v.union(
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    )),
    isActive: v.boolean(),

    // Management
    createdBy: v.id("users"), // Manager who created template
    lastModified: v.number(),
    color: v.optional(v.string()), // Hex color for calendar display
  })
  .index("by_createdBy", ["createdBy"])
  .index("by_isActive", ["isActive"]),

  // V2 Shift Assignments - Flexible Hours from SHIFT_REDESIGN.md
  shift_assignments: defineTable({
    shiftTemplateId: v.id("shifts"), // Reference to population template
    workerId: v.id("users"), // Assigned worker
    date: v.string(), // "2025-09-16" (specific date)

    // Flexible Hour Assignment (KEY V2 FEATURE)
    assignedHours: v.array(v.object({
      startTime: v.string(), // "08:00"
      endTime: v.string(), // "14:00" - Manager assigns flexible ranges
    })),

    // Break Management (Optional)
    breakPeriods: v.optional(v.array(v.object({
      startTime: v.string(), // "12:00"
      endTime: v.string(), // "13:00"
      isPaid: v.boolean(), // true/false for paid breaks
    }))),

    // Assignment Metadata
    assignedBy: v.id("users"), // Manager who made assignment
    assignedAt: v.number(),

    // Dual Approval Status System
    status: v.union(
      v.literal("pending_worker_approval"), // Manager assigned, waiting for worker
      v.literal("pending_manager_approval"), // Worker requested, waiting for manager
      v.literal("confirmed"), // Both parties approved
      v.literal("rejected"), // Either party rejected
      v.literal("completed") // Shift completed
    ),

    // Approval Tracking
    workerApprovedAt: v.optional(v.number()),
    managerApprovedAt: v.optional(v.number()),

    // Notes
    assignmentNotes: v.optional(v.string()), // Manager's assignment notes

    // Boundary Adjustment Tracking (V2.1 UPGRADE)
    boundaryAdjustments: v.optional(v.array(v.object({
      originalHours: v.array(v.object({
        startTime: v.string(),
        endTime: v.string(),
      })),
      adjustedHours: v.array(v.object({
        startTime: v.string(),
        endTime: v.string(),
      })),
      reason: v.string(), // "shift_boundary_change", "manual_adjustment"
      adjustedBy: v.id("users"), // Who made the adjustment
      adjustedAt: v.number(), // When adjustment was made
      needsApproval: v.boolean(), // Does this need worker/manager approval?
      approvalStatus: v.optional(v.union(
        v.literal("pending_worker_approval"),
        v.literal("pending_manager_approval"),
        v.literal("approved"),
        v.literal("rejected")
      )),
    }))),
  })
  .index("by_shiftTemplateId", ["shiftTemplateId"])
  .index("by_workerId", ["workerId"])
  .index("by_date", ["date"])
  .index("by_assignedBy", ["assignedBy"]),

  // V2 Worker Hour Requests - Self-Service from SHIFT_REDESIGN.md
  worker_hour_requests: defineTable({
    workerId: v.id("users"), // Worker making request
    shiftTemplateId: v.id("shifts"), // Which operational template
    date: v.string(), // "2025-09-16"

    // Request Type and Hours
    requestType: v.union(
      v.literal("join_shift"), // Worker wants to join available shift
      v.literal("switch_request"), // Worker wants to switch with another
      v.literal("extra_hours"), // Worker requesting additional hours
      v.literal("time_off"), // Worker requesting time off
      v.literal("schedule_change") // Worker requesting schedule modification
    ),
    requestedHours: v.optional(v.object({
      startTime: v.string(), // "12:00" - for requested hours
      endTime: v.string(), // "18:00"
    })),

    // Switch Request Details (if requestType is "switch_request")
    switchDetails: v.optional(v.object({
      targetWorkerId: v.id("users"), // Worker they want to switch with
      currentAssignmentId: v.id("shift_assignments"), // Their current assignment
      targetAssignmentId: v.id("shift_assignments"), // Target worker's assignment
      externalNotificationSent: v.boolean(), // Did we notify target worker externally?
      targetWorkerResponse: v.optional(v.union(v.literal("approved"), v.literal("denied")))
    })),

    // Request Context
    reason: v.optional(v.string()), // "Need overtime", "Doctor appointment"
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("urgent")),

    // Approval Status
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"), v.literal("cancelled")),
    reviewedBy: v.optional(v.id("users")), // Manager who reviewed
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()), // Manager's response notes

    // Auto-created assignment (if approved)
    createdAssignmentId: v.optional(v.id("shift_assignments")),
  })
  .index("by_workerId", ["workerId"])
  .index("by_shiftTemplateId", ["shiftTemplateId"])
  .index("by_date", ["date"])
  .index("by_status", ["status"])
  .index("by_reviewedBy", ["reviewedBy"]),

  // Keep existing Tools system (V2 will integrate later)
  tools: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    condition: v.union(v.literal("excellent"), v.literal("good"), v.literal("fair"), v.literal("needs_repair")),
    rentalPricePerDay: v.number(),
    isAvailable: v.boolean(),
    location: v.optional(v.string()),
    addedBy: v.id("users"),
    notes: v.optional(v.string()),
  })
  .index("by_category", ["category"])
  .index("by_isAvailable", ["isAvailable"])
  .index("by_addedBy", ["addedBy"]),

  // Keep existing Tool Rentals system (V2 will integrate later)
  tool_rentals: defineTable({
    toolId: v.id("tools"),
    renterUserId: v.optional(v.id("users")), // Optional for manual rentals
    rentalStartDate: v.string(),
    rentalEndDate: v.string(),
    actualReturnDate: v.optional(v.string()),
    dailyRate: v.number(),
    totalCost: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("active"), v.literal("returned"), v.literal("overdue"), v.literal("cancelled")),
    approvedBy: v.optional(v.id("users")),
    createdBy: v.id("users"),
    notes: v.optional(v.string()),
    // Manual rental fields (for non-registered customers)
    isManualRental: v.optional(v.boolean()),
    nonUserRenterName: v.optional(v.string()),
    nonUserRenterContact: v.optional(v.string()), // Phone or email
  })
  .index("by_toolId", ["toolId"])
  .index("by_renterUserId", ["renterUserId"])
  .index("by_status", ["status"])
  .index("by_approvedBy", ["approvedBy"])
  .index("by_rentalStartDate", ["rentalStartDate"]),

  // V2 Courses system - Course templates with session support
  courses: defineTable({
    title: v.string(),
    description: v.string(),
    syllabus: v.array(v.string()),
    instructorId: v.id("users"), // Course owner/writer (has full edit permissions)
    helperInstructorIds: v.optional(v.array(v.id("users"))), // Helper instructors (can approve enrollments only)
    assistantIds: v.optional(v.array(v.id("users"))), // Legacy field, can be deprecated

    // Session type determines how dates/times are stored
    sessionType: v.union(
      v.literal("single"), // Single session - uses legacy date/time fields
      v.literal("multi-meeting"), // Multiple sessions - uses course_sessions table
      v.literal("recurring-template") // Future: recurring independent instances
    ),

    // Legacy date/time fields (used for single session courses and backward compatibility)
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),

    maxParticipants: v.number(),
    currentParticipants: v.number(),
    skillLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    category: v.string(),
    price: v.optional(v.number()), // Made optional, defaults to 0 (free)
    location: v.string(), // Default location, can be overridden per session
    isActive: v.boolean(),
    materials: v.optional(v.array(v.string())),
    createdBy: v.id("users"),
  })
  .index("by_instructorId", ["instructorId"])
  .index("by_startDate", ["startDate"])
  .index("by_skillLevel", ["skillLevel"])
  .index("by_category", ["category"])
  .index("by_isActive", ["isActive"]),

  // Course Sessions - For multi-meeting courses
  course_sessions: defineTable({
    courseId: v.id("courses"), // Reference to course template
    sessionNumber: v.number(), // 1, 2, 3, etc. - order of sessions
    date: v.string(), // "2025-10-12" - specific session date
    startTime: v.string(), // "14:00"
    endTime: v.string(), // "16:00"
    location: v.optional(v.string()), // Override course template location if needed
    notes: v.optional(v.string()), // "Bring safety goggles"
  })
  .index("by_courseId", ["courseId"])
  .index("by_date", ["date"]),

  // Keep existing Course Enrollments system (V2 will integrate later)
  course_enrollments: defineTable({
    courseId: v.id("courses"),
    studentId: v.id("users"),
    enrollmentDate: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show")),
    approvedBy: v.optional(v.id("users")),
    paymentStatus: v.union(v.literal("pending"), v.literal("paid"), v.literal("refunded")),
    notes: v.optional(v.string()),
  })
  .index("by_courseId", ["courseId"])
  .index("by_studentId", ["studentId"])
  .index("by_status", ["status"])
  .index("by_approvedBy", ["approvedBy"]),

  // UI Content - Editable content management system
  ui_content: defineTable({
    key: v.string(),                    // "home.welcomeBanner", "luz.helpText"
    namespace: v.string(),              // "ui_content" (for organization)

    // Multilingual content fields
    content_en: v.optional(v.string()),
    content_he: v.optional(v.string()),
    content_ru: v.optional(v.string()),
    content_fr: v.optional(v.string()),

    // Translation tracking (which languages are outdated)
    needsTranslation_en: v.optional(v.boolean()),
    needsTranslation_he: v.optional(v.boolean()),
    needsTranslation_ru: v.optional(v.boolean()),
    needsTranslation_fr: v.optional(v.boolean()),

    // Audit trail
    lastEditedBy: v.id("users"),        // Who made the last edit
    lastEditedAt: v.number(),           // Timestamp
    lastEditedLanguage: v.string(),     // "he", "en", "ru", "fr"
  })
  .index("by_key", ["key"])
  .index("by_namespace", ["namespace"]),
});