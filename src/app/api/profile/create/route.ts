import { NextRequest } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { createProfileSchema } from '@/lib/schemas';
import { securityLog, getClientIp } from '@/lib/security';
import { checkRateLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rateLimitResult = await checkRateLimit(`profile:create:${ip}`);
  if (!rateLimitResult.success) {
    securityLog('RATE_LIMITED', { ip, route: '/api/profile/create' });
    return errorResponse(ErrorCodes.RATE_LIMITED, 'Trop de requêtes, réessayez plus tard', 429);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentification requise', 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Corps de requête invalide', 400);
    }

    const validation = createProfileSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validation.error.errors.map((e) => e.message).join(', '),
        400
      );
    }

    const { firstName, lastName, companyName, siret, vatNumber, phone, shopifyDomain } =
      validation.data;

    const adminClient = createSupabaseAdminClient() as any;

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Un profil existe déjà pour cet utilisateur', 400);
    }

    const { error: profileError } = await adminClient.from('profiles').insert({
      user_id: user.id,
      email: user.email!,
      first_name: firstName,
      last_name: lastName,
      company_name: companyName,
      siret,
      vat_number: vatNumber || null,
      company_phone: phone,
      confirmed: false,
      rejected: false,
      is_admin: false,
      price_category: 'D',
    } as any);

    if (profileError) {
      console.error('[Profile] Create error:', profileError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la création du profil', 500);
    }

    if (shopifyDomain) {
      const { error: shopifyError } = await adminClient.from('shopify_config').insert({
        id: user.id,
        shop_domain: shopifyDomain,
        access_token_encrypted: null,
      });

      if (shopifyError) {
        console.error('[Profile] Shopify config error:', shopifyError);
      }
    }

    securityLog('PROFILE_CREATED', { userId: user.id, ip });

    return successResponse(
      { message: 'Profil créé avec succès. En attente de validation par un administrateur.' },
      201
    );
  } catch (error) {
    console.error('[Profile] Unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
