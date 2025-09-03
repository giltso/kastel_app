import { mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

// Helper function to make the current authenticated user a dev
export const makeCurrentUserTester = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    console.log("Identity:", {
      subject: identity.subject,
      name: identity.name,
      email: identity.email
    });

    // Find user by clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    console.log("Found user:", user ? {
      id: user._id,
      clerkId: user.clerkId,
      name: user.name,
      currentRole: user.role
    } : "No user found");

    if (!user) {
      // Create user if doesn't exist
      const newUserId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        name: identity.name ?? "Anonymous",
        email: identity.email,
        role: "dev", // Legacy
        baseRole: "guest", // NEW: Dev gets full access via legacy role
        tags: [],
        preferredInterface: "staff",
      });

      const newUser = await ctx.db.get(newUserId);
      console.log("Created new user:", newUser);
      
      return { 
        success: true, 
        action: "created",
        user: {
          id: newUser?._id,
          clerkId: newUser?.clerkId,
          name: newUser?.name,
          role: newUser?.role
        }
      };
    }

    // Update existing user to dev role
    await ctx.db.patch(user._id, {
      role: "dev",
    });

    const updatedUser = await ctx.db.get(user._id);
    console.log("Updated user:", updatedUser);

    return { 
      success: true, 
      action: "updated",
      user: {
        id: updatedUser?._id,
        clerkId: updatedUser?.clerkId,
        name: updatedUser?.name,
        role: updatedUser?.role,
        previousRole: user.role
      }
    };
  },
});

// List all users (for admin purposes)
export const listAllUsers = mutation({
  args: {},
  handler: async (ctx) => {
    // This runs without authentication context to see all users
    const users = await ctx.db.query("users").collect();
    
    return {
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
  },
});