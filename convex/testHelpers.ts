import { mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

// Helper function to make current user a tester (for development only)
export const makeCurrentUserTester = mutation({
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

    await ctx.db.patch(user._id, {
      role: "tester",
    });

    return { success: true, userId: user._id, newRole: "tester" };
  },
});

// Helper to create some basic test events
export const createTestEvents = mutation({
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

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Create a few test events
    const events = [];
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

    events.push(await ctx.db.insert("events", {
      title: "Tool Inventory Check",
      description: "Check and organize tool inventory",
      startDate: tomorrow.toISOString().split('T')[0],
      endDate: tomorrow.toISOString().split('T')[0],
      startTime: "09:00",
      endTime: "13:00", // 4 hours
      type: "work",
      status: "approved",
      createdBy: user._id,
      approvedBy: user._id,
      isRecurring: false,
    }));

    events.push(await ctx.db.insert("events", {
      title: "Team Meeting",
      description: "Weekly team planning meeting",
      startDate: dayAfter.toISOString().split('T')[0],
      endDate: dayAfter.toISOString().split('T')[0],
      startTime: "10:00",
      endTime: "11:00", // 1 hour
      type: "meeting",
      status: "approved",
      createdBy: user._id,
      approvedBy: user._id,
      isRecurring: false,
    }));

    return { success: true, eventsCreated: events.length };
  },
});