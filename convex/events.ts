import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    type: v.union(v.literal("work"), v.literal("meeting"), v.literal("maintenance")),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      type: args.type,
      assignedTo: args.assignedTo,
      createdBy: user._id,
      status: "pending",
    });

    return await ctx.db.get(eventId);
  },
});

export const listEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    
    // Get user details for each event
    const eventsWithUsers = await Promise.all(
      events.map(async (event) => {
        const creator = await ctx.db.get(event.createdBy);
        const assignee = event.assignedTo ? await ctx.db.get(event.assignedTo) : null;
        
        return {
          ...event,
          creator: creator,
          assignee: assignee,
        };
      })
    );

    return eventsWithUsers;
  },
});

export const getEventsByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
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

    return events;
  },
});

export const updateEventStatus = mutation({
  args: {
    eventId: v.id("events"),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(args.eventId, {
      status: args.status,
    });

    return await ctx.db.get(args.eventId);
  },
});