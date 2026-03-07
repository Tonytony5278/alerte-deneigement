import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getStreet, getStreetByName, STATUS_META } from '@/lib/api';
import dynamic from 'next/dynamic';

const StreetMap = dynamic(() => import('@/app/components/StreetMap'), { ssr: false });
const ShareButton = dynamic(() => import('@/app/components/ShareButton'), { ssr: false });

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ city?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { city } = await searchParams;

  if (city) {
    const street = await getStreetByName(decodeURIComponent(id), city);
    if (!street) return { title: 'Rue introuvable' };
    return {
      title: `${street.type_voie ? street.type_voie + ' ' : ''}${street.nom_voie} - Alerte Neige`,
      description: `Statut de d\u00e9neigement pour ${street.nom_voie} \u00e0 ${street.city_name}`,
    };
  }

  const street = await getStreet(id);
  if (!street) return { title: 'Rue introuvable' };
  return {
    title: `${street.nom_voie} - Alerte Neige`,
    description: `Statut de d\u00e9neigement pour ${street.nom_voie} : ${street.etat_label}`,
  };
}

export default async function StreetDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { city } = await searchParams;

  // Street name mode (from grouped search)
  if (city) {
    const street = await getStreetByName(decodeURIComponent(id), city);
    if (!street) return notFound();
    return <StreetOverview street={street} />;
  }

  // Legacy segment ID mode
  const segment = await getStreet(id);
  if (!segment) return notFound();
  return <SegmentDetail segment={segment} />;
}

/* ─── Street overview (grouped, with map) ─────────────────────────── */

function StreetOverview({ street }: { street: Awaited<ReturnType<typeof getStreetByName>> & {} }) {
  const meta = STATUS_META[street.worst_etat ?? 0] ?? STATUS_META[0];

  const statusCounts: Record<number, number> = {};
  let latestUpdate: string | null = null;
  for (const seg of street.segments) {
    const etat = seg.etat ?? 0;
    statusCounts[etat] = (statusCounts[etat] || 0) + 1;
    if (seg.updated_at && (!latestUpdate || seg.updated_at > latestUpdate)) {
      latestUpdate = seg.updated_at;
    }
  }

  const updatedLabel = latestUpdate
    ? new Date(latestUpdate).toLocaleString('fr-CA', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null;

  const dataAgeMinutes = latestUpdate
    ? (Date.now() - new Date(latestUpdate).getTime()) / 60_000
    : null;
  const isStale = dataAgeMinutes !== null && dataAgeMinutes > 30;

  // Find earliest planned start and latest planned end across all segments
  let earliestPlanif: string | null = null;
  let latestPlanifEnd: string | null = null;
  for (const seg of street.segments) {
    if (seg.date_deb_planif && (!earliestPlanif || seg.date_deb_planif < earliestPlanif)) {
      earliestPlanif = seg.date_deb_planif;
    }
    if (seg.date_fin_planif && (!latestPlanifEnd || seg.date_fin_planif > latestPlanifEnd)) {
      latestPlanifEnd = seg.date_fin_planif;
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '\u2014';
    return new Date(iso).toLocaleString('fr-CA', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/#chercher"
        className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline mb-6"
      >
        &larr; Retour
      </Link>

      {isStale && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-4">
          Ces donn&eacute;es datent de {Math.round(dataAgeMinutes!)} min. Rafra&icirc;chis la page pour voir le statut le plus r&eacute;cent.
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {street.type_voie ? `${street.type_voie} ` : ''}{street.nom_voie}
          </h1>
          <p className="text-gray-500 text-sm">
            {street.city_name} &middot; {street.segment_count} segments
            {updatedLabel && <> &middot; mis &agrave; jour {updatedLabel}</>}
          </p>
        </div>
        <span
          className="text-sm font-bold px-4 py-2 rounded-xl flex-shrink-0"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          {meta.label}
        </span>
      </div>

      {/* Map */}
      <div className="mb-6">
        <StreetMap
          segments={street.segments}
          center={[street.center.lat, street.center.lng]}
          zoom={14}
          height="450px"
        />
      </div>

      {/* Planned dates */}
      {(earliestPlanif || latestPlanifEnd) && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100 mb-6">
          {earliestPlanif && <Row label="D&eacute;but planifi&eacute;" value={formatDate(earliestPlanif)} />}
          {latestPlanifEnd && <Row label="Fin planifi&eacute;e" value={formatDate(latestPlanifEnd)} />}
        </div>
      )}

      {/* Status breakdown */}
      {Object.keys(statusCounts).length <= 1 ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 mb-8">
          <p className="text-sm text-gray-600">
            {street.segment_count} segments &mdash; tous <strong style={{ color: meta.color }}>{meta.label.toLowerCase()}</strong>
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries(statusCounts)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([etat, count]) => {
                const m = STATUS_META[Number(etat)] ?? STATUS_META[0];
                return (
                  <div key={etat} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: m.bg, border: `2px solid ${m.color}` }}
                    />
                    <span className="text-gray-600">{m.label} ({count})</span>
                  </div>
                );
              })}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">D&eacute;tails par segment</h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {street.segments.map((seg) => {
                const segMeta = STATUS_META[seg.etat ?? 0] ?? STATUS_META[0];
                return (
                  <div key={seg.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <span className="text-gray-700">
                        {seg.debut_adresse ? `${seg.debut_adresse}\u2013${seg.fin_adresse}` : seg.cote ?? '\u2014'}
                      </span>
                      {seg.debut_adresse && seg.cote && <span className="text-gray-400 ml-2">({seg.cote})</span>}
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: segMeta.color, backgroundColor: segMeta.bg }}
                    >
                      {segMeta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-6 mb-8">
        <Link
          href={`/carte?street=${encodeURIComponent(street.nom_voie)}&city=${street.city_id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:underline"
        >
          Voir sur la carte interactive &rarr;
        </Link>
        <ShareButton
          title={`${street.type_voie ? street.type_voie + ' ' : ''}${street.nom_voie} - Alerte Neige`}
          text={`Statut de déneigement pour ${street.nom_voie} à ${street.city_name}`}
          url={`https://alerteneige.app/rue/${encodeURIComponent(street.nom_voie)}?city=${street.city_id}`}
        />
      </div>

      <DownloadCTA />
    </main>
  );
}

/* ─── Single segment detail (legacy URLs) ────────────────────────── */

function SegmentDetail({ segment }: { segment: Awaited<ReturnType<typeof getStreet>> & {} }) {
  const meta = STATUS_META[segment.etat ?? 0] ?? STATUS_META[0];
  const dataAgeMinutes = segment.updated_at
    ? (Date.now() - new Date(segment.updated_at).getTime()) / 60_000
    : null;
  const isStale = dataAgeMinutes !== null && dataAgeMinutes > 30;

  function formatDate(iso: string | null): string {
    if (!iso) return '\u2014';
    return new Date(iso).toLocaleString('fr-CA', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const hasGeo = segment.geometry && Array.isArray(segment.geometry) && segment.geometry.length >= 2;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/#chercher" className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline mb-6">
        &larr; Retour
      </Link>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{segment.nom_voie}</h1>
      {segment.arrondissement && <p className="text-gray-500 text-sm mb-4">{segment.arrondissement}</p>}

      <span
        className="inline-block text-base font-bold px-4 py-2 rounded-xl mb-6"
        style={{ color: meta.color, backgroundColor: meta.bg }}
      >
        {meta.label}
      </span>

      {hasGeo && segment.lat && (
        <div className="mb-6">
          <StreetMap
            segments={[{ id: segment.id, nom_voie: segment.nom_voie, etat: segment.etat ?? 0, etat_label: segment.etat_label, geometry: segment.geometry!, cote: segment.cote, debut_adresse: segment.debut_adresse, fin_adresse: segment.fin_adresse }]}
            center={[segment.lat, segment.lng!]}
            zoom={16}
            height="300px"
          />
        </div>
      )}

      {isStale && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-6">
          Ces donn&eacute;es datent de {Math.round(dataAgeMinutes!)} min. Rafra&icirc;chis la page pour voir le statut le plus r&eacute;cent.
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100 mb-8">
        <Row label="Statut" value={segment.etat_label} />
        <Row label="D\u00e9but planifi\u00e9" value={formatDate(segment.date_deb_planif)} />
        <Row label="Fin planifi\u00e9e" value={formatDate(segment.date_fin_planif)} />
        {segment.cote && <Row label="C\u00f4t\u00e9" value={segment.cote} />}
        {(segment.debut_adresse || segment.fin_adresse) && (
          <Row label="Adresses" value={`${segment.debut_adresse ?? '?'} \u2013 ${segment.fin_adresse ?? '?'}`} />
        )}
        <Row label="Mis \u00e0 jour" value={segment.updated_at ? formatDate(segment.updated_at) : '\u2014'} />
      </div>

      <DownloadCTA />
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

function DownloadCTA() {
  return (
    <div className="bg-brand-primary text-white rounded-2xl p-6 text-center">
      <p className="font-bold text-lg mb-1">Re&ccedil;ois l&rsquo;alerte avant le d&eacute;neigement</p>
      <p className="text-blue-100 text-sm mb-4">T&eacute;l&eacute;charge l&rsquo;app gratuite et configure une alerte en 2 minutes.</p>
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
  );
}
