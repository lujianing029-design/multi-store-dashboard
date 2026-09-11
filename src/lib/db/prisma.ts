import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public";

const adapter = new PrismaPg({
  connectionString: databaseUrl
});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
