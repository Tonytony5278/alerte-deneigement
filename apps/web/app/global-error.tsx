'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr-CA">
      <body className="bg-white text-gray-900 antialiased">
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-6xl mb-6">&#x26A0;&#xFE0F;</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            Une erreur est survenue
          </h1>
          <p className="text-gray-500 mb-8">
            Quelque chose ne fonctionne pas correctement.
          </p>
          <button
            onClick={reset}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            R&eacute;essayer
          </button>
        </main>
      </body>
    </html>
  );
}
