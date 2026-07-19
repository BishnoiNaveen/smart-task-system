import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is missing.");
}

// Instantiate a new pg connection Pool. Pooling allows reusing database sockets for efficiency.
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Instantiate PrismaClient wrapping the PostgreSQL pg-pool adapter (Prisma 7 standard)
const prisma = new PrismaClient({ adapter });

console.log("🐘 PostgreSQL Client Pool Initialized.");

export { prisma, pool };
