export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const time = d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (isToday) return `Aujourd'hui \u00e0 ${time}`;

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  if (isTomorrow) return `Demain \u00e0 ${time}`;

  return d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' }) + ` \u00e0 ${time}`;
}

export function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const time = d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (isToday) return `Aujourd'hui \u00e0 ${time}`;
  return d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' }) + ` \u00e0 ${time}`;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return '\u00e0 l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.round(hrs / 24);
  return `il y a ${days}j`;
}
