import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Create a new event (workers create, requires manager approval)
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    type: v.union(v.literal("work"), v.literal("meeting"), v.literal("maintenance"), v.literal("team")),
    assignedTo: v.optional(v.id("users")),
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
    const effectiveRole = currentUser.role === "tester" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    if (!["worker", "manager", "tester"].includes(effectiveRole) && currentUser.role !== "tester") {
      throw new ConvexError("Only workers and managers can create events");
    }

    // Create event with appropriate status
    const status = effectiveRole === "manager" || currentUser.role === "tester" 
      ? "approved" // Managers can create approved events directly
      : "pending_approval"; // Workers need approval

    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      type: args.type,
      status,
      createdBy: currentUser._id,
      approvedBy: effectiveRole === "manager" || currentUser.role === "tester" 
        ? currentUser._id 
        : undefined,
      assignedTo: args.assignedTo,
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

    const effectiveRole = currentUser.role === "tester" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Get events based on role
    let events;
    if (effectiveRole === "manager" || currentUser.role === "tester") {
      // Managers see all events
      events = await ctx.db.query("events").collect();
    } else if (effectiveRole === "worker") {
      // Workers see their own events and approved events
      events = await ctx.db
        .query("events")
        .filter((q) => 
          q.or(
            q.eq(q.field("createdBy"), currentUser._id),
            q.eq(q.field("assignedTo"), currentUser._id),
            q.eq(q.field("status"), "approved"),
            q.eq(q.field("status"), "in_progress"),
            q.eq(q.field("status"), "completed")
          )
        )
        .collect();
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

        return {
          ...event,
          createdBy: createdBy,
          approvedBy: approvedBy,
          assignedTo: assignedTo,
        };
      })
    );

    return enrichedEvents;
  },
});

// Get events by date range
export const getEventsByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
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

    const effectiveRole = currentUser.role === "tester" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Apply same filtering as listEvents but with date range
    const events = await ctx.db
      .query("events")
      .withIndex("by_startTime")
      .filter((q) => 
        q.and(
          q.gte(q.field("startTime"), args.startDate),
          q.lte(q.field("startTime"), args.endDate)
        )
      )
      .collect();

    // Filter based on permissions
    let filteredEvents;
    if (effectiveRole === "manager" || currentUser.role === "tester") {
      filteredEvents = events;
    } else if (effectiveRole === "worker") {
      filteredEvents = events.filter(event => 
        event.createdBy === currentUser._id ||
        event.assignedTo === currentUser._id ||
        ["approved", "in_progress", "completed"].includes(event.status)
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

    const effectiveRole = currentUser.role === "tester" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Only managers can see pending events
    if (effectiveRole !== "manager" && currentUser.role !== "tester") {
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

    const effectiveRole = currentUser.role === "tester" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Only managers can approve events
    if (effectiveRole !== "manager" && currentUser.role !== "tester") {
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

    const effectiveRole = currentUser.role === "tester" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Check permissions - can update if:
    // - Manager (can update any event)
    // - Event creator 
    // - Assigned to the event
    const canUpdate = effectiveRole === "manager" || 
                     currentUser.role === "tester" ||
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

    const effectiveRole = currentUser.role === "tester" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    // Only managers can delete events
    if (effectiveRole !== "manager" && currentUser.role !== "tester") {
      throw new ConvexError("Only managers can delete events");
    }

    await ctx.db.delete(args.eventId);

    return { success: true };
  },
});