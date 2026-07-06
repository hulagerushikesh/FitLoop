import { parseSpokenSet } from '../voiceSetParser';

describe('parseSpokenSet', () => {
  it('parses "135 for 8"', () => {
    expect(parseSpokenSet('135 for 8')).toEqual({ weight: 135, reps: 8, unit: null });
  });

  it('parses "60 kilos 10 reps"', () => {
    expect(parseSpokenSet('60 kilos 10 reps')).toEqual({ weight: 60, reps: 10, unit: 'kg' });
  });

  it('parses "225 pounds for five" (number words)', () => {
    expect(parseSpokenSet('225 pounds for five')).toEqual({ weight: 225, reps: 5, unit: 'lb' });
  });

  it('parses "80 x 12" and "80 by 12"', () => {
    expect(parseSpokenSet('80 x 12')).toEqual({ weight: 80, reps: 12, unit: null });
    expect(parseSpokenSet('80 by 12')).toEqual({ weight: 80, reps: 12, unit: null });
  });

  it('parses decimal weights "62.5 kg for 6"', () => {
    expect(parseSpokenSet('62.5 kg for 6')).toEqual({ weight: 62.5, reps: 6, unit: 'kg' });
  });

  it('rejects nonsense and single numbers', () => {
    expect(parseSpokenSet('hello world')).toBeNull();
    expect(parseSpokenSet('8')).toBeNull();
    expect(parseSpokenSet('135 for 500')).toBeNull(); // implausible reps
  });
});
