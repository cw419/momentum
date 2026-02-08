let fallbackCounter = 0;

function randomHex(bytes: number): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buffer = new Uint8Array(bytes);
    crypto.getRandomValues(buffer);
    return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  fallbackCounter += 1;
  return `${Date.now().toString(16)}${fallbackCounter.toString(16)}`;
}

export function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${randomHex(16)}`;
}
