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
    
    const { data, error } = await adminClient
      .from('CATEGORIES')
      .select('id, categorie_nom')
      .order('categorie_nom', { ascending: true });

    if (error) {
      console.error('[Categories] Error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la récupération des catégories', 500);
    }

    const categories = (data || []).map((cat: any) => ({
      id: cat.id,
      name: cat.categorie_nom,
    }));

    return successResponse({ categories });
  } catch (error) {
    console.error('[Categories] Unexpected error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
