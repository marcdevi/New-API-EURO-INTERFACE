'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { CheckCircle, XCircle, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react';

interface PendingProfile {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  siret: string | null;
  vatNumber: string | null;
  companyPhone: string | null;
  shopDomain: string | null;
  createdAt: string;
}

interface User {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  confirmed: boolean;
  rejected: boolean;
  isAdmin: boolean;
  priceCategory: string;
  createdAt: string;
}

export default function AdminUserPage() {
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, usersRes] = await Promise.all([
        fetch('/api/admin/pending-profiles'),
        fetch('/api/admin/users'),
      ]);

      const pendingData = await pendingRes.json();
      const usersData = await usersRes.json();

      if (pendingData.success) {
        setPendingProfiles(pendingData.data.profiles);
      }
      if (usersData.success) {
        setUsers(usersData.data.users);
      }
    } catch {
      console.error('Échec du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirm = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch('/api/admin/confirm-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch {
      console.error('Échec de la confirmation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch('/api/admin/reject-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch {
      console.error('Échec du rejet');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    setActionLoading(userId);
    try {
      const response = await fetch('/api/admin/set-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isAdmin }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch {
      console.error('Échec de la mise à jour du statut administrateur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAccount = async (userId: string, enable: boolean) => {
    setActionLoading(userId);
    try {
      const response = await fetch('/api/admin/toggle-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, enable }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch {
      console.error('Échec de l\'activation/désactivation du compte');
    } finally {
      setActionLoading(null);
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
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Administration des utilisateurs</h1>

          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">
                Comptes en attente ({pendingProfiles.length})
              </h2>
            </div>

            {pendingProfiles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Aucun compte en attente de validation
              </div>
            ) : (
              <div className="divide-y">
                {pendingProfiles.map((profile) => (
                  <div key={profile.userId} className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">
                          {profile.firstName} {profile.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{profile.email}</p>
                        <p className="text-sm text-gray-500">{profile.companyName}</p>
                        <p className="text-sm text-gray-400">
                          SIRET: {profile.siret} | TVA: {profile.vatNumber || '-'}
                        </p>
                        {profile.shopDomain && (
                          <p className="text-sm text-primary-500">
                            Shopify: {profile.shopDomain}.myshopify.com
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Inscrit le {new Date(profile.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(profile.userId)}
                          isLoading={actionLoading === profile.userId}
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Accepter
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleReject(profile.userId)}
                          isLoading={actionLoading === profile.userId}
                        >
                          <XCircle size={16} className="mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Utilisateurs ({users.length})</h2>
            </div>

            {users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Aucun utilisateur</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Utilisateur
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Entreprise
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.userId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {user.companyName || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {user.confirmed && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                Actif
                              </span>
                            )}
                            {user.rejected && (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                Rejeté
                              </span>
                            )}
                            {user.isAdmin && (
                              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleAdmin(user.userId, !user.isAdmin)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.isAdmin
                                  ? 'text-purple-500 hover:bg-purple-50'
                                  : 'text-gray-400 hover:bg-gray-100'
                              }`}
                              title={user.isAdmin ? 'Retirer admin' : 'Rendre admin'}
                              disabled={actionLoading === user.userId}
                            >
                              {user.isAdmin ? <ShieldOff size={20} /> : <Shield size={20} />}
                            </button>
                            <button
                              onClick={() => handleToggleAccount(user.userId, !user.confirmed)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.confirmed
                                  ? 'text-red-500 hover:bg-red-50'
                                  : 'text-green-500 hover:bg-green-50'
                              }`}
                              title={user.confirmed ? 'Désactiver' : 'Activer'}
                              disabled={actionLoading === user.userId}
                            >
                              {user.confirmed ? <UserX size={20} /> : <UserCheck size={20} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
