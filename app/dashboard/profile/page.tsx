"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Briefcase,
  FileText,
  LogOut,
  Mail,
  User,
} from "lucide-react";
import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { formatShortDate } from "@/lib/format";

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  const empty = !value.trim();
  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-white/[0.02] px-4 py-4 sm:px-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white/[0.04] text-accent">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
          {label}
        </div>
        <div
          className={
            "mt-1 text-sm leading-relaxed " +
            (empty ? "text-ink-dim italic" : "text-ink")
          }
        >
          {empty ? "Не указано" : value}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAppStore((s) => s.user);
  const resetAll = useAppStore((s) => s.resetAll);
  const router = useRouter();

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Профиль
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Данные из регистрации. Выйти и сбросить демо можно здесь.
        </p>
        <p className="mt-2 text-xs text-ink-dim">
          Аккаунт создан: {formatShortDate(user.createdAt)}
        </p>
      </div>

      <section className="surface overflow-hidden p-4 sm:p-6">
        <div className="space-y-3">
          <Field icon={User} label="Имя" value={user.name} />
          <Field icon={Mail} label="Email" value={user.email} />
          <Field icon={Building2} label="Компания" value={user.company} />
          <Field icon={Briefcase} label="Должность" value={user.role} />
          <Field
            icon={FileText}
            label="О компании"
            value={user.companyAbout ?? ""}
          />
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => {
              resetAll();
              router.push("/");
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.08] px-4 py-3 text-sm font-medium text-red-200 transition hover:border-red-400/45 hover:bg-red-500/[0.14] sm:w-auto"
          >
            <LogOut size={18} />
            Выйти и сбросить демо
          </button>
        </div>
      </section>
    </motion.div>
  );
}
