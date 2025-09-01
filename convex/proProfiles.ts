import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Create a new professional profile
export const createProProfile = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    specialties: v.array(v.string()),
    experience: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    availability: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user: any = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to create pro profile (has proTag or is dev)
    if (!user.proTag && user.role !== "dev") {
      throw new Error("Only users with pro tag can create professional profiles");
    }

    // Check if user already has a profile
    const existingProfile = await ctx.db
      .query("pro_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (existingProfile) {
      throw new Error("User already has a professional profile");
    }

    return await ctx.db.insert("pro_profiles", {
      userId: user._id,
      title: args.title,
      description: args.description,
      specialties: args.specialties,
      experience: args.experience,
      contactPhone: args.contactPhone,
      contactEmail: args.contactEmail,
      hourlyRate: args.hourlyRate,
      availability: args.availability,
      certifications: args.certifications,
      isActive: true,
    });
  },
});

// Update an existing professional profile
export const updateProProfile = mutation({
  args: {
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    experience: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    availability: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user: any = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Find the user's profile
    const profile: any = await ctx.db
      .query("pro_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!profile) {
      throw new Error("Professional profile not found");
    }

    // Check if user has permission to edit this profile
    if (user.role !== "dev" && profile.userId !== user._id) {
      throw new Error("Not authorized to edit this profile");
    }

    // Filter out undefined values
    const updates = Object.fromEntries(
      Object.entries(args).filter(([_, value]) => value !== undefined)
    );

    return await ctx.db.patch(profile._id, updates);
  },
});

// Get current user's professional profile
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user: any = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      return null;
    }

    const profile: any = await ctx.db
      .query("pro_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!profile) {
      return null;
    }

    // Return profile with user information
    return {
      ...profile,
      user: {
        _id: user._id,
        name: user?.name,
        email: user?.email,
      },
    };
  },
});

// Get all active professional profiles for search/browse
export const getActiveProfiles = query({
  args: {
    specialty: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("pro_profiles")
      .withIndex("by_isActive", (q) => q.eq("isActive", true));

    const profiles = await query.collect();

    // Filter by specialty if provided
    let filteredProfiles = profiles;
    if (args.specialty) {
      filteredProfiles = profiles.filter((profile) =>
        profile.specialties.some((s) => 
          s.toLowerCase().includes(args.specialty!.toLowerCase())
        )
      );
    }

    // Apply limit if provided
    if (args.limit) {
      filteredProfiles = filteredProfiles.slice(0, args.limit);
    }

    // Get user information for each profile
    const profilesWithUsers = await Promise.all(
      filteredProfiles.map(async (profile) => {
        const user: any = await ctx.db.get(profile.userId);
        return {
          ...profile,
          user: user ? {
            _id: user._id,
            name: user.name,
            email: user.email,
          } : null,
        };
      })
    );

    return profilesWithUsers;
  },
});

// Get a specific professional profile by ID
export const getProfileById = query({
  args: {
    profileId: v.id("pro_profiles"),
  },
  handler: async (ctx, args) => {
    const profile: any = await ctx.db.get(args.profileId);
    if (!profile || !profile.isActive) {
      return null;
    }

    // Get user information
    const user: any = await ctx.db.get(profile.userId);
    if (!user) {
      return null;
    }

    return {
      ...profile,
      user: {
        _id: user._id,
        name: user?.name,
        email: user?.email,
      },
    };
  },
});

// Search professional profiles
export const searchProfiles = query({
  args: {
    searchTerm: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    minHourlyRate: v.optional(v.number()),
    maxHourlyRate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("pro_profiles")
      .withIndex("by_isActive", (q) => q.eq("isActive", true));

    let profiles = await query.collect();

    // Apply search term filter
    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase();
      profiles = profiles.filter((profile) => 
        profile.title.toLowerCase().includes(term) ||
        profile.description.toLowerCase().includes(term) ||
        profile.specialties.some((s) => s.toLowerCase().includes(term))
      );
    }

    // Apply specialty filter
    if (args.specialties && args.specialties.length > 0) {
      profiles = profiles.filter((profile) =>
        args.specialties!.some((specialty) =>
          profile.specialties.some((s) =>
            s.toLowerCase().includes(specialty.toLowerCase())
          )
        )
      );
    }

    // Apply hourly rate filters
    if (args.minHourlyRate !== undefined) {
      profiles = profiles.filter((profile) => 
        profile.hourlyRate !== undefined && profile.hourlyRate >= args.minHourlyRate!
      );
    }

    if (args.maxHourlyRate !== undefined) {
      profiles = profiles.filter((profile) => 
        profile.hourlyRate !== undefined && profile.hourlyRate <= args.maxHourlyRate!
      );
    }

    // Apply limit
    if (args.limit) {
      profiles = profiles.slice(0, args.limit);
    }

    // Get user information for each profile
    const profilesWithUsers = await Promise.all(
      profiles.map(async (profile) => {
        const user: any = await ctx.db.get(profile.userId);
        return {
          ...profile,
          user: user ? {
            _id: user._id,
            name: user.name,
            email: user.email,
          } : null,
        };
      })
    );

    return profilesWithUsers;
  },
});