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
      hour: v.string(),
      minWorkers: v.number(),
      optimalWorkers: v.number(),
      notes: v.optional(v.string()),
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

    // Validate hourly requirements
    if (args.hourlyRequirements.length === 0) {
      throw new ConvexError("At least one hourly requirement is needed");
    }

    for (const req of args.hourlyRequirements) {
      if (req.minWorkers < 0 || req.optimalWorkers < req.minWorkers) {
        throw new ConvexError("Invalid worker requirements: optimal must be >= minimum >= 0");
      }
    }

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
      hour: v.string(),
      minWorkers: v.number(),
      optimalWorkers: v.number(),
      notes: v.optional(v.string()),
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
      if (args.hourlyRequirements.length === 0) {
        throw new ConvexError("At least one hourly requirement is needed");
      }

      for (const req of args.hourlyRequirements) {
        if (req.minWorkers < 0 || req.optimalWorkers < req.minWorkers) {
          throw new ConvexError("Invalid worker requirements: optimal must be >= minimum >= 0");
        }
      }
    }

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

    await ctx.db.patch(args.shiftId, updates);
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