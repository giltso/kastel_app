import { query } from "./_generated/server";
import { v } from "convex/values";

// Basic tools query for V2 system
export const listTools = query({
  args: {},
  handler: async (ctx) => {
    // For now, return empty array until tools are properly implemented
    return [];
  },
});

// Get single tool
export const getTool = query({
  args: { id: v.id("tools") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});