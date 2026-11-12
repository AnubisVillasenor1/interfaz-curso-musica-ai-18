import http from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import IORedis from "ioredis";
import { Queue, Worker } from "bullmq";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, HeadBucketCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import client from "prom-client";
import { z } from "zod";

const required = ["REDIS_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GATEWAY_INTERNAL_TOKEN", "AUDIOCORE_URL", "AUDIOCORE_INTERNAL_TOKEN", "S3_ENDPOINT", "S3_ACCESS_KEY", "S3_SECRET_KEY"];
for (const key of required) if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
const port = Number(process.env.GATEWAY_PORT ?? 8080);
const metricsPort = Number(process.env.METRICS_PORT ?? 9101);
const bucket = process.env.S3_BUCKET ?? "tamv-audio";
const redis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: true });
const queue = new Queue("tamv-audio-generation", { connection: redis, defaultJobOptions: {
  attempts: 3, backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 86400, count: 500 }, removeOnFail: { age: 604800, count: 2000 }
}});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const s3 = new S3Client({ region: process.env.S3_REGION ?? "us-east-1", endpoint: process.env.S3_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY } });

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "play_and_go_worker_" });
const jobsStarted = new client.Counter({ name: "tamv_audio_jobs_started_total", help: "Audio jobs started", labelNames: ["mode"], registers: [register] });
const jobsCompleted = new client.Counter({ name: "tamv_audio_jobs_completed_total", help: "Audio jobs completed", labelNames: ["mode"], registers: [register] });
const jobsFailed = new client.Counter({ name: "tamv_audio_jobs_failed_total", help: "Audio jobs failed", labelNames: ["stage"], registers: [register] });
const jobsActive = new client.Gauge({ name: "tamv_audio_jobs_active", help: "Audio jobs currently executing", registers: [register] });
const generationDuration = new client.Histogram({ name: "tamv_audio_generation_duration_seconds", help: "End-to-end generation duration", labelNames: ["mode"], buckets: [5,15,30,60,120,300,600], registers: [register] });
const queueWaiting = new client.Gauge({ name: "tamv_queue_waiting_jobs", help: "Jobs waiting in BullMQ", registers: [register] });
const schema = z.object({
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  prompt: z.string().trim().min(3).max(2000),
  mode: z.enum(["instrumental", "vocal", "hybrid"]).default("instrumental"),
  parameters: z.object({
    temperature: z.number().min(0).max(1.5).default(1),
    guidanceScale: z.number().min(1).max(10).default(3),
    durationSeconds: z.number().int().min(5).max(30).default(15),
    sampleRate: z.union([z.literal(32000), z.literal(44100), z.literal(48000)]).default(32000),
    spectralAnalysis: z.boolean().default(true),
    seed: z.number().int().min(0).max(2147483647).optional()
  }).strict()
}).strict();

function authorized(req) {
  const value = req.headers.authorization ?? "";
  const expected = `Bearer ${process.env.GATEWAY_INTERNAL_TOKEN}`;
  const a = Buffer.from(value), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function json(res, status, body) {
  const bytes = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": bytes.length, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(bytes);
}
async function readJson(req, maxBytes = 32768) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("Invalid JSON"), { statusCode: 400 }); }
}
async function updateTask(taskId, values) {
  const { error } = await supabase.from("audio_generation_tasks").update(values).eq("task_id", taskId);
  if (error) throw new Error(`Task persistence failed: ${error.message}`);
}
async function ensureBucket() {
  // Bucket provisioning is an administrator/bootstrap operation. Worker credentials
  // must not have bucket-creation or administrative permissions.
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
}
const worker = new Worker("tamv-audio-generation", async (job) => {
  const started = Date.now(); const { taskId, userId, prompt, mode, parameters } = job.data;
  jobsActive.inc(); jobsStarted.inc({ mode });
  let stage = "musicgen";
  try {
    await updateTask(taskId, { status: "processing", progress: 5, started_at: new Date().toISOString(), error_message: null });
    await job.updateProgress({ stage: "model_loading", progress: 10 });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.AUDIOCORE_TIMEOUT_MS ?? 600000));
    let generated;
    try {
      const response = await fetch(new URL("/v1/generate", process.env.AUDIOCORE_URL), {
        method: "POST", signal: controller.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.AUDIOCORE_INTERNAL_TOKEN}` },
        body: JSON.stringify({ taskId, prompt, mode, parameters })
      });
      if (!response.ok) throw new Error(`MusicGen service returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
      generated = await response.json();
    } finally { clearTimeout(timeout); }
    if (typeof generated.audioBase64 !== "string" || !generated.audioBase64.length) throw new Error("MusicGen returned no audio payload");
    const audio = Buffer.from(generated.audioBase64, "base64");
    if (audio.length < 44 || audio.length > Number(process.env.MAX_AUDIO_BYTES ?? 50000000)) throw new Error("Generated audio size is outside the permitted range");
    await job.updateProgress({ stage: "audio_generated", progress: 65 });
    await updateTask(taskId, { progress: 65 });
    stage = "storage";
    await ensureBucket();
    const objectKey = `users/${userId}/${taskId}.wav`;
    const sha256 = createHash("sha256").update(audio).digest("hex");
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: audio, ContentType: "audio/wav", Metadata: { "task-id": taskId, "content-sha256": sha256 } }));
    await job.updateProgress({ stage: "stored", progress: 85 });
    stage = "persistence";
    await updateTask(taskId, {
      status: "completed", progress: 100, audio_object_key: objectKey, audio_bucket: bucket,
      audio_mime_type: "audio/wav", byte_size: audio.length, content_hash: sha256,
      duration_seconds: generated.durationSeconds, sample_rate: generated.sampleRate,
      spectral_metadata: generated.spectralMetadata ?? null, completed_at: new Date().toISOString()
    });
    await job.updateProgress({ stage: "completed", progress: 100 });
    jobsCompleted.inc({ mode }); generationDuration.observe({ mode }, (Date.now() - started) / 1000);
    return { taskId, objectKey, sha256, byteSize: audio.length };
  } catch (error) {
    jobsFailed.inc({ stage });
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown generation error";
    try { await updateTask(taskId, { status: "failed", error_message: message, completed_at: new Date().toISOString() }); }
    catch (persistError) { console.error("Failed to persist task failure", persistError); }
    throw error;
  } finally { jobsActive.dec(); }
}, { connection: redis, concurrency: Math.max(1, Math.min(2, Number(process.env.WORKER_CONCURRENCY ?? 1))), limiter: { max: Number(process.env.WORKER_MAX_JOBS_PER_MINUTE ?? 6), duration: 60000 } });

worker.on("failed", (job, error) => console.error("Audio job failed", { id: job?.id, message: error.message }));
worker.on("error", (error) => console.error("BullMQ worker error", error));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/healthz" && req.method === "GET") return json(res, 200, { status: "ok", service: "gateway-worker", queue: "tamv-audio-generation" });
  if (url.pathname === "/metrics" && req.method === "GET") {
    try { queueWaiting.set(await queue.getWaitingCount()); res.writeHead(200, { "content-type": register.contentType, "cache-control": "no-store" }); res.end(await register.metrics()); }
    catch (error) { json(res, 503, { error: "Metrics temporarily unavailable" }); }
    return;
  }
  if (url.pathname.startsWith("/v1/audio-url/") && req.method === "GET") {
    if (!authorized(req)) return json(res, 401, { error: "Unauthorized" });
    const taskId = url.pathname.slice("/v1/audio-url/".length);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskId)) return json(res, 400, { error: "Invalid task id" });
    try {
      const { data: task, error } = await supabase.from("audio_generation_tasks")
        .select("status,audio_object_key,audio_bucket").eq("task_id", taskId).maybeSingle();
      if (error) throw error;
      if (!task || task.status !== "completed" || !task.audio_object_key || !task.audio_bucket) return json(res, 404, { error: "Completed audio not found" });
      const signedUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: task.audio_bucket, Key: task.audio_object_key }), { expiresIn: 300 });
      return json(res, 200, { url: signedUrl, expiresIn: 300 });
    } catch (error) {
      console.error("Could not sign audio URL", error);
      return json(res, 503, { error: "Audio storage temporarily unavailable" });
    }
  }
  if (url.pathname === "/v1/jobs" && req.method === "POST") {
    if (!authorized(req)) return json(res, 401, { error: "Unauthorized" });
    try {
      const input = schema.parse(await readJson(req));
      const job = await queue.add("generate-audio", input, { jobId: input.taskId, priority: 5 });
      return json(res, 202, { taskId: input.taskId, status: "queued", queueJobId: String(job.id) });
    } catch (error) {
      const status = error?.statusCode ?? (error?.name === "ZodError" ? 400 : 500);
      return json(res, status, { error: status === 500 ? "Could not enqueue audio job" : error.message, code: status === 400 ? "invalid_request" : "enqueue_failed" });
    }
  }
  return json(res, 404, { error: "Not found" });
});
server.listen(port, "0.0.0.0", () => console.info(`Gateway worker API listening on :${port}`));
const metricsServer = http.createServer(async (_req, res) => {
  try { queueWaiting.set(await queue.getWaitingCount()); res.writeHead(200, { "content-type": register.contentType, "cache-control": "no-store" }); res.end(await register.metrics()); }
  catch { res.writeHead(503); res.end("metrics unavailable"); }
});
metricsServer.listen(metricsPort, "0.0.0.0", () => console.info(`Metrics listening on :${metricsPort}`));
async function shutdown(signal) {
  console.info(`Received ${signal}; shutting down`);
  server.close(); metricsServer.close();
  await worker.close(); await queue.close(); await redis.quit();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
