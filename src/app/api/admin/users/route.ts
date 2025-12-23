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
    
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('*')
      .or('confirmed.eq.true,rejected.eq.true')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin] Users error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la récupération', 500);
    }

    const users = (profiles || []).map((profile: any) => ({
      userId: profile.user_id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      companyName: profile.company_name,
      siret: profile.siret,
      vatNumber: profile.vat_number,
      companyPhone: profile.company_phone,
      confirmed: profile.confirmed,
      rejected: profile.rejected,
      isAdmin: profile.is_admin,
      priceCategory: profile.price_category,
      createdAt: profile.created_at,
    }));

    return successResponse({ users });
  } catch (error) {
    console.error('[Admin] Users unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
