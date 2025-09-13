import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Shift Status calculation helper
export function calculateShiftStatus(currentWorkers: number, requiredWorkers: number, maxWorkers?: number): 
  "bad" | "close" | "good" | "warning" {
  const max = maxWorkers || requiredWorkers + 2;
  
  if (currentWorkers <= requiredWorkers - 2) return "bad"; // 2 or more below target
  if (currentWorkers === requiredWorkers - 1) return "close"; // 1 below target
  if (currentWorkers === requiredWorkers) return "good"; // Perfect
  if (currentWorkers > requiredWorkers && currentWorkers <= max) return "warning"; // Overpopulated but within limits
  return "warning"; // Over max
}

// Create a new shift (managers only) - supports both recurring and non-recurring
export const createShift = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    // NEW: Support for recurring vs non-recurring
    isRecurring: v.boolean(),
    recurringDays: v.optional(v.array(v.union(
      v.literal("monday"), v.literal("tuesday"), v.literal("wednesday"),
      v.literal("thursday"), v.literal("friday"), v.literal("saturday"), v.literal("sunday")
    ))),
    specificDate: v.optional(v.string()), // For non-recurring shifts
    requiredWorkers: v.number(),
    maxWorkers: v.optional(v.number()),
    color: v.optional(v.string()),
    type: v.optional(v.union(v.literal("operational"), v.literal("maintenance"), v.literal("educational"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new ConvexError("User not found");

    // Check permissions - only managers can create shifts
    const effectiveRole = user.emulatingRole || user.role;
    if (effectiveRole !== "manager" && effectiveRole !== "dev") {
      throw new ConvexError("Only managers can create shifts");
    }

    // Validation: recurring shifts must have recurringDays
    if (args.isRecurring && (!args.recurringDays || args.recurringDays.length === 0)) {
      throw new ConvexError("Recurring shifts must have at least one recurring day");
    }

    // Validation: non-recurring shifts must have specificDate
    if (!args.isRecurring && !args.specificDate) {
      throw new ConvexError("Non-recurring shifts must have a specific date");
    }

    return await ctx.db.insert("shifts", {
      name: args.name,
      description: args.description,
      type: args.type,
      startTime: args.startTime,
      endTime: args.endTime,
      isRecurring: args.isRecurring,
      recurringDays: args.recurringDays,
      specificDate: args.specificDate,
      requiredWorkers: args.requiredWorkers,
      maxWorkers: args.maxWorkers,
      color: args.color,
      isActive: true,
      createdBy: user._id,
    });
  },
});

// Edit a shift instance (creates non-recurring copy with inherited data)
export const editShiftInstance = mutation({
  args: {
    parentShiftId: v.id("shifts"),
    specificDate: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    requiredWorkers: v.optional(v.number()),
    maxWorkers: v.optional(v.number()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new ConvexError("User not found");

    // Check permissions - only managers can edit shifts
    const effectiveRole = user.emulatingRole || user.role;
    if (effectiveRole !== "manager" && effectiveRole !== "dev") {
      throw new ConvexError("Only managers can edit shifts");
    }

    // Get the parent shift
    const parentShift = await ctx.db.get(args.parentShiftId);
    if (!parentShift) throw new ConvexError("Parent shift not found");

    // Check if an edited instance already exists for this date
    const existingInstance = await ctx.db
      .query("shifts")
      .withIndex("by_parentShiftId", (q) => q.eq("parentShiftId", args.parentShiftId))
      .filter((q) => q.eq(q.field("specificDate"), args.specificDate))
      .unique();

    if (existingInstance) {
      throw new ConvexError("An edited instance already exists for this date");
    }

    // Create unique instance tag
    const instanceTag = `${parentShift.name}_${args.specificDate}_${Date.now()}`;

    // Create new shift with inherited and overridden data
    const newShiftId = await ctx.db.insert("shifts", {
      name: args.name ?? parentShift.name,
      description: args.description ?? parentShift.description,
      type: parentShift.type,
      startTime: args.startTime ?? parentShift.startTime,
      endTime: args.endTime ?? parentShift.endTime,
      isRecurring: false, // Always non-recurring for edited instances
      recurringDays: undefined,
      specificDate: args.specificDate,
      parentShiftId: args.parentShiftId,
      instanceTag,
      requiredWorkers: args.requiredWorkers ?? parentShift.requiredWorkers,
      maxWorkers: args.maxWorkers ?? parentShift.maxWorkers,
      color: args.color ?? parentShift.color,
      isActive: true,
      createdBy: user._id,
    });

    // Copy existing assignments from parent shift for this date
    const existingAssignments = await ctx.db
      .query("shift_assignments")
      .withIndex("by_shift_date", (q) => q.eq("shiftId", args.parentShiftId).eq("date", args.specificDate))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    // Create new assignments for the edited instance
    for (const assignment of existingAssignments) {
      await ctx.db.insert("shift_assignments", {
        shiftId: newShiftId,
        workerId: assignment.workerId,
        date: args.specificDate,
        assignmentType: "manager_assigned", // Manager edited, so this is manager-assigned
        assignedBy: user._id,
        status: assignment.status,
        notes: `Copied from parent shift: ${assignment.notes || ""}`.trim(),
      });
    }

    return newShiftId;
  },
});

// List all active shifts
export const listShifts = query({
  args: {},
  handler: async (ctx) => {
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Add assignment counts and status for each shift
    const today = new Date().toISOString().split('T')[0];

    const shiftsWithStatus = await Promise.all(
      shifts.map(async (shift) => {
        const assignments = await ctx.db
          .query("shift_assignments")
          .withIndex("by_shift_date", (q) => q.eq("shiftId", shift._id).eq("date", today))
          .filter((q) => q.neq(q.field("status"), "cancelled"))
          .collect();

        const currentWorkers = assignments.length;
        const status = calculateShiftStatus(currentWorkers, shift.requiredWorkers, shift.maxWorkers);

        return {
          ...shift,
          currentWorkers,
          status,
          spotsAvailable: Math.max(0, shift.requiredWorkers - currentWorkers),
          isOverpopulated: currentWorkers > shift.requiredWorkers,
        };
      })
    );

    return shiftsWithStatus;
  },
});

// Get shifts for a specific date (handles recurring vs non-recurring logic)
export const getShiftsForDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Get all active shifts
    const allShifts = await ctx.db
      .query("shifts")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Separate recurring and non-recurring shifts
    const recurringShifts = allShifts.filter(shift => shift.isRecurring && shift.recurringDays?.includes(dayOfWeek as any));
    const nonRecurringShifts = allShifts.filter(shift => !shift.isRecurring && shift.specificDate === date);

    // Find edited instances that override recurring shifts for this date
    const editedInstances = nonRecurringShifts.filter(shift => shift.parentShiftId);
    const editedParentIds = new Set(editedInstances.map(shift => shift.parentShiftId));

    // Filter out recurring shifts that have been overridden
    const activeRecurringShifts = recurringShifts.filter(shift => !editedParentIds.has(shift._id));

    // Combine active recurring shifts with all non-recurring shifts for this date
    const relevantShifts = [...activeRecurringShifts, ...nonRecurringShifts];

    // Add assignment counts and status for each shift
    const shiftsWithStatus = await Promise.all(
      relevantShifts.map(async (shift) => {
        const assignments = await ctx.db
          .query("shift_assignments")
          .withIndex("by_shift_date", (q) => q.eq("shiftId", shift._id).eq("date", date))
          .filter((q) => q.neq(q.field("status"), "cancelled"))
          .collect();

        const currentWorkers = assignments.length;
        const status = calculateShiftStatus(currentWorkers, shift.requiredWorkers, shift.maxWorkers);

        return {
          ...shift,
          currentWorkers,
          status,
          spotsAvailable: Math.max(0, shift.requiredWorkers - currentWorkers),
          isOverpopulated: currentWorkers > shift.requiredWorkers,
          isEditedInstance: !!shift.parentShiftId,
        };
      })
    );

    return shiftsWithStatus;
  },
});

// Get shift assignments for a specific date
export const getShiftAssignments = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const assignments = await ctx.db
      .query("shift_assignments")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();

    // Get shift and worker details
    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const shift = await ctx.db.get(assignment.shiftId);
        const worker = await ctx.db.get(assignment.workerId);
        const assignedBy = await ctx.db.get(assignment.assignedBy);

        return {
          ...assignment,
          shift,
          worker,
          assignedBy,
        };
      })
    );

    return assignmentsWithDetails;
  },
});

// Assign a worker to a shift (managers or self-assignment)
export const assignWorkerToShift = mutation({
  args: {
    shiftId: v.id("shifts"),
    workerId: v.id("users"),
    date: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new ConvexError("User not found");

    const shift = await ctx.db.get(args.shiftId);
    if (!shift) throw new ConvexError("Shift not found");

    const targetWorker = await ctx.db.get(args.workerId);
    if (!targetWorker) throw new ConvexError("Worker not found");

    // Check if worker is eligible (must be worker role or higher)
    const workerRole = targetWorker.emulatingRole || targetWorker.role;
    if (!["worker", "manager", "dev"].includes(workerRole || "")) {
      throw new ConvexError("Only workers can be assigned to shifts");
    }

    // Determine assignment type
    const effectiveRole = currentUser.emulatingRole || currentUser.role;
    const isSelfAssignment = currentUser._id === args.workerId;
    const isManagerAssignment = ["manager", "dev"].includes(effectiveRole || "");

    if (!isSelfAssignment && !isManagerAssignment) {
      throw new ConvexError("You can only assign yourself or be a manager to assign others");
    }

    // Check if worker is already assigned to this shift on this date
    const existingAssignment = await ctx.db
      .query("shift_assignments")
      .withIndex("by_shift_date", (q) => q.eq("shiftId", args.shiftId).eq("date", args.date))
      .filter((q) => q.eq(q.field("workerId"), args.workerId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .unique();

    if (existingAssignment) {
      throw new ConvexError("Worker is already assigned to this shift on this date");
    }

    // Check capacity
    const currentAssignments = await ctx.db
      .query("shift_assignments")
      .withIndex("by_shift_date", (q) => q.eq("shiftId", args.shiftId).eq("date", args.date))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    const maxWorkers = shift.maxWorkers || shift.requiredWorkers + 2;
    if (currentAssignments.length >= maxWorkers) {
      throw new ConvexError("Shift is at maximum capacity");
    }

    return await ctx.db.insert("shift_assignments", {
      shiftId: args.shiftId,
      workerId: args.workerId,
      date: args.date,
      assignmentType: isSelfAssignment ? "self_signed" : "manager_assigned",
      assignedBy: currentUser._id,
      status: "assigned",
      notes: args.notes,
    });
  },
});

// Request a shift swap between workers
export const requestShiftSwap = mutation({
  args: {
    myAssignmentId: v.id("shift_assignments"),
    targetAssignmentId: v.id("shift_assignments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new ConvexError("User not found");

    const myAssignment = await ctx.db.get(args.myAssignmentId);
    const targetAssignment = await ctx.db.get(args.targetAssignmentId);

    if (!myAssignment || !targetAssignment) {
      throw new ConvexError("Assignment not found");
    }

    // Verify the current user owns the assignment they want to swap
    if (myAssignment.workerId !== currentUser._id) {
      throw new ConvexError("You can only swap your own shifts");
    }

    // Check if a swap request already exists
    const existingSwap = await ctx.db
      .query("shift_swaps")
      .withIndex("by_assignment1", (q) => q.eq("assignment1Id", args.myAssignmentId))
      .filter((q) => q.eq(q.field("assignment2Id"), args.targetAssignmentId))
      .filter((q) => q.neq(q.field("status"), "rejected"))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .unique();

    if (existingSwap) {
      throw new ConvexError("Swap request already exists for these assignments");
    }

    return await ctx.db.insert("shift_swaps", {
      assignment1Id: args.myAssignmentId,
      assignment2Id: args.targetAssignmentId,
      worker1Id: currentUser._id,
      worker2Id: targetAssignment.workerId,
      initiatedBy: currentUser._id,
      status: "pending",
      reason: args.reason,
      notificationSent: false,
    });
  },
});

// Respond to a shift swap request
export const respondToShiftSwap = mutation({
  args: {
    swapId: v.id("shift_swaps"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new ConvexError("User not found");

    const swap = await ctx.db.get(args.swapId);
    if (!swap) throw new ConvexError("Swap request not found");

    // Verify the current user is the target worker
    if (swap.worker2Id !== currentUser._id) {
      throw new ConvexError("You can only respond to swaps requested from you");
    }

    if (swap.status !== "pending") {
      throw new ConvexError("This swap request is no longer pending");
    }

    if (args.accept) {
      // Approve the swap - update both assignments
      const assignment1 = await ctx.db.get(swap.assignment1Id);
      const assignment2 = await ctx.db.get(swap.assignment2Id);

      if (!assignment1 || !assignment2) {
        throw new ConvexError("One or both assignments not found");
      }

      // Swap the worker IDs
      await ctx.db.patch(assignment1._id, { workerId: swap.worker2Id });
      await ctx.db.patch(assignment2._id, { workerId: swap.worker1Id });

      // Update swap status
      await ctx.db.patch(args.swapId, { status: "approved" });
    } else {
      // Reject the swap
      await ctx.db.patch(args.swapId, { status: "rejected" });
    }

    return args.accept ? "Swap approved" : "Swap rejected";
  },
});

// Get available shifts for swapping (for current user)
export const getAvailableShiftsForSwap = query({
  args: {
    myAssignmentId: v.id("shift_assignments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    const myAssignment = await ctx.db.get(args.myAssignmentId);
    if (!myAssignment) return [];

    // Verify the user owns this assignment
    if (myAssignment.workerId !== currentUser._id) return [];

    // Get all other assignments for the same date (potential swap targets)
    const otherAssignments = await ctx.db
      .query("shift_assignments")
      .withIndex("by_date", (q) => q.eq("date", myAssignment.date))
      .filter((q) => q.neq(q.field("_id"), args.myAssignmentId))
      .filter((q) => q.eq(q.field("status"), "assigned"))
      .collect();

    // Enrich with shift and worker data
    const enrichedAssignments = await Promise.all(
      otherAssignments.map(async (assignment) => {
        const shift = await ctx.db.get(assignment.shiftId);
        const worker = await ctx.db.get(assignment.workerId);
        
        return {
          ...assignment,
          shift,
          worker,
        };
      })
    );

    return enrichedAssignments;
  },
});

// Request golden time (pro workers only)
export const requestGoldenTime = mutation({
  args: {
    shiftAssignmentId: v.id("shift_assignments"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new ConvexError("User not found");

    // Check if user has pro tag
    if (!currentUser.proTag) {
      throw new ConvexError("Only pro workers can request golden time");
    }

    const assignment = await ctx.db.get(args.shiftAssignmentId);
    if (!assignment) throw new ConvexError("Assignment not found");

    // Verify the user owns this assignment
    if (assignment.workerId !== currentUser._id) {
      throw new ConvexError("You can only request golden time for your own shifts");
    }

    // Check if shift is overpopulated
    const shift = await ctx.db.get(assignment.shiftId);
    if (!shift) throw new ConvexError("Shift not found");

    const allAssignments = await ctx.db
      .query("shift_assignments")
      .withIndex("by_shift_date", (q) => q.eq("shiftId", shift._id).eq("date", assignment.date))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    const isOverpopulated = allAssignments.length > shift.requiredWorkers;

    return await ctx.db.insert("golden_time_requests", {
      shiftAssignmentId: args.shiftAssignmentId,
      requestedBy: currentUser._id,
      date: assignment.date,
      reason: args.reason,
      status: "pending",
      shiftOverpopulated: isOverpopulated,
    });
  },
});

// List pending swap requests for current user
export const getMySwapRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    // Get swaps where user is either initiator or target
    const swaps = await ctx.db
      .query("shift_swaps")
      .filter((q) => 
        q.or(
          q.eq(q.field("worker1Id"), currentUser._id),
          q.eq(q.field("worker2Id"), currentUser._id)
        )
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get assignment details for each swap
    const swapsWithDetails = await Promise.all(
      swaps.map(async (swap) => {
        const assignment1 = await ctx.db.get(swap.assignment1Id);
        const assignment2 = await ctx.db.get(swap.assignment2Id);
        const shift1 = assignment1 ? await ctx.db.get(assignment1.shiftId) : null;
        const shift2 = assignment2 ? await ctx.db.get(assignment2.shiftId) : null;
        const initiator = await ctx.db.get(swap.initiatedBy);

        return {
          ...swap,
          assignment1,
          assignment2,
          shift1,
          shift2,
          initiator,
          isMyRequest: swap.initiatedBy === currentUser._id,
        };
      })
    );

    return swapsWithDetails;
  },
});

// Unassign worker from shift (self or manager action)
export const unassignWorkerFromShift = mutation({
  args: {
    assignmentId: v.id("shift_assignments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new ConvexError("User not found");

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new ConvexError("Assignment not found");

    const effectiveRole = currentUser.emulatingRole || currentUser.role;
    const isSelfUnassignment = assignment.workerId === currentUser._id;
    const isManagerAction = ["manager", "dev"].includes(effectiveRole || "");

    if (!isSelfUnassignment && !isManagerAction) {
      throw new ConvexError("You can only unassign yourself or be a manager to unassign others");
    }

    // Update assignment status to cancelled instead of deleting
    await ctx.db.patch(args.assignmentId, {
      status: "cancelled",
    });

    return { success: true };
  },
});