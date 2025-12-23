import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { errorResponse, ErrorCodes } from './response';
import { securityLog } from '@/lib/security';
import type { User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User;
  isAdmin: boolean;
  isConfirmed: boolean;
  priceCategory: string;
}

export async function requireAuth(
  request: Request,
  options: { requireConfirmed?: boolean; requireAdmin?: boolean } = {}
): Promise<AuthResult | ReturnType<typeof errorResponse>> {
  const { requireConfirmed = true, requireAdmin = false } = options;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      securityLog('UNAUTHORIZED_ACCESS', {
        route: new URL(request.url).pathname,
        reason: 'No valid session',
      });
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentification requise', 401);
    }

    const adminClient = createSupabaseAdminClient() as any;
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('confirmed, rejected, is_admin, price_category')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      securityLog('PROFILE_NOT_FOUND', {
        userId: user.id,
        route: new URL(request.url).pathname,
      });
      return errorResponse(ErrorCodes.NOT_FOUND, 'Profil non trouvé', 404);
    }

    if ((profile as any).rejected) {
      securityLog('REJECTED_ACCOUNT_ACCESS', {
        userId: user.id,
        route: new URL(request.url).pathname,
      });
      return errorResponse(ErrorCodes.ACCOUNT_REJECTED, 'Votre compte a été rejeté', 403);
    }

    if (requireConfirmed && !(profile as any).confirmed) {
      securityLog('UNCONFIRMED_ACCOUNT_ACCESS', {
        userId: user.id,
        route: new URL(request.url).pathname,
      });
      return errorResponse(
        ErrorCodes.ACCOUNT_PENDING,
        'Votre compte est en attente de validation',
        403
      );
    }

    if (requireAdmin && !(profile as any).is_admin) {
      securityLog('ADMIN_ACCESS_DENIED', {
        userId: user.id,
        route: new URL(request.url).pathname,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis', 403);
    }

    return {
      user,
      isAdmin: profile.is_admin,
      isConfirmed: profile.confirmed,
      priceCategory: profile.price_category || 'D',
    };
  } catch (error) {
    console.error('[Auth] Error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur d\'authentification', 500);
  }
}

export function isAuthResult(result: unknown): result is AuthResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'user' in result &&
    'isAdmin' in result &&
    'isConfirmed' in result
  );
}
