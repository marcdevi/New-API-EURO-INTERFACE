import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true, requireAdmin: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'userId est requis', 400);
  }

  try {
    const adminClient = createSupabaseAdminClient() as any;
    
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[Admin] User details error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la récupération', 500);
    }

    if (!profile) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Utilisateur non trouvé', 404);
    }

    const { data: shopifyConfig } = await adminClient
      .from('shopify_config')
      .select('shop_domain')
      .eq('id', userId)
      .single();

    const userDetails = {
      userId: profile.user_id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      companyName: profile.company_name,
      siret: profile.siret,
      vatNumber: profile.vat_number,
      companyPhone: profile.company_phone,
      shopDomain: shopifyConfig?.shop_domain || null,
      confirmed: profile.confirmed,
      rejected: profile.rejected,
      isAdmin: profile.is_admin,
      priceCategory: profile.price_category,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };

    return successResponse({ user: userDetails });
  } catch (error) {
    console.error('[Admin] User details unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
