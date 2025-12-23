import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: false });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const expectedSecret = process.env.SUPER_ADMIN_SECRET;
  if (!expectedSecret || expectedSecret.length < 16) {
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'SUPER_ADMIN_SECRET manquant ou trop court (min 16 caractères)',
      500
    );
  }

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const providedSecret =
      request.headers.get('x-super-admin-secret') || body?.secret || body?.SUPER_ADMIN_SECRET;

    if (providedSecret !== expectedSecret) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès refusé', 403);
    }

    const adminClient = createSupabaseAdminClient() as any;

    const targetUserId = authResult.user.id;

    const { data: profile, error: profileError }: { data: any; error: any } = await adminClient
      .from('profiles')
      .select('user_id, email')
      .eq('user_id', targetUserId)
      .single();

    if (profileError || !profile) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Profil introuvable pour cet utilisateur. Créez d\'abord votre profil (inscription) puis réessayez.',
        404
      );
    }

    const { error: updateError }: { error: any } = await (adminClient.from('profiles') as any)
      .update({ is_admin: true, confirmed: true, rejected: false })
      .eq('user_id', targetUserId);

    if (updateError) {
      console.error('[Admin] Bootstrap super admin update error:', updateError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la mise à jour', 500);
    }

    return successResponse({
      message: `Super admin activé pour ${profile.email}`,
      userId: targetUserId,
    });
  } catch (err) {
    console.error('[Admin] Bootstrap super admin error:', err);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
