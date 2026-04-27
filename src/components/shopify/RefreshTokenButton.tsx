'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function RefreshTokenButton() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setStatus('loading');
    setMessage(null);

    try {
      const res = await fetch('/api/shopify/refresh-token', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus('error');
        setMessage(data.error?.message || 'Erreur lors du renouvellement du token');
        return;
      }

      setStatus('success');
      setMessage('Token Shopify renouvelé avec succès');
    } catch {
      setStatus('error');
      setMessage('Impossible de contacter le serveur');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Token d&apos;accès Shopify</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Regénère le token en utilisant les credentials OAuth enregistrés
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={status === 'loading'}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
          {status === 'loading' ? 'Renouvellement...' : 'Rafraîchir le token'}
        </button>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
            status === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {status === 'success' ? (
            <CheckCircle size={16} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={16} className="flex-shrink-0" />
          )}
          {message}
        </div>
      )}
    </div>
  );
}
