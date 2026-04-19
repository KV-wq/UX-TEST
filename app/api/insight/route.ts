import { NextRequest, NextResponse } from "next/server";
import type { Client, Deal } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "google/gemini-2.5-flash-lite";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY не задан в .env" },
      { status: 500 }
    );
  }

  let body: {
    summary?: unknown;
    clients?: unknown;
    deals?: unknown;
    company?: unknown;
    companyAbout?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const companyHint =
    typeof body.company === "string" && body.company.trim()
      ? body.company.trim()
      : undefined;
  const aboutHint =
    typeof body.companyAbout === "string" && body.companyAbout.trim()
      ? body.companyAbout.trim()
      : undefined;

  let snapshot: Record<string, unknown>;

  if (body.summary && typeof body.summary === "object") {
    snapshot = {
      company: companyHint,
      companyAbout: aboutHint,
      summary: body.summary,
    };
  } else {
    const rawClients = Array.isArray(body.clients) ? body.clients : [];
    const rawDeals = Array.isArray(body.deals) ? body.deals : [];
    const clients = rawClients.slice(0, 40) as Client[];
    const deals = rawDeals.slice(0, 40) as Deal[];
    snapshot = {
      clientsCount: rawClients.length,
      dealsCount: rawDeals.length,
      company: companyHint,
      companyAbout: aboutHint,
      clients: clients.map((c) => ({
        name: c.name,
        stage: c.stage,
      })),
      deals: deals.map((d) => ({
        title: d.title,
        stage: d.stage,
        amount: d.amount,
      })),
    };
  }

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "TEST UX CRM Insight",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "Ты аналитик CRM. В JSON поле summary — уже сжатая сводка за последнюю неделю (цифры и топ сделок). company/companyAbout — контекст бизнеса. Напиши 2–3 коротких предложения на русском: что бросается в глаза и один практический совет. Без markdown и списков, без имён полей из JSON.",
          },
          { role: "user", content: JSON.stringify(snapshot) },
        ],
        temperature: 0.35,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `OpenRouter ${res.status}: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
      error?: { message?: string };
    };

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message ?? "OpenRouter error" },
        { status: 502 }
      );
    }

    const insight =
      data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!insight) {
      return NextResponse.json({ insight: "" }, { status: 200 });
    }

    return NextResponse.json({ insight });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
