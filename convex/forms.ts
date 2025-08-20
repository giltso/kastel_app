import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

const formFieldSchema = v.object({
  id: v.string(),
  label: v.string(),
  type: v.union(v.literal("text"), v.literal("number"), v.literal("date"), v.literal("select")),
  required: v.boolean(),
  options: v.optional(v.array(v.string())),
});

export const createForm = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("work_hours"), v.literal("team_report"), v.literal("custom")),
    fields: v.array(formFieldSchema),
  },
  handler: async (ctx, args) => {
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

    const formId = await ctx.db.insert("forms", {
      title: args.title,
      description: args.description,
      type: args.type,
      createdBy: user._id,
      isActive: true,
      fields: args.fields,
    });

    return await ctx.db.get(formId);
  },
});

export const listForms = query({
  args: {},
  handler: async (ctx) => {
    const forms = await ctx.db
      .query("forms")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    
    // Get creator details for each form
    const formsWithCreators = await Promise.all(
      forms.map(async (form) => {
        const creator = await ctx.db.get(form.createdBy);
        return {
          ...form,
          creator: creator,
        };
      })
    );

    return formsWithCreators;
  },
});

export const getForm = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) return null;

    const creator = await ctx.db.get(form.createdBy);
    return {
      ...form,
      creator: creator,
    };
  },
});

export const submitForm = mutation({
  args: {
    formId: v.id("forms"),
    data: v.any(), // Dynamic object based on form fields
  },
  handler: async (ctx, args) => {
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

    const submissionId = await ctx.db.insert("form_submissions", {
      formId: args.formId,
      submittedBy: user._id,
      data: args.data,
      submittedAt: Date.now(),
    });

    return await ctx.db.get(submissionId);
  },
});

export const getFormSubmissions = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("form_submissions")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .collect();

    const submissionsWithUsers = await Promise.all(
      submissions.map(async (submission) => {
        const submitter = await ctx.db.get(submission.submittedBy);
        return {
          ...submission,
          submitter: submitter,
        };
      })
    );

    return submissionsWithUsers;
  },
});