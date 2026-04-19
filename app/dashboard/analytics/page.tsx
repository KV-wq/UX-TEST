"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Sparkles, Target, Trophy } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  formatRub,
  formatRubCompact,
  formatShortDate,
  startOfDay,
} from "@/lib/format";
import {
  CLIENT_STAGE_LABEL,
  CLIENT_STAGES_ORDERED,
  DEAL_STAGE_LABEL,
  DEAL_STAGES_ORDERED,
} from "@/lib/stage-meta";
import type { Deal } from "@/lib/types";

const PERIODS = [7, 14, 28, 90] as const;
type PeriodDays = (typeof PERIODS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

function inPeriod(ts: number, periodDays: number) {
  const end = Date.now();
  const start = startOfDay(end - (periodDays - 1) * DAY_MS);
  return ts >= start && ts <= end;
}

function filterByPeriod<T extends { createdAt: number }>(
  rows: T[],
  periodDays: number
) {
  return rows.filter((r) => inPeriod(r.createdAt, periodDays));
}

function buildRevenueSeries(
  deals: Deal[],
  periodDays: PeriodDays
): { ts: number; sum: number; label: string }[] {
  const today = startOfDay(Date.now());
  const won = deals.filter((d) => d.stage === "won");

  if (periodDays <= 28) {
    return Array.from({ length: periodDays }, (_, i) => {
      const ts = today - (periodDays - 1 - i) * DAY_MS;
      const sum = won
        .filter((d) => startOfDay(d.createdAt) === ts)
        .reduce((a, d) => a + d.amount, 0);
      return { ts, sum, label: formatShortDate(ts) };
    });
  }

  const weeks = 13;
  return Array.from({ length: weeks }, (_, wi) => {
    const endOffsetDays = (weeks - 1 - wi) * 7;
    const startTs = today - (endOffsetDays + 7) * DAY_MS;
    const endTs = today - endOffsetDays * DAY_MS + DAY_MS - 1;
    const sum = won
      .filter((d) => d.createdAt >= startTs && d.createdAt <= endTs)
      .reduce((a, d) => a + d.amount, 0);
    return {
      ts: startTs,
      sum,
      label: wi === weeks - 1 ? "Сейчас" : formatShortDate(startTs),
    };
  });
}

export default function AnalyticsPage() {
  const clients = useAppStore((s) => s.clients);
  const deals = useAppStore((s) => s.deals);
  const highlight = useAppStore((s) => s.highlight);

  const [periodDays, setPeriodDays] = useState<PeriodDays>(14);
  const gradId = useId().replace(/:/g, "");

  const clientsP = useMemo(
    () => filterByPeriod(clients, periodDays),
    [clients, periodDays]
  );
  const dealsP = useMemo(
    () => filterByPeriod(deals, periodDays),
    [deals, periodDays]
  );

  const stats = useMemo(() => {
    const revenue = dealsP
      .filter((d) => d.stage === "won")
      .reduce((a, d) => a + d.amount, 0);
    const pipeline = dealsP
      .filter((d) => d.stage !== "won" && d.stage !== "lost")
      .reduce((a, d) => a + d.amount, 0);
    const winRate =
      dealsP.length > 0
        ? Math.round(
            (dealsP.filter((d) => d.stage === "won").length / dealsP.length) *
              100
          )
        : 0;
    const avgCheck =
      dealsP.length > 0
        ? Math.round(
            dealsP.reduce((a, d) => a + d.amount, 0) / dealsP.length
          )
        : 0;
    const wonN = dealsP.filter((d) => d.stage === "won").length;
    const avgWon =
      wonN > 0 ? Math.round(revenue / Math.max(1, wonN)) : 0;
    return { revenue, pipeline, winRate, avgCheck, avgWon };
  }, [dealsP]);

  const clientFunnel = useMemo(() => {
    return CLIENT_STAGES_ORDERED.map((s) => ({
      stage: s,
      label: CLIENT_STAGE_LABEL[s],
      count: clientsP.filter((c) => c.stage === s).length,
    }));
  }, [clientsP]);

  const dealFunnel = useMemo(() => {
    return DEAL_STAGES_ORDERED.map((s) => ({
      stage: s,
      label: DEAL_STAGE_LABEL[s],
      count: dealsP.filter((d) => d.stage === s).length,
      sum: dealsP
        .filter((d) => d.stage === s)
        .reduce((a, d) => a + d.amount, 0),
    }));
  }, [dealsP]);

  const revenueSeries = useMemo(
    () => buildRevenueSeries(deals, periodDays),
    [deals, periodDays]
  );

  const chartData = useMemo(
    () =>
      revenueSeries.map((r) => ({
        label: r.label,
        sum: r.sum,
      })),
    [revenueSeries]
  );

  const totalInSeries = revenueSeries.reduce((a, r) => a + r.sum, 0);
  const maxRevenue = Math.max(1, ...revenueSeries.map((r) => r.sum));

  const maxClients = Math.max(1, ...clientFunnel.map((r) => r.count));
  const maxDeals = Math.max(1, ...dealFunnel.map((r) => r.count));

  const isEmpty = clients.length === 0 && deals.length === 0;
  const wonAny = deals.filter((d) => d.stage === "won").length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Аналитика
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Показатели и воронки — за выбранный период. График выручки —
            завершённые сделки по дате создания записи.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white/[0.03] p-1">
          <span className="hidden pl-2 text-[11px] text-ink-muted sm:inline">
            Период
          </span>
          {PERIODS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPeriodDays(d)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                periodDays === d
                  ? "bg-accent/20 text-ink"
                  : "text-ink-muted hover:bg-white/5 hover:text-ink"
              )}
            >
              {d === 90 ? "90 дн" : `${d} д`}
            </button>
          ))}
        </div>
      </div>

      {isEmpty && (
        <div className="surface mb-5 p-4 text-sm text-ink-muted">
          Нет данных — сгенерируйте демо через боковое меню или ассистента.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Trophy size={14} />}
          label={`Выручка (${periodDays} д.)`}
          value={formatRub(stats.revenue)}
        />
        <StatCard
          icon={<Target size={14} />}
          label="В воронке"
          value={formatRub(stats.pipeline)}
          muted
        />
        <StatCard
          icon={<BarChart3 size={14} />}
          label="Конверсия"
          value={`${stats.winRate}%`}
          hint={`сделок в периоде: ${dealsP.length}`}
        />
        <StatCard
          icon={<Sparkles size={14} />}
          label="Средний чек (won)"
          value={formatRub(stats.avgWon)}
          hint={`по всем в периоде: ${formatRub(stats.avgCheck)}`}
        />
      </div>

      <motion.section
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={clsx(
          "surface mt-5 overflow-hidden p-5",
          highlight === "analytics" && "ring-2 ring-accent shadow-glow"
        )}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Динамика выручки</div>
            <div className="text-xs text-ink-muted">
              Завершённые сделки ·{" "}
              {periodDays === 90 ? "по неделям" : "по дням"} · в графике:{" "}
              {formatRubCompact(totalInSeries)}
            </div>
          </div>
          <div className="text-xs text-ink-muted">
            max: {formatRubCompact(maxRevenue)}
          </div>
        </div>

        {!isEmpty && wonAny === 0 && (
          <div className="mb-4 rounded-xl border border-line/80 bg-white/[0.02] px-3 py-2 text-xs text-ink-muted">
            Нет завершённых сделок — график заполнится после появления стадии
            «Завершено».
          </div>
        )}

        {!isEmpty && wonAny > 0 && totalInSeries === 0 && (
          <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-ink-muted">
            В этом окне дат нет выигранных сделок — расширьте период до 28–90
            дней.
          </div>
        )}

        <div className="relative h-[260px] w-full min-w-0 rounded-xl border border-line/50 bg-[#0a0a0c]/50 px-1 pt-2">
          {chartData.length > 0 && totalInSeries > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 12, right: 12, left: 8, bottom: 4 }}
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="#22e078"
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor="#22e078"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 8"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#8b8b95" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#8b8b95" }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => formatRubCompact(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "#121214",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(value: number) => [formatRub(value), "Выручка"]}
                />
                <Area
                  type="monotone"
                  dataKey="sum"
                  stroke="#22e078"
                  strokeWidth={2.5}
                  fill={`url(#${gradId})`}
                  dot={{ fill: "#22e078", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-muted">
              Нет данных для графика
            </div>
          )}
        </div>
      </motion.section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="surface p-5">
          <div className="mb-1 text-sm font-semibold">Воронка клиентов</div>
          <div className="mb-3 text-[11px] text-ink-muted">
            Записи с датой создания в выбранном периоде ({clientsP.length})
          </div>
          <div className="space-y-2.5">
            {clientFunnel.map((row) => (
              <div key={row.stage} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-sm text-ink-muted">
                  {row.label}
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(row.count / maxClients) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-accent-soft to-accent"
                  />
                </div>
                <div className="w-10 text-right text-sm tabular-nums">
                  {row.count}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface p-5">
          <div className="mb-1 text-sm font-semibold">Воронка сделок</div>
          <div className="mb-3 text-[11px] text-ink-muted">
            Сделки с датой создания в периоде ({dealsP.length})
          </div>
          <div className="space-y-2.5">
            {dealFunnel.map((row) => (
              <div key={row.stage} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-sm text-ink-muted">
                  {row.label}
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(row.count / maxDeals) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className={clsx(
                      "h-full",
                      row.stage === "lost"
                        ? "bg-gradient-to-r from-red-500/40 to-red-500"
                        : row.stage === "won"
                          ? "bg-gradient-to-r from-emerald-500/40 to-emerald-500"
                          : "bg-gradient-to-r from-accent-soft to-accent"
                    )}
                  />
                </div>
                <div className="w-24 text-right text-xs tabular-nums text-ink-muted">
                  {formatRubCompact(row.sum)}
                </div>
                <div className="w-10 text-right text-sm tabular-nums">
                  {row.count}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-muted">
        <span className={clsx(muted ? "text-ink-muted" : "text-accent")}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-ink-muted">{hint}</div>}
    </div>
  );
}
