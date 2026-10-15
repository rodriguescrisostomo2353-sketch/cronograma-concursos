/**
 * Utilitários de Data e Hora - Foco em fuso horário local
 * Elimina o bug de avanço indevido de datas em fusos como o de Brasília (UTC-3)
 */

export function getLocalDateString(d = new Date()) {
  const dateObj = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateBR(d = new Date()) {
  if (!d) return '--/--/----';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }
  const dateObj = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '--/--/----';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${day}/${m}/${y}`;
}

export function formatTimeBR(d = new Date()) {
  const dateObj = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '--:--';
  const h = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

export function formatMinutesHuman(totalMinutes = 0) {
  const m = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function addDays(date, days = 0) {
  const d = (date instanceof Date) ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function diffDays(targetDate, fromDate = new Date()) {
  const t = (targetDate instanceof Date) ? targetDate : new Date(targetDate);
  const f = (fromDate instanceof Date) ? fromDate : new Date(fromDate);
  const tZero = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const fZero = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  return Math.round((tZero - fZero) / (1000 * 60 * 60 * 24));
}

if (typeof window !== 'undefined') {
  window.DateUtils = {
    getLocalDateString,
    formatDateBR,
    formatTimeBR,
    formatMinutesHuman,
    addDays,
    diffDays
  };
}
