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

export class MontrealAdapter implements CityAdapter {
  cityId = 'montreal';

  async fetch(): Promise<NormalizedSegment[]> {
    const res = await fetch(config.planifNeigeJsonUrl, {
      headers: { 'User-Agent': 'AlerteDeneigement/1.0 (contact@alertedeneigement.ca)' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`Montreal Planif-Neige API responded ${res.status}`);

    const raw = (await res.json()) as
      | PlanifNeigeRecord[]
      | { data?: PlanifNeigeRecord[]; records?: PlanifNeigeRecord[] };

    let records: PlanifNeigeRecord[];
    if (Array.isArray(raw)) {
      records = raw;
    } else if (raw.data) {
      records = raw.data;
    } else if ((raw as { planifications?: PlanifNeigeRecord[] }).planifications) {
      records = (raw as { planifications: PlanifNeigeRecord[] }).planifications;
    } else if (raw.records) {
      records = raw.records;
    } else {
      throw new Error('Unexpected Planif-Neige response shape');
    }

    return records.map((r) => ({
      externalId: String(r.cote_rue_id),
      cityId: 'montreal',
      nomVoie: String(r.cote_rue_id), // geobase enrichment updates this
      lat: null,
      lng: null,
      status: ETAT_TO_UNIFIED[r.etat_deneig] ?? UnifiedStatus.UNKNOWN,
      planifStart: r.date_deb_planif ?? null,
      planifEnd: r.date_fin_planif ?? null,
    }));
  }
}
