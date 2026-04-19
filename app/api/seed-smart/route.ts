import { NextRequest, NextResponse } from "next/server";
import { startOfDay } from "@/lib/format";
import { getOpenRouterApiKey, openRouterAppHeaders } from "@/lib/openrouter";
import type { ClientStage, DealStage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "google/gemini-2.5-flash-lite";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const CLIENT_STAGES: ClientStage[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];
const DEAL_STAGES: DealStage[] = ["new", "negotiation", "won", "lost"];

function normClientStage(v: unknown): ClientStage {
  return CLIENT_STAGES.includes(v as ClientStage) ? (v as ClientStage) : "new";
}

function normDealStage(v: unknown): DealStage {
  return DEAL_STAGES.includes(v as DealStage) ? (v as DealStage) : "new";
}

const DAY_MS = 24 * 60 * 60 * 1000;

function createdAtClientSlot(index: number, total: number, now: number): number {
  const daysAgo = (index * 9 + (total % 14)) % 14;
  const dayBase = startOfDay(now) - daysAgo * DAY_MS;
  const jitter =
    ((index * 7919 + total * 49297) >>> 0) % (DAY_MS - 120_000) + 60_000;
  const t = dayBase + jitter;
  const minT = startOfDay(now) - 13 * DAY_MS;
  return Math.min(now - 2000, Math.max(minT, t));
}

function createdAtDealSlot(index: number, total: number, now: number): number {
  const daysAgo = (index * 5 + (total % 14) + 4) % 14;
  const dayBase = startOfDay(now) - daysAgo * DAY_MS;
  const jitter =
    ((index * 1103515245 + total * 12345) >>> 0) % (DAY_MS - 120_000) + 60_000;
  const t = dayBase + jitter;
  const minT = startOfDay(now) - 13 * DAY_MS;
  return Math.min(now - 2000, Math.max(minT, t));
}

export async function POST(req: NextRequest) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY не задан в .env" },
      { status: 500 }
    );
  }

  let body: { company?: string; companyAbout?: string };
  try {
    body = (await req.json()) as { company?: string; companyAbout?: string };
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const company = typeof body.company === "string" ? body.company.trim() : "";
  const about =
    typeof body.companyAbout === "string" ? body.companyAbout.trim() : "";

  const system = `Ты генерируешь реалистичные демо-данные B2B CRM на русском.
Верни ТОЛЬКО один JSON-объект без markdown:
{
  "clients": [ { "name", "email", "phone", "company", "stage" } ],
  "deals": [ { "title", "amount", "clientName", "stage" } ]
}
clients: около 30 записей (от 26 до 34), deals: около 30 (от 26 до 34). Даты создания не указывай — сервер расставит их по последним 14 календарным дням.
stage клиента: одно из new, contacted, qualified, won, lost.
stage сделки: одно из new, negotiation, won, lost.
amount: целое число рублей от 45000 до 920000.
Имена, телефоны +7XXXXXXXXXX, email — реалистично.
clientName в сделках совпадает с name или company из клиентов.
Реалистичная воронка (не всё won).`;

  const userMsg = [
    company ? `Компания пользователя: ${company}.` : "Компания не указана.",
    about ? `Кратко о деятельности: ${about}` : "",
    "Сделай данные похожими на реальную мелкую/среднюю компанию в РФ.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...openRouterAppHeaders("TEST UX Seed"),
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        temperature: 0.85,
        max_tokens: 20000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `OpenRouter ${res.status}: ${text.slice(0, 240)}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    let parsed: {
      clients?: unknown[];
      deals?: unknown[];
    };
    try {
      parsed = JSON.parse(raw) as { clients?: unknown[]; deals?: unknown[] };
    } catch {
      return NextResponse.json(
        { error: "Модель вернула невалидный JSON" },
        { status: 502 }
      );
    }

    const rawClients = Array.isArray(parsed.clients) ? parsed.clients : [];
    const rawDeals = Array.isArray(parsed.deals) ? parsed.deals : [];
    const now = Date.now();

    const clientRows = rawClients.slice(0, 40);
    const nC = clientRows.length;
    const clients = clientRows.map((row, idx) => {
      const r = row as Record<string, unknown>;
      const name = r.name != null ? String(r.name).trim() : "";
      return {
        name: name || "Клиент",
        email: r.email != null ? String(r.email).trim() : undefined,
        phone: r.phone != null ? String(r.phone).trim() : undefined,
        company: r.company != null ? String(r.company).trim() : undefined,
        stage: normClientStage(r.stage),
        createdAt: createdAtClientSlot(idx, nC, now),
      };
    });

    const clientNames = new Set(
      clients.map((c) => c.name).filter(Boolean)
    );
    const companies = new Set(
      clients.map((c) => c.company).filter(Boolean) as string[]
    );

    const dealRows = rawDeals.slice(0, 40);
    const nD = dealRows.length;
    const deals = dealRows.map((row, idx) => {
      const r = row as Record<string, unknown>;
      const title = r.title != null ? String(r.title).trim() : "Сделка";
      const amount = Math.round(Number(r.amount));
      let clientName =
        r.clientName != null ? String(r.clientName).trim() : undefined;
      if (clientName && !clientNames.has(clientName)) {
        const hit = [...clientNames].find(
          (n) => clientName!.includes(n) || n.includes(clientName!)
        );
        clientName = hit ?? [...companies][0] ?? clientName;
      }
      return {
        title: title || "Сделка",
        amount: Number.isFinite(amount) ? Math.max(1000, amount) : 100_000,
        clientName,
        stage: normDealStage(r.stage),
        createdAt: createdAtDealSlot(idx, nD, now),
      };
    });

    return NextResponse.json({ clients, deals });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
