import type { ClientStage, DealStage } from "./types";

export const CLIENT_STAGE_LABEL: Record<ClientStage, string> = {
  new: "Новый",
  contacted: "Контакт",
  qualified: "Квалифицирован",
  won: "Завершено",
  lost: "Отклонено",
};

export const CLIENT_STAGE_BADGE: Record<ClientStage, string> = {
  new: "bg-white/5 text-ink border-line",
  contacted: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  qualified: "bg-accent/10 text-accent border-accent/30",
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  lost: "bg-red-500/10 text-red-300 border-red-500/30",
};

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  new: "Новая",
  negotiation: "Переговоры",
  won: "Завершена",
  lost: "Отклонена",
};

export const DEAL_STAGE_BADGE: Record<DealStage, string> = {
  new: "bg-white/5 text-ink border-line",
  negotiation: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  lost: "bg-red-500/10 text-red-300 border-red-500/30",
};

export const DEAL_STAGES_ORDERED: DealStage[] = [
  "new",
  "negotiation",
  "won",
  "lost",
];

export const CLIENT_STAGES_ORDERED: ClientStage[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];
