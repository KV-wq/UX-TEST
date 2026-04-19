"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";

type Kind = "client" | "deal";

export default function EntityAiPanel({
  kind,
  snapshot,
}: {
  kind: Kind;
  snapshot: Record<string, unknown>;
}) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const snapKey = JSON.stringify(snapshot);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setText(null);
    void (async () => {
      try {
        const res = await fetch("/api/entity-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, snapshot }),
        });
        const data = (await res.json()) as { insight?: string; error?: string };
        if (!res.ok || data.error) {
          if (!cancelled)
            setErr(data.error ?? `HTTP ${res.status}`);
          return;
        }
        if (!cancelled) setText(data.insight?.trim() || null);
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Ошибка сети");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, snapKey]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="surface relative overflow-hidden p-4 sm:p-5"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent/90">
            AI-разбор
          </div>
          {loading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 size={16} className="animate-spin text-accent" />
              Готовим вывод…
            </div>
          )}
          {!loading && err && (
            <p className="mt-2 text-sm text-ink-muted">{err}</p>
          )}
          {!loading && !err && text && (
            <p className="mt-2 text-sm leading-relaxed text-ink">{text}</p>
          )}
          {!loading && !err && !text && (
            <p className="mt-2 text-sm text-ink-muted">
              Недостаточно данных для короткого разбора.
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}
