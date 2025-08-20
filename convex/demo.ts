import { action, query } from "./_generated/server";

// This action can be used to populate the database with demo data
export const initializeDemoData = action({
  args: {},
  handler: async (ctx) => {
    // Since we can't call internal mutations from actions in non-authenticated setup,
    // we'll return mock data for the demo
    return {
      message: "Demo data would be initialized here",
      status: "success",
    };
  },
});

// Mock query for demonstration when backend isn't fully connected
export const getDemoEvents = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Return mock events for demo
    return [
      {
        _id: "demo_event_1" as any,
        _creationTime: now - (2 * oneDay),
        title: "Morning Shift - Tool Inventory",
        description: "Check and organize tool inventory in the morning",
        startTime: now + oneDay,
        endTime: now + oneDay + (4 * 60 * 60 * 1000),
        type: "work" as const,
        status: "pending" as const,
        createdBy: "demo_user_1" as any,
        assignedTo: "demo_user_2" as any,
        creator: { _id: "demo_user_1", name: "Sarah Johnson", clerkId: "demo_manager" },
        assignee: { _id: "demo_user_2", name: "Mike Wilson", clerkId: "demo_employee" },
      },
      {
        _id: "demo_event_2" as any,
        _creationTime: now - oneDay,
        title: "Team Meeting - Weekly Planning",
        description: "Weekly team meeting to discuss upcoming projects",
        startTime: now + (2 * oneDay),
        endTime: now + (2 * oneDay) + (60 * 60 * 1000),
        type: "meeting" as const,
        status: "pending" as const,
        createdBy: "demo_user_1" as any,
        assignedTo: undefined,
        creator: { _id: "demo_user_1", name: "Sarah Johnson", clerkId: "demo_manager" },
        assignee: null,
      },
      {
        _id: "demo_event_3" as any,
        _creationTime: now - (3 * oneDay),
        title: "Equipment Maintenance",
        description: "Regular maintenance check on power tools",
        startTime: now + (3 * oneDay),
        endTime: now + (3 * oneDay) + (3 * 60 * 60 * 1000),
        type: "maintenance" as const,
        status: "completed" as const,
        createdBy: "demo_user_3" as any,
        assignedTo: "demo_user_2" as any,
        creator: { _id: "demo_user_3", name: "John Smith", clerkId: "demo_admin" },
        assignee: { _id: "demo_user_2", name: "Mike Wilson", clerkId: "demo_employee" },
      },
    ];
  },
});

export const getDemoForms = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    return [
      {
        _id: "demo_form_1" as any,
        _creationTime: now - (7 * oneDay),
        title: "Daily Work Hours Report",
        description: "Log your daily work hours and tasks completed",
        type: "work_hours" as const,
        isActive: true,
        createdBy: "demo_user_3" as any,
        creator: { _id: "demo_user_3", name: "John Smith", clerkId: "demo_admin" },
        fields: [
          { id: "date", label: "Date", type: "date" as const, required: true },
          { id: "hours", label: "Hours Worked", type: "number" as const, required: true },
          { id: "tasks", label: "Tasks Completed", type: "text" as const, required: true },
        ],
      },
      {
        _id: "demo_form_2" as any,
        _creationTime: now - (14 * oneDay),
        title: "Weekly Team Performance",
        description: "Weekly report on team performance and goals",
        type: "team_report" as const,
        isActive: true,
        createdBy: "demo_user_1" as any,
        creator: { _id: "demo_user_1", name: "Sarah Johnson", clerkId: "demo_manager" },
        fields: [
          { id: "week", label: "Week Ending", type: "date" as const, required: true },
          { id: "productivity", label: "Team Productivity", type: "select" as const, required: true, options: ["Excellent", "Good", "Average"] },
          { id: "goals", label: "Goals Met (%)", type: "number" as const, required: true },
        ],
      },
    ];
  },
});

export const getDemoUsers = query({
  args: {},
  handler: async (ctx) => {
    return [
      { _id: "demo_user_1", name: "Sarah Johnson", clerkId: "demo_manager", _creationTime: Date.now() - (30 * 24 * 60 * 60 * 1000) },
      { _id: "demo_user_2", name: "Mike Wilson", clerkId: "demo_employee", _creationTime: Date.now() - (20 * 24 * 60 * 60 * 1000) },
      { _id: "demo_user_3", name: "John Smith", clerkId: "demo_admin", _creationTime: Date.now() - (40 * 24 * 60 * 60 * 1000) },
    ];
  },
});