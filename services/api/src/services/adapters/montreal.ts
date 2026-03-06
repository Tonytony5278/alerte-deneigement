import { fetch } from 'undici';
import { config } from '../../config';
import { UnifiedStatus, EtatDeneig, type NormalizedSegment, type PlanifNeigeRecord } from '../../types';
import type { CityAdapter } from './base';

const ETAT_TO_UNIFIED: Record<number, UnifiedStatus> = {
  [EtatDeneig.ENNEIGE]:                 UnifiedStatus.NORMAL,
  [EtatDeneig.DENEIGE]:                 UnifiedStatus.COMPLETED,
  [EtatDeneig.PLANIFIE]:                UnifiedStatus.SCHEDULED,
  [EtatDeneig.REPLANIFIE]:              UnifiedStatus.SCHEDULED,
  [EtatDeneig.ATTENTE_REPLANIFICATION]: UnifiedStatus.SCHEDULED,
  [EtatDeneig.EN_COURS]:                UnifiedStatus.IN_PROGRESS,
  [EtatDeneig.ENTRE_OPERATIONS]:        UnifiedStatus.NORMAL,
};

// Montreal Open Data CSV endpoint — official, stable, updated every 2 min during operations
const MTL_OPENDATA_URL =
  'https://donnees.montreal.ca/api/3/action/datastore_search?resource_id=a5c1e327-3976-4824-b35f-eb5a55ba9137&limit=50000';

interface OpenDataResult {
  result: {
    records: Array<{
      COTE_RUE_ID: number;
      ETAT_DENEIG: number;
      DATE_DEB_PLANIF: string | null;
      DATE_FIN_PLANIF: string | null;
      DATE_MAJ: string;
    }>;
    total: number;
  };
}

export class MontrealAdapter implements CityAdapter {
  cityId = 'montreal';

  async fetch(): Promise<NormalizedSegment[]> {
    // Try sources in order: Open Data API → GitHub mirror
    const sources: Array<{ name: string; fn: () => Promise<NormalizedSegment[]> }> = [
      { name: 'Montreal Open Data', fn: () => this.fetchOpenData() },
      { name: 'GitHub mirror', fn: () => this.fetchGitHubMirror() },
    ];

    let lastError: Error | null = null;
    for (const source of sources) {
      try {
        const segments = await source.fn();
        if (segments.length > 0) {
          console.log(`[Montreal] Fetched ${segments.length} segments from ${source.name}`);
          return segments;
        }
        console.warn(`[Montreal] ${source.name} returned 0 segments, trying next source`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[Montreal] ${source.name} failed: ${lastError.message}, trying next source`);
      }
    }

    throw lastError ?? new Error('All Montreal data sources failed');
  }

  private async fetchOpenData(): Promise<NormalizedSegment[]> {
    const res = await fetch(MTL_OPENDATA_URL, {
      headers: { 'User-Agent': 'AlerteDeneigement/1.0 (contact@alerteneige.app)' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) throw new Error(`Montreal Open Data API responded ${res.status}`);

    const data = (await res.json()) as OpenDataResult;
    const records = data.result.records;

    return records.map((r) => ({
      externalId: String(r.COTE_RUE_ID),
      cityId: 'montreal',
      nomVoie: String(r.COTE_RUE_ID),
      lat: null,
      lng: null,
      status: ETAT_TO_UNIFIED[r.ETAT_DENEIG] ?? UnifiedStatus.UNKNOWN,
      planifStart: r.DATE_DEB_PLANIF ?? null,
      planifEnd: r.DATE_FIN_PLANIF ?? null,
    }));
  }

  private async fetchGitHubMirror(): Promise<NormalizedSegment[]> {
    const res = await fetch(config.planifNeigeJsonUrl, {
      headers: { 'User-Agent': 'AlerteDeneigement/1.0 (contact@alerteneige.app)' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`GitHub mirror responded ${res.status}`);

    const raw = (await res.json()) as
      | PlanifNeigeRecord[]
      | { data?: PlanifNeigeRecord[]; records?: PlanifNeigeRecord[]; planifications?: PlanifNeigeRecord[] };

    let records: PlanifNeigeRecord[];
    if (Array.isArray(raw)) {
      records = raw;
    } else if (raw.data) {
      records = raw.data;
    } else if ('planifications' in raw && raw.planifications) {
      records = raw.planifications;
    } else if (raw.records) {
      records = raw.records;
    } else {
      throw new Error('Unexpected Planif-Neige response shape');
    }

    return records.map((r) => ({
      externalId: String(r.cote_rue_id),
      cityId: 'montreal',
      nomVoie: String(r.cote_rue_id),
      lat: null,
      lng: null,
      status: ETAT_TO_UNIFIED[r.etat_deneig] ?? UnifiedStatus.UNKNOWN,
      planifStart: r.date_deb_planif ?? null,
      planifEnd: r.date_fin_planif ?? null,
    }));
  }
}
