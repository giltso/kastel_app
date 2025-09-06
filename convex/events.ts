import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";

// Utility functions for authentication and permissions
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

// Check if user has manager permissions
function hasManagerAccess(role: string) {
  return role === "manager";
}

// Create a new scheduled event (workers create, requires manager approval)
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.string(), // ISO date string (YYYY-MM-DD)
    endDate: v.string(), // ISO date string (YYYY-MM-DD)
    startTime: v.string(), // Time string (HH:MM)
    endTime: v.string(), // Time string (HH:MM)
    type: v.union(v.literal("work"), v.literal("meeting"), v.literal("maintenance"), v.literal("team")),
    isRecurring: v.boolean(),
    recurringType: v.optional(v.union(v.literal("weekly"))),
    recurringDays: v.optional(v.array(v.union(
      v.literal("monday"),
      v.literal("tuesday"), 
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    ))),
    assignedTo: v.optional(v.id("users")),
    participants: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    // Check if user can create events
    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    if (!["worker", "manager", "dev"].includes(effectiveRole) && currentUser.role !== "dev") {
      throw new ConvexError("Only workers and managers can create events");
    }

    // Create event with appropriate status
    const status = effectiveRole === "manager" 
      ? "approved" // Managers can create approved events directly
      : "pending_approval"; // Workers need approval

    // Validation for recurring events
    if (args.isRecurring && args.recurringType === "weekly" && (!args.recurringDays || args.recurringDays.length === 0)) {
      throw new ConvexError("Weekly recurring events must have at least one day selected");
    }

    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      startTime: args.startTime,
      endTime: args.endTime,
      type: args.type,
      status,
      isRecurring: args.isRecurring,
      recurringType: args.recurringType,
      recurringDays: args.recurringDays,
      createdBy: currentUser._id,
      approvedBy: effectiveRole === "manager" 
        ? currentUser._id 
        : undefined,
      assignedTo: args.assignedTo,
      participants: args.participants || [currentUser._id], // Default to creator as participant
    });

    // Create notification for managers if approval needed
    if (status === "pending_approval") {
      // Get all managers to notify
      const managers = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "manager"))
        .collect();

      // Create notifications for each manager
      for (const manager of managers) {
        await ctx.db.insert("notifications", {
          type: "event_approval",
          title: "Event Approval Required",
          message: `${currentUser.name} has created a new event "${args.title}" that needs approval`,
          targetUserId: manager._id,
          relatedItemId: eventId,
          relatedItemType: "event",
          isRead: false,
          actionRequired: true,
        });
      }
    }

    return eventId;
  },
});

// Get all events (filtered by user permissions)
export const listEvents = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return [];
    }

    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Get events based on role
    let events;
    if (effectiveRole === "manager" || effectiveRole === "worker" || currentUser.role === "dev") {
      // Managers and workers see their own events (created, assigned, or participating in)
      // Plus for managers: events they need to approve
      const allEvents = await ctx.db.query("events").collect();
      events = allEvents.filter(event => 
        event.createdBy === currentUser._id ||
        event.assignedTo === currentUser._id ||
        (event.participants && event.participants.includes(currentUser._id)) ||
        // Managers also see events pending their approval
        (effectiveRole === "manager" && event.status === "pending_approval")
      );
    } else {
      // Guests/customers see only approved public events
      events = await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", "approved"))
        .collect();
    }

    // Enrich with user data
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const createdBy = await ctx.db.get(event.createdBy);
        const approvedBy = event.approvedBy ? await ctx.db.get(event.approvedBy) : null;
        const assignedTo = event.assignedTo ? await ctx.db.get(event.assignedTo) : null;
        const participants = event.participants ? 
          await Promise.all(event.participants.map((id: any) => ctx.db.get(id))) : 
          [];

        return {
          ...event,
          createdBy: createdBy,
          approvedBy: approvedBy,
          assignedTo: assignedTo,
          participants: participants.filter(Boolean), // Remove any null participants
        };
      })
    );

    return enrichedEvents;
  },
});

// Get events by date range
export const getEventsByDateRange = query({
  args: {
    startDate: v.string(), // ISO date string (YYYY-MM-DD)
    endDate: v.string(), // ISO date string (YYYY-MM-DD)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return [];
    }

    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Apply same filtering as listEvents but with date range
    const events = await ctx.db
      .query("events")
      .withIndex("by_startDate")
      .filter((q) => 
        q.and(
          q.gte(q.field("startDate"), args.startDate),
          q.lte(q.field("endDate"), args.endDate)
        )
      )
      .collect();

    // Filter based on permissions
    let filteredEvents;
    if (effectiveRole === "manager" || effectiveRole === "worker" || currentUser.role === "dev") {
      // Managers and workers see their own events plus events pending approval (for managers)
      filteredEvents = events.filter(event => 
        event.createdBy === currentUser._id ||
        event.assignedTo === currentUser._id ||
        (event.participants && event.participants.includes(currentUser._id)) ||
        // Managers also see events pending their approval
        (effectiveRole === "manager" && event.status === "pending_approval")
      );
    } else {
      filteredEvents = events.filter(event => event.status === "approved");
    }

    return filteredEvents;
  },
});

// Get pending events for approval (managers only)
export const getPendingEvents = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return [];
    }

    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Only managers can see pending events
    if (effectiveRole !== "manager" && currentUser.role !== "dev") {
      return [];
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "pending_approval"))
      .collect();

    // Enrich with user data
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const createdBy = await ctx.db.get(event.createdBy);
        return {
          ...event,
          createdBy: createdBy,
        };
      })
    );

    return enrichedEvents;
  },
});

// Approve or reject event (managers only)
export const approveEvent = mutation({
  args: {
    eventId: v.id("events"),
    approved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Only managers can approve events
    if (effectiveRole !== "manager" && currentUser.role !== "dev") {
      throw new ConvexError("Only managers can approve events");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError("Event not found");
    }

    if (event.status !== "pending_approval") {
      throw new ConvexError("Event is not pending approval");
    }

    // Update event status
    const newStatus = args.approved ? "approved" : "cancelled";
    await ctx.db.patch(args.eventId, {
      status: newStatus,
      approvedBy: currentUser._id,
    });

    // Notify the event creator
    const creator = await ctx.db.get(event.createdBy);
    if (creator) {
      await ctx.db.insert("notifications", {
        type: "status_update",
        title: `Event ${args.approved ? 'Approved' : 'Rejected'}`,
        message: `Your event "${event.title}" has been ${args.approved ? 'approved' : 'rejected'} by ${currentUser.name}`,
        targetUserId: creator._id,
        relatedItemId: args.eventId,
        relatedItemType: "event",
        isRead: false,
        actionRequired: false,
      });
    }

    return { success: true };
  },
});

// Update event status (for workflow progression)
export const updateEventStatus = mutation({
  args: {
    eventId: v.id("events"),
    status: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError("Event not found");
    }

    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Check permissions - can update if:
    // - Manager (can update any event)
    // - Event creator 
    // - Assigned to the event
    const canUpdate = effectiveRole === "manager" || 
                     currentUser.role === "dev" ||
                     event.createdBy === currentUser._id ||
                     event.assignedTo === currentUser._id;

    if (!canUpdate) {
      throw new ConvexError("You don't have permission to update this event");
    }

    await ctx.db.patch(args.eventId, {
      status: args.status,
    });

    return { success: true };
  },
});

// Update/edit event (workers can edit their own events, requires re-approval if pending)
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    type: v.optional(v.union(v.literal("work"), v.literal("meeting"), v.literal("maintenance"), v.literal("team"))),
    isRecurring: v.optional(v.boolean()),
    recurringType: v.optional(v.union(v.literal("weekly"))),
    recurringDays: v.optional(v.array(v.union(
      v.literal("monday"),
      v.literal("tuesday"), 
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    ))),
    assignedTo: v.optional(v.id("users")),
    participants: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError("Event not found");
    }

    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Check permissions - can edit if:
    // - Manager (can edit any event)
    // - Event creator (workers can edit their own events)
    const canEdit = effectiveRole === "manager" || 
                   currentUser.role === "dev" ||
                   event.createdBy === currentUser._id;

    if (!canEdit) {
      throw new ConvexError("You don't have permission to edit this event");
    }

    // Prepare update data
    const updateData: any = {};
    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.startDate !== undefined) updateData.startDate = args.startDate;
    if (args.endDate !== undefined) updateData.endDate = args.endDate;
    if (args.startTime !== undefined) updateData.startTime = args.startTime;
    if (args.endTime !== undefined) updateData.endTime = args.endTime;
    if (args.type !== undefined) updateData.type = args.type;
    if (args.isRecurring !== undefined) updateData.isRecurring = args.isRecurring;
    if (args.recurringType !== undefined) updateData.recurringType = args.recurringType;
    if (args.recurringDays !== undefined) updateData.recurringDays = args.recurringDays;
    if (args.assignedTo !== undefined) updateData.assignedTo = args.assignedTo;
    if (args.participants !== undefined) updateData.participants = args.participants;

    // Validation for recurring events
    if (updateData.isRecurring && updateData.recurringType === "weekly" && (!updateData.recurringDays || updateData.recurringDays.length === 0)) {
      throw new ConvexError("Weekly recurring events must have at least one day selected");
    }

    // If worker is editing and event was approved, it needs re-approval
    if (effectiveRole === "worker" && event.status === "approved" && Object.keys(updateData).length > 0) {
      updateData.status = "pending_approval";
      updateData.approvedBy = undefined;

      // Notify managers about the re-approval needed
      const managers = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "manager"))
        .collect();

      for (const manager of managers) {
        await ctx.db.insert("notifications", {
          type: "event_approval",
          title: "Event Re-approval Required",
          message: `${currentUser.name} has modified the event "${event.title}" and it needs re-approval`,
          targetUserId: manager._id,
          relatedItemId: args.eventId,
          relatedItemType: "event",
          isRead: false,
          actionRequired: true,
        });
      }
    }

    // Update the event
    await ctx.db.patch(args.eventId, updateData);

    return { success: true };
  },
});

// Delete event (managers only)
export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Only managers can delete events
    if (effectiveRole !== "manager" && currentUser.role !== "dev") {
      throw new ConvexError("Only managers can delete events");
    }

    await ctx.db.delete(args.eventId);

    return { success: true };
  },
});

// Development/testing function to clear all events
export const deleteAllEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!currentUser) {
      throw new ConvexError("User not found");
    }
    
    // Only devs can use this function
    if (currentUser.role !== "dev") {
      throw new ConvexError("Only devs can delete all events");
    }

    // Get all events
    const allEvents = await ctx.db.query("events").collect();
    
    // Delete them all
    for (const event of allEvents) {
      await ctx.db.delete(event._id);
    }

    return { success: true, deletedCount: allEvents.length };
  },
});

// Helper function to generate shift instances for a date range
function generateShiftInstances(shift: any, startDate: Date, endDate: Date) {
  const instances = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  while (current <= endDate) {
    const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    if (shift.recurringDays.includes(dayName)) {
      instances.push({
        _id: `shift_${shift._id}_${current.toISOString().split('T')[0]}`,
        type: 'shift' as const,
        shiftId: shift._id,
        title: shift.name,
        description: shift.description,
        startDate: current.toISOString().split('T')[0],
        endDate: current.toISOString().split('T')[0],
        startTime: shift.startTime,
        endTime: shift.endTime,
        color: shift.color,
        requiredWorkers: shift.requiredWorkers,
        maxWorkers: shift.maxWorkers,
        isActive: shift.isActive,
        createdBy: shift.createdBy,
        // Additional shift-specific data
        date: current.toISOString().split('T')[0],
        originalShift: shift,
      });
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return instances;
}

// Unified query for calendar that includes both events and shift instances
export const listCalendarItems = query({
  args: {
    startDate: v.optional(v.string()), // Optional date range filtering
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { events: [], shifts: [], calendarItems: [] };
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return { events: [], shifts: [], calendarItems: [] };
    }

    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Set default date range (current month if not specified)
    const now = new Date();
    const defaultStart = args.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = args.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const startDateObj = new Date(defaultStart);
    const endDateObj = new Date(defaultEnd);

    // Get events (same logic as existing listEvents)
    let events: any[] = [];
    if (effectiveRole === "manager" || effectiveRole === "worker" || currentUser.role === "dev") {
      const allEvents = await ctx.db.query("events").collect();
      events = allEvents.filter(event => 
        event.createdBy === currentUser._id ||
        event.assignedTo === currentUser._id ||
        (event.participants && event.participants.includes(currentUser._id)) ||
        (effectiveRole === "manager" && event.status === "pending_approval")
      );
    } else {
      events = await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", "approved"))
        .collect();
    }

    // Filter events by date range if specified
    if (args.startDate && args.endDate) {
      events = events.filter(event => 
        event.startDate >= args.startDate! && event.endDate <= args.endDate!
      );
    }

    // Get active shifts (only for workers/managers)
    let shifts: any[] = [];
    let shiftInstances: any[] = [];
    let shiftAssignments: any[] = [];
    
    if (effectiveRole === "manager" || effectiveRole === "worker" || currentUser.role === "dev") {
      shifts = await ctx.db
        .query("shifts")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect();

      // Generate shift instances for the date range
      for (const shift of shifts) {
        const instances = generateShiftInstances(shift, startDateObj, endDateObj);
        shiftInstances.push(...instances);
      }

      // Get shift assignments for the date range
      shiftAssignments = await ctx.db
        .query("shift_assignments")
        .withIndex("by_date")
        .filter((q) => 
          q.and(
            q.gte(q.field("date"), defaultStart),
            q.lte(q.field("date"), defaultEnd)
          )
        )
        .collect();
    }

    // Enrich events with user data and identify tool rental events
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const createdBy = await ctx.db.get(event.createdBy);
        const approvedBy = event.approvedBy ? await ctx.db.get(event.approvedBy) : null;
        const assignedTo = event.assignedTo ? await ctx.db.get(event.assignedTo) : null;
        const participants = event.participants ? 
          await Promise.all(event.participants.map((id: any) => ctx.db.get(id))) : 
          [];

        // Check if this is a tool rental event by looking for linked rental
        let toolRentalData = null;
        if (event.type === "tool_rental") {
          // Find the rental that created this event
          const rental = await ctx.db
            .query("tool_rentals")
            .withIndex("by_renterUserId")
            .filter((q) => q.eq(q.field("eventId"), event._id))
            .first();
          
          if (rental) {
            const tool = await ctx.db.get(rental.toolId);
            toolRentalData = {
              ...rental,
              tool: tool ? { name: tool.name, category: tool.category } : null,
            };
          }
        }

        return {
          ...event,
          type: event.type, // Keep the original event type from database
          toolRentalData,
          createdBy,
          approvedBy,
          assignedTo,
          participants: participants.filter(Boolean),
        };
      })
    );

    // Enrich shift instances with assignment data and nested events
    const enrichedShiftInstances = await Promise.all(
      shiftInstances.map(async (instance) => {
        const assignmentsForThisShift = shiftAssignments.filter(assignment => 
          assignment.shiftId === instance.shiftId && 
          assignment.date === instance.date &&
          assignment.status !== "cancelled"
        );

        const assignedWorkers = await Promise.all(
          assignmentsForThisShift.map(async (assignment) => {
            const worker = await ctx.db.get(assignment.workerId);
            return { ...assignment, worker };
          })
        );

        const currentWorkers = assignedWorkers.length;
        const status = currentWorkers <= instance.requiredWorkers - 2 ? "bad" : 
                     currentWorkers === instance.requiredWorkers - 1 ? "close" :
                     currentWorkers === instance.requiredWorkers ? "good" : "warning";

        // Find events that should be nested within this shift
        // Events are nested if they:
        // 1. Occur on the same date as the shift
        // 2. Have start/end times that overlap with or fall within the shift timeframe
        // 3. Involve workers assigned to this shift (optional - some events may be exempt)
        const nestedEvents = enrichedEvents.filter(event => {
          // Check if event is on the same date
          if (event.startDate !== instance.date) return false;

          // Parse times for comparison
          const shiftStart = instance.startTime.split(':').map((n: string) => parseInt(n));
          const shiftEnd = instance.endTime.split(':').map((n: string) => parseInt(n));
          const eventStart = event.startTime.split(':').map((n: string) => parseInt(n));
          const eventEnd = event.endTime.split(':').map((n: string) => parseInt(n));

          const shiftStartMinutes = shiftStart[0] * 60 + shiftStart[1];
          const shiftEndMinutes = shiftEnd[0] * 60 + shiftEnd[1];
          const eventStartMinutes = eventStart[0] * 60 + eventStart[1];
          const eventEndMinutes = eventEnd[0] * 60 + eventEnd[1];

          // Check for time overlap
          const hasTimeOverlap = eventStartMinutes < shiftEndMinutes && eventEndMinutes > shiftStartMinutes;
          if (!hasTimeOverlap) return false;

          // Check if event involves workers assigned to this shift
          const assignedWorkerIds = assignedWorkers.map(aw => aw.worker?._id).filter(Boolean);
          const eventInvolvesShiftWorkers = 
            assignedWorkerIds.includes(event.createdBy?._id) ||
            assignedWorkerIds.includes(event.assignedTo?._id) ||
            event.participants?.some((p: any) => assignedWorkerIds.includes(p._id));

          // For now, nest events that involve shift workers or are general operational events
          // TODO: Add more sophisticated nesting rules based on event type
          return eventInvolvesShiftWorkers || event.type === 'work' || event.type === 'maintenance';
        });

        return {
          ...instance,
          assignments: assignedWorkers,
          currentWorkers,
          status,
          spotsAvailable: Math.max(0, instance.requiredWorkers - currentWorkers),
          isOverpopulated: currentWorkers > instance.requiredWorkers,
          nestedEvents: nestedEvents, // Add nested events to shift instance
        };
      })
    );

    // Filter out events that are nested within shifts to avoid duplication
    const standaloneEvents = enrichedEvents.filter(event => {
      // Check if this event is nested in any shift
      return !enrichedShiftInstances.some(shift => 
        shift.nestedEvents && shift.nestedEvents.some((nestedEvent: any) => nestedEvent._id === event._id)
      );
    });

    // Combine standalone events and shifts (shifts contain their nested events)
    const calendarItems = [
      ...standaloneEvents,
      ...enrichedShiftInstances,
    ];

    return {
      events: enrichedEvents,
      shifts: enrichedShiftInstances, 
      calendarItems,
    };
  },
});

// Unified Shift Management Functions (using events system)

// Create a shift (recurring or one-time) - managers only
export const createShift = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    type: v.optional(v.union(v.literal("operational"), v.literal("maintenance"), v.literal("educational"))),
    requiredWorkers: v.number(),
    maxWorkers: v.optional(v.number()),
    // Recurring settings
    isRecurring: v.boolean(),
    recurringDays: v.optional(v.array(v.union(
      v.literal("monday"), v.literal("tuesday"), v.literal("wednesday"),
      v.literal("thursday"), v.literal("friday"), v.literal("saturday"), v.literal("sunday")
    ))),
    // One-time shift settings  
    specificDate: v.optional(v.string()), // For non-recurring shifts
    // Replacement settings
    parentShiftId: v.optional(v.id("events")), // If replacing a recurring shift instance
    replacesDate: v.optional(v.string()), // Date this replaces
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (!hasManagerAccess(role)) {
      throw new ConvexError("Only managers can create shifts");
    }

    // For recurring shifts, set start/end dates to a reasonable range
    let startDate: string, endDate: string;
    
    if (args.isRecurring) {
      // Recurring shifts: create for next 2 weeks by default
      const today = new Date();
      startDate = today.toISOString().split('T')[0];
      const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      endDate = twoWeeksLater.toISOString().split('T')[0];
    } else {
      // One-time shift: use specific date
      if (!args.specificDate) {
        throw new ConvexError("specificDate is required for non-recurring shifts");
      }
      startDate = args.specificDate;
      endDate = args.specificDate;
    }

    const shiftData = {
      title: args.title,
      description: args.description,
      startDate,
      endDate,
      startTime: args.startTime,
      endTime: args.endTime,
      type: "shift" as const,
      status: "approved" as const, // Shifts are auto-approved when created by managers
      isRecurring: args.isRecurring,
      recurringType: args.isRecurring ? "weekly" as const : undefined,
      recurringDays: args.recurringDays,
      createdBy: user._id,
      approvedBy: user._id,
      assignedTo: undefined,
      participants: undefined,
      // Shift-specific fields
      requiredWorkers: args.requiredWorkers,
      maxWorkers: args.maxWorkers || args.requiredWorkers + 2,
      parentShiftId: args.parentShiftId,
      replacesDate: args.replacesDate,
    };

    const shiftId = await ctx.db.insert("events", shiftData);

    return { success: true, shiftId };
  },
});

// Assign worker to a shift instance
export const assignWorkerToShift = mutation({
  args: {
    eventId: v.id("events"), // The shift event ID
    workerId: v.id("users"),
    date: v.string(), // Specific date for the assignment
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    // Check if shift exists and is a shift type
    const shift = await ctx.db.get(args.eventId);
    if (!shift) {
      throw new ConvexError("Shift not found");
    }
    if (shift.type !== "shift") {
      throw new ConvexError("Event is not a shift");
    }

    // Permission check: managers can assign anyone, workers can only assign themselves
    if (role !== "manager" && args.workerId !== user._id) {
      throw new ConvexError("You can only assign yourself to shifts");
    }

    // Check if worker is already assigned to this shift on this date
    const existingAssignment = await ctx.db
      .query("event_assignments")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.and(
        q.eq(q.field("workerId"), args.workerId),
        q.eq(q.field("date"), args.date)
      ))
      .first();

    if (existingAssignment) {
      throw new ConvexError("Worker is already assigned to this shift on this date");
    }

    // Check shift capacity
    const currentAssignments = await ctx.db
      .query("event_assignments")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();

    const maxWorkers = shift.maxWorkers || (shift.requiredWorkers || 1) + 2;
    if (currentAssignments.length >= maxWorkers) {
      throw new ConvexError("Shift is at maximum capacity");
    }

    const assignmentId = await ctx.db.insert("event_assignments", {
      eventId: args.eventId,
      workerId: args.workerId,
      date: args.date,
      assignmentType: role === "manager" ? "manager_assigned" : "self_signed",
      assignedBy: user._id,
      status: "assigned",
      notes: args.notes,
    });

    return { success: true, assignmentId };
  },
});

// Get shifts for calendar display with assignments
export const getShiftsForCalendar = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    // Get all shift events
    const shifts = await ctx.db
      .query("events")
      .withIndex("by_type", (q) => q.eq("type", "shift"))
      .collect();

    // Get assignments for these shifts
    const shiftsWithAssignments = await Promise.all(
      shifts.map(async (shift) => {
        const assignments = await ctx.db
          .query("event_assignments")
          .withIndex("by_eventId", (q) => q.eq("eventId", shift._id))
          .collect();

        // Enrich assignments with worker data
        const enrichedAssignments = await Promise.all(
          assignments.map(async (assignment) => {
            const worker = await ctx.db.get(assignment.workerId);
            return {
              ...assignment,
              worker: worker ? { name: worker.name, email: worker.email } : null,
            };
          })
        );

        return {
          ...shift,
          assignments: enrichedAssignments,
        };
      })
    );

    return shiftsWithAssignments;
  },
});

// Create a one-time shift replacement for a recurring shift
export const createShiftReplacement = mutation({
  args: {
    parentShiftId: v.id("events"),
    date: v.string(), // Date to replace
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    requiredWorkers: v.optional(v.number()),
    maxWorkers: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (!hasManagerAccess(role)) {
      throw new ConvexError("Only managers can create shift replacements");
    }

    const parentShift = await ctx.db.get(args.parentShiftId);
    if (!parentShift) {
      throw new ConvexError("Parent shift not found");
    }
    if (parentShift.type !== "shift" || !parentShift.isRecurring) {
      throw new ConvexError("Parent must be a recurring shift");
    }

    // Check if a replacement already exists for this date
    const existingReplacement = await ctx.db
      .query("events")
      .withIndex("by_parentShiftId", (q) => q.eq("parentShiftId", args.parentShiftId))
      .filter((q) => q.eq(q.field("replacesDate"), args.date))
      .first();

    if (existingReplacement) {
      throw new ConvexError("A replacement shift already exists for this date");
    }

    const replacementData = {
      title: args.title || `${parentShift.title} (Modified)`,
      description: args.description || parentShift.description,
      startDate: args.date,
      endDate: args.date,
      startTime: args.startTime || parentShift.startTime,
      endTime: args.endTime || parentShift.endTime,
      type: "shift" as const,
      status: "approved" as const,
      isRecurring: false,
      recurringType: undefined,
      recurringDays: undefined,
      createdBy: user._id,
      approvedBy: user._id,
      assignedTo: undefined,
      participants: undefined,
      requiredWorkers: args.requiredWorkers || parentShift.requiredWorkers,
      maxWorkers: args.maxWorkers || parentShift.maxWorkers,
      parentShiftId: args.parentShiftId,
      replacesDate: args.date,
    };

    const replacementId = await ctx.db.insert("events", replacementData);

    return { success: true, replacementId };
  },
});