import { query } from "./_generated/server";
import { v } from "convex/values";

// Basic courses query for V2 system
export const listCourses = query({
  args: {},
  handler: async (ctx) => {
    // For now, return empty array until courses are properly implemented
    return [];
  },
});

// Get single course
export const getCourse = query({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});