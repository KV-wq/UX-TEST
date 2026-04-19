import { startOfDay } from "@/lib/format";
import type { Client, Deal } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildInsightSummary(
  clients: Client[],
  deals: Deal[],
  windowDays = 7
) {
  const end = Date.now();
  const windowStart = startOfDay(end - (windowDays - 1) * DAY_MS);
  const cWin = clients.filter(
    (c) => c.createdAt >= windowStart && c.createdAt <= end
  );
  const dWin = deals.filter(
    (d) => d.createdAt >= windowStart && d.createdAt <= end
  );

  const clientStages: Record<string, number> = {};
  for (const c of cWin) {
    clientStages[c.stage] = (clientStages[c.stage] ?? 0) + 1;
  }
  const dealStages: Record<string, number> = {};
  let pipelineSum = 0;
  let wonSum = 0;
  let lostSum = 0;
  for (const d of dWin) {
    dealStages[d.stage] = (dealStages[d.stage] ?? 0) + 1;
    if (d.stage === "won") wonSum += d.amount;
    else if (d.stage === "lost") lostSum += d.amount;
    else pipelineSum += d.amount;
  }

  const topDeals = [...dWin]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((d) => ({
      title: d.title.slice(0, 48),
      amount: d.amount,
      stage: d.stage,
    }));

  return {
    windowDays,
    totals: {
      clientsInWindow: cWin.length,
      dealsInWindow: dWin.length,
      pipelineRub: Math.round(pipelineSum),
      wonRub: Math.round(wonSum),
      lostRub: Math.round(lostSum),
    },
    clientStages,
    dealStages,
    topDeals,
  };
}
