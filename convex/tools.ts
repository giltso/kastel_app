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
function getEffectiveRole(user: any): string {
  if (user.baseRole) {
    // NEW: Use hierarchical system
    if (user.role === "dev" && user.emulatingBaseRole) {
      const tags = user.emulatingTags || [];
      if (user.emulatingBaseRole === "worker" && tags.includes("manager")) {
        return "manager";
      }
      return user.emulatingBaseRole;
    } else {
      const tags = user.tags || [];
      if (user.baseRole === "worker" && tags.includes("manager")) {
        return "manager";
      }
      return user.baseRole;
    }
  } else {
    // LEGACY: Handle old single role system  
    return user.role === "dev" && (user.emulatingRole || user.emulatingBaseRole)
      ? (user.emulatingRole || user.emulatingBaseRole)
      : (user.role || "guest");
  }
}

// Check if user has operational permissions (worker or manager)
function hasOperationalAccess(role: string) {
  return role === "worker" || role === "manager";
}

// List all tools (role-based filtering)
export const listTools = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    let role = "guest"; // Default to guest for unauthenticated users
    
    // If authenticated, get user role
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
        .unique();
      
      if (user) {
        role = getEffectiveRole(user);
      }
    }

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
    const identity = await ctx.auth.getUserIdentity();
    
    // Unauthenticated users (guests) see no rentals
    if (!identity) {
      return [];
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      return [];
    }
    
    const role = getEffectiveRole(user);

    if (hasOperationalAccess(role)) {
      // Workers/managers see all rentals EXCEPT returned ones
      const rentals = await ctx.db.query("tool_rentals").collect();
      const activeRentals = rentals.filter(rental => rental.status !== "returned");
      
      // Enrich with tool and user data
      const enrichedRentals = await Promise.all(
        activeRentals.map(async (rental) => {
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
      // Customers see only their own rentals (excluding returned)
      const rentals = await ctx.db
        .query("tool_rentals")
        .withIndex("by_renterUserId", (q: any) => q.eq("renterUserId", user._id))
        .collect();
      
      const activeRentals = rentals.filter(rental => rental.status !== "returned");

      // Enrich with tool data only
      const enrichedRentals = await Promise.all(
        activeRentals.map(async (rental) => {
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

// Rental history query for workers (includes returned rentals)
export const listRentalHistory = query({
  args: {
    toolFilter: v.optional(v.string()), // Tool name filter
    renterFilter: v.optional(v.string()), // Renter name filter
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    // Only workers and managers can access rental history
    if (!hasOperationalAccess(role)) {
      throw new ConvexError("Only workers and managers can access rental history");
    }

    // Get all rentals
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
    
    // Apply filters
    let filteredRentals = enrichedRentals;
    
    if (args.toolFilter && args.toolFilter.trim()) {
      const toolFilter = args.toolFilter.trim().toLowerCase();
      filteredRentals = filteredRentals.filter(rental => 
        rental.tool?.name.toLowerCase().includes(toolFilter)
      );
    }
    
    if (args.renterFilter && args.renterFilter.trim()) {
      const renterFilter = args.renterFilter.trim().toLowerCase();
      filteredRentals = filteredRentals.filter(rental => 
        rental.renterUser?.name.toLowerCase().includes(renterFilter) ||
        (rental.renterUser?.email && rental.renterUser.email.toLowerCase().includes(renterFilter))
      );
    }
    
    // Sort by creation time (most recent first)
    return filteredRentals.sort((a, b) => b._creationTime - a._creationTime);
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

    // Check for overlapping rentals
    const startDate = new Date(args.rentalStartDate);
    const endDate = new Date(args.rentalEndDate);
    
    // Get all existing rentals for this tool that could conflict
    const existingRentals = await ctx.db
      .query("tool_rentals")
      .filter((q: any) => q.eq(q.field("toolId"), args.toolId))
      .filter((q: any) => q.neq(q.field("status"), "cancelled"))
      .filter((q: any) => q.neq(q.field("status"), "returned"))
      .collect();

    // Check for date overlaps
    const hasConflict = existingRentals.some(rental => {
      const rentalStart = new Date(rental.rentalStartDate);
      const rentalEnd = new Date(rental.rentalEndDate);
      
      // Check if new rental overlaps with existing rental
      return (startDate <= rentalEnd && endDate >= rentalStart);
    });

    if (hasConflict) {
      throw new ConvexError("This tool is already reserved for the selected period. Please choose different dates.");
    }

    // Calculate rental days and cost
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

// Update rental details (before approval, or by managers after approval)
export const updateRental = mutation({
  args: {
    rentalId: v.id("tool_rentals"),
    rentalStartDate: v.optional(v.string()),
    rentalEndDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    const rental = await ctx.db.get(args.rentalId);
    if (!rental) {
      throw new ConvexError("Rental not found");
    }

    // Permission check: owner can edit pending rentals, managers can edit any rental
    const isOwner = rental.renterUserId === user._id;
    const isManager = hasOperationalAccess(role);
    const canEdit = isOwner || isManager;

    if (!canEdit) {
      throw new ConvexError("You don't have permission to edit this rental");
    }

    // Only allow editing dates if rental is pending or if user is manager
    if ((args.rentalStartDate || args.rentalEndDate) && rental.status !== "pending" && !isManager) {
      throw new ConvexError("Only managers can modify dates of approved rentals");
    }

    const updates: any = {};
    
    // If updating dates, check for conflicts
    if (args.rentalStartDate || args.rentalEndDate) {
      const newStartDate = new Date(args.rentalStartDate || rental.rentalStartDate);
      const newEndDate = new Date(args.rentalEndDate || rental.rentalEndDate);
      
      // Get all other rentals for this tool that could conflict
      const conflictingRentals = await ctx.db
        .query("tool_rentals")
        .filter((q: any) => q.eq(q.field("toolId"), rental.toolId))
        .filter((q: any) => q.neq(q.field("_id"), args.rentalId))
        .filter((q: any) => q.neq(q.field("status"), "cancelled"))
        .filter((q: any) => q.neq(q.field("status"), "returned"))
        .collect();

      // Check for date overlaps
      const hasConflict = conflictingRentals.some(conflictRental => {
        const conflictStart = new Date(conflictRental.rentalStartDate);
        const conflictEnd = new Date(conflictRental.rentalEndDate);
        
        return (newStartDate <= conflictEnd && newEndDate >= conflictStart);
      });

      if (hasConflict) {
        throw new ConvexError("Cannot update: tool is already reserved for overlapping dates. Please choose different dates.");
      }

      if (args.rentalStartDate) {
        updates.rentalStartDate = args.rentalStartDate;
      }
      if (args.rentalEndDate) {
        updates.rentalEndDate = args.rentalEndDate;
        
        // Recalculate cost if dates changed
        const tool = await ctx.db.get(rental.toolId);
        if (tool) {
          const startDate = new Date(args.rentalStartDate || rental.rentalStartDate);
          const endDate = new Date(args.rentalEndDate);
          const rentalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          updates.totalCost = rentalDays * tool.rentalPricePerDay;
        }
      }

      // Update calendar event if rental is approved and has an eventId
      if (rental.eventId && (args.rentalStartDate || args.rentalEndDate)) {
        try {
          await ctx.db.patch(rental.eventId, {
            startDate: args.rentalStartDate || rental.rentalStartDate,
            endDate: args.rentalEndDate || rental.rentalEndDate,
          });
        } catch (error) {
          // Calendar event might have been deleted, continue with rental update
        }
      }
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.rentalId, updates);
    
    return { success: true };
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
      // Check for conflicts before approving
      const startDate = new Date(rental.rentalStartDate);
      const endDate = new Date(rental.rentalEndDate);
      
      // Get all other approved/active rentals for this tool
      const conflictingRentals = await ctx.db
        .query("tool_rentals")
        .filter((q: any) => q.eq(q.field("toolId"), rental.toolId))
        .filter((q: any) => q.neq(q.field("_id"), args.rentalId))
        .filter((q: any) => q.or(
          q.eq(q.field("status"), "approved"),
          q.eq(q.field("status"), "active")
        ))
        .collect();

      // Check for date overlaps
      const hasConflict = conflictingRentals.some(conflictRental => {
        const conflictStart = new Date(conflictRental.rentalStartDate);
        const conflictEnd = new Date(conflictRental.rentalEndDate);
        
        return (startDate <= conflictEnd && endDate >= conflictStart);
      });

      if (hasConflict) {
        throw new ConvexError("Cannot approve: tool is already reserved for overlapping dates. Please check the calendar.");
      }

      updates.approvedBy = user._id;
      
      // Create calendar event for the rental
      const tool = await ctx.db.get(rental.toolId);
      const renterUser = await ctx.db.get(rental.renterUserId);
      
      if (tool && renterUser) {
        const eventId = await ctx.db.insert("events", {
          title: `Tool Rental: ${tool.name}`,
          description: `${renterUser.name} rented ${tool.name} (${tool.model || 'No model'})`,
          startDate: rental.rentalStartDate,
          endDate: rental.rentalEndDate,
          startTime: "08:00", // Default business hours
          endTime: "17:00",
          type: "tool_rental",
          status: "approved",
          isRecurring: false,
          createdBy: user._id,
          assignedTo: rental.renterUserId,
          participants: [rental.renterUserId],
        });
        
        // Link the event to the rental
        updates.eventId = eventId;
      }
    } else if (args.status === "returned") {
      updates.actualReturnDate = new Date().toISOString().split('T')[0];
      
      // Make tool available again
      await ctx.db.patch(rental.toolId, { isAvailable: true });
      
      // Mark calendar event as completed if exists
      if (rental.eventId) {
        await ctx.db.patch(rental.eventId, { status: "completed" });
      }
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

// Seed tools and tool rentals for testing (unauthenticated)
export const seedToolRentals = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔧 Starting tool rental database seeding...");

    // Get users or create some if none exist
    let users = await ctx.db.query("users").collect();
    
    if (users.length === 0) {
      // Create some basic users for testing
      console.log("👥 No users found, creating test users...");
      const testUsers = [
        { name: "Manager Test", email: "manager@test.com", role: "manager" },
        { name: "Worker Test", email: "worker@test.com", role: "worker" },  
        { name: "Customer Test 1", email: "customer1@test.com", role: "customer" },
        { name: "Customer Test 2", email: "customer2@test.com", role: "customer" },
        { name: "Customer Test 3", email: "customer3@test.com", role: "customer" },
      ];
      
      for (const userData of testUsers) {
        const userId = await ctx.db.insert("users", {
          clerkId: `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: userData.name,
          email: userData.email,
          role: userData.role as "manager" | "worker" | "customer",
        });
        users.push({ 
          _id: userId, 
          _creationTime: Date.now(),
          clerkId: `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...userData 
        } as any);
      }
      console.log(`✅ Created ${testUsers.length} test users`);
    }

    // Find a worker/manager to create tools
    let toolCreator = users.find(u => u.role === "manager" || u.role === "worker");
    if (!toolCreator) {
      toolCreator = users[0]; // Fallback
    }

    // Tool data to create
    const toolsData = [
      // 5 paid tools ($20/day)
      { name: "Circular Saw", category: "Power Tools", brand: "DeWalt", model: "DWE575", price: 20 },
      { name: "Drill/Driver", category: "Power Tools", brand: "Milwaukee", model: "2804-20", price: 20 },
      { name: "Angle Grinder", category: "Power Tools", brand: "Makita", model: "GA4530", price: 20 },
      { name: "Impact Driver", category: "Power Tools", brand: "Ryobi", model: "P238", price: 20 },
      { name: "Jigsaw", category: "Power Tools", brand: "Bosch", model: "JS470E", price: 20 },
      
      // 5 free tools
      { name: "Hammer Set", category: "Hand Tools", brand: "Estwing", model: "E3-16C", price: 0 },
      { name: "Screwdriver Set", category: "Hand Tools", brand: "Klein", model: "32500", price: 0 },
      { name: "Level", category: "Hand Tools", brand: "Stanley", model: "42-468", price: 0 },
      { name: "Measuring Tape", category: "Hand Tools", brand: "Stanley", model: "STHT33526", price: 0 },
      { name: "Pliers Set", category: "Hand Tools", brand: "Irwin", model: "2078712", price: 0 },
    ];

    console.log("🛠️ Creating 10 tools...");
    const createdTools = [];
    
    for (let i = 0; i < toolsData.length; i++) {
      const tool = toolsData[i];
      const toolId = await ctx.db.insert("tools", {
        name: tool.name,
        description: `Professional ${tool.name} - ${tool.brand} ${tool.model}`,
        category: tool.category,
        brand: tool.brand,
        model: tool.model,
        serialNumber: `SN${String(i + 1).padStart(3, '0')}`,
        condition: "excellent",
        rentalPricePerDay: tool.price,
        isAvailable: true,
        location: `Rack ${Math.floor(i / 5) + 1}`,
        addedBy: toolCreator._id,
        notes: `Added by seeding script`,
      });
      
      createdTools.push({
        _id: toolId,
        name: tool.name,
        category: tool.category,
        rentalPricePerDay: tool.price,
      });
      
      console.log(`  ✅ Created: ${tool.name} (${tool.price === 0 ? 'FREE' : '$' + tool.price + '/day'})`);
    }

    // Helper functions
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };
    const getRandomDateInNext2Weeks = () => {
      const today = new Date();
      const maxDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      const randomTime = today.getTime() + Math.random() * (maxDate.getTime() - today.getTime());
      return new Date(randomTime);
    };

    // Get non-manager users for rentals
    const renters = users.filter(u => u.role !== "manager").slice(0, 5);
    if (renters.length === 0) {
      renters.push(...users.slice(0, 3)); // Fallback
    }

    console.log("📅 Creating rental requests...");
    const createdRentals = [];

    // Create 15 long-term rentals (following specs)
    
    // 5 full day rentals
    for (let i = 0; i < 5 && i < createdTools.length; i++) {
      const tool = createdTools[i];
      const renter = renters[i % renters.length];
      const startDate = getRandomDateInNext2Weeks();
      const endDate = addDays(startDate, 1);
      
      // Calculate cost
      const rentalDays = 1;
      const totalCost = rentalDays * tool.rentalPricePerDay;

      const rentalId = await ctx.db.insert("tool_rentals", {
        toolId: tool._id,
        renterUserId: renter._id,
        rentalStartDate: formatDate(startDate),
        rentalEndDate: formatDate(endDate),
        actualReturnDate: undefined,
        dailyRate: tool.rentalPricePerDay,
        totalCost,
        status: "pending",
        approvedBy: undefined,
        createdBy: renter._id,
        notes: "Full day rental - start of shift to end of shift",
        eventId: undefined,
      });
      
      createdRentals.push(rentalId);
      console.log(`  ✅ Full day: ${tool.name} for ${renter.name} (${formatDate(startDate)})`);
    }

    // 3 week-long rentals  
    for (let i = 5; i < 8 && i < createdTools.length; i++) {
      const tool = createdTools[i];
      const renter = renters[i % renters.length];
      const startDate = getRandomDateInNext2Weeks();
      const endDate = addDays(startDate, 7);
      
      const rentalDays = 7;
      const totalCost = rentalDays * tool.rentalPricePerDay;

      const rentalId = await ctx.db.insert("tool_rentals", {
        toolId: tool._id,
        renterUserId: renter._id,
        rentalStartDate: formatDate(startDate),
        rentalEndDate: formatDate(endDate),
        actualReturnDate: undefined,
        dailyRate: tool.rentalPricePerDay,
        totalCost,
        status: "pending",
        approvedBy: undefined,
        createdBy: renter._id,
        notes: "Week-long rental - start of shift first day to end of shift last day",
        eventId: undefined,
      });
      
      createdRentals.push(rentalId);
      console.log(`  ✅ Week-long: ${tool.name} for ${renter.name} (${formatDate(startDate)} - ${formatDate(endDate)})`);
    }

    // 7 few-days rentals (2-4 days)
    for (let i = 8; i < 15; i++) {
      const tool = createdTools[i % createdTools.length];
      const renter = renters[i % renters.length];
      const startDate = getRandomDateInNext2Weeks();
      const daysToRent = Math.floor(Math.random() * 3) + 2; // 2-4 days
      const endDate = addDays(startDate, daysToRent);
      
      const totalCost = daysToRent * tool.rentalPricePerDay;

      const rentalId = await ctx.db.insert("tool_rentals", {
        toolId: tool._id,
        renterUserId: renter._id,
        rentalStartDate: formatDate(startDate),
        rentalEndDate: formatDate(endDate),
        actualReturnDate: undefined,
        dailyRate: tool.rentalPricePerDay,
        totalCost,
        status: "pending",
        approvedBy: undefined,
        createdBy: renter._id,
        notes: `${daysToRent}-day rental - start of shift first day to end of shift last day`,
        eventId: undefined,
      });
      
      createdRentals.push(rentalId);
      console.log(`  ✅ ${daysToRent}-day: ${tool.name} for ${renter.name} (${formatDate(startDate)} - ${formatDate(endDate)})`);
    }

    // Create 15 short-term rentals (< 1 day) - only free tools
    console.log("⚡ Creating 15 short-term rentals...");
    const freeTools = createdTools.filter(tool => tool.rentalPricePerDay === 0);
    
    for (let i = 0; i < 15; i++) {
      const tool = freeTools[i % freeTools.length];
      const renter = renters[i % renters.length];
      const startDate = getRandomDateInNext2Weeks();
      const endDate = startDate; // Same day
      
      let notes = "Short-term rental (< 1 day)";
      // For 5 of them, specify end of day timing
      if (i < 5) {
        notes = i % 2 === 0 
          ? "Short-term rental - Starts at end of day (17:00)" 
          : "Short-term rental - Ends by end of day (17:00)";
      }

      const rentalId = await ctx.db.insert("tool_rentals", {
        toolId: tool._id,
        renterUserId: renter._id,
        rentalStartDate: formatDate(startDate),
        rentalEndDate: formatDate(endDate),
        actualReturnDate: undefined,
        dailyRate: 0, // Free
        totalCost: 0,
        status: "pending",
        approvedBy: undefined,
        createdBy: renter._id,
        notes,
        eventId: undefined,
      });
      
      console.log(`  ✅ Short-term: ${tool.name} for ${renter.name} (${formatDate(startDate)}) - ${notes}`);
    }

    // Approve about 60% of rentals
    console.log("✅ Approving some rental requests...");
    const allRentals = await ctx.db.query("tool_rentals").collect();
    const pendingRentals = allRentals.filter(r => r.status === "pending");
    const rentalsToApprove = pendingRentals.slice(0, Math.floor(pendingRentals.length * 0.6));
    
    for (const rental of rentalsToApprove) {
      await ctx.db.patch(rental._id, {
        status: "approved",
        approvedBy: toolCreator._id,
        notes: (rental.notes || "") + "\nAuto-approved by seeding script",
      });
      console.log(`  ✅ Approved rental for tool ID: ${rental.toolId}`);
    }

    // Make some approved rentals active to show unavailable tools
    console.log("🔄 Making some rentals active...");
    const approvedRentals = await ctx.db.query("tool_rentals")
      .filter((q) => q.eq(q.field("status"), "approved"))
      .take(5);
    
    for (const rental of approvedRentals) {
      await ctx.db.patch(rental._id, {
        status: "active",
        notes: (rental.notes || "") + "\nMade active by seeding script",
      });
      
      // Make tool unavailable
      await ctx.db.patch(rental.toolId, { isAvailable: false });
      console.log(`  ✅ Made rental active for tool ID: ${rental.toolId} (now unavailable)`);
    }

    return {
      success: true,
      message: `Successfully seeded ${createdTools.length} tools and ${createdRentals.length + 15} rentals`,
      tools: createdTools.length,
      longTermRentals: createdRentals.length,
      shortTermRentals: 15,
      approvedRentals: rentalsToApprove.length,
      activeRentals: approvedRentals.length,
    };
  },
});