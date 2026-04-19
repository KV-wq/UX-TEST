export function getOpenRouterApiKey(): string | null {
  const raw = process.env.OPENROUTER_API_KEY;
  if (raw == null || typeof raw !== "string") return null;
  let k = raw.trim();
  if (/^bearer\s+/i.test(k)) {
    k = k.replace(/^bearer\s+/i, "").trim();
  }
  return k.length > 0 ? k : null;
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
