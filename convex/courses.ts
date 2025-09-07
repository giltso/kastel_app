import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// Get current user with role-based permissions
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError("User not found");
  }

  return user;
}

// Get effective role (considering dev emulation)
function getEffectiveRole(user: any): string {
  if (user.baseRole) {
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
    return user.role === "dev" && (user.emulatingRole || user.emulatingBaseRole)
      ? (user.emulatingRole || user.emulatingBaseRole)
      : (user.role || "guest");
  }
}

// Check if user has operational permissions (worker or manager)
function hasOperationalAccess(role: string) {
  return role === "worker" || role === "manager";
}

// List courses (role-based filtering)
export const listCourses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (hasOperationalAccess(role)) {
      // Staff see all courses with full details
      const courses = await ctx.db.query("courses").collect();
      
      // Enrich with instructor and assistant data
      const enrichedCourses = await Promise.all(
        courses.map(async (course) => {
          const instructor = await ctx.db.get(course.instructorId);
          const assistants = course.assistantIds 
            ? await Promise.all(course.assistantIds.map(id => ctx.db.get(id)))
            : [];
          
          // Get enrollments for this course
          const enrollments = await ctx.db
            .query("course_enrollments")
            .withIndex("by_courseId", (q: any) => q.eq("courseId", course._id))
            .collect();
          
          // Enrich enrollments with student data
          const enrichedEnrollments = await Promise.all(
            enrollments.map(async (enrollment) => {
              const student = await ctx.db.get(enrollment.studentId);
              return {
                ...enrollment,
                student: student ? { name: student.name, email: student.email } : null,
              };
            })
          );
          
          return {
            ...course,
            instructor: instructor ? { name: instructor.name, email: instructor.email } : null,
            assistants: assistants.filter(Boolean).map(assistant => ({ 
              name: assistant!.name, 
              email: assistant!.email 
            })),
            enrollments: enrichedEnrollments,
          };
        })
      );
      
      return enrichedCourses;
    } else {
      // Customers see only active courses with basic info
      const courses = await ctx.db
        .query("courses")
        .filter((q: any) => q.eq(q.field("isActive"), true))
        .collect();
      
      // Filter to show only future courses
      const today = new Date().toISOString().split('T')[0];
      const futureCourses = courses.filter(course => course.startDate >= today);
      
      // Enrich with basic instructor data and enrollment status for this user
      const enrichedCourses = await Promise.all(
        futureCourses.map(async (course) => {
          const instructor = await ctx.db.get(course.instructorId);
          
          // Check if user is already enrolled
          const userEnrollment = await ctx.db
            .query("course_enrollments")
            .withIndex("by_courseId", (q: any) => q.eq("courseId", course._id))
            .filter((q: any) => q.eq(q.field("studentId"), user._id))
            .first();
          
          return {
            _id: course._id,
            title: course.title,
            description: course.description,
            syllabus: course.syllabus,
            startDate: course.startDate,
            endDate: course.endDate,
            startTime: course.startTime,
            endTime: course.endTime,
            maxParticipants: course.maxParticipants,
            currentParticipants: course.currentParticipants,
            skillLevel: course.skillLevel,
            category: course.category,
            price: course.price,
            location: course.location,
            materials: course.materials,
            _creationTime: course._creationTime,
            instructor: instructor ? { name: instructor.name } : null,
            userEnrollment: userEnrollment ? {
              status: userEnrollment.status,
              paymentStatus: userEnrollment.paymentStatus,
              enrollmentDate: userEnrollment.enrollmentDate,
            } : null,
            spotsAvailable: course.maxParticipants - course.currentParticipants,
          };
        })
      );
      
      return enrichedCourses;
    }
  },
});

// Create course (workers/managers only)
export const createCourse = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    syllabus: v.array(v.string()),
    assistantIds: v.optional(v.array(v.id("users"))),
    startDate: v.string(),
    endDate: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    maxParticipants: v.number(),
    skillLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    category: v.string(),
    price: v.number(),
    location: v.string(),
    materials: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (!hasOperationalAccess(role)) {
      throw new ConvexError("Only workers and managers can create courses");
    }

    // Create the course
    const courseId = await ctx.db.insert("courses", {
      ...args,
      instructorId: user._id,
      currentParticipants: 0,
      isActive: true,
      createdBy: user._id,
      eventId: undefined,
    });

    // Create calendar event
    try {
      const eventId = await ctx.runMutation(api.events.createEvent, {
        title: `Course: ${args.title}`,
        description: `${args.description}\nSkill Level: ${args.skillLevel}\nLocation: ${args.location}`,
        startDate: args.startDate,
        endDate: args.endDate,
        startTime: args.startTime,
        endTime: args.endTime,
        type: "team",
        participants: args.assistantIds ? [user._id, ...args.assistantIds] : [user._id],
        isRecurring: false,
      });

      // Link the event to the course
      await ctx.db.patch(courseId, { eventId });
    } catch (error) {
      console.error("Failed to create calendar event for course:", error);
      // Course is still created even if calendar event fails
    }

    return courseId;
  },
});

// Update course (instructors and managers only)
export const updateCourse = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    syllabus: v.optional(v.array(v.string())),
    assistantIds: v.optional(v.array(v.id("users"))),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    maxParticipants: v.optional(v.number()),
    skillLevel: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))),
    category: v.optional(v.string()),
    price: v.optional(v.number()),
    location: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    materials: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    // Check permissions - instructor can edit their own course, managers can edit any
    if (role !== "manager" && course.instructorId !== user._id) {
      throw new ConvexError("Only the instructor or managers can update this course");
    }

    const { courseId, ...updates } = args;
    await ctx.db.patch(courseId, updates);

    return courseId;
  },
});

// Delete course (managers only)
export const deleteCourse = mutation({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (role !== "manager") {
      throw new ConvexError("Only managers can delete courses");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    // Check if there are any confirmed enrollments
    const confirmedEnrollments = await ctx.db
      .query("course_enrollments")
      .withIndex("by_courseId", (q: any) => q.eq("courseId", args.courseId))
      .filter((q: any) => q.or(
        q.eq(q.field("status"), "approved"),
        q.eq(q.field("status"), "confirmed")
      ))
      .collect();

    if (confirmedEnrollments.length > 0) {
      throw new ConvexError("Cannot delete course with confirmed enrollments");
    }

    // Cancel all pending enrollments
    const pendingEnrollments = await ctx.db
      .query("course_enrollments")
      .withIndex("by_courseId", (q: any) => q.eq("courseId", args.courseId))
      .filter((q: any) => q.eq(q.field("status"), "pending"))
      .collect();

    await Promise.all(
      pendingEnrollments.map(enrollment => 
        ctx.db.patch(enrollment._id, { status: "cancelled" })
      )
    );

    // Delete linked calendar event if exists
    if (course.eventId) {
      try {
        await ctx.runMutation(api.events.deleteEvent, { eventId: course.eventId });
      } catch (error) {
        console.error("Failed to delete calendar event:", error);
      }
    }

    await ctx.db.delete(args.courseId);
    return { success: true };
  },
});

// Request to join course (customers only)
export const requestCourseEnrollment = mutation({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (hasOperationalAccess(role)) {
      throw new ConvexError("Staff members cannot enroll in courses as students");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    if (!course.isActive) {
      throw new ConvexError("Course is not accepting new enrollments");
    }

    if (course.currentParticipants >= course.maxParticipants) {
      throw new ConvexError("Course is at full capacity");
    }

    // Check if already enrolled
    const existingEnrollment = await ctx.db
      .query("course_enrollments")
      .withIndex("by_courseId", (q: any) => q.eq("courseId", args.courseId))
      .filter((q: any) => q.eq(q.field("studentId"), user._id))
      .first();

    if (existingEnrollment) {
      throw new ConvexError("You are already enrolled in this course");
    }

    const enrollmentId = await ctx.db.insert("course_enrollments", {
      courseId: args.courseId,
      studentId: user._id,
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: "pending",
      approvedBy: undefined,
      paymentStatus: "pending",
      notes: undefined,
    });

    return enrollmentId;
  },
});

// Approve/reject course enrollment (staff only)
export const updateEnrollmentStatus = mutation({
  args: {
    enrollmentId: v.id("course_enrollments"),
    status: v.union(v.literal("approved"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const role = getEffectiveRole(user);

    if (!hasOperationalAccess(role)) {
      throw new ConvexError("Only staff members can update enrollment status");
    }

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) {
      throw new ConvexError("Enrollment not found");
    }

    const course = await ctx.db.get(enrollment.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    const updates: any = {
      status: args.status,
      approvedBy: user._id,
    };

    if (args.notes) {
      updates.notes = enrollment.notes ? `${enrollment.notes}\n${args.notes}` : args.notes;
    }

    // Update participant count
    if (args.status === "approved" || args.status === "confirmed") {
      await ctx.db.patch(enrollment.courseId, {
        currentParticipants: course.currentParticipants + 1,
      });
    } else if (args.status === "cancelled" || args.status === "no_show") {
      // If previously approved, decrease count
      if (enrollment.status === "approved" || enrollment.status === "confirmed") {
        await ctx.db.patch(enrollment.courseId, {
          currentParticipants: Math.max(0, course.currentParticipants - 1),
        });
      }
    }

    await ctx.db.patch(args.enrollmentId, updates);

    return { success: true };
  },
});

// Get user's course enrollments
export const getUserEnrollments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    
    const enrollments = await ctx.db
      .query("course_enrollments")
      .withIndex("by_studentId", (q: any) => q.eq("studentId", user._id))
      .collect();

    // Enrich with course data
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await ctx.db.get(enrollment.courseId);
        const approver = enrollment.approvedBy ? await ctx.db.get(enrollment.approvedBy) : null;
        
        return {
          ...enrollment,
          course: course ? {
            title: course.title,
            startDate: course.startDate,
            endDate: course.endDate,
            startTime: course.startTime,
            endTime: course.endTime,
            location: course.location,
            price: course.price,
          } : null,
          approvedBy: approver ? { name: approver.name } : null,
        };
      })
    );

    return enrichedEnrollments;
  },
});