"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import {
  ArrowUpDown,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { DealStage } from "@/lib/types";
import {
  DEAL_STAGE_BADGE,
  DEAL_STAGE_LABEL,
  DEAL_STAGES_ORDERED,
} from "@/lib/stage-meta";
import { formatRelativeDate, formatRub, formatRubCompact } from "@/lib/format";
import AddDealModal from "@/components/dashboard/add-deal-modal";

const STAGE_HEAD_COLOR: Record<DealStage, string> = {
  new: "from-white/10 to-white/0",
  negotiation: "from-yellow-500/20 to-yellow-500/0",
  won: "from-emerald-500/20 to-emerald-500/0",
  lost: "from-red-500/20 to-red-500/0",
};

type SortKey = "title" | "clientName" | "stage" | "amount" | "createdAt";
type SortDir = "asc" | "desc";

export default function DealsPage() {
  const deals = useAppStore((s) => s.deals);
  const highlight = useAppStore((s) => s.highlight);
  const updateDealStage = useAppStore((s) => s.updateDealStage);
  const deleteDeal = useAppStore((s) => s.deleteDeal);

  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | DealStage>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<DealStage | null>(null);

  const counts = useMemo(() => {
    const m = {
      all: deals.length,
      new: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    } as Record<"all" | DealStage, number>;
    for (const d of deals) m[d.stage]++;
    return m;
  }, [deals]);

  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const stageOk = view === "list" ? stageFilter : "all";
    return deals.filter((d) => {
      if (stageOk !== "all" && d.stage !== stageOk) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.clientName ?? "").toLowerCase().includes(q)
      );
    });
  }, [deals, query, stageFilter, view]);

  const sortedForList = useMemo(() => {
    const list = [...baseFiltered];
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "title") return a.title.localeCompare(b.title) * dir;
      if (sortKey === "clientName")
        return (a.clientName ?? "").localeCompare(b.clientName ?? "") * dir;
      if (sortKey === "stage") return (a.stage > b.stage ? 1 : -1) * dir;
      if (sortKey === "amount") return (a.amount - b.amount) * dir;
      return (a.createdAt - b.createdAt) * dir;
    });
    return list;
  }, [baseFiltered, sortKey, sortDir]);

  const groups = useMemo(() => {
    const g: Record<DealStage, typeof deals> = {
      new: [],
      negotiation: [],
      won: [],
      lost: [],
    };
    for (const d of baseFiltered) g[d.stage].push(d);
    for (const s of DEAL_STAGES_ORDERED) {
      g[s].sort((a, b) => b.createdAt - a.createdAt);
    }
    return g;
  }, [baseFiltered]);

  const totalByStage = useMemo(() => {
    const m: Record<DealStage, number> = {
      new: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    };
    for (const d of baseFiltered) m[d.stage] += d.amount;
    return m;
  }, [baseFiltered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  };

  const onDrop = (stage: DealStage) => {
    if (dragId) {
      updateDealStage(dragId, stage);
    }
    setDragId(null);
    setDragOver(null);
  };

  const totalAmount = baseFiltered.reduce((a, d) => a + d.amount, 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Сделки
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {counts.all} в базе · {baseFiltered.length} в выборке ·{" "}
            {formatRub(totalAmount)} суммарно
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-primary !text-sm"
        >
          <Plus size={16} /> Новая сделка
        </button>
      </div>

      {deals.length === 0 ? (
        <EmptyHint onAdd={() => setModalOpen(true)} />
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={clsx(
            "surface overflow-hidden",
            highlight === "deals" && "ring-2 ring-accent shadow-glow"
          )}
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                className="input !py-2 !pl-9"
                placeholder="Поиск по названию или клиенту"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {view === "list" && (
              <div className="flex flex-wrap gap-1">
                <FilterChip
                  active={stageFilter === "all"}
                  onClick={() => setStageFilter("all")}
                  label={`Все · ${counts.all}`}
                />
                {DEAL_STAGES_ORDERED.map((s) => (
                  <FilterChip
                    key={s}
                    active={stageFilter === s}
                    onClick={() => setStageFilter(s)}
                    label={`${DEAL_STAGE_LABEL[s]} · ${counts[s]}`}
                  />
                ))}
              </div>
            )}
            <div className="ml-auto flex shrink-0 overflow-hidden rounded-xl border border-line bg-white/[0.03] p-0.5">
              <ViewToggle
                active={view === "kanban"}
                onClick={() => setView("kanban")}
                icon={<LayoutGrid size={13} />}
                label="Канбан"
              />
              <ViewToggle
                active={view === "list"}
                onClick={() => setView("list")}
                icon={<List size={13} />}
                label="Список"
              />
            </div>
          </div>

          {view === "kanban" ? (
            <div className="p-3">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {DEAL_STAGES_ORDERED.map((stage) => (
                  <div
                    key={stage}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOver !== stage) setDragOver(stage);
                    }}
                    onDragLeave={() =>
                      setDragOver((s) => (s === stage ? null : s))
                    }
                    onDrop={() => onDrop(stage)}
                    className={clsx(
                      "flex min-h-[280px] flex-col rounded-2xl border bg-bg-soft/50 p-3 transition",
                      dragOver === stage
                        ? "border-accent/60 bg-accent/5"
                        : "border-line"
                    )}
                  >
                    <div
                      className={clsx(
                        "mb-3 rounded-xl bg-gradient-to-b px-3 py-2",
                        STAGE_HEAD_COLOR[stage]
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink">
                          {DEAL_STAGE_LABEL[stage]}
                        </div>
                        <span className="text-[11px] text-ink-muted">
                          {groups[stage].length}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-muted">
                        {formatRubCompact(totalByStage[stage])}
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      <AnimatePresence initial={false}>
                        {groups[stage].map((d) => (
                          <motion.div
                            key={d.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.18 }}
                            draggable
                            onDragStart={() => setDragId(d.id)}
                            onDragEnd={() => {
                              setDragId(null);
                              setDragOver(null);
                            }}
                            className={clsx(
                              "group cursor-grab rounded-xl border border-line bg-bg-card/80 p-3 transition hover:border-accent/30 active:cursor-grabbing",
                              dragId === d.id && "opacity-40"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                href={`/dashboard/deals/${d.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="min-w-0 truncate text-sm font-medium text-ink transition hover:text-accent"
                              >
                                {d.title}
                              </Link>
                              <button
                                type="button"
                                onClick={() => deleteDeal(d.id)}
                                className="opacity-0 transition group-hover:opacity-100"
                                title="Удалить"
                              >
                                <Trash2
                                  size={13}
                                  className="text-ink-muted hover:text-red-300"
                                />
                              </button>
                            </div>
                            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                              <User size={10} />
                              {d.clientId ? (
                                <Link
                                  href={`/dashboard/clients/${d.clientId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="truncate hover:text-accent"
                                >
                                  {d.clientName ?? "Клиент"}
                                </Link>
                              ) : (
                                <span className="truncate">
                                  {d.clientName ?? "без клиента"}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm font-semibold tabular-nums text-ink">
                                {formatRub(d.amount)}
                              </span>
                              <span className="text-[10px] text-ink-muted">
                                {formatRelativeDate(d.createdAt)}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {groups[stage].length === 0 && (
                        <div className="rounded-xl border border-dashed border-line/70 bg-white/[0.01] px-3 py-6 text-center text-[11px] text-ink-muted">
                          Перетащите сделку сюда
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : baseFiltered.length === 0 ? (
            <div className="p-10 text-center text-sm text-ink-muted">
              Ничего не найдено. Измените фильтр или запрос.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
                    <Th
                      onClick={() => toggleSort("title")}
                      active={sortKey === "title"}
                    >
                      Сделка
                    </Th>
                    <Th
                      onClick={() => toggleSort("clientName")}
                      active={sortKey === "clientName"}
                    >
                      Клиент
                    </Th>
                    <Th
                      onClick={() => toggleSort("stage")}
                      active={sortKey === "stage"}
                    >
                      Стадия
                    </Th>
                    <Th
                      onClick={() => toggleSort("amount")}
                      active={sortKey === "amount"}
                    >
                      Сумма
                    </Th>
                    <Th
                      onClick={() => toggleSort("createdAt")}
                      active={sortKey === "createdAt"}
                    >
                      Создана
                    </Th>
                    <th className="w-10 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {sortedForList.map((d) => (
                      <motion.tr
                        key={d.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="border-t border-line/70 transition hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 font-medium">
                          <Link
                            href={`/dashboard/deals/${d.id}`}
                            className="text-ink transition hover:text-accent"
                          >
                            {d.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {d.clientId ? (
                            <Link
                              href={`/dashboard/clients/${d.clientId}`}
                              className="hover:text-accent"
                            >
                              {d.clientName ?? "—"}
                            </Link>
                          ) : (
                            (d.clientName ?? "—")
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={d.stage}
                            onChange={(e) =>
                              updateDealStage(
                                d.id,
                                e.target.value as DealStage
                              )
                            }
                            className={clsx(
                              "mx-auto block w-full max-w-[9.5rem] appearance-none rounded-full border px-3 py-1.5 text-center text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-accent/40",
                              DEAL_STAGE_BADGE[d.stage]
                            )}
                          >
                            {DEAL_STAGES_ORDERED.map((s) => (
                              <option
                                key={s}
                                value={s}
                                className="bg-bg text-ink"
                              >
                                {DEAL_STAGE_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {formatRub(d.amount)}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-ink-muted">
                          {formatRelativeDate(d.createdAt)}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteDeal(d.id)}
                            className="rounded-md p-1.5 text-ink-muted hover:bg-red-500/10 hover:text-red-300"
                            title="Удалить"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      )}

      <AddDealModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

function Th({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          "inline-flex items-center gap-1 transition",
          active ? "text-ink" : "hover:text-ink"
        )}
      >
        {children}
        <ArrowUpDown size={11} />
      </button>
    </th>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full border px-3 py-1.5 text-[11px] font-medium transition",
        active
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-line bg-white/[0.02] text-ink-muted hover:border-line hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}

function ViewToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition",
        active
          ? "bg-accent/15 text-accent"
          : "text-ink-muted hover:text-ink"
      )}
    >
      {icon} {label}
    </button>
  );
}

function EmptyHint({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="surface px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-bg-soft">
        <Wallet className="h-7 w-7 text-accent/80" strokeWidth={1.25} />
      </div>
      <h3 className="text-base font-medium">Сделок пока нет</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        Создайте сделку вручную или попросите ассистента сгенерировать тестовую
        воронку.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" onClick={onAdd} className="btn-primary !text-sm">
          <Plus size={16} /> Новая сделка
        </button>
      </div>
    </div>
  );
}
