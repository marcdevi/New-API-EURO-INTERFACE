import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { rejectProfileSchema } from '@/lib/schemas';
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

    const validation = rejectProfileSchema.safeParse(body);
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
        confirmed: false, 
        rejected: true,
        
      })
      .eq('user_id', validation.data.userId);

    if (error) {
      console.error('[Admin] Reject profile error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors du rejet', 500);
    }

    securityLog('PROFILE_REJECTED', {
      userId: validation.data.userId,
      details: {
        adminId: authResult.user.id,
      },
    });

    return successResponse({ message: 'Profil rejeté' });
  } catch (error) {
    console.error('[Admin] Reject profile unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
