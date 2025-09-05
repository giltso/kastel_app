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
                         !existingUser.role ||
                         !existingUser.baseRole; // Add baseRole if missing
      
      if (needsUpdate) {
        // Initialize new hierarchical role system if missing
        let baseRole = existingUser.baseRole;
        let tags = existingUser.tags || [];
        
        if (!baseRole) {
          // Map legacy role to new hierarchical system
          const legacyRole = existingUser.role || "dev";
          if (legacyRole === "manager") {
            baseRole = "worker";
            if (!tags.includes("manager")) tags.push("manager");
          } else if (legacyRole === "worker") {
            baseRole = "worker";
          } else if (legacyRole === "customer") {
            baseRole = "customer";
          } else {
            baseRole = "guest"; // dev maps to guest base with full interface access
          }
          
          // Migrate proTag to tags array
          if (existingUser.proTag && !tags.includes("pro")) {
            tags.push("pro");
          }
        }
        
        const preferredInterface: "guest" | "customer" | "staff" = existingUser.preferredInterface || determineInterfaceFromRole(baseRole, tags);
        
        await ctx.db.patch(existingUser._id, { 
          name: clerkName,
          email: clerkEmail,
          role: existingUser.role || "dev", // Keep legacy for compatibility
          baseRole, // Initialize new hierarchical system
          tags,
          preferredInterface,
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
      role: "dev", // Legacy: Default role for new users (dev for easier testing)
      baseRole: "guest", // NEW: Dev users start with guest base but get full access via legacy role
      tags: [], // NEW: No tags by default
      preferredInterface: "staff", // NEW: Dev users see staff interface by default
    });

    return await ctx.db.get(userId);
  },
});

// Get current user's profile and effective role/permissions
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

    // NEW: Calculate effective role and permissions from hierarchical system
    let baseRole = "guest";
    let effectiveTags: string[] = [];
    let preferredInterface = "guest";

    // Handle new hierarchical role system if available
    if (user.baseRole) {
      // Check for emulation (dev users only)
      if (user.role === "dev" && user.emulatingBaseRole) {
        baseRole = user.emulatingBaseRole;
        effectiveTags = user.emulatingTags || [];
      } else {
        baseRole = user.baseRole;
        effectiveTags = user.tags || [];
      }
      preferredInterface = user.preferredInterface || determineInterfaceFromRole(baseRole, effectiveTags);
    } else {
      // LEGACY: Handle old single role system
      const legacyRole = user.role === "dev" && (user.emulatingRole || user.emulatingBaseRole)
        ? (user.emulatingRole || user.emulatingBaseRole)
        : (user.role || "guest");
      
      // Map legacy roles to new hierarchical system
      if (legacyRole === "manager") {
        baseRole = "worker";
        effectiveTags = ["manager"];
      } else if (legacyRole === "worker") {
        baseRole = "worker";
        effectiveTags = [];
      } else if (legacyRole === "customer") {
        baseRole = "customer";
        effectiveTags = [];
      } else {
        baseRole = "guest";
        effectiveTags = [];
      }
      
      // Migrate proTag to new tags system
      if (user.proTag && !effectiveTags.includes("pro")) {
        effectiveTags.push("pro");
      }
      
      // Determine interface from legacy role
      preferredInterface = (baseRole === "worker" || effectiveTags.includes("manager"))
        ? "staff" 
        : baseRole === "customer" 
          ? "customer" 
          : "guest";
    }

    // Calculate permission flags based on hierarchical roles
    const hasGuestAccess = true; // Everyone has guest access
    const hasCustomerAccess = baseRole === "customer" || baseRole === "worker";
    const hasWorkerAccess = baseRole === "worker";
    const hasManagerAccess = hasWorkerAccess && effectiveTags.includes("manager");
    const hasProAccess = hasWorkerAccess && effectiveTags.includes("pro");
    const hasInstructorAccess = hasWorkerAccess && effectiveTags.includes("instructor");
    const hasLeadAccess = hasWorkerAccess && effectiveTags.includes("lead");

    return {
      ...user,
      // NEW: Hierarchical role information
      baseRole,
      effectiveTags,
      preferredInterface,
      // Access level flags
      hasGuestAccess,
      hasCustomerAccess, 
      hasWorkerAccess,
      hasManagerAccess,
      hasProAccess,
      hasInstructorAccess,
      hasLeadAccess,
      // LEGACY: Keep for backward compatibility
      effectiveRole: hasManagerAccess ? "manager" : baseRole,
      hasWorkerRole: hasWorkerAccess,
      hasManagerRole: hasManagerAccess,
      hasCustomerRole: hasCustomerAccess,
      hasGuestRole: hasGuestAccess,
      hasProTag: hasProAccess,
      // Permission context
      permissions: calculateUserPermissions(baseRole, effectiveTags),
    };
  },
});

// Helper function to determine interface from hierarchical role + tags
function determineInterfaceFromRole(baseRole: string, tags: string[]): "guest" | "customer" | "staff" {
  if (baseRole === "worker" || tags.includes("manager")) {
    return "staff";
  }
  if (baseRole === "customer") {
    return "customer";  
  }
  return "guest";
}

// Helper function to get effective role for legacy compatibility
function getEffectiveRole(user: any): string {
  if (user.baseRole) {
    // NEW: Use hierarchical system
    if (user.role === "dev" && user.emulatingBaseRole) {
      const tags = user.emulatingTags || [];
      if (user.emulatingBaseRole === "worker" && tags.includes("manager")) {
        return "manager";
      }
      return user.emulatingBaseRole;
    } else {
      const tags = user.tags || [];
      if (user.baseRole === "worker" && tags.includes("manager")) {
        return "manager";
      }
      return user.baseRole;
    }
  } else {
    // LEGACY: Handle old single role system  
    return user.role === "dev" && (user.emulatingRole || user.emulatingBaseRole)
      ? (user.emulatingRole || user.emulatingBaseRole)
      : (user.role || "guest");
  }
}

// Helper function to calculate permissions based on hierarchical role + tags
function calculateUserPermissions(baseRole: string, tags: string[]): string[] {
  const permissions = new Set<string>();
  
  // Base permissions for all users (guest level)
  permissions.add("view_public_services");
  permissions.add("create_guest_request");
  permissions.add("track_own_requests");
  
  // Customer permissions (builds on guest)
  if (baseRole === "customer" || baseRole === "worker") {
    permissions.add("create_customer_request");
    permissions.add("access_customer_portal");
  }
  
  // Worker permissions (builds on customer)
  if (baseRole === "worker") {
    permissions.add("handle_requests");
    permissions.add("create_event_draft");
    permissions.add("create_ticket");
    permissions.add("comment_on_tickets");
    permissions.add("access_worker_portal");
    permissions.add("access_staff_interface");
    permissions.add("view_shifts");
    permissions.add("self_assign_shifts");
    permissions.add("request_shift_swaps");
  }
  
  // Manager tag permissions (requires worker base + manager tag)
  if (baseRole === "worker" && tags.includes("manager")) {
    permissions.add("approve_requests");
    permissions.add("assign_workers");
    permissions.add("approve_events");
    permissions.add("manage_events");
    permissions.add("close_tickets");
    permissions.add("manage_user_roles");
    permissions.add("access_manager_portal");
    permissions.add("embedded_approvals"); // Can see embedded approvals in calendar
    permissions.add("view_all_events"); // See all operational events
    permissions.add("manage_shifts");
    permissions.add("approve_shift_swaps");
  }
  
  // Pro tag permissions (requires worker base + pro tag)
  if (baseRole === "worker" && tags.includes("pro")) {
    permissions.add("golden_time_requests");
    permissions.add("advanced_scheduling");
    permissions.add("mentor_workers");
    permissions.add("priority_shift_selection");
  }
  
  // Instructor tag permissions (requires worker base + instructor tag)
  if (baseRole === "worker" && tags.includes("instructor")) {
    permissions.add("create_courses");
    permissions.add("manage_courses");
    permissions.add("assign_course_assistants");
  }
  
  // Lead tag permissions (requires worker base + lead tag)
  if (baseRole === "worker" && tags.includes("lead")) {
    permissions.add("team_coordination");
    permissions.add("worker_mentoring");
    permissions.add("shift_planning");
  }
  
  // Specialist tag permissions (requires worker base + specialist tag)
  if (baseRole === "worker" && tags.includes("specialist")) {
    permissions.add("advanced_tool_access");
    permissions.add("equipment_maintenance");
    permissions.add("quality_assurance");
  }
  
  return Array.from(permissions);
}

// NEW: Update user base role and tags (hierarchical system)
export const updateUserHierarchicalRole = mutation({
  args: {
    userId: v.id("users"),
    baseRole: v.union(
      v.literal("guest"), 
      v.literal("customer"), 
      v.literal("worker")
    ),
    tags: v.optional(v.array(v.union(
      v.literal("manager"),
      v.literal("pro"),
      v.literal("instructor"), 
      v.literal("lead"),
      v.literal("specialist")
    ))),
    preferredInterface: v.optional(v.union(
      v.literal("staff"),
      v.literal("customer"),
      v.literal("guest")
    )),
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

    // Check if user has permission to update roles
    const currentUserData = await ctx.runQuery("users:getCurrentUser" as any);
    if (!currentUserData?.permissions?.includes("manage_user_roles") && currentUser.role !== "dev") {
      throw new ConvexError("Only managers can update user roles");
    }

    // Validate tag combinations (manager tag requires worker base)
    const tags = args.tags || [];
    if (tags.includes("manager") && args.baseRole !== "worker") {
      throw new ConvexError("Manager tag requires worker base role");
    }
    if (tags.includes("pro") && args.baseRole !== "worker") {
      throw new ConvexError("Pro tag requires worker base role");
    }
    if (tags.includes("instructor") && args.baseRole !== "worker") {
      throw new ConvexError("Instructor tag requires worker base role");
    }

    // Get target user
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError("Target user not found");
    }

    // Update the base role and tags
    await ctx.db.patch(args.userId, {
      baseRole: args.baseRole,
      tags: tags,
      preferredInterface: (args.preferredInterface || determineInterfaceFromRole(args.baseRole, tags)) as "guest" | "customer" | "staff",
    });

    return { success: true };
  },
});

// NEW: Add tag to user (for incremental tag management)
export const addUserTag = mutation({
  args: {
    userId: v.id("users"),
    tag: v.union(v.literal("manager"), v.literal("pro"), v.literal("instructor"), v.literal("lead"), v.literal("specialist")),
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

    // Check permissions
    const currentUserData = await ctx.runQuery("users:getCurrentUser" as any);
    if (!currentUserData?.permissions?.includes("manage_user_roles") && currentUser.role !== "dev") {
      throw new ConvexError("Only managers can modify user roles");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError("Target user not found");
    }

    // Validate tag can be added (worker-only tags require worker base)
    if (["manager", "pro", "instructor", "lead", "specialist"].includes(args.tag) && 
        (!targetUser.baseRole || targetUser.baseRole !== "worker")) {
      throw new ConvexError(`${args.tag} tag requires worker base role`);
    }

    // Add tag if not already present
    const currentTags = targetUser.tags || [];
    if (!currentTags.includes(args.tag)) {
      const newTags = [...currentTags, args.tag];
      await ctx.db.patch(args.userId, {
        tags: newTags,
        preferredInterface: (targetUser.preferredInterface || determineInterfaceFromRole(targetUser.baseRole || "guest", newTags)) as "guest" | "customer" | "staff",
      });
    }

    return { success: true };
  },
});

// NEW: Remove tag from user
export const removeUserTag = mutation({
  args: {
    userId: v.id("users"),
    tag: v.union(v.literal("manager"), v.literal("pro"), v.literal("instructor"), v.literal("lead"), v.literal("specialist")),
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

    // Check permissions
    const currentUserData = await ctx.runQuery("users:getCurrentUser" as any);
    if (!currentUserData?.permissions?.includes("manage_user_roles") && currentUser.role !== "dev") {
      throw new ConvexError("Only managers can modify user roles");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError("Target user not found");
    }

    // Remove tag
    const currentTags = targetUser.tags || [];
    const newTags = currentTags.filter(t => t !== args.tag);

    await ctx.db.patch(args.userId, {
      tags: newTags,
      preferredInterface: (targetUser.preferredInterface || determineInterfaceFromRole(targetUser.baseRole || "guest", newTags)) as "guest" | "customer" | "staff",
    });

    return { success: true };
  },
});

// NEW: Update user tags
export const updateUserTags = mutation({
  args: {
    userId: v.id("users"),
    tags: v.array(v.union(v.literal("pro"), v.literal("instructor"), v.literal("lead"), v.literal("specialist"))),
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

    // Check permissions
    const currentUserData = await ctx.runQuery("users:getCurrentUser" as any);
    if (!currentUserData?.permissions?.includes("manage_user_roles") && currentUser.role !== "dev") {
      throw new ConvexError("Only managers can update user tags");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError("Target user not found");
    }

    await ctx.db.patch(args.userId, {
      tags: args.tags,
    });

    return { success: true };
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
    const effectiveRole = getEffectiveRole(currentUser);

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

    // Only dev role can switch emulating role (check the old role field for dev users)
    if (user.role !== "dev") {
      throw new ConvexError("Only dev role can emulate other roles");
    }

    // Convert the legacy emulation to new hierarchical system
    let emulatingBaseRole: "guest" | "customer" | "worker" | undefined;
    let emulatingTags: ("manager" | "pro" | "instructor" | "lead" | "specialist")[] = [];

    if (args.emulatingRole) {
      switch (args.emulatingRole) {
        case "guest":
          emulatingBaseRole = "guest";
          break;
        case "customer":
          emulatingBaseRole = "customer";
          break;
        case "worker":
          emulatingBaseRole = "worker";
          break;
        case "manager":
          emulatingBaseRole = "worker";
          emulatingTags = ["manager"];
          break;
      }
    }

    await ctx.db.patch(user._id, {
      emulatingBaseRole,
      emulatingTags,
      // Clear old field for migration
      emulatingRole: undefined,
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

    // Update both old proTag field and new tags array for compatibility
    const currentTags = user.tags || [];
    const newTags: ("manager" | "pro" | "instructor" | "lead" | "specialist")[] = args.proTag 
      ? currentTags.includes('pro') ? currentTags : [...currentTags, 'pro']
      : currentTags.filter(tag => tag !== 'pro');

    await ctx.db.patch(user._id, {
      proTag: args.proTag, // Keep legacy field
      tags: newTags, // Update new hierarchical system
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
    const effectiveRole = getEffectiveRole(currentUser);

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

    const effectiveRole = getEffectiveRole(currentUser);

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

    const effectiveRole = getEffectiveRole(user);

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
