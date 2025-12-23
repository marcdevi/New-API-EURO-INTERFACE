'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { ShoppingCart, User, Settings, LogOut, Menu, X } from 'lucide-react';

interface Profile {
  firstName: string | null;
  lastName: string | null;
  email: string;
  isAdmin: boolean;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseClient();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user ?? null);

      if (user) {
        const { data } = await (supabase as any)
          .from('profiles')
          .select('first_name, last_name, email, is_admin')
          .eq('user_id', user.id)
          .single();

        if (data) {
          const d = data as any;
          setProfile({
            firstName: d.first_name,
            lastName: d.last_name,
            email: d.email,
            isAdmin: d.is_admin,
          });
        }
      }
    };

    fetchProfile();
  }, [supabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const displayName = profile
    ? profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.email
    : 'Compte';

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/images/logo/LOGO_EURODESIGN_2.png"
                alt="Eurodesign Pro"
                width={120}
                height={30}
                className="h-8 w-auto"
              />
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className={`hover:text-primary-300 transition-colors ${pathname === '/' ? 'text-primary-300' : ''}`}
              >
                Accueil
              </Link>
              <Link
                href="/products"
                className={`hover:text-primary-300 transition-colors ${pathname?.startsWith('/products') && !pathname?.includes('listed') ? 'text-primary-300' : ''}`}
              >
                Catalogue
              </Link>
              <Link
                href="/products/listed-product"
                className={`hover:text-primary-300 transition-colors ${pathname?.includes('listed-product') ? 'text-primary-300' : ''}`}
              >
                Mes produits
              </Link>
              {profile?.isAdmin && (
                <Link
                  href="/admin/user"
                  className={`hover:text-primary-300 transition-colors ${pathname?.startsWith('/admin') ? 'text-primary-300' : ''}`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/shopping-cart" className="flex items-center gap-2 hover:text-primary-300 transition-colors">
              <ShoppingCart size={20} />
              <span>Panier</span>
            </Link>

            {user ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 hover:text-primary-300 transition-colors"
                >
                  <User size={20} />
                  <span className="max-w-32 truncate">{displayName}</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b text-gray-700 text-sm truncate">
                      Bonjour {displayName} !
                    </div>
                    <Link
                      href="/user/profile"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <User size={16} />
                      Profil
                    </Link>
                    <Link
                      href="/user/settings"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Settings size={16} />
                      Paramètres
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 w-full"
                    >
                      <LogOut size={16} />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/user/sign-in" className="flex items-center gap-2 hover:text-primary-300 transition-colors">
                <LogOut size={20} />
                <span>Connexion</span>
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-700">
            <div className="flex flex-col gap-4">
              <Link href="/" className="hover:text-primary-300" onClick={() => setIsMenuOpen(false)}>
                Accueil
              </Link>
              <Link href="/products" className="hover:text-primary-300" onClick={() => setIsMenuOpen(false)}>
                Catalogue
              </Link>
              <Link href="/products/listed-product" className="hover:text-primary-300" onClick={() => setIsMenuOpen(false)}>
                Mes produits
              </Link>
              <Link href="/shopping-cart" className="hover:text-primary-300" onClick={() => setIsMenuOpen(false)}>
                Panier
              </Link>
              {profile?.isAdmin && (
                <Link href="/admin/user" className="hover:text-primary-300" onClick={() => setIsMenuOpen(false)}>
                  Admin
                </Link>
              )}
              {user ? (
                <>
                  <Link href="/user/profile" className="hover:text-primary-300" onClick={() => setIsMenuOpen(false)}>
                    Profil
                  </Link>
                  <Link href="/user/settings" className="hover:text-primary-300" onClick={() => setIsMenuOpen(false)}>
                    Paramètres
                  </Link>
                  <button onClick={handleLogout} className="text-left hover:text-primary-300">
                    Déconnexion
                  </button>
                </>
              ) : (
                <Link href="/user/sign-in" className="hover:text-primary-300" onClick={() => setIsMenuOpen(false)}>
                  Connexion
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
