import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-6xl mb-6">🌨️</p>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Page introuvable</h1>
      <p className="text-gray-500 mb-8">Cette rue ou cette page n&apos;existe pas dans notre syst&egrave;me.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/#chercher"
          className="bg-brand-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          Chercher une rue
        </Link>
        <Link
          href="/carte"
          className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Voir la carte
        </Link>
      </div>
    </main>
  );
}
