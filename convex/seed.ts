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
      role: "manager",
    });

    const workerId = await ctx.db.insert("users", {
      clerkId: "test_worker_456",
      name: "Mike Wilson", 
      email: "mike.wilson@kastel.com",
      role: "worker",
    });

    const testerId = await ctx.db.insert("users", {
      clerkId: "test_tester_789",
      name: "Alex Tester",
      email: "alex.tester@kastel.com", 
      role: "tester",
    });

    // Create test events
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    await ctx.db.insert("events", {
      title: "Morning Shift - Tool Inventory",
      description: "Check and organize tool inventory in the morning",
      startTime: now + oneDay,
      endTime: now + oneDay + (4 * 60 * 60 * 1000), // 4 hours
      type: "work",
      assignedTo: workerId,
      createdBy: workerId,
      status: "pending_approval",
    });

    await ctx.db.insert("events", {
      title: "Team Meeting - Weekly Planning", 
      description: "Weekly team meeting to discuss upcoming projects and assignments",
      startTime: now + (2 * oneDay),
      endTime: now + (2 * oneDay) + (60 * 60 * 1000), // 1 hour
      type: "meeting",
      assignedTo: undefined,
      createdBy: managerId,
      status: "approved",
      approvedBy: managerId,
    });

    await ctx.db.insert("events", {
      title: "Equipment Maintenance",
      description: "Regular maintenance check on power tools", 
      startTime: now + (3 * oneDay),
      endTime: now + (3 * oneDay) + (3 * 60 * 60 * 1000), // 3 hours
      type: "maintenance",
      assignedTo: workerId,
      createdBy: workerId,
      status: "pending_approval",
    });

    await ctx.db.insert("events", {
      title: "Customer Order Processing",
      description: "Process pending customer orders and prepare for pickup",
      startTime: now + (4 * oneDay),
      endTime: now + (4 * oneDay) + (2 * 60 * 60 * 1000), // 2 hours
      type: "work",
      assignedTo: workerId,
      createdBy: managerId,
      status: "completed",
      approvedBy: managerId,
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

    return {
      message: "Database seeded successfully!",
      users: 3,
      events: 4,
      forms: 2,
      submissions: 2,
    };
  },
});