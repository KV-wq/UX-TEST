import { NextRequest, NextResponse } from "next/server";
import { OPENAI_TOOLS } from "@/lib/tools";
import { buildSystemPrompt } from "@/lib/system-prompt";
import type {
  AgentAction,
  Client,
  ClientStage,
  Deal,
  DealStage,
  User,
} from "@/lib/types";
import { polishAssistantMessage } from "@/lib/user-facing-message";
import { filterDealsForBulk } from "@/lib/bulk-deals";
import {
  applyCreatedAtFallbackForToday,
  parseLocalNoonFromISODate,
} from "@/lib/chat-date-fallback";
import { getOpenRouterApiKey, openRouterAppHeaders } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IncomingMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: IncomingMessage[];
  state: {
    location: "home" | "dashboard";
    user: User | null;
    clients: Client[];
    deals: Deal[];
    todayISO?: string;
  };
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIChoice {
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: OpenAIToolCall[];
  };
  finish_reason: string;
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
  error?: { message?: string };
}

const MODEL = "google/gemini-2.5-flash-lite";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const BATCH_MAX = 40;

const CLIENT_STAGES: readonly ClientStage[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

function normalizeClientStage(v: unknown): ClientStage {
  return CLIENT_STAGES.includes(v as ClientStage)
    ? (v as ClientStage)
    : "new";
}

function normalizeDealStage(v: unknown): DealStage {
  return v === "negotiation" || v === "won" || v === "lost" || v === "new"
    ? v
    : "new";
}

function parseCreatedAtISO(v: unknown): number | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return parseLocalNoonFromISODate(s);
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : undefined;
}

function parseDaysArg(args: Record<string, unknown>): number {
  const raw = Number(args.days);
  return Number.isFinite(raw)
    ? Math.min(30, Math.max(1, Math.floor(raw)))
    : 7;
}

function buildDealPatchFromToolArgs(args: Record<string, unknown>): {
  title?: string;
  amount?: number;
  clientName?: string;
  stage?: DealStage;
} | null {
  const hasChange =
    args.title !== undefined ||
    typeof args.amount === "number" ||
    args.clientName !== undefined ||
    args.stage !== undefined;
  if (!hasChange) return null;
  const payload: {
    title?: string;
    amount?: number;
    clientName?: string;
    stage?: DealStage;
  } = {};
  if (args.title !== undefined) {
    const t = String(args.title).trim();
    if (t) payload.title = t;
  }
  if (typeof args.amount === "number" && Number.isFinite(args.amount)) {
    payload.amount = args.amount;
  }
  if (args.clientName !== undefined) {
    payload.clientName = String(args.clientName).trim();
  }
  if (args.stage !== undefined) {
    payload.stage = normalizeDealStage(args.stage);
  }
  if (
    payload.title === undefined &&
    payload.amount === undefined &&
    payload.clientName === undefined &&
    payload.stage === undefined
  ) {
    return null;
  }
  return payload;
}

function enrichActionsWithBulkCounts(
  actions: AgentAction[],
  deals: Deal[]
): AgentAction[] {
  return actions.map((a) => {
    if (a.type !== "bulkUpdateDeals") return a;
    const n = filterDealsForBulk(deals, {
      applyToAll: a.payload.applyToAll,
      dealIds: a.payload.dealIds,
      filterStage: a.payload.filterStage,
      titleContains: a.payload.titleContains,
    }).length;
    return {
      ...a,
      payload: { ...a.payload, matchedCount: n },
    };
  });
}

function normalizeSpreadScope(v: unknown): "deals" | "clients" | "both" | null {
  if (v === undefined || v === null) return null;
  const s = String(v).toLowerCase().trim();
  if (["deals", "deal", "сделки", "сделка"].includes(s)) return "deals";
  if (["clients", "client", "клиенты", "клиент"].includes(s)) return "clients";
  if (["both", "all", "оба", "все"].includes(s)) return "both";
  return null;
}

function parseToolCallToAction(tc: OpenAIToolCall): AgentAction | null {
  let args: Record<string, unknown> = {};
  try {
    args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
  } catch {
    return null;
  }
  const name = tc.function.name;
  switch (name) {
    case "registerUser":
      if (args.name && args.email && args.company && args.role) {
        const about =
          args.companyAbout != null ? String(args.companyAbout).trim() : "";
        return {
          type: "registerUser",
          payload: {
            name: String(args.name),
            email: String(args.email),
            company: String(args.company),
            role: String(args.role),
            companyAbout: about || undefined,
          },
        };
      }
      return null;
    case "navigate":
      if (args.to === "home" || args.to === "dashboard") {
        return { type: "navigate", payload: { to: args.to } };
      }
      return null;
    case "addClient":
      if (args.name) {
        return {
          type: "addClient",
          payload: {
            name: String(args.name),
            email: args.email ? String(args.email) : undefined,
            phone: args.phone ? String(args.phone) : undefined,
            company: args.company ? String(args.company) : undefined,
            stage: normalizeClientStage(args.stage),
            createdAt: parseCreatedAtISO(args.createdAtISO),
          },
        };
      }
      return null;
    case "addDeal":
      if (args.title && typeof args.amount === "number") {
        const clientIdRaw =
          args.clientId != null ? String(args.clientId).trim() : "";
        return {
          type: "addDeal",
          payload: {
            title: String(args.title),
            amount: Number(args.amount),
            clientName: args.clientName ? String(args.clientName) : undefined,
            clientId: clientIdRaw || undefined,
            stage: normalizeDealStage(args.stage),
            createdAt: parseCreatedAtISO(args.createdAtISO),
          },
        };
      }
      return null;
    case "updateDeal": {
      const dealId =
        args.dealId != null ? String(args.dealId).trim() : "";
      if (!dealId) return null;
      const patch = buildDealPatchFromToolArgs(args);
      if (!patch) return null;
      return { type: "updateDeal", payload: { id: dealId, ...patch } };
    }
    case "bulkUpdateDeals": {
      const applyToAll = args.applyToAll === true;
      const dealIds = Array.isArray(args.dealIds)
        ? (args.dealIds as unknown[])
            .map((x) => String(x).trim())
            .filter(Boolean)
        : [];
      const filterStage =
        args.filterStage !== undefined
          ? normalizeDealStage(args.filterStage)
          : undefined;
      const titleContains =
        args.titleContains != null
          ? String(args.titleContains).trim()
          : undefined;
      const patch = buildDealPatchFromToolArgs(args);
      if (!patch) return null;
      if (!applyToAll && dealIds.length === 0) {
        if (filterStage === undefined && (!titleContains || !titleContains)) {
          return null;
        }
      }
      return {
        type: "bulkUpdateDeals",
        payload: {
          applyToAll: applyToAll || undefined,
          dealIds: dealIds.length ? dealIds : undefined,
          filterStage,
          titleContains: titleContains || undefined,
          patch,
        },
      };
    }
    case "addClientsBatch": {
      if (!Array.isArray(args.clients)) return null;
      const raw = args.clients as Record<string, unknown>[];
      const clients = raw
        .slice(0, BATCH_MAX)
        .map((row) => {
          const name = row.name != null ? String(row.name).trim() : "";
          if (!name) return null;
          const email =
            row.email != null ? String(row.email).trim() : "";
          const phone =
            row.phone != null ? String(row.phone).trim() : "";
          const company =
            row.company != null ? String(row.company).trim() : "";
          return {
            name,
            email: email || undefined,
            phone: phone || undefined,
            company: company || undefined,
            stage: normalizeClientStage(row.stage),
            createdAt: parseCreatedAtISO(row.createdAtISO),
          };
        })
        .filter((c): c is NonNullable<typeof c> => c != null);
      if (!clients.length) return null;
      return { type: "addClientsBatch", payload: { clients } };
    }
    case "addDealsBatch": {
      if (!Array.isArray(args.deals)) return null;
      const raw = args.deals as Record<string, unknown>[];
      const deals = raw
        .slice(0, BATCH_MAX)
        .map((row) => {
          const title = row.title != null ? String(row.title).trim() : "";
          const amount = Number(row.amount);
          if (!title || !Number.isFinite(amount)) return null;
          const cid =
            row.clientId != null ? String(row.clientId).trim() : "";
          return {
            title,
            amount,
            clientName:
              row.clientName != null
                ? String(row.clientName).trim()
                : undefined,
            clientId: cid || undefined,
            stage: normalizeDealStage(row.stage),
            createdAt: parseCreatedAtISO(row.createdAtISO),
          };
        })
        .filter((d): d is NonNullable<typeof d> => d != null);
      if (!deals.length) return null;
      return { type: "addDealsBatch", payload: { deals } };
    }
    case "seedDemoData": {
      const cc = Number(args.clientCount);
      const dc = Number(args.dealCount);
      if (!Number.isFinite(cc) || !Number.isFinite(dc)) return null;
      return {
        type: "seedDemoData",
        payload: {
          clientCount: Math.min(30, Math.max(0, Math.floor(cc))),
          dealCount: Math.min(30, Math.max(0, Math.floor(dc))),
        },
      };
    }
    case "redistributeClientDatesAcrossWeek":
      return {
        type: "spreadCreationTimes",
        payload: { scope: "clients", days: parseDaysArg(args) },
      };
    case "redistributeDealDatesAcrossWeek":
      return {
        type: "spreadCreationTimes",
        payload: { scope: "deals", days: parseDaysArg(args) },
      };
    case "spreadCreationTimesAcrossDays": {
      let scope = normalizeSpreadScope(args.scope);
      if (!scope) scope = normalizeSpreadScope(args.target);
      if (!scope) scope = normalizeSpreadScope(args.for);
      if (!scope) return null;
      return {
        type: "spreadCreationTimes",
        payload: { scope, days: parseDaysArg(args) },
      };
    }
    case "showAnalytics":
      return {
        type: "showAnalytics",
        payload: {
          metrics: Array.isArray(args.metrics)
            ? (args.metrics as string[])
            : undefined,
        },
      };
    case "highlight":
      if (
        args.target === "clients" ||
        args.target === "deals" ||
        args.target === "analytics"
      ) {
        return { type: "highlight", payload: { target: args.target } };
      }
      return null;
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY не задан в .env" },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const system = buildSystemPrompt({
    location: body.state.location,
    user: body.state.user,
    clients: body.state.clients,
    deals: body.state.deals,
    todayISO: body.state.todayISO,
  });

  const messages = [
    { role: "system", content: system },
    ...body.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const temperature =
    body.state.location === "dashboard" ? 0.45 : 0.55;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...openRouterAppHeaders("AmoAI UX Demo"),
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: OPENAI_TOOLS,
        tool_choice: "auto",
        temperature,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `OpenRouter ${res.status}: ${text.slice(0, 400)}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as OpenAIResponse;
    if (data.error) {
      return NextResponse.json(
        { error: data.error.message ?? "OpenRouter error" },
        { status: 502 }
      );
    }
    const choice = data.choices?.[0];
    if (!choice) {
      return NextResponse.json(
        { error: "Пустой ответ от модели" },
        { status: 502 }
      );
    }

    const toolCalls = choice.message.tool_calls ?? [];
    let actions = toolCalls
      .map(parseToolCallToAction)
      .filter((a): a is AgentAction => Boolean(a));
    const lastUserMsg = [...body.messages]
      .reverse()
      .find((m) => m.role === "user");
    const lastUserContent = lastUserMsg?.content ?? "";
    actions = applyCreatedAtFallbackForToday(
      actions,
      lastUserContent,
      body.state.todayISO
    );
    actions = enrichActionsWithBulkCounts(actions, body.state.deals);

    const raw = (choice.message.content ?? "").trim();
    const message = polishAssistantMessage(raw, actions);

    return NextResponse.json({ message, actions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
