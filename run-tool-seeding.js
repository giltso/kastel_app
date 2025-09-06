// Simple script to call the backend seeding function
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexHttpClient("https://strong-cormorant-757.convex.cloud");

async function runSeeding() {
  try {
    console.log("🚀 Starting tool rental seeding...");
    
    const result = await client.mutation(api.tools.seedToolRentals, {});
    
    console.log("\n✅ Seeding completed successfully!");
    console.log("📊 Results:", result);
    
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

runSeeding()
  .then(() => {
    console.log("🎉 All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });