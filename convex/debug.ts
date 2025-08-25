import { query, mutation } from "./_generated/server";

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
        role: "tester", // Make new users testers for easier testing
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