import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Helper function to validate manager permissions
async function validateManagerPermissions(ctx: any, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError("User not found");
  }

  const isStaff = user.emulatingIsStaff ?? user.isStaff ?? false;
  const hasWorkerTag = user.emulatingWorkerTag ?? user.workerTag ?? false;
  const hasManagerTag = user.emulatingManagerTag ?? user.managerTag ?? false;

  if (!isStaff || !hasWorkerTag || !hasManagerTag) {
    throw new ConvexError("Only managers can perform this action");
  }

  return user;
}

// Helper function to validate worker permissions
async function validateWorkerPermissions(ctx: any, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError("User not found");
  }

  const isStaff = user.emulatingIsStaff ?? user.isStaff ?? false;
  const hasWorkerTag = user.emulatingWorkerTag ?? user.workerTag ?? false;

  if (!isStaff || !hasWorkerTag) {
    throw new ConvexError("Only workers can perform this action");
  }

  return user;
}

// Query: Get assignments for a specific date (excludes rejected assignments)
export const getAssignmentsForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const assignments = await ctx.db
      .query("shift_assignments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) => q.neq(q.field("status"), "rejected"))
      .collect();

    // Enrich with user and shift data
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const worker = await ctx.db.get(assignment.workerId);
        const shift = await ctx.db.get(assignment.shiftTemplateId);
        const assignedBy = await ctx.db.get(assignment.assignedBy);

        return {
          ...assignment,
          worker: worker ? { _id: worker._id, name: worker.name } : null,
          shift: shift ? { _id: shift._id, name: shift.name, type: shift.type } : null,
          assignedBy: assignedBy ? { _id: assignedBy._id, name: assignedBy.name } : null,
        };
      })
    );

    return enrichedAssignments;
  },
});

// Query: Get assignments for a worker
export const getAssignmentsForWorker = query({
  args: {
    workerId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    let assignments = await ctx.db
      .query("shift_assignments")
      .withIndex("by_workerId", (q) => q.eq("workerId", args.workerId))
      .filter((q) => q.neq(q.field("status"), "rejected"))
      .collect();

    // Filter by date range if provided
    if (args.startDate || args.endDate) {
      assignments = assignments.filter(assignment => {
        if (args.startDate && assignment.date < args.startDate) return false;
        if (args.endDate && assignment.date > args.endDate) return false;
        return true;
      });
    }

    // Enrich with shift data
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const shift = await ctx.db.get(assignment.shiftTemplateId);
        const assignedBy = await ctx.db.get(assignment.assignedBy);

        return {
          ...assignment,
          shift: shift ? { _id: shift._id, name: shift.name, type: shift.type } : null,
          assignedBy: assignedBy ? { _id: assignedBy._id, name: assignedBy.name } : null,
        };
      })
    );

    return enrichedAssignments;
  },
});

// Query: Get pending assignments requiring approval
export const getPendingAssignments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const isStaff = user.emulatingIsStaff ?? user.isStaff ?? false;
    const hasWorkerTag = user.emulatingWorkerTag ?? user.workerTag ?? false;
    const hasManagerTag = user.emulatingManagerTag ?? user.managerTag ?? false;

    let assignments;

    if (isStaff && hasWorkerTag && hasManagerTag) {
      // Manager sees all pending assignments
      assignments = await ctx.db
        .query("shift_assignments")
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "pending_worker_approval"),
            q.eq(q.field("status"), "pending_manager_approval")
          )
        )
        .collect();
    } else if (isStaff && hasWorkerTag) {
      // Worker sees only assignments pending their approval
      assignments = await ctx.db
        .query("shift_assignments")
        .withIndex("by_workerId", (q) => q.eq("workerId", user._id))
        .filter((q) => q.eq(q.field("status"), "pending_worker_approval"))
        .collect();
    } else {
      return [];
    }

    // Enrich with related data
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const worker = await ctx.db.get(assignment.workerId);
        const shift = await ctx.db.get(assignment.shiftTemplateId);
        const assignedBy = await ctx.db.get(assignment.assignedBy);

        return {
          ...assignment,
          worker: worker ? { _id: worker._id, name: worker.name } : null,
          shift: shift ? { _id: shift._id, name: shift.name, type: shift.type } : null,
          assignedBy: assignedBy ? { _id: assignedBy._id, name: assignedBy.name } : null,
        };
      })
    );

    return enrichedAssignments;
  },
});

// Mutation: Manager assigns worker to shift
export const assignWorkerToShift = mutation({
  args: {
    shiftTemplateId: v.id("shifts"),
    workerId: v.id("users"),
    date: v.string(),
    assignedHours: v.array(v.object({
      startTime: v.string(),
      endTime: v.string(),
    })),
    breakPeriods: v.optional(v.array(v.object({
      startTime: v.string(),
      endTime: v.string(),
      isPaid: v.boolean(),
    }))),
    assignmentNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Validate manager permissions
    await validateManagerPermissions(ctx, user._id);

    // Validate the worker exists and has worker permissions
    await validateWorkerPermissions(ctx, args.workerId);

    // Validate shift template exists
    const shift = await ctx.db.get(args.shiftTemplateId);
    if (!shift || !shift.isActive) {
      throw new ConvexError("Shift template not found or inactive");
    }

    // Check for existing assignment
    const existingAssignment = await ctx.db
      .query("shift_assignments")
      .withIndex("by_workerId", (q) => q.eq("workerId", args.workerId))
      .filter((q) =>
        q.and(
          q.eq(q.field("shiftTemplateId"), args.shiftTemplateId),
          q.eq(q.field("date"), args.date)
        )
      )
      .unique();

    if (existingAssignment) {
      throw new ConvexError("Worker already has an assignment for this shift on this date");
    }

    // Validate hours are within shift bounds
    for (const hourRange of args.assignedHours) {
      if (hourRange.startTime >= hourRange.endTime) {
        throw new ConvexError("Invalid hour range: start time must be before end time");
      }
    }

    // Check if manager is assigning themselves (auto-approval case)
    const isManagerSelfAssignment = user._id === args.workerId;
    const now = Date.now();

    // Create assignment with appropriate status
    return await ctx.db.insert("shift_assignments", {
      shiftTemplateId: args.shiftTemplateId,
      workerId: args.workerId,
      date: args.date,
      assignedHours: args.assignedHours,
      breakPeriods: args.breakPeriods,
      assignedBy: user._id,
      assignedAt: now,
      status: isManagerSelfAssignment ? "confirmed" : "pending_worker_approval",
      managerApprovedAt: now, // Manager already approved by assigning
      workerApprovedAt: isManagerSelfAssignment ? now : undefined, // Auto-approve if self-assignment
      assignmentNotes: args.assignmentNotes,
    });
  },
});

// Mutation: Worker approves assignment
export const approveAssignment = mutation({
  args: { assignmentId: v.id("shift_assignments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new ConvexError("Assignment not found");
    }

    // Check if user is the assigned worker or a manager
    const isStaff = user.emulatingIsStaff ?? user.isStaff ?? false;
    const hasWorkerTag = user.emulatingWorkerTag ?? user.workerTag ?? false;
    const hasManagerTag = user.emulatingManagerTag ?? user.managerTag ?? false;
    const isAssignedWorker = assignment.workerId === user._id;
    const isManager = isStaff && hasWorkerTag && hasManagerTag;

    if (!isAssignedWorker && !isManager) {
      throw new ConvexError("Only the assigned worker or a manager can approve this assignment");
    }

    // Update based on current status and who is approving
    let updates: Partial<Doc<"shift_assignments">> = {};

    if (assignment.status === "pending_worker_approval" && isAssignedWorker) {
      updates.status = "confirmed";
      updates.workerApprovedAt = Date.now();
    } else if (assignment.status === "pending_manager_approval" && isManager) {
      updates.status = "confirmed";
      updates.managerApprovedAt = Date.now();
    } else {
      throw new ConvexError("Assignment is not pending your approval");
    }

    await ctx.db.patch(args.assignmentId, updates);
    return args.assignmentId;
  },
});

// Mutation: Reject assignment
export const rejectAssignment = mutation({
  args: {
    assignmentId: v.id("shift_assignments"),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new ConvexError("Assignment not found");
    }

    // Check if user is the assigned worker or a manager
    const isStaff = user.emulatingIsStaff ?? user.isStaff ?? false;
    const hasWorkerTag = user.emulatingWorkerTag ?? user.workerTag ?? false;
    const hasManagerTag = user.emulatingManagerTag ?? user.managerTag ?? false;
    const isAssignedWorker = assignment.workerId === user._id;
    const isManager = isStaff && hasWorkerTag && hasManagerTag;

    if (!isAssignedWorker && !isManager) {
      throw new ConvexError("Only the assigned worker or a manager can reject this assignment");
    }

    // Only pending assignments can be rejected
    if (!assignment.status.includes("pending")) {
      throw new ConvexError("Only pending assignments can be rejected");
    }

    await ctx.db.patch(args.assignmentId, {
      status: "rejected",
      assignmentNotes: args.reason ? `${assignment.assignmentNotes || ''}\nRejected: ${args.reason}` : assignment.assignmentNotes,
    });

    return args.assignmentId;
  },
});

// Mutation: Complete assignment (for future time tracking)
export const completeAssignment = mutation({
  args: { assignmentId: v.id("shift_assignments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Validate manager permissions
    await validateManagerPermissions(ctx, user._id);

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new ConvexError("Assignment not found");
    }

    if (assignment.status !== "confirmed") {
      throw new ConvexError("Only confirmed assignments can be completed");
    }

    await ctx.db.patch(args.assignmentId, {
      status: "completed",
    });

    return args.assignmentId;
  },
});

// Mutation: Worker requests to join shift (self-initiated)
export const requestJoinShift = mutation({
  args: {
    shiftTemplateId: v.id("shifts"),
    date: v.string(),
    requestedHours: v.optional(v.array(v.object({
      startTime: v.string(),
      endTime: v.string(),
    }))),
    requestNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Validate worker permissions (worker can request for themselves)
    await validateWorkerPermissions(ctx, user._id);

    // Validate shift template exists
    const shift = await ctx.db.get(args.shiftTemplateId);
    if (!shift || !shift.isActive) {
      throw new ConvexError("Shift template not found or inactive");
    }

    // Check for existing assignment
    const existingAssignment = await ctx.db
      .query("shift_assignments")
      .withIndex("by_workerId", (q) => q.eq("workerId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("shiftTemplateId"), args.shiftTemplateId),
          q.eq(q.field("date"), args.date)
        )
      )
      .unique();

    if (existingAssignment) {
      throw new ConvexError("You already have an assignment for this shift on this date");
    }

    // Use requested hours or default to full shift
    const assignedHours = args.requestedHours && args.requestedHours.length > 0
      ? args.requestedHours
      : [{
          startTime: shift.storeHours.openTime,
          endTime: shift.storeHours.closeTime
        }];

    // Validate hours are within shift bounds and valid
    for (const hourRange of assignedHours) {
      if (hourRange.startTime >= hourRange.endTime) {
        throw new ConvexError("Invalid hour range: start time must be before end time");
      }

      // Check if requested hours are within shift bounds
      if (hourRange.startTime < shift.storeHours.openTime ||
          hourRange.endTime > shift.storeHours.closeTime) {
        throw new ConvexError("Requested hours must be within shift operating hours");
      }
    }

    // Check if requesting user is a manager (auto-approval case)
    const isStaff = user.emulatingIsStaff ?? user.isStaff ?? false;
    const hasWorkerTag = user.emulatingWorkerTag ?? user.workerTag ?? false;
    const hasManagerTag = user.emulatingManagerTag ?? user.managerTag ?? false;
    const isManagerRequest = isStaff && hasWorkerTag && hasManagerTag;
    const now = Date.now();

    // Create assignment with appropriate status
    return await ctx.db.insert("shift_assignments", {
      shiftTemplateId: args.shiftTemplateId,
      workerId: user._id,
      date: args.date,
      assignedHours: assignedHours,
      assignedBy: user._id, // Worker assigned themselves
      assignedAt: now,
      status: isManagerRequest ? "confirmed" : "pending_manager_approval",
      managerApprovedAt: isManagerRequest ? now : undefined, // Auto-approve if manager request
      workerApprovedAt: now, // Worker already approved by requesting
      assignmentNotes: args.requestNotes,
    });
  },
});

// Mutation: Edit existing assignment (creates new assignment with edited details)
export const editAssignment = mutation({
  args: {
    originalAssignmentId: v.id("shift_assignments"),
    requestedHours: v.optional(v.array(v.object({
      startTime: v.string(),
      endTime: v.string(),
    }))),
    requestNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get the original assignment
    const originalAssignment = await ctx.db.get(args.originalAssignmentId);
    if (!originalAssignment) {
      throw new ConvexError("Original assignment not found");
    }

    // Get the shift template
    const shift = await ctx.db.get(originalAssignment.shiftTemplateId);
    if (!shift || !shift.isActive) {
      throw new ConvexError("Shift template not found or inactive");
    }

    // Check permissions - user can edit their own assignment or manager can edit any
    const isStaff = user.emulatingIsStaff ?? user.isStaff ?? false;
    const hasWorkerTag = user.emulatingWorkerTag ?? user.workerTag ?? false;
    const hasManagerTag = user.emulatingManagerTag ?? user.managerTag ?? false;

    const isOwnAssignment = originalAssignment.workerId === user._id;
    const isManager = isStaff && hasWorkerTag && hasManagerTag;

    if (!isOwnAssignment && !isManager) {
      throw new ConvexError("You can only edit your own assignments or need manager permissions");
    }

    // Use requested hours or keep original hours if none provided
    const assignedHours = args.requestedHours && args.requestedHours.length > 0
      ? args.requestedHours
      : originalAssignment.assignedHours;

    // Validate hours are within shift bounds and valid
    for (const hourRange of assignedHours) {
      if (hourRange.startTime >= hourRange.endTime) {
        throw new ConvexError("Invalid hour range: start time must be before end time");
      }

      // Check if requested hours are within shift bounds
      if (hourRange.startTime < shift.storeHours.openTime ||
          hourRange.endTime > shift.storeHours.closeTime) {
        throw new ConvexError("Requested hours must be within shift operating hours");
      }
    }

    const now = Date.now();

    // Determine approval workflow based on who is editing
    let status: "pending_worker_approval" | "pending_manager_approval" | "confirmed" | "rejected" | "completed";
    let managerApprovedAt: number | undefined;
    let workerApprovedAt: number | undefined;

    if (isManager && isOwnAssignment) {
      // Manager editing their own assignment - auto-approve
      status = "confirmed";
      managerApprovedAt = now;
      workerApprovedAt = now;
    } else if (isManager && !isOwnAssignment) {
      // Manager editing someone else's assignment - needs worker approval
      status = "pending_worker_approval";
      managerApprovedAt = now;
      workerApprovedAt = undefined;
    } else if (isOwnAssignment) {
      // Worker editing their own assignment - needs manager approval
      status = "pending_manager_approval";
      managerApprovedAt = undefined;
      workerApprovedAt = now;
    } else {
      // This case shouldn't happen due to permission check above
      throw new ConvexError("Invalid edit permissions");
    }

    // Create new assignment with edited details
    const newAssignmentId = await ctx.db.insert("shift_assignments", {
      shiftTemplateId: originalAssignment.shiftTemplateId,
      workerId: originalAssignment.workerId,
      date: originalAssignment.date,
      assignedHours: assignedHours,
      breakPeriods: originalAssignment.breakPeriods, // Keep original break periods
      assignedBy: user._id, // Person who made the edit
      assignedAt: now,
      status: status,
      managerApprovedAt: managerApprovedAt,
      workerApprovedAt: workerApprovedAt,
      assignmentNotes: args.requestNotes || `Edited from original assignment: ${originalAssignment.assignmentNotes || ''}`,
    });

    // Mark original assignment as replaced (we'll use rejected status to hide it)
    await ctx.db.patch(args.originalAssignmentId, {
      status: "rejected",
      assignmentNotes: `${originalAssignment.assignmentNotes || ''}\nReplaced by edit request: ${newAssignmentId}`
    });

    return newAssignmentId;
  },
});