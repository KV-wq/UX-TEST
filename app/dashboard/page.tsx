"use client";

import { useEffect, useId, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import {
  formatRub,
  formatRubCompact,
  formatRelativeDate,
  formatShortDate,
  startOfDay,
} from "@/lib/format";
import {
  CLIENT_STAGE_BADGE,
  CLIENT_STAGE_LABEL,
  DEAL_STAGE_BADGE,
  DEAL_STAGE_LABEL,
} from "@/lib/stage-meta";
import { buildInsightSummary } from "@/lib/insight-summary";

const DAYS = 7;

type OverviewChartRow = {
  label: string;
  weekdayShort: string;
  ts: number;
  deals: number;
  clients: number;
  isToday: boolean;
};

export default function OverviewPage() {
  const overviewGradId = useId().replace(/:/g, "");
  const user = useAppStore((s) => s.user);
  const clients = useAppStore((s) => s.clients);
  const deals = useAppStore((s) => s.deals);
  const overviewInsightText = useAppStore((s) => s.overviewInsightText);
  const overviewInsightLoading = useAppStore((s) => s.overviewInsightLoading);
  const setOverviewInsight = useAppStore((s) => s.setOverviewInsight);
  const setOverviewInsightLoading = useAppStore(
    (s) => s.setOverviewInsightLoading
  );

  const kpis = useMemo(() => {
    const revenue = deals
      .filter((d) => d.stage === "won")
      .reduce((a, d) => a + d.amount, 0);
    const pipeline = deals
      .filter((d) => d.stage !== "won" && d.stage !== "lost")
      .reduce((a, d) => a + d.amount, 0);
    const avg =
      deals.length > 0
        ? Math.round(deals.reduce((a, d) => a + d.amount, 0) / deals.length)
        : 0;
    const conv =
      deals.length > 0
        ? Math.round(
            (deals.filter((d) => d.stage === "won").length / deals.length) *
              100
          )
        : 0;
    return { revenue, pipeline, avg, conv };
  }, [deals]);

  const chart = useMemo(() => {
    const today = startOfDay(Date.now());
    const day = 24 * 60 * 60 * 1000;
    return Array.from({ length: DAYS }, (_, i) => {
      const ts = today - (DAYS - 1 - i) * day;
      const dayClients = clients.filter(
        (c) => startOfDay(c.createdAt) === ts
      ).length;
      const dayDeals = deals.filter((d) => startOfDay(d.createdAt) === ts);
      const revenue = dayDeals
        .filter((d) => d.stage === "won")
        .reduce((a, d) => a + d.amount, 0);
      const weekdayShort = new Intl.DateTimeFormat("ru-RU", {
        weekday: "short",
      })
        .format(ts)
        .replace(/\./g, "");
      return {
        ts,
        weekdayShort,
        clients: dayClients,
        dealsCount: dayDeals.length,
        revenue,
      };
    });
  }, [clients, deals]);

  const chartData = useMemo((): OverviewChartRow[] => {
    const nowDay = startOfDay(Date.now());
    return chart.map((c) => {
      const ts = c.ts;
      return {
        label: `${c.weekdayShort} ${new Date(ts).getDate()}`,
        weekdayShort: c.weekdayShort,
        ts,
        deals: c.dealsCount,
        clients: c.clients,
        isToday: startOfDay(ts) === nowDay,
      };
    });
  }, [chart]);

  const periodRevenue = chart.reduce((a, c) => a + c.revenue, 0);
  const periodDeals = chart.reduce((a, c) => a + c.dealsCount, 0);

  const recent = useMemo(() => {
    const acts = [
      ...clients.map((c) => ({
        id: `c-${c.id}`,
        ts: c.createdAt,
        type: "client" as const,
        title: c.name,
        subtitle: c.company ?? c.email ?? "",
        badge: CLIENT_STAGE_LABEL[c.stage],
        badgeCls: CLIENT_STAGE_BADGE[c.stage],
      })),
      ...deals.map((d) => ({
        id: `d-${d.id}`,
        ts: d.createdAt,
        type: "deal" as const,
        title: d.title,
        subtitle: `${d.clientName ?? "без клиента"} • ${formatRub(d.amount)}`,
        badge: DEAL_STAGE_LABEL[d.stage],
        badgeCls: DEAL_STAGE_BADGE[d.stage],
      })),
    ];
    return acts.sort((a, b) => b.ts - a.ts).slice(0, 8);
  }, [clients, deals]);

  const fallbackInsight = useMemo(() => {
    if (deals.length === 0 && clients.length === 0) {
      return "Пока нет данных. Нажмите «Заполнить CRM» в левом меню — появятся демо-клиенты и сделки.";
    }
    const stuck = deals.filter((d) => d.stage === "negotiation").length;
    const won = deals.filter((d) => d.stage === "won").length;
    const lost = deals.filter((d) => d.stage === "lost").length;
    const hot =
      deals.filter((d) => d.stage !== "lost" && d.amount >= 250_000).length;
    const parts: string[] = [];
    if (stuck > 0)
      parts.push(`${stuck} сделок «зависли» на переговорах — пора дожимать`);
    if (hot > 0) parts.push(`${hot} крупных в работе`);
    if (won + lost > 0) {
      const cr = Math.round((won / Math.max(1, won + lost)) * 100);
      parts.push(`доля завершённых среди закрытых сделок ${cr}%`);
    }
    return parts.length
      ? `За последнюю неделю: ${parts.join(", ")}.`
      : "Всё ровно — активных сделок мало, стоит добавить лидов.";
  }, [deals, clients]);

  useEffect(() => {
    const state = useAppStore.getState();
    if (state.deals.length === 0 && state.clients.length === 0) {
      setOverviewInsight(null);
      setOverviewInsightLoading(false);
      return;
    }
    if (state.overviewInsightText !== null) return;

    let cancelled = false;
    setOverviewInsightLoading(true);

    fetch("/api/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: buildInsightSummary(state.clients, state.deals, 7),
        companyAbout: state.user?.companyAbout,
        company: state.user?.company,
      }),
    })
      .then(async (r) => {
        if (cancelled) return;
        const data = (await r.json()) as { insight?: string };
        const text = typeof data.insight === "string" ? data.insight.trim() : "";
        setOverviewInsight(text.length > 3 ? text : null);
      })
      .catch(() => {
        if (!cancelled) setOverviewInsight(null);
      })
      .finally(() => {
        if (!cancelled) setOverviewInsightLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clients.length, deals.length]);

  const isEmpty = clients.length === 0 && deals.length === 0;
  const insightText = isEmpty
    ? fallbackInsight
    : overviewInsightLoading
      ? "Загружаю инсайт…"
      : overviewInsightText
        ? overviewInsightText
        : fallbackInsight;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Привет, {user?.name.split(" ")[0]}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted sm:text-base">
          Сводка по воронке за последние {DAYS} дней. Детали — в разделах
          слева.
        </p>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Выручка (завершённые)"
          value={formatRub(kpis.revenue)}
          hint={`${formatRubCompact(periodRevenue)} за ${DAYS} дней`}
        />
        <Kpi label="В воронке" value={formatRub(kpis.pipeline)} hint="открытые" />
        <Kpi
          label="Средний чек"
          value={formatRub(kpis.avg)}
          hint={`${deals.length} сделок`}
        />
        <Kpi
          label="Конверсия"
          value={`${kpis.conv}%`}
          hint="завершённые / все сделки"
        />
      </div>

      <section className="surface mt-5 min-w-0 overflow-hidden p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={15} className="text-accent" />
              Активность по дням
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">
              Новые клиенты и сделки за {DAYS} дней · {periodDeals} сделок
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-ink-muted shadow-sm">
              <span className="h-2 w-2 rounded-full bg-gradient-to-br from-emerald-300 to-accent shadow-[0_0_8px_rgba(34,224,122,0.45)]" />
              Сделки
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-ink-muted shadow-sm">
              <span className="h-2 w-2 rounded-full bg-gradient-to-br from-sky-200 to-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.35)]" />
              Клиенты
            </span>
          </div>
        </div>

        {isEmpty ? (
          <div className="rounded-xl border border-dashed border-line bg-white/[0.02] p-6 text-center text-sm text-ink-muted">
            Нет данных — нажмите «Заполнить CRM» в левом меню.
          </div>
        ) : (
          <div className="relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] via-[#0b0b0f] to-[#050506] p-[1px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="relative h-[288px] w-full rounded-[15px] bg-[#08080b]/95 p-3 pt-2 ring-1 ring-white/[0.04]">
              <div
                className="pointer-events-none absolute inset-x-4 top-3 h-24 rounded-full bg-accent/[0.07] blur-3xl"
                aria-hidden
              />
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 6, left: 2, bottom: 4 }}
                  barGap={5}
                  barCategoryGap="22%"
                >
                  <defs>
                    <linearGradient
                      id={`${overviewGradId}-deals`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#5ee9b5" stopOpacity={1} />
                      <stop offset="45%" stopColor="#22e078" stopOpacity={0.92} />
                      <stop offset="100%" stopColor="#15803d" stopOpacity={0.45} />
                    </linearGradient>
                    <linearGradient
                      id={`${overviewGradId}-clients`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#bae6fd" stopOpacity={1} />
                      <stop offset="50%" stopColor="#38bdf8" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#0369a1" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 10"
                    stroke="rgba(255,255,255,0.055)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={(props) => (
                      <OverviewDayTick x={props.x} y={props.y} index={props.index} rows={chartData} />
                    )}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    interval={0}
                    height={44}
                    tickMargin={6}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                    domain={[0, (m: number) => Math.max(3, m + Math.max(1, Math.ceil(m * 0.2)))]}
                  />
                  <Tooltip
                    cursor={{
                      fill: "rgba(34,224,120,0.07)",
                      stroke: "rgba(255,255,255,0.1)",
                      strokeWidth: 1,
                    }}
                    content={(tip) => (
                      <OverviewActivityTooltip
                        active={tip.active}
                        payload={tip.payload}
                        formatShortDate={formatShortDate}
                      />
                    )}
                  />
                  <Bar
                    name="deals"
                    dataKey="deals"
                    fill={`url(#${overviewGradId}-deals)`}
                    radius={[8, 8, 2, 2]}
                    maxBarSize={34}
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth={1}
                    animationDuration={750}
                    animationEasing="ease-out"
                  />
                  <Bar
                    name="clients"
                    dataKey="clients"
                    fill={`url(#${overviewGradId}-clients)`}
                    radius={[8, 8, 2, 2]}
                    maxBarSize={34}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={1}
                    animationDuration={850}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-3">
        <section className="surface min-w-0 overflow-hidden p-4 sm:p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">Последние активности</div>
            <Link
              href="/dashboard/clients"
              className="shrink-0 text-xs text-ink-muted hover:text-accent"
            >
              Все клиенты <ArrowRight size={10} className="inline -mt-0.5" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white/[0.02] p-6 text-center text-sm text-ink-muted">
              Пока пусто. Добавьте клиентов или сделки.
            </div>
          ) : (
            <ul className="space-y-2">
              {recent.map((a) => (
                <li
                  key={a.id}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-transparent px-2 py-2 transition hover:border-line hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className={clsx(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                        a.type === "deal"
                          ? "border-accent/25 bg-accent/10 text-accent"
                          : "border-blue-500/30 bg-blue-500/10 text-blue-300"
                      )}
                    >
                      {a.type === "deal" ? (
                        <Wallet size={15} />
                      ) : (
                        <Users size={15} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.title}</div>
                      <div className="break-words text-xs text-ink-muted sm:truncate">
                        {a.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 pl-12 sm:justify-end sm:pl-0">
                    <span
                      className={clsx(
                        "pill max-w-[min(100%,10rem)] truncate border text-[11px]",
                        a.badgeCls
                      )}
                    >
                      {a.badge}
                    </span>
                    <div className="w-[4.5rem] shrink-0 text-right text-[11px] tabular-nums text-ink-muted sm:w-20">
                      {formatRelativeDate(a.ts)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface relative min-w-0 overflow-hidden p-4 sm:p-5">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={15} className="text-accent" />
              AI-инсайт
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink">
              {insightText}
            </p>

            <div className="mt-5 space-y-2">
              <Link
                href="/dashboard/deals"
                className="flex items-center justify-between rounded-xl border border-line bg-white/5 px-3 py-2.5 text-sm transition hover:border-accent/30 hover:bg-white/10"
              >
                Открыть канбан сделок
                <ArrowUpRight size={14} className="text-ink-muted" />
              </Link>
              <Link
                href="/dashboard/analytics"
                className="flex items-center justify-between rounded-xl border border-line bg-white/5 px-3 py-2.5 text-sm transition hover:border-accent/30 hover:bg-white/10"
              >
                Подробная аналитика
                <ArrowUpRight size={14} className="text-ink-muted" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function OverviewDayTick({
  x,
  y,
  index,
  rows,
}: {
  x: number;
  y: number;
  index: number;
  rows: OverviewChartRow[];
}) {
  const d = rows[index];
  if (!d) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="middle"
        dy={4}
        fill={d.isToday ? "#22e078" : "#71717a"}
        fontSize={10}
        fontWeight={d.isToday ? 600 : 500}
        style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        {d.weekdayShort}
      </text>
      <text
        textAnchor="middle"
        dy={18}
        fill={d.isToday ? "#fafafa" : "#a1a1aa"}
        fontSize={12}
        fontWeight={d.isToday ? 600 : 500}
      >
        {new Date(d.ts).getDate()}
      </text>
    </g>
  );
}

function OverviewActivityTooltip({
  active,
  payload,
  formatShortDate,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  formatShortDate: (ts: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as OverviewChartRow;
  return (
    <div className="rounded-xl border border-white/12 bg-[#101014]/95 px-3 py-2.5 shadow-2xl backdrop-blur-md">
      <div className="mb-2 border-b border-white/[0.07] pb-1.5 text-[11px] font-medium text-ink">
        {formatShortDate(row.ts)}
        {row.isToday ? (
          <span className="ml-2 rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            сегодня
          </span>
        ) : null}
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-ink-muted">
            <span className="h-2 w-2 rounded-sm bg-gradient-to-br from-emerald-300 to-accent shadow-[0_0_6px_rgba(34,224,122,0.5)]" />
            Сделки
          </span>
          <span className="tabular-nums font-semibold text-ink">{row.deals}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-ink-muted">
            <span className="h-2 w-2 rounded-sm bg-gradient-to-br from-sky-200 to-sky-500 shadow-[0_0_6px_rgba(56,189,248,0.4)]" />
            Клиенты
          </span>
          <span className="tabular-nums font-semibold text-ink">{row.clients}</span>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface p-4">
      <div className="text-xs uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-ink-muted">{hint}</div>}
    </div>
  );
}

