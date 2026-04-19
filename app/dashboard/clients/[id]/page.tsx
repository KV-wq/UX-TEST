"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Mail,
  MessageCircle,
  Phone,
  Wallet,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { dealsForClient } from "@/lib/crm-entity";
import { formatRelativeDate, formatRub } from "@/lib/format";
import {
  CLIENT_STAGE_BADGE,
  CLIENT_STAGE_LABEL,
  DEAL_STAGE_LABEL,
} from "@/lib/stage-meta";
import EntityAiPanel from "@/components/dashboard/entity-ai-panel";
import clsx from "clsx";

export default function ClientDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const clients = useAppStore((s) => s.clients);
  const deals = useAppStore((s) => s.deals);

  const client = useMemo(
    () => clients.find((c) => c.id === id),
    [clients, id]
  );

  const relatedDeals = useMemo(
    () => (client ? dealsForClient(client, deals) : []),
    [client, deals]
  );

  const timeline = useMemo(() => {
    if (!client) return [];
    const now = Date.now();
    const rows: { id: string; at: number; text: string; from: "you" | "them" }[] =
      [
        {
          id: "t1",
          at: now - 86_400_000 * 2,
          from: "them",
          text: "Напоминаю: обсудили пилот на следующей неделе. Жду КП по объёму.",
        },
        {
          id: "t2",
          at: now - 86_400_000,
          from: "you",
          text: "Отправил материалы и слоты для звонка — удобно вт или чт?",
        },
        {
          id: "t3",
          at: now - 3_600_000 * 5,
          from: "them",
          text: "Ок, посмотрю и вернусь с обратной связью до пятницы.",
        },
      ];
    return rows.sort((a, b) => b.at - a.at);
  }, [client]);

  const aiSnapshot = useMemo(() => {
    if (!client) return {};
    const openDeals = relatedDeals.filter(
      (d) => d.stage !== "won" && d.stage !== "lost"
    );
    return {
      name: client.name,
      stageLabelRu: CLIENT_STAGE_LABEL[client.stage],
      company: client.company ?? null,
      hasEmail: Boolean(client.email),
      hasPhone: Boolean(client.phone),
      dealsCount: relatedDeals.length,
      dealsOpenCount: openDeals.length,
      relatedDeals: relatedDeals.map((d) => ({
        title: d.title,
        amount: d.amount,
        stageLabelRu: DEAL_STAGE_LABEL[d.stage],
      })),
      createdAt: new Date(client.createdAt).toISOString().slice(0, 10),
    };
  }, [client, relatedDeals]);

  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 text-sm text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft size={16} />
          К списку
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/15 text-xl font-bold text-accent">
            {client.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {client.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  "rounded-full border px-3 py-1 text-[11px] font-medium",
                  CLIENT_STAGE_BADGE[client.stage]
                )}
              >
                {CLIENT_STAGE_LABEL[client.stage]}
              </span>
              <span className="text-sm text-ink-muted">
                в базе с {formatRelativeDate(client.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="surface p-4 sm:p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Контакты
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.02] p-4">
                <Mail size={18} className="shrink-0 text-accent" />
                <div>
                  <div className="text-[11px] text-ink-muted">Email</div>
                  <div className="mt-0.5 text-sm text-ink">
                    {client.email ?? "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.02] p-4">
                <Phone size={18} className="shrink-0 text-accent" />
                <div>
                  <div className="text-[11px] text-ink-muted">Телефон</div>
                  <div className="mt-0.5 text-sm text-ink">
                    {client.phone ?? "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.02] p-4 sm:col-span-2">
                <Building2 size={18} className="shrink-0 text-accent" />
                <div>
                  <div className="text-[11px] text-ink-muted">Компания</div>
                  <div className="mt-0.5 text-sm text-ink">
                    {client.company ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="surface overflow-hidden p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <MessageCircle size={14} className="text-accent" />
              Переписка (демо)
            </div>
            <div className="space-y-3">
              {timeline.map((m) => (
                <div
                  key={m.id}
                  className={clsx(
                    "flex",
                    m.from === "you" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={clsx(
                      "max-w-[min(100%,420px)] rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed",
                      m.from === "you"
                        ? "border-accent/25 bg-accent/10 text-ink"
                        : "border-line bg-white/[0.04] text-ink"
                    )}
                  >
                    {m.text}
                    <div className="mt-1.5 text-[10px] text-ink-dim">
                      {formatRelativeDate(m.at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <EntityAiPanel kind="client" snapshot={aiSnapshot} />
        </div>
      </div>

      <section className="surface overflow-hidden p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-ink">
          <Wallet size={18} className="text-accent" />
          Сделки
          <span className="text-sm font-normal text-ink-muted">
            ({relatedDeals.length})
          </span>
        </div>
        {relatedDeals.length === 0 ? (
          <p className="text-sm text-ink-muted">Пока нет привязанных сделок.</p>
        ) : (
          <ul className="divide-y divide-line/80">
            {relatedDeals.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/deals/${d.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 transition hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-ink">{d.title}</div>
                    <div className="text-[12px] text-ink-muted">
                      {DEAL_STAGE_LABEL[d.stage]} ·{" "}
                      {formatRelativeDate(d.createdAt)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-ink">
                    {formatRub(d.amount)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
