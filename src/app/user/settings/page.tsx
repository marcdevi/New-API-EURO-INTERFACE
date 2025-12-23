'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface ShopifyConfig {
  shopDomain: string | null;
  configured: boolean;
}

export default function SettingsPage() {
  const [shopifyConfig, setShopifyConfig] = useState<ShopifyConfig | null>(null);
  const [shopDomain, setShopDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    shopName?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/shopify/config');
        const data = await response.json();
        if (data.success) {
          setShopifyConfig(data.data);
          if (data.data.shopDomain) {
            setShopDomain(data.data.shopDomain);
          }
        }
      } catch {
        console.error('Échec du chargement de la configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleValidate = async () => {
    if (!shopDomain || !accessToken) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs' });
      return;
    }

    setValidating(true);
    setValidationResult(null);
    setMessage(null);

    try {
      const response = await fetch('/api/shopify/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain, accessToken }),
      });

      const data = await response.json();
      if (data.success) {
        setValidationResult(data.data);
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Erreur de validation' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!shopDomain || !accessToken) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/shopify/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain, accessToken }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Configuration enregistrée avec succès' });
        setShopifyConfig({ shopDomain, configured: true });
        setAccessToken('');
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Erreur lors de la sauvegarde' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Paramètres</h1>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Configuration Shopify</h2>

            {shopifyConfig?.configured && (
              <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 flex items-center gap-3">
                <CheckCircle size={24} />
                <div>
                  <p className="font-medium">Shopify configuré</p>
                  <p className="text-sm">Domaine : {shopifyConfig.shopDomain}.myshopify.com</p>
                </div>
              </div>
            )}

            {message && (
              <div
                className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {message.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <Input
                id="shopDomain"
                label="Domaine Shopify"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="ma-boutique"
              />
              <p className="text-sm text-gray-500 -mt-2">
                Entrez uniquement le nom de votre boutique (sans .myshopify.com)
              </p>

              <div className="relative">
                <Input
                  id="accessToken"
                  type={showToken ? 'text' : 'password'}
                  label="Access Token Shopify"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="shpat_xxxxx..."
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-8 text-gray-500"
                >
                  {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-sm text-gray-500 -mt-2">
                Créez un token dans Shopify Admin &gt; Apps &gt; Develop apps
              </p>

              {validationResult && (
                <div
                  className={`p-4 rounded-lg ${
                    validationResult.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {validationResult.valid ? (
                    <>
                      <p className="font-medium">✅ Connexion réussie</p>
                      <p className="text-sm">Boutique : {validationResult.shopName}</p>
                    </>
                  ) : (
                    <p>❌ {validationResult.error}</p>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button variant="secondary" onClick={handleValidate} isLoading={validating}>
                  Tester la connexion
                </Button>
                <Button onClick={handleSave} isLoading={saving}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
