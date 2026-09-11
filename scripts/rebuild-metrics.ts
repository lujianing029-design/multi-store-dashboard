import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { DailyAggregationService } from "../src/lib/metrics/aggregation";
import { PrismaAggregationRepository } from "../src/lib/metrics/prisma-aggregation-repository";
import { getZonedRange } from "../src/lib/metrics/timezone";
import { sanitizeError } from "../src/platforms/security";

async function main() {
  const defaults = getZonedRange("30d");
  const startDate = process.argv[2] ?? defaults.startDate;
  const endDate = process.argv[3] ?? defaults.endDate;
  const result = await new DailyAggregationService(
    new PrismaAggregationRepository(prisma)
  ).rebuild(startDate, endDate);
  console.info(`Metrics rebuilt: shop-days=${result.shopDays}, product-days=${result.productDays}`);
}

main()
  .catch((error: unknown) => {
    const sanitized = sanitizeError(error);
    console.error(`${sanitized.code}: ${sanitized.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

