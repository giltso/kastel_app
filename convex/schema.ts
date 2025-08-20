import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema defines your data model for the database.
// For more information, see https://docs.convex.dev/database/schema
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("manager"), v.literal("employee"))),
  }).index("by_clerkId", ["clerkId"]),

  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    type: v.union(v.literal("work"), v.literal("meeting"), v.literal("maintenance")),
    assignedTo: v.optional(v.id("users")),
    createdBy: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
  })
  .index("by_createdBy", ["createdBy"])
  .index("by_assignedTo", ["assignedTo"])
  .index("by_startTime", ["startTime"]),

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
