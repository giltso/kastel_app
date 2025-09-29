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

// Helper function to validate range-based hourly requirements
function validateHourlyRequirements(requirements: Array<{
  startTime?: string;
  endTime?: string;
  hour?: string;
  minWorkers: number;
  optimalWorkers: number;
}>, shiftOpenTime: string, shiftCloseTime: string) {
  if (requirements.length === 0) {
    throw new ConvexError("At least one hourly requirement is needed");
  }

  const shiftStart = parseInt(shiftOpenTime.split(':')[0]);
  const shiftEnd = parseInt(shiftCloseTime.split(':')[0]);

  for (let i = 0; i < requirements.length; i++) {
    const req = requirements[i];

    // Validate worker counts
    if (req.minWorkers < 0 || req.optimalWorkers < req.minWorkers) {
      throw new ConvexError(`Requirement ${i + 1}: optimal must be >= minimum >= 0`);
    }

    // For range-based requirements
    if (req.startTime && req.endTime) {
      const reqStart = parseInt(req.startTime.split(':')[0]);
      const reqEnd = parseInt(req.endTime.split(':')[0]);

      // Validate range is within shift bounds
      if (reqStart < shiftStart || reqEnd > shiftEnd || reqStart >= reqEnd) {
        throw new ConvexError(`Requirement ${i + 1}: range must be within shift hours (${shiftOpenTime} - ${shiftCloseTime})`);
      }

      // Check for overlaps with other requirements
      for (let j = i + 1; j < requirements.length; j++) {
        const otherReq = requirements[j];
        if (otherReq.startTime && otherReq.endTime) {
          const otherStart = parseInt(otherReq.startTime.split(':')[0]);
          const otherEnd = parseInt(otherReq.endTime.split(':')[0]);

          // Check for overlap
          if ((reqStart < otherEnd && reqEnd > otherStart)) {
            throw new ConvexError(`Requirements ${i + 1} and ${j + 1}: time ranges cannot overlap`);
          }
        }
      }
    }

    // Legacy hour validation (for backward compatibility)
    if (req.hour && !req.startTime) {
      const hourInt = parseInt(req.hour.split(':')[0]);
      if (hourInt < shiftStart || hourInt >= shiftEnd) {
        throw new ConvexError(`Requirement ${i + 1}: hour must be within shift hours`);
      }
    }
  }
}

// Query: Get all active shift templates
export const getShiftTemplates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    return await ctx.db
      .query("shifts")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Development helper: Create sample shift templates
export const createSampleShifts = mutation({
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

    // Only managers can create shift templates
    await validateManagerPermissions(ctx, user._id);

    // Clear existing sample shifts (for testing)
    const existingShifts = await ctx.db.query("shifts").collect();
    for (const shift of existingShifts) {
      await ctx.db.delete(shift._id);
    }

    // Create Daily Operations Shift (Monday-Friday)
    const dailyOperationsId = await ctx.db.insert("shifts", {
      name: "Daily Operations",
      description: "Standard weekday operations covering store hours",
      type: "operational",
      storeHours: {
        openTime: "08:00",
        closeTime: "18:00",
      },
      hourlyRequirements: [
        { hour: "08:00", minWorkers: 1, optimalWorkers: 2, notes: "Opening procedures, early customers" },
        { hour: "09:00", minWorkers: 2, optimalWorkers: 3, notes: "Morning rush, tool rentals" },
        { hour: "10:00", minWorkers: 2, optimalWorkers: 3, notes: "Peak customer period" },
        { hour: "11:00", minWorkers: 2, optimalWorkers: 3, notes: "Peak customer period" },
        { hour: "12:00", minWorkers: 2, optimalWorkers: 3, notes: "Lunch coverage needed" },
        { hour: "13:00", minWorkers: 2, optimalWorkers: 3, notes: "Afternoon operations" },
        { hour: "14:00", minWorkers: 3, optimalWorkers: 4, notes: "Peak afternoon period" },
        { hour: "15:00", minWorkers: 3, optimalWorkers: 4, notes: "Peak afternoon period" },
        { hour: "16:00", minWorkers: 2, optimalWorkers: 3, notes: "Evening operations" },
        { hour: "17:00", minWorkers: 2, optimalWorkers: 2, notes: "Closing preparations" },
      ],
      recurringDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      isActive: true,
      createdBy: user._id,
      lastModified: Date.now(),
      color: "#3B82F6", // Blue
    });

    // Create Weekend Operations Shift (Saturday-Sunday)
    const weekendOperationsId = await ctx.db.insert("shifts", {
      name: "Weekend Operations",
      description: "Weekend operations with extended Saturday hours",
      type: "operational",
      storeHours: {
        openTime: "09:00",
        closeTime: "17:00",
      },
      hourlyRequirements: [
        { hour: "09:00", minWorkers: 1, optimalWorkers: 2, notes: "Weekend opening" },
        { hour: "10:00", minWorkers: 2, optimalWorkers: 3, notes: "Weekend DIY projects" },
        { hour: "11:00", minWorkers: 2, optimalWorkers: 3, notes: "Peak weekend period" },
        { hour: "12:00", minWorkers: 2, optimalWorkers: 3, notes: "Lunch coverage" },
        { hour: "13:00", minWorkers: 2, optimalWorkers: 3, notes: "Weekend projects continue" },
        { hour: "14:00", minWorkers: 2, optimalWorkers: 3, notes: "Afternoon weekend rush" },
        { hour: "15:00", minWorkers: 2, optimalWorkers: 2, notes: "Wind down period" },
        { hour: "16:00", minWorkers: 1, optimalWorkers: 2, notes: "Closing preparations" },
      ],
      recurringDays: ["saturday", "sunday"],
      isActive: true,
      createdBy: user._id,
      lastModified: Date.now(),
      color: "#10B981", // Green
    });

    // Create Evening Operations Shift (for extended hours)
    const eveningOperationsId = await ctx.db.insert("shifts", {
      name: "Evening Operations",
      description: "Extended evening operations for busy periods",
      type: "operational",
      storeHours: {
        openTime: "18:00",
        closeTime: "20:00",
      },
      hourlyRequirements: [
        { hour: "18:00", minWorkers: 1, optimalWorkers: 2, notes: "Evening customer service" },
        { hour: "19:00", minWorkers: 1, optimalWorkers: 2, notes: "Late customer assistance" },
      ],
      recurringDays: ["tuesday", "thursday"],
      isActive: true,
      createdBy: user._id,
      lastModified: Date.now(),
      color: "#F59E0B", // Yellow
    });

    return {
      success: true,
      message: "Created 3 sample shift templates",
      shiftsCreated: [
        { id: dailyOperationsId, name: "Daily Operations" },
        { id: weekendOperationsId, name: "Weekend Operations" },
        { id: eveningOperationsId, name: "Evening Operations" },
      ],
    };
  },
});

// Query: Get shift template by ID
export const getShiftTemplate = query({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    return await ctx.db.get(args.shiftId);
  },
});

// Query: Get shifts for a specific date
export const getShiftsForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get day of week from date (0 = Sunday, 1 = Monday, etc.)
    const dateObj = new Date(args.date);
    const dayOfWeek = dateObj.getDay();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[dayOfWeek];

    // Get all active shifts that run on this day of week
    const allShifts = await ctx.db
      .query("shifts")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    return allShifts.filter(shift =>
      shift.recurringDays.includes(dayName as any)
    );
  },
});

// Mutation: Create shift template (managers only)
export const createShiftTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("operational"), v.literal("maintenance"), v.literal("special")),
    storeHours: v.object({
      openTime: v.string(),
      closeTime: v.string(),
    }),
    hourlyRequirements: v.array(v.object({
      startTime: v.string(), // "08:00" - Start of requirement range
      endTime: v.string(), // "12:00" - End of requirement range
      minWorkers: v.number(),
      optimalWorkers: v.number(),
      notes: v.optional(v.string()),

      // Legacy support - will be removed later
      hour: v.optional(v.string()), // For backward compatibility
    })),
    recurringDays: v.array(v.union(
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    )),
    color: v.optional(v.string()),
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

    // Validate hourly requirements with new range validation
    validateHourlyRequirements(args.hourlyRequirements, args.storeHours.openTime, args.storeHours.closeTime);

    return await ctx.db.insert("shifts", {
      name: args.name,
      description: args.description,
      type: args.type,
      storeHours: args.storeHours,
      hourlyRequirements: args.hourlyRequirements,
      recurringDays: args.recurringDays,
      isActive: true,
      createdBy: user._id,
      lastModified: Date.now(),
      color: args.color,
    });
  },
});

// Mutation: Update shift template (managers only)
export const updateShiftTemplate = mutation({
  args: {
    shiftId: v.id("shifts"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.union(v.literal("operational"), v.literal("maintenance"), v.literal("special"))),
    storeHours: v.optional(v.object({
      openTime: v.string(),
      closeTime: v.string(),
    })),
    hourlyRequirements: v.optional(v.array(v.object({
      startTime: v.string(), // "08:00" - Start of requirement range
      endTime: v.string(), // "12:00" - End of requirement range
      minWorkers: v.number(),
      optimalWorkers: v.number(),
      notes: v.optional(v.string()),

      // Legacy support - will be removed later
      hour: v.optional(v.string()), // For backward compatibility
    }))),
    recurringDays: v.optional(v.array(v.union(
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    ))),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
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

    // Get existing shift
    const existingShift = await ctx.db.get(args.shiftId);
    if (!existingShift) {
      throw new ConvexError("Shift template not found");
    }

    // Validate hourly requirements if provided
    if (args.hourlyRequirements) {
      const storeHours = args.storeHours || existingShift.storeHours;
      validateHourlyRequirements(args.hourlyRequirements, storeHours.openTime, storeHours.closeTime);
    }

    // Check for boundary changes that might affect existing assignments
    const boundaryChanges = args.storeHours && (
      args.storeHours.openTime !== existingShift.storeHours.openTime ||
      args.storeHours.closeTime !== existingShift.storeHours.closeTime
    );

    // Build update object with only provided fields
    const updates: Partial<Doc<"shifts">> = {
      lastModified: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.type !== undefined) updates.type = args.type;
    if (args.storeHours !== undefined) updates.storeHours = args.storeHours;
    if (args.hourlyRequirements !== undefined) updates.hourlyRequirements = args.hourlyRequirements;
    if (args.recurringDays !== undefined) updates.recurringDays = args.recurringDays;
    if (args.color !== undefined) updates.color = args.color;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    // Apply shift updates first
    await ctx.db.patch(args.shiftId, updates);

    // Handle assignment boundary adjustments if boundaries changed
    if (boundaryChanges && args.storeHours) {
      const affectedAssignments = await ctx.db
        .query("shift_assignments")
        .withIndex("by_shiftTemplateId", (q) => q.eq("shiftTemplateId", args.shiftId))
        .filter((q) => q.neq(q.field("status"), "rejected")) // Only active assignments
        .collect();

      const newOpenTime = args.storeHours.openTime;
      const newCloseTime = args.storeHours.closeTime;
      const newStartHour = parseInt(newOpenTime.split(':')[0]);
      const newEndHour = parseInt(newCloseTime.split(':')[0]);

      for (const assignment of affectedAssignments) {
        if (!assignment.assignedHours || assignment.assignedHours.length === 0) continue;

        let needsAdjustment = false;
        const originalHours = [...assignment.assignedHours];
        const adjustedHours = [];

        for (const hourSlot of assignment.assignedHours) {
          const startHour = parseInt(hourSlot.startTime.split(':')[0]);
          const endHour = parseInt(hourSlot.endTime.split(':')[0]);

          // Check if this time slot is outside new boundaries
          if (startHour < newStartHour || endHour > newEndHour) {
            needsAdjustment = true;

            // Adjust the time slot to fit within new boundaries
            const adjustedStartHour = Math.max(startHour, newStartHour);
            const adjustedEndHour = Math.min(endHour, newEndHour);

            // Only include the slot if it still has valid duration
            if (adjustedStartHour < adjustedEndHour) {
              adjustedHours.push({
                startTime: `${adjustedStartHour.toString().padStart(2, '0')}:00`,
                endTime: `${adjustedEndHour.toString().padStart(2, '0')}:00`,
              });
            }
          } else {
            // Time slot is within boundaries, keep as-is
            adjustedHours.push(hourSlot);
          }
        }

        if (needsAdjustment) {
          // Create boundary adjustment record
          const boundaryAdjustment = {
            originalHours,
            adjustedHours,
            reason: "shift_boundary_change",
            adjustedBy: user._id,
            adjustedAt: Date.now(),
            needsApproval: true, // Requires worker approval for boundary changes
            approvalStatus: "pending_worker_approval" as const,
          };

          // Update assignment with new hours and boundary adjustment
          await ctx.db.patch(assignment._id, {
            assignedHours: adjustedHours,
            boundaryAdjustments: [
              ...(assignment.boundaryAdjustments || []),
              boundaryAdjustment
            ],
            // If significantly changed, require re-approval
            status: adjustedHours.length === 0 ? "rejected" :
                   adjustedHours.length !== originalHours.length ? "pending_worker_approval" :
                   assignment.status,
          });
        }
      }
    }

    return args.shiftId;
  },
});

// Mutation: Delete shift template (managers only)
export const deleteShiftTemplate = mutation({
  args: { shiftId: v.id("shifts") },
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

    // Check if shift has any assignments
    const existingAssignments = await ctx.db
      .query("shift_assignments")
      .withIndex("by_shiftTemplateId", (q) => q.eq("shiftTemplateId", args.shiftId))
      .collect();

    if (existingAssignments.length > 0) {
      // Don't actually delete, just deactivate
      await ctx.db.patch(args.shiftId, {
        isActive: false,
        lastModified: Date.now(),
      });
      return { deleted: false, deactivated: true };
    } else {
      // Safe to delete
      await ctx.db.delete(args.shiftId);
      return { deleted: true, deactivated: false };
    }
  },
});