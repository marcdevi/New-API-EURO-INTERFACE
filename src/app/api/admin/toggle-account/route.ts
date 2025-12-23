import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { toggleAccountSchema } from '@/lib/schemas';
import { securityLog } from '@/lib/security';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true, requireAdmin: true });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Corps de requête invalide', 400);
    }

    const validation = toggleAccountSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validation.error.errors.map((e) => e.message).join(', '),
        400
      );
    }

    const adminClient = createSupabaseAdminClient();
    
    const { error } = await (adminClient as any)
      .from('profiles')
      .update({ 
        confirmed: validation.data.enable,
        rejected: !validation.data.enable,
      })
      .eq('user_id', validation.data.userId);

    if (error) {
      console.error('[Admin] Toggle account error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la mise à jour', 500);
    }

    securityLog('ACCOUNT_TOGGLED', {
      userId: validation.data.userId,
      details: {
        enabled: validation.data.enable,
        adminId: authResult.user.id,
      },
    });

    return successResponse({ 
      message: validation.data.enable 
        ? 'Compte activé' 
        : 'Compte désactivé' 
    });
  } catch (error) {
    console.error('[Admin] Toggle account unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
