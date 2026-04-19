"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";
import {
  ArrowUpDown,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ClientStage } from "@/lib/types";
import {
  CLIENT_STAGE_BADGE,
  CLIENT_STAGE_LABEL,
  CLIENT_STAGES_ORDERED,
} from "@/lib/stage-meta";
import { formatRelativeDate } from "@/lib/format";
import AddClientModal from "@/components/dashboard/add-client-modal";

type SortKey = "name" | "company" | "stage" | "createdAt";
type SortDir = "asc" | "desc";

export default function ClientsPage() {
  const clients = useAppStore((s) => s.clients);
  const highlight = useAppStore((s) => s.highlight);
  const updateClientStage = useAppStore((s) => s.updateClientStage);
  const deleteClient = useAppStore((s) => s.deleteClient);

  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | ClientStage>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const counts = useMemo(() => {
    const m = {
      all: clients.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      won: 0,
      lost: 0,
    } as Record<"all" | ClientStage, number>;
    for (const c of clients) m[c.stage]++;
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = clients.filter((c) => {
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.company ?? "").toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "company")
        return (a.company ?? "").localeCompare(b.company ?? "") * dir;
      if (sortKey === "stage") return (a.stage > b.stage ? 1 : -1) * dir;
      return (a.createdAt - b.createdAt) * dir;
    });
    return list;
  }, [clients, query, stageFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Клиенты
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {counts.all} в базе · {counts.qualified} квалифицированных ·{" "}
            {counts.won} сконвертировано
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-primary !text-sm"
        >
          <Plus size={16} /> Добавить клиента
        </button>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={clsx(
          "surface overflow-hidden",
          highlight === "clients" && "ring-2 ring-accent shadow-glow"
        )}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              className="input !py-2 !pl-9"
              placeholder="Поиск по имени, email, телефону, компании"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <FilterChip
              active={stageFilter === "all"}
              onClick={() => setStageFilter("all")}
              label={`Все · ${counts.all}`}
            />
            {CLIENT_STAGES_ORDERED.map((s) => (
              <FilterChip
                key={s}
                active={stageFilter === s}
                onClick={() => setStageFilter(s)}
                label={`${CLIENT_STAGE_LABEL[s]} · ${counts[s]}`}
              />
            ))}
          </div>
        </div>

        {clients.length === 0 ? (
          <EmptyHint onAdd={() => setModalOpen(true)} />
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Никого не нашлось. Измените фильтр или запрос.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
                  <Th onClick={() => toggleSort("name")} active={sortKey === "name"}>
                    Клиент
                  </Th>
                  <Th
                    onClick={() => toggleSort("company")}
                    active={sortKey === "company"}
                  >
                    Компания
                  </Th>
                  <th className="px-4 py-3 font-medium">Контакты</th>
                  <Th
                    onClick={() => toggleSort("stage")}
                    active={sortKey === "stage"}
                  >
                    Стадия
                  </Th>
                  <Th
                    onClick={() => toggleSort("createdAt")}
                    active={sortKey === "createdAt"}
                  >
                    Добавлен
                  </Th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((c) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="border-t border-line/70 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/15 text-sm font-semibold text-accent">
                            {c.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/clients/${c.id}`}
                              className="truncate font-medium text-ink transition hover:text-accent"
                            >
                              {c.name}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {c.company ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-[12px] text-ink-muted">
                          {c.email && (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail size={11} /> {c.email}
                            </span>
                          )}
                          {c.phone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone size={11} /> {c.phone}
                            </span>
                          )}
                          {!c.email && !c.phone && "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={c.stage}
                          onChange={(e) =>
                            updateClientStage(c.id, e.target.value as ClientStage)
                          }
                          className={clsx(
                            "appearance-none rounded-full border px-2.5 py-1 text-center text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-accent/40",
                            CLIENT_STAGE_BADGE[c.stage]
                          )}
                        >
                          {CLIENT_STAGES_ORDERED.map((s) => (
                            <option
                              key={s}
                              value={s}
                              className="bg-bg text-ink"
                            >
                              {CLIENT_STAGE_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-ink-muted">
                        {formatRelativeDate(c.createdAt)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => deleteClient(c.id)}
                          className="rounded-md p-1.5 text-ink-muted transition hover:bg-red-500/10 hover:text-red-300"
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

      <AddClientModal open={modalOpen} onClose={() => setModalOpen(false)} />
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

function EmptyHint({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-bg-soft">
        <Users className="h-7 w-7 text-accent/80" strokeWidth={1.25} />
      </div>
      <h3 className="text-base font-medium">База клиентов пуста</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        Добавьте контакт вручную или попросите ассистента — «нагенери 20
        клиентов для теста».
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" onClick={onAdd} className="btn-primary !text-sm">
          <Plus size={16} /> Добавить клиента
        </button>
      </div>
    </div>
  );
}
