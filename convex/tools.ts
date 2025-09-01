import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// Get current user with role-based permissions
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError("User not found");
  }

  return user;
}

// Get effective role (considering dev emulation)
function getEffectiveRole(user: Doc<"users">) {
  if (user.role === "dev" && user.emulatingRole) {
    return user.emulatingRole;
  }
  return user.role || "guest";
}

// Check if user has operational permissions (worker or manager)
function hasOperationalAccess(role: string) {
  return role === "worker" || role === "manager";
}

// List all tools (role-based filtering)
export const listTools = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    const tools = await ctx.db.query("tools").collect();
    
    // Operational users see all tools with full details
    if (hasOperationalAccess(role)) {
      return tools;
    }
    
    // Customers/guests only see available tools with limited info
    return tools
      .filter(tool => tool.isAvailable && tool.condition !== "needs_repair")
      .map(tool => ({
        _id: tool._id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        brand: tool.brand,
        model: tool.model,
        condition: tool.condition,
        rentalPricePerDay: tool.rentalPricePerDay,
        isAvailable: tool.isAvailable,
        _creationTime: tool._creationTime,
      }));
  },
});

// Add new tool (workers/managers only)
export const addTool = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    condition: v.union(v.literal("excellent"), v.literal("good"), v.literal("fair"), v.literal("needs_repair")),
    rentalPricePerDay: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (!hasOperationalAccess(role)) {
      throw new ConvexError("Only workers and managers can add tools");
    }

    const toolId = await ctx.db.insert("tools", {
      ...args,
      isAvailable: true,
      addedBy: user._id,
    });

    return toolId;
  },
});

// Update tool (workers/managers only)
export const updateTool = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    condition: v.optional(v.union(v.literal("excellent"), v.literal("good"), v.literal("fair"), v.literal("needs_repair"))),
    rentalPricePerDay: v.optional(v.number()),
    isAvailable: v.optional(v.boolean()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (!hasOperationalAccess(role)) {
      throw new ConvexError("Only workers and managers can update tools");
    }

    const { toolId, ...updates } = args;
    await ctx.db.patch(toolId, updates);

    return toolId;
  },
});

// Remove tool (managers only)
export const removeTool = mutation({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (role !== "manager") {
      throw new ConvexError("Only managers can remove tools");
    }

    // Check if tool has active rentals
    const activeRentals = await ctx.db
      .query("tool_rentals")
      .withIndex("by_toolId", (q: any) => q.eq("toolId", args.toolId))
      .filter((q: any) => q.or(
        q.eq(q.field("status"), "approved"),
        q.eq(q.field("status"), "active")
      ))
      .collect();

    if (activeRentals.length > 0) {
      throw new ConvexError("Cannot remove tool with active rentals");
    }

    await ctx.db.delete(args.toolId);
    return { success: true };
  },
});

// List tool rentals (role-based filtering)
export const listToolRentals = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (hasOperationalAccess(role)) {
      // Workers/managers see all rentals
      const rentals = await ctx.db.query("tool_rentals").collect();
      
      // Enrich with tool and user data
      const enrichedRentals = await Promise.all(
        rentals.map(async (rental) => {
          const tool = await ctx.db.get(rental.toolId);
          const renterUser = await ctx.db.get(rental.renterUserId);
          const approvedByUser = rental.approvedBy ? await ctx.db.get(rental.approvedBy) : null;
          
          return {
            ...rental,
            tool: tool ? { name: tool.name, category: tool.category } : null,
            renterUser: renterUser ? { name: renterUser.name, email: renterUser.email } : null,
            approvedByUser: approvedByUser ? { name: approvedByUser.name } : null,
          };
        })
      );
      
      return enrichedRentals;
    } else {
      // Customers see only their own rentals
      const rentals = await ctx.db
        .query("tool_rentals")
        .withIndex("by_renterUserId", (q: any) => q.eq("renterUserId", user._id))
        .collect();

      // Enrich with tool data only
      const enrichedRentals = await Promise.all(
        rentals.map(async (rental) => {
          const tool = await ctx.db.get(rental.toolId);
          
          return {
            ...rental,
            tool: tool ? { name: tool.name, category: tool.category, rentalPricePerDay: tool.rentalPricePerDay } : null,
          };
        })
      );
      
      return enrichedRentals;
    }
  },
});

// Create rental request
export const createRentalRequest = mutation({
  args: {
    toolId: v.id("tools"),
    rentalStartDate: v.string(),
    rentalEndDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    // Get tool details
    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new ConvexError("Tool not found");
    }

    if (!tool.isAvailable) {
      throw new ConvexError("Tool is not available for rental");
    }

    // Calculate rental days and cost
    const startDate = new Date(args.rentalStartDate);
    const endDate = new Date(args.rentalEndDate);
    const rentalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalCost = rentalDays * tool.rentalPricePerDay;

    // Create rental request
    const rentalId = await ctx.db.insert("tool_rentals", {
      toolId: args.toolId,
      renterUserId: user._id,
      rentalStartDate: args.rentalStartDate,
      rentalEndDate: args.rentalEndDate,
      actualReturnDate: undefined,
      dailyRate: tool.rentalPricePerDay,
      totalCost,
      status: "pending",
      approvedBy: undefined,
      createdBy: user._id,
      notes: args.notes,
      eventId: undefined,
    });

    // Create calendar event for operational users
    if (hasOperationalAccess(role)) {
      const eventId = await ctx.runMutation(api.events.createEvent, {
        title: `Tool Rental: ${tool.name}`,
        description: `Tool rental by ${user.name}. ${args.notes || ""}`,
        startDate: args.rentalStartDate,
        endDate: args.rentalEndDate,
        startTime: "09:00",
        endTime: "17:00",
        type: "work",
        participants: [user._id],
        isRecurring: false,
      });

      // Link the event to the rental
      await ctx.db.patch(rentalId, { eventId });
    }

    return rentalId;
  },
});

// Approve/reject rental request (workers/managers only)
export const updateRentalStatus = mutation({
  args: {
    rentalId: v.id("tool_rentals"),
    status: v.union(v.literal("approved"), v.literal("active"), v.literal("returned"), v.literal("cancelled")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (!hasOperationalAccess(role)) {
      throw new ConvexError("Only workers and managers can update rental status");
    }

    const rental = await ctx.db.get(args.rentalId);
    if (!rental) {
      throw new ConvexError("Rental not found");
    }

    const updates: any = {
      status: args.status,
    };

    if (args.status === "approved") {
      updates.approvedBy = user._id;
    } else if (args.status === "returned") {
      updates.actualReturnDate = new Date().toISOString().split('T')[0];
      
      // Make tool available again
      await ctx.db.patch(rental.toolId, { isAvailable: true });
    } else if (args.status === "active") {
      // Mark tool as unavailable
      await ctx.db.patch(rental.toolId, { isAvailable: false });
    }

    if (args.notes) {
      updates.notes = rental.notes ? `${rental.notes}\n${args.notes}` : args.notes;
    }

    await ctx.db.patch(args.rentalId, updates);

    return { success: true };
  },
});