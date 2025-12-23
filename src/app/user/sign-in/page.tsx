'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const confirmedParam = searchParams.get('confirmed');

    if (errorParam === 'pending') {
      setError('Votre compte est en attente de validation par un administrateur.');
    } else if (errorParam === 'rejected') {
      setError('Votre compte a été rejeté.');
    } else if (confirmedParam === 'true') {
      setInfo('✅ Votre compte a été validé, vous pouvez désormais vous connecter.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Identifiants de connexion invalides.');
      setLoading(false);
      return;
    }

    if (!data.user) {
      setInfo('🔗 Un email de connexion vous a été envoyé.');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('confirmed, rejected')
      .eq('user_id', data.user.id)
      .single();

    if (profileError || !profile) {
      setError('Profil non trouvé. Veuillez contacter le support.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if ((profile as any).rejected) {
      setError('Votre compte a été rejeté.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (!(profile as any).confirmed) {
      setError('Votre compte est en attente de validation par un administrateur.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const next = searchParams.get('next') || '/';
    router.push(next);
    router.refresh();
  };

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
      <h1 className="text-3xl font-bold text-center mb-8">Connexion</h1>

      {info && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-center">
          {info}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            label="Mot de passe"
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

        <Button type="submit" isLoading={loading} className="w-full">
          Se connecter
        </Button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <Link href="/user/forgot-password" className="text-primary-500 hover:underline block">
          Mot de passe oublié ?
        </Link>
        <p className="text-gray-600">
          Pas encore inscrit ?{' '}
          <Link href="/user/sign-up" className="text-primary-500 hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Suspense fallback={<div>Chargement...</div>}>
          <SignInForm />
        </Suspense>
      </div>
    </MainLayout>
  );
}
