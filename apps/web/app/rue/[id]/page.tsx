import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getStreet, STATUS_META } from '@/lib/api';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const street = await getStreet(id);
  if (!street) return { title: 'Rue introuvable — Alerte Neige' };
  return {
    title: `${street.nom_voie} — Alerte Neige`,
    description: `Statut de déneigement pour ${street.nom_voie} : ${street.etat_label}`,
  };
}

export default async function StreetDetailPage({ params }: Props) {
  const { id } = await params;
  const street = await getStreet(id);
  if (!street) return notFound();

  const meta = STATUS_META[street.etat ?? 0] ?? STATUS_META[0];

  const dataAgeMinutes = street.updated_at
    ? (Date.now() - new Date(street.updated_at).getTime()) / 60_000
    : null;
  const isStale = dataAgeMinutes !== null && dataAgeMinutes > 30;

  function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-CA', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Back */}
      <Link
        href="/#chercher"
        className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline mb-6"
      >
        ← Retour
      </Link>

      {/* Header */}
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{street.nom_voie}</h1>
      {street.arrondissement && (
        <p className="text-gray-500 text-sm mb-4">{street.arrondissement}</p>
      )}

      {/* Status badge */}
      <span
        className="inline-block text-base font-bold px-4 py-2 rounded-xl mb-6"
        style={{ color: meta.color, backgroundColor: meta.bg }}
      >
        {meta.label}
      </span>

      {/* Stale warning */}
      {isStale && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-6">
          ⚠️ Ces données datent de {Math.round(dataAgeMinutes!)} min. Rafraîchis la page pour voir le statut le plus récent.
        </div>
      )}

      {/* Details card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100 mb-8">
        <Row label="Statut" value={street.etat_label} />
        <Row label="Début planifié" value={formatDate(street.date_deb_planif)} />
        <Row label="Fin planifiée" value={formatDate(street.date_fin_planif)} />
        {street.cote && <Row label="Côté" value={street.cote} />}
        {(street.debut_adresse || street.fin_adresse) && (
          <Row
            label="Adresses"
            value={`${street.debut_adresse ?? '?'} – ${street.fin_adresse ?? '?'}`}
          />
        )}
        <Row
          label="Mis à jour"
          value={street.updated_at ? formatDate(street.updated_at) : '—'}
        />
      </div>

      {/* Download CTA */}
      <div className="bg-brand-primary text-white rounded-2xl p-6 text-center">
        <p className="font-bold text-lg mb-1">Reçois l'alerte avant le déneigement</p>
        <p className="text-blue-100 text-sm mb-4">Télécharge l'app gratuite et configure une alerte en 2 minutes.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-brand-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
          >
            App Store
          </a>
          <a
            href="https://play.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-brand-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
          >
            Google Play
          </a>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
