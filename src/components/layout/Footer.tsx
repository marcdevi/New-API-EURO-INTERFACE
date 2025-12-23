import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Eurodesign Pro</h3>
            <p className="text-gray-400 text-sm">
              Plateforme B2B dédiée aux professionnels du mobilier et de l&apos;agencement.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Liens utiles</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  Catalogue
                </Link>
              </li>
              <li>
                <Link href="/shopping-cart" className="hover:text-white transition-colors">
                  Panier
                </Link>
              </li>
              <li>
                <Link href="/user/profile" className="hover:text-white transition-colors">
                  Mon compte
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>contact@eurodesignfrance.fr</li>
              <li>+33 (0)1 23 45 67 89</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Eurodesign Pro. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
