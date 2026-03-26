'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveShopifyConfigToDB } from '@/app/actions/shopify';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Props {
  existingToken?: string | null;
  existingDomain?: string | null;
}

export function ManualTokenForm({ existingToken, existingDomain }: Props) {
  const router = useRouter();
  const [shopDomain, setShopDomain] = useState(existingDomain ?? '');
  const [accessToken, setAccessToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const hasInvalidSuffix = shopDomain.includes('.myshopify.com');
  const isSubmitDisabled = !shopDomain || !accessToken || hasInvalidSuffix;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!shopDomain || !accessToken) {
      setStatus('error');
      setErrorMsg('Tous les champs sont requis');
      return;
    }

    if (hasInvalidSuffix) {
      setStatus('error');
      setErrorMsg('Le domaine ne doit pas contenir ".myshopify.com"');
      return;
    }

    setStatus('loading');

    try {
      // 1. Sauvegarder le domaine en DB
      const dbResult = await saveShopifyConfigToDB(shopDomain);
      if (!dbResult.success) {
        setStatus('error');
        setErrorMsg(dbResult.error ?? 'Erreur lors de la sauvegarde en base de données');
        return;
      }

      // 2. Valider et sauvegarder le token avec l'API
      const response = await fetch('/api/shopify/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain, accessToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setErrorMsg(data?.error || data?.message || 'Erreur lors de la validation du token');
        return;
      }

      setStatus('success');
      setAccessToken('');
      router.refresh();
    } catch (_err) {
      setStatus('error');
      setErrorMsg('Impossible de joindre l\'API');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium mb-2">Mode manuel</p>
        <p>
          Entrez votre token d'accès Shopify. Ce token devra être renouvelé manuellement
          lorsqu'il expire.
        </p>
      </div>

      {existingToken && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          ✓ Un token est actuellement configuré
        </div>
      )}

      <Input
        id="shopDomain"
        label="Domaine Shopify"
        type="text"
        value={shopDomain}
        onChange={(e) => setShopDomain(e.target.value)}
        required
        placeholder="ma-boutique"
      />

      {hasInvalidSuffix && (
        <p className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          ⚠️ Le domaine ne doit pas contenir ".myshopify.com". Entrez uniquement "ma-boutique".
        </p>
      )}

      <Input
        id="accessToken"
        label="Token d'accès Shopify"
        type="password"
        value={accessToken}
        onChange={(e) => setAccessToken(e.target.value)}
        required
        placeholder="shpat_••••••••••••••••"
        autoComplete="off"
      />

      {status === 'error' && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {status === 'success' && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Token validé et sauvegardé avec succès.
        </p>
      )}

      <Button type="submit" isLoading={status === 'loading'} disabled={status === 'loading' || isSubmitDisabled}>
        {status === 'loading' ? 'Validation...' : 'Valider et sauvegarder'}
      </Button>
    </form>
  );
}
