// Quick script to seed sample users
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexHttpClient("https://strong-cormorant-757.convex.cloud");

async function seedUsers() {
  try {
    console.log("🏃 Starting user seeding...");
    
    // Try the public version first which doesn't require authentication
    const result = await client.mutation(api.users.seedSampleUsersPublic, {});
    
    console.log("✅ Seeding complete:", result);
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    console.log("You can seed users through the Convex dashboard instead:");
    console.log("1. Go to https://dashboard.convex.dev/d/strong-cormorant-757");
    console.log("2. Navigate to Functions");
    console.log("3. Find and run 'users:seedSampleUsersPublic'");
  }
}

seedUsers();