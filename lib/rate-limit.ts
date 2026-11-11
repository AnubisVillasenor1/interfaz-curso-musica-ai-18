import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

export type RateLimitDecision =
  | { status: "allowed"; limit: number; remaining: number; reset: number }
  | { status: "limited"; limit: number; remaining: 0; reset: number }
  | { status: "unavailable" }

const redisUrl = process.env.KV_REST_API_URL
const redisToken = process.env.KV_REST_API_TOKEN
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null
const limiters = new Map<string, Ratelimit>()

function getLimiter(limit: number, windowMs: number) {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))
  const key = `${limit}:${windowSeconds}`
  const cached = limiters.get(key)
  if (cached) return cached

  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"
  const limiter = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: `play-and-go:${environment}:${key}`,
  })
  limiters.set(key, limiter)
  return limiter
}

async function fingerprint(identifier: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(identifier))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function rateLimitPublic(
  identifier: string,
  limit: number,
  windowMs = 60_000,
): Promise<RateLimitDecision> {
  if (!redis) return { status: "unavailable" }

  try {
    const limiter = getLimiter(limit, windowMs)
    const result = await limiter.limit(await fingerprint(identifier))
    await result.pending

    if (!result.success) {
      return { status: "limited", limit, remaining: 0, reset: result.reset }
    }

    return {
      status: "allowed",
      limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch {
    console.error("[v0] Distributed rate limit service unavailable")
    return { status: "unavailable" }
  }
}

export function retryAfterSeconds(reset: number) {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000))
}

export async function enforceRateLimit(
  identifier: string,
  limit: number,
  message: string,
  extraHeaders: Record<string, string> = {},
) {
  const decision = await rateLimitPublic(identifier, limit)
  if (decision.status === "allowed") return null

  const status = decision.status === "limited" ? 429 : 503
  const headers = new Headers(extraHeaders)
  headers.set("Cache-Control", "no-store")
  headers.set(
    "Retry-After",
    decision.status === "limited" ? String(retryAfterSeconds(decision.reset)) : "5",
  )

  return NextResponse.json(
    {
      error:
        decision.status === "limited"
          ? message
          : "El control de solicitudes no está disponible temporalmente. Inténtalo de nuevo.",
      code: decision.status === "limited" ? "rate_limited" : "rate_limit_unavailable",
    },
    { status, headers },
  )
}

export function ipOf(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp.slice(0, 120)

  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1].slice(0, 120)
  }

  return "sin-ip"
}
