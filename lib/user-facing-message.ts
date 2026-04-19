import type { AgentAction } from "./types";
import { DEAL_STAGE_LABEL } from "./stage-meta";

export function polishAssistantMessage(
  raw: string,
  actions: AgentAction[]
): string {
  const t = raw.trim();
  const fromActions = summarizeActions(actions);

  if (!t) return fromActions;

  const looksTechnical =
    /registerUser|navigate|addClient|addDeal|updateDeal|bulkUpdateDeals|addClientsBatch|addDealsBatch|seedDemoData|spreadCreationTimesAcrossDays|redistributeClientDatesAcrossWeek|redistributeDealDatesAcrossWeek|showAnalytics|highlight|addField|Выполнил:|tool_calls|function\s+call/i.test(
      t
    ) || /^Готово\.?\s*Выполнил/i.test(t);

  if (looksTechnical && t.length < 220) return fromActions;
  if (actions.length > 0 && t.length < 24 && /готово/i.test(t))
    return fromActions;

  return t;
}

function summarizeActions(actions: AgentAction[]): string {
  if (!actions.length) return "Готов помочь — напишите, что нужно.";

  const hasReg = actions.some((a) => a.type === "registerUser");
  const hasNavDash = actions.some(
    (a) => a.type === "navigate" && a.payload.to === "dashboard"
  );
  if (hasReg && hasNavDash) {
    return "Готово, аккаунт создан. Открываю рабочий стол.";
  }

  const parts: string[] = [];
  for (const a of actions) {
    switch (a.type) {
      case "registerUser":
        parts.push(`Аккаунт создан, добро пожаловать, ${a.payload.name}.`);
        break;
      case "navigate":
        parts.push(
          a.payload.to === "dashboard"
            ? "Перехожу в рабочий стол."
            : "Возвращаюсь на главную."
        );
        break;
      case "addClient":
        parts.push(`Добавил клиента «${a.payload.name}».`);
        break;
      case "addDeal":
        parts.push(
          `Создал сделку «${a.payload.title}» на ${formatRub(a.payload.amount)}.`
        );
        break;
      case "updateDeal": {
        const p = a.payload;
        const bits: string[] = [];
        if (p.title !== undefined) bits.push(`«${p.title}»`);
        if (p.amount !== undefined) bits.push(formatRub(p.amount));
        if (p.stage !== undefined)
          bits.push(`стадия «${DEAL_STAGE_LABEL[p.stage]}»`);
        if (p.clientName !== undefined)
          bits.push(p.clientName ? `клиент ${p.clientName}` : "без клиента");
        parts.push(`Обновил сделку: ${bits.join(", ")}.`);
        break;
      }
      case "bulkUpdateDeals": {
        const p = a.payload;
        const n = p.matchedCount ?? 0;
        const bits: string[] = [];
        if (p.patch.title !== undefined) bits.push(`название «${p.patch.title}»`);
        if (p.patch.amount !== undefined) bits.push(formatRub(p.patch.amount));
        if (p.patch.stage !== undefined)
          bits.push(`стадия «${DEAL_STAGE_LABEL[p.patch.stage]}»`);
        if (p.patch.clientName !== undefined)
          bits.push(
            p.patch.clientName
              ? `клиент ${p.patch.clientName}`
              : "без клиента"
          );
        const what = bits.length ? bits.join(", ") : "поля";
        parts.push(
          n > 0
            ? `Обновил ${ruDealCount(n)}: ${what}.`
            : `Запрос на массовое обновление (${what}) — подходящих сделок не найдено.`
        );
        break;
      }
      case "addClientsBatch": {
        const n = a.payload.clients.length;
        parts.push(
          n === 1
            ? `Добавил клиента «${a.payload.clients[0]!.name}».`
            : `Добавил ${n} клиентов.`
        );
        break;
      }
      case "addDealsBatch": {
        const n = a.payload.deals.length;
        parts.push(
          n === 1
            ? `Создал сделку «${a.payload.deals[0]!.title}» на ${formatRub(a.payload.deals[0]!.amount)}.`
            : `Создал ${n} сделок.`
        );
        break;
      }
      case "seedDemoData":
        parts.push(
          `Готово: ${a.payload.clientCount} тестовых клиентов и ${a.payload.dealCount} сделок с демо-данными.`
        );
        break;
      case "spreadCreationTimes": {
        const sc =
          a.payload.scope === "both"
            ? "сделки и клиенты"
            : a.payload.scope === "clients"
              ? "клиенты"
              : "сделки";
        parts.push(
          `Расставил даты создания по ${a.payload.days} дням (${sc}) — график на обзоре обновится.`
        );
        break;
      }
      case "showAnalytics":
        parts.push("Показываю аналитику на экране.");
        break;
      case "highlight":
        break;
    }
  }
  const uniq = [...new Set(parts.filter(Boolean))];
  return uniq.length ? uniq.join(" ") : "Сделано.";
}

function ruDealCount(n: number) {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} сделок`;
  if (mod10 === 1) return `${n} сделку`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} сделки`;
  return `${n} сделок`;
}

function formatRub(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}
