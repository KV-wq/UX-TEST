"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ClientStage } from "@/lib/types";
import {
  CLIENT_STAGE_LABEL,
  CLIENT_STAGES_ORDERED,
} from "@/lib/stage-meta";

const STAGES: { id: ClientStage; label: string }[] =
  CLIENT_STAGES_ORDERED.map((id) => ({
    id,
    label: CLIENT_STAGE_LABEL[id],
  }));

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddClientModal({ open, onClose }: Props) {
  const addClient = useAppStore((s) => s.addClient);
  const setHighlight = useAppStore((s) => s.setHighlight);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState<ClientStage>("new");

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    addClient({
      name: n,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      stage,
    });
    setHighlight("clients");
    setName("");
    setEmail("");
    setPhone("");
    setCompany("");
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
          <h2 className="text-lg font-semibold">Новый клиент</h2>
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
            <label className="label mb-1 block">Имя</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label mb-1 block">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ivan@company.ru"
            />
          </div>
          <div>
            <label className="label mb-1 block">Телефон</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 …"
            />
          </div>
          <div>
            <label className="label mb-1 block">Компания</label>
            <input
              className="input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Название"
            />
          </div>
          <div>
            <label className="label mb-1 block">Этап</label>
            <select
              className="input"
              value={stage}
              onChange={(e) => setStage(e.target.value as ClientStage)}
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
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
