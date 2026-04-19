export function getOpenRouterApiKey(): string | null {
  const raw = process.env.OPENROUTER_API_KEY;
  if (raw == null || typeof raw !== "string") return null;
  let k = raw.trim();
  if (/^bearer\s+/i.test(k)) {
    k = k.replace(/^bearer\s+/i, "").trim();
  }
  return k.length > 0 ? k : null;
}

export function openRouterKeyLogFields(apiKey: string) {
  const masked =
    apiKey.length > 14
      ? `${apiKey.slice(0, 10)}…${apiKey.slice(-4)}`
      : `(short,len=${apiKey.length})`;
  const firstCodes = [...apiKey.slice(0, 8)].map((ch) => ch.charCodeAt(0));
  return {
    keyMasked: masked,
    keyLength: apiKey.length,
    keyFirstCharCodes: firstCodes,
    keyHasNonAscii: /[^\x20-\x7E]/.test(apiKey),
  };
}

export function openRouterEnvLogFields() {
  const raw = process.env.OPENROUTER_API_KEY;
  if (raw == null || typeof raw !== "string") {
    return {
      OPENROUTER_API_KEY_defined: false,
      rawLength: 0,
      rawTrimDelta: 0,
    };
  }
  return {
    OPENROUTER_API_KEY_defined: true,
    rawLength: raw.length,
    rawTrimDelta: raw.length - raw.trim().length,
  };
}

export function openRouterRuntimeLogFields() {
  return {
    NODE_ENV: process.env.NODE_ENV ?? null,
    VERCEL: process.env.VERCEL ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_URL: process.env.VERCEL_URL ?? null,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  };
}

export function logOpenRouterChatStart(apiKey: string) {
  console.log(
    "[api/chat] openrouter request",
    JSON.stringify({
      ...openRouterEnvLogFields(),
      ...openRouterKeyLogFields(apiKey),
      ...openRouterRuntimeLogFields(),
    })
  );
}

export function logOpenRouterChatUpstreamError(
  apiKey: string,
  res: Response,
  bodyText: string
) {
  console.error(
    "[api/chat] openrouter upstream error",
    JSON.stringify({
      upstreamHttpStatus: res.status,
      upstreamStatusText: res.statusText,
      bodyPreview: bodyText.slice(0, 2500),
      ...openRouterEnvLogFields(),
      ...openRouterKeyLogFields(apiKey),
      ...openRouterRuntimeLogFields(),
    })
  );
}

export function logOpenRouterChatException(apiKey: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(
    "[api/chat] openrouter exception",
    JSON.stringify({
      message: msg,
      ...openRouterEnvLogFields(),
      ...openRouterKeyLogFields(apiKey),
      ...openRouterRuntimeLogFields(),
    })
  );
}

export function openRouterAppHeaders(title: string) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return {
    "HTTP-Referer": site,
    "X-Title": title,
    "X-OpenRouter-Title": title,
  };
}
