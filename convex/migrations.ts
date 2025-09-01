import { mutation } from "./_generated/server";

// Migration to clean up "pro" from emulatingRole and set proTag instead
export const migrateProRoleToTag = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    let migrated = 0;
    
    for (const user of users) {
      let needsUpdate = false;
      const updates: any = {};
      
      // If user has "pro" as emulatingRole, clear it and set proTag
      if ((user.emulatingRole as any) === "pro") {
        updates.emulatingRole = undefined;
        updates.proTag = true;
        needsUpdate = true;
      }
      
      // If user has "pro" as role, change to "customer" and set proTag
      if ((user.role as any) === "pro") {
        updates.role = "customer"; // Default fallback role
        updates.proTag = true;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await ctx.db.patch(user._id, updates);
        migrated++;
      }
    }
    
    return { success: true, migrated };
  },
});