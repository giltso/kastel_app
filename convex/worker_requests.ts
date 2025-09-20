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

// Query: Get requests for review (managers)
export const getRequestsForReview = query({
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

    // Only managers can see requests for review
    await validateManagerPermissions(ctx, user._id);

    const requests = await ctx.db
      .query("worker_hour_requests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Enrich with worker and shift data
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const worker = await ctx.db.get(request.workerId);
        const shift = await ctx.db.get(request.shiftTemplateId);

        // If switch request, get target worker info
        let targetWorker = null;
        if (request.requestType === "switch_request" && request.switchDetails) {
          targetWorker = await ctx.db.get(request.switchDetails.targetWorkerId);
        }

        return {
          ...request,
          worker: worker ? { _id: worker._id, name: worker.name } : null,
          shift: shift ? { _id: shift._id, name: shift.name, type: shift.type } : null,
          targetWorker: targetWorker ? { _id: targetWorker._id, name: targetWorker.name } : null,
        };
      })
    );

    return enrichedRequests;
  },
});

// Query: Get worker's own requests
export const getMyRequests = query({
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

    // Validate worker permissions
    await validateWorkerPermissions(ctx, user._id);

    const requests = await ctx.db
      .query("worker_hour_requests")
      .withIndex("by_workerId", (q) => q.eq("workerId", user._id))
      .collect();

    // Enrich with shift data
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const shift = await ctx.db.get(request.shiftTemplateId);
        let reviewedBy = null;
        if (request.reviewedBy) {
          reviewedBy = await ctx.db.get(request.reviewedBy);
        }

        return {
          ...request,
          shift: shift ? { _id: shift._id, name: shift.name, type: shift.type } : null,
          reviewedBy: reviewedBy ? { _id: reviewedBy._id, name: reviewedBy.name } : null,
        };
      })
    );

    return enrichedRequests;
  },
});

// Query: Get switch requests for a specific worker
export const getSwitchRequestsForWorker = query({
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

    // Validate worker permissions
    await validateWorkerPermissions(ctx, user._id);

    // Find requests where this worker is the target for a switch
    const allRequests = await ctx.db.query("worker_hour_requests").collect();

    const switchRequestsForThisWorker = allRequests.filter(request =>
      request.requestType === "switch_request" &&
      request.switchDetails &&
      request.switchDetails.targetWorkerId === user._id &&
      request.status === "pending"
    );

    // Enrich with requester and shift data
    const enrichedRequests = await Promise.all(
      switchRequestsForThisWorker.map(async (request) => {
        const requester = await ctx.db.get(request.workerId);
        const shift = await ctx.db.get(request.shiftTemplateId);

        return {
          ...request,
          requester: requester ? { _id: requester._id, name: requester.name } : null,
          shift: shift ? { _id: shift._id, name: shift.name, type: shift.type } : null,
        };
      })
    );

    return enrichedRequests;
  },
});

// Mutation: Worker requests to join shift
export const requestJoinShift = mutation({
  args: {
    shiftTemplateId: v.id("shifts"),
    date: v.string(),
    requestedHours: v.object({
      startTime: v.string(),
      endTime: v.string(),
    }),
    reason: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("urgent"))),
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

    // Validate worker permissions
    await validateWorkerPermissions(ctx, user._id);

    // Validate shift template exists
    const shift = await ctx.db.get(args.shiftTemplateId);
    if (!shift || !shift.isActive) {
      throw new ConvexError("Shift template not found or inactive");
    }

    // Check if worker already has an assignment for this shift/date
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

    // Check if worker already has a pending request for this shift/date
    const existingRequest = await ctx.db
      .query("worker_hour_requests")
      .withIndex("by_workerId", (q) => q.eq("workerId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("shiftTemplateId"), args.shiftTemplateId),
          q.eq(q.field("date"), args.date),
          q.eq(q.field("status"), "pending")
        )
      )
      .unique();

    if (existingRequest) {
      throw new ConvexError("You already have a pending request for this shift on this date");
    }

    // Validate requested hours
    if (args.requestedHours.startTime >= args.requestedHours.endTime) {
      throw new ConvexError("Invalid hour range: start time must be before end time");
    }

    return await ctx.db.insert("worker_hour_requests", {
      workerId: user._id,
      shiftTemplateId: args.shiftTemplateId,
      date: args.date,
      requestType: "join_shift",
      requestedHours: args.requestedHours,
      reason: args.reason,
      priority: args.priority || "normal",
      status: "pending",
    });
  },
});

// Mutation: Manager approves/denies request
export const reviewRequest = mutation({
  args: {
    requestId: v.id("worker_hour_requests"),
    decision: v.union(v.literal("approved"), v.literal("denied")),
    reviewNotes: v.optional(v.string()),
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

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Request not found");
    }

    if (request.status !== "pending") {
      throw new ConvexError("Request has already been reviewed");
    }

    let createdAssignmentId = undefined;

    // If approved and it's a join_shift request, create assignment
    if (args.decision === "approved" && request.requestType === "join_shift" && request.requestedHours) {
      // Check if worker already has assignment (race condition protection)
      const existingAssignment = await ctx.db
        .query("shift_assignments")
        .withIndex("by_workerId", (q) => q.eq("workerId", request.workerId))
        .filter((q) =>
          q.and(
            q.eq(q.field("shiftTemplateId"), request.shiftTemplateId),
            q.eq(q.field("date"), request.date)
          )
        )
        .unique();

      if (!existingAssignment) {
        createdAssignmentId = await ctx.db.insert("shift_assignments", {
          shiftTemplateId: request.shiftTemplateId,
          workerId: request.workerId,
          date: request.date,
          assignedHours: [request.requestedHours],
          assignedBy: user._id,
          assignedAt: Date.now(),
          status: "confirmed", // Worker already "approved" by requesting
          workerApprovedAt: Date.now(),
          managerApprovedAt: Date.now(),
          assignmentNotes: `Approved join request: ${request.reason || 'No reason provided'}`,
        });
      }
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: args.decision,
      reviewedBy: user._id,
      reviewedAt: Date.now(),
      reviewNotes: args.reviewNotes,
      createdAssignmentId,
    });

    return args.requestId;
  },
});

// Mutation: Worker responds to switch request
export const respondToSwitchRequest = mutation({
  args: {
    requestId: v.id("worker_hour_requests"),
    response: v.union(v.literal("approved"), v.literal("denied")),
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

    // Validate worker permissions
    await validateWorkerPermissions(ctx, user._id);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Request not found");
    }

    if (request.requestType !== "switch_request" || !request.switchDetails) {
      throw new ConvexError("This is not a switch request");
    }

    if (request.switchDetails.targetWorkerId !== user._id) {
      throw new ConvexError("You are not the target of this switch request");
    }

    if (request.status !== "pending") {
      throw new ConvexError("This request has already been processed");
    }

    if (request.switchDetails.targetWorkerResponse !== undefined) {
      throw new ConvexError("You have already responded to this request");
    }

    // Update the switch details
    const updatedSwitchDetails = {
      ...request.switchDetails,
      targetWorkerResponse: args.response,
    };

    // Update request status
    if (args.response === "denied") {
      // If target worker denies, request is finished
      await ctx.db.patch(args.requestId, {
        switchDetails: updatedSwitchDetails,
        status: "denied",
      });
    } else {
      // If approved, request stays pending for manager review
      await ctx.db.patch(args.requestId, {
        switchDetails: updatedSwitchDetails,
      });
    }

    return args.requestId;
  },
});

// Mutation: Cancel request (worker can cancel their own pending requests)
export const cancelRequest = mutation({
  args: { requestId: v.id("worker_hour_requests") },
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

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Request not found");
    }

    // Only the requester can cancel their own request
    if (request.workerId !== user._id) {
      throw new ConvexError("You can only cancel your own requests");
    }

    if (request.status !== "pending") {
      throw new ConvexError("Only pending requests can be cancelled");
    }

    await ctx.db.patch(args.requestId, {
      status: "cancelled",
    });

    return args.requestId;
  },
});