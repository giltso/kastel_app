import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// V2 Role System - Tag-based permissions from REDESIGN_V2.md

// Helper function to get effective role for V2 system
export function getEffectiveV2Role(user: Doc<"users">) {
  // Dev role emulation
  if (user.role === "dev") {
    return {
      isStaff: user.emulatingIsStaff ?? false,
      workerTag: user.emulatingWorkerTag ?? false,
      instructorTag: user.emulatingInstructorTag ?? false,
      toolHandlerTag: user.emulatingToolHandlerTag ?? false,
      managerTag: user.emulatingManagerTag ?? false,
      rentalApprovedTag: user.emulatingRentalApprovedTag ?? false,
    };
  }

  // Regular user V2 permissions
  return {
    isStaff: user.isStaff ?? false,
    workerTag: user.workerTag ?? false,
    instructorTag: user.instructorTag ?? false,
    toolHandlerTag: user.toolHandlerTag ?? false,
    managerTag: user.managerTag ?? false,
    rentalApprovedTag: user.rentalApprovedTag ?? false,
  };
}

// Helper function to check if user has specific permission
export function hasV2Permission(user: Doc<"users">, permission: string): boolean {
  const effective = getEffectiveV2Role(user);

  switch (permission) {
    case "staff":
      return effective.isStaff;
    case "worker":
      return effective.isStaff && effective.workerTag;
    case "instructor":
      return effective.isStaff && effective.instructorTag;
    case "tool_handler":
      return effective.isStaff && effective.toolHandlerTag;
    case "manager":
      return effective.isStaff && effective.workerTag && effective.managerTag;
    case "rental_approved":
      return !effective.isStaff && effective.rentalApprovedTag;
    case "tool_rentals":
      // Tool rental access: Staff+ToolHandler OR Customer+RentalApproved
      return (effective.isStaff && effective.toolHandlerTag) ||
             (!effective.isStaff && effective.rentalApprovedTag);
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

    if (!user) return null;

    const effective = getEffectiveV2Role(user);

    return {
      ...user,
      effectiveRole: effective,
    };
  },
});

// Switch role emulation for dev users (V2 system)
export const switchV2Role = mutation({
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

    if (!user || user.role !== "dev") {
      throw new Error("Only dev users can switch roles");
    }

    // Validate manager tag requires worker tag
    if (args.managerTag && !args.workerTag) {
      throw new Error("Manager tag requires worker tag");
    }

    await ctx.db.patch(user._id, {
      emulatingIsStaff: args.isStaff,
      emulatingWorkerTag: args.workerTag,
      emulatingInstructorTag: args.instructorTag,
      emulatingToolHandlerTag: args.toolHandlerTag,
      emulatingManagerTag: args.managerTag,
      emulatingRentalApprovedTag: args.rentalApprovedTag,
    });
  },
});

// Create or update user for V2 system
export const createOrUpdateUserV2 = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    role: v.optional(v.literal("dev")),
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
        role: args.role,
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
        role: args.role || "dev",
        isStaff: args.isStaff,
        workerTag: args.workerTag,
        instructorTag: args.instructorTag,
        toolHandlerTag: args.toolHandlerTag,
        managerTag: args.managerTag,
        rentalApprovedTag: args.rentalApprovedTag,
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
    const canViewAll = currentUser.role === "dev" || hasV2Permission(currentUser, "manager");
    if (!canViewAll) return [];

    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      ...user,
      effectiveRole: getEffectiveV2Role(user),
    }));
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
    const canModifyRoles = currentUser.role === "dev" || hasV2Permission(currentUser, "manager");
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
    const canPromote = currentUser.role === "dev" || hasV2Permission(currentUser, "manager");
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
    const canViewStats = currentUser.role === "dev" || hasV2Permission(currentUser, "manager");
    if (!canViewStats) return null;

    const allUsers = await ctx.db.query("users").collect();

    // Calculate staff statistics
    const staffUsers = allUsers.filter(user => getEffectiveV2Role(user).isStaff);
    const totalStaff = staffUsers.length;
    const managers = staffUsers.filter(user => getEffectiveV2Role(user).managerTag).length;
    const workers = staffUsers.filter(user => getEffectiveV2Role(user).workerTag).length;
    const instructors = staffUsers.filter(user => getEffectiveV2Role(user).instructorTag).length;
    const toolHandlers = staffUsers.filter(user => getEffectiveV2Role(user).toolHandlerTag).length;

    // Calculate customer statistics
    const customerUsers = allUsers.filter(user => !getEffectiveV2Role(user).isStaff);
    const totalCustomers = customerUsers.length;
    const rentalApproved = customerUsers.filter(user => getEffectiveV2Role(user).rentalApprovedTag).length;

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
      role: "dev",
      // Set up dev user with manager permissions for testing
      emulatingIsStaff: true,
      emulatingWorkerTag: true,
      emulatingManagerTag: true,
      emulatingInstructorTag: false,
      emulatingToolHandlerTag: false,
      emulatingRentalApprovedTag: false,
    });

    return { success: true, message: "User converted to dev with manager permissions" };
  },
});