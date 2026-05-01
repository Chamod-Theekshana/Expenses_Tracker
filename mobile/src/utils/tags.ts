export const MAX_TRANSACTION_TAGS = 20;
export const MAX_TAG_LENGTH = 30;

function normalizeSingle(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

export function normalizeTag(raw: string): string {
  const normalized = normalizeSingle(raw);
  return normalized.slice(0, MAX_TAG_LENGTH);
}

export function parseTagInput(input: string): string[] {
  const tokens = input.split(/[\s,]+/);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const normalized = normalizeTag(token);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

export function mergeTags(existing: string[], incoming: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const pushIfValid = (raw: string) => {
    const normalized = normalizeTag(raw);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  existing.forEach(pushIfValid);
  incoming.forEach(pushIfValid);

  return out.slice(0, MAX_TRANSACTION_TAGS);
}
