import { prisma } from "@/lib/db/prisma";
import { runPublishJob } from "@/lib/publishing/worker";

/**
 * Invoke from the deployment's trusted scheduler. It only runs jobs whose
 * platform payload remains Dry Run; the API never creates real-publish jobs.
 */
export async function runDueDryRunJobs(now = new Date()) {
  const jobs = await prisma.publishJob.findMany({
    where: { status: "PENDING", runAfter: { lte: now } },
    select: { id: true }
  });
  const results = await Promise.allSettled(jobs.map((job) => runPublishJob(job.id)));
  return {
    considered: jobs.length,
    succeeded: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length
  };
}
