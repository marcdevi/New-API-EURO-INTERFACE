'use client';

import { useEffect, useMemo, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { ProfileDTO } from '@/types/api';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const supabase = createSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    siret: '',
    vatNumber: '',
    phone: '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordErrors = useMemo(() => {
    const errors: string[] = [];
    if (newPassword.length > 0 && newPassword.length < 8) errors.push('Au moins 8 caractères.');
    if (newPassword.length > 0 && !/[A-Z]/.test(newPassword)) errors.push('Au moins une majuscule.');
    if (newPassword.length > 0 && !/[a-z]/.test(newPassword)) errors.push('Au moins une minuscule.');
    if (newPassword.length > 0 && !/[0-9]/.test(newPassword)) errors.push('Au moins un chiffre.');
    return errors;
  }, [newPassword]);

  const canUpdatePassword =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    passwordErrors.length === 0 &&
    newPassword === confirmPassword;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const res = await fetch('/api/profile/me');
        const data = await res.json();

        if (!data.success) {
          setMessage({ type: 'error', text: data.error?.message || 'Erreur lors du chargement du profil' });
          return;
        }

        const p: ProfileDTO = data.data;
        setProfile(p);
        setForm({
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          companyName: p.companyName || '',
          siret: p.siret || '',
          vatNumber: p.vatNumber || '',
          phone: p.companyPhone || '',
        });
      } catch {
        setMessage({ type: 'error', text: 'Erreur de connexion' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          companyName: form.companyName,
          siret: form.siret,
          vatNumber: form.vatNumber || undefined,
          phone: form.phone || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setMessage({ type: 'error', text: data.error?.message || 'Erreur lors de la mise à jour' });
        return;
      }

      setMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  };

  const translateAuthError = (msg: string) => {
    if (msg.includes('Invalid login credentials')) return 'Le mot de passe actuel est incorrect.';
    if (msg.includes('Password should be at least')) return 'Le mot de passe est trop court.';
    return msg;
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (!canUpdatePassword) {
      setPwMessage({ type: 'error', text: 'Veuillez corriger les erreurs avant de continuer.' });
      return;
    }

    setPwLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        setPwMessage({ type: 'error', text: 'Utilisateur non authentifié.' });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setPwMessage({ type: 'error', text: translateAuthError(signInError.message) });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setPwMessage({ type: 'error', text: translateAuthError(updateError.message) });
        return;
      }

      setPwMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setPwLoading(false);
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
          <h1 className="text-3xl font-bold mb-8">Mon profil</h1>

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

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6">Informations</h2>

            <div className="space-y-4">
              <Input
                id="firstName"
                label="Prénom"
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              />
              <Input
                id="lastName"
                label="Nom"
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              />
              <Input
                id="companyName"
                label="Nom de l'entreprise"
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              />
              <Input
                id="siret"
                label="SIRET"
                value={form.siret}
                onChange={(e) => setForm((p) => ({ ...p, siret: e.target.value }))}
              />
              <Input
                id="vatNumber"
                label="TVA intracom."
                value={form.vatNumber}
                onChange={(e) => setForm((p) => ({ ...p, vatNumber: e.target.value }))}
              />
              <Input
                id="phone"
                label="Téléphone professionnel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />

              <Input id="email" label="Email" value={profile?.email || ''} disabled />

              <div className="pt-2">
                <Button onClick={handleSave} isLoading={saving} className="w-full">
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Changer mon mot de passe</h2>

            {pwMessage && (
              <div
                className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
                  pwMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {pwMessage.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                {pwMessage.text}
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  label="Mot de passe actuel"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-3 top-8 text-gray-500"
                >
                  {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  label="Nouveau mot de passe"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-8 text-gray-500"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {newPassword && passwordErrors.length > 0 && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg">
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {passwordErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-8 text-gray-500"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <Button type="submit" isLoading={pwLoading} disabled={!canUpdatePassword} className="w-full">
                Mettre à jour le mot de passe
              </Button>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
