import type { AgentAction } from "@/lib/types";

export function parseLocalNoonFromISODate(iso: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d))
    return undefined;
  return new Date(y, mo, d, 12, 0, 0, 0).getTime();
}

export function userAskedForToday(text: string): boolean {
  return /сегодня|на\s+сегодня|за\s+сегодня|сегодняшн|в\s+этот\s+день|за\s+сегодняшн/i.test(
    text
  );
}

export function applyCreatedAtFallbackForToday(
  actions: AgentAction[],
  lastUserMessage: string,
  todayISO: string | undefined
): AgentAction[] {
  if (!todayISO || !userAskedForToday(lastUserMessage)) return actions;
  const ts = parseLocalNoonFromISODate(todayISO);
  if (ts === undefined) return actions;

  return actions.map((a) => {
    if (a.type === "addClient") {
      if (a.payload.createdAt != null) return a;
      return { ...a, payload: { ...a.payload, createdAt: ts } };
    }
    if (a.type === "addDeal") {
      if (a.payload.createdAt != null) return a;
      return { ...a, payload: { ...a.payload, createdAt: ts } };
    }
    if (a.type === "addClientsBatch") {
      return {
        ...a,
        payload: {
          clients: a.payload.clients.map((c) =>
            c.createdAt != null ? c : { ...c, createdAt: ts }
          ),
        },
      };
    }
    if (a.type === "addDealsBatch") {
      return {
        ...a,
        payload: {
          deals: a.payload.deals.map((d) =>
            d.createdAt != null ? d : { ...d, createdAt: ts }
          ),
        },
      };
    }
    return a;
  });
}
