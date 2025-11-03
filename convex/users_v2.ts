import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

// V2 Role System - Tag-based permissions from REDESIGN_V2.md

// Helper function to check if user has specific permission
// Note: Dev users (isDev: true) use the same permission fields as regular users
export function hasV2Permission(user: Doc<"users">, permission: string): boolean {
  const isStaff = user.isStaff ?? false;
  const workerTag = user.workerTag ?? false;
  const instructorTag = user.instructorTag ?? false;
  const toolHandlerTag = user.toolHandlerTag ?? false;
  const managerTag = user.managerTag ?? false;
  const rentalApprovedTag = user.rentalApprovedTag ?? false;

  switch (permission) {
    case "staff":
      return isStaff;
    case "worker":
      return isStaff && workerTag;
    case "instructor":
      return isStaff && instructorTag;
    case "tool_handler":
      return isStaff && toolHandlerTag;
    case "manager":
      return isStaff && workerTag && managerTag;
    case "rental_approved":
      return !isStaff && rentalApprovedTag;
    case "tool_rentals":
      // Tool rental access: Staff+ToolHandler OR Customer+RentalApproved
      return (isStaff && toolHandlerTag) || (!isStaff && rentalApprovedTag);
    default:
      return false;
  }
}

// Get current user with V2 permissions
export const getCurrentUserV2 = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    return user;
  },
});

// Update own permissions (for dev users via RoleEmulator)
// Dev users can toggle their own permissions for testing different role combinations
export const updateOwnPermissions = mutation({
  args: {
    isStaff: v.optional(v.boolean()),
    workerTag: v.optional(v.boolean()),
    instructorTag: v.optional(v.boolean()),
    toolHandlerTag: v.optional(v.boolean()),
    managerTag: v.optional(v.boolean()),
    rentalApprovedTag: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || !user.isDev) {
      throw new Error("Only dev users can update their own permissions");
    }

    // Validate manager tag requires worker tag
    if (args.managerTag && !args.workerTag) {
      throw new Error("Manager tag requires worker tag");
    }

    // Update real permission fields (not emulating fields anymore)
    await ctx.db.patch(user._id, {
      isStaff: args.isStaff,
      workerTag: args.workerTag,
      instructorTag: args.instructorTag,
      toolHandlerTag: args.toolHandlerTag,
      managerTag: args.managerTag,
      rentalApprovedTag: args.rentalApprovedTag,
    });
  },
});

// Legacy alias for backward compatibility during transition
export const switchV2Role = updateOwnPermissions;

// Create or update user for V2 system
export const createOrUpdateUserV2 = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    isDev: v.optional(v.boolean()),
    isStaff: v.optional(v.boolean()),
    workerTag: v.optional(v.boolean()),
    instructorTag: v.optional(v.boolean()),
    toolHandlerTag: v.optional(v.boolean()),
    managerTag: v.optional(v.boolean()),
    rentalApprovedTag: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        email: args.email,
        isDev: args.isDev,
        isStaff: args.isStaff,
        workerTag: args.workerTag,
        instructorTag: args.instructorTag,
        toolHandlerTag: args.toolHandlerTag,
        managerTag: args.managerTag,
        rentalApprovedTag: args.rentalApprovedTag,
      });
      return existingUser._id;
    } else {
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        name: args.name,
        email: args.email,
        isDev: args.isDev, // No default - undefined unless explicitly set
        isStaff: args.isStaff ?? false, // Default to customer (not staff)
        workerTag: args.workerTag ?? false,
        instructorTag: args.instructorTag ?? false,
        toolHandlerTag: args.toolHandlerTag ?? false,
        managerTag: args.managerTag ?? false,
        rentalApprovedTag: args.rentalApprovedTag ?? false,
      });
    }
  },
});

// Ensure user exists (for authentication compatibility)
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      return existingUser._id;
    } else {
      // Create new user as customer by default (production behavior)
      return await ctx.db.insert("users", {
        clerkId: identity.subject,
        name: identity.name || identity.email || "Unknown",
        email: identity.email,
        // Default new users as customers (not staff)
        isStaff: false,
        workerTag: false,
        instructorTag: false,
        toolHandlerTag: false,
        managerTag: false,
        rentalApprovedTag: false,
      });
    }
  },
});

// Get all users with V2 permissions (for dev/manager use)
export const getAllUsersV2 = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    // Only dev or managers can see all users
    const canViewAll = currentUser.isDev || hasV2Permission(currentUser, "manager");
    if (!canViewAll) return [];

    return await ctx.db.query("users").collect();
  },
});

// Update user role and permissions (for managers)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    isStaff: v.optional(v.boolean()),
    workerTag: v.optional(v.boolean()),
    instructorTag: v.optional(v.boolean()),
    toolHandlerTag: v.optional(v.boolean()),
    managerTag: v.optional(v.boolean()),
    rentalApprovedTag: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user and validate permissions
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("Current user not found");
    }

    // Only dev or managers can modify roles
    const canModifyRoles = currentUser.isDev || hasV2Permission(currentUser, "manager");
    if (!canModifyRoles) {
      throw new Error("Only managers can modify user roles");
    }

    // Get target user
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Validate manager tag requires worker tag
    if (args.managerTag && !args.workerTag) {
      throw new Error("Manager tag requires worker tag");
    }

    // Build update object with only provided fields
    const updateFields: any = {};
    if (args.isStaff !== undefined) updateFields.isStaff = args.isStaff;
    if (args.workerTag !== undefined) updateFields.workerTag = args.workerTag;
    if (args.instructorTag !== undefined) updateFields.instructorTag = args.instructorTag;
    if (args.toolHandlerTag !== undefined) updateFields.toolHandlerTag = args.toolHandlerTag;
    if (args.managerTag !== undefined) updateFields.managerTag = args.managerTag;
    if (args.rentalApprovedTag !== undefined) updateFields.rentalApprovedTag = args.rentalApprovedTag;

    await ctx.db.patch(args.userId, updateFields);

    return { success: true };
  },
});

// Promote customer to staff (common operation)
export const promoteToStaff = mutation({
  args: {
    userId: v.id("users"),
    workerTag: v.optional(v.boolean()),
    instructorTag: v.optional(v.boolean()),
    toolHandlerTag: v.optional(v.boolean()),
    managerTag: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user and validate permissions
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("Current user not found");
    }

    // Only dev or managers can promote users
    const canPromote = currentUser.isDev || hasV2Permission(currentUser, "manager");
    if (!canPromote) {
      throw new Error("Only managers can promote users to staff");
    }

    // Get target user
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Validate manager tag requires worker tag
    if (args.managerTag && !args.workerTag) {
      throw new Error("Manager tag requires worker tag");
    }

    // Set role fields
    await ctx.db.patch(args.userId, {
      isStaff: true,
      workerTag: args.workerTag ?? false,
      instructorTag: args.instructorTag ?? false,
      toolHandlerTag: args.toolHandlerTag ?? false,
      managerTag: args.managerTag ?? false,
      rentalApprovedTag: false, // Clear customer permissions when promoting to staff
    });

    return { success: true };
  },
});

// Get user statistics for role management dashboard
export const getUserStatistics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return null;

    // Only dev or managers can see statistics
    const canViewStats = currentUser.isDev || hasV2Permission(currentUser, "manager");
    if (!canViewStats) return null;

    const allUsers = await ctx.db.query("users").collect();

    // Calculate staff statistics
    const staffUsers = allUsers.filter(user => user.isStaff);
    const totalStaff = staffUsers.length;
    const managers = staffUsers.filter(user => user.managerTag).length;
    const workers = staffUsers.filter(user => user.workerTag).length;
    const instructors = staffUsers.filter(user => user.instructorTag).length;
    const toolHandlers = staffUsers.filter(user => user.toolHandlerTag).length;

    // Calculate customer statistics
    const customerUsers = allUsers.filter(user => !user.isStaff);
    const totalCustomers = customerUsers.length;
    const rentalApproved = customerUsers.filter(user => user.rentalApprovedTag).length;

    // Calculate active users (placeholder - would need actual activity tracking)
    const activeCustomers = 0; // TODO: Implement based on recent activity
    const pendingCustomers = 0; // TODO: Implement based on pending approvals

    return {
      staff: {
        total: totalStaff,
        managers,
        workers,
        instructors,
        toolHandlers,
      },
      customers: {
        total: totalCustomers,
        rentalApproved,
        active: activeCustomers,
        pending: pendingCustomers,
      },
    };
  },
});

// Demote staff to customer (common operation)
export const demoteToCustomer = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user and validate permissions
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("Current user not found");
    }

    // Only dev or managers can demote users
    const canDemote = currentUser.isDev || hasV2Permission(currentUser, "manager");
    if (!canDemote) {
      throw new Error("Only managers can demote users to customer");
    }

    // Get target user
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Clear role fields
    await ctx.db.patch(args.userId, {
      isStaff: false,
      workerTag: false,
      instructorTag: false,
      toolHandlerTag: false,
      managerTag: false,
      // Keep rentalApprovedTag as is (customer may still be rental approved)
    });

    return { success: true };
  },
});

// Get all course enrollments (for filtering customers by enrollment status)
export const getAllEnrollments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    // Only dev or managers can see all enrollments
    const canViewAll = currentUser.isDev || hasV2Permission(currentUser, "manager");
    if (!canViewAll) return [];

    return await ctx.db.query("course_enrollments").collect();
  },
});

// Development helper: Convert current user to dev (for testing)
export const makeCurrentUserDev = mutation({
  args: {},
  handler: async (ctx) => {
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

    await ctx.db.patch(user._id, {
      isDev: true,
      // Set up dev user with manager permissions for testing
      isStaff: true,
      workerTag: true,
      managerTag: true,
      instructorTag: false,
      toolHandlerTag: false,
      rentalApprovedTag: false,
    });

    return { success: true, message: "User converted to dev with manager permissions" };
  },
});

// Admin utility: List all users with dev role
export const listDevUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // Only dev users can see this
    if (!currentUser || !currentUser.isDev) return [];

    const allUsers = await ctx.db.query("users").collect();

    return allUsers
      .filter(user => user.isDev)
      .map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        isDev: user.isDev,
      }));
  },
});

// Admin utility: Remove dev role from specific user
export const removeDevRole = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // Only dev users can remove dev role
    if (!currentUser || !currentUser.isDev) {
      throw new Error("Only dev users can remove dev role");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Prevent removing dev role from yourself
    if (targetUser._id === currentUser._id) {
      throw new Error("Cannot remove dev role from yourself");
    }

    await ctx.db.patch(args.userId, {
      isDev: undefined,
    });

    return {
      success: true,
      message: `Removed dev role from ${targetUser.name}`,
      userName: targetUser.name,
    };
  },
});

// Admin utility: Remove dev role from ALL users except Gil Tsoran
export const cleanupDevRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // Only dev users can cleanup dev roles
    if (!currentUser || !currentUser.isDev) {
      throw new Error("Only dev users can cleanup dev roles");
    }

    const allUsers = await ctx.db.query("users").collect();
    const devUsers = allUsers.filter(user => user.isDev);

    const gilTsoranNames = ["גיל צורן", "Gil Tsoran", "Gil Tzoran"];
    const usersToClean = devUsers.filter(user =>
      !gilTsoranNames.some(name =>
        user.name?.includes(name) || name.includes(user.name || "")
      )
    );

    const cleaned: string[] = [];
    for (const user of usersToClean) {
      await ctx.db.patch(user._id, {
        isDev: undefined,
      });
      cleaned.push(user.name || user.email || "Unknown");
    }

    return {
      success: true,
      message: `Removed dev role from ${cleaned.length} user(s)`,
      cleanedUsers: cleaned,
      remainingDevUsers: devUsers.length - cleaned.length,
    };
  },
});

