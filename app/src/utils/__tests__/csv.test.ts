import { toCsv } from '../csv';

describe('toCsv', () => {
  it('joins headers and rows with newlines', () => {
    const csv = toCsv(['date', 'kcal'], [['2026-07-06', 2100], ['2026-07-07', 1980]]);
    expect(csv).toBe('date,kcal\n2026-07-06,2100\n2026-07-07,1980');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    expect(toCsv(['name'], [['eggs, toast']])).toBe('name\n"eggs, toast"');
    expect(toCsv(['name'], [['plain sub']])).toBe('name\nplain sub'); // no special chars -> not quoted
    expect(toCsv(['name'], [['say "hi"']])).toBe('name\n"say ""hi"""'); // embedded quotes doubled
    expect(toCsv(['note'], [['line1\nline2']])).toBe('note\n"line1\nline2"');
  });

  it('renders null/undefined as empty and stringifies numbers', () => {
    expect(toCsv(['a', 'b', 'c'], [[null, 0, 42]])).toBe('a,b,c\n,0,42');
  });
});
