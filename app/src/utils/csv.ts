// Minimal CSV writer — quotes fields containing commas/quotes/newlines.

export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (v: string | number | null): string => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}
