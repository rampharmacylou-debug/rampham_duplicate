// No users to seed — the app uses a simple role switcher with no login.
// This file is kept for future use (e.g. seeding sample data).
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  console.log("✓ Database is ready. No seed data required.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
