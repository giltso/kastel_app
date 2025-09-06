// Quick script to seed sample users
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://energetic-badger-805.convex.cloud");

async function seedUsers() {
  try {
    console.log("Starting user seeding...");
    
    // Note: This won't work without proper authentication
    // We'll need to use the Convex dashboard or modify the mutation
    const result = await client.mutation("users:seedSampleUsers", {});
    
    console.log("Seeding complete:", result);
  } catch (error) {
    console.error("Error seeding users:", error);
    console.log("You can seed users through the Convex dashboard instead:");
    console.log("1. Go to https://dashboard.convex.dev/d/strong-cormorant-757");
    console.log("2. Navigate to Functions");
    console.log("3. Find and run 'users:seedSampleUsers'");
  }
}

seedUsers();