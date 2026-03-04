/**
 * Simple sliding-window rate limiter.
 * Tracks per-key event counts within a rolling time window.
 */

interface Bucket {
  count: number
  windowStart: number
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>()
  private readonly max: number
  private readonly windowMs: number

  constructor(max: number, windowMs: number) {
    this.max = max
    this.windowMs = windowMs
  }

  /** Returns true if the event is allowed, false if rate limit exceeded. */
  allow(key: string): boolean {
    const now = Date.now()
    const bucket = this.buckets.get(key)

    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStart: now })
      return true
    }

    if (bucket.count >= this.max) return false

    bucket.count++
    return true
  }

  /** Call on socket disconnect to free memory. */
  remove(key: string): void {
    this.buckets.delete(key)
  }
}
