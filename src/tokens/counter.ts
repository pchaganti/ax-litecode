let encoder: { encode: (text: string) => Uint32Array } | null = null;
let encoderFailed = false;
let warnedAboutFallback = false;

// Code averages ~4 chars/token; using 4.0 rather than 3.5 gives a conservative
// (slightly over) estimate so budgets don't silently overflow when tiktoken is unavailable.
const CHARS_PER_TOKEN_FALLBACK = 4.0;

async function getEncoder() {
  if (encoderFailed) return null;
  if (encoder) return encoder;
  try {
    const { get_encoding } = await import("tiktoken");
    encoder = get_encoding("cl100k_base");
  } catch {
    encoderFailed = true;
    return null;
  }
  return encoder;
}

function fallbackCount(text: string): number {
  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    process.stderr.write(
      "[litecode] Warning: tiktoken unavailable — using character-based token estimates. " +
      "Token budgets may be slightly off.\n"
    );
  }
  return Math.ceil(text.length / CHARS_PER_TOKEN_FALLBACK);
}

export async function countTokensAsync(text: string): Promise<number> {
  const enc = await getEncoder();
  if (enc) return enc.encode(text).length;
  return fallbackCount(text);
}

// Synchronous version — only accurate after initEncoder() has resolved.
export function countTokens(text: string): number {
  if (encoder) return encoder.encode(text).length;
  return fallbackCount(text);
}

// Call this once at startup to warm up the encoder
export async function initEncoder(): Promise<void> {
  await getEncoder();
}
