import { formatRelativeTime, formatDateTime, formatDateTimeShort } from '../utils/formatters';

describe('formatRelativeTime', () => {
  it('returns "à l\'instant" for less than 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("à l'instant");
  });

  it('returns minutes for < 60 min', () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60_000).toISOString();
    expect(formatRelativeTime(thirtyMinAgo)).toBe('il y a 30 min');
  });

  it('returns hours for < 24h', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('il y a 3h');
  });

  it('returns days for >= 24h', () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe('il y a 2j');
  });
});

describe('formatDateTime', () => {
  it('returns "Aujourd\'hui à HH:MM" for today', () => {
    const now = new Date();
    now.setHours(14, 30, 0, 0);
    const result = formatDateTime(now.toISOString());
    expect(result).toContain("Aujourd'hui");
  });

  it('returns "Demain à HH:MM" for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const result = formatDateTime(tomorrow.toISOString());
    expect(result).toContain('Demain');
  });

  it('returns full date for other days', () => {
    const farDate = new Date('2025-01-15T08:00:00Z');
    const result = formatDateTime(farDate.toISOString());
    // Should not contain "Aujourd'hui" or "Demain"
    expect(result).not.toContain("Aujourd'hui");
    expect(result).not.toContain('Demain');
    expect(result).toContain('à');
  });
});

describe('formatDateTimeShort', () => {
  it('returns "Aujourd\'hui" for today', () => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    const result = formatDateTimeShort(now.toISOString());
    expect(result).toContain("Aujourd'hui");
  });

  it('returns short weekday for other days', () => {
    const farDate = new Date('2025-06-20T14:00:00Z');
    const result = formatDateTimeShort(farDate.toISOString());
    expect(result).not.toContain("Aujourd'hui");
    expect(result).toContain('à');
  });
});
