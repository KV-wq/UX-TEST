"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Wand2 } from "lucide-react";
import Chat from "@/components/chat";
import ThreeBackground from "@/components/three-background";
import AppSplash from "@/components/app-splash";
import { useAppStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/use-store-hydrated";

const SUGGESTIONS = [
  "Что это?",
  "Зарегистрируй меня",
  "Как это работает?",
];

const GREET =
  "Привет! Я ассистент TEST UX. Расскажу о продукте или за минуту заведу вам аккаунт прямо в чате — с чего начнём?";

export default function HomePage() {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const user = useAppStore((s) => s.user);

  useLayoutEffect(() => {
    if (!hydrated || !user) return;
    router.replace("/dashboard");
    const fallback = window.setTimeout(() => {
      if (window.location.pathname === "/") {
        window.location.assign("/dashboard");
      }
    }, 1000);
    return () => clearTimeout(fallback);
  }, [hydrated, user, router]);

  if (!hydrated) {
    return <AppSplash />;
  }

  if (user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4">
        <div className="text-center">
          <div className="text-lg font-semibold tracking-tight">
            <span className="gradient-accent-text">TEST</span>{" "}
            <span className="text-ink">UX</span>
          </div>
          <div className="mx-auto mt-5 h-1 w-28 rounded-full bg-white/10">
            <div className="h-full animate-pulse rounded-full bg-accent/50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-60" />
      <div className="absolute inset-0 -z-0">
        <ThreeBackground />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-10">
        <div className="shrink-0 text-base font-semibold tracking-tight">
          <span className="gradient-accent-text">TEST</span>{" "}
          <span className="text-ink">UX</span>
        </div>
        <span className="chip-accent hidden shrink-0 sm:inline-flex">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
          live demo
        </span>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 pb-10 pt-4 sm:px-6 md:px-10 md:pb-10 md:pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 pill bg-white/5 border border-line text-ink-muted">
            <Wand2 size={12} className="text-accent" />
            AI-first интерфейс
          </div>
          <h1 className="text-[1.65rem] font-semibold leading-[1.08] tracking-tight sm:text-4xl md:text-6xl">
            Никаких форм.
            <br />
            Просто{" "}
            <span className="gradient-accent-text">поговорите</span>.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-ink-muted md:text-lg">
            Ассистент зарегистрирует вас, откроет рабочий стол — клиенты, сделки
            и аналитика появляются по ходу диалога или вручную.
          </p>
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <span className="font-medium text-accent">Попробуйте</span>
            <motion.span
              aria-hidden
              className="inline-flex"
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowRight size={16} className="text-accent" />
            </motion.span>
          </div>
        </motion.div>

        <motion.div
          id="demo"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative"
        >
          <div className="absolute -inset-2 rounded-[28px] bg-accent/10 blur-2xl -z-10" />
          <Chat
            location="home"
            suggestions={SUGGESTIONS}
            autoGreet={GREET}
          />
        </motion.div>
      </section>
    </main>
  );
}
