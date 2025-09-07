import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Utility functions for authentication and permissions (simplified)
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

// Get effective role (simplified)
function getEffectiveRole(user: any): string {
  if (user.baseRole) {
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
    return user.role === "dev" && (user.emulatingRole || user.emulatingBaseRole)
      ? (user.emulatingRole || user.emulatingBaseRole)
      : (user.role || "guest");
  }
}

function hasManagerPermissions(user: any): boolean {
  return getEffectiveRole(user) === "manager";
}

// UNIFIED CALENDAR DATA QUERY
export const getUnifiedCalendarData = query({
  args: { 
    startDate: v.string(),
    endDate: v.string(),
    view: v.union(v.literal("month"), v.literal("week"), v.literal("day")),
    filters: v.optional(v.object({
      showEvents: v.optional(v.boolean()),
      showShifts: v.optional(v.boolean()),
      showTools: v.optional(v.boolean()),
      showPendingOnly: v.optional(v.boolean()),
    }))
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const effectiveRole = getEffectiveRole(currentUser);
    const isManager = hasManagerPermissions(currentUser);
    
    const startDateObj = new Date(args.startDate);
    const endDateObj = new Date(args.endDate);
    
    // Initialize filters with defaults
    const filters = {
      showEvents: true,
      showShifts: true, 
      showTools: true,
      showPendingOnly: false,
      ...args.filters
    };
    
    const items: any[] = [];
    
    // ===== FETCH EVENTS =====
    if (filters.showEvents) {
      let events: any[] = [];
      
      if (effectiveRole === "manager" || effectiveRole === "worker" || currentUser.role === "dev") {
        const allEvents = await ctx.db.query("events").collect();
        const nonShiftEvents = allEvents.filter(event => event.type !== "shift");
        
        events = nonShiftEvents.filter(event => {
          // Date filtering
          const eventDate = new Date(event.startDate);
          if (eventDate < startDateObj || eventDate > endDateObj) return false;
          
          // Permission filtering
          return event.createdBy === currentUser._id ||
                 event.assignedTo === currentUser._id ||
                 (event.participants && event.participants.includes(currentUser._id)) ||
                 (isManager && event.status === "pending_approval") ||
                 (effectiveRole === "manager");
        });
      } else {
        // Guest/Customer - only approved events
        const allEvents = await ctx.db
          .query("events")
          .withIndex("by_status", (q) => q.eq("status", "approved"))
          .collect();
        
        events = allEvents.filter(event => {
          const eventDate = new Date(event.startDate);
          return eventDate >= startDateObj && eventDate <= endDateObj && event.type !== "shift";
        });
      }
      
      // Convert events to unified format
      for (const event of events) {
        items.push({
          id: event._id,
          type: 'event',
          title: event.title,
          description: event.description,
          startTime: event.startTime || "09:00",
          endTime: event.endTime || "17:00",
          date: event.startDate,
          status: event.status,
          approvalRequired: event.status === "pending_approval",
          canEdit: event.createdBy === currentUser._id || isManager,
          canApprove: isManager && event.status === "pending_approval",
          pendingApproval: event.status === "pending_approval",
          metadata: {
            createdBy: event.createdBy,
            assignedTo: event.assignedTo,
            participants: event.participants,
            eventType: event.type,
          }
        });
      }
    }
    
    // ===== FETCH SHIFTS =====  
    if (filters.showShifts) {
      const shifts = await ctx.db
        .query("events")
        .withIndex("by_type", (q) => q.eq("type", "shift"))
        .collect();
      
      // Generate shift instances for the date range
      for (const shift of shifts) {
        if (!shift.recurringDays) continue;
        
        const current = new Date(startDateObj);
        
        while (current <= endDateObj) {
          const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          
          if (shift.recurringDays.includes(dayName as any)) {
            const dateString = current.toISOString().split('T')[0];
            
            items.push({
              id: `${shift._id}-${dateString}`,
              type: 'shift',
              title: shift.title || 'Shift',
              description: shift.description,
              startTime: shift.startTime || "09:00", 
              endTime: shift.endTime || "17:00",
              date: dateString,
              status: 'approved', // Shifts are always approved
              approvalRequired: false,
              canEdit: isManager,
              canApprove: false,
              canAssign: isManager,
              pendingApproval: false,
              metadata: {
                shiftId: shift._id,
                requiredWorkers: shift.requiredWorkers || 1,
                maxWorkers: shift.maxWorkers || shift.requiredWorkers || 1,
              }
            });
          }
          
          current.setDate(current.getDate() + 1);
        }
      }
    }
    
    // ===== FETCH TOOL RENTALS =====
    if (filters.showTools) {
      const toolRentals = await ctx.db.query("tool_rentals").collect();
      
      for (const rental of toolRentals) {
        const rentalStart = new Date(rental.rentalStartDate);
        const rentalEnd = new Date(rental.rentalEndDate);
        
        // Check if rental overlaps with date range
        if (rentalEnd >= startDateObj && rentalStart <= endDateObj) {
          // Skip returned rentals
          if (rental.status === "returned") continue;
          
          items.push({
            id: rental._id,
            type: 'tool_rental',
            title: `Tool Rental`,
            description: `Tool rental`,
            startTime: "09:00",
            endTime: "17:00",
            date: rental.rentalStartDate,
            status: rental.status,
            approvalRequired: rental.status === "pending",
            canEdit: rental.createdBy === currentUser._id || isManager,
            canApprove: isManager && rental.status === "pending",
            pendingApproval: rental.status === "pending",
            metadata: {
              toolId: rental.toolId,
              renterUserId: rental.renterUserId,
              totalCost: rental.totalCost,
            }
          });
        }
      }
    }
    
    // ===== APPLY FILTERS =====
    let filteredItems = items;
    
    if (filters.showPendingOnly) {
      filteredItems = filteredItems.filter(item => item.pendingApproval);
    }
    
    // ===== GENERATE SUMMARY =====
    const summary = {
      totalItems: filteredItems.length,
      pendingApprovals: filteredItems.filter(item => item.pendingApproval).length,
      itemTypes: {
        events: filteredItems.filter(item => item.type === 'event').length,
        shifts: filteredItems.filter(item => item.type === 'shift').length,
        toolRentals: filteredItems.filter(item => item.type === 'tool_rental').length,
      },
    };
    
    // Sort items by date and time
    filteredItems.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    
    return { items: filteredItems, summary };
  }
});

// SIMPLIFIED APPROVAL MUTATION
export const approveCalendarItem = mutation({
  args: {
    itemId: v.string(),
    itemType: v.union(v.literal("event"), v.literal("tool_rental")),
    approve: v.boolean(),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    
    if (!hasManagerPermissions(currentUser)) {
      throw new ConvexError("Only managers can approve/reject items");
    }
    
    if (args.itemType === "event") {
      const event = await ctx.db.get(args.itemId as Id<"events">);
      if (!event) {
        throw new ConvexError("Event not found");
      }
      
      await ctx.db.patch(args.itemId as Id<"events">, {
        status: args.approve ? "approved" : "cancelled",
        approvedBy: currentUser._id,
      });
      
    } else if (args.itemType === "tool_rental") {
      const rental = await ctx.db.get(args.itemId as Id<"tool_rentals">);
      if (!rental) {
        throw new ConvexError("Tool rental not found");
      }
      
      await ctx.db.patch(args.itemId as Id<"tool_rentals">, {
        status: args.approve ? "approved" : "cancelled",
        approvedBy: currentUser._id,
      });
    }
    
    return { success: true, message: `Item ${args.approve ? 'approved' : 'rejected'} successfully` };
  }
});

// BULK APPROVAL MUTATION  
export const bulkApproveCalendarItems = mutation({
  args: {
    items: v.array(v.object({
      itemId: v.string(),
      itemType: v.union(v.literal("event"), v.literal("tool_rental")),
    })),
    approve: v.boolean(),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    
    if (!hasManagerPermissions(currentUser)) {
      throw new ConvexError("Only managers can perform bulk approvals");
    }
    
    const results = [];
    
    for (const item of args.items) {
      try {
        await ctx.runMutation(api.calendar_unified.approveCalendarItem as any, {
          itemId: item.itemId,
          itemType: item.itemType,
          approve: args.approve,
          reason: args.reason,
        });
        
        results.push({ itemId: item.itemId, success: true });
      } catch (error) {
        results.push({ 
          itemId: item.itemId, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return { 
      results,
      summary: `${successCount} items ${args.approve ? 'approved' : 'rejected'} successfully${failCount > 0 ? `, ${failCount} failed` : ''}`
    };
  }
});