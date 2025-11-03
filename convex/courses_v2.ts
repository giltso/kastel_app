import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { hasV2Permission } from "./users_v2";

// Helper function to check if user is course instructor (owner or helper)
async function isCourseInstructor(
  ctx: any,
  courseId: Id<"courses">,
  userId: Id<"users">
): Promise<boolean> {
  const course = await ctx.db.get(courseId);
  if (!course) return false;

  if (course.instructorId === userId) return true;
  if (course.helperInstructorIds?.includes(userId)) return true;

  return false;
}

// Helper function to check if user is course owner
async function isCourseOwner(
  ctx: any,
  courseId: Id<"courses">,
  userId: Id<"users">
): Promise<boolean> {
  const course = await ctx.db.get(courseId);
  if (!course) return false;
  return course.instructorId === userId;
}

// Get all courses with role-based filtering
export const getAllCoursesV2 = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // Get all active courses for guests/unauthenticated users
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    if (!identity) {
      // Guests see public info only
      return courses.map(course => ({
        ...course,
        spotsAvailable: course.maxParticipants - course.currentParticipants,
      }));
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    const isInstructor = hasV2Permission(currentUser, "instructor");
    const isManager = hasV2Permission(currentUser, "manager");

    // Managers see all courses (active and inactive)
    if (isManager) {
      const allCourses = await ctx.db.query("courses").collect();

      return await Promise.all(
        allCourses.map(async (course) => {
          const instructor = await ctx.db.get(course.instructorId);
          const enrollments = await ctx.db
            .query("course_enrollments")
            .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
            .collect();

          return {
            ...course,
            instructor,
            spotsAvailable: course.maxParticipants - course.currentParticipants,
            enrollmentCount: enrollments.length,
            pendingEnrollments: enrollments.filter(e => e.status === "pending").length,
          };
        })
      );
    }

    // Instructors see courses they teach + all active courses
    if (isInstructor) {
      const allCourses = await ctx.db.query("courses").collect();

      return await Promise.all(
        allCourses.filter(course =>
          course.isActive ||
          course.instructorId === currentUser._id ||
          course.helperInstructorIds?.includes(currentUser._id)
        ).map(async (course) => {
          const instructor = await ctx.db.get(course.instructorId);
          const enrollments = await ctx.db
            .query("course_enrollments")
            .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
            .collect();

          return {
            ...course,
            instructor,
            spotsAvailable: course.maxParticipants - course.currentParticipants,
            isTeaching: course.instructorId === currentUser._id || course.helperInstructorIds?.includes(currentUser._id),
            enrollmentCount: enrollments.length,
            pendingEnrollments: enrollments.filter(e => e.status === "pending").length,
          };
        })
      );
    }

    // Customers and guests see active courses only with public info
    return courses.map(course => ({
      ...course,
      spotsAvailable: course.maxParticipants - course.currentParticipants,
    }));
  },
});

// Get single course details with enrollment data
export const getCourseDetailsV2 = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) return null;

    const identity = await ctx.auth.getUserIdentity();
    const instructor = await ctx.db.get(course.instructorId);

    // Public info available to everyone
    const publicInfo = {
      ...course,
      instructor,
      spotsAvailable: course.maxParticipants - course.currentParticipants,
    };

    // Unauthenticated users see public info only
    if (!identity) return publicInfo;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return publicInfo;

    // Check if user is enrolled
    const userEnrollment = await ctx.db
      .query("course_enrollments")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.eq(q.field("studentId"), currentUser._id))
      .unique();

    const isInstructor = hasV2Permission(currentUser, "instructor");
    const isManager = hasV2Permission(currentUser, "manager");
    const isCourseInstructorFlag = await isCourseInstructor(ctx, args.courseId, currentUser._id);

    // Instructors for this course and managers see protected info
    if (isCourseInstructorFlag || isManager) {
      const enrollments = await ctx.db
        .query("course_enrollments")
        .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
        .collect();

      const enrollmentsWithStudents = await Promise.all(
        enrollments.map(async (enrollment) => {
          const student = await ctx.db.get(enrollment.studentId);
          return {
            ...enrollment,
            student,
          };
        })
      );

      // Get helper instructors
      const helperInstructors = course.helperInstructorIds
        ? await Promise.all(course.helperInstructorIds.map(id => ctx.db.get(id)))
        : [];

      return {
        ...publicInfo,
        enrollments: enrollmentsWithStudents,
        helperInstructors,
        isOwner: course.instructorId === currentUser._id,
        canManage: isCourseInstructorFlag || isManager,
      };
    }

    // Customers see their enrollment status
    return {
      ...publicInfo,
      userEnrollment,
    };
  },
});

// Get user's enrollments
export const getUserEnrollmentsV2 = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    const enrollments = await ctx.db
      .query("course_enrollments")
      .withIndex("by_studentId", (q) => q.eq("studentId", currentUser._id))
      .collect();

    return await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await ctx.db.get(enrollment.courseId);
        return {
          ...enrollment,
          course,
        };
      })
    );
  },
});

// Get course statistics for dashboard
export const getCourseStatisticsV2 = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return null;

    const isInstructor = hasV2Permission(currentUser, "instructor");
    const isManager = hasV2Permission(currentUser, "manager");

    if (!isInstructor && !isManager) return null;

    const allCourses = await ctx.db.query("courses").collect();
    const allEnrollments = await ctx.db.query("course_enrollments").collect();

    // Manager stats: all courses
    if (isManager) {
      const activeCourses = allCourses.filter(c => c.isActive);
      const totalRevenue = allEnrollments
        .filter(e => e.paymentStatus === "paid")
        .reduce((sum, e) => {
          const course = allCourses.find(c => c._id === e.courseId);
          return sum + (course?.price || 0);
        }, 0);

      return {
        totalCourses: allCourses.length,
        activeCourses: activeCourses.length,
        totalEnrollments: allEnrollments.length,
        pendingEnrollments: allEnrollments.filter(e => e.status === "pending").length,
        approvedEnrollments: allEnrollments.filter(e => e.status === "approved").length,
        confirmedEnrollments: allEnrollments.filter(e => e.status === "confirmed").length,
        totalRevenue,
        pendingPayments: allEnrollments.filter(e => e.paymentStatus === "pending").length,
      };
    }

    // Instructor stats: courses they teach
    const myCourses = allCourses.filter(
      c => c.instructorId === currentUser._id || c.helperInstructorIds?.includes(currentUser._id)
    );
    const myEnrollments = allEnrollments.filter(e =>
      myCourses.some(c => c._id === e.courseId)
    );

    return {
      totalCourses: myCourses.length,
      activeCourses: myCourses.filter(c => c.isActive).length,
      totalEnrollments: myEnrollments.length,
      pendingEnrollments: myEnrollments.filter(e => e.status === "pending").length,
      approvedEnrollments: myEnrollments.filter(e => e.status === "approved").length,
      confirmedEnrollments: myEnrollments.filter(e => e.status === "confirmed").length,
    };
  },
});

// Create new course (instructor tag required)
export const createCourseV2 = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    skillLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    sessionType: v.union(v.literal("single"), v.literal("multi-meeting"), v.literal("recurring-template")),
    // Legacy fields for single session courses
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.string(),
    maxParticipants: v.number(),
    price: v.optional(v.number()),
    syllabus: v.array(v.string()),
    materials: v.optional(v.array(v.string())),
    // Sessions for multi-meeting courses
    sessions: v.optional(v.array(v.object({
      sessionNumber: v.number(),
      date: v.string(),
      startTime: v.string(),
      endTime: v.string(),
      location: v.optional(v.string()),
      notes: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Check instructor permission
    if (!hasV2Permission(currentUser, "instructor") && !currentUser.isDev) {
      throw new Error("Instructor tag required to create courses");
    }

    // Validate single session courses have required date/time fields
    if (args.sessionType === "single") {
      if (!args.startDate || !args.endDate || !args.startTime || !args.endTime) {
        throw new Error("Single session courses require startDate, endDate, startTime, and endTime");
      }

      const startDate = new Date(args.startDate);
      const endDate = new Date(args.endDate);
      if (endDate < startDate) {
        throw new Error("End date must be after start date");
      }
    }

    // Validate multi-meeting courses have sessions
    if (args.sessionType === "multi-meeting") {
      if (!args.sessions || args.sessions.length === 0) {
        throw new Error("Multi-meeting courses require at least one session");
      }
    }

    const courseId = await ctx.db.insert("courses", {
      title: args.title,
      description: args.description,
      category: args.category,
      skillLevel: args.skillLevel,
      sessionType: args.sessionType,
      startDate: args.startDate,
      endDate: args.endDate,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      maxParticipants: args.maxParticipants,
      price: args.price || 0, // Default to 0 (free) if not specified
      syllabus: args.syllabus,
      materials: args.materials || [],
      instructorId: currentUser._id,
      createdBy: currentUser._id,
      currentParticipants: 0,
      isActive: true,
    });

    // Create course sessions if multi-meeting
    if (args.sessionType === "multi-meeting" && args.sessions) {
      for (const session of args.sessions) {
        await ctx.db.insert("course_sessions", {
          courseId,
          sessionNumber: session.sessionNumber,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          location: session.location,
          notes: session.notes,
        });
      }
    }

    return { courseId };
  },
});

// Update course (owner only)
export const updateCourseV2 = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    skillLevel: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    maxParticipants: v.optional(v.number()),
    price: v.optional(v.number()),
    syllabus: v.optional(v.array(v.string())),
    materials: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const isOwner = await isCourseOwner(ctx, args.courseId, currentUser._id);
    if (!isOwner && !currentUser.isDev) {
      throw new Error("Only course owner can edit course details");
    }

    const updateFields: any = {};
    if (args.title !== undefined) updateFields.title = args.title;
    if (args.description !== undefined) updateFields.description = args.description;
    if (args.category !== undefined) updateFields.category = args.category;
    if (args.skillLevel !== undefined) updateFields.skillLevel = args.skillLevel;
    if (args.startDate !== undefined) updateFields.startDate = args.startDate;
    if (args.endDate !== undefined) updateFields.endDate = args.endDate;
    if (args.startTime !== undefined) updateFields.startTime = args.startTime;
    if (args.endTime !== undefined) updateFields.endTime = args.endTime;
    if (args.location !== undefined) updateFields.location = args.location;
    if (args.maxParticipants !== undefined) updateFields.maxParticipants = args.maxParticipants;
    if (args.price !== undefined) updateFields.price = args.price;
    if (args.syllabus !== undefined) updateFields.syllabus = args.syllabus;
    if (args.materials !== undefined) updateFields.materials = args.materials;

    await ctx.db.patch(args.courseId, updateFields);
    return { success: true };
  },
});

// Toggle course active status
export const toggleCourseActiveV2 = mutation({
  args: {
    courseId: v.id("courses"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const isOwner = await isCourseOwner(ctx, args.courseId, currentUser._id);
    const isManager = hasV2Permission(currentUser, "manager");

    if (!isOwner && !isManager && !currentUser.isDev) {
      throw new Error("Only course owner or manager can toggle course status");
    }

    await ctx.db.patch(args.courseId, { isActive: args.isActive });
    return { success: true };
  },
});

// Add helper instructor (owner only)
export const addHelperInstructorV2 = mutation({
  args: {
    courseId: v.id("courses"),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const isOwner = await isCourseOwner(ctx, args.courseId, currentUser._id);
    if (!isOwner && !currentUser.isDev) {
      throw new Error("Only course owner can add helper instructors");
    }

    // Verify target user has instructor tag
    const targetUser = await ctx.db.get(args.instructorId);
    if (!targetUser) throw new Error("Instructor not found");

    if (!hasV2Permission(targetUser, "instructor") && !targetUser.isDev) {
      throw new Error("Target user must have instructor tag");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    const helperInstructorIds = course.helperInstructorIds || [];
    if (helperInstructorIds.includes(args.instructorId)) {
      throw new Error("User is already a helper instructor");
    }

    await ctx.db.patch(args.courseId, {
      helperInstructorIds: [...helperInstructorIds, args.instructorId],
    });

    return { success: true };
  },
});

// Remove helper instructor (owner only)
export const removeHelperInstructorV2 = mutation({
  args: {
    courseId: v.id("courses"),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const isOwner = await isCourseOwner(ctx, args.courseId, currentUser._id);
    if (!isOwner && !currentUser.isDev) {
      throw new Error("Only course owner can remove helper instructors");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    const helperInstructorIds = course.helperInstructorIds || [];
    const newHelperIds = helperInstructorIds.filter(id => id !== args.instructorId);

    await ctx.db.patch(args.courseId, {
      helperInstructorIds: newHelperIds,
    });

    return { success: true };
  },
});

// Request enrollment (customer)
export const requestEnrollmentV2 = mutation({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    // Check if already enrolled
    const existingEnrollment = await ctx.db
      .query("course_enrollments")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.eq(q.field("studentId"), currentUser._id))
      .unique();

    if (existingEnrollment) {
      throw new Error("Already enrolled in this course");
    }

    // Check capacity
    if (course.currentParticipants >= course.maxParticipants) {
      throw new Error("Course is full");
    }

    const enrollmentId = await ctx.db.insert("course_enrollments", {
      courseId: args.courseId,
      studentId: currentUser._id,
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: "pending",
      paymentStatus: "pending",
    });

    return { enrollmentId };
  },
});

// Update enrollment status (instructor or manager)
export const updateEnrollmentStatusV2 = mutation({
  args: {
    enrollmentId: v.id("course_enrollments"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) throw new Error("Enrollment not found");

    const isCourseInstructorFlag = await isCourseInstructor(ctx, enrollment.courseId, currentUser._id);
    const isManager = hasV2Permission(currentUser, "manager");

    if (!isCourseInstructorFlag && !isManager && !currentUser.isDev) {
      throw new Error("Only course instructors or managers can update enrollment status");
    }

    const course = await ctx.db.get(enrollment.courseId);
    if (!course) throw new Error("Course not found");

    // Update participant count when approving
    if (args.status === "approved" && enrollment.status === "pending") {
      await ctx.db.patch(enrollment.courseId, {
        currentParticipants: course.currentParticipants + 1,
      });
    }

    // Update participant count when cancelling
    if (args.status === "cancelled" && enrollment.status !== "cancelled") {
      if (course.currentParticipants > 0) {
        await ctx.db.patch(enrollment.courseId, {
          currentParticipants: course.currentParticipants - 1,
        });
      }
    }

    await ctx.db.patch(args.enrollmentId, {
      status: args.status,
      approvedBy: args.status === "approved" ? currentUser._id : enrollment.approvedBy,
    });

    return { success: true };
  },
});

// Update payment status (manager only)
export const updatePaymentStatusV2 = mutation({
  args: {
    enrollmentId: v.id("course_enrollments"),
    paymentStatus: v.union(v.literal("pending"), v.literal("paid"), v.literal("refunded")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const isManager = hasV2Permission(currentUser, "manager");
    if (!isManager && !currentUser.isDev) {
      throw new Error("Only managers can update payment status");
    }

    await ctx.db.patch(args.enrollmentId, {
      paymentStatus: args.paymentStatus,
    });

    return { success: true };
  },
});

// Cancel enrollment (student or instructor)
export const cancelEnrollmentV2 = mutation({
  args: {
    enrollmentId: v.id("course_enrollments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) throw new Error("Enrollment not found");

    const isStudent = enrollment.studentId === currentUser._id;
    const isCourseInstructorFlag = await isCourseInstructor(ctx, enrollment.courseId, currentUser._id);
    const isManager = hasV2Permission(currentUser, "manager");

    if (!isStudent && !isCourseInstructorFlag && !isManager && !currentUser.isDev) {
      throw new Error("Only the student, course instructors, or managers can cancel enrollment");
    }

    const course = await ctx.db.get(enrollment.courseId);
    if (course && enrollment.status !== "cancelled") {
      if (course.currentParticipants > 0) {
        await ctx.db.patch(enrollment.courseId, {
          currentParticipants: course.currentParticipants - 1,
        });
      }
    }

    await ctx.db.patch(args.enrollmentId, {
      status: "cancelled",
    });

    return { success: true };
  },
});

// Get course with sessions
export const getCourseWithSessions = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) return null;

    // Get sessions if multi-meeting course
    let sessions: any[] = [];
    if (course.sessionType === "multi-meeting") {
      sessions = await ctx.db
        .query("course_sessions")
        .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
        .collect();

      // Sort by session number
      sessions.sort((a, b) => a.sessionNumber - b.sessionNumber);
    }

    return {
      ...course,
      sessions,
    };
  },
});

// Create course session (instructor only)
export const createCourseSession = mutation({
  args: {
    courseId: v.id("courses"),
    sessionNumber: v.number(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    // Check ownership
    const isOwner = course.instructorId === currentUser._id;
    if (!isOwner && !currentUser.isDev) {
      throw new Error("Only course owner can add sessions");
    }

    const sessionId = await ctx.db.insert("course_sessions", {
      courseId: args.courseId,
      sessionNumber: args.sessionNumber,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      notes: args.notes,
    });

    return { sessionId };
  },
});

// Update course session (instructor only)
export const updateCourseSession = mutation({
  args: {
    sessionId: v.id("course_sessions"),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const course = await ctx.db.get(session.courseId);
    if (!course) throw new Error("Course not found");

    // Check ownership
    const isOwner = course.instructorId === currentUser._id;
    if (!isOwner && !currentUser.isDev) {
      throw new Error("Only course owner can edit sessions");
    }

    const updateFields: any = {};
    if (args.date !== undefined) updateFields.date = args.date;
    if (args.startTime !== undefined) updateFields.startTime = args.startTime;
    if (args.endTime !== undefined) updateFields.endTime = args.endTime;
    if (args.location !== undefined) updateFields.location = args.location;
    if (args.notes !== undefined) updateFields.notes = args.notes;

    await ctx.db.patch(args.sessionId, updateFields);
    return { success: true };
  },
});

// Delete course session (instructor only)
export const deleteCourseSession = mutation({
  args: {
    sessionId: v.id("course_sessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const course = await ctx.db.get(session.courseId);
    if (!course) throw new Error("Course not found");

    // Check ownership
    const isOwner = course.instructorId === currentUser._id;
    if (!isOwner && !currentUser.isDev) {
      throw new Error("Only course owner can delete sessions");
    }

    await ctx.db.delete(args.sessionId);
    return { success: true };
  },
});

// Get courses for a specific date (for calendar display)
export const getCoursesForDate = query({
  args: {
    date: v.string(), // YYYY-MM-DD format
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Get all active courses
    const allCourses = await ctx.db
      .query("courses")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Filter courses that overlap with the given date
    const coursesOnDate = allCourses.filter(course => {
      // Only filter single-session courses by date, multi-meeting courses handled separately
      if (course.sessionType !== "single" || !course.startDate || !course.endDate) {
        return false;
      }
      return course.startDate <= args.date && course.endDate >= args.date;
    });

    // For unauthenticated users, return basic info
    if (!identity) {
      return coursesOnDate.map(course => ({
        _id: course._id,
        title: course.title,
        startDate: course.startDate,
        endDate: course.endDate,
        category: course.category,
        skillLevel: course.skillLevel,
        schedule: {
          startTime: course.startTime,
          endTime: course.endTime,
          location: course.location,
        },
      }));
    }

    // For authenticated users, include enrollment status
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .unique();

    if (!user) {
      return coursesOnDate.map(course => ({
        _id: course._id,
        title: course.title,
        startDate: course.startDate,
        endDate: course.endDate,
        category: course.category,
        skillLevel: course.skillLevel,
        schedule: {
          startTime: course.startTime,
          endTime: course.endTime,
          location: course.location,
        },
      }));
    }

    // User permissions already available via user object

    return Promise.all(
      coursesOnDate.map(async (course) => {
        const isTeaching = course.instructorId === user._id ||
                          course.helperInstructorIds?.includes(user._id);

        // Check if user is enrolled
        const userEnrollment = await ctx.db
          .query("course_enrollments")
          .withIndex("by_studentId", (q) => q.eq("studentId", user._id))
          .filter((q) => q.eq(q.field("courseId"), course._id))
          .first();

        return {
          _id: course._id,
          title: course.title,
          startDate: course.startDate,
          endDate: course.endDate,
          category: course.category,
          skillLevel: course.skillLevel,
          schedule: {
            startTime: course.startTime,
            endTime: course.endTime,
            location: course.location,
          },
          isTeaching,
          enrollmentStatus: userEnrollment?.status,
        };
      })
    );
  },
});
