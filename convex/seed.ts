import { mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Create test users
    const managerId = await ctx.db.insert("users", {
      clerkId: "test_manager_123",
      name: "Sarah Johnson",
      email: "sarah.johnson@kastel.com",
      role: "manager", // Legacy
      baseRole: "worker", // NEW: Manager is worker + manager tag
      tags: ["manager"],
      preferredInterface: "staff",
    });

    const workerId = await ctx.db.insert("users", {
      clerkId: "test_worker_456",
      name: "Mike Wilson", 
      email: "mike.wilson@kastel.com",
      role: "worker", // Legacy
      baseRole: "worker", // NEW
      tags: [],
      preferredInterface: "staff",
    });

    const devId = await ctx.db.insert("users", {
      clerkId: "test_dev_789",
      name: "Alex Dev",
      email: "alex.dev@kastel.com", 
      role: "dev", // Legacy
      baseRole: "guest", // NEW: Dev gets full access via legacy role
      tags: [],
      preferredInterface: "staff",
    });

    // Create test events
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
    const dayAfterNext = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fourDaysLater = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000);
    
    await ctx.db.insert("events", {
      title: "Morning Shift - Tool Inventory",
      description: "Check and organize tool inventory in the morning",
      startDate: tomorrow.toISOString().split('T')[0], // YYYY-MM-DD
      endDate: tomorrow.toISOString().split('T')[0],
      startTime: "09:00", // HH:MM
      endTime: "13:00", // 4 hours later
      type: "work",
      assignedTo: workerId,
      createdBy: workerId,
      status: "pending_approval",
      isRecurring: false,
    });

    await ctx.db.insert("events", {
      title: "Team Meeting - Weekly Planning", 
      description: "Weekly team meeting to discuss upcoming projects and assignments",
      startDate: dayAfter.toISOString().split('T')[0],
      endDate: dayAfter.toISOString().split('T')[0],
      startTime: "10:00",
      endTime: "11:00", // 1 hour
      type: "meeting",
      assignedTo: undefined,
      createdBy: managerId,
      status: "approved",
      approvedBy: managerId,
      isRecurring: false,
    });

    await ctx.db.insert("events", {
      title: "Equipment Maintenance",
      description: "Regular maintenance check on power tools", 
      startDate: dayAfterNext.toISOString().split('T')[0],
      endDate: dayAfterNext.toISOString().split('T')[0],
      startTime: "14:00",
      endTime: "17:00", // 3 hours
      type: "maintenance",
      assignedTo: workerId,
      createdBy: workerId,
      status: "pending_approval",
      isRecurring: false,
    });

    await ctx.db.insert("events", {
      title: "Customer Order Processing",
      description: "Process pending customer orders and prepare for pickup",
      startDate: fourDaysLater.toISOString().split('T')[0],
      endDate: fourDaysLater.toISOString().split('T')[0],
      startTime: "08:00",
      endTime: "10:00", // 2 hours
      type: "work",
      assignedTo: workerId,
      createdBy: managerId,
      status: "completed",
      approvedBy: managerId,
      isRecurring: false,
    });

    // Create test forms
    const workHoursFormId = await ctx.db.insert("forms", {
      title: "Daily Work Hours Report",
      description: "Log your daily work hours and tasks completed",
      type: "work_hours",
      createdBy: managerId,
      isActive: true,
      fields: [
        {
          id: "date",
          label: "Date",
          type: "date",
          required: true,
        },
        {
          id: "hours_worked",
          label: "Hours Worked",
          type: "number",
          required: true,
        },
        {
          id: "tasks_completed",
          label: "Tasks Completed",
          type: "text",
          required: true,
        },
        {
          id: "overtime",
          label: "Overtime Hours",
          type: "number",
          required: false,
        },
      ],
    });

    const teamReportFormId = await ctx.db.insert("forms", {
      title: "Weekly Team Performance",
      description: "Weekly report on team performance and goals",
      type: "team_report",
      createdBy: managerId,
      isActive: true,
      fields: [
        {
          id: "week_ending",
          label: "Week Ending",
          type: "date",
          required: true,
        },
        {
          id: "team_productivity",
          label: "Team Productivity",
          type: "select",
          required: true,
          options: ["Excellent", "Good", "Average", "Below Average", "Poor"],
        },
        {
          id: "goals_met",
          label: "Goals Met (%)",
          type: "number",
          required: true,
        },
        {
          id: "challenges",
          label: "Challenges Faced",
          type: "text",
          required: false,
        },
        {
          id: "improvement_areas",
          label: "Areas for Improvement",
          type: "text",
          required: false,
        },
      ],
    });

    // Create some test form submissions
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    await ctx.db.insert("form_submissions", {
      formId: workHoursFormId,
      submittedBy: workerId,
      data: {
        date: new Date().toISOString().split('T')[0],
        hours_worked: 8,
        tasks_completed: "Inventory management, customer service, tool maintenance",
        overtime: 0,
      },
      submittedAt: now - oneDay,
    });

    await ctx.db.insert("form_submissions", {
      formId: teamReportFormId,
      submittedBy: managerId,
      data: {
        week_ending: new Date(now - oneDay).toISOString().split('T')[0],
        team_productivity: "Good",
        goals_met: 85,
        challenges: "High customer demand during peak hours",
        improvement_areas: "Better inventory tracking system needed",
      },
      submittedAt: now - (2 * oneDay),
    });

    // Create test shifts - Sunday through Thursday
    const fullDayShiftId = await ctx.db.insert("shifts", {
      name: "Full Day Shift",
      description: "Complete daily operations coverage",
      startTime: "09:00",
      endTime: "19:00",
      recurringDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
      requiredWorkers: 3,
      maxWorkers: 5,
      color: "#3B82F6", // Blue
      isActive: true,
      createdBy: managerId,
    });

    const morningShiftId = await ctx.db.insert("shifts", {
      name: "Morning Shift",
      description: "Morning operations and customer service",
      startTime: "09:00",
      endTime: "13:00",
      recurringDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
      requiredWorkers: 2,
      maxWorkers: 4,
      color: "#10B981", // Green
      isActive: true,
      createdBy: managerId,
    });

    const eveningShiftId = await ctx.db.insert("shifts", {
      name: "Evening Shift", 
      description: "Afternoon/evening operations and closing procedures",
      startTime: "15:00",
      endTime: "19:00",
      recurringDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
      requiredWorkers: 2,
      maxWorkers: 3,
      color: "#F59E0B", // Amber
      isActive: true,
      createdBy: managerId,
    });

    return {
      message: "Database seeded successfully!",
      users: 3,
      events: 4,
      forms: 2,
      submissions: 2,
      shifts: 3,
    };
  },
});