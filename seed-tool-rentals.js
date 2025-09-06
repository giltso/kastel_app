// Tool Rental Database Seeding Script  
// Run this with: node seed-tool-rentals.js

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

// Initialize the client - update with your deployment URL
const client = new ConvexHttpClient("https://strong-cormorant-757.convex.cloud");

// Tool categories and example tools
const toolCategories = {
  "Power Tools": [
    { name: "Circular Saw", brand: "DeWalt", model: "DWE575", price: 20 },
    { name: "Drill/Driver", brand: "Milwaukee", model: "2804-20", price: 20 },
    { name: "Angle Grinder", brand: "Makita", model: "GA4530", price: 20 },
    { name: "Impact Driver", brand: "Ryobi", model: "P238", price: 20 },
    { name: "Jigsaw", brand: "Bosch", model: "JS470E", price: 20 },
  ],
  "Hand Tools": [
    { name: "Hammer Set", brand: "Estwing", model: "E3-16C", price: 0 },
    { name: "Screwdriver Set", brand: "Klein", model: "32500", price: 0 },
    { name: "Level", brand: "Stanley", model: "42-468", price: 0 },
    { name: "Measuring Tape", brand: "Stanley", model: "STHT33526", price: 0 },
    { name: "Pliers Set", brand: "Irwin", model: "2078712", price: 0 },
  ]
};

// Helper function to get random date within next 2 weeks
function getRandomDateInNext2Weeks() {
  const today = new Date();
  const maxDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const randomTime = today.getTime() + Math.random() * (maxDate.getTime() - today.getTime());
  return new Date(randomTime);
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper function to get shift start/end times (assuming typical shifts)
const shiftTimes = {
  morning: { start: "06:00", end: "14:00" },
  afternoon: { start: "14:00", end: "22:00" },
  night: { start: "22:00", end: "06:00" }
};

function getRandomShift() {
  const shifts = Object.values(shiftTimes);
  return shifts[Math.floor(Math.random() * shifts.length)];
}

// Helper function to add days to date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function seedToolRentals() {
  console.log("🔧 Starting tool rental database seeding...");

  try {
    // First, get a user ID to create tools (assuming there's at least one manager/worker user)
    console.log("📋 Getting user list...");
    const users = await client.query(api.users.listUsers);
    
    if (!users || users.length === 0) {
      throw new Error("No users found. Please ensure users exist before seeding tools.");
    }

    // Find a manager or worker user to create tools
    let toolCreator = users.find(u => u.role === "manager" || u.role === "worker" || u.role === "dev");
    if (!toolCreator) {
      toolCreator = users[0]; // Fallback to first user
      console.log(`⚠️  No manager/worker found, using user: ${toolCreator.name}`);
    }

    console.log(`👤 Using ${toolCreator.name} (${toolCreator.role}) as tool creator`);

    // Step 1: Create 10 tools (5 free, 5 paid)
    console.log("🛠️  Creating 10 tools...");
    const createdTools = [];
    
    let toolIndex = 0;
    for (const [category, tools] of Object.entries(toolCategories)) {
      for (const tool of tools) {
        try {
          const toolId = await client.mutation(api.tools.addTool, {
            name: tool.name,
            description: `Professional ${tool.name} - ${tool.brand} ${tool.model}`,
            category: category,
            brand: tool.brand,
            model: tool.model,
            serialNumber: `SN${String(toolIndex + 1).padStart(3, '0')}`,
            condition: "excellent",
            rentalPricePerDay: tool.price,
            location: `Rack ${Math.floor(toolIndex / 5) + 1}`,
            notes: `Added by seeding script on ${formatDate(new Date())}`,
          });
          
          createdTools.push({
            _id: toolId,
            name: tool.name,
            category: category,
            rentalPricePerDay: tool.price,
          });
          
          console.log(`  ✅ Created: ${tool.name} (${tool.price === 0 ? 'FREE' : '$' + tool.price + '/day'})`);
          toolIndex++;
        } catch (error) {
          console.error(`  ❌ Failed to create ${tool.name}:`, error);
        }
      }
    }

    console.log(`📦 Created ${createdTools.length} tools total`);

    // Step 2: Create rental requests for the next 2 weeks
    console.log("📅 Creating rental requests for next 2 weeks...");

    // Get some customer/regular users for rentals
    const renters = users.filter(u => u.role !== "dev").slice(0, Math.min(5, users.length));
    if (renters.length === 0) {
      console.log("⚠️  No non-dev users found, using dev users as renters");
      renters.push(...users.slice(0, 3));
    }

    // Create 15 requests for 2 weeks (5 full day, 3 week long, 7 few days)
    const longTermRentals = [];

    // 5 full day rentals
    console.log("📋 Creating 5 full day rentals...");
    for (let i = 0; i < 5 && i < createdTools.length; i++) {
      try {
        const tool = createdTools[i];
        const renter = renters[i % renters.length];
        const startDate = getRandomDateInNext2Weeks();
        const endDate = addDays(startDate, 1); // Next day
        const shift = getRandomShift();

        const rentalId = await client.mutation(api.tools.createRentalRequest, {
          toolId: tool._id,
          rentalStartDate: formatDate(startDate),
          rentalEndDate: formatDate(endDate),
          notes: `Full day rental - ${shift.start} to ${shift.end}`,
        });

        longTermRentals.push(rentalId);
        console.log(`  ✅ Full day: ${tool.name} for ${renter.name} (${formatDate(startDate)})`);
      } catch (error) {
        console.error(`  ❌ Failed to create full day rental:`, error);
      }
    }

    // 3 week-long rentals
    console.log("📋 Creating 3 week-long rentals...");
    for (let i = 5; i < 8 && i < createdTools.length; i++) {
      try {
        const tool = createdTools[i];
        const renter = renters[i % renters.length];
        const startDate = getRandomDateInNext2Weeks();
        const endDate = addDays(startDate, 7); // One week later
        const startShift = getRandomShift();
        const endShift = getRandomShift();

        const rentalId = await client.mutation(api.tools.createRentalRequest, {
          toolId: tool._id,
          rentalStartDate: formatDate(startDate),
          rentalEndDate: formatDate(endDate),
          notes: `Week-long rental - Start: ${startShift.start}, End: ${endShift.end}`,
        });

        longTermRentals.push(rentalId);
        console.log(`  ✅ Week-long: ${tool.name} for ${renter.name} (${formatDate(startDate)} - ${formatDate(endDate)})`);
      } catch (error) {
        console.error(`  ❌ Failed to create week-long rental:`, error);
      }
    }

    // 7 few-days rentals (2-4 days)
    console.log("📋 Creating 7 few-days rentals...");
    for (let i = 8; i < 15 && i < createdTools.length; i++) {
      try {
        const tool = createdTools[i % createdTools.length]; // Wrap around if needed
        const renter = renters[i % renters.length];
        const startDate = getRandomDateInNext2Weeks();
        const daysToRent = Math.floor(Math.random() * 3) + 2; // 2-4 days
        const endDate = addDays(startDate, daysToRent);
        const startShift = getRandomShift();
        const endShift = getRandomShift();

        const rentalId = await client.mutation(api.tools.createRentalRequest, {
          toolId: tool._id,
          rentalStartDate: formatDate(startDate),
          rentalEndDate: formatDate(endDate),
          notes: `${daysToRent}-day rental - Start: ${startShift.start}, End: ${endShift.end}`,
        });

        longTermRentals.push(rentalId);
        console.log(`  ✅ ${daysToRent}-day: ${tool.name} for ${renter.name} (${formatDate(startDate)} - ${formatDate(endDate)})`);
      } catch (error) {
        console.error(`  ❌ Failed to create few-days rental:`, error);
      }
    }

    // Step 3: Create 15 short-term rentals (less than 1 day) - all for free tools
    console.log("⚡ Creating 15 short-term rentals (< 1 day)...");
    const freeTools = createdTools.filter(tool => tool.rentalPricePerDay === 0);
    
    if (freeTools.length === 0) {
      console.log("⚠️  No free tools available for short-term rentals");
    } else {
      for (let i = 0; i < 15; i++) {
        try {
          const tool = freeTools[i % freeTools.length];
          const renter = renters[i % renters.length];
          const startDate = getRandomDateInNext2Weeks();
          const endDate = startDate; // Same day
          
          // For 5 of them, make them start or end by end of day
          let notes = "Short-term rental";
          if (i < 5) {
            const isStartEndOfDay = Math.random() < 0.5;
            if (isStartEndOfDay) {
              notes = "Short-term rental - Starts at end of day (17:00)";
            } else {
              notes = "Short-term rental - Ends by end of day (17:00)";
            }
          } else {
            // Random times during the day
            const startHour = Math.floor(Math.random() * 12) + 6; // 6 AM to 6 PM
            const endHour = Math.min(startHour + Math.floor(Math.random() * 4) + 1, 18); // +1 to +4 hours, max 6 PM
            notes = `Short-term rental - ${String(startHour).padStart(2, '0')}:00 to ${String(endHour).padStart(2, '0')}:00`;
          }

          const rentalId = await client.mutation(api.tools.createRentalRequest, {
            toolId: tool._id,
            rentalStartDate: formatDate(startDate),
            rentalEndDate: formatDate(endDate),
            notes: notes,
          });

          console.log(`  ✅ Short-term: ${tool.name} for ${renter.name} (${formatDate(startDate)}) - ${notes}`);
        } catch (error) {
          console.error(`  ❌ Failed to create short-term rental:`, error);
        }
      }
    }

    // Step 4: Approve some rentals to create realistic data
    console.log("✅ Approving some rental requests...");
    
    // Get all rentals to approve about 60% of them
    const allRentals = await client.query(api.tools.listToolRentals);
    const pendingRentals = allRentals.filter(r => r.status === "pending");
    const rentalsToApprove = pendingRentals.slice(0, Math.floor(pendingRentals.length * 0.6));
    
    for (const rental of rentalsToApprove) {
      try {
        await client.mutation(api.tools.updateRentalStatus, {
          rentalId: rental._id,
          status: "approved",
          notes: "Auto-approved by seeding script",
        });
        console.log(`  ✅ Approved rental: ${rental.tool?.name || 'Unknown tool'}`);
      } catch (error) {
        console.error(`  ❌ Failed to approve rental:`, error);
      }
    }

    // Step 5: Make some approved rentals active to test conflicts
    console.log("🔄 Making some rentals active...");
    const approvedRentals = await client.query(api.tools.listToolRentals);
    const recentlyApproved = approvedRentals.filter(r => r.status === "approved").slice(0, 5);
    
    for (const rental of recentlyApproved) {
      try {
        await client.mutation(api.tools.updateRentalStatus, {
          rentalId: rental._id,
          status: "active",
          notes: "Made active by seeding script - tool is now checked out",
        });
        console.log(`  ✅ Made active: ${rental.tool?.name || 'Unknown tool'} (now unavailable)`);
      } catch (error) {
        console.error(`  ❌ Failed to make rental active:`, error);
      }
    }

    console.log("🎉 Tool rental seeding completed successfully!");
    console.log("📊 Summary:");
    console.log(`   • ${createdTools.length} tools created (${createdTools.filter(t => t.rentalPricePerDay === 0).length} free, ${createdTools.filter(t => t.rentalPricePerDay > 0).length} paid)`);
    console.log(`   • ${longTermRentals.length} long-term rentals (1+ days)`);
    console.log(`   • 15 short-term rentals (< 1 day)`);
    console.log(`   • ${rentalsToApprove.length} rentals approved`);
    console.log(`   • ${recentlyApproved.length} rentals made active`);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Run the seeding function
seedToolRentals()
  .then(() => {
    console.log("✨ Seeding script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeding script failed:", error);
    process.exit(1);
  });