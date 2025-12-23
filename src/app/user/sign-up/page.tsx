'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
    siret: '',
    vatNumber: '',
    phone: '',
    shopifyDomain: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const translateAuthError = (message: string) => {
    const msg = (message || '').toLowerCase();
    if (msg.includes('user already registered') || msg.includes('already registered')) {
      return 'Un compte existe déjà avec cette adresse email.';
    }
    if (msg.includes('password should be at least')) {
      return 'Le mot de passe est trop court.';
    }
    if (msg.includes('invalid email')) {
      return 'Adresse email invalide.';
    }
    if (msg.includes('signup is disabled')) {
      return 'Les inscriptions sont actuellement désactivées.';
    }
    return message;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setError(translateAuthError(authError.message));
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError('Erreur lors de la création du compte.');
      setLoading(false);
      return;
    }

    const response = await fetch('/api/profile/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
        siret: formData.siret.replace(/\s/g, ''),
        vatNumber: formData.vatNumber || undefined,
        phone: formData.phone,
        shopifyDomain: formData.shopifyDomain || undefined,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error?.message || 'Erreur lors de la création du profil.');
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-4">Inscription réussie !</h1>
            <p className="text-gray-600 mb-6">
              Votre compte a été créé avec succès. Un administrateur va valider votre compte.
              Vous recevrez un email une fois votre compte activé.
            </p>
            <Link
              href="/user/sign-in"
              className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Créer un compte</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                id="firstName"
                name="firstName"
                label="Prénom *"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              <Input
                id="lastName"
                name="lastName"
                label="Nom *"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <Input
              id="email"
              name="email"
              type="email"
              label="Email *"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Mot de passe *"
                  value={formData.password}
                  onChange={handleChange}
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
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                label="Confirmer le mot de passe *"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <hr className="my-6" />
            <h2 className="text-xl font-semibold">Informations entreprise</h2>

            <Input
              id="companyName"
              name="companyName"
              label="Nom de l'entreprise *"
              value={formData.companyName}
              onChange={handleChange}
              required
            />

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                id="siret"
                name="siret"
                label="SIRET (14 chiffres) *"
                value={formData.siret}
                onChange={handleChange}
                required
                maxLength={14}
              />
              <Input
                id="vatNumber"
                name="vatNumber"
                label="N° TVA intracommunautaire"
                value={formData.vatNumber}
                onChange={handleChange}
                placeholder="FR12345678901"
              />
            </div>

            <Input
              id="phone"
              name="phone"
              type="tel"
              label="Téléphone professionnel *"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            <hr className="my-6" />
            <h2 className="text-xl font-semibold">Configuration Shopify (optionnel)</h2>

            <Input
              id="shopifyDomain"
              name="shopifyDomain"
              label="Domaine Shopify"
              value={formData.shopifyDomain}
              onChange={handleChange}
              placeholder="ma-boutique"
            />
            <p className="text-sm text-gray-500 -mt-4">
              Exemple : ma-boutique (sans .myshopify.com)
            </p>

            <Button type="submit" isLoading={loading} className="w-full" size="lg">
              Créer mon compte
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Déjà inscrit ?{' '}
            <Link href="/user/sign-in" className="text-primary-500 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
