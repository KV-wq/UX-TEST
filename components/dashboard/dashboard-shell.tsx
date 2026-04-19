"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import AppSplash from "@/components/app-splash";
import Sidebar from "@/components/dashboard/sidebar";
import Chat from "@/components/chat";

const DASHBOARD_SUGGESTIONS = [
  "Покажи сделки на этой неделе",
  "Дай краткую сводку по воронке",
];

const TITLE_BY_PATH: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === "/dashboard", title: "Обзор" },
  {
    match: (p) => /^\/dashboard\/clients\/[^/]+$/.test(p),
    title: "Клиент",
  },
  {
    match: (p) => /^\/dashboard\/deals\/[^/]+$/.test(p),
    title: "Сделка",
  },
  { match: (p) => p.startsWith("/dashboard/clients"), title: "Клиенты" },
  { match: (p) => p.startsWith("/dashboard/deals"), title: "Сделки" },
  {
    match: (p) => p.startsWith("/dashboard/analytics"),
    title: "Аналитика",
  },
  { match: (p) => p.startsWith("/dashboard/profile"), title: "Профиль" },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrated = useStoreHydrated();
  const user = useAppStore((s) => s.user);
  const highlight = useAppStore((s) => s.highlight);
  const setHighlight = useAppStore((s) => s.setHighlight);
  const pathname = usePathname();
  const router = useRouter();

  const [chatOpen, setChatOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1280px)").matches;
  });
  const [mobileNav, setMobileNav] = useState(false);

  useLayoutEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/");
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), 2200);
    return () => clearTimeout(t);
  }, [highlight, setHighlight]);

  const title = useMemo(() => {
    const found = TITLE_BY_PATH.find((i) => i.match(pathname ?? ""));
    return found?.title ?? "Рабочий стол";
  }, [pathname]);

  if (!hydrated || !user) return <AppSplash />;

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="sticky top-0 hidden h-dvh shrink-0 md:flex">
        <Sidebar />
      </aside>

      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.button
              type="button"
              aria-label="Закрыть меню"
              className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileNav(false)}
            />
            <motion.div
              className="fixed left-0 top-0 z-50 h-dvh md:hidden"
              initial={{ x: "-105%" }}
              animate={{ x: 0 }}
              exit={{ x: "-105%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <Sidebar onNavigate={() => setMobileNav(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="relative flex min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white/5 text-ink md:hidden"
                onClick={() => setMobileNav(true)}
                aria-label="Меню"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0 text-sm text-ink-muted">
                <span className="hidden sm:inline">Рабочий стол / </span>
                <span className="text-ink">{title}</span>
              </div>
            </div>
            <span className="chip-accent shrink-0 whitespace-nowrap pl-2.5 pr-3 text-xs sm:text-[13px]">
              <span className="h-2 w-2 shrink-0 animate-pulse-soft rounded-full bg-accent shadow-[0_0_8px_rgba(34,224,122,0.6)]" />
              Online-AI
            </span>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </div>
      </main>

      <aside
        aria-hidden={!chatOpen}
        className={
          "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-l border-line bg-bg-soft transition-[width] duration-300 ease-out xl:block " +
          (chatOpen ? "xl:w-[360px] 2xl:w-[400px]" : "xl:w-0")
        }
      >
        <div className="flex h-full w-[360px] 2xl:w-[400px]">
          <Chat
            location="dashboard"
            suggestions={DASHBOARD_SUGGESTIONS}
            fill
            onClose={() => setChatOpen(false)}
          />
        </div>
      </aside>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat-mobile"
            className="fixed inset-0 z-50 flex xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label="Свернуть чат"
              className="flex-1 bg-black/60 backdrop-blur-sm"
              onClick={() => setChatOpen(false)}
            />
            <motion.div
              className="ml-auto flex h-full w-full max-w-[420px] bg-bg-soft sm:border-l sm:border-line"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <Chat
                location="dashboard"
                suggestions={DASHBOARD_SUGGESTIONS}
                fill
                onClose={() => setChatOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            key="chat-fab"
            type="button"
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 360 }}
            onClick={() => setChatOpen(true)}
            className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-glow lg:bottom-6 lg:right-6"
            title="Открыть ассистента"
            aria-label="Открыть чат-ассистент"
          >
            <Sparkles size={22} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
