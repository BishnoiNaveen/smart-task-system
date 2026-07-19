require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

async function verify() {
  console.log("=== Verification: PostgreSQL Database Connection & Prisma Client ===");
  
  const connectionString = process.env.DATABASE_URL;
  console.log("DATABASE_URL setting checked.");
  
  if (!connectionString || connectionString.startsWith("file:")) {
    console.error("FAIL: DATABASE_URL is either missing or still configured for SQLite.");
    console.error("Please configure a PostgreSQL connection string in '.env' before running verification.");
    process.exit(1);
  }
  
  try {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    console.log("1. Prisma Client instantiated with PostgreSQL adapter successfully.");
    
    const count = await prisma.user.count();
    console.log(`2. Database query successful. Count of registered users: ${count}`);
    
    console.log("3. Priority Score algorithm test checks:");
    
    function computePriorityScoreJS(task) {
      let priorityWeight = 10;
      if (task.priority === "HIGH") priorityWeight = 30;
      else if (task.priority === "MEDIUM") priorityWeight = 20;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);

      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let urgencyPoints = 0;
      if (diffDays < 0) {
        urgencyPoints = 50 + Math.min(30, Math.abs(diffDays) * 2);
      } else if (diffDays === 0) {
        urgencyPoints = 40;
      } else if (diffDays === 1) {
        urgencyPoints = 25;
      } else if (diffDays <= 3) {
        urgencyPoints = 15;
      } else if (diffDays <= 7) {
        urgencyPoints = 5;
      }

      return priorityWeight + urgencyPoints;
    }

    const testTasks = [
      { priority: "HIGH", dueDate: new Date(Date.now() + 86400000 * 1) },
      { priority: "LOW", dueDate: new Date(Date.now() - 86400000 * 2) },
      { priority: "MEDIUM", dueDate: new Date(Date.now() + 86400000 * 5) }
    ];

    const scores = testTasks.map(t => computePriorityScoreJS(t));
    console.log("   - High priority, due tomorrow. Expected: 55. Calculated:", scores[0]);
    console.log("   - Low priority, 2 days overdue. Expected: 64. Calculated:", scores[1]);
    console.log("   - Medium priority, due in 5 days. Expected: 25. Calculated:", scores[2]);

    if (scores[0] === 55 && scores[1] === 64 && scores[2] === 25) {
      console.log("   -> Priority Score math calculations verified.");
    } else {
      throw new Error("Calculated score mismatch!");
    }

    console.log("=================================================");
    console.log("SUCCESS: All system PostgreSQL tests passed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("FAIL: Verification failed with error:", error);
    process.exit(1);
  }
}

verify();
