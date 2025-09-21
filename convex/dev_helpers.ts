import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Development helper to create sample shift assignments
export const createSampleAssignments = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all shifts
    const shifts = await ctx.db.query("shifts").collect();

    // Get all staff users with worker tag
    const users = await ctx.db.query("users").collect();
    const workers = users.filter(user => user.workerTag === true || user.emulatingWorkerTag === true);

    if (shifts.length === 0 || workers.length === 0) {
      return { error: "No shifts or workers found", shifts: shifts.length, workers: workers.length };
    }

    const assignments = [];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Create sample assignments for today
    for (let i = 0; i < Math.min(shifts.length, workers.length); i++) {
      const shift = shifts[i];
      const worker = workers[i];

      const assignmentId = await ctx.db.insert("shift_assignments", {
        shiftTemplateId: shift._id,
        workerId: worker._id,
        date: today,
        assignedHours: [
          { startTime: shift.storeHours.openTime, endTime: shift.storeHours.closeTime }
        ],
        assignedBy: worker._id, // Self-assigned for testing
        assignedAt: Date.now(),
        status: "confirmed",
        managerApprovedAt: Date.now(),
        workerApprovedAt: Date.now(),
        assignmentNotes: "Sample assignment for testing"
      });

      assignments.push({ assignmentId, shiftName: shift.name, workerName: worker.name });
    }

    return {
      success: true,
      message: `Created ${assignments.length} sample assignments for ${today}`,
      assignments,
      shiftsFound: shifts.length,
      workersFound: workers.length
    };
  },
});

// Helper to clear all assignments (for testing)
export const clearAllAssignments = mutation({
  args: {},
  handler: async (ctx) => {
    const assignments = await ctx.db.query("shift_assignments").collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    return { success: true, message: `Deleted ${assignments.length} assignments` };
  },
});

// Helper to clear all shifts (for testing)
export const clearAllShifts = mutation({
  args: {},
  handler: async (ctx) => {
    const shifts = await ctx.db.query("shifts").collect();

    for (const shift of shifts) {
      await ctx.db.delete(shift._id);
    }

    return { success: true, message: `Deleted ${shifts.length} shifts` };
  },
});

// Helper to check current data status
export const checkDataStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const shifts = await ctx.db.query("shifts").collect();
    const users = await ctx.db.query("users").collect();
    const assignments = await ctx.db.query("shift_assignments").collect();

    const workers = users.filter(user => user.workerTag === true || user.emulatingWorkerTag === true);

    return {
      shifts: shifts.length,
      users: users.length,
      workers: workers.length,
      assignments: assignments.length,
      shiftsData: shifts.map(s => ({ name: s.name, isActive: s.isActive })),
      workersData: workers.map(u => ({ name: u.name, workerTag: u.workerTag, emulatingWorkerTag: u.emulatingWorkerTag })),
      assignmentsData: assignments.map(a => ({ status: a.status, date: a.date, shiftTemplateId: a.shiftTemplateId, workerId: a.workerId }))
    };
  },
});