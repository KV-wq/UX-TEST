"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { DealStage } from "@/lib/types";
import { DEAL_STAGE_LABEL, DEAL_STAGES_ORDERED } from "@/lib/stage-meta";

const STAGES: { id: DealStage; label: string }[] = DEAL_STAGES_ORDERED.map(
  (id) => ({
    id,
    label: DEAL_STAGE_LABEL[id],
  })
);

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddDealModal({ open, onClose }: Props) {
  const addDeal = useAppStore((s) => s.addDeal);
  const setHighlight = useAppStore((s) => s.setHighlight);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [clientName, setClientName] = useState("");
  const [stage, setStage] = useState<DealStage>("new");

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const a = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!t || !Number.isFinite(a) || a < 0) return;
    addDeal({
      title: t,
      amount: a,
      clientName: clientName.trim() || undefined,
      stage,
    });
    setHighlight("deals");
    setTitle("");
    setAmount("");
    setClientName("");
    setStage("new");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть"
      />
      <div className="relative w-full max-w-md surface max-h-[90vh] overflow-y-auto p-5 shadow-glow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Новая сделка</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-white/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label mb-1 block">Название</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Внедрение CRM"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label mb-1 block">Сумма, ₽</label>
            <input
              className="input"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="250000"
              required
            />
          </div>
          <div>
            <label className="label mb-1 block">Клиент (необязательно)</label>
            <input
              className="input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Имя или компания"
            />
          </div>
          <div>
            <label className="label mb-1 block">Этап</label>
            <select
              className="input"
              value={stage}
              onChange={(e) => setStage(e.target.value as DealStage)}
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1">
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
