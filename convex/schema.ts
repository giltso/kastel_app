import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema defines your data model for the database.
// For more information, see https://docs.convex.dev/database/schema
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()), // Made optional to handle existing data
    role: v.optional(v.union(
      v.literal("tester"), 
      v.literal("guest"), 
      v.literal("customer"), 
      v.literal("worker"), 
      v.literal("manager")
    )),
    // For tester role - which role they're currently emulating
    emulatingRole: v.optional(v.union(
      v.literal("guest"), 
      v.literal("customer"), 
      v.literal("worker"), 
      v.literal("manager")
    )),
  }).index("by_clerkId", ["clerkId"]).index("by_role", ["role"]),

  // Requests: Service-oriented items
  requests: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("guest"), v.literal("customer")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("assigned"), v.literal("completed"), v.literal("rejected")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    createdBy: v.id("users"),
    approvedBy: v.optional(v.id("users")), // Manager who approved
    assignedTo: v.optional(v.id("users")), // Worker assigned to handle
    requestData: v.optional(v.object({})), // Flexible data structure for different request types
  })
  .index("by_createdBy", ["createdBy"])
  .index("by_assignedTo", ["assignedTo"])
  .index("by_status", ["status"])
  .index("by_type", ["type"]),

  // Events: Operational scheduling
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    // Date and time fields for scheduled events
    startDate: v.string(), // ISO date string (YYYY-MM-DD)
    endDate: v.string(), // ISO date string (YYYY-MM-DD)
    startTime: v.string(), // Time string (HH:MM)
    endTime: v.string(), // Time string (HH:MM)
    // Legacy fields for backward compatibility
    startTime_legacy: v.optional(v.number()),
    endTime_legacy: v.optional(v.number()),
    // Event properties
    type: v.union(v.literal("work"), v.literal("meeting"), v.literal("maintenance"), v.literal("team"), v.literal("educational")),
    status: v.union(v.literal("pending_approval"), v.literal("approved"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
    // Repetition settings
    isRecurring: v.boolean(),
    recurringType: v.optional(v.union(v.literal("weekly"))), // Currently only weekly, can expand later
    recurringDays: v.optional(v.array(v.union(
      v.literal("monday"),
      v.literal("tuesday"), 
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    ))), // Days of the week for weekly repetition
    // User references
    createdBy: v.id("users"), // Worker who created
    approvedBy: v.optional(v.id("users")), // Manager who approved
    assignedTo: v.optional(v.id("users")),
    participants: v.optional(v.array(v.id("users"))), // Event participants (default includes creator)
  })
  .index("by_createdBy", ["createdBy"])
  .index("by_approvedBy", ["approvedBy"])
  .index("by_assignedTo", ["assignedTo"])
  .index("by_startDate", ["startDate"])
  .index("by_status", ["status"]),

  // Tickets: Problem resolution system  
  tickets: defineTable({
    title: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed")),
    category: v.optional(v.string()), // equipment, scheduling, customer, etc.
    createdBy: v.id("users"), // Worker who reported
    assignedTo: v.optional(v.id("users")), // Worker or manager handling
    closedBy: v.optional(v.id("users")), // Only managers can close
  })
  .index("by_createdBy", ["createdBy"])
  .index("by_assignedTo", ["assignedTo"])
  .index("by_status", ["status"])
  .index("by_priority", ["priority"]),

  // Comments for tickets (collaborative resolution)
  ticket_comments: defineTable({
    ticketId: v.id("tickets"),
    comment: v.string(),
    createdBy: v.id("users"),
  })
  .index("by_ticketId", ["ticketId"])
  .index("by_createdBy", ["createdBy"]),

  // Notifications for approvals and updates
  notifications: defineTable({
    type: v.union(v.literal("event_approval"), v.literal("request_approval"), v.literal("assignment"), v.literal("status_update")),
    title: v.string(),
    message: v.string(),
    targetUserId: v.id("users"), // Who should see this notification
    relatedItemId: v.optional(v.string()), // ID of event/request/ticket
    relatedItemType: v.optional(v.union(v.literal("event"), v.literal("request"), v.literal("ticket"))),
    isRead: v.boolean(),
    actionRequired: v.boolean(), // True if this requires user action (approval, etc.)
  })
  .index("by_targetUserId", ["targetUserId"])
  .index("by_isRead", ["isRead"])
  .index("by_actionRequired", ["actionRequired"]),

  forms: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("work_hours"), v.literal("team_report"), v.literal("custom")),
    createdBy: v.id("users"),
    isActive: v.boolean(),
    fields: v.array(v.object({
      id: v.string(),
      label: v.string(),
      type: v.union(v.literal("text"), v.literal("number"), v.literal("date"), v.literal("select")),
      required: v.boolean(),
      options: v.optional(v.array(v.string())),
    })),
  })
  .index("by_createdBy", ["createdBy"])
  .index("by_isActive", ["isActive"]),

  form_submissions: defineTable({
    formId: v.id("forms"),
    submittedBy: v.id("users"),
    data: v.object({}), // Dynamic data based on form fields
    submittedAt: v.number(),
  })
  .index("by_formId", ["formId"])
  .index("by_submittedBy", ["submittedBy"]),

  // Tools: Inventory management for rental system
  tools: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(), // drill, saw, hammer, etc.
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    condition: v.union(v.literal("excellent"), v.literal("good"), v.literal("fair"), v.literal("needs_repair")),
    rentalPricePerDay: v.number(), // 0 for free tools
    isAvailable: v.boolean(),
    location: v.optional(v.string()), // where in the shop
    addedBy: v.id("users"), // worker who added the tool
    notes: v.optional(v.string()),
  })
  .index("by_category", ["category"])
  .index("by_isAvailable", ["isAvailable"])
  .index("by_addedBy", ["addedBy"]),

  // Tool Rentals: Track who has what tools and when
  tool_rentals: defineTable({
    toolId: v.id("tools"),
    renterUserId: v.id("users"), // customer or worker renting
    rentalStartDate: v.string(), // ISO date string
    rentalEndDate: v.string(), // Expected return date
    actualReturnDate: v.optional(v.string()), // When actually returned
    dailyRate: v.number(), // Rate at time of rental
    totalCost: v.number(), // calculated cost
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("active"), v.literal("returned"), v.literal("overdue"), v.literal("cancelled")),
    approvedBy: v.optional(v.id("users")), // worker who approved
    createdBy: v.id("users"), // who created the rental request
    notes: v.optional(v.string()),
    eventId: v.optional(v.id("events")), // linked calendar event
  })
  .index("by_toolId", ["toolId"])
  .index("by_renterUserId", ["renterUserId"])
  .index("by_status", ["status"])
  .index("by_approvedBy", ["approvedBy"])
  .index("by_rentalStartDate", ["rentalStartDate"]),

  // Courses: Educational offerings
  courses: defineTable({
    title: v.string(),
    description: v.string(),
    syllabus: v.array(v.string()), // list of topics covered
    instructorId: v.id("users"), // staff member organizing
    assistantIds: v.optional(v.array(v.id("users"))), // workers involved
    startDate: v.string(), // ISO date string
    endDate: v.string(),
    startTime: v.string(), // HH:MM
    endTime: v.string(),
    maxParticipants: v.number(),
    currentParticipants: v.number(),
    skillLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    category: v.string(), // plumbing, electrical, carpentry, etc.
    price: v.number(), // course fee
    location: v.string(), // where in the shop/classroom
    isActive: v.boolean(), // can people still sign up
    materials: v.optional(v.array(v.string())), // what materials are provided/needed
    eventId: v.optional(v.id("events")), // linked calendar event
    createdBy: v.id("users"),
  })
  .index("by_instructorId", ["instructorId"])
  .index("by_startDate", ["startDate"])
  .index("by_skillLevel", ["skillLevel"])
  .index("by_category", ["category"])
  .index("by_isActive", ["isActive"]),

  // Course Enrollments: Track who signed up for what courses
  course_enrollments: defineTable({
    courseId: v.id("courses"),
    studentId: v.id("users"), // customer enrolling
    enrollmentDate: v.string(), // when they signed up
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show")),
    approvedBy: v.optional(v.id("users")), // staff member who approved
    paymentStatus: v.union(v.literal("pending"), v.literal("paid"), v.literal("refunded")),
    notes: v.optional(v.string()),
  })
  .index("by_courseId", ["courseId"])
  .index("by_studentId", ["studentId"])
  .index("by_status", ["status"])
  .index("by_approvedBy", ["approvedBy"]),

  // Suggestions: User feedback and improvement suggestions
  suggestions: defineTable({
    createdBy: v.id("users"), // user who made the suggestion
    location: v.string(), // URL where suggestion was made
    pageContext: v.string(), // description of what user was seeing
    problem: v.string(), // what is wrong / problem description
    solution: v.string(), // suggested solution
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("implemented"), v.literal("rejected")),
    // For grouping similar suggestions
    similarityHash: v.optional(v.string()), // hash for detecting similar content
    relatedSuggestions: v.optional(v.array(v.id("suggestions"))), // array of related suggestion IDs
    // Admin/developer fields
    reviewedBy: v.optional(v.id("users")), // developer who reviewed
    reviewNotes: v.optional(v.string()), // internal notes from review
    implementationDate: v.optional(v.string()), // when implemented (if applicable)
  })
  .index("by_createdBy", ["createdBy"])
  .index("by_status", ["status"])
  .index("by_location", ["location"])
  .index("by_similarityHash", ["similarityHash"])
  .index("by_reviewedBy", ["reviewedBy"]),
});
