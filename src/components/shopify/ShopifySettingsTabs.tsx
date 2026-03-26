'use client';

import { useState } from 'react';
import { OAuthCredentialsForm } from './OAuthCredentialsForm';
import { ManualTokenForm } from './ManualTokenForm';
import { ShopifyConfig } from '@/types/shopify';

interface Props {
  existingConfig: ShopifyConfig | null;
}

type TabMode = 'oauth' | 'manual';

export function ShopifySettingsTabs({ existingConfig }: Props) {
  const [activeTab, setActiveTab] = useState<TabMode>('oauth');

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${
                activeTab === 'oauth'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
            `}
          >
            OAuth 2026 (Recommandé)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${
                activeTab === 'manual'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
            `}
          >
            Mode manuel
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="pt-4">
        {activeTab === 'oauth' && (
          <div>
            {!existingConfig && (
              <p className="mb-4 text-sm text-gray-500">
                Aucune configuration trouvée.
                Saisissez votre domaine et vos credentials pour activer OAuth.
              </p>
            )}

            {existingConfig && (
              <p className="mb-4 text-sm text-gray-500">
                Mettez à jour vos credentials OAuth ci-dessous.
              </p>
            )}

            <OAuthCredentialsForm existingConfig={existingConfig} />
          </div>
        )}

        {activeTab === 'manual' && (
          <div>
            <ManualTokenForm 
              existingToken={null} 
              existingDomain={existingConfig?.shop_domain ?? null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
