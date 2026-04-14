import { NextRequest } from 'next/server';
import { errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { getClientIp } from '@/lib/security';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rateLimitResult = await checkRateLimit(`shopify:bulk-import:${ip}`);
  if (!rateLimitResult.success) {
    return errorResponse(ErrorCodes.RATE_LIMITED, 'Trop de requêtes, réessayez plus tard', 429);
  }

  const authResult = await requireAuth(request, { requireConfirmed: true });
  if (!isAuthResult(authResult)) {
    return authResult;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Corps de requête invalide', 400);
  }

  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    console.error('[bulk-import proxy] API_BASE_URL not configured');
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'API non configurée', 500);
  }

  try {
    const upstreamRes = await fetch(`${baseUrl}/api/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await upstreamRes.json().catch(() => null);

    return new Response(JSON.stringify(data), {
      status: upstreamRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[bulk-import proxy] Upstream error:', err);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Impossible de joindre l\'API', 502);
  }
}
