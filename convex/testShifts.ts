import { mutation } from "./_generated/server";

export const clearShiftsAndSeed = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing shifts
    const existingShifts = await ctx.db.query("shifts").collect();
    for (const shift of existingShifts) {
      await ctx.db.delete(shift._id);
    }

    // Clear shift assignments
    const existingAssignments = await ctx.db.query("shift_assignments").collect();
    for (const assignment of existingAssignments) {
      await ctx.db.delete(assignment._id);
    }

    // Get or create manager user for shifts
    let managerId;
    const existingManager = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "manager"))
      .first();
    
    if (existingManager) {
      managerId = existingManager._id;
    } else {
      // Create a manager if none exists
      managerId = await ctx.db.insert("users", {
        clerkId: "test_manager_shifts",
        name: "Shift Manager",
        email: "shifts@kastel.com",
        role: "manager",
        baseRole: "worker",
        tags: ["manager"],
        preferredInterface: "staff",
      });
    }

    // Create the new shift patterns
    const fullDayShiftId = await ctx.db.insert("shifts", {
      name: "Full Day Shift",
      description: "Complete daily operations coverage",
      startTime: "09:00",
      endTime: "19:00",
      isRecurring: true,
      recurringDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
      requiredWorkers: 3,
      maxWorkers: 5,
      color: "#3B82F6", // Blue
      isActive: true,
      createdBy: managerId,
    });

    const morningShiftId = await ctx.db.insert("shifts", {
      name: "Morning Shift",
      description: "Morning operations and customer service",
      startTime: "09:00",
      endTime: "13:00",
      isRecurring: true,
      recurringDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
      requiredWorkers: 2,
      maxWorkers: 4,
      color: "#10B981", // Green
      isActive: true,
      createdBy: managerId,
    });

    const eveningShiftId = await ctx.db.insert("shifts", {
      name: "Evening Shift",
      description: "Afternoon/evening operations and closing procedures",
      startTime: "15:00",
      endTime: "19:00",
      isRecurring: true,
      recurringDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
      requiredWorkers: 2,
      maxWorkers: 3,
      color: "#F59E0B", // Amber
      isActive: true,
      createdBy: managerId,
    });

    return {
      message: "Shifts cleared and new pattern seeded successfully!",
      shifts: 3,
      shiftIds: [fullDayShiftId, morningShiftId, eveningShiftId],
    };
  },
});