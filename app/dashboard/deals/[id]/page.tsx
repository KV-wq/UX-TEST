"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MessageCircle,
  User,
  Wallet,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { findClientForDeal } from "@/lib/crm-entity";
import { formatRelativeDate, formatRub } from "@/lib/format";
import {
  DEAL_STAGE_BADGE,
  DEAL_STAGE_LABEL,
} from "@/lib/stage-meta";
import EntityAiPanel from "@/components/dashboard/entity-ai-panel";
import clsx from "clsx";

export default function DealDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const deals = useAppStore((s) => s.deals);
  const clients = useAppStore((s) => s.clients);

  const deal = useMemo(() => deals.find((d) => d.id === id), [deals, id]);
  const linkedClient = useMemo(
    () => (deal ? findClientForDeal(deal, clients) : undefined),
    [deal, clients]
  );

  const timeline = useMemo(() => {
    if (!deal) return [];
    const now = Date.now();
    return [
      {
        id: "d1",
        at: now - 86_400_000 * 3,
        from: "you" as const,
        text: "Согласовали условия поставки, жду подтверждения бюджета.",
      },
      {
        id: "d2",
        at: now - 86_400_000,
        from: "them" as const,
        text: "Бюджет согласован на уровне руководителя — можем двигать в переговоры.",
      },
      {
        id: "d3",
        at: now - 3_600_000 * 8,
        from: "you" as const,
        text: "Отправил обновлённое КП с учётом скидки за объём.",
      },
    ].sort((a, b) => b.at - a.at);
  }, [deal]);

  const aiSnapshot = useMemo(() => {
    if (!deal) return {};
    return {
      title: deal.title,
      amount: deal.amount,
      stageLabelRu: DEAL_STAGE_LABEL[deal.stage],
      clientName: deal.clientName ?? null,
      clientLinked: Boolean(linkedClient),
      createdAt: new Date(deal.createdAt).toISOString().slice(0, 10),
    };
  }, [deal, linkedClient]);

  if (!deal) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/deals"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft size={16} />
        К сделкам
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-ink-muted">
            <Wallet size={20} className="shrink-0 text-accent" />
            <span className="text-sm">Сделка</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {deal.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={clsx(
                "rounded-full border px-3 py-1 text-[11px] font-medium",
                DEAL_STAGE_BADGE[deal.stage]
              )}
            >
              {DEAL_STAGE_LABEL[deal.stage]}
            </span>
            <span className="text-lg font-semibold tabular-nums text-ink">
              {formatRub(deal.amount)}
            </span>
            <span className="text-sm text-ink-muted">
              создана {formatRelativeDate(deal.createdAt)}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="surface p-4 sm:p-5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Клиент
            </div>
            {linkedClient ? (
              <Link
                href={`/dashboard/clients/${linkedClient.id}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.03] p-4 transition hover:border-accent/30 hover:bg-accent/[0.06]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/15 text-base font-bold text-accent">
                  {linkedClient.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{linkedClient.name}</div>
                  <div className="text-[12px] text-ink-muted">
                    {linkedClient.company ?? "Компания не указана"}
                  </div>
                </div>
                <User size={16} className="text-ink-muted" />
              </Link>
            ) : deal.clientName ? (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.03] p-4">
                <User size={20} className="text-ink-muted" />
                <div>
                  <div className="text-sm text-ink">{deal.clientName}</div>
                  <div className="text-[12px] text-ink-muted">
                    Контакт не сопоставлен с карточкой в базе
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Клиент не указан.</p>
            )}
          </section>

          <section className="surface overflow-hidden p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <MessageCircle size={14} className="text-accent" />
              Лента (демо)
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
          <EntityAiPanel kind="deal" snapshot={aiSnapshot} />
        </div>
      </div>
    </div>
  );
}
