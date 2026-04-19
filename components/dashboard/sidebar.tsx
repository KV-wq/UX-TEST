"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Database,
  LayoutGrid,
  Loader2,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { applySmartSeed } from "@/lib/apply-smart-seed";
import { useAppStore } from "@/lib/store";

interface Props {
  onNavigate?: () => void;
}

const ITEMS = [
  { href: "/dashboard", label: "Обзор", icon: LayoutGrid, key: "overview" },
  { href: "/dashboard/clients", label: "Клиенты", icon: Users, key: "clients" },
  { href: "/dashboard/deals", label: "Сделки", icon: Wallet, key: "deals" },
  {
    href: "/dashboard/analytics",
    label: "Аналитика",
    icon: BarChart3,
    key: "analytics",
  },
] as const;

type TipState = { label: string; top: number; left: number } | null;

export default function Sidebar({ onNavigate }: Props) {
  const pathname = usePathname();
  const clients = useAppStore((s) => s.clients);
  const deals = useAppStore((s) => s.deals);
  const [smartBusy, setSmartBusy] = useState(false);
  const [tip, setTip] = useState<TipState>(null);
  const [tipMounted, setTipMounted] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTipMounted(true);
  }, []);

  const counts: Record<string, number | undefined> = {
    clients: clients.length || undefined,
    deals: deals.length || undefined,
  };

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const showTip = useCallback((label: string, el: HTMLElement) => {
    clearHideTimer();
    const r = el.getBoundingClientRect();
    setTip({
      label,
      top: r.top + r.height / 2,
      left: r.right + 12,
    });
  }, []);

  const hideTipSoon = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setTip(null), 120);
  }, []);

  const hideTipNow = useCallback(() => {
    clearHideTimer();
    setTip(null);
  }, []);

  useEffect(() => {
    const onScroll = () => hideTipNow();
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      clearHideTimer();
    };
  }, [hideTipNow]);

  return (
    <>
      <aside className="flex h-full w-[84px] shrink-0 flex-col border-r border-line bg-bg-soft">
        <div className="flex shrink-0 flex-col items-center px-2 pt-5 pb-4 text-center">
          <div className="text-[11px] font-semibold leading-[1.2] tracking-tight">
            <span className="gradient-accent-text">TEST</span>
            <span className="text-ink"> UX</span>
          </div>
          <div className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            workspace
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-visible px-2.5 pb-2">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const isActive =
              it.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(it.href);
            const n = counts[it.key];
            return (
              <Link
                key={it.key}
                href={it.href}
                onClick={onNavigate}
                onMouseEnter={(e) => showTip(it.label, e.currentTarget)}
                onMouseLeave={hideTipSoon}
                onFocus={(e) => showTip(it.label, e.currentTarget)}
                onBlur={hideTipNow}
                className={clsx(
                  "group relative flex h-11 w-full shrink-0 items-center justify-center rounded-xl border transition",
                  isActive
                    ? "border-accent/35 bg-accent/12 text-ink shadow-[0_0_20px_-8px_rgba(34,224,122,0.45)]"
                    : "border-transparent text-ink-muted hover:border-line hover:bg-white/[0.06] hover:text-ink"
                )}
              >
                <Icon
                  size={18}
                  strokeWidth={2}
                  className={clsx(
                    "shrink-0 transition-transform duration-200",
                    isActive
                      ? "text-accent"
                      : "text-ink-muted group-hover:scale-105 group-hover:text-ink"
                  )}
                />
                {n !== undefined && n > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-accent/30 bg-accent/15 px-1 text-[9px] font-bold tabular-nums text-accent">
                    {n > 99 ? "99+" : n}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 px-2.5 pb-2">
          <button
            type="button"
            disabled={smartBusy}
            onClick={async () => {
              setSmartBusy(true);
              try {
                await applySmartSeed();
              } finally {
                setSmartBusy(false);
              }
            }}
            onMouseEnter={(e) => showTip("Заполнить CRM тестовыми данными", e.currentTarget)}
            onMouseLeave={hideTipSoon}
            onFocus={(e) =>
              showTip("Заполнить CRM тестовыми данными", e.currentTarget)
            }
            onBlur={hideTipNow}
            className="group relative flex h-11 w-full items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-ink transition hover:border-accent/40 hover:bg-accent/16 disabled:opacity-50"
          >
            {smartBusy ? (
              <Loader2 size={18} className="animate-spin text-accent" />
            ) : (
              <Database
                size={18}
                className="text-accent transition-transform duration-200 group-hover:scale-105"
              />
            )}
          </button>
        </div>

        <div className="mt-auto shrink-0 border-t border-line p-2.5">
          <Link
            href="/dashboard/profile"
            onClick={onNavigate}
            onMouseEnter={(e) => showTip("Профиль", e.currentTarget)}
            onMouseLeave={hideTipSoon}
            onFocus={(e) => showTip("Профиль", e.currentTarget)}
            onBlur={hideTipNow}
            className={clsx(
              "group flex h-11 w-full items-center justify-center rounded-xl border transition",
              pathname === "/dashboard/profile"
                ? "border-accent/35 bg-accent/12 text-ink shadow-[0_0_20px_-8px_rgba(34,224,122,0.45)]"
                : "border-transparent text-ink-muted hover:border-line hover:bg-white/[0.06] hover:text-ink"
            )}
          >
            <UserRound
              size={18}
              strokeWidth={2}
              className={clsx(
                "transition-transform duration-200",
                pathname === "/dashboard/profile"
                  ? "text-accent"
                  : "text-ink-muted group-hover:scale-105 group-hover:text-ink"
              )}
            />
          </Link>
        </div>
      </aside>

      {tipMounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {tip && (
              <motion.div
                key={`${tip.label}-${Math.round(tip.top)}-${Math.round(tip.left)}`}
                role="tooltip"
                className="pointer-events-none fixed z-[2147483647] whitespace-nowrap rounded-lg border border-accent/25 bg-bg-card px-3 py-2 text-[13px] font-medium text-ink shadow-[0_12px_40px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.05)]"
                style={{ top: tip.top, left: tip.left }}
                initial={{
                  opacity: 0,
                  x: -8,
                  y: "-50%",
                  filter: "blur(4px)",
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: "-50%",
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  x: -6,
                  y: "-50%",
                  filter: "blur(4px)",
                }}
                transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-accent/25 bg-bg-card" />
                <span className="relative">{tip.label}</span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
