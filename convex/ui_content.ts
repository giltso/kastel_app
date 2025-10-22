import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getEffectiveV2Role } from "./users_v2";

// Valid languages supported by the system
const VALID_LANGUAGES = ["en", "he", "ru", "fr"] as const;
type Language = typeof VALID_LANGUAGES[number];

/**
 * Save or update UI content for a specific key and language
 * Only managers can edit content
 */
export const saveUIContent = mutation({
  args: {
    key: v.string(),        // "home.aboutUs", "luz.helpText"
    content: v.string(),    // Edited text
    language: v.string(),   // "he", "en", "ru", "fr"
  },
  handler: async (ctx, args) => {
    // 1. Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Must be authenticated to edit content");
    }

    // 2. Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // 3. Check manager permissions
    const effective = getEffectiveV2Role(user);
    if (!effective.managerTag || !effective.isStaff) {
      throw new ConvexError("Only managers can edit content");
    }

    // 4. Validate language
    if (!VALID_LANGUAGES.includes(args.language as Language)) {
      throw new ConvexError(`Invalid language: ${args.language}`);
    }

    // 5. Validate content is not empty
    if (args.content.trim().length === 0) {
      throw new ConvexError("Content cannot be empty");
    }

    // 6. Get existing entry or prepare for new one
    const existing = await ctx.db
      .query("ui_content")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    // 7. Check if content actually changed
    const contentKey = `content_${args.language}` as keyof typeof existing;
    const currentContent = existing?.[contentKey] as string | undefined;
    const contentChanged = currentContent !== args.content;

    // 8. Build update object
    const updates: Record<string, any> = {
      [`content_${args.language}`]: args.content,
      lastEditedBy: user._id,
      lastEditedAt: Date.now(),
      lastEditedLanguage: args.language,
      // Always clear "needs translation" flag for the edited language
      [`needsTranslation_${args.language}`]: false,
    };

    // 9. Mark OTHER languages as needing translation ONLY if content changed
    // If content didn't change (open/close without edit), this clears the flag without re-flagging others
    if (contentChanged) {
      VALID_LANGUAGES.forEach(lang => {
        if (lang !== args.language) {
          updates[`needsTranslation_${lang}`] = true;
        }
      });
    }

    // 10. Save to database
    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return { success: true, updated: true };
    } else {
      await ctx.db.insert("ui_content", {
        key: args.key,
        namespace: "ui_content",
        ...updates,
      } as any);
      return { success: true, updated: false };
    }
  },
});

/**
 * Get content for a specific key and language
 * Returns null if no database override exists (component will fall back to translation file)
 */
export const getUIContent = query({
  args: {
    key: v.string(),
    language: v.string()
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("ui_content")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    // If no database entry, component will fall back to translation file
    if (!content) return null;

    const langKey = `content_${args.language}` as keyof typeof content;
    const needsTransKey = `needsTranslation_${args.language}` as keyof typeof content;

    return {
      text: content[langKey] as string | undefined,
      needsTranslation: (content[needsTransKey] as boolean | undefined) || false,
      lastEditedAt: content.lastEditedAt,
      lastEditedBy: content.lastEditedBy,
    };
  },
});

/**
 * Get all UI content (admin/debug only)
 * For translation management dashboard
 */
export const getAllUIContent = query({
  handler: async (ctx) => {
    // Get current user for permission check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Must be authenticated to view all content");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const effective = getEffectiveV2Role(user);
    if (!effective.managerTag || !effective.isStaff) {
      throw new ConvexError("Only managers can view all content");
    }

    return await ctx.db.query("ui_content").collect();
  },
});
