import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const adminClient = createSupabaseAdminClient() as any;
    const { data, error }: { data: any; error: any } = await adminClient
      .from('shopify_config')
      .select('shop_domain, access_token')
      .eq('id', authResult.user.id)
      .single();

    if (error || !data) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Configuration Shopify non trouvée', 404);
    }

    return successResponse({
      shopDomain: data.shop_domain,
      accessToken: data.access_token,
    });
  } catch (err) {
    console.error('[Shopify] Credentials GET error:', err);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
