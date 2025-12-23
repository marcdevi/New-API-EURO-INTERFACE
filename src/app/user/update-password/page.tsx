'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const translateAuthError = (message: string) => {
    const msg = (message || '').toLowerCase();
    if (msg.includes('password should be at least') || msg.includes('password')) {
      return 'Mot de passe invalide. Veuillez choisir un mot de passe plus sécurisé.';
    }
    if (msg.includes('invalid') && msg.includes('token')) {
      return 'Lien de réinitialisation invalide ou expiré. Veuillez recommencer.';
    }
    if (msg.includes('rate limit')) {
      return 'Trop de tentatives. Veuillez réessayer plus tard.';
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(translateAuthError(error.message));
      setLoading(false);
      return;
    }

    router.push('/user/sign-in?confirmed=true');
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-4">Nouveau mot de passe</h1>
          <p className="text-center text-gray-600 mb-8">
            Choisissez un nouveau mot de passe sécurisé.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" isLoading={loading} className="w-full">
              Mettre à jour
            </Button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
