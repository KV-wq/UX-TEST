import { NextRequest, NextResponse } from "next/server";

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

  let body: { kind?: string; snapshot?: unknown };
  try {
    body = (await req.json()) as { kind?: string; snapshot?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const kind = body.kind === "deal" ? "deal" : "client";
  const snapshot = body.snapshot ?? {};

  const system =
    kind === "client"
      ? "Ты кратко анализируешь карточку клиента в демо-CRM. В JSON стадия клиента передана только в поле stageLabelRu — это точная формулировка из интерфейса (Новый, Контакт, Квалифицирован, Завершено, Отклонено). Пиши только эти названия; не переводи стадии сам и не используй слова «выигран», «won», «проигран» — для успешного исхода у клиента в интерфейсе всегда «Завершено». Сделки перечислены в relatedDeals с полем stageLabelRu для каждой. dealsCount и dealsOpenCount — числа из данных. По JSON скажи 2 коротких абзаца (или 3 очень коротких предложения суммарно): что бросается в глаза по стадии и активности, один практический следующий шаг. Без markdown, без списков, без технических имён полей, по-русски, уверенно."
      : "Ты кратко анализируешь сделку в демо-CRM. Стадия сделки только в поле stageLabelRu (Новая, Переговоры, Завершена, Отклонена) — пиши только так, как в интерфейсе; не подставляй «выиграна» или английские коды. По JSON скажи 2–3 коротких предложения: здоровье сделки по стадии и сумме, риск или возможность, один конкретный совет. Без markdown и списков, по-русски.";

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "TEST UX entity insight",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(snapshot) },
        ],
        temperature: 0.35,
        max_tokens: 400,
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

    const text =
      data.choices?.[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ insight: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
