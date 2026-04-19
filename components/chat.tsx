"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Loader2, RefreshCw, Sparkles, Square, X } from "lucide-react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { applySmartSeed } from "@/lib/apply-smart-seed";
import { DASHBOARD_ONBOARDING_CHOICES } from "@/lib/dashboard-onboarding";
import { useAppStore } from "@/lib/store";
import type { AgentAction, ChatMessage } from "@/lib/types";
import VoiceButton, { type VoiceButtonHandle } from "./voice-button";

export type SendPayload =
  | string
  | { display: string; prompt: string };

interface Props {
  location: "home" | "dashboard";
  suggestions?: string[];
  compact?: boolean;
  autoGreet?: string | null;
  fill?: boolean;
  onClose?: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const CHAT_GREET_AFTER_CLEAR: Record<Props["location"], string> = {
  home: "Привет! Чем могу помочь?",
  dashboard: "История очищена. Чем могу помочь?",
};

export default function Chat({
  location,
  suggestions,
  compact,
  autoGreet,
  fill,
  onClose,
}: Props) {
  const router = useRouter();
  const messages = useAppStore((s) => s.messages);
  const pushMessage = useAppStore((s) => s.pushMessage);
  const updateMessage = useAppStore((s) => s.updateMessage);
  const applyAction = useAppStore((s) => s.applyAction);
  const syncDealClientLinks = useAppStore((s) => s.syncDealClientLinks);
  const user = useAppStore((s) => s.user);
  const clients = useAppStore((s) => s.clients);
  const deals = useAppStore((s) => s.deals);
  const tryInjectDashboardOnboarding = useAppStore(
    (s) => s.tryInjectDashboardOnboarding
  );
  const resetChat = useAppStore((s) => s.resetChat);

  const [input, setInput] = useState("");
  const [showDashboardOnboardingChips, setShowDashboardOnboardingChips] =
    useState(false);
  const [interim, setInterim] = useState("");
  const [busy, setBusy] = useState(false);
  const [smartSeedBusy, setSmartSeedBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const voiceRef = useRef<VoiceButtonHandle | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);


  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAppStore.persist.onFinishHydration(() =>
      setHydrated(true)
    );
    return unsub;
  }, []);

  const greetedRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!autoGreet) return;
    if (greetedRef.current) return;
    greetedRef.current = true;
    const hasAny = useAppStore
      .getState()
      .messages.some((m) => m.role === "assistant" || m.role === "user");
    if (hasAny) return;
    pushMessage({
      id: uid(),
      role: "assistant",
      content: autoGreet,
      createdAt: Date.now(),
    });
  }, [autoGreet, hydrated, pushMessage]);

  useEffect(() => {
    if (!hydrated) return;
    if (location !== "dashboard") return;
    const added = tryInjectDashboardOnboarding();
    if (added) setShowDashboardOnboardingChips(true);
  }, [hydrated, location, tryInjectDashboardOnboarding]);

  const send = useCallback(
    async (payload: SendPayload) => {
      const prompt =
        typeof payload === "string" ? payload.trim() : payload.prompt.trim();
      const display =
        typeof payload === "string" ? prompt : payload.display.trim();
      if (!prompt || busy) return;
      voiceRef.current?.stop();
      setShowDashboardOnboardingChips(false);
      setInput("");
      setInterim("");

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: display,
        createdAt: Date.now(),
      };
      pushMessage(userMsg);

      const pendingId = uid();
      pushMessage({
        id: pendingId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        pending: true,
      });

      setBusy(true);
      abortRef.current = new AbortController();
      try {
        const base = [...useAppStore.getState().messages, userMsg]
          .filter(
            (m) =>
              !m.pending && (m.role === "user" || m.role === "assistant")
          )
          .slice(-16)
          .map((m) => ({ role: m.role, content: m.content }));

        const history =
          display === prompt
            ? base
            : base.map((entry, idx) =>
                idx === base.length - 1 && entry.role === "user"
                  ? { role: "user" as const, content: prompt }
                  : entry
              );

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            state: {
              location,
              user,
              clients,
              deals,
              todayISO: new Date().toISOString().slice(0, 10),
            },
          }),
          signal: abortRef.current.signal,
        });

        const data = (await res.json()) as {
          message?: string;
          actions?: AgentAction[];
          error?: string;
        };

        if (!res.ok || data.error) {
          updateMessage(pendingId, {
            pending: false,
            content:
              "Упс, что-то пошло не так: " +
              (data.error ?? `HTTP ${res.status}`),
          });
          return;
        }

        const actions = data.actions ?? [];
        updateMessage(pendingId, {
          pending: false,
          content: data.message ?? "",
        });

        for (const action of actions) {
          applyAction(action);
          if (action.type === "navigate") {
            const path =
              action.payload.to === "dashboard" ? "/dashboard" : "/";
            if (location === "home" && path === "/dashboard") {
              queueMicrotask(() => {
                window.location.assign("/dashboard");
              });
              return;
            }
            setTimeout(() => {
              router.push(path);
            }, 450);
          }
        }
        syncDealClientLinks();
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          updateMessage(pendingId, {
            pending: false,
            content:
              "Не удалось получить ответ: " +
              ((e as Error).message ?? "неизвестная ошибка"),
          });
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [
      applyAction,
      syncDealClientLinks,
      busy,
      clients,
      deals,
      location,
      pushMessage,
      router,
      updateMessage,
      user,
    ]
  );

  const stop = () => {
    abortRef.current?.abort();
    setBusy(false);
  };

  const clearHistory = () => {
    if (busy) return;
    abortRef.current?.abort();
    setBusy(false);
    setInput("");
    setInterim("");
    setShowDashboardOnboardingChips(false);
    resetChat();
    pushMessage({
      id: uid(),
      role: "assistant",
      content: CHAT_GREET_AFTER_CLEAR[location],
      createdAt: Date.now(),
    });
  };

  const displayedMessages = useMemo(
    () => messages.filter((m) => m.role === "user" || m.role === "assistant"),
    [messages]
  );

  const composedValue = input + (interim ? (input ? " " : "") + interim : "");

  return (
    <div
      className={clsx(
        "relative flex flex-col overflow-hidden",
        fill
          ? "h-full w-full bg-bg-soft"
          : clsx(
              "surface",
              compact
                ? "h-[min(620px,calc(100dvh-120px))]"
                : "h-[min(620px,calc(100dvh-180px))] min-h-[420px]"
            )
      )}
    >
      <div
        className={clsx(
          "flex shrink-0 items-center gap-3 border-b px-4",
          fill
            ? "h-[57px] border-line bg-bg/85 backdrop-blur-xl"
            : "border-line/80 py-3"
        )}
      >
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/15 text-accent">
            <Sparkles size={14} />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-bg-card" />
        </div>
        <div className="min-w-0 flex-1">
          {fill ? (
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="text-sm font-medium text-ink">Ассистент</span>
              <span className="truncate text-[11px] text-ink-muted">
                {busy ? (
                  <span className="shimmer-text">печатает…</span>
                ) : (
                  "онлайн"
                )}
              </span>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium leading-tight text-ink">
                Ассистент
              </div>
              <div className="mt-0.5 text-[11px] leading-tight text-ink-muted">
                {busy ? (
                  <span className="shimmer-text">печатает…</span>
                ) : (
                  "онлайн"
                )}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={clearHistory}
          disabled={busy}
          title="Очистить историю"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/80 bg-white/[0.03] text-ink-muted transition hover:border-line hover:bg-white/[0.06] hover:text-ink disabled:opacity-40"
        >
          <RefreshCw size={14} strokeWidth={2} />
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Свернуть чат"
            aria-label="Свернуть чат"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/80 bg-white/[0.03] text-ink-muted transition hover:border-line hover:bg-white/[0.06] hover:text-ink"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
      >
        <AnimatePresence initial={false}>
          {displayedMessages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={clsx(
                "flex w-full",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={clsx(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed whitespace-pre-wrap break-words shadow-sm",
                  m.role === "user"
                    ? "bg-accent text-black rounded-br-md"
                    : "bg-white/[0.04] border border-line text-ink rounded-bl-md"
                )}
              >
                {m.pending ? (
                  <div className="flex items-center gap-1.5 py-1.5 px-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {location === "dashboard" && showDashboardOnboardingChips && (
        <div className="border-t border-line/60 bg-accent/[0.04] px-4 py-3">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-accent/90">
            С чего начнём
          </div>
          <div className="flex flex-wrap gap-2">
            {DASHBOARD_ONBOARDING_CHOICES.map((c) => {
              const isSeed = "smartSeed" in c && c.smartSeed;
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    if (isSeed) {
                      setSmartSeedBusy(true);
                      void applySmartSeed().finally(() => setSmartSeedBusy(false));
                      return;
                    }
                    if ("prompt" in c) {
                      send({ display: c.label, prompt: c.prompt });
                    }
                  }}
                  disabled={busy || smartSeedBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2 text-left text-xs font-medium text-ink transition hover:border-accent/45 hover:bg-accent/15 disabled:opacity-50"
                >
                  {isSeed && smartSeedBusy ? (
                    <Loader2 size={13} className="shrink-0 animate-spin text-accent" />
                  ) : null}
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {suggestions &&
        suggestions.length > 0 &&
        location === "home" &&
        displayedMessages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={busy}
                className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-xs text-ink-muted transition hover:border-accent/50 hover:bg-accent/5 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}

      {suggestions &&
        suggestions.length > 0 &&
        location === "dashboard" &&
        !showDashboardOnboardingChips &&
        displayedMessages.length <= 2 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={busy}
                className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-xs text-ink-muted transition hover:border-accent/50 hover:bg-accent/5 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-2.5 border-t border-line/80 flex items-end gap-2 bg-bg-soft/60"
      >
        <div className="flex-1 min-w-0 bg-bg-soft border border-line rounded-[22px] px-4 py-2 focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-accent/60 transition">
          <div className="grid text-[14px] leading-6">
            <div
              aria-hidden
              className="col-start-1 row-start-1 invisible whitespace-pre-wrap break-words max-h-[132px] overflow-hidden"
            >
              {composedValue + (composedValue.endsWith("\n") ? " " : "") ||
                " "}
            </div>
            <textarea
              value={composedValue}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={
                location === "home"
                  ? "Сообщение или «зарегистрируй меня»…"
                  : "Что сделать в CRM?"
              }
              rows={1}
              className="col-start-1 row-start-1 block w-full bg-transparent outline-none resize-none text-ink placeholder:text-ink-dim max-h-[132px] overflow-y-auto"
            />
          </div>
        </div>
        <VoiceButton
          ref={voiceRef}
          onTranscript={(t) => setInterim(t)}
          onFinal={(t) => {
            setInterim("");
            setInput((v) => (v ? v + " " + t : t));
          }}
          disabled={busy}
        />
        {busy ? (
          <button
            type="button"
            onClick={stop}
            className="w-11 h-11 shrink-0 rounded-full bg-white/5 border border-line text-ink hover:bg-white/10 transition flex items-center justify-center"
            title="Остановить"
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() && !interim.trim()}
            className="w-11 h-11 shrink-0 rounded-full bg-accent text-black hover:bg-accent-soft shadow-glow transition flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none active:scale-95"
            title="Отправить"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </form>
    </div>
  );
}
