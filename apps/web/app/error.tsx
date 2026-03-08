'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-6xl mb-6">&#x26A0;&#xFE0F;</p>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
        Une erreur est survenue
      </h1>
      <p className="text-gray-500 mb-8">
        {error.message || 'Quelque chose ne fonctionne pas correctement.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="bg-brand-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          R&eacute;essayer
        </button>
        <a
          href="/"
          className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Retour &agrave; l&apos;accueil
        </a>
      </div>
    </main>
  );
}
