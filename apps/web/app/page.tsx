import Link from 'next/link';
import Image from 'next/image';
import { getCities, type CityConfig } from '@/lib/api';
import { SearchSection } from './SearchSection';

const FEATURES = [
  { icon: '🔔', title: 'Alertes 60 min avant', desc: "Reçois une notification push bien avant l'arrivée des camions." },
  { icon: '🚗', title: 'Je suis stationné ici', desc: "Détecte automatiquement ta rue et configure une alerte en un tap." },
  { icon: '🆓', title: '100 % gratuit', desc: "Aucun abonnement, aucune pub. Alternatives à INFO-Neige depuis 2024." },
  { icon: '🌎', title: '5 villes couvertes', desc: "Montréal, Longueuil, Laval, Québec et Gatineau. Sherbrooke bientôt." },
];

const FALLBACK_CITIES: CityConfig[] = [
  { id: 'montreal', name: 'Montréal', nameShort: 'MTL', available: true },
  { id: 'longueuil', name: 'Longueuil / Brossard', nameShort: 'LGL', available: true },
  { id: 'laval', name: 'Laval', nameShort: 'LAV', available: true },
  { id: 'quebec', name: 'Québec', nameShort: 'QC', available: true },
  { id: 'gatineau', name: 'Gatineau', nameShort: 'GAT', available: true },
  { id: 'sherbrooke', name: 'Sherbrooke', nameShort: 'SHE', available: false },
];

export default async function HomePage() {
  const fetched = await getCities().catch(() => []);
  const cities = fetched.length > 0 ? fetched : FALLBACK_CITIES;

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-16 pb-12 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <Image src="/logo.png" alt="Alerte Neige" width={96} height={96} className="mx-auto mb-6 rounded-2xl" priority />
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Fini les contraventions<br className="hidden sm:block" /> de déneigement
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Reçois une alerte push <strong>60 minutes avant</strong> le déneigement de ta rue.
            Gratuit. Pour Montréal, Longueuil, Laval, Québec et Gatineau.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              App Store
            </a>
            <a
              href="https://play.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76c.33.18.72.19 1.06.04l12.08-6.97-2.54-2.54L3.18 23.76zM20.7 10.42l-2.67-1.54-2.84 2.84 2.84 2.84 2.67-1.54c.76-.44.76-1.61 0-2.6zM4.24.2C3.9.05 3.51.06 3.18.24L13.78 10.84l2.54-2.54L4.24.2zM3.18.24v23.52l10.6-10.6L3.18.24z"/>
              </svg>
              Google Play
            </a>
          </div>
        </div>
      </section>

      {/* Street search */}
      <section id="chercher" className="max-w-2xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-2">Vérifier le statut d'une rue</h2>
        <p className="text-gray-500 text-center text-sm mb-8">Cherche une adresse pour voir si le déneigement est planifié.</p>
        <SearchSection />
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Pourquoi Alerte Neige ?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-base mb-1">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities */}
      {cities.length > 0 && (
        <section id="villes" className="max-w-2xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-8">Villes couvertes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cities.map((city) =>
              city.available ? (
                <Link
                  key={city.id}
                  href={`/carte?city=${city.id}`}
                  className="rounded-xl px-4 py-3 border text-sm font-semibold text-center bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                >
                  {city.name}
                </Link>
              ) : (
                <div
                  key={city.id}
                  className="rounded-xl px-4 py-3 border text-sm font-semibold text-center bg-gray-50 border-gray-200 text-gray-400"
                >
                  {city.name}
                  <span className="block text-xs font-normal mt-0.5">Bient&ocirc;t</span>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* CTA bottom */}
      <section className="bg-brand-primary text-white py-12 px-4 text-center">
        <h2 className="text-2xl font-bold mb-3">Protège ton auto ce soir</h2>
        <p className="text-blue-100 mb-6 text-sm">Télécharge l&apos;app et configure ta première alerte en 2 minutes.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-brand-primary px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors"
          >
            App Store
          </a>
          <a
            href="https://play.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-brand-primary px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors"
          >
            Google Play
          </a>
        </div>
      </section>
    </>
  );
}
