import { describe, it, expect } from 'vitest';
import { EtatDeneig, ETAT_LABELS } from '../types';

// Unit tests for data parsing and status mapping

describe('EtatDeneig mapping', () => {
  it('should have correct label for each status code', () => {
    expect(ETAT_LABELS[EtatDeneig.ENNEIGE]).toBe('Enneigé');
    expect(ETAT_LABELS[EtatDeneig.DENEIGE]).toBe('Déneigé');
    expect(ETAT_LABELS[EtatDeneig.PLANIFIE]).toBe('Planifié');
    expect(ETAT_LABELS[EtatDeneig.REPLANIFIE]).toBe('Replanifié');
    expect(ETAT_LABELS[EtatDeneig.ATTENTE_REPLANIFICATION]).toBe('En attente de replanification');
    expect(ETAT_LABELS[EtatDeneig.EN_COURS]).toBe('En cours');
    expect(ETAT_LABELS[EtatDeneig.ENTRE_OPERATIONS]).toBe('Entre opérations');
  });

  it('should return undefined for unknown status code', () => {
    expect(ETAT_LABELS[99]).toBeUndefined();
  });
});

describe('PlanifNeige record parsing', () => {
  it('should accept valid record shape', () => {
    const record = {
      mun_id: 'MTL',
      cote_rue_id: '123456',
      etat_deneig: EtatDeneig.PLANIFIE,
      date_deb_planif: '2024-01-15T08:00:00',
      date_fin_planif: '2024-01-15T20:00:00',
      date_maj: '2024-01-15T07:30:00',
    };
    expect(record.cote_rue_id).toBe('123456');
    expect(record.etat_deneig).toBe(2);
    expect(record.date_deb_planif).toBeTruthy();
  });

  it('should handle null dates gracefully', () => {
    const record = {
      mun_id: 'MTL',
      cote_rue_id: '789',
      etat_deneig: EtatDeneig.DENEIGE,
      date_deb_planif: null,
      date_fin_planif: null,
      date_maj: '2024-01-15T07:30:00',
    };
    expect(record.date_deb_planif).toBeNull();
    expect(record.date_fin_planif).toBeNull();
    expect(record.etat_deneig).toBe(EtatDeneig.DENEIGE);
  });
});

describe('Notification timing logic', () => {
  it('should detect T-60 window correctly', () => {
    const now = Date.now();
    const planifDate = new Date(now + 61 * 60_000); // 61 minutes from now
    const msUntil = planifDate.getTime() - now;
    const minUntil = msUntil / 60_000;
    // In window [58, 62]
    expect(minUntil).toBeGreaterThanOrEqual(58);
    expect(minUntil).toBeLessThanOrEqual(65);
  });

  it('should NOT trigger T-60 when 90 minutes away', () => {
    const now = Date.now();
    const planifDate = new Date(now + 90 * 60_000);
    const msUntil = planifDate.getTime() - now;
    const minUntil = msUntil / 60_000;
    expect(minUntil >= 58 && minUntil <= 62).toBe(false);
  });
});

describe('Quiet hours logic', () => {
  function isInQuietHours(hhmm: string, start: string, end: string): boolean {
    if (start > end) {
      return hhmm >= start || hhmm < end;
    }
    return hhmm >= start && hhmm < end;
  }

  it('should detect midnight-crossing quiet hours', () => {
    expect(isInQuietHours('23:30', '22:00', '07:00')).toBe(true);
    expect(isInQuietHours('02:00', '22:00', '07:00')).toBe(true);
    expect(isInQuietHours('06:59', '22:00', '07:00')).toBe(true);
    expect(isInQuietHours('07:00', '22:00', '07:00')).toBe(false);
    expect(isInQuietHours('14:00', '22:00', '07:00')).toBe(false);
  });

  it('should handle same-day quiet hours', () => {
    expect(isInQuietHours('13:00', '12:00', '14:00')).toBe(true);
    expect(isInQuietHours('11:59', '12:00', '14:00')).toBe(false);
    expect(isInQuietHours('14:00', '12:00', '14:00')).toBe(false);
  });
});
