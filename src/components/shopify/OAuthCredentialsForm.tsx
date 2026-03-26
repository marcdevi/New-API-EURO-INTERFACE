'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveShopifyConfigToDB, saveOAuthCredentials } from '@/app/actions/shopify';
import { ShopifyConfig } from '@/types/shopify';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Props {
  existingConfig: ShopifyConfig | null;
}

type Step = 'idle' | 'saving-db' | 'syncing-api' | 'success' | 'error';

function Spinner() {
  return (
    <svg
      className="inline-block h-4 w-4 animate-spin text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function OAuthCredentialsForm({ existingConfig }: Props) {
  const router = useRouter();

  const [shopDomain, setShopDomain] = useState(existingConfig?.shop_domain ?? '');
  const [clientId, setClientId] = useState(existingConfig?.client_id ?? '');
  const [clientSecret, setClientSecret] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const hasInvalidSuffix = shopDomain.includes('.myshopify.com');
  const isSubmitDisabled = !shopDomain || !clientId || !clientSecret || hasInvalidSuffix;

  const isLoading = step === 'saving-db' || step === 'syncing-api';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!shopDomain || !clientId || !clientSecret) {
      setStep('error');
      setErrorMsg('Tous les champs sont requis');
      return;
    }

    setStep('saving-db');
    const dbResult = await saveShopifyConfigToDB(shopDomain);

    if (!dbResult.success) {
      setStep('error');
      setErrorMsg(dbResult.error ?? 'Erreur lors de la sauvegarde en base de données');
      return;
    }

    setStep('syncing-api');
    const apiResult = await saveOAuthCredentials({
      shop_domain: shopDomain,
      client_id: clientId,
      client_secret: clientSecret,
    });

    if (!apiResult.success) {
      setStep('error');
      setErrorMsg(apiResult.error ?? 'Erreur lors de la synchronisation avec l\'API');
      return;
    }

    setStep('success');
    setClientSecret('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
        id="clientId"
        label="Client ID"
        type="text"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        required
      />

      <Input
        id="clientSecret"
        label={`Client Secret${existingConfig?.has_secret ? ' (un secret est déjà enregistré)' : ''}`}
        type="password"
        value={clientSecret}
        onChange={(e) => setClientSecret(e.target.value)}
        required
        placeholder="••••••••••••••••"
        autoComplete="new-password"
      />

      {(step === 'saving-db' || step === 'syncing-api') && (
        <div className="space-y-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="flex items-center gap-2">
            {step === 'saving-db' ? <Spinner /> : <span className="text-green-600">✓</span>}
            <span className={step !== 'saving-db' ? 'text-green-700' : ''}>
              Enregistrement en base de données...
            </span>
          </div>
          {step === 'syncing-api' && (
            <div className="flex items-center gap-2">
              <Spinner />
              <span>Synchronisation avec l&apos;API Shopify...</span>
            </div>
          )}
        </div>
      )}

      {step === 'error' && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {step === 'success' && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 space-y-1">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>Enregistrement en base de données</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>Synchronisation avec l&apos;API Shopify</span>
          </div>
          <p className="mt-2 font-medium">Mode OAuth activé avec succès.</p>
        </div>
      )}

      <Button type="submit" isLoading={isLoading} disabled={isLoading || isSubmitDisabled}>
        {step === 'saving-db' ? 'Enregistrement...' : step === 'syncing-api' ? 'Synchronisation...' : 'Sauvegarder'}
      </Button>
    </form>
  );
}
