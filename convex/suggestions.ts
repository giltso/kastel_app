import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Create a new suggestion from user feedback
export const createSuggestion = mutation({
  args: {
    location: v.string(),
    pageContext: v.string(),
    problem: v.string(),
    solution: v.string(),
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

    // Create a simple hash for similarity detection (based on problem and solution)
    const contentForHashing = `${args.problem.toLowerCase().trim()} ${args.solution.toLowerCase().trim()}`;
    const similarityHash = await generateSimilarityHash(contentForHashing);

    // Create the suggestion
    const suggestionId = await ctx.db.insert("suggestions", {
      createdBy: currentUser._id,
      location: args.location,
      pageContext: args.pageContext,
      problem: args.problem,
      solution: args.solution,
      status: "pending",
      similarityHash,
    });

    // Look for similar suggestions and update relationships
    await updateSimilarSuggestions(ctx, suggestionId, similarityHash);

    return suggestionId;
  },
});

// Get suggestions (accessible to dev role and suggestion creators)
export const getSuggestions = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("reviewed"), v.literal("implemented"), v.literal("rejected"))),
    limit: v.optional(v.number()),
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

    const isDev = currentUser.role === "dev";
    const userId = currentUser._id;

    // Get all suggestions first
    const allSuggestions = args.status 
      ? await ctx.db
          .query("suggestions")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(args.limit || 100)
      : await ctx.db
          .query("suggestions")
          .order("desc")
          .take(args.limit || 100);

    // Filter suggestions based on access rights:
    // - Dev can see all suggestions
    // - Non-dev users can only see suggestions they created
    const suggestions = isDev 
      ? allSuggestions 
      : allSuggestions.filter(suggestion => suggestion.createdBy === userId);

    // Enrich with user information
    const enrichedSuggestions = await Promise.all(
      suggestions.map(async (suggestion) => {
        const createdByUser = await ctx.db.get(suggestion.createdBy);
        const reviewedByUser = suggestion.reviewedBy ? await ctx.db.get(suggestion.reviewedBy) : null;
        
        return {
          ...suggestion,
          createdByUser: createdByUser ? {
            name: createdByUser.name,
            email: createdByUser.email,
            role: createdByUser.role,
          } : null,
          reviewedByUser: reviewedByUser ? {
            name: reviewedByUser.name,
            email: reviewedByUser.email,
          } : null,
        };
      })
    );

    return enrichedSuggestions;
  },
});

// Update suggestion status (developer/admin only)
export const updateSuggestionStatus = mutation({
  args: {
    suggestionId: v.id("suggestions"),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("implemented"), v.literal("rejected")),
    reviewNotes: v.optional(v.string()),
    implementationDate: v.optional(v.string()),
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

    // Only dev role can update suggestions
    if (currentUser.role !== "dev") {
      throw new ConvexError("Access denied: Developer access required");
    }

    // Check if suggestion exists
    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) {
      throw new ConvexError("Suggestion not found");
    }

    // Update the suggestion
    await ctx.db.patch(args.suggestionId, {
      status: args.status,
      reviewedBy: currentUser._id,
      reviewNotes: args.reviewNotes,
      implementationDate: args.implementationDate,
    });

    return { success: true };
  },
});

// Get suggestions grouped by similarity
export const getSuggestionsGrouped = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser || currentUser.role !== "dev") {
      throw new ConvexError("Access denied: Developer access required");
    }

    const suggestions = await ctx.db.query("suggestions").collect();
    
    // Group suggestions by similarity hash
    const grouped = suggestions.reduce((groups, suggestion) => {
      const hash = suggestion.similarityHash || "unique";
      if (!groups[hash]) {
        groups[hash] = [];
      }
      groups[hash].push(suggestion);
      return groups;
    }, {} as Record<string, typeof suggestions>);

    // Enrich with user data and sort by group size
    const enrichedGroups = await Promise.all(
      Object.entries(grouped).map(async ([hash, groupSuggestions]) => {
        const enriched = await Promise.all(
          groupSuggestions.map(async (suggestion) => {
            const createdByUser = await ctx.db.get(suggestion.createdBy);
            return {
              ...suggestion,
              createdByUser: createdByUser ? {
                name: createdByUser.name,
                email: createdByUser.email,
                role: createdByUser.role,
              } : null,
            };
          })
        );

        return {
          hash,
          count: groupSuggestions.length,
          suggestions: enriched,
        };
      })
    );

    // Sort groups by count (most similar suggestions first)
    return enrichedGroups.sort((a, b) => b.count - a.count);
  },
});

// Helper function to generate similarity hash
async function generateSimilarityHash(content: string): Promise<string> {
  // Simple hash based on keywords and content length
  // In a production system, you might use a more sophisticated approach like cosine similarity
  const words = content.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  const uniqueWords = [...new Set(words)].sort();
  const keywordString = uniqueWords.slice(0, 10).join(''); // Use top 10 unique words
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < keywordString.length; i++) {
    const char = keywordString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

// Helper function to update similar suggestions relationships
async function updateSimilarSuggestions(
  ctx: any, 
  newSuggestionId: any, 
  similarityHash: string
) {
  // Find suggestions with the same similarity hash
  const similarSuggestions = await ctx.db
    .query("suggestions")
    .withIndex("by_similarityHash", (q: any) => q.eq("similarityHash", similarityHash))
    .collect();

  if (similarSuggestions.length > 1) {
    // Update all suggestions in this group to reference each other
    const suggestionIds = similarSuggestions.map((s: any) => s._id);
    
    for (const suggestion of similarSuggestions) {
      const relatedIds = suggestionIds.filter((id: any) => id !== suggestion._id);
      await ctx.db.patch(suggestion._id, {
        relatedSuggestions: relatedIds,
      });
    }
  }
}