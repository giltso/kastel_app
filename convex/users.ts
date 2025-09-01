import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Get or create user from Clerk authentication
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      // Update name and email if they have changed in Clerk
      const clerkName = identity.name ?? "Anonymous";
      const clerkEmail = identity.email ?? "";
      
      const needsUpdate = existingUser.name !== clerkName || 
                         existingUser.email !== clerkEmail ||
                         !existingUser.role; // Add role if missing
      
      if (needsUpdate) {
        await ctx.db.patch(existingUser._id, { 
          name: clerkName,
          email: clerkEmail,
          role: existingUser.role || "dev", // Default to dev if no role (for easier testing)
        });
        return await ctx.db.get(existingUser._id);
      }
      return existingUser;
    }

    // Create new user with default "dev" role for easier testing
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "Anonymous",
      email: identity.email,
      role: "dev", // Default role for new users (dev for easier testing)
    });

    return await ctx.db.get(userId);
  },
});

// Get current user's profile and effective role
export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // For dev role, return the emulating role if set
    const effectiveRole = user.role === "dev" && user.emulatingRole 
      ? user.emulatingRole 
      : (user.role || "guest");

    return {
      ...user,
      effectiveRole,
    };
  },
});

// Update user role (managers and devs only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.union(
      v.literal("guest"), 
      v.literal("customer"), 
      v.literal("worker"), 
      v.literal("manager"),
      v.literal("dev")
    ),
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

    // Only managers and devs can update roles
    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    if (effectiveRole !== "manager" && currentUser.role !== "dev") {
      throw new ConvexError("Only managers can update user roles");
    }

    // Get target user
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError("Target user not found");
    }

    // Update the role
    await ctx.db.patch(args.userId, {
      role: args.newRole,
    });

    return { success: true };
  },
});

// For dev role: switch emulating role
export const switchEmulatingRole = mutation({
  args: {
    emulatingRole: v.optional(v.union(
      v.literal("guest"), 
      v.literal("customer"), 
      v.literal("worker"), 
      v.literal("manager")
    )),
  },
  handler: async (ctx, args) => {
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

    // Only dev role can switch emulating role
    if (user.role !== "dev") {
      throw new ConvexError("Only dev role can emulate other roles");
    }

    await ctx.db.patch(user._id, {
      emulatingRole: args.emulatingRole,
    });

    return { success: true };
  },
});

// For dev role: toggle pro tag on current user
export const toggleProTag = mutation({
  args: {
    proTag: v.boolean(),
  },
  handler: async (ctx, args) => {
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

    // Only dev users can toggle pro tags (for testing)
    if (user.role !== "dev") {
      throw new ConvexError("Only dev users can toggle pro tags");
    }

    await ctx.db.patch(user._id, {
      proTag: args.proTag,
    });

    return { success: true };
  },
});

// Get all users (for managers)
export const listUsers = query({
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

    // Only managers can see all users
    const effectiveRole = currentUser.role === "dev" && currentUser.emulatingRole 
      ? currentUser.emulatingRole 
      : (currentUser.role || "guest");

    if (effectiveRole !== "manager" && currentUser.role !== "dev") {
      return [];
    }

    return await ctx.db.query("users").collect();
  },
});

// Get workers and managers for event participants
export const listWorkers = query({
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

    // Workers and managers can see workers and managers for event participation
    if (["worker", "manager", "dev"].includes(effectiveRole) || currentUser.role === "dev") {
      const workers = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "worker"))
        .collect();
      
      const managers = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "manager"))
        .collect();
        
      const devs = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "dev"))
        .collect();

      return [...workers, ...managers, ...devs];
    }

    return [];
  },
});

// Check if user has permission for a specific action
export const checkPermission = query({
  args: {
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return false;
    }

    const effectiveRole = user.role === "dev" && user.emulatingRole 
      ? user.emulatingRole 
      : (user.role || "guest");

    // Define permissions by role
    const permissions: Record<string, string[]> = {
      guest: [
        "view_public_services",
        "create_guest_request", 
        "track_own_requests"
      ],
      customer: [
        "view_public_services",
        "create_guest_request",
        "create_customer_request",
        "track_own_requests", 
        "access_customer_portal"
      ],
      worker: [
        "view_public_services",
        "create_guest_request",
        "handle_requests",
        "create_event_draft", // Requires manager approval
        "create_ticket",
        "comment_on_tickets",
        "access_worker_portal"
      ],
      manager: [
        "view_public_services", 
        "create_guest_request",
        "handle_requests",
        "approve_requests",
        "assign_workers",
        "create_event_draft",
        "approve_events", 
        "manage_events",
        "create_ticket",
        "comment_on_tickets",
        "close_tickets",
        "manage_user_roles",
        "access_manager_portal"
      ],
      dev: [
        // Dev has all permissions for testing
        "view_public_services",
        "create_guest_request",
        "create_customer_request", 
        "track_own_requests",
        "access_customer_portal",
        "handle_requests",
        "create_event_draft",
        "create_ticket",
        "comment_on_tickets",
        "access_worker_portal",
        "approve_requests",
        "assign_workers", 
        "approve_events",
        "manage_events",
        "close_tickets",
        "manage_user_roles", 
        "access_manager_portal",
        "emulate_roles"
      ]
    };

    return permissions[effectiveRole]?.includes(args.action) || false;
  },
});
