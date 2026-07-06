// Parses spoken set descriptions like "135 for 8", "60 kilos 10 reps",
// "225 pounds for five" into weight + reps. Used to PRE-FILL the inputs —
// never to auto-submit (mis-parses must stay harmless).

export interface ParsedSet {
  weight: number;
  reps: number;
  /** unit the speaker named, if any — caller decides how to convert */
  unit: 'kg' | 'lb' | null;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
};

function wordsToDigits(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => (NUMBER_WORDS[w] != null ? String(NUMBER_WORDS[w]) : w))
    .join(' ');
}

export function parseSpokenSet(transcript: string): ParsedSet | null {
  const text = wordsToDigits(transcript.toLowerCase().trim());

  let unit: ParsedSet['unit'] = null;
  if (/\b(kg|kgs|kilo|kilos|kilogram|kilograms)\b/.test(text)) unit = 'kg';
  else if (/\b(lb|lbs|pound|pounds)\b/.test(text)) unit = 'lb';

  // "135 for 8" / "60 kilos for 10" / "60 kg 10 reps" / "135 by 8" / "135 x 8"
  const match = text.match(
    /(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?|kilograms?|lbs?|pounds?)?\s*(?:for|by|x|times)?\s*(\d+)\s*(?:reps?)?\s*$/
  );
  if (!match) return null;

  const weight = Number(match[1]);
  const reps = Number(match[2]);
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  if (weight <= 0 || reps <= 0 || reps > 100) return null;
  // A bare "8" with no weight shouldn't parse; regex requires both numbers.
  return { weight, reps, unit };
}
