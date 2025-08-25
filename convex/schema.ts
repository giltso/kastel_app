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
    startTime: v.number(),
    endTime: v.number(),
    type: v.union(v.literal("work"), v.literal("meeting"), v.literal("maintenance"), v.literal("team")),
    status: v.union(v.literal("pending_approval"), v.literal("approved"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
    createdBy: v.id("users"), // Worker who created
    approvedBy: v.optional(v.id("users")), // Manager who approved
    assignedTo: v.optional(v.id("users")),
  })
  .index("by_createdBy", ["createdBy"])
  .index("by_approvedBy", ["approvedBy"])
  .index("by_assignedTo", ["assignedTo"])
  .index("by_startTime", ["startTime"])
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
});
