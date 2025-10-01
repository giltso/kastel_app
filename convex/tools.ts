import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Helper: Get effective V2 role for user
function getEffectiveRole(user: Doc<"users">) {
  return {
    isStaff: user.emulatingIsStaff ?? user.isStaff ?? false,
    workerTag: user.emulatingWorkerTag ?? user.workerTag ?? false,
    managerTag: user.emulatingManagerTag ?? user.managerTag ?? false,
    instructorTag: user.emulatingInstructorTag ?? user.instructorTag ?? false,
    rentalApprovedTag: user.emulatingRentalApprovedTag ?? user.rentalApprovedTag ?? false,
    toolHandlerTag: user.emulatingToolHandlerTag ?? user.toolHandlerTag ?? false,
  };
}

// Query: List all tools (role-based filtering)
export const listTools = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // Get all tools
    const tools = await ctx.db.query("tools").collect();

    // Guests and unauthenticated users see all tools but limited info
    if (!identity) {
      return tools.map(tool => ({
        ...tool,
        notes: undefined, // Hide internal notes from guests
        serialNumber: undefined, // Hide serial numbers from guests
      }));
    }

    // Authenticated users see full tool info
    return tools;
  },
});

// Query: Get single tool
export const getTool = query({
  args: { id: v.id("tools") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Query: List tool rentals (role-based: customer sees their own, staff sees all)
export const listToolRentals = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const effectiveRole = getEffectiveRole(user);

    // Staff see all rentals
    if (effectiveRole.isStaff && effectiveRole.workerTag) {
      const rentals = await ctx.db.query("tool_rentals").collect();

      // Enrich with tool and user data
      return await Promise.all(
        rentals.map(async (rental) => {
          const tool = await ctx.db.get(rental.toolId);
          const renterUser = await ctx.db.get(rental.renterUserId);
          return {
            ...rental,
            tool,
            renterUser,
          };
        })
      );
    }

    // Customers see only their own rentals
    const myRentals = await ctx.db
      .query("tool_rentals")
      .withIndex("by_renterUserId", (q) => q.eq("renterUserId", user._id))
      .collect();

    // Enrich with tool data
    return await Promise.all(
      myRentals.map(async (rental) => {
        const tool = await ctx.db.get(rental.toolId);
        return {
          ...rental,
          tool,
        };
      })
    );
  },
});

// Query: List rental history with optional filters
export const listRentalHistory = query({
  args: {
    toolFilter: v.optional(v.string()),
    renterFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const effectiveRole = getEffectiveRole(user);

    // Only staff can view rental history
    if (!effectiveRole.isStaff || !effectiveRole.workerTag) {
      return [];
    }

    // Get all rentals
    const rentals = await ctx.db.query("tool_rentals").collect();

    // Enrich with tool and user data
    const enrichedRentals = await Promise.all(
      rentals.map(async (rental) => {
        const tool = await ctx.db.get(rental.toolId);
        const renterUser = await ctx.db.get(rental.renterUserId);
        return {
          ...rental,
          tool,
          renterUser,
        };
      })
    );

    // Apply filters
    let filtered = enrichedRentals;

    if (args.toolFilter) {
      const toolFilterLower = args.toolFilter.toLowerCase();
      filtered = filtered.filter(
        (r) => r.tool?.name.toLowerCase().includes(toolFilterLower)
      );
    }

    if (args.renterFilter) {
      const renterFilterLower = args.renterFilter.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.renterUser?.name?.toLowerCase().includes(renterFilterLower) ||
          r.renterUser?.email?.toLowerCase().includes(renterFilterLower)
      );
    }

    return filtered;
  },
});

// Mutation: Add new tool to inventory
export const addTool = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    condition: v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("needs_repair")
    ),
    rentalPricePerDay: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to add tools");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const effectiveRole = getEffectiveRole(user);

    // Only staff with worker tag can add tools
    if (!effectiveRole.isStaff || !effectiveRole.workerTag) {
      throw new Error("Only staff members can add tools to inventory");
    }

    // Create the tool
    const toolId = await ctx.db.insert("tools", {
      name: args.name,
      description: args.description,
      category: args.category,
      brand: args.brand,
      model: args.model,
      serialNumber: args.serialNumber,
      condition: args.condition,
      rentalPricePerDay: args.rentalPricePerDay,
      isAvailable: true, // New tools are available by default
      location: args.location,
      addedBy: user._id,
      notes: args.notes,
    });

    return toolId;
  },
});

// Mutation: Create rental request
export const createRentalRequest = mutation({
  args: {
    toolId: v.id("tools"),
    rentalStartDate: v.string(),
    rentalEndDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to request tool rental");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const effectiveRole = getEffectiveRole(user);

    // Check if user has rental approval
    if (effectiveRole.isStaff || !effectiveRole.rentalApprovedTag) {
      throw new Error("Only approved customers can request tool rentals");
    }

    // Get the tool
    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Tool not found");
    }

    if (!tool.isAvailable) {
      throw new Error("Tool is not currently available");
    }

    // Calculate rental cost
    const startDate = new Date(args.rentalStartDate);
    const endDate = new Date(args.rentalEndDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 1) {
      throw new Error("Rental must be at least 1 day");
    }

    const totalCost = days * tool.rentalPricePerDay;

    // Create rental request
    const rentalId = await ctx.db.insert("tool_rentals", {
      toolId: args.toolId,
      renterUserId: user._id,
      rentalStartDate: args.rentalStartDate,
      rentalEndDate: args.rentalEndDate,
      dailyRate: tool.rentalPricePerDay,
      totalCost,
      status: "pending",
      createdBy: user._id,
      notes: args.notes,
    });

    return rentalId;
  },
});

// Mutation: Update rental status (approve, reject, start, return)
export const updateRentalStatus = mutation({
  args: {
    rentalId: v.id("tool_rentals"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("active"),
      v.literal("returned"),
      v.literal("overdue"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const effectiveRole = getEffectiveRole(user);

    // Only staff can update rental status
    if (!effectiveRole.isStaff || !effectiveRole.workerTag) {
      throw new Error("Only staff can update rental status");
    }

    // Get the rental
    const rental = await ctx.db.get(args.rentalId);
    if (!rental) {
      throw new Error("Rental not found");
    }

    // Get the tool
    const tool = await ctx.db.get(rental.toolId);
    if (!tool) {
      throw new Error("Tool not found");
    }

    // Update rental status
    const updates: any = {
      status: args.status,
    };

    // If approving, mark tool as unavailable and set approver
    if (args.status === "approved") {
      await ctx.db.patch(rental.toolId, { isAvailable: false });
      updates.approvedBy = user._id;
    }

    // If returned or cancelled, mark tool as available again
    if (args.status === "returned" || args.status === "cancelled") {
      await ctx.db.patch(rental.toolId, { isAvailable: true });
      if (args.status === "returned") {
        updates.actualReturnDate = new Date().toISOString().split('T')[0];
      }
    }

    await ctx.db.patch(args.rentalId, updates);

    return { success: true };
  },
});

// Get tool rentals for a specific date (for calendar display)
export const getToolRentalsForDate = query({
  args: {
    date: v.string(), // YYYY-MM-DD format
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Get all active/approved rentals
    const allRentals = await ctx.db
      .query("tool_rentals")
      .collect();

    // Filter rentals that overlap with the given date
    const rentalsOnDate = allRentals.filter(rental => {
      // Include if rental period overlaps with the target date
      return rental.rentalStartDate <= args.date && rental.rentalEndDate >= args.date &&
             (rental.status === "approved" || rental.status === "active");
    });

    // Guests see no rentals
    if (!identity) {
      return [];
    }

    // Get user and check permissions
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const effectiveRole = getEffectiveRole(user);

    // Staff see all rentals with enriched data
    if (effectiveRole.isStaff && effectiveRole.workerTag) {
      return await Promise.all(
        rentalsOnDate.map(async (rental) => {
          const tool = await ctx.db.get(rental.toolId);
          const renterUser = await ctx.db.get(rental.renterUserId);
          return {
            ...rental,
            tool,
            renterUser,
          };
        })
      );
    }

    // Customers see only their own rentals
    const myRentals = rentalsOnDate.filter(rental => rental.renterUserId === user._id);
    return await Promise.all(
      myRentals.map(async (rental) => {
        const tool = await ctx.db.get(rental.toolId);
        return {
          ...rental,
          tool,
          renterUser: user, // Customer only sees their own info
        };
      })
    );
  },
});
