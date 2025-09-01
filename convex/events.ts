import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

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
          await Promise.all(event.participants.map(id => ctx.db.get(id))) : 
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