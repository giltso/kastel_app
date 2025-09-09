import { query, mutation, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

// Debug function to check what's in the users table
export const checkUsers = query({
  handler: async (ctx) => {
    try {
      const users = await ctx.db.query("users").collect();
      return {
        success: true,
        userCount: users.length,
        users: users.map(u => ({
          id: u._id,
          clerkId: u.clerkId,
          name: u.name,
          email: u.email,
          role: u.role,
          creationTime: u._creationTime
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: `Database query failed: ${error}`,
        userCount: 0,
        users: []
      };
    }
  },
});

// Debug function to test calendar query
export const testCalendarQuery = query({
  args: {},
  handler: async (ctx, args) => {
    const startDate = "2025-09-01";
    const endDate = "2025-09-30";
    
    try {
      // Call the unified calendar query
      const result = await ctx.runQuery(api.calendar_unified.getUnifiedCalendarData, {
        startDate,
        endDate,
        view: "month" as const
      });
      
      return {
        success: true,
        itemCount: result?.items?.length || 0,
        items: result?.items?.slice(0, 5) || [], // First 5 items for debugging
        allTypes: [...new Set((result?.items || []).map((item: any) => item.type))],
        shifts: (result?.items || []).filter((item: any) => item.type === 'shift')
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        itemCount: 0,
        items: [],
        allTypes: [],
        shifts: []
      };
    }
  }
});

// Migration function to update all tester roles to dev roles (legacy cleanup)
export const migrateUsersFromTesterToDev = mutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updatedCount = 0;
    
    for (const user of users) {
      // @ts-ignore - Legacy cleanup: checking for old "tester" role that may exist in data
      if (user.role === "tester") {
        await ctx.db.patch(user._id, { role: "dev" });

// Debug function to test calendar query
export const testCalendarQuery = query({
  args: {},
  handler: async (ctx, args) => {
    const startDate = "2025-09-01";
    const endDate = "2025-09-30";
    
    try {
      // Call the unified calendar query
      const result = await ctx.runQuery(api.calendar_unified.getUnifiedCalendarData, {
        startDate,
        endDate,
        view: "month" as const
      });
      
      return {
        success: true,
        itemCount: result?.items?.length || 0,
        items: result?.items?.slice(0, 5) || [], // First 5 items for debugging
        allTypes: [...new Set((result?.items || []).map((item: any) => item.type))],
        shifts: (result?.items || []).filter((item: any) => item.type === 'shift')
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        itemCount: 0,
        items: [],
        allTypes: [],
        shifts: []
      };
    }
  }
});
        updatedCount++;
      }
    }
    
    return {
      message: `Successfully migrated ${updatedCount} users from tester to dev role`,
      totalUsers: users.length,
      updatedCount,
    };
  },
});

// Debug function to test calendar query
export const testCalendarQuery = query({
  args: {},
  handler: async (ctx, args) => {
    const startDate = "2025-09-01";
    const endDate = "2025-09-30";
    
    try {
      // Call the unified calendar query
      const result = await ctx.runQuery(api.calendar_unified.getUnifiedCalendarData, {
        startDate,
        endDate,
        view: "month" as const
      });
      
      return {
        success: true,
        itemCount: result?.items?.length || 0,
        items: result?.items?.slice(0, 5) || [], // First 5 items for debugging
        allTypes: [...new Set((result?.items || []).map((item: any) => item.type))],
        shifts: (result?.items || []).filter((item: any) => item.type === 'shift')
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        itemCount: 0,
        items: [],
        allTypes: [],
        shifts: []
      };
    }
  }
});

// Debug function to check the current identity
export const checkAuth = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return {
      authenticated: !!identity,
      identity: identity ? {
        subject: identity.subject,
        name: identity.name,
        email: identity.email
      } : null
    };
  },
});

// Debug function to test calendar query
export const testCalendarQuery = query({
  args: {},
  handler: async (ctx, args) => {
    const startDate = "2025-09-01";
    const endDate = "2025-09-30";
    
    try {
      // Call the unified calendar query
      const result = await ctx.runQuery(api.calendar_unified.getUnifiedCalendarData, {
        startDate,
        endDate,
        view: "month" as const
      });
      
      return {
        success: true,
        itemCount: result?.items?.length || 0,
        items: result?.items?.slice(0, 5) || [], // First 5 items for debugging
        allTypes: [...new Set((result?.items || []).map((item: any) => item.type))],
        shifts: (result?.items || []).filter((item: any) => item.type === 'shift')
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        itemCount: 0,
        items: [],
        allTypes: [],
        shifts: []
      };
    }
  }
});

// Manual user creation for testing
export const createTestUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "Not authenticated" };
    }

    try {
      // Check if user already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique();

      if (existingUser) {
        return { 
          message: "User already exists",
          user: {
            id: existingUser._id,
            clerkId: existingUser.clerkId,
            name: existingUser.name,
            role: existingUser.role
          }
        };
      }

      // Create new user
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        name: identity.name ?? "Anonymous",
        email: identity.email,
        role: "dev", // Legacy: Make new users devs for easier testing
        baseRole: "guest", // NEW: Dev gets full access via legacy role
        tags: [],
        preferredInterface: "staff",
      });

// Debug function to test calendar query
export const testCalendarQuery = query({
  args: {},
  handler: async (ctx, args) => {
    const startDate = "2025-09-01";
    const endDate = "2025-09-30";
    
    try {
      // Call the unified calendar query
      const result = await ctx.runQuery(api.calendar_unified.getUnifiedCalendarData, {
        startDate,
        endDate,
        view: "month" as const
      });
      
      return {
        success: true,
        itemCount: result?.items?.length || 0,
        items: result?.items?.slice(0, 5) || [], // First 5 items for debugging
        allTypes: [...new Set((result?.items || []).map((item: any) => item.type))],
        shifts: (result?.items || []).filter((item: any) => item.type === 'shift')
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        itemCount: 0,
        items: [],
        allTypes: [],
        shifts: []
      };
    }
  }
});

      const newUser = await ctx.db.get(userId);
      return { 
        message: "User created successfully",
        user: {
          id: newUser?._id,
          clerkId: newUser?.clerkId,
          name: newUser?.name,
          role: newUser?.role
        }
      };
    } catch (error) {
      return { error: `Failed to create user: ${error}` };
    }
  },
});

// Debug function to test calendar query
export const testCalendarQuery = query({
  args: {},
  handler: async (ctx, args) => {
    const startDate = "2025-09-01";
    const endDate = "2025-09-30";
    
    try {
      // Call the unified calendar query
      const result = await ctx.runQuery(api.calendar_unified.getUnifiedCalendarData, {
        startDate,
        endDate,
        view: "month" as const
      });
      
      return {
        success: true,
        itemCount: result?.items?.length || 0,
        items: result?.items?.slice(0, 5) || [], // First 5 items for debugging
        allTypes: [...new Set((result?.items || []).map((item: any) => item.type))],
        shifts: (result?.items || []).filter((item: any) => item.type === 'shift')
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        itemCount: 0,
        items: [],
        allTypes: [],
        shifts: []
      };
    }
  }
});

// Debug function to check shifts
export const getAllShifts = query({
  args: {},
  handler: async (ctx, args) => {
    // Get all events first
    const allEvents = await ctx.db.query("events").collect();
    
    // Get all shifts from shifts table
    const shiftsTableData = await ctx.db.query("shifts").collect();
    
    // Filter events for shifts
    const eventShifts = allEvents.filter(event => event.type === "shift");
    
    return {
      totalEvents: allEvents.length,
      allEventTypes: [...new Set(allEvents.map(e => e.type))],
      eventShiftsCount: eventShifts.length,
      eventShifts: eventShifts.map(shift => ({
        id: shift._id,
        title: shift.title,
        type: shift.type,
        startTime: shift.startTime,
        endTime: shift.endTime,
        recurringDays: shift.recurringDays,
        isRecurring: shift.isRecurring,
        status: shift.status
      })),
      shiftsTableCount: shiftsTableData.length,
      shiftsTableData: shiftsTableData.map(shift => ({
        id: shift._id,
        name: shift.name,
        description: shift.description,
        startTime: shift.startTime,
        endTime: shift.endTime,
        recurringDays: shift.recurringDays,
        requiredWorkers: shift.requiredWorkers,
        maxWorkers: shift.maxWorkers,
        isActive: shift.isActive
      }))
    };
  }
});

// Debug function to test calendar query
export const testCalendarQuery = query({
  args: {},
  handler: async (ctx, args) => {
    const startDate = "2025-09-01";
    const endDate = "2025-09-30";
    
    try {
      // Call the unified calendar query
      const result = await ctx.runQuery(api.calendar_unified.getUnifiedCalendarData, {
        startDate,
        endDate,
        view: "month" as const
      });
      
      return {
        success: true,
        itemCount: result?.items?.length || 0,
        items: result?.items?.slice(0, 5) || [], // First 5 items for debugging
        allTypes: [...new Set((result?.items || []).map((item: any) => item.type))],
        shifts: (result?.items || []).filter((item: any) => item.type === 'shift')
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        itemCount: 0,
        items: [],
        allTypes: [],
        shifts: []
      };
    }
  }
});