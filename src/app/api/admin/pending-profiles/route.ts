import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true, requireAdmin: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const adminClient = createSupabaseAdminClient() as any;
    
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('confirmed', false)
      .eq('rejected', false)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('[Admin] Pending profiles error:', profilesError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la récupération', 500);
    }

    const userIds = (profiles || []).map((p: any) => p.user_id as string);
    
    let shopifyConfigs: Array<{ id: string; shop_domain: string | null }> = [];
    if (userIds.length > 0) {
      const { data } = await adminClient
        .from('shopify_config')
        .select('id, shop_domain')
        .in('id', userIds);
      shopifyConfigs = data || [];
    }

    const pendingProfiles = (profiles || []).map((profile: any) => {
      const shopifyConfig = shopifyConfigs.find((c) => c.id === profile.user_id);
      return {
        userId: profile.user_id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        companyName: profile.company_name,
        siret: profile.siret,
        vatNumber: profile.vat_number,
        companyPhone: profile.company_phone,
        shopDomain: shopifyConfig?.shop_domain || null,
        createdAt: profile.created_at,
      };
    });

    return successResponse({ profiles: pendingProfiles });
  } catch (error) {
    console.error('[Admin] Pending profiles unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
