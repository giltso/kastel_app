import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Test data creation and validation functions for V2 shift system

// Helper function to create demo users for testing
export const createDemoUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Create demo manager
    const managerId = await ctx.db.insert("users", {
      clerkId: "demo_manager_001",
      name: "Demo Manager Sarah",
      email: "sarah.manager@kastel.demo",
      isStaff: true,
      workerTag: true,
      managerTag: true,
    });

    // Create demo workers
    const worker1Id = await ctx.db.insert("users", {
      clerkId: "demo_worker_001",
      name: "Demo Worker Alice",
      email: "alice.worker@kastel.demo",
      isStaff: true,
      workerTag: true,
    });

    const worker2Id = await ctx.db.insert("users", {
      clerkId: "demo_worker_002",
      name: "Demo Worker Bob",
      email: "bob.worker@kastel.demo",
      isStaff: true,
      workerTag: true,
    });

    const worker3Id = await ctx.db.insert("users", {
      clerkId: "demo_worker_003",
      name: "Demo Worker Charlie",
      email: "charlie.worker@kastel.demo",
      isStaff: true,
      workerTag: true,
    });

    const worker4Id = await ctx.db.insert("users", {
      clerkId: "demo_worker_004",
      name: "Demo Worker Diana",
      email: "diana.worker@kastel.demo",
      isStaff: true,
      workerTag: true,
    });

    return {
      managerId,
      workers: [worker1Id, worker2Id, worker3Id, worker4Id],
      created: 5
    };
  },
});

// Create demo shift template (Monday: 3 workers 9AM-12PM, 4 workers 12PM-7PM)
export const createDemoShiftTemplate = mutation({
  args: { managerId: v.id("users") },
  handler: async (ctx, args) => {
    const shiftId = await ctx.db.insert("shifts", {
      name: "Monday Store Operations",
      description: "Regular Monday operations with morning and afternoon coverage",
      type: "operational",
      storeHours: {
        openTime: "09:00",
        closeTime: "19:00",
      },
      // 3 workers 9AM-12PM, 4 workers 12PM-7PM
      hourlyRequirements: [
        { hour: "09:00", minWorkers: 3, optimalWorkers: 3, notes: "Store opening procedures" },
        { hour: "10:00", minWorkers: 3, optimalWorkers: 3, notes: "Morning operations" },
        { hour: "11:00", minWorkers: 3, optimalWorkers: 3, notes: "Pre-lunch period" },
        { hour: "12:00", minWorkers: 4, optimalWorkers: 4, notes: "Lunch period coverage" },
        { hour: "13:00", minWorkers: 4, optimalWorkers: 4, notes: "Afternoon operations" },
        { hour: "14:00", minWorkers: 4, optimalWorkers: 4, notes: "Peak customer period" },
        { hour: "15:00", minWorkers: 4, optimalWorkers: 4, notes: "Afternoon rush" },
        { hour: "16:00", minWorkers: 4, optimalWorkers: 4, notes: "Evening preparation" },
        { hour: "17:00", minWorkers: 4, optimalWorkers: 4, notes: "Evening operations" },
        { hour: "18:00", minWorkers: 4, optimalWorkers: 4, notes: "Store closing preparation" },
      ],
      recurringDays: ["monday"],
      isActive: true,
      createdBy: args.managerId,
      lastModified: Date.now(),
      color: "#3B82F6", // Blue color
    });

    return shiftId;
  },
});

// Test Query: Get all demo data for validation
export const getDemoDataOverview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get demo users
    const allUsers = await ctx.db.query("users").collect();
    const demoUsers = allUsers.filter(user => user.email?.includes(".demo"));

    // Get demo shifts
    const allShifts = await ctx.db.query("shifts").collect();
    const demoShifts = allShifts.filter(shift => shift.name.includes("Demo"));

    // Get all shift assignments
    const assignments = await ctx.db.query("shift_assignments").collect();

    // Get all worker requests
    const requests = await ctx.db.query("worker_hour_requests").collect();

    return {
      users: demoUsers.map(u => ({ _id: u._id, name: u.name, isStaff: u.isStaff, workerTag: u.workerTag, managerTag: u.managerTag })),
      shifts: demoShifts.map(s => ({ _id: s._id, name: s.name, type: s.type, isActive: s.isActive })),
      assignments: assignments.length,
      requests: requests.length,
      summary: {
        totalUsers: demoUsers.length,
        managers: demoUsers.filter(u => u.managerTag).length,
        workers: demoUsers.filter(u => u.workerTag && !u.managerTag).length,
        activeShifts: demoShifts.filter(s => s.isActive).length,
        totalAssignments: assignments.length,
        totalRequests: requests.length,
      }
    };
  },
});

// Test Scenario 1: Manager creates shift assignment
export const testManagerAssignsWorker = mutation({
  args: {
    managerId: v.id("users"),
    workerId: v.id("users"),
    shiftId: v.id("shifts"),
    testDate: v.string(), // "2025-09-22" (next Monday)
  },
  handler: async (ctx, args) => {
    // Test manager assignment: Alice for 9AM-5PM
    const assignmentId = await ctx.db.insert("shift_assignments", {
      shiftTemplateId: args.shiftId,
      workerId: args.workerId,
      date: args.testDate,
      assignedHours: [{ startTime: "09:00", endTime: "17:00" }],
      assignedBy: args.managerId,
      assignedAt: Date.now(),
      status: "pending_worker_approval",
      managerApprovedAt: Date.now(),
      assignmentNotes: "Full day coverage - demo test assignment",
    });

    return { assignmentId, scenario: "Manager assigned worker, pending worker approval" };
  },
});

// Test Scenario 2: Worker approves assignment
export const testWorkerApprovesAssignment = mutation({
  args: { assignmentId: v.id("shift_assignments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assignmentId, {
      status: "confirmed",
      workerApprovedAt: Date.now(),
    });

    return { assignmentId: args.assignmentId, scenario: "Worker approved assignment - now confirmed" };
  },
});

// Test Scenario 3: Worker requests to join shift
export const testWorkerRequestsJoinShift = mutation({
  args: {
    workerId: v.id("users"),
    shiftId: v.id("shifts"),
    testDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Bob requests to join for afternoon coverage
    const requestId = await ctx.db.insert("worker_hour_requests", {
      workerId: args.workerId,
      shiftTemplateId: args.shiftId,
      date: args.testDate,
      requestType: "join_shift",
      requestedHours: { startTime: "12:00", endTime: "19:00" },
      reason: "Available for afternoon shift - demo test request",
      priority: "normal",
      status: "pending",
    });

    return { requestId, scenario: "Worker requested to join shift, pending manager approval" };
  },
});

// Test Scenario 4: Manager approves worker request
export const testManagerApprovesRequest = mutation({
  args: {
    requestId: v.id("worker_hour_requests"),
    managerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Request not found");
    }

    // Create assignment since request is approved
    let createdAssignmentId = undefined;
    if (request.requestType === "join_shift" && request.requestedHours) {
      createdAssignmentId = await ctx.db.insert("shift_assignments", {
        shiftTemplateId: request.shiftTemplateId,
        workerId: request.workerId,
        date: request.date,
        assignedHours: [request.requestedHours],
        assignedBy: args.managerId,
        assignedAt: Date.now(),
        status: "confirmed",
        workerApprovedAt: Date.now(),
        managerApprovedAt: Date.now(),
        assignmentNotes: `Approved join request: ${request.reason}`,
      });
    }

    // Update request
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedBy: args.managerId,
      reviewedAt: Date.now(),
      reviewNotes: "Approved - good coverage for afternoon shift",
      createdAssignmentId,
    });

    return {
      requestId: args.requestId,
      createdAssignmentId,
      scenario: "Manager approved worker request and created assignment"
    };
  },
});

// Test Query: Get complete test results for a date
export const getTestResults = query({
  args: { testDate: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get assignments for test date
    const assignments = await ctx.db
      .query("shift_assignments")
      .withIndex("by_date", (q) => q.eq("date", args.testDate))
      .collect();

    // Get requests for test date
    const requests = await ctx.db
      .query("worker_hour_requests")
      .withIndex("by_date", (q) => q.eq("date", args.testDate))
      .collect();

    // Enrich assignments with user data
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const worker = await ctx.db.get(assignment.workerId);
        const shift = await ctx.db.get(assignment.shiftTemplateId);
        const assignedBy = await ctx.db.get(assignment.assignedBy);

        return {
          _id: assignment._id,
          status: assignment.status,
          assignedHours: assignment.assignedHours,
          workerName: worker?.name || "Unknown",
          shiftName: shift?.name || "Unknown",
          assignedByName: assignedBy?.name || "Unknown",
          assignmentNotes: assignment.assignmentNotes,
        };
      })
    );

    // Enrich requests with user data
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const worker = await ctx.db.get(request.workerId);
        const shift = await ctx.db.get(request.shiftTemplateId);
        const reviewedBy = request.reviewedBy ? await ctx.db.get(request.reviewedBy) : null;

        return {
          _id: request._id,
          requestType: request.requestType,
          status: request.status,
          requestedHours: request.requestedHours,
          workerName: worker?.name || "Unknown",
          shiftName: shift?.name || "Unknown",
          reviewedByName: reviewedBy?.name || "Pending",
          reason: request.reason,
          reviewNotes: request.reviewNotes,
        };
      })
    );

    return {
      testDate: args.testDate,
      assignments: enrichedAssignments,
      requests: enrichedRequests,
      summary: {
        totalAssignments: assignments.length,
        confirmedAssignments: assignments.filter(a => a.status === "confirmed").length,
        pendingAssignments: assignments.filter(a => a.status.includes("pending")).length,
        totalRequests: requests.length,
        approvedRequests: requests.filter(r => r.status === "approved").length,
        pendingRequests: requests.filter(r => r.status === "pending").length,
      }
    };
  },
});

// Cleanup function to remove demo data
export const cleanupDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Delete demo assignments
    const assignments = await ctx.db.query("shift_assignments").collect();
    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    // Delete demo requests
    const requests = await ctx.db.query("worker_hour_requests").collect();
    for (const request of requests) {
      await ctx.db.delete(request._id);
    }

    // Delete demo shifts
    const allShifts = await ctx.db.query("shifts").collect();
    const demoShifts = allShifts.filter(shift => shift.name.includes("Demo"));
    for (const shift of demoShifts) {
      await ctx.db.delete(shift._id);
    }

    // Delete demo users
    const allUsers = await ctx.db.query("users").collect();
    const demoUsers = allUsers.filter(user => user.email?.includes(".demo"));
    for (const user of demoUsers) {
      await ctx.db.delete(user._id);
    }

    return {
      deletedAssignments: assignments.length,
      deletedRequests: requests.length,
      deletedShifts: demoShifts.length,
      deletedUsers: demoUsers.length,
    };
  },
});