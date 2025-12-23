import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, isAuthResult } from '@/lib/api/auth';
import { updateProfileSchema } from '@/lib/schemas';
import type { ProfileDTO } from '@/types/api';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: false });

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const adminClient = createSupabaseAdminClient() as any;
    const { data: profile, error }: { data: any; error: any } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', authResult.user.id)
      .single();

    if (error || !profile) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Profil non trouvé', 404);
    }

    const p = profile as any;

    const profileDTO: ProfileDTO = {
      userId: p.user_id,
      email: p.email,
      firstName: p.first_name,
      lastName: p.last_name,
      companyName: p.company_name,
      siret: p.siret,
      vatNumber: p.vat_number,
      companyPhone: p.company_phone,
      confirmed: p.confirmed,
      rejected: p.rejected,
      isAdmin: p.is_admin,
      priceCategory: p.price_category,
    };

    return successResponse(profileDTO);
  } catch (error) {
    console.error('[Profile] GET error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request, { requireConfirmed: true });

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

    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validation.error.errors.map((e) => e.message).join(', '),
        400
      );
    }

    const updates: Record<string, unknown> = {};
    if (validation.data.firstName) updates.first_name = validation.data.firstName;
    if (validation.data.lastName) updates.last_name = validation.data.lastName;
    if (validation.data.companyName) updates.company_name = validation.data.companyName;
    if (validation.data.siret) updates.siret = validation.data.siret;
    if (validation.data.vatNumber) updates.vat_number = validation.data.vatNumber;
    if (validation.data.phone) updates.company_phone = validation.data.phone;
    if (validation.data.priceCategory) updates.price_category = validation.data.priceCategory;

    const adminClient = createSupabaseAdminClient() as any;
    const { error }: { error: any } = await (adminClient
      .from('profiles') as any)
      .update(updates)
      .eq('user_id', authResult.user.id);

    if (error) {
      console.error('[Profile] Update error:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur lors de la mise à jour', 500);
    }

    return successResponse({ message: 'Profil mis à jour avec succès' });
  } catch (error) {
    console.error('[Profile] PATCH error:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Erreur interne', 500);
  }
}
