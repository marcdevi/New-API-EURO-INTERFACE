import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[RateLimit] Upstash not configured, rate limiting disabled');
    return null;
  }

  const redis = new Redis({ url, token });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'eurodesign:ratelimit',
  });

  return ratelimit;
}

export async function checkRateLimit(
  identifier: string,
  limit?: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const rl = getRatelimit();

  if (!rl) {
    return { success: true, remaining: 100, reset: 0 };
  }

  try {
    const result = await rl.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    return { success: true, remaining: 100, reset: 0 };
  }
}

export function createRateLimiter(requests: number, window: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const redis = new Redis({ url, token });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    analytics: true,
    prefix: 'eurodesign:ratelimit',
  });
}

export const authRateLimiter = createRateLimiter(10, '1 m');
export const shopifyRateLimiter = createRateLimiter(20, '1 m');
export const adminRateLimiter = createRateLimiter(50, '1 m');
