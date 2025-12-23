import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { setAdminSchema } from '@/lib/schemas';
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

    const validation = setAdminSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validation.error.errors.map((e) => e.message).join(', '),
        400
      );
    }

    if (validation.data.userId === authResult.user.id && !validation.data.isAdmin) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Vous ne pouvez pas retirer vos propres droits administrateur',
        403
      );
    }

    const adminClient = createSupabaseAdminClient() as any;
    
    const { error } = await adminClient
      .from('profiles')
      .update({
        is_admin: validation.data.isAdmin,
      })
      .eq('user_id', validation.data.userId);

    if (error) {
      console.error('[Admin] Set admin error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la mise à jour', 500);
    }

    securityLog('ADMIN_STATUS_CHANGED', {
      userId: validation.data.userId,
      details: {
        newStatus: validation.data.isAdmin,
        adminId: authResult.user.id,
      },
    });

    return successResponse({ 
      message: validation.data.isAdmin 
        ? 'Droits administrateur accordés' 
        : 'Droits administrateur retirés' 
    });
  } catch (error) {
    console.error('[Admin] Set admin unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
