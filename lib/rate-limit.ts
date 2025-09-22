// Simple in-memory rate limiter
const requests = new Map<string, number[]>();

export function rateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60000, // 1 minute
): boolean {
  const now = Date.now();
  const userRequests = requests.get(identifier) || [];

  // Remove old requests outside the window
  const validRequests = userRequests.filter((time) => now - time < windowMs);

  // Check if limit exceeded
  if (validRequests.length >= maxRequests) {
    return false; // Rate limit hit
  }

  // Add current request
  validRequests.push(now);
  requests.set(identifier, validRequests);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance
    for (const [key, times] of requests.entries()) {
      const valid = times.filter((time) => now - time < windowMs);
      if (valid.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, valid);
      }
    }
  }

  return true; // Request allowed
}

export function getRateLimitMiddleware(maxRequests = 10, windowMs = 60000) {
  return (req: Request): Response | null => {
    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (!rateLimit(ip, maxRequests, windowMs)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return null; // Continue
  };
}
