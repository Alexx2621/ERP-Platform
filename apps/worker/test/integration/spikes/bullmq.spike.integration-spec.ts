import { Queue, QueueEvents, Worker } from "bullmq";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";

/**
 * Fase 0 spike (docs/ROADMAP.md §4): "Outbox claim/recovery con PostgreSQL
 * + BullMQ." ADR-004 already settled the outbox's OWN dispatch mechanism
 * (a Postgres claim/lease, not BullMQ — see ADR-004's "Alternatives
 * considered") but the roadmap's mandated Fase 0 spike itself — validating
 * BullMQ as a real, working option — had never actually been executed;
 * `bullmq` was never even installed anywhere in this codebase before this
 * spike. This test validates BullMQ end-to-end against real Redis
 * (Testcontainers, matching this project's "test against real
 * infrastructure" convention everywhere else) for the concrete future job
 * types MASTER_SPEC §11 names (PDF generation, heavy report generation,
 * webhook delivery, marketplace sync) — none of which exist as real
 * features in this codebase yet, so nothing here is wired into
 * WorkerModule's real runtime module graph; `bullmq` stays a devDependency,
 * exercised only by this spike, until a real job type needs it.
 *
 * Findings, folded into ADR-004's amendment: BullMQ works correctly
 * end-to-end against Redis — jobs are delivered exactly once under normal
 * operation, retry with backoff on failure and eventually succeed or
 * exhaust into a real `failed` state, and delivery is observable via
 * QueueEvents. This confirms ADR-004's original choice (an in-process bus
 * + Postgres outbox for domain-event fan-out, not BullMQ) remains correct
 * for that specific mechanism — BullMQ solves a different problem
 * (arbitrary background jobs with heavier payloads/longer runtimes than a
 * domain event) and is now validated as the real mechanism to reach for
 * once one of MASTER_SPEC §11's job types becomes a real feature, rather
 * than an unverified name on a list.
 */
describe("BullMQ spike (docs/ROADMAP.md §4 Fase 0)", () => {
  let redis: StartedRedisContainer;
  let connection: { host: string; port: number };

  beforeAll(async () => {
    redis = await new RedisContainer("redis:7-alpine").start();
    connection = { host: redis.getHost(), port: redis.getPort() };
  }, 60_000);

  afterAll(async () => {
    await redis?.stop();
  });

  it("delivers a job exactly once under normal operation, with the result observable via QueueEvents", async () => {
    const queueName = `spike-reports-${Date.now()}-1`;
    const processed: string[] = [];
    const worker = new Worker(
      queueName,
      async (job) => {
        processed.push(job.data.reportId as string);
        return { generatedAt: "2026-09-04T00:00:00.000Z" };
      },
      { connection },
    );
    const queueEvents = new QueueEvents(queueName, { connection });
    const queue = new Queue(queueName, { connection });

    try {
      await worker.waitUntilReady();
      await queueEvents.waitUntilReady();

      const job = await queue.add("generate-report", { reportId: "report-1" });
      const result = await job.waitUntilFinished(queueEvents, 10_000);

      expect(processed).toEqual(["report-1"]);
      expect(result).toEqual({ generatedAt: "2026-09-04T00:00:00.000Z" });
    } finally {
      await worker.close();
      await queueEvents.close();
      await queue.close();
    }
  });

  it("retries a failing job with exponential backoff and eventually succeeds", async () => {
    const queueName = `spike-reports-${Date.now()}-2`;
    let attempts = 0;
    const worker = new Worker(
      queueName,
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`simulated transient failure, attempt ${attempts}`);
        }
        return { attemptsUsed: attempts };
      },
      { connection },
    );
    const queueEvents = new QueueEvents(queueName, { connection });
    const queue = new Queue(queueName, { connection });

    try {
      await worker.waitUntilReady();
      await queueEvents.waitUntilReady();

      const job = await queue.add(
        "generate-report",
        { reportId: "report-2" },
        { attempts: 5, backoff: { type: "exponential", delay: 50 } },
      );
      const result = await job.waitUntilFinished(queueEvents, 15_000);

      expect(attempts).toBe(3);
      expect(result).toEqual({ attemptsUsed: 3 });
    } finally {
      await worker.close();
      await queueEvents.close();
      await queue.close();
    }
  });

  it("moves a job that exhausts every attempt to a real failed state, never silently dropped", async () => {
    const queueName = `spike-reports-${Date.now()}-3`;
    let attempts = 0;
    const worker = new Worker(
      queueName,
      async () => {
        attempts++;
        throw new Error(`permanent failure, attempt ${attempts}`);
      },
      { connection },
    );
    const queueEvents = new QueueEvents(queueName, { connection });
    const queue = new Queue(queueName, { connection });

    try {
      await worker.waitUntilReady();
      await queueEvents.waitUntilReady();

      const job = await queue.add(
        "generate-report",
        { reportId: "report-3" },
        { attempts: 2, backoff: { type: "fixed", delay: 20 } },
      );

      await expect(job.waitUntilFinished(queueEvents, 15_000)).rejects.toThrow(
        "permanent failure, attempt 2",
      );
      expect(attempts).toBe(2);

      const failedJobs = await queue.getFailed();
      expect(failedJobs.map((j) => j.data.reportId)).toEqual(["report-3"]);
    } finally {
      await worker.close();
      await queueEvents.close();
      await queue.close();
    }
  });
});
